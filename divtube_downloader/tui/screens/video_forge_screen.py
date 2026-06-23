from textual.app import ComposeResult
from textual.screen import Screen
from textual.containers import Horizontal, Vertical
from textual.widgets import Static, Header, Footer, Input
from rich.text import Text
from rich.style import Style
import shlex

from tui.widgets.timeline_widget import TimelineWidget
from tui.widgets.media_bin_widget import MediaBinWidget
from tui.widgets.render_meter_widget import RenderMeterWidget

GOLD = "#FFD700"
PURPLE = "#B388FF"
MUTED = "#6B7280"
SUCCESS = "#7CFF8B"
WARNING = "#FFD166"
CRIMSON = "#DC143C"
OBSIDIAN = "#0B0C10"
PANEL_BG = "#121212"

FORGE_HELP_TEXT = """[#B388FF]FORGE COMMANDS[/]
  [#FFD700]new[/]             Create new project
  [#FFD700]import[/]          Import media into bin
  [#FFD700]timeline[/]        Show timeline
  [#FFD700]trim[/]            Trim clip in/out
  [#FFD700]split[/]           Split clip at time
  [#FFD700]delete[/]          Remove clip from timeline
  [#FFD700]transition[/]      Add transition between clips
  [#FFD700]effect[/]          Apply effect to clip
  [#FFD700]export[/]          Render project to file
  [#FFD700]presets[/]         List export presets
  [#FFD700]effects[/]         List available effects
  [#FFD700]transitions[/]     List available transitions
  [#FFD700]recipe[/]          Dump full project JSON
  [#FFD700]apply[/]           Load modified recipe file
  [#FFD700]ledger[/]          Show render history
  [#FFD700]add-title[/]       Add title card
  [#FFD700]add-caption[/]     Add caption overlay
  [#FFD700]add-credit[/]      Add credit card
  [#FFD700]snapshot[/]        Save project snapshot
  [#FFD700]freeze[/]          Freeze frame
  [#FFD700]music[/]           Add background music
  [#FFD700]narration[/]       Add narration track
  [#FFD700]mute[/]            Mute track
  [#FFD700]detach-audio[/]    Detach audio from clip
  [#FFD700]duplicate[/]       Duplicate clip
  [#FFD700]move[/]            Move clip on timeline
  [#FFD700]list[/]            List saved projects
  [#FFD700]open[/]            Open saved project
  [#FFD700]project[/]         Show current project info"""


class VideoForgeScreen(Screen):
    CSS = '''
    #forge-left {
        width: 2fr;
    }
    #forge-right {
        width: 3fr;
    }
    #forge-terminal-input {
        dock: bottom;
        border: round #DC143C;
        background: #000000;
        color: #FFD700;
        text-style: bold;
        margin-top: 1;
        height: 3;
    }
    #forge-terminal-input:focus {
        border: round #FFD700;
    }
    #forge-command-list {
        height: 10;
        border: round #4B0082;
        background: #121212;
        padding: 0 1;
        margin-top: 1;
        overflow-y: auto;
    }
    '''

    BINDINGS = [
        ("escape", "go_back", "Back to DivTube"),
        ("d", "go_back", "DivTube"),
    ]

    def __init__(self, service, log_fn):
        super().__init__()
        self._service = service
        self._log_fn = log_fn

    def action_go_back(self):
        self.dismiss()

    def compose(self) -> ComposeResult:
        yield Header()
        yield Horizontal(
            Vertical(
                Static("", id="forge-title"),
                Static("", id="forge-project-info"),
                Static("", id="forge-media-label"),
                MediaBinWidget(id="forge-media-bin"),
                Input(placeholder="▸ forge command…", id="forge-terminal-input"),
                id="forge-left",
            ),
            Vertical(
                Static("", id="forge-timeline-label"),
                TimelineWidget(id="forge-timeline"),
                Static("", id="forge-render-label"),
                RenderMeterWidget(id="forge-render-meter"),
                Static("", id="forge-command-list"),
                id="forge-right",
            ),
        )
        yield Footer()

    def on_mount(self):
        self.query_one("#forge-title", Static).update(
            Text("✦  V I D E O   F O R G E  ✦", style=Style(color=GOLD, bold=True))
        )
        self.query_one("#forge-media-label", Static).update(
            Text("\n📦 MEDIA BIN", style=Style(color=PURPLE, bold=True))
        )
        self.query_one("#forge-timeline-label", Static).update(
            Text("\n⏱ TIMELINE", style=Style(color=PURPLE, bold=True))
        )
        self.query_one("#forge-render-label", Static).update(
            Text("\n⚡ RENDER", style=Style(color=PURPLE, bold=True))
        )
        self.query_one("#forge-command-list", Static).update(
            Text.from_markup(FORGE_HELP_TEXT)
        )
        self.refresh_display()

    def on_input_submitted(self, event):
        val = event.value.strip()
        event.input.value = ""
        if not val:
            return
            
        self._output_buffer = []
        
        try:
            args = shlex.split(val)
        except ValueError as e:
            self._log_fn(f"[#FF5C7A]Parse error: {e}[/]")
            self._show_output(f"[#FF5C7A]Parse error: {e}[/]")
            return
            
        self._service.cmd_forge(args, self._show_output)
        
        if self._output_buffer:
            cmd_list = self.query_one("#forge-command-list", Static)
            cmd_list.update(Text.from_markup("\n".join(self._output_buffer)))
            
        self.refresh_display()

    def _show_output(self, msg):
        if not hasattr(self, '_output_buffer'):
            self._output_buffer = []
        self._output_buffer.append(str(msg))

    def refresh_display(self):
        proj = self._service.current_project
        if proj is None:
            self.query_one("#forge-project-info", Static).update(
                Text("No project loaded. Use /forge new or /forge open", style=Style(color=WARNING))
            )
            self.query_one("#forge-media-bin", MediaBinWidget).update_media([])
            self.query_one("#forge-timeline", TimelineWidget).update_clips([], [])
            return

        self.query_one("#forge-project-info", Static).update(
            Text(f"Project: {proj.project_name}  |  "
                 f"{len(proj.timeline)} clips  |  "
                 f"{len(proj.media_bin)} media files  |  "
                 f"{len(proj.audio_tracks)} audio tracks",
                 style=Style(color=MUTED))
        )

        media_list = []
        for m in proj.media_bin.values():
            media_list.append({
                "mediaId": m.media_id, "label": m.label, "fileType": m.file_type,
                "width": m.width, "height": m.height, "durationSecs": m.duration_secs,
                "fps": m.fps, "audioChannels": m.audio_channels,
            })
        self.query_one("#forge-media-bin", MediaBinWidget).update_media(media_list)

        clip_list = []
        for c in sorted(proj.timeline, key=lambda x: (x.timeline_index, x.track_index)):
            media = proj.media_bin.get(c.media_id)
            clip_list.append({
                "clipId": c.clip_id, "label": media.label if media else c.media_id,
                "startTime": c.start_time, "endTime": c.end_time,
                "trackIndex": c.track_index,
            })
        trans_list = [{
            "fromClipId": t.from_clip_id, "toClipId": t.to_clip_id,
            "transitionType": t.transition_type, "durationSecs": t.duration_secs,
        } for t in proj.transitions]
        self.query_one("#forge-timeline", TimelineWidget).update_clips(clip_list, trans_list)
