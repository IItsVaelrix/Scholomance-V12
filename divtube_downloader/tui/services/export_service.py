import time
class ExportService:
    def export_session(self, logs, format="markdown"):
        filename = f"export_{int(time.time())}.md"
        with open(filename, "w") as f:
            f.write("# DivTube Session Export\n\n")
            f.write(logs)
        return filename
