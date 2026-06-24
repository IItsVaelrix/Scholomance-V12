from textual.app import App
from textual.widgets import Input
import os

class MyApp(App):
    def compose(self):
        yield Input(id="test")

    def on_input_changed(self, event: Input.Changed):
        text = event.value.strip(" '\n\r\"")
        if os.path.exists(text) and os.path.isfile(text):
            event.input.value = f"/magic {text}"
            event.input.action_end()

if __name__ == "__main__":
    MyApp().run()
