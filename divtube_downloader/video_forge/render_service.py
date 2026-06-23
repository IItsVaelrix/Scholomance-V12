import os
import subprocess
import uuid
from typing import Optional
from datetime import datetime, timezone

from video_forge.schema import VideoProject, RenderLedger, compute_project_recipe_hash
from video_forge.ffmpeg_command_builder import FfmpegCommandBuilder
from video_forge.project_store import ProjectStore
from video_forge.presets import PRESETS
from video_forge.errors import get_error


def _get_ffmpeg_version(ffmpeg_path: str) -> str:
    try:
        r = subprocess.run([ffmpeg_path, "-version"], capture_output=True, text=True, timeout=10)
        first = r.stdout.split("\n")[0] if r.stdout else "unknown"
        return first.strip()
    except Exception:
        return "unknown"


class RenderService:
    def __init__(self, ffmpeg_path: str = "ffmpeg", project_store: Optional[ProjectStore] = None,
                 skip_check: bool = False):
        self.ffmpeg_path = ffmpeg_path
        self.builder = FfmpegCommandBuilder(ffmpeg_path)
        self.store = project_store or ProjectStore()
        if not skip_check:
            self._check_ffmpeg()

    def _check_ffmpeg(self) -> None:
        try:
            subprocess.run([self.ffmpeg_path, "-version"], capture_output=True, timeout=10)
        except (FileNotFoundError, subprocess.TimeoutExpired):
            raise get_error("VIDEOFORGE_FFMPEG_NOT_FOUND")

    def render(self, project: VideoProject, preset_name: str, output_path: str,
               progress_callback=None) -> RenderLedger:
        if preset_name not in PRESETS:
            raise get_error("VIDEOFORGE_PRESET_UNKNOWN")

        preset = PRESETS[preset_name]
        if preset.get("extension"):
            if not output_path.endswith(preset["extension"]):
                output_path += preset["extension"]

        render_id = uuid.uuid4().hex[:12]
        recipe_hash = compute_project_recipe_hash(project)

        ffmpeg_cmd = self.builder.build(project, preset_name, output_path)

        ffmpeg_version = _get_ffmpeg_version(self.ffmpeg_path)

        ledger = RenderLedger(
            render_id=render_id,
            preset=preset_name,
            ffmpeg_command=ffmpeg_cmd,
            ffmpeg_version=ffmpeg_version,
            output_path=output_path,
            status="rendering",
            recipe_hash=recipe_hash,
            started_at=datetime.now(timezone.utc).isoformat(),
        )

        project_dir = self.store._project_dir(project.project_id) if project.project_id else "."
        out_dir = os.path.join(project_dir, "renders", render_id) if project.project_id else os.path.dirname(output_path)
        os.makedirs(out_dir, exist_ok=True)

        try:
            proc = subprocess.Popen(
                ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True, cwd=out_dir,
            )
            if progress_callback:
                progress_callback("render_started", {"render_id": render_id, "preset": preset_name})

            stdout, stderr = proc.communicate(timeout=3600)

            if progress_callback:
                progress_callback("render_progress", {"render_id": render_id})

            if proc.returncode != 0:
                ledger.status = "failed"
                ledger.errors = [stderr[:2000] if stderr else "Unknown error"]
                if progress_callback:
                    progress_callback("render_failed", {"render_id": render_id, "errors": ledger.errors})
            else:
                ledger.status = "completed"
                if progress_callback:
                    progress_callback("render_completed", {"render_id": render_id, "output": output_path})

        except subprocess.TimeoutExpired:
            ledger.status = "failed"
            ledger.errors = ["Render timed out after 3600 seconds."]
            if progress_callback:
                progress_callback("render_failed", {"render_id": render_id, "errors": ledger.errors})
        except Exception as e:
            ledger.status = "failed"
            ledger.errors = [str(e)]
            if progress_callback:
                progress_callback("render_failed", {"render_id": render_id, "errors": ledger.errors})

        ledger.completed_at = datetime.now(timezone.utc).isoformat()
        if os.path.isfile(output_path):
            ledger.duration_secs = 0.0

        project.last_render_ledger = ledger
        if project.project_id:
            self.store.save(project)

        self._write_render_ledger(project, ledger, out_dir)
        return ledger

    def _write_render_ledger(self, project: VideoProject, ledger: RenderLedger, out_dir: str) -> str:
        from video_forge.schema import to_dict
        data = {
            "projectId": project.project_id,
            "projectName": project.project_name,
            "renderId": ledger.render_id,
            "preset": ledger.preset,
            "ffmpegCommand": ledger.ffmpeg_command,
            "ffmpegVersion": ledger.ffmpeg_version,
            "outputPath": ledger.output_path,
            "status": ledger.status,
            "recipeHash": ledger.recipe_hash,
            "startedAt": ledger.started_at,
            "completedAt": ledger.completed_at,
            "errors": ledger.errors,
            "warnings": ledger.warnings,
            "projectSnapshot": to_dict(project),
        }
        import json
        led_path = os.path.join(out_dir, "render-ledger.json")
        with open(led_path, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return led_path
