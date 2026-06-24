import json
import os
import subprocess
import hashlib

from video_forge.errors import get_error


SUPPORTED_VIDEO = {".mp4", ".mov", ".mkv", ".webm", ".avi"}
SUPPORTED_AUDIO = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}
SUPPORTED_IMAGE = {".png", ".jpg", ".jpeg", ".webp"}
SUPPORTED_SUBTITLE = {".srt", ".vtt"}
SUPPORTED_ALL = SUPPORTED_VIDEO | SUPPORTED_AUDIO | SUPPORTED_IMAGE | SUPPORTED_SUBTITLE


def _ext(pa: str) -> str:
    _, e = os.path.splitext(pa)
    return e.lower()


def classify_file(path: str) -> str:
    e = _ext(path)
    if e in SUPPORTED_VIDEO:
        return "video"
    if e in SUPPORTED_AUDIO:
        return "audio"
    if e in SUPPORTED_IMAGE:
        return "image"
    if e in SUPPORTED_SUBTITLE:
        return "subtitle"
    return "unknown"


def is_supported(path: str) -> bool:
    return _ext(path) in SUPPORTED_ALL


def compute_file_hash(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


class FfprobeService:
    def __init__(self, ffprobe_path: str = "ffprobe"):
        self.ffprobe_path = ffprobe_path
        self._check_exists()

    def _check_exists(self) -> None:
        if not self._binary_exists(self.ffprobe_path):
            raise get_error("VIDEOFORGE_FFPROBE_NOT_FOUND")

    @staticmethod
    def _binary_exists(bin_name: str) -> bool:
        return any(
            os.path.isfile(os.path.join(d, bin_name))
            or os.path.isfile(os.path.join(d, bin_name + ".exe"))
            for d in os.environ.get("PATH", "").split(os.pathsep)
        ) or (os.path.isfile(bin_name) if os.path.sep in bin_name else False)

    def probe(self, file_path: str) -> dict:
        if not os.path.isfile(file_path):
            raise get_error("VIDEOFORGE_MISSING_SOURCE_FILE")
        if not is_supported(file_path):
            raise get_error("VIDEOFORGE_UNSUPPORTED_MEDIA")
        cmd = [self.ffprobe_path, "-v", "quiet", "-print_format", "json",
               "-show_format", "-show_streams", file_path]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            raise get_error("VIDEOFORGE_UNSUPPORTED_MEDIA")
        return json.loads(result.stdout)

    def extract_metadata(self, file_path: str) -> dict:
        raw = self.probe(file_path)
        fmt = raw.get("format", {})
        streams = raw.get("streams", [])
        video_stream = None
        audio_stream = None
        for s in streams:
            codec_type = s.get("codec_type", "")
            if codec_type == "video" and video_stream is None:
                video_stream = s
            elif codec_type == "audio" and audio_stream is None:
                audio_stream = s
        duration = float(fmt.get("duration", 0) or 0)
        width = (video_stream or {}).get("width", 0) or 0
        height = (video_stream or {}).get("height", 0) or 0
        fps_str = (video_stream or {}).get("r_frame_rate", "0/1") or "0/1"
        fps = 0.0
        if "/" in fps_str:
            try:
                num, den = fps_str.split("/")
                fps = float(num) / float(den) if float(den) != 0 else 0.0
            except (ValueError, ZeroDivisionError):
                fps = 0.0
        audio_channels = (audio_stream or {}).get("channels", 0) or 0
        return {
            "duration_secs": duration,
            "width": int(width),
            "height": int(height),
            "fps": round(fps, 3),
            "audio_channels": int(audio_channels),
            "file_type": classify_file(file_path),
            "file_hash": compute_file_hash(file_path),
            "format_name": fmt.get("format_name", ""),
            "codec_name": (video_stream or {}).get("codec_name", ""),
            "audio_codec": (audio_stream or {}).get("codec_name", ""),
        }
