"""Minimal zero-dependency .env loader.

Reads KEY=VALUE pairs from a .env file sitting next to this module and
populates os.environ for any key not already set in the real environment.
Real environment variables always win over .env values.
"""
import os

def load_env(path=None):
    if path is None:
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            # Real environment takes precedence; .env only fills gaps.
            os.environ.setdefault(key, value)
