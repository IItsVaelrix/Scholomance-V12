import sqlite3
import json
import uuid
import datetime
from typing import Dict, Any, List, Optional
import os

class SentinelStore:
    def __init__(self, db_path: str = "~/.substrate/memory.sqlite"):
        self.db_path = os.path.expanduser(db_path)
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_db()

    def _init_db(self):
        with self.conn:
            self.conn.executescript("""
CREATE TABLE IF NOT EXISTS sentinel_events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  path TEXT,
  hash_before TEXT,
  hash_after TEXT,
  actor TEXT NOT NULL,
  risk_class TEXT NOT NULL,
  metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS sentinel_reports (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  scope TEXT NOT NULL,
  status TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  summary TEXT NOT NULL,
  report_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sentinel_findings (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  file TEXT,
  line INTEGER,
  invariant TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  evidence TEXT,
  FOREIGN KEY(report_id) REFERENCES sentinel_reports(id)
);

CREATE TABLE IF NOT EXISTS failure_signatures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  trigger_terms_json TEXT NOT NULL,
  affected_files_json TEXT NOT NULL,
  historical_examples_json TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  recommended_probe TEXT NOT NULL
);
            """)

    def save_report(self, report: Dict[str, Any]) -> str:
        report_id = report.get("id", str(uuid.uuid4()))
        timestamp = report.get("timestamp", datetime.datetime.now(datetime.timezone.utc).isoformat())
        scope = report.get("scope", "full")
        status = report.get("status", "pass")
        risk_score = report.get("riskScore", 0)
        
        summary = ""
        findings = report.get("findings", [])
        if findings:
            summary = f"Found {len(findings)} findings."
        else:
            summary = "No findings."

        with self.conn:
            self.conn.execute(
                "INSERT INTO sentinel_reports (id, timestamp, scope, status, risk_score, summary, report_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (report_id, timestamp, scope, status, risk_score, summary, json.dumps(report))
            )
            for f in findings:
                finding_id = str(uuid.uuid4())
                self.conn.execute(
                    "INSERT INTO sentinel_findings (id, report_id, severity, file, line, invariant, description, recommendation, evidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        finding_id,
                        report_id,
                        f.get("severity", "info"),
                        f.get("file"),
                        f.get("line"),
                        f.get("invariant", ""),
                        f.get("description", ""),
                        f.get("recommendation", ""),
                        f.get("evidence")
                    )
                )
        return report_id

    def get_latest_report(self) -> Optional[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT report_json FROM sentinel_reports ORDER BY timestamp DESC LIMIT 1")
        row = cursor.fetchone()
        if row:
            return json.loads(row["report_json"])
        return None
