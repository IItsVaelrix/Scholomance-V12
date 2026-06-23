import json
import os
import urllib.request
import urllib.error

from _env import load_env

load_env()
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise SystemExit("GEMINI_API_KEY not set — add it to .env or your environment")
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

req = urllib.request.Request(url, method="GET")

try:
    with urllib.request.urlopen(req) as response:
        models = json.loads(response.read().decode('utf-8'))
        for m in models.get("models", []):
            print(m["name"])
except urllib.error.HTTPError as e:
    print("API Error:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
