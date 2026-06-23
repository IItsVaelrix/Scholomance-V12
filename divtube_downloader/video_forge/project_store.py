import os
import json
import shutil
import uuid

from video_forge.schema import VideoProject, project_to_json, project_from_json, compute_project_recipe_hash


class ProjectStore:
    def __init__(self, base_dir: str = "video_forge/projects"):
        self.base_dir = os.path.abspath(base_dir)

    def _project_dir(self, project_id: str) -> str:
        return os.path.join(self.base_dir, project_id)

    def project_path(self, project_id: str) -> str:
        return os.path.join(self._project_dir(project_id), "project.video-forge.json")

    def renders_dir(self, project_id: str) -> str:
        d = os.path.join(self._project_dir(project_id), "renders")
        os.makedirs(d, exist_ok=True)
        return d

    def render_dir(self, project_id: str, render_id: str) -> str:
        d = os.path.join(self.renders_dir(project_id), render_id)
        os.makedirs(d, exist_ok=True)
        return d

    def list_projects(self) -> list[dict]:
        projects = []
        if not os.path.isdir(self.base_dir):
            return projects
        for name in sorted(os.listdir(self.base_dir)):
            project_dir = os.path.join(self.base_dir, name)
            proj_file = os.path.join(project_dir, "project.video-forge.json")
            if os.path.isfile(proj_file):
                try:
                    with open(proj_file, "r") as f:
                        data = json.load(f)
                    projects.append({
                        "projectId": data.get("projectId", name),
                        "projectName": data.get("projectName", name),
                        "schemaVersion": data.get("schemaVersion", ""),
                    })
                except (json.JSONDecodeError, IOError):
                    projects.append({"projectId": name, "projectName": name, "schemaVersion": "corrupt"})
        return projects

    def save(self, project: VideoProject) -> str:
        if not project.project_id:
            project.project_id = uuid.uuid4().hex[:12]
        project_dir = self._project_dir(project.project_id)
        os.makedirs(project_dir, exist_ok=True)
        path = self.project_path(project.project_id)
        text = project_to_json(project)
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(text)
        shutil.move(tmp, path)
        return path

    def load(self, project_id: str) -> VideoProject:
        path = self.project_path(project_id)
        if not os.path.isfile(path):
            raise FileNotFoundError(f"Project not found: {project_id}")
        with open(path, "r", encoding="utf-8") as f:
            return project_from_json(f.read())

    def delete(self, project_id: str) -> None:
        project_dir = self._project_dir(project_id)
        if os.path.isdir(project_dir):
            shutil.rmtree(project_dir)

    def list_renders(self, project_id: str) -> list[dict]:
        renders = []
        renders_root = os.path.join(self._project_dir(project_id), "renders")
        if not os.path.isdir(renders_root):
            return renders
        for name in sorted(os.listdir(renders_root)):
            ledger_file = os.path.join(renders_root, name, "render-ledger.json")
            if os.path.isfile(ledger_file):
                try:
                    with open(ledger_file, "r") as f:
                        renders.append(json.load(f))
                except (json.JSONDecodeError, IOError):
                    renders.append({"renderId": name, "status": "corrupt"})
        return renders
