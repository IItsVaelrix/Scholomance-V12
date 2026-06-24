"""Tests for ForceField persistence across sessions."""

import os
import tempfile
import unittest

from vaelrix_forcefield import create_force_field, save_force_field, load_force_field, list_force_fields, delete_force_field
from vaelrix_forcefield.context_ledger import confirm_file


class TestForceFieldPersistence(unittest.TestCase):
    def setUp(self):
        fd, self.db_path = tempfile.mkstemp(suffix=".sqlite")
        os.close(fd)

    def tearDown(self):
        try:
            os.remove(self.db_path)
        except Exception:
            pass

    def test_save_and_load_round_trip(self):
        field = create_force_field("Fix the search bug")
        field = confirm_file(field, "search_governor", "vaelrix_forcefield/search_governor.py")

        task_id = save_force_field(field, db_path=self.db_path)
        loaded = load_force_field(task_id, db_path=self.db_path)

        self.assertEqual(loaded.task.rawUserRequest, "Fix the search bug")
        self.assertEqual(
            loaded.context.confirmedFiles["search_governor"],
            "vaelrix_forcefield/search_governor.py",
        )

    def test_list_force_fields(self):
        field1 = create_force_field("Task one")
        field2 = create_force_field("Task two")
        save_force_field(field1, db_path=self.db_path)
        save_force_field(field2, db_path=self.db_path)

        sessions = list_force_fields(db_path=self.db_path)
        self.assertEqual(len(sessions), 2)
        self.assertIn(field1.task.taskId, {s["task_id"] for s in sessions})
        self.assertIn(field2.task.taskId, {s["task_id"] for s in sessions})

    def test_delete_force_field(self):
        field = create_force_field("Delete me")
        task_id = save_force_field(field, db_path=self.db_path)

        self.assertTrue(delete_force_field(task_id, db_path=self.db_path))
        self.assertFalse(list_force_fields(db_path=self.db_path))

        with self.assertRaises(FileNotFoundError):
            load_force_field(task_id, db_path=self.db_path)

    def test_save_updates_existing_session(self):
        field = create_force_field("Original request")
        task_id = save_force_field(field, db_path=self.db_path)

        field.task.rawUserRequest = "Updated request"
        save_force_field(field, db_path=self.db_path)

        loaded = load_force_field(task_id, db_path=self.db_path)
        self.assertEqual(loaded.task.rawUserRequest, "Updated request")


class TestBrainBridgePersistence(unittest.TestCase):
    def setUp(self):
        fd, self.db_path = tempfile.mkstemp(suffix=".sqlite")
        os.close(fd)
        os.environ["VAELRIX_FORCEFIELD_DB"] = self.db_path

    def tearDown(self):
        try:
            os.remove(self.db_path)
        except Exception:
            pass
        os.environ.pop("VAELRIX_FORCEFIELD_DB", None)

    def test_brain_bridge_saves_session(self):
        from vaelrix_forcefield import BrainBridge

        bridge = BrainBridge()
        result = bridge.ask("Find the search governor code", persist=True)

        self.assertTrue(result["persisted"])
        self.assertIsNotNone(result["session_id"])

        loaded = load_force_field(result["session_id"], db_path=self.db_path)
        self.assertEqual(loaded.task.rawUserRequest, "Find the search governor code")

    def test_brain_bridge_resumes_session(self):
        from vaelrix_forcefield import BrainBridge

        bridge = BrainBridge()
        first = bridge.ask("Find the search governor code", persist=True)
        session_id = first["session_id"]

        second = bridge.ask("Now add tests", session_id=session_id, persist=True)
        self.assertEqual(second["session_id"], session_id)

        loaded = load_force_field(session_id, db_path=self.db_path)
        self.assertEqual(loaded.task.rawUserRequest, "Now add tests")


if __name__ == "__main__":
    unittest.main()
