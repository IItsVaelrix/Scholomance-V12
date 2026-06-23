from textual.app import ComposeResult
from textual.containers import Horizontal, Vertical
from textual.widgets import Header, Footer, RichLog, Input, Static, ProgressBar
from tui.ui.widgets.sidebar import Sidebar
from tui.ui.widgets.inspector import Inspector
from tui.ui.widgets.code_box import CodeBox

def get_layout() -> ComposeResult:
    yield Header(show_clock=True)

    chat = RichLog(id="chat-log", markup=True, wrap=True)
    chat.border_title = "✦ DIVTUBE COCKPIT ✦"

    yield Horizontal(
        Sidebar(id="sidebar"),
        Vertical(
            chat,
            Static("", id="typewriter-box"),
            ProgressBar(id="loading-bar", show_eta=False, total=100),
            Input(placeholder="▸ command (/help) or paste a URL…", id="command-input"),
            id="center-panel"
        ),
        Vertical(
            Inspector(id="inspector"),
            CodeBox(id="code-viewer", filename=""),
            id="right-panel"
        )
    )
    yield Footer()
