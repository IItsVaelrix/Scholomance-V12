"""
Vaelrix Cortex ForceField — persistent serialization across sessions.

Mirrors the `codex/server/user.persistence.js` scaffolding:
  - SQLite-backed
  - Migration-tracked schema
  - JSON blob per ForceField keyed by task_id
  - save / load / list / delete API
"""

from __future__ import annotations

import json
import os
import sqlite3
import time
from dataclasses import asdict, is_dataclass
from pathlib import Path
from typing import Any

from .types import VaelrixCortexForceField


def _default_db_path() -> str:
    return os.environ.get(
        "VAELRIX_FORCEFIELD_DB",
        os.path.expanduser("~/.vaelrix/forcefields.sqlite"),
    )


DEFAULT_DB_PATH = _default_db_path()
SCHEMA_VERSION = 1

MIGRATIONS = [
    {
        "version": 1,
        "name": "create_forcefields_table",
        "sql": """
            CREATE TABLE IF NOT EXISTS forcefields (
                task_id TEXT PRIMARY KEY,
                data_json TEXT NOT NULL,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_forcefields_updated_at
                ON forcefields(updated_at DESC);
        """,
    },
]


def _ensure_db(db_path: str | None = None) -> sqlite3.Connection:
    path = db_path or _default_db_path()
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA foreign_keys = ON")

    # Migration tracking
    conn.execute("""
        CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at REAL NOT NULL
        )
    """)

    applied = {
        row[0] for row in conn.execute("SELECT version FROM _migrations")
    }
    for migration in MIGRATIONS:
        if migration["version"] not in applied:
            conn.executescript(migration["sql"])
            conn.execute(
                "INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)",
                (migration["version"], migration["name"], time.time()),
            )
            conn.commit()

    return conn


def _field_to_json(field: VaelrixCortexForceField) -> str:
    """Serialize a ForceField dataclass tree to a JSON string."""

    def convert(obj: Any) -> Any:
        if is_dataclass(obj):
            return {k: convert(v) for k, v in asdict(obj).items()}
        if isinstance(obj, (list, tuple)):
            return [convert(v) for v in obj]
        if isinstance(obj, dict):
            return {k: convert(v) for k, v in obj.items()}
        return obj

    return json.dumps(convert(field), ensure_ascii=False, indent=2)


def _json_to_field(data_json: str) -> VaelrixCortexForceField:
    """Deserialize a JSON string back into a VaelrixCortexForceField."""
    from .types import (
        AmplifierResult,
        ContextField,
        DeterminismField,
        EvidenceRef,
        MemoryField,
        OutputField,
        ResonanceScore,
        RetrievedChunk,
        RiskField,
        RoutingField,
        SearchBlock,
        SearchField,
        SearchRecord,
        TaskField,
        ToolCallField,
        ToolCallRequest,
        VaelrixCortexForceField,
    )

    data = json.loads(data_json)

    def revive(obj: Any, cls: type) -> Any:
        if not isinstance(obj, dict):
            return obj
        if cls is VaelrixCortexForceField:
            return VaelrixCortexForceField(
                task=revive(obj.get("task", {}), TaskField),
                context=revive(obj.get("context", {}), ContextField),
                routing=revive(obj.get("routing", {}), RoutingField),
                memory=revive(obj.get("memory", {}), MemoryField),
                search=revive(obj.get("search", {}), SearchField),
                tools=revive(obj.get("tools", {}), ToolCallField),
                risks=revive(obj.get("risks", {}), RiskField),
                output=revive(obj.get("output", {}), OutputField),
                determinism=revive(obj.get("determinism", {}), DeterminismField),
            )

        # Generic dataclass revival from dict keys.
        import inspect

        sig = inspect.signature(cls.__init__)
        kwargs: dict[str, Any] = {}
        for param_name in sig.parameters:
            if param_name == "self":
                continue
            raw = obj.get(param_name)
            if raw is None:
                continue

            # Nested known types
            if cls is MemoryField and param_name == "retrievedChunks":
                kwargs[param_name] = [revive(c, RetrievedChunk) for c in raw]
            elif cls is SearchField and param_name == "searchHistory":
                kwargs[param_name] = [revive(r, SearchRecord) for r in raw]
            elif cls is SearchField and param_name == "blockedSearches":
                kwargs[param_name] = [revive(b, SearchBlock) for b in raw]
            elif cls is ToolCallField and param_name == "lastCalls":
                kwargs[param_name] = [revive(c, ToolCallRequest) for c in raw]
            elif cls is AmplifierResult and param_name == "evidence":
                kwargs[param_name] = [revive(e, EvidenceRef) for e in raw]
            elif cls is AmplifierResult and param_name == "requestedToolCalls":
                kwargs[param_name] = [revive(t, ToolCallRequest) for t in raw]
            elif cls is AmplifierResult and param_name == "resonance":
                kwargs[param_name] = revive(raw, ResonanceScore)
            else:
                kwargs[param_name] = raw
        try:
            return cls(**kwargs)
        except Exception:
            return obj

    return revive(data, VaelrixCortexForceField)


def save_force_field(
    field: VaelrixCortexForceField,
    db_path: str | None = None,
) -> str:
    """Persist a ForceField. Returns the persisted task_id."""
    conn = _ensure_db(db_path)
    try:
        now = time.time()
        conn.execute(
            """
            INSERT INTO forcefields (task_id, data_json, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(task_id) DO UPDATE SET
                data_json = excluded.data_json,
                updated_at = excluded.updated_at
            """,
            (field.task.taskId, _field_to_json(field), now, now),
        )
        conn.commit()
        return field.task.taskId
    finally:
        conn.close()


def load_force_field(
    task_id: str,
    db_path: str | None = None,
) -> VaelrixCortexForceField:
    """Load a persisted ForceField by task_id."""
    conn = _ensure_db(db_path)
    try:
        row = conn.execute(
            "SELECT data_json FROM forcefields WHERE task_id = ?",
            (task_id,),
        ).fetchone()
        if row is None:
            raise FileNotFoundError(f"No persisted ForceField for task_id={task_id}")
        return _json_to_field(row[0])
    finally:
        conn.close()


def list_force_fields(
    db_path: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """List persisted ForceField sessions ordered by most recently updated."""
    conn = _ensure_db(db_path)
    try:
        rows = conn.execute(
            """
            SELECT task_id, created_at, updated_at FROM forcefields
            ORDER BY updated_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [
            {
                "task_id": task_id,
                "created_at": created_at,
                "updated_at": updated_at,
            }
            for task_id, created_at, updated_at in rows
        ]
    finally:
        conn.close()


def delete_force_field(task_id: str, db_path: str | None = None) -> bool:
    """Delete a persisted ForceField. Returns True if it existed."""
    conn = _ensure_db(db_path)
    try:
        cursor = conn.execute(
            "DELETE FROM forcefields WHERE task_id = ?",
            (task_id,),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def get_persistence_status(db_path: str | None = None) -> dict[str, Any]:
    """Return persistence store status."""
    conn = _ensure_db(db_path)
    try:
        version = conn.execute(
            "SELECT MAX(version) FROM _migrations"
        ).fetchone()[0]
        count = conn.execute(
            "SELECT COUNT(*) FROM forcefields"
        ).fetchone()[0]
        return {
            "db_path": db_path or _default_db_path(),
            "schema_version": version,
            "persisted_count": count,
        }
    finally:
        conn.close()
