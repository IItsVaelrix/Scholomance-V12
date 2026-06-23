from textual.widgets import Static
from textual.app import RenderResult
from rich.text import Text
from rich.style import Style

GOLD = "#FFD700"
PURPLE = "#B388FF"
MUTED = "#6B7280"
SUCCESS = "#7CFF8B"
WARNING = "#FFD166"
CRIMSON = "#DC143C"
OBSIDIAN = "#0B0C10"


class RenderMeterWidget(Static):
    def __init__(self, **kwargs):
        super().__init__("", **kwargs)
        self._status = "idle"
        self._preset = ""
        self._render_id = ""
        self._progress = 0.0
        self._message = ""

    def set_render_state(self, status: str, preset: str = "", render_id: str = "",
                         progress: float = 0.0, message: str = ""):
        self._status = status
        self._preset = preset
        self._render_id = render_id
        self._progress = progress
        self._message = message
        self.refresh()

    def reset(self):
        self._status = "idle"
        self._preset = ""
        self._render_id = ""
        self._progress = 0.0
        self._message = ""
        self.refresh()

    def render(self) -> RenderResult:
        if self._status == "idle":
            return Text(" ⏸  Render idle. Use /forge export <preset> to start.", style=Style(color=MUTED))

        status_color = {
            "rendering": WARNING,
            "completed": SUCCESS,
            "failed": CRIMSON,
        }.get(self._status, MUTED)

        bar_width = 30
        filled = int(self._progress * bar_width)
        bar = "█" * filled + "░" * (bar_width - filled)
        pct = f"{int(self._progress * 100)}%"

        lines = Text.assemble(
            (f" {bar}", Style(color=status_color, bgcolor=OBSIDIAN)),
            (f" {pct:>4} ", Style(color=GOLD)),
            "\n",
            (f" {status_color}{self._status.upper()}[/] ", Style(color=status_color)),
            (f"{self._preset}", Style(color=PURPLE)),
            (f" [{self._render_id[:8]}]", Style(color=MUTED)) if self._render_id else Text(""),
            "\n" if self._message else Text(""),
            (f" {self._message}", Style(color=MUTED)) if self._message else Text(""),
        )
        return lines
