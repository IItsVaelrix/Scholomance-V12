from textual.widgets import TextArea
from textual.binding import Binding
from textual.message import Message
from textual import events

class CommandSubmitted(Message):
    """Emitted when the user presses Enter in the command area."""
    def __init__(self, value: str) -> None:
        self.value = value
        super().__init__()

class CommandArea(TextArea):
    BINDINGS = [
        Binding("enter", "submit", "Submit", show=False, priority=True),
        Binding("shift+enter", "expand", "Expand", show=False, priority=True),
        Binding("escape", "blur_input", "Unfocus", show=False),
    ]

    def __init__(self, placeholder: str = "", id: str | None = None) -> None:
        super().__init__(id=id)
        # Note: TextArea currently doesn't natively support a placeholder string in the same way as Input,
        # but we can set the initial text or just leave it empty.
        self.show_line_numbers = False
        self._is_expanded = False

    def action_submit(self) -> None:
        val = self.text.strip()
        if val:
            self.post_message(CommandSubmitted(val))
        self.text = ""
        # Contract back after submitting
        self.remove_class("expanded")
        self._is_expanded = False

    def action_expand(self) -> None:
        self.insert("\n")
        if not self._is_expanded:
            self.add_class("expanded")
            self._is_expanded = True

    def action_blur_input(self) -> None:
        self.app.set_focus(None)
