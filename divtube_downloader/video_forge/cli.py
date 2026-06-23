import cmd
import shlex
import os
import sys
import uuid

# Adjust path to import video_forge if run directly from within the directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from video_forge.schema import VideoProject, MediaItem, TimelineClip, EffectOp, TransitionOp, TextOverlayOp, AudioTrackOp
from video_forge.project_store import ProjectStore
from video_forge.ffprobe_service import FFprobeService
from video_forge.render_service import RenderService

class VideoForgeCLI(cmd.Cmd):
    intro = "Welcome to the Video Forge CLI. Type help or ? to list commands.\n"
    prompt = "(video-forge) "

    def __init__(self):
        super().__init__()
        self.store = ProjectStore()
        self.ffprobe = FFprobeService()
        self.render_service = RenderService(self.store, self.ffprobe)
        self.project = None

    def do_new(self, arg):
        """new <project_name>
        Create a new video project."""
        name = arg.strip() or "Untitled Project"
        self.project = VideoProject(project_id=uuid.uuid4().hex[:12], project_name=name)
        print(f"Created new project: {self.project.project_name} ({self.project.project_id})")

    def do_load(self, arg):
        """load <project_id>
        Load an existing project."""
        pid = arg.strip()
        try:
            self.project = self.store.load(pid)
            print(f"Loaded project: {self.project.project_name} ({self.project.project_id})")
        except Exception as e:
            print(f"Error loading project: {e}")

    def do_save(self, arg):
        """save
        Save the current project."""
        if not self.project:
            print("No project open. Type 'new <name>' to create one.")
            return
        path = self.store.save(self.project)
        print(f"Project saved to {path}")

    def do_add_media(self, arg):
        """add_media <file_path> [label]
        Probe a media file and add it to the media bin."""
        if not self.project:
            print("No project open.")
            return
        args = shlex.split(arg)
        if len(args) < 1:
            print("Usage: add_media <file_path> [label]")
            return
        file_path = args[0]
        label = args[1] if len(args) > 1 else os.path.basename(file_path)
        
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            return
            
        try:
            info = self.ffprobe.probe_file(file_path)
            media_id = uuid.uuid4().hex[:8]
            media_item = MediaItem(
                media_id=media_id,
                file_path=file_path,
                file_type=info["file_type"],
                duration_secs=info["duration_secs"],
                width=info["width"],
                height=info["height"],
                fps=info["fps"],
                audio_channels=info["audio_channels"],
                file_hash=info["file_hash"],
                label=label
            )
            self.project.media_bin[media_id] = media_item
            print(f"Added media: {label} ({media_id}) - {info['duration_secs']:.2f}s, {info['width']}x{info['height']}")
        except Exception as e:
            print(f"Error adding media: {e}")

    def do_add_clip(self, arg):
        """add_clip <media_id> <start_time> <end_time> [source_start] [source_end]
        Add a clip to the timeline. Times are in seconds."""
        if not self.project:
            print("No project open.")
            return
        args = shlex.split(arg)
        if len(args) < 3:
            print("Usage: add_clip <media_id> <start_time> <end_time> [source_start] [source_end]")
            return
        media_id = args[0]
        try:
            start_time = float(args[1])
            end_time = float(args[2])
            source_start = float(args[3]) if len(args) > 3 else 0.0
            source_end = float(args[4]) if len(args) > 4 else (end_time - start_time)
        except ValueError:
            print("Error: start_time, end_time, source_start, and source_end must be numbers.")
            return
            
        if media_id not in self.project.media_bin:
            print(f"Media ID '{media_id}' not found in bin.")
            return
            
        clip = TimelineClip(
            clip_id=uuid.uuid4().hex[:8],
            media_id=media_id,
            track_index=0,
            timeline_index=len(self.project.timeline),
            start_time=start_time,
            end_time=end_time,
            source_start=source_start,
            source_end=source_end
        )
        self.project.timeline.append(clip)
        print(f"Added clip {clip.clip_id} to timeline at {start_time}s -> {end_time}s.")

    def do_status(self, arg):
        """status
        Show project status, media bin, and timeline."""
        if not self.project:
            print("No project open.")
            return
        print(f"--- Project: {self.project.project_name} ({self.project.project_id}) ---")
        print(f"\nMedia Bin ({len(self.project.media_bin)} items):")
        for mid, m in self.project.media_bin.items():
            print(f"  [{mid}] {m.label} - {m.duration_secs:.2f}s ({m.width}x{m.height})")
            
        print(f"\nTimeline ({len(self.project.timeline)} clips):")
        for c in sorted(self.project.timeline, key=lambda x: x.start_time):
            print(f"  [{c.clip_id}] media:{c.media_id} | dest: {c.start_time}s->{c.end_time}s | src: {c.source_start}s->{c.source_end}s")

    def do_render(self, arg):
        """render [preset]
        Render the project. Default preset is youtube_1080p_mp4."""
        if not self.project:
            print("No project open.")
            return
        if not self.project.timeline:
            print("Timeline is empty. Add clips before rendering.")
            return
            
        preset = arg.strip() or "youtube_1080p_mp4"
        try:
            self.store.save(self.project)
            print(f"Saved project. Starting render with preset '{preset}'...")
            ledger = self.render_service.render_project(self.project.project_id, preset)
            if ledger.status == "success":
                print(f"Render completed successfully in {ledger.duration_secs:.2f}s!")
                print(f"Output saved to: {ledger.output_path}")
            else:
                print(f"Render failed with status: {ledger.status}")
                if ledger.errors:
                    print("Errors:")
                    for e in ledger.errors:
                        print(f"  - {e}")
        except Exception as e:
            print(f"Render exception: {e}")

    def do_exit(self, arg):
        """exit
        Exit the CLI."""
        if self.project:
            self.store.save(self.project)
            print("Project saved.")
        print("Goodbye!")
        return True

    def do_quit(self, arg):
        """quit
        Exit the CLI (alias for exit)."""
        return self.do_exit(arg)

if __name__ == '__main__':
    try:
        VideoForgeCLI().cmdloop()
    except KeyboardInterrupt:
        print("\nGoodbye!")
