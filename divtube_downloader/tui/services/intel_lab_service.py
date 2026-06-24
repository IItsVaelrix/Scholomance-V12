import os
import json
import glob as globmod
import threading

from intel.schema import load_analysis_from_json
from intel.pipeline import run_critique
from intel.references import load_all_references
from intel.thumbnail.fetch import fetch_thumbnail
from intel.report.renderer import render_markdown, assemble_report
from intel.report.prose import write_sections


class IntelLabService:
    def __init__(self, base_dir=None):
        self.base_dir = base_dir or os.getcwd()

    def run_intel(self, url, callback):
        def run():
            try:
                callback("[bold cyan]Running telemetry analysis (Java)...[/]")
                from tui.services.agent_service import AgentService
                agent = AgentService()

                analysis_path = [None]

                def capture_output(msg):
                    if "Saved to" in msg:
                        parts = msg.split("Saved to")
                        if len(parts) > 1:
                            path = parts[-1].strip().rstrip(".").strip()
                            path = path.replace("[bold green]>[/] ", "").strip()
                            analysis_path[0] = path
                    callback(msg)

                agent.run_command("3", url, capture_output)

                if analysis_path[0] is None:
                    analysis_path[0] = self._locate_analysis(url)

                if analysis_path[0] is None:
                    callback("[bold red]Could not locate analysis JSON. Run /intel with a valid YouTube URL.[/]")
                    return

                callback(f"[bold green]Loading analysis from: {analysis_path[0]}[/]")
                analysis = load_analysis_from_json(analysis_path[0])

                callback("[bold cyan]Fetching thumbnail...[/]")
                thumb_bytes, thumb_err = fetch_thumbnail(analysis.overview.thumbnail)
                if thumb_err:
                    callback(f"[yellow]Thumbnail fetch warning: {thumb_err['message']}[/]")

                callback("[bold cyan]Running critique engines...[/]")
                references = load_all_references()
                critique = run_critique(analysis, thumb_bytes, references)

                output_path = self._write_ledger(critique, analysis_path[0])
                callback(f"[bold green]Ledger saved to: {output_path}[/]")

                callback("[bold cyan]Rendering report...[/]")
                sections = render_markdown(critique, references)
                prose = write_sections(critique.scores, critique.flags, references)
                sections.update(prose)
                markdown = assemble_report(sections, critique)

                callback(markdown)
                callback("[bold cyan]Intel report complete.[/]")

            except Exception as e:
                callback(f"[bold red]Intel Lab Error: {e}[/]")

        threading.Thread(target=run).start()

    def _locate_analysis(self, url):
        video_id = self._extract_video_id(url)
        if not video_id:
            return None

        pattern = os.path.join(self.base_dir, f"youtube-analysis-{video_id}-*.json")
        matches = sorted(globmod.glob(pattern), reverse=True)
        return matches[0] if matches else None

    def _extract_video_id(self, url):
        import re
        patterns = [
            r"(?:v=|/v/|youtu\.be/)([A-Za-z0-9_-]{11})",
            r"([A-Za-z0-9_-]{11})",
        ]
        for p in patterns:
            m = re.search(p, url)
            if m:
                return m.group(1)
        return None

    def _write_ledger(self, critique, analysis_path):
        dirname = os.path.dirname(analysis_path) or self.base_dir
        basename = os.path.basename(analysis_path)
        critique_name = basename.replace("youtube-analysis-", "youtube-critique-")
        output_path = os.path.join(dirname, critique_name)

        with open(output_path, "w") as f:
            json.dump(critique.to_dict(), f, indent=2)

        return output_path
