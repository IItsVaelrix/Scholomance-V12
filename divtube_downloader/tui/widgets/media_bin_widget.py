from textual.widgets import Static
from textual.app import RenderResult
from rich.text import Text
from rich.style import Style

GOLD = "#FFD700"
PURPLE = "#B388FF"
MUTED = "#6B7280"
SUCCESS = "#7CFF8B"
WARNING = "#FFD166"
OBSIDIAN = "#0B0C10"


class MediaBinWidget(Static):
    def __init__(self, media_items: list | None = None, **kwargs):
        super().__init__("", **kwargs)
        self._items = media_items or []

    def update_media(self, items: list):
        self._items = items
        self.refresh()

    def render(self) -> RenderResult:
        if not self._items:
            return Text(" Media bin is empty. Import with /forge import.", style=Style(color=MUTED))
        lines = []
        for m in self._items:
            type_icon = {"video": "🎬", "audio": "🎵", "image": "🖼", "subtitle": "📝"}.get(m.get("fileType", ""), "📁")
            color_band = Style(color=GOLD, bgcolor=OBSIDIAN)
            line = Text.assemble(
                (f" {type_icon} ", color_band),
                (f" {m.get('mediaId', ''):<14} ", Style(color=GOLD)),
                (f"{m.get('label', ''):<24} ", Style(color=MUTED)),
                (f"{m.get('width', 0)}x{m.get('height', 0)} ", Style(color=PURPLE)),
                (f"{m.get('durationSecs', 0):.1f}s ", Style(color=SUCCESS if m.get('durationSecs', 0) > 0 else WARNING)),
                (f"{m.get('fps', 0):.0f}fps", Style(color=MUTED)),
            )
            lines.append(line)
        t = Text.assemble(*lines, "\n")
        return t
