import os, urllib.request, json
url = "https://opencode.ai/zen/go/v1/chat/completions"
req = urllib.request.Request(url, method="POST")
req.add_header("Authorization", "Bearer fake-key")
req.add_header("Content-Type", "application/json")
data = json.dumps({"model": "opencode-zen", "messages": [{"role": "user", "content": "hi"}]}).encode('utf-8')
try:
    with urllib.request.urlopen(req, data=data) as response:
        print("Success:", response.read())
except urllib.error.HTTPError as e:
    print("Error:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("Exception:", str(e))
