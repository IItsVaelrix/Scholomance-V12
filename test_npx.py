import subprocess
import shlex
import json

cmd = ["bash", "-c", "source ~/.bashrc && npx --version"]
proc = subprocess.run(cmd, capture_output=True, text=True)
print(proc.returncode, proc.stdout.strip(), proc.stderr.strip())
