import urllib.request
from ..errors import make_error, YTSEO_THUMBNAIL_FETCH_FAILED


def fetch_thumbnail(url, timeout=10):
    if not url:
        return None, make_error(YTSEO_THUMBNAIL_FETCH_FAILED, "No thumbnail URL provided")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "DivTube-IntelLab/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read(), None
    except Exception as e:
        return None, make_error(YTSEO_THUMBNAIL_FETCH_FAILED, str(e))
