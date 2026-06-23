from textual.app import App
from textual.screen import ModalScreen
from textual.widgets import OptionList, Static, Input
from textual.containers import Vertical
from textual.widgets.option_list import Option
from textual import events, on

class FileSelectScreen(ModalScreen[str]):
    def __init__(self):
        super().__init__()
        self.files = ["file1.txt", "file2.py", "dir/file3.txt"]

    def compose(self):
        yield Vertical(
            Static("FIND FILE"),
            Input(placeholder="Type to filter...", id="file-filter"),
            OptionList(*[Option(f) for f in self.files], id="file-list")
        )

    @on(Input.Submitted, "#file-filter")
    def filter_submitted(self, event):
        olist = self.query_one("#file-list")
        if olist.highlighted is not None and olist.highlighted < olist.option_count:
            self.dismiss(str(olist.get_option_at_index(olist.highlighted).prompt))
        elif olist.option_count > 0:
            self.dismiss(str(olist.get_option_at_index(0).prompt))
        event.prevent_default()

class TestApp(App):
    def on_mount(self):
        def on_selected(path):
            print("Selected:", path)
            self.exit()
        screen = FileSelectScreen()
        self.push_screen(screen, on_selected)
        
        # Simulate enter on the input
        def do_sim():
            try:
                screen.query_one("#file-filter").action_submit()
            except Exception as e:
                import traceback
                with open("crash.txt", "w") as f:
                    traceback.print_exc(file=f)
                self.exit()
        self.set_timer(0.5, do_sim)

if __name__ == "__main__":
    TestApp().run()
