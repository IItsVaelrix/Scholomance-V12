from textual.app import App
from textual.widgets import TextArea

class TestApp(App):
    def compose(self):
        yield TextArea("Hello")

if __name__ == "__main__":
    app = TestApp()
