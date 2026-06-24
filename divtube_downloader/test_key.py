import json
import os
import urllib.request
import urllib.error

from _env import load_env

load_env()
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise SystemExit("GEMINI_API_KEY not set — add it to .env or your environment")
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

payload = {
    "contents": [{"parts": [{"text": "Hello, say 'Test successful'."}]}]
}

req = urllib.request.Request(url, method="POST")
req.add_header("content-type", "application/json")
data = json.dumps(payload).encode('utf-8')

try:
    with urllib.request.urlopen(req, data=data) as response:
        print("Success:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("API Error:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
