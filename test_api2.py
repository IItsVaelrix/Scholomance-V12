import urllib.request, json
url = "https://api.openai.com/v1/models"
req = urllib.request.Request(url, method="GET")
req.add_header("Authorization", "Bearer fake-key")
try:
    with urllib.request.urlopen(req) as response:
        print("Success")
except urllib.error.HTTPError as e:
    print("Error:", e.code, e.read().decode('utf-8'))
