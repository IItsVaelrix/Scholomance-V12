import unittest
from tui.core.command_parser import CommandRegistry

class MockUI:
    def __init__(self):
        self.logs = []
    def log_msg(self, msg):
        self.logs.append(msg)

class TestTUI(unittest.TestCase):
    def test_command_parser(self):
        reg = CommandRegistry()
        ui = MockUI()
        reg.register("/test", lambda u, args: u.log_msg("tested"), "desc", "usage")
        reg.parse_and_execute("/test args", ui)
        self.assertIn("tested", ui.logs)

if __name__ == '__main__':
    unittest.main()
