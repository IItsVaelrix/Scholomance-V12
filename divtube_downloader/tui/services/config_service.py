import json
import os

class ConfigService:
    def __init__(self, path="tui_config.json"):
        self.path = path
        self.config = {
            "ui": {
                "theme": "void_cyan",
                "show_sidebar": True,
                "stream_output": True,
            }
        }
        self.load()

    def load(self):
        if os.path.exists(self.path):
            with open(self.path, 'r') as f:
                self.config.update(json.load(f))

    def get(self, key, default=None):
        return self.config.get(key, default)
