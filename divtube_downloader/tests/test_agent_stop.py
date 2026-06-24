import threading
import unittest

from tui.ui.app import DivTubeAgentApp


class _FakeProc:
    def __init__(self):
        self.terminated = False

    def terminate(self):
        self.terminated = True


class _FakeBar:
    def __init__(self):
        self.classes = set()
        self.styles = type("S", (), {"display": "block"})()

    def remove_class(self, name):
        self.classes.discard(name)


def _bare_controller():
    """An app instance with only the controller state initialised — avoids
    spawning the bridges/services that the full __init__ constructs."""
    app = DivTubeAgentApp.__new__(DivTubeAgentApp)
    app._agent_procs = []
    app._agent_gen = 0
    app._agent_busy = False
    app._agent_lock = threading.Lock()
    app._logs = []
    app.log_msg = lambda msg: app._logs.append(msg)
    bar = _FakeBar()
    app.query_one = lambda sel: bar
    app._bar = bar
    return app


class TestAgentStop(unittest.TestCase):
    def test_stop_kills_subprocess_and_resets(self):
        app = _bare_controller()
        token = app.begin_agent()
        proc = _FakeProc()
        app.register_agent_proc(proc)

        app.action_stop_agents()

        self.assertTrue(proc.terminated, "subprocess was not terminated")
        self.assertFalse(app._agent_busy)
        self.assertEqual(app._agent_procs, [])
        self.assertEqual(app._bar.styles.display, "none")
        self.assertTrue(app.agent_cancelled(token), "old token must be invalidated")
        self.assertTrue(any("Stopped" in m for m in app._logs))

    def test_stop_is_noop_when_idle(self):
        app = _bare_controller()
        app.action_stop_agents()
        self.assertEqual(app._logs, [], "idle Esc should not log a stop")

    def test_natural_completion_does_not_invalidate_token(self):
        app = _bare_controller()
        token = app.begin_agent()
        self.assertFalse(app.agent_cancelled(token))
        app.end_agent()  # finishing normally keeps the token valid
        self.assertFalse(app.agent_cancelled(token))
        self.assertFalse(app._agent_busy)


if __name__ == "__main__":
    unittest.main()
