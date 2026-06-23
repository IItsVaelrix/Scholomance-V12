from __future__ import annotations
from typing import Optional

from video_forge.schema import VideoProject, TextOverlayOp, EffectOp
from video_forge.presets import PRESETS
from video_forge.effects import EFFECTS
from video_forge.transitions import TRANSITIONS
from video_forge.errors import get_error

SMALL = 1e-9


class FfmpegCommandBuilder:
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg_path = ffmpeg_path

    def build(self, project: VideoProject, preset_name: str, output_path: str) -> list[str]:
        preset = PRESETS.get(preset_name)
        if preset is None:
            raise get_error("VIDEOFORGE_PRESET_UNKNOWN")
        tm = project.timeline
        if not tm:
            raise get_error("VIDEOFORGE_INVALID_TIMELINE")

        is_audio_only = preset.get("audio_only", False)

        if is_audio_only:
            return self._build_audio_only(project, preset_name, output_path)
        return self._build_video(project, preset_name, output_path)

    def _build_audio_only(self, project: VideoProject, preset_name: str, output_path: str) -> list[str]:
        preset = PRESETS[preset_name]
        cmd = [self.ffmpeg_path, "-y"]
        audio_sources = []
        filter_parts = []
        index = 0

        for track in project.audio_tracks:
            audio_sources.extend(["-i", track.file_path])
            af = f"[{index}:a]"
            filter_parts.append(af)
            index += 1

        for clip in project.timeline:
            audio_sources.extend(["-i", clip.media_id])
            af = f"[{index}:a]"
            filter_parts.append(af)
            index += 1

        if filter_parts:
            amix = "".join(filter_parts) + f"amix=inputs={len(filter_parts)}:duration=first[aout]"
            cmd.extend(audio_sources)
            cmd.extend(["-filter_complex", amix, "-map", "[aout]"])
        else:
            cmd.extend(audio_sources)
            cmd.extend(["-map", "0:a:0"])

        cmd.extend(["-c:a", preset["audio_codec"]])
        if preset.get("audio_bitrate"):
            cmd.extend(["-b:a", preset["audio_bitrate"]])
        cmd.append(output_path)
        return cmd

    def _build_video(self, project: VideoProject, preset_name: str, output_path: str) -> list[str]:
        preset = PRESETS[preset_name]
        cmd = [self.ffmpeg_path, "-y"]

        streams_added = set()
        filter_chains = []
        concat_inputs = []
        clip_map = {c.clip_id: c for c in project.timeline}
        sorted_clips = sorted(project.timeline, key=lambda c: (c.timeline_index, c.track_index))

        for clip in sorted_clips:
            media = project.media_bin.get(clip.media_id)
            if media is None:
                raise get_error("VIDEOFORGE_MISSING_SOURCE_FILE")
            source_path = media.file_path
            if source_path not in streams_added:
                cmd.extend(["-i", source_path])
                streams_added.add(source_path)

            stream_idx = list(streams_added).index(source_path)
            duration = clip.end_time - clip.start_time
            if duration <= SMALL:
                continue

            ss = clip.source_start
            to_val = clip.source_end - clip.source_start
            label = f"c{clip.clip_id}"
            filter_parts = []

            filter_parts.append(f"[{stream_idx}:v]trim=start={ss}:duration={to_val},setpts=PTS-STARTPTS[v{label}]")
            filter_parts.append(f"[{stream_idx}:a]atrim=start={ss}:duration={to_val},asetpts=PTS-STARTPTS[a{label}]")

            for eff in clip.effects:
                vf = self._build_effect_filter(eff)
                if vf:
                    filter_parts.append(f"[v{label}]{vf}[v{label}]")

            if clip.speed != 1.0:
                sp = clip.speed
                if sp < 1.0:
                    filter_parts.append(f"[v{label}]setpts={sp}*PTS[v{label}]")
                    filter_parts.append(f"[a{label}]atempo={1.0/sp}[a{label}]")
                else:
                    filter_parts.append(f"[v{label}]setpts={sp}*PTS[v{label}]")
                    filter_parts.append(f"[a{label}]atempo={1.0/sp}[a{label}]")

            if clip.muted:
                filter_parts.append(f"[a{label}]volume=0[a{label}]")
            elif clip.volume != 1.0:
                filter_parts.append(f"[a{label}]volume={clip.volume}[a{label}]")

            if clip.audio_replace_path:
                if clip.audio_replace_path not in streams_added:
                    cmd.extend(["-i", clip.audio_replace_path])
                    streams_added.add(clip.audio_replace_path)
                audio_stream_idx = list(streams_added).index(clip.audio_replace_path)
                rep_dur = min(duration, 999.0)
                filter_parts.append(f"[{audio_stream_idx}:a]atrim=duration={rep_dur},asetpts=PTS-STARTPTS[ar{label}]")
                filter_parts.append(f"[a{label}][ar{label}]amix=inputs=2:duration=first:dropout_transition=2[amix{label}]")
                filter_parts.append(f"[amix{label}]volume={clip.volume}[a{label}]")

            concat_inputs.append(f"[v{label}][a{label}]")
            filter_chains.extend(filter_parts)

        if not concat_inputs:
            raise get_error("VIDEOFORGE_INVALID_TIMELINE")

        for t in project.transitions:
            fc = clip_map.get(t.from_clip_id)
            tc = clip_map.get(t.to_clip_id)
            if fc is None or tc is None:
                continue
            trans_def = TRANSITIONS.get(t.transition_type)
            if trans_def is None or trans_def["ffmpeg"] is None:
                continue
            idx_from = sorted_clips.index(fc) if fc in sorted_clips else -1
            idx_to = sorted_clips.index(tc) if tc in sorted_clips else -1
            if idx_from < 0 or idx_to < 0:
                continue
            i = idx_from
            v0 = f"v{fc.clip_id}"
            v1 = f"v{tc.clip_id}"
            a0 = f"a{fc.clip_id}"
            a1 = f"a{tc.clip_id}"
            offset = fc.end_time - fc.start_time - t.duration_secs
            if offset < 0:
                offset = 0
            xfade = f"[v{v0}][v{v1}]xfade=transition={trans_def['ffmpeg'].split('transition=')[1].split(':')[0]}:duration={t.duration_secs}:offset={offset}[vout{i}]"
            acrossfade = f"[a{a0}][a{a1}]acrossfade=d={t.duration_secs}[aout{i}]"
            filter_chains.append(xfade)
            filter_chains.append(acrossfade)
            concat_inputs[i] = f"[vout{i}][aout{i}]"

        concat_desc = "".join(concat_inputs) + f"concat=n={len(concat_inputs)}:v=1:a=1[vid][aud]"
        filter_chains.append(concat_desc)
        full_filter = ";".join(filter_chains)

        cmd.extend(["-filter_complex", full_filter, "-map", "[vid]", "-map", "[aud]"])
        cmd.extend(["-c:v", preset["video_codec"]])
        if preset.get("video_bitrate"):
            cmd.extend(["-b:v", preset["video_bitrate"]])
        cmd.extend(["-c:a", preset["audio_codec"]])
        if preset.get("audio_bitrate"):
            cmd.extend(["-b:a", preset["audio_bitrate"]])
        if preset.get("pixel_format"):
            cmd.extend(["-pix_fmt", preset["pixel_format"]])
        if preset.get("width") and preset.get("height"):
            cmd.extend(["-vf", f"scale={preset['width']}:{preset['height']}"])
        if preset.get("flags"):
            for flag in preset["flags"]:
                cmd.extend(["-movflags", flag])
        cmd.append(output_path)
        return cmd

    def _build_effect_filter(self, effect: EffectOp) -> str:
        effect_def = EFFECTS.get(effect.effect_name)
        if effect_def is None:
            return ""
        template = effect_def["filter"]
        try:
            return template.format(**effect.params)
        except KeyError:
            return template

    def build_text_overlay(self, overlay: TextOverlayOp, width: int = 1920, height: int = 1080) -> str:
        from video_forge.text_cards import resolve_preset
        preset = resolve_preset(overlay.style_preset, overlay.text, overlay.duration_secs)
        fs = overlay.font_size or preset.font_size
        fc = overlay.font_color or preset.font_color
        pos_map = {"center": "(w-text_w)/2:(h-text_h)/2",
                    "top": "(w-text_w)/2:50",
                    "bottom": "(w-text_w)/2:h-text_h-50",
                    "lower_third": "(w-text_w)/2:h*0.8"}
        pos = pos_map.get(overlay.position, pos_map["center"])
        parts = [f"drawtext=text='{overlay.text}':fontsize={fs}:fontcolor={fc}:x={pos}:y={pos}:enable='between(t,0,{overlay.duration_secs})'"]
        if preset.shadow:
            parts[0] += ":shadowcolor=black@0.6:shadowx=2:shadowy=2"
        if preset.outline:
            oc = preset.outline_color
            parts[0] += f":bordercolor={oc}:borderw=2"
        return parts[0]

    def build_music_mix(self, project: VideoProject) -> Optional[list[str]]:
        music_tracks = [t for t in project.audio_tracks if t.track_type == "music"]
        if not music_tracks:
            return None
        filters = []
        for i, t in enumerate(music_tracks):
            fi = f"[{i + len(project.timeline)}:a]"
            filters.append(fi)
        mix = "".join(filters) + f"amix=inputs={len(filters)}:duration=first[music]"
        return [mix]

    def build_narration_mix(self, project: VideoProject) -> Optional[list[str]]:
        narr_tracks = [t for t in project.audio_tracks if t.track_type == "narration"]
        if not narr_tracks:
            return None
        filters = []
        for i, t in enumerate(narr_tracks):
            fi = f"[{i + len(project.timeline) + len([x for x in project.audio_tracks if x.track_type == 'music'])}:a]"
            filters.append(fi)
        mix = "".join(filters) + "amix=inputs={len(filters)}:duration=first[narration]"
        return [mix]
