from __future__ import annotations
import json
import hashlib
from dataclasses import dataclass, field
from typing import Optional

from video_forge import SCHEMA_VERSION, DETERMINISM_VERSION
from video_forge.presets import PRESETS
from video_forge.effects import EFFECTS
from video_forge.transitions import TRANSITIONS


@dataclass
class MediaItem:
    media_id: str
    file_path: str
    file_type: str
    duration_secs: float
    width: int
    height: int
    fps: float
    audio_channels: int
    file_hash: str
    label: str = ""


@dataclass
class TimelineClip:
    clip_id: str
    media_id: str
    track_index: int
    timeline_index: int
    start_time: float
    end_time: float
    source_start: float
    source_end: float
    speed: float = 1.0
    muted: bool = False
    volume: float = 1.0
    effects: list[EffectOp] = field(default_factory=list)
    audio_replace_path: Optional[str] = None


@dataclass
class EffectOp:
    effect_name: str
    params: dict = field(default_factory=dict)


@dataclass
class TransitionOp:
    from_clip_id: str
    to_clip_id: str
    transition_type: str
    duration_secs: float


@dataclass
class TextOverlayOp:
    clip_id: str
    text: str
    style_preset: str
    duration_secs: float
    position: str = "center"
    font_size: Optional[int] = None
    overlay_type: str = "caption"


@dataclass
class AudioTrackOp:
    track_id: str
    file_path: str
    volume: float = 1.0
    start_offset: float = 0.0
    track_type: str = "music"
    fade_in_secs: float = 0.0
    fade_out_secs: float = 0.0


@dataclass
class RenderLedger:
    render_id: str
    preset: str
    ffmpeg_command: list[str]
    ffmpeg_version: str
    output_path: str
    status: str
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_secs: Optional[float] = None
    recipe_hash: str = ""


@dataclass
class VideoProject:
    schema_version: str = SCHEMA_VERSION
    determinism_version: str = DETERMINISM_VERSION
    project_id: str = ""
    project_name: str = ""
    media_bin: dict[str, MediaItem] = field(default_factory=dict)
    timeline: list[TimelineClip] = field(default_factory=list)
    transitions: list[TransitionOp] = field(default_factory=list)
    text_overlays: list[TextOverlayOp] = field(default_factory=list)
    audio_tracks: list[AudioTrackOp] = field(default_factory=list)
    render_presets: list[str] = field(default_factory=lambda: ["youtube_1080p_mp4"])
    last_render_ledger: Optional[RenderLedger] = None


_SMALL = 1e-9


def _clip_sort_key(c: TimelineClip) -> tuple:
    return (c.timeline_index, c.track_index)


def compute_project_recipe_hash(project: VideoProject) -> str:
    h = hashlib.sha256()
    for cid in sorted(project.media_bin.keys()):
        m = project.media_bin[cid]
        h.update(f"{m.media_id}:{m.file_hash}:{m.duration_secs}\n".encode())
    for c in sorted(project.timeline, key=_clip_sort_key):
        h.update(f"{c.clip_id}:{c.media_id}:{c.start_time}:{c.end_time}:{c.source_start}:{c.source_end}:{c.speed}:{c.muted}:{c.volume}\n".encode())
    for t in sorted(project.transitions, key=lambda x: x.from_clip_id + x.to_clip_id):
        h.update(f"{t.from_clip_id}:{t.to_clip_id}:{t.transition_type}:{t.duration_secs}\n".encode())
    for a in sorted(project.audio_tracks, key=lambda x: x.track_id):
        h.update(f"{a.track_id}:{a.file_path}:{a.volume}:{a.start_offset}\n".encode())
    return h.hexdigest()[:32]


def validate_timeline(timeline: list[TimelineClip]) -> list[str]:
    errors = []
    if not timeline:
        errors.append("Timeline is empty. Add clips before exporting.")
        return errors
    seen_ids = {}
    for c in timeline:
        if c.clip_id in seen_ids:
            errors.append(f"Duplicate clip_id: {c.clip_id}")
        seen_ids[c.clip_id] = c
        if c.start_time >= c.end_time - _SMALL:
            errors.append(f"Clip {c.clip_id}: start_time >= end_time")
    return errors


def timeline_duration(timeline: list[TimelineClip]) -> float:
    if not timeline:
        return 0.0
    return max(c.end_time for c in timeline)


def to_dict(project: VideoProject) -> dict:
    def _media_to_dict(m: MediaItem) -> dict:
        return {
            "mediaId": m.media_id, "filePath": m.file_path, "fileType": m.file_type,
            "durationSecs": m.duration_secs, "width": m.width, "height": m.height,
            "fps": m.fps, "audioChannels": m.audio_channels,
            "fileHash": m.file_hash, "label": m.label,
        }
    def _clip_to_dict(c: TimelineClip) -> dict:
        return {
            "clipId": c.clip_id, "mediaId": c.media_id,
            "trackIndex": c.track_index, "timelineIndex": c.timeline_index,
            "startTime": c.start_time, "endTime": c.end_time,
            "sourceStart": c.source_start, "sourceEnd": c.source_end,
            "speed": c.speed, "muted": c.muted, "volume": c.volume,
            "effects": [{"effectName": e.effect_name, "params": e.params} for e in c.effects],
            "audioReplacePath": c.audio_replace_path,
        }
    def _transition_to_dict(t: TransitionOp) -> dict:
        return {
            "fromClipId": t.from_clip_id, "toClipId": t.to_clip_id,
            "transitionType": t.transition_type, "durationSecs": t.duration_secs,
        }
    def _text_to_dict(t: TextOverlayOp) -> dict:
        return {
            "clipId": t.clip_id, "text": t.text, "stylePreset": t.style_preset,
            "durationSecs": t.duration_secs, "position": t.position,
            "fontSize": t.font_size, "overlayType": t.overlay_type,
        }
    def _audio_to_dict(a: AudioTrackOp) -> dict:
        return {
            "trackId": a.track_id, "filePath": a.file_path, "volume": a.volume,
            "startOffset": a.start_offset, "trackType": a.track_type,
            "fadeInSecs": a.fade_in_secs, "fadeOutSecs": a.fade_out_secs,
        }
    def _ledger_to_dict(l: RenderLedger) -> dict:
        return {
            "renderId": l.render_id, "preset": l.preset,
            "ffmpegCommand": l.ffmpeg_command, "ffmpegVersion": l.ffmpeg_version,
            "outputPath": l.output_path, "status": l.status,
            "errors": l.errors, "warnings": l.warnings,
            "startedAt": l.started_at, "completedAt": l.completed_at,
            "durationSecs": l.duration_secs, "recipeHash": l.recipe_hash,
        }
    return {
        "schemaVersion": project.schema_version,
        "determinismVersion": project.determinism_version,
        "projectId": project.project_id,
        "projectName": project.project_name,
        "mediaBin": {k: _media_to_dict(v) for k, v in project.media_bin.items()},
        "timeline": sorted([_clip_to_dict(c) for c in project.timeline], key=lambda x: (x["timelineIndex"], x["trackIndex"])),
        "transitions": [_transition_to_dict(t) for t in project.transitions],
        "textOverlays": [_text_to_dict(t) for t in project.text_overlays],
        "audioTracks": [_audio_to_dict(a) for a in project.audio_tracks],
        "renderPresets": project.render_presets,
        "lastRenderLedger": _ledger_to_dict(project.last_render_ledger) if project.last_render_ledger else None,
    }


def from_dict(data: dict) -> VideoProject:
    if data.get("schemaVersion", "").split("-")[0] != "VIDEO":
        from video_forge.errors import get_error
        raise get_error("VIDEOFORGE_INVALID_PROJECT_SCHEMA")
    proj = VideoProject(
        schema_version=data.get("schemaVersion", SCHEMA_VERSION),
        determinism_version=data.get("determinismVersion", DETERMINISM_VERSION),
        project_id=data.get("projectId", ""),
        project_name=data.get("projectName", ""),
    )
    mb = data.get("mediaBin", {})
    for k, v in mb.items():
        proj.media_bin[k] = MediaItem(
            media_id=v.get("mediaId", k), file_path=v.get("filePath", ""),
            file_type=v.get("fileType", ""), duration_secs=v.get("durationSecs", 0.0),
            width=v.get("width", 0), height=v.get("height", 0), fps=v.get("fps", 0.0),
            audio_channels=v.get("audioChannels", 0), file_hash=v.get("fileHash", ""),
            label=v.get("label", ""),
        )
    tl = data.get("timeline", [])
    for c in tl:
        proj.timeline.append(TimelineClip(
            clip_id=c.get("clipId", ""), media_id=c.get("mediaId", ""),
            track_index=c.get("trackIndex", 0), timeline_index=c.get("timelineIndex", 0),
            start_time=c.get("startTime", 0.0), end_time=c.get("endTime", 0.0),
            source_start=c.get("sourceStart", 0.0), source_end=c.get("sourceEnd", 0.0),
            speed=c.get("speed", 1.0), muted=c.get("muted", False),
            volume=c.get("volume", 1.0),
            effects=[EffectOp(e["effectName"], e.get("params", {})) for e in c.get("effects", [])],
            audio_replace_path=c.get("audioReplacePath"),
        ))
    for t in data.get("transitions", []):
        proj.transitions.append(TransitionOp(
            from_clip_id=t["fromClipId"], to_clip_id=t["toClipId"],
            transition_type=t["transitionType"], duration_secs=t["durationSecs"],
        ))
    for t in data.get("textOverlays", []):
        proj.text_overlays.append(TextOverlayOp(
            clip_id=t["clipId"], text=t["text"], style_preset=t["stylePreset"],
            duration_secs=t["durationSecs"], position=t.get("position", "center"),
            font_size=t.get("fontSize"), overlay_type=t.get("overlayType", "caption"),
        ))
    for a in data.get("audioTracks", []):
        proj.audio_tracks.append(AudioTrackOp(
            track_id=a["trackId"], file_path=a["filePath"], volume=a.get("volume", 1.0),
            start_offset=a.get("startOffset", 0.0), track_type=a.get("trackType", "music"),
            fade_in_secs=a.get("fadeInSecs", 0.0), fade_out_secs=a.get("fadeOutSecs", 0.0),
        ))
    proj.render_presets = data.get("renderPresets", ["youtube_1080p_mp4"])
    lr = data.get("lastRenderLedger")
    if lr:
        proj.last_render_ledger = RenderLedger(
            render_id=lr["renderId"], preset=lr["preset"],
            ffmpeg_command=lr["ffmpegCommand"], ffmpeg_version=lr["ffmpegVersion"],
            output_path=lr["outputPath"], status=lr["status"],
            errors=lr.get("errors", []), warnings=lr.get("warnings", []),
            started_at=lr.get("startedAt"), completed_at=lr.get("completedAt"),
            duration_secs=lr.get("durationSecs"), recipe_hash=lr.get("recipeHash", ""),
        )
    return proj


def project_to_json(project: VideoProject) -> str:
    return json.dumps(to_dict(project), indent=2, ensure_ascii=False)


def project_from_json(text: str) -> VideoProject:
    return from_dict(json.loads(text))
