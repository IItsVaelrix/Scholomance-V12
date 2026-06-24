import os
import uuid
import threading

from video_forge.project_store import ProjectStore
from video_forge.ffprobe_service import FfprobeService, is_supported, classify_file
from video_forge.render_service import RenderService
from video_forge.ledger import LedgerViewer
from video_forge.schema import (
    VideoProject, MediaItem, TimelineClip, EffectOp, TransitionOp,
    TextOverlayOp, AudioTrackOp, compute_project_recipe_hash,
)
from video_forge.presets import PRESETS
from video_forge.effects import EFFECTS
from video_forge.transitions import TRANSITIONS
from video_forge.text_cards import PIXELBRAIN_PRESETS


GOLD = "#FFD700"
PURPLE = "#B388FF"
SUCCESS = "#7CFF8B"
WARNING = "#FFD166"
ERROR = "#FF5C7A"
MUTED = "#6A5A6A"
CRIMSON = "#DC143C"


class VideoForgeService:
    def __init__(self, base_dir="video_forge/projects"):
        self.store = ProjectStore(base_dir)
        try:
            self.ffprobe = FfprobeService()
            self.ffprobe_ok = True
        except Exception:
            self.ffprobe = None
            self.ffprobe_ok = False
        try:
            self.renderer = RenderService(project_store=self.store)
            self.renderer_ok = True
        except Exception:
            self.renderer = None
            self.renderer_ok = False
        self.ledger_viewer = LedgerViewer(self.store)
        self.current_project: VideoProject | None = None
        self._clip_counter = 0

    def _next_clip_id(self) -> str:
        self._clip_counter += 1
        return f"clip_{self._clip_counter:04d}"

    def _next_track_id(self) -> str:
        return f"track_{uuid.uuid4().hex[:6]}"

    def _log(self, callback, msg: str, color=MUTED):
        if callback:
            callback(f"[{color}]{msg}[/]")

    def cmd_forge(self, args: list[str], callback) -> str:
        if not args:
            return self._forge_home(callback)
            
        # Strip '/forge' or 'forge' prefix if user typed it
        if args[0].lower() in ('/forge', 'forge'):
            args = args[1:]
            if not args:
                return self._forge_home(callback)
                
        sub = args[0].lower()
        sub_args = args[1:]

        dispatch = {
            "new": self._forge_new,
            "import": self._forge_import,
            "timeline": self._forge_timeline,
            "add-title": self._forge_add_title,
            "add-caption": self._forge_add_caption,
            "add-credit": self._forge_add_credit,
            "trim": self._forge_trim,
            "split": self._forge_split,
            "move": self._forge_move,
            "delete": self._forge_delete,
            "transition": self._forge_transition,
            "music": self._forge_music,
            "narration": self._forge_narration,
            "effect": self._forge_effect,
            "export": self._forge_export,
            "ledger": self._forge_ledger,
            "presets": self._forge_presets,
            "effects": self._forge_list_effects,
            "transitions": self._forge_list_transitions,
            "project": self._forge_project_info,
            "list": self._forge_list_projects,
            "open": self._forge_open,
            "load": self._forge_open,
            "duplicate": self._forge_duplicate,
            "mute": self._forge_mute,
            "detach-audio": self._forge_detach_audio,
            "snapshot": self._forge_snapshot,
            "freeze": self._forge_freeze,
            "recipe": self._forge_recipe,
            "apply": self._forge_apply,
        }
        handler = dispatch.get(sub)
        if handler is None:
            callback(f"[{ERROR}]Unknown forge command: {sub}. " 
                     f"Try: new, import, timeline, add-title, add-caption, add-credit, "
                     f"trim, split, move, delete, transition, music, narration, "
                     f"effect, export, ledger, presets, effects, transitions, list, open.")
            return ""
        return handler(sub_args, callback)

    def _forge_home(self, callback) -> str:
        lines = [
            f"[bold {GOLD}]╔══════════════════════════════════════╗[/]",
            f"[bold {GOLD}]║     V I D E O   F O R G E           ║[/]",
            f"[bold {GOLD}]║  PixelBrain Video Workstation       ║[/]",
            f"[bold {GOLD}]╚══════════════════════════════════════╝[/]",
            "",
        ]
        if self.current_project:
            lines.append(f"[bold {PURPLE}]Current Project:[/] [{GOLD}]{self.current_project.project_name}[/]")
            lines.append(f"[{MUTED}]  ID: {self.current_project.project_id}[/]")
            lines.append(f"[{MUTED}]  Clips: {len(self.current_project.timeline)}  Media: {len(self.current_project.media_bin)}  Audio Tracks: {len(self.current_project.audio_tracks)}[/]")
        else:
            lines.append(f"[{WARNING}]No project loaded. Start with /forge new <name> or /forge open <id>[/]")
        lines.extend([
            "",
            f"[bold {GOLD}]Commands:[/]",
            f"  [{PURPLE}]/forge new <name>[/]     — Create project",
            f"  [{PURPLE}]/forge import <path>[/]   — Import media",
            f"  [{PURPLE}]/forge timeline[/]        — Show timeline",
            f"  [{PURPLE}]/forge trim/split/move/delete[/] — Edit clips",
            f"  [{PURPLE}]/forge add-title/caption/credit[/] — Text cards",
            f"  [{PURPLE}]/forge transition[/]      — Add transitions",
            f"  [{PURPLE}]/forge export <preset>[/]  — Render video",
            f"  [{PURPLE}]/forge ledger[/]           — Show renders",
            f"  [{PURPLE}]/forge recipe[/]           — Dump project as JSON (AI-editable)",
            f"  [{PURPLE}]/forge apply <file>[/]      — Load modified JSON recipe",
            f"  [{PURPLE}]/forge list[/]             — List projects",
            f"  [{PURPLE}]/forge open <id>[/]        — Load project",
            "",
            f"[{MUTED}]Type /forge <command> --help for details.[/]",
        ])
        for line in lines:
            callback(line)
        return "forge_home"

    def _forge_new(self, args: list[str], callback) -> str:
        name = " ".join(args) if args else "Untitled Project"
        proj = VideoProject(
            project_id=uuid.uuid4().hex[:12],
            project_name=name,
        )
        path = self.store.save(proj)
        self.current_project = proj
        callback(f"[bold {SUCCESS}]✔ Created project:[/] [{GOLD}]{name}[/]")
        callback(f"[{MUTED}]  ID: {proj.project_id}[/]")
        callback(f"[{MUTED}]  Path: {path}[/]")
        return "forge_new"

    def _forge_import(self, args: list[str], callback) -> str:
        if not args:
            callback(f"[{ERROR}]Usage: /forge import <file_path>[/]")
            return "forge_import_error"
        path = os.path.abspath(" ".join(args))
        if not os.path.isfile(path):
            callback(f"[{ERROR}]File not found: {path}[/]")
            return "forge_import_error"
        if not is_supported(path):
            callback(f"[{ERROR}]Unsupported file format. Supported: mp4, mov, mkv, webm, avi, wav, mp3, flac, ogg, m4a, png, jpg, webp, srt, vtt.[/]")
            return "forge_import_error"
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded. Create one with /forge new <name>[/]")
            return "forge_import_error"

        if self.ffprobe is None:
            callback(f"[{ERROR}]ffprobe not available. Media imported without metadata.[/]")
            media_id = f"media_{len(self.current_project.media_bin) + 1:04d}"
            meta = {
                "duration_secs": 10.0, "width": 1920, "height": 1080,
                "fps": 30.0, "audio_channels": 2, "file_type": classify_file(path),
                "file_hash": "unknown",
            }
        else:
            try:
                meta = self.ffprobe.extract_metadata(path)
            except Exception as e:
                callback(f"[{ERROR}]Failed to probe media: {e}[/]")
                return "forge_import_error"
            media_id = f"media_{len(self.current_project.media_bin) + 1:04d}"

        item = MediaItem(
            media_id=media_id,
            file_path=path,
            file_type=meta["file_type"],
            duration_secs=meta["duration_secs"],
            width=meta["width"],
            height=meta["height"],
            fps=meta["fps"],
            audio_channels=meta["audio_channels"],
            file_hash=meta["file_hash"],
            label=os.path.basename(path),
        )
        self.current_project.media_bin[media_id] = item

        clip_id = self._next_clip_id()
        dur = item.duration_secs if item.duration_secs > 0 else 10.0
        clip = TimelineClip(
            clip_id=clip_id,
            media_id=media_id,
            track_index=0,
            timeline_index=len(self.current_project.timeline),
            start_time=0.0,
            end_time=dur,
            source_start=0.0,
            source_end=dur,
        )
        self.current_project.timeline.append(clip)
        self.store.save(self.current_project)

        type_icon = {"video": "🎬", "audio": "🎵", "image": "🖼", "subtitle": "📝"}.get(item.file_type, "📁")
        callback(f"[bold {SUCCESS}]✔ Imported:[/] {type_icon} [{GOLD}]{item.label}[/]")
        callback(f"[{MUTED}]  ID: {media_id} | Clip: {clip_id} | "
                 f"{item.width}x{item.height} | {item.duration_secs:.1f}s | "
                 f"{item.fps:.0f}fps | {item.audio_channels}ch[/]")
        return "forge_import"

    def _forge_timeline(self, args: list[str], callback) -> str:
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_timeline_error"
        proj = self.current_project
        if not proj.timeline:
            callback(f"[{WARNING}]Timeline is empty. Import media with /forge import <path>[/]")
            return "forge_timeline_empty"

        lines = [f"[bold {GOLD}]═══ TIMELINE ═══[/]"]
        sorted_clips = sorted(proj.timeline, key=lambda c: (c.timeline_index, c.track_index))
        for c in sorted_clips:
            media = proj.media_bin.get(c.media_id)
            label = media.label if media else c.media_id
            dur = c.end_time - c.start_time
            color_band = self._clip_color(c.clip_id)
            eff_str = f" +{len(c.effects)} effects" if c.effects else ""
            muted_str = " [MUTED]" if c.muted else ""
            speed_str = f" x{c.speed}" if c.speed != 1.0 else ""
            lines.append(
                f"  [{color_band}]■[/] [{GOLD}]{c.clip_id}[/] "
                f"[{MUTED}]{label}[/] "
                f"[{PURPLE}]{c.source_start:.1f}-{c.source_end:.1f}s[/] "
                f"[{MUTED}]→ {dur:.1f}s on track {c.track_index}[/]"
                f"[{WARNING}]{eff_str}{muted_str}{speed_str}[/]"
            )

        for t in proj.transitions:
            lines.append(f"  [{CRIMSON}]↗[/] [{PURPLE}]{t.transition_type}[/] {t.from_clip_id} → {t.to_clip_id} [{MUTED}]{t.duration_secs}s[/]")

        for text_op in proj.text_overlays:
            lines.append(f"  [{GOLD}]T[/] [{PURPLE}]{text_op.overlay_type}[/] on {text_op.clip_id}: \"{text_op.text[:40]}...\" [{MUTED}]{text_op.duration_secs}s[/]")

        for a in proj.audio_tracks:
            lines.append(f"  [{CRIMSON}]♪[/] [{PURPLE}]{a.track_type}[/] {a.file_path} [{MUTED}]vol={a.volume} fade={a.fade_in_secs}/{a.fade_out_secs}s[/]")

        lines.append(f"[{MUTED}]Total duration: {max((c.end_time for c in proj.timeline), default=0.0):.1f}s | "
                     f"Clips: {len(proj.timeline)} | Transitions: {len(proj.transitions)} | "
                     f"Text: {len(proj.text_overlays)} | Audio tracks: {len(proj.audio_tracks)}[/]")

        for line in lines:
            callback(line)
        return "forge_timeline"

    def _clip_color(self, clip_id: str) -> str:
        h = hash(clip_id) % 6
        palette = ["#FFD700", "#B388FF", "#7CFF8B", "#FFD166", "#DC143C", "#00FFCC"]
        return palette[h]

    def _forge_add_title(self, args: list[str], callback) -> str:
        if not args:
            callback(f"[{ERROR}]Usage: /forge add-title <text> [--preset <name>] [--duration <secs>][/]")
            return "forge_add_title_error"
        text = " ".join(args)
        preset_name = "void_crystal"
        duration = 5.0
        self._add_text_card(text, preset_name, duration, "title", callback)
        return "forge_add_title"

    def _forge_add_caption(self, args: list[str], callback) -> str:
        if not args:
            callback(f"[{ERROR}]Usage: /forge add-caption <text> [--preset <name>][/]")
            return "forge_add_caption_error"
        text = " ".join(args)
        preset_name = "neon_rune"
        duration = 3.0
        self._add_text_card(text, preset_name, duration, "caption", callback)
        return "forge_add_caption"

    def _forge_add_credit(self, args: list[str], callback) -> str:
        if not args:
            callback(f"[{ERROR}]Usage: /forge add-credit <text> [--preset <name>][/]")
            return "forge_add_credit_error"
        text = " ".join(args)
        preset_name = "golden_lattice"
        duration = 4.0
        self._add_text_card(text, preset_name, duration, "credit", callback)
        return "forge_add_credit"

    def _add_text_card(self, text: str, preset_name: str, duration: float, overlay_type: str, callback):
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return
        if not self.current_project.timeline:
            callback(f"[{ERROR}]Timeline is empty. Add a clip first.[/]")
            return
        last_clip = max(self.current_project.timeline, key=lambda c: c.timeline_index)
        valid_presets = list(PIXELBRAIN_PRESETS.keys())
        if preset_name not in PIXELBRAIN_PRESETS:
            callback(f"[{WARNING}]Unknown preset '{preset_name}', using void_crystal. Available: {', '.join(valid_presets)}[/]")
            preset_name = "void_crystal"
        op = TextOverlayOp(
            clip_id=last_clip.clip_id,
            text=text,
            style_preset=preset_name,
            duration_secs=duration,
            position="center",
            overlay_type=overlay_type,
        )
        self.current_project.text_overlays.append(op)
        self.store.save(self.current_project)
        callback(f"[bold {SUCCESS}]✔ Added {overlay_type}:[/] \"{text[:50]}...\" [{MUTED}]{duration}s | preset: {preset_name}[/]")

    def _forge_trim(self, args: list[str], callback) -> str:
        if len(args) < 3:
            callback(f"[{ERROR}]Usage: /forge trim <clip_id> <start_secs> <end_secs>[/]")
            return "forge_trim_error"
        clip_id = args[0]
        try:
            start = float(args[1])
            end = float(args[2])
        except ValueError:
            callback(f"[{ERROR}]start and end must be numbers (seconds).[/]")
            return "forge_trim_error"
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_trim_error"
        for c in self.current_project.timeline:
            if c.clip_id == clip_id:
                media = self.current_project.media_bin.get(c.media_id)
                max_dur = media.duration_secs if media else 99999
                if start < 0 or end > max_dur or start >= end:
                    callback(f"[{ERROR}]Invalid trim range. Source duration: {max_dur:.1f}s[/]")
                    return "forge_trim_error"
                c.source_start = start
                c.source_end = end
                c.start_time = 0.0
                c.end_time = end - start
                self.store.save(self.current_project)
                callback(f"[bold {SUCCESS}]✔ Trimmed {clip_id}:[/] [{PURPLE}]{start:.1f}s → {end:.1f}s[/] ({end-start:.1f}s duration)")
                return "forge_trim"
        callback(f"[{ERROR}]Clip not found: {clip_id}[/]")
        return "forge_trim_error"

    def _forge_split(self, args: list[str], callback) -> str:
        if len(args) < 2:
            callback(f"[{ERROR}]Usage: /forge split <clip_id> <split_time_secs>[/]")
            return "forge_split_error"
        clip_id = args[0]
        try:
            split_at = float(args[1])
        except ValueError:
            callback(f"[{ERROR}]split_time must be a number (seconds).[/]")
            return "forge_split_error"
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[]")
            return "forge_split_error"
        tl = self.current_project.timeline
        for i, c in enumerate(tl):
            if c.clip_id == clip_id:
                if split_at <= c.source_start or split_at >= c.source_end:
                    callback(f"[{ERROR}]Split time must be between source range ({c.source_start:.1f}-{c.source_end:.1f}s)[/]")
                    return "forge_split_error"
                new_id = self._next_clip_id()
                c2 = TimelineClip(
                    clip_id=new_id,
                    media_id=c.media_id,
                    track_index=c.track_index,
                    timeline_index=c.timeline_index + 1,
                    start_time=split_at - c.source_start,
                    end_time=c.end_time,
                    source_start=split_at,
                    source_end=c.source_end,
                    speed=c.speed,
                    muted=c.muted,
                    volume=c.volume,
                )
                c.end_time = split_at - c.source_start
                c.source_end = split_at
                new_tl = tl[:i+1] + [c2] + tl[i+1:]
                for j, cl in enumerate(new_tl):
                    cl.timeline_index = j
                self.current_project.timeline = new_tl
                self.store.save(self.current_project)
                callback(f"[bold {SUCCESS}]✔ Split {clip_id} at {split_at:.1f}s → new clip: [{GOLD}]{new_id}[/]")
                return "forge_split"
        callback(f"[{ERROR}]Clip not found: {clip_id}[/]")
        return "forge_split_error"

    def _forge_move(self, args: list[str], callback) -> str:
        if len(args) < 2:
            callback(f"[{ERROR}]Usage: /forge move <clip_id> <new_index>[/]")
            return "forge_move_error"
        clip_id = args[0]
        try:
            new_idx = int(args[1])
        except ValueError:
            callback(f"[{ERROR}]new_index must be an integer.[/]")
            return "forge_move_error"
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_move_error"
        tl = self.current_project.timeline
        clip = next((c for c in tl if c.clip_id == clip_id), None)
        if clip is None:
            callback(f"[{ERROR}]Clip not found: {clip_id}[/]")
            return "forge_move_error"
        old_idx = clip.timeline_index
        if new_idx < 0 or new_idx >= len(tl):
            callback(f"[{ERROR}]Index out of range (0-{len(tl)-1})[/]")
            return "forge_move_error"
        tl.remove(clip)
        clip.timeline_index = new_idx
        tl.insert(new_idx, clip)
        for j, c in enumerate(tl):
            c.timeline_index = j
        self.store.save(self.current_project)
        callback(f"[bold {SUCCESS}]✔ Moved {clip_id}:[/] index {old_idx} → {new_idx}")
        return "forge_move"

    def _forge_delete(self, args: list[str], callback) -> str:
        if not args:
            callback(f"[{ERROR}]Usage: /forge delete <clip_id>[/]")
            return "forge_delete_error"
        clip_id = args[0]
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_delete_error"
        clip = next((c for c in self.current_project.timeline if c.clip_id == clip_id), None)
        if clip is None:
            callback(f"[{ERROR}]Clip not found: {clip_id}[/]")
            return "forge_delete_error"
        self.current_project.timeline.remove(clip)
        for j, c in enumerate(self.current_project.timeline):
            c.timeline_index = j
        self.current_project.transitions = [t for t in self.current_project.transitions
                                             if t.from_clip_id != clip_id and t.to_clip_id != clip_id]
        self.store.save(self.current_project)
        callback(f"[bold {SUCCESS}]✔ Deleted clip:[/] [{GOLD}]{clip_id}[/]")
        return "forge_delete"

    def _forge_duplicate(self, args: list[str], callback) -> str:
        if not args:
            callback(f"[{ERROR}]Usage: /forge duplicate <clip_id>[/]")
            return "forge_duplicate_error"
        clip_id = args[0]
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_duplicate_error"
        clip = next((c for c in self.current_project.timeline if c.clip_id == clip_id), None)
        if clip is None:
            callback(f"[{ERROR}]Clip not found: {clip_id}[/]")
            return "forge_duplicate_error"
        new_id = self._next_clip_id()
        dupe = TimelineClip(
            clip_id=new_id,
            media_id=clip.media_id,
            track_index=clip.track_index,
            timeline_index=clip.timeline_index + 1,
            start_time=clip.start_time,
            end_time=clip.end_time,
            source_start=clip.source_start,
            source_end=clip.source_end,
            speed=clip.speed,
            muted=clip.muted,
            volume=clip.volume,
            effects=list(clip.effects),
            audio_replace_path=clip.audio_replace_path,
        )
        idx = next(i for i, c in enumerate(self.current_project.timeline) if c.clip_id == clip_id)
        new_tl = self.current_project.timeline[:idx+1] + [dupe] + self.current_project.timeline[idx+1:]
        for j, c in enumerate(new_tl):
            c.timeline_index = j
        self.current_project.timeline = new_tl
        self.store.save(self.current_project)
        callback(f"[bold {SUCCESS}]✔ Duplicated {clip_id} → [{GOLD}]{new_id}[/]")
        return "forge_duplicate"

    def _forge_mute(self, args: list[str], callback) -> str:
        if not args:
            callback(f"[{ERROR}]Usage: /forge mute <clip_id>[/]")
            return "forge_mute_error"
        clip_id = args[0]
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_mute_error"
        clip = next((c for c in self.current_project.timeline if c.clip_id == clip_id), None)
        if clip is None:
            callback(f"[{ERROR}]Clip not found: {clip_id}[/]")
            return "forge_mute_error"
        clip.muted = not clip.muted
        self.store.save(self.current_project)
        state = "muted" if clip.muted else "unmuted"
        callback(f"[bold {SUCCESS}]✔ {clip_id} {state}[/]")
        return "forge_mute"

    def _forge_detach_audio(self, args: list[str], callback) -> str:
        if not args:
            callback(f"[{ERROR}]Usage: /forge detach-audio <clip_id>[/]")
            return "forge_detach_error"
        clip_id = args[0]
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_detach_error"
        clip = next((c for c in self.current_project.timeline if c.clip_id == clip_id), None)
        if clip is None:
            callback(f"[{ERROR}]Clip not found: {clip_id}[/]")
            return "forge_detach_error"
        media = self.current_project.media_bin.get(clip.media_id)
        if media and media.file_type == "video":
            audio_path = media.file_path.replace(".", "_audio.")
            clip.audio_replace_path = audio_path
            self.store.save(self.current_project)
            callback(f"[bold {SUCCESS}]✔ Detached audio for {clip_id}. Will extract during render.[/]")
        else:
            callback(f"[{WARNING}]Clip is not a video with attached audio.[/]")
        return "forge_detach_audio"

    def _forge_snapshot(self, args: list[str], callback) -> str:
        if not args:
            callback(f"[{ERROR}]Usage: /forge snapshot <clip_id> [--time <secs>][/]")
            return "forge_snapshot_error"
        clip_id = args[0]
        snap_time = 0.0
        if "--time" in args:
            ti = args.index("--time")
            if ti + 1 < len(args):
                try:
                    snap_time = float(args[ti + 1])
                except ValueError:
                    pass
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_snapshot_error"
        clip = next((c for c in self.current_project.timeline if c.clip_id == clip_id), None)
        if clip is None:
            callback(f"[{ERROR}]Clip not found: {clip_id}[/]")
            return "forge_snapshot_error"
        media = self.current_project.media_bin.get(clip.media_id)
        if media is None:
            callback(f"[{ERROR}]Media not found for clip.[/]")
            return "forge_snapshot_error"
        out = f"video_forge/projects/{self.current_project.project_id}/snapshot_{clip_id}_{int(snap_time)}.png"
        os.makedirs(os.path.dirname(out), exist_ok=True)
        callback(f"[{WARNING}]Snapshot requires FFmpeg. Run: ffmpeg -ss {snap_time} -i \"{media.file_path}\" -vframes 1 \"{out}\"[/]")
        callback(f"[{MUTED}]Planned output: {out}[/]")
        return "forge_snapshot"

    def _forge_freeze(self, args: list[str], callback) -> str:
        if not args:
            callback(f"[{ERROR}]Usage: /forge freeze <clip_id> [--time <secs>][/]")
            return "forge_freeze_error"
        clip_id = args[0]
        freeze_time = 0.0
        if "--time" in args:
            ti = args.index("--time")
            if ti + 1 < len(args):
                try:
                    freeze_time = float(args[ti + 1])
                except ValueError:
                    pass
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_freeze_error"
        callback(f"[{WARNING}]Freeze frame at {freeze_time}s for {clip_id} (will use trim+loop in FFmpeg command).[/]")
        return "forge_freeze"

    def _forge_transition(self, args: list[str], callback) -> str:
        if len(args) < 4:
            names = ", ".join(TRANSITIONS.keys())
            callback(f"[{ERROR}]Usage: /forge transition <from_clip_id> <to_clip_id> <type> <duration_secs>\n"
                     f"  Types: {names}[/]")
            return "forge_transition_error"
        from_id, to_id, ttype = args[0], args[1], args[2]
        try:
            duration = float(args[3])
        except ValueError:
            callback(f"[{ERROR}]duration_secs must be a number.[/]")
            return "forge_transition_error"
        if ttype not in TRANSITIONS:
            names = ", ".join(TRANSITIONS.keys())
            callback(f"[{ERROR}]Unknown transition: {ttype}. Available: {names}[/]")
            return "forge_transition_error"
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_transition_error"
        clip_ids = {c.clip_id for c in self.current_project.timeline}
        if from_id not in clip_ids or to_id not in clip_ids:
            callback(f"[{ERROR}]One or both clip IDs not found in timeline.[/]")
            return "forge_transition_error"
        op = TransitionOp(from_clip_id=from_id, to_clip_id=to_id,
                          transition_type=ttype, duration_secs=duration)
        self.current_project.transitions.append(op)
        self.store.save(self.current_project)
        callback(f"[bold {SUCCESS}]✔ Transition added:[/] [{PURPLE}]{ttype}[/] {from_id} → {to_id} [{MUTED}]{duration}s[/]")
        return "forge_transition"

    def _forge_music(self, args: list[str], callback) -> str:
        if not args:
            callback(f"[{ERROR}]Usage: /forge music <file_path> [--volume <0-2>] [--fade-in <secs>] [--fade-out <secs>][/]")
            return "forge_music_error"
        path = os.path.abspath(args[0])
        if not os.path.isfile(path):
            callback(f"[{ERROR}]File not found: {path}[/]")
            return "forge_music_error"
        volume = 0.5
        fade_in = 1.0
        fade_out = 2.0
        if "--volume" in args:
            vi = args.index("--volume")
            if vi + 1 < len(args):
                try:
                    volume = float(args[vi + 1])
                except ValueError:
                    pass
        if "--fade-in" in args:
            fi = args.index("--fade-in")
            if fi + 1 < len(args):
                try:
                    fade_in = float(args[fi + 1])
                except ValueError:
                    pass
        if "--fade-out" in args:
            fo = args.index("--fade-out")
            if fo + 1 < len(args):
                try:
                    fade_out = float(args[fo + 1])
                except ValueError:
                    pass
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_music_error"
        track = AudioTrackOp(
            track_id=self._next_track_id(),
            file_path=path,
            volume=volume,
            track_type="music",
            fade_in_secs=fade_in,
            fade_out_secs=fade_out,
        )
        self.current_project.audio_tracks.append(track)
        self.store.save(self.current_project)
        callback(f"[bold {SUCCESS}]✔ Music added:[/] [{GOLD}]{os.path.basename(path)}[/] "
                 f"[{MUTED}]vol={volume} fade={fade_in}/{fade_out}s[/]")
        return "forge_music"

    def _forge_narration(self, args: list[str], callback) -> str:
        if not args:
            callback(f"[{ERROR}]Usage: /forge narration <file_path> [--volume <0-2>][/]")
            return "forge_narration_error"
        path = os.path.abspath(args[0])
        if not os.path.isfile(path):
            callback(f"[{ERROR}]File not found: {path}[/]")
            return "forge_narration_error"
        volume = 1.0
        if "--volume" in args:
            vi = args.index("--volume")
            if vi + 1 < len(args):
                try:
                    volume = float(args[vi + 1])
                except ValueError:
                    pass
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_narration_error"
        track = AudioTrackOp(
            track_id=self._next_track_id(),
            file_path=path,
            volume=volume,
            track_type="narration",
            fade_in_secs=0.3,
            fade_out_secs=0.5,
        )
        self.current_project.audio_tracks.append(track)
        self.store.save(self.current_project)
        callback(f"[bold {SUCCESS}]✔ Narration added:[/] [{GOLD}]{os.path.basename(path)}[/]")
        return "forge_narration"

    def _forge_effect(self, args: list[str], callback) -> str:
        if len(args) < 2:
            names = ", ".join(EFFECTS.keys())
            callback(f"[{ERROR}]Usage: /forge effect <clip_id> <effect_name> [key=value ...]\n"
                     f"  Effects: {names}[/]")
            return "forge_effect_error"
        clip_id = args[0]
        effect_name = args[1].lower()
        if effect_name not in EFFECTS:
            names = ", ".join(EFFECTS.keys())
            callback(f"[{ERROR}]Unknown effect: {effect_name}. Available: {names}[/]")
            return "forge_effect_error"
        params = {}
        for p in args[2:]:
            if "=" in p:
                k, v = p.split("=", 1)
                try:
                    if "." in v:
                        v = float(v)
                    else:
                        v = int(v)
                except ValueError:
                    pass
                params[k] = v
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_effect_error"
        clip = next((c for c in self.current_project.timeline if c.clip_id == clip_id), None)
        if clip is None:
            callback(f"[{ERROR}]Clip not found: {clip_id}[/]")
            return "forge_effect_error"
        clip.effects.append(EffectOp(effect_name=effect_name, params=params))
        self.store.save(self.current_project)
        callback(f"[bold {SUCCESS}]✔ Effect applied:[/] [{PURPLE}]{effect_name}[/] → {clip_id} [{MUTED}]{params}[/]")
        return "forge_effect"

    def _forge_export(self, args: list[str], callback) -> str:
        if not args:
            names = ", ".join(PRESETS.keys())
            callback(f"[{ERROR}]Usage: /forge export <preset_name> [--output <path>]\n"
                     f"  Presets: {names}[/]")
            return "forge_export_error"
        preset_name = args[0].lower()
        if preset_name not in PRESETS:
            names = ", ".join(PRESETS.keys())
            callback(f"[{ERROR}]Unknown preset: {preset_name}. Available: {names}[/]")
            return "forge_export_error"
        output_path = f"video_forge/renders/{self.current_project.project_id}_{preset_name}" if self.current_project else f"video_forge/renders/{preset_name}"
        if "--output" in args:
            oi = args.index("--output")
            if oi + 1 < len(args):
                output_path = args[oi + 1]
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_export_error"
        if not self.current_project.timeline:
            callback(f"[{ERROR}]Timeline is empty. Add clips before exporting.[/]")
            return "forge_export_error"
        if self.renderer is None or not self.renderer_ok:
            callback(f"[{ERROR}]FFmpeg not available. Cannot render.[/]")
            return "forge_export_error"

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        def progress_callback(event, data):
            if event == "render_started":
                callback(f"[bold {WARNING}]═══ RENDERING ═══[/]")
                callback(f"[{MUTED}]Preset: {data['preset']} | Render ID: {data['render_id']}[/]")
            elif event == "render_completed":
                callback(f"[bold {SUCCESS}]✔ Render complete:[/] [{GOLD}]{data['output']}[/]")
            elif event == "render_failed":
                errs = data.get("errors", ["Unknown error"])
                for e in errs:
                    callback(f"[{ERROR}]{e}[/]")

        def render_thread():
            try:
                ledger = self.renderer.render(
                    self.current_project, preset_name, output_path,
                    progress_callback=progress_callback,
                )
                if ledger.status == "completed":
                    callback(f"[bold {SUCCESS}]✔ Render successful![/]")
                    callback(f"[{MUTED}]  Output: {ledger.output_path}[/]")
                    callback(f"[{MUTED}]  Render ID: {ledger.render_id}[/]")
                else:
                    callback(f"[{ERROR}]Render failed. Check /forge ledger for details.[/]")
                    for e in ledger.errors:
                        callback(f"[{ERROR}]  {e}[/]")
            except Exception as e:
                callback(f"[{ERROR}]Render error: {e}[/]")

        threading.Thread(target=render_thread, daemon=True).start()
        return "forge_export"

    def _forge_ledger(self, args: list[str], callback) -> str:
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_ledger_error"
        summary = self.ledger_viewer.format_ledger_summary(self.current_project.project_id)
        callback(summary)
        return "forge_ledger"

    def _forge_presets(self, args: list[str], callback) -> str:
        lines = [f"[bold {GOLD}]Export Presets:[/]"]
        for name, p in PRESETS.items():
            label = p.get("label", name)
            ext = p.get("extension", "")
            res = f"{p.get('width', '?')}x{p.get('height', '?')}" if p.get('width') else "audio"
            lines.append(f"  [{PURPLE}]{name:<30}[/] [{GOLD}]{label:<20}[/] [{MUTED}]{ext} {res}[/]")
        for line in lines:
            callback(line)
        return "forge_presets"

    def _forge_list_effects(self, args: list[str], callback) -> str:
        lines = [f"[bold {GOLD}]Available Effects:[/]"]
        for name, e in EFFECTS.items():
            lines.append(f"  [{PURPLE}]{name:<25}[/] [{MUTED}]{e['description']}[/]")
        for line in lines:
            callback(line)
        return "forge_effects"

    def _forge_list_transitions(self, args: list[str], callback) -> str:
        lines = [f"[bold {GOLD}]Available Transitions:[/]"]
        for name, t in TRANSITIONS.items():
            lines.append(f"  [{PURPLE}]{name:<20}[/] [{MUTED}]{t['description']}[/]")
        for line in lines:
            callback(line)
        return "forge_transitions"

    def _forge_project_info(self, args: list[str], callback) -> str:
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_project_info_error"
        p = self.current_project
        recipe_hash = compute_project_recipe_hash(p)
        total_dur = max((c.end_time for c in p.timeline), default=0.0)
        lines = [
            f"[bold {GOLD}]Project: {p.project_name}[/]",
            f"[{MUTED}]  ID: {p.project_id}[/]",
            f"[{MUTED}]  Schema: {p.schema_version} | Determinism: {p.determinism_version}[/]",
            f"[{MUTED}]  Media: {len(p.media_bin)} files[/]",
            f"[{MUTED}]  Timeline: {len(p.timeline)} clips | {total_dur:.1f}s total[/]",
            f"[{MUTED}]  Transitions: {len(p.transitions)} | Text: {len(p.text_overlays)} | Audio: {len(p.audio_tracks)}[/]",
            f"[{MUTED}]  Recipe Hash: {recipe_hash}[/]",
        ]
        if p.last_render_ledger:
            lr = p.last_render_ledger
            lines.append(f"[{MUTED}]  Last Render: {lr.status} | {lr.preset} | {lr.render_id}[/]")
        for line in lines:
            callback(line)
        return "forge_project_info"

    def _forge_list_projects(self, args: list[str], callback) -> str:
        projects = self.store.list_projects()
        if not projects:
            callback(f"[{WARNING}]No projects found. Create one with /forge new <name>[/]")
            return "forge_list_projects_empty"
        lines = [f"[bold {GOLD}]Projects ({len(projects)}):[/]"]
        for p in projects:
            marker = "◀" if self.current_project and self.current_project.project_id == p["projectId"] else " "
            lines.append(f"  [{PURPLE}]{marker}[/] [{GOLD}]{p['projectName']:<30}[/] [{MUTED}]{p['projectId']}[/]")
        for line in lines:
            callback(line)
        return "forge_list_projects"

    def _forge_open(self, args: list[str], callback) -> str:
        if not args:
            callback(f"[{ERROR}]Usage: /forge open <project_id>[/]")
            return "forge_open_error"
        project_id = args[0]
        try:
            self.current_project = self.store.load(project_id)
            callback(f"[bold {SUCCESS}]✔ Loaded project:[/] [{GOLD}]{self.current_project.project_name}[/]")
            callback(f"[{MUTED}]  {len(self.current_project.timeline)} clips | {len(self.current_project.media_bin)} media | {len(self.current_project.audio_tracks)} audio tracks[/]")
        except FileNotFoundError:
            callback(f"[{ERROR}]Project not found: {project_id}[/]")
        except Exception as e:
            callback(f"[{ERROR}]Failed to load project: {e}[/]")
        return "forge_open"

    def _forge_recipe(self, args: list[str], callback) -> str:
        if self.current_project is None:
            callback(f"[{ERROR}]No project loaded.[/]")
            return "forge_recipe_error"
        from video_forge.schema import project_to_json
        text = project_to_json(self.current_project)
        callback(f"[bold {GOLD}]═══ PROJECT RECIPE ═══[/]")
        for line in text.split("\n"):
            callback(f"  {line}")
        callback(f"[{MUTED}]Copy this JSON, modify it, save to a file, then run /forge apply <file> to load changes.[/]")
        return "forge_recipe"

    def _forge_apply(self, args: list[str], callback) -> str:
        if not args:
            callback(f"[{ERROR}]Usage: /forge apply <modified_recipe.json>[/]")
            return "forge_apply_error"
        import json
        path = os.path.abspath(" ".join(args))
        if not os.path.isfile(path):
            callback(f"[{ERROR}]File not found: {path}[/]")
            return "forge_apply_error"
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            callback(f"[{ERROR}]Invalid JSON: {e}[/]")
            return "forge_apply_error"
        from video_forge.schema import from_dict
        try:
            modified = from_dict(data)
        except Exception as e:
            callback(f"[{ERROR}]Failed to parse project schema: {e}[/]")
            return "forge_apply_error"
        if self.current_project is None:
            self.current_project = modified
        else:
            modified.project_id = self.current_project.project_id
            if not modified.project_name:
                modified.project_name = self.current_project.project_name
            self.current_project = modified
        self.store.save(self.current_project)
        callback(f"[bold {SUCCESS}]✔ Applied recipe:[/] [{GOLD}]{self.current_project.project_name}[/]")
        callback(f"[{MUTED}]  {len(self.current_project.timeline)} clips | {len(self.current_project.media_bin)} media | {len(self.current_project.audio_tracks)} audio tracks[/]")
        callback(f"[{MUTED}]  Run /forge export <preset> to render.[/]")
        return "forge_apply"
