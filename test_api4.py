import urllib.request
url = "https://opencode.ai/zen/v1/models"
req = urllib.request.Request(url, method="GET")
req.add_header("User-Agent", "curl/8.5.0")
try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.code)
except urllib.error.HTTPError as e:
    print("Error:", e.code)
