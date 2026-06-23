import os
import time
from tui.services.content_critic_service import ContentCriticService

def cb(msg):
    print(msg)

svc = ContentCriticService()
# Need to set an invalid API key to trigger the HTTPError
os.environ["GEMINI_API_KEY"] = "fake_key_123"

svc.critique("test_content.json", cb)
time.sleep(2)
