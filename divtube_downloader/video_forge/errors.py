from dataclasses import dataclass, field
from typing import Optional


@dataclass
class VideoForgeError(Exception):
    severity: str = "ERROR"
    code: str = "VIDEOFORGE_UNKNOWN"
    user_message: str = "An unknown error occurred."
    developer_diagnostic: str = ""
    recovery_hint: str = ""
    cause: Optional[Exception] = None


ERRORS = {
    "VIDEOFORGE_FFMPEG_NOT_FOUND": VideoForgeError(
        severity="FATAL",
        code="VIDEOFORGE_FFMPEG_NOT_FOUND",
        user_message="FFmpeg binary not found. Install ffmpeg via your package manager.",
        developer_diagnostic="ffmpeg not found in PATH. Check ffmpeg_path parameter or system install.",
        recovery_hint="Install ffmpeg: sudo apt install ffmpeg  or  brew install ffmpeg",
    ),
    "VIDEOFORGE_FFPROBE_NOT_FOUND": VideoForgeError(
        severity="FATAL",
        code="VIDEOFORGE_FFPROBE_NOT_FOUND",
        user_message="FFprobe binary not found. Install ffmpeg via your package manager.",
        developer_diagnostic="ffprobe not found in PATH.",
        recovery_hint="Install ffmpeg: sudo apt install ffmpeg  or  brew install ffmpeg",
    ),
    "VIDEOFORGE_UNSUPPORTED_MEDIA": VideoForgeError(
        severity="ERROR",
        code="VIDEOFORGE_UNSUPPORTED_MEDIA",
        user_message="Unsupported media format. Supported: mp4, mov, mkv, webm, avi, wav, mp3, flac, ogg, m4a, png, jpg, webp, srt, vtt.",
        developer_diagnostic="File extension not in supported format list.",
        recovery_hint="Convert the file to a supported format and try again.",
    ),
    "VIDEOFORGE_INVALID_PROJECT_SCHEMA": VideoForgeError(
        severity="FATAL",
        code="VIDEOFORGE_INVALID_PROJECT_SCHEMA",
        user_message="Project file is corrupted or from an incompatible version.",
        developer_diagnostic="Schema version mismatch or missing required fields.",
        recovery_hint="Check that the project file has schemaVersion and projectId at minimum.",
    ),
    "VIDEOFORGE_RENDER_FAILED": VideoForgeError(
        severity="ERROR",
        code="VIDEOFORGE_RENDER_FAILED",
        user_message="FFmpeg rendering failed. Check logs for details.",
        developer_diagnostic="FFmpeg process returned non-zero exit code.",
        recovery_hint="Review the render ledger for FFmpeg stderr output.",
    ),
    "VIDEOFORGE_INVALID_TIMELINE": VideoForgeError(
        severity="ERROR",
        code="VIDEOFORGE_INVALID_TIMELINE",
        user_message="Timeline has no clips or has overlapping clips. Add media before exporting.",
        developer_diagnostic="Timeline is empty or has non-contiguous clip ranges.",
        recovery_hint="Add clips via /forge import before exporting.",
    ),
    "VIDEOFORGE_MISSING_SOURCE_FILE": VideoForgeError(
        severity="ERROR",
        code="VIDEOFORGE_MISSING_SOURCE_FILE",
        user_message="A source media file is missing. It may have been moved or deleted.",
        developer_diagnostic="Source path referenced in media bin does not exist on disk.",
        recovery_hint="Re-import the missing file or remove it from the project.",
    ),
    "VIDEOFORGE_PRESET_UNKNOWN": VideoForgeError(
        severity="ERROR",
        code="VIDEOFORGE_PRESET_UNKNOWN",
        user_message="Unknown export preset. Use /forge export list to see available presets.",
        developer_diagnostic="Preset name not found in EXPORT_PRESETS registry.",
        recovery_hint="Run /forge export list to see valid presets.",
    ),
    "VIDEOFORGE_FILTER_UNSUPPORTED": VideoForgeError(
        severity="WARN",
        code="VIDEOFORGE_FILTER_UNSUPPORTED",
        user_message="This filter is not supported in MVP mode.",
        developer_diagnostic="Filter name not in EFFECTS or TRANSITIONS registry.",
        recovery_hint="Use a supported effect or enable advanced mode.",
    ),
    "VIDEOFORGE_EXPORT_PATH_INVALID": VideoForgeError(
        severity="ERROR",
        code="VIDEOFORGE_EXPORT_PATH_INVALID",
        user_message="Export path is invalid or not writable.",
        developer_diagnostic="Output directory does not exist or is not writable.",
        recovery_hint="Make sure the output directory exists and is writable.",
    ),
    "VIDEOFORGE_CLIP_NOT_FOUND": VideoForgeError(
        severity="ERROR",
        code="VIDEOFORGE_CLIP_NOT_FOUND",
        user_message="Clip not found on the timeline.",
        developer_diagnostic="clip_id does not exist in timeline items.",
        recovery_hint="Use /forge timeline to list clip IDs.",
    ),
    "VIDEOFORGE_TRANSITION_NOT_FOUND": VideoForgeError(
        severity="ERROR",
        code="VIDEOFORGE_TRANSITION_NOT_FOUND",
        user_message="One or both clips for the transition were not found.",
        developer_diagnostic="from_clip_id or to_clip_id not found in timeline.",
        recovery_hint="Verify clip IDs with /forge timeline.",
    ),
    "VIDEOFORGE_EFFECT_NOT_FOUND": VideoForgeError(
        severity="ERROR",
        code="VIDEOFORGE_EFFECT_NOT_FOUND",
        user_message="Unknown effect name.",
        developer_diagnostic="effect_name not in EFFECTS registry.",
        recovery_hint="Run /forge effect list to see available effects.",
    ),
}


def get_error(code: str) -> VideoForgeError:
    err = ERRORS.get(code)
    if err is None:
        return VideoForgeError(
            severity="ERROR",
            code=code,
            user_message=f"Error {code}",
            developer_diagnostic="Unknown error code.",
            recovery_hint="",
        )
    return err
