from textual.app import App
from textual import events

class KeyApp(App):
    def on_key(self, event: events.Key):
        with open("key_log.txt", "a") as f:
            f.write(f"key: {event.key}, char: {event.character}\n")
        if event.key == "q":
            self.exit()

if __name__ == "__main__":
    KeyApp().run()
