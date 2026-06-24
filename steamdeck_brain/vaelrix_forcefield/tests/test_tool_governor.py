"""Tests for the ForceField Tool Governor."""

import unittest

from vaelrix_forcefield import create_force_field
from vaelrix_forcefield.tool_governor import (
    filter_allowed_tool_calls,
    record_tool_call,
    should_allow_tool_call,
)
from vaelrix_forcefield.types import ToolCallRequest


class TestToolGovernor(unittest.TestCase):
    def test_allows_read_file_with_reason(self):
        field = create_force_field("x")
        decision = should_allow_tool_call(
            field,
            "read_file",
            {"path": "search_governor.py"},
            "Need to inspect the governor",
            allowed_tools={"read_file", "search_code"},
        )
        self.assertTrue(decision.allowed)
        self.assertEqual(decision.riskLevel, "low")

    def test_blocks_unauthorized_tool(self):
        field = create_force_field("x")
        decision = should_allow_tool_call(
            field,
            "replace_file_content",
            {"path": "x.py", "content": "y"},
            "Edit the file",
            allowed_tools={"read_file"},
        )
        self.assertFalse(decision.allowed)
        self.assertEqual(decision.riskLevel, "blocked")

    def test_blocks_missing_reason(self):
        field = create_force_field("x")
        decision = should_allow_tool_call(
            field,
            "read_file",
            {"path": "x.py"},
            "",
            allowed_tools={"read_file"},
        )
        self.assertFalse(decision.allowed)
        self.assertIn("reason", decision.reason.lower())

    def test_blocks_budget_exhaustion(self):
        field = create_force_field("x")
        field.tools.maxCallsPerPhase = 1
        field = record_tool_call(field, "read_file", {"path": "a.py"}, "reason")

        decision = should_allow_tool_call(
            field,
            "read_file",
            {"path": "b.py"},
            "Need another file",
            allowed_tools={"read_file"},
        )
        self.assertFalse(decision.allowed)
        self.assertIn("budget", decision.reason.lower())

    def test_blocks_repeated_identical_call(self):
        field = create_force_field("x")
        field = record_tool_call(field, "read_file", {"path": "a.py"}, "reason")

        decision = should_allow_tool_call(
            field,
            "read_file",
            {"path": "a.py"},
            "reason again",
            allowed_tools={"read_file"},
        )
        self.assertFalse(decision.allowed)
        self.assertIn("already made", decision.reason.lower())

    def test_flags_destructive_tool_high_risk(self):
        field = create_force_field("x")
        decision = should_allow_tool_call(
            field,
            "replace_file_content",
            {"path": "x.py", "content": "y"},
            "Update implementation",
            allowed_tools={"read_file", "replace_file_content"},
        )
        self.assertTrue(decision.allowed)
        self.assertEqual(decision.riskLevel, "high")

    def test_filter_allowed_tool_calls_records_allowed(self):
        field = create_force_field("x")
        requests = [
            ToolCallRequest(tool="read_file", args={"path": "a.py"}, reason="Read a"),
            ToolCallRequest(tool="read_file", args={"path": "a.py"}, reason="Read a again"),
            ToolCallRequest(tool="replace_file_content", args={"path": "a.py"}, reason="Edit"),
        ]
        allowed, decisions = filter_allowed_tool_calls(
            field,
            requests,
            allowed_tools={"read_file", "replace_file_content"},
        )
        self.assertEqual(len(allowed), 2)  # first read + edit
        self.assertEqual(len(decisions), 3)
        self.assertFalse(decisions[1].allowed)


if __name__ == "__main__":
    unittest.main()
