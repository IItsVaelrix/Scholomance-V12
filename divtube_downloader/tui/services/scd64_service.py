import asyncio
import json
import os
import subprocess
from typing import Dict, Any, Callable

class SCD64Service:
    def __init__(self):
        self.process = None
        self.plugin_path = os.path.join(os.path.dirname(__file__), '..', '..', 'scd64_plugin.js')
        self.callbacks = []
        self._state = {"agents": [], "seeds": []}
        self.running = False

    async def start(self):
        if self.process:
            return
        
        self.running = True
        self.process = await asyncio.create_subprocess_exec(
            "node", self.plugin_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        asyncio.create_task(self._listen_stdout())

    async def _listen_stdout(self):
        while self.running and self.process and self.process.stdout:
            line = await self.process.stdout.readline()
            if not line:
                break
            try:
                msg = json.loads(line.decode().strip())
                if msg.get('type') == 'TICK_RESULT':
                    self._state = msg.get('state', {"agents": [], "seeds": []})
                    for cb in self.callbacks:
                        cb(self._state)
            except Exception as e:
                pass

    def subscribe(self, callback: Callable):
        self.callbacks.append(callback)

    async def send_msg(self, msg: Dict[str, Any]):
        if not self.process or not self.process.stdin:
            return
        msg_str = json.dumps(msg) + "\n"
        self.process.stdin.write(msg_str.encode())
        await self.process.stdin.drain()

    async def inject_exosome(self, exosome_id: str, source: str, symptoms: list, error: str):
        await self.send_msg({
            "type": "INJECT_EXOSOME",
            "id": exosome_id,
            "source": source,
            "symptoms": symptoms,
            "error": error
        })

    async def tick(self):
        await self.send_msg({"type": "TICK"})

    async def heal(self, family: str):
        await self.send_msg({"type": "HEAL", "family": family})

    async def stop(self):
        self.running = False
        if self.process:
            self.process.terminate()
            await self.process.wait()

scd64_service = SCD64Service()
