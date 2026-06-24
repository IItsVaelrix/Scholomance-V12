import json
import os

from video_forge.project_store import ProjectStore


class LedgerViewer:
    def __init__(self, store: ProjectStore):
        self.store = store

    def list_renders(self, project_id: str) -> list[dict]:
        return self.store.list_renders(project_id)

    def get_render(self, project_id: str, render_id: str) -> dict:
        d = os.path.join(self.store._project_dir(project_id), "renders", render_id)
        ledger_path = os.path.join(d, "render-ledger.json")
        if not os.path.isfile(ledger_path):
            raise FileNotFoundError(f"Render ledger not found: {render_id}")
        with open(ledger_path, "r") as f:
            return json.load(f)

    def format_ledger_summary(self, project_id: str) -> str:
        renders = self.list_renders(project_id)
        if not renders:
            return "[#6B7280]No renders yet. Run /forge export to create one.[/]"
        lines = []
        for r in renders:
            status = r.get("status", "unknown")
            status_color = {"completed": "#7CFF8B", "failed": "#FF5C7A", "rendering": "#FFD166"}.get(status, "#6B7280")
            lines.append(
                f"  [{status_color}]◆[/] {r.get('renderId', '?')} "
                f"[#B388FF]{r.get('preset', '?')}[/] "
                f"[{status_color}]{status}[/] "
                f"[#6B7280]{r.get('outputPath', '')}[/]"
            )
        return "[bold #FFD700]Render Ledger:[/]\n" + "\n".join(lines)
