import requests
import uuid
import sys
import threading

class ChatbotConfig:
    def __init__(self, url="http://localhost:8000/chat"):
        self.url = url

class ChatbotEngine:
    def __init__(self, config: ChatbotConfig):
        self.config = config
        self.session_id = str(uuid.uuid4())

    def respond(self, user_message: str) -> str:
        if user_message.lower() == "clear":
            self.session_id = str(uuid.uuid4())
            return "Session memory cleared."
            
        try:
            resp = requests.post(self.config.url, json={"session_id": self.session_id, "message": user_message})
            if resp.status_code == 200:
                return resp.json().get('response', '')
            else:
                return f"Error: Server returned {resp.status_code}"
        except requests.exceptions.ConnectionError:
            return "Error: Could not connect to the backend API. Is uvicorn running?"
        except Exception as e:
            return f"Error: {str(e)}"
