import re
import subprocess
import threading
import queue
import time
import json

from vaelrix_tools import dispatch_tool


_SEARCH_TOOLS = {"search_code", "codebase_search", "archive_search", "forensic_search", "find_file", "list_files"}

# Tools the ForceField Tool Governor should gate beyond search.
_GOVERNED_TOOLS = {
    "read_file",
    "replace_file_content",
    "write_file",
    "delete_file",
    "run_tests",
    "run_command",
}


class ActionEngine:
    """
    Action Layer for SteamDeck Brain.
    Provides:
    1. Tool Calling — [TOOL: name]{{...}} blocks + legacy [EXECUTE: cmd]
    2. Self-Correction Loop — feeds stderr/errors back into model
    3. Persistent Background Task Queue
    """

    MAX_TOOL_TURNS = 8

    def __init__(self, brain_bridge):
        self.brain = brain_bridge
        self.task_queue = queue.Queue()
        self.running_tasks = {}
        self.worker = threading.Thread(target=self._task_worker, daemon=True)
        self.worker.start()

    def _get_cortex(self):
        if hasattr(self.brain, "cortex"):
            return self.brain.cortex
        return None

    def parse_and_run(self, response: str) -> str:
        """Parse tool calls and execute them. Supports multi-turn tool loops."""

        self.tool_log = []

        for _ in range(self.MAX_TOOL_TURNS):
            match = re.search(r'\[TOOL:\s*(\w+)\]\s*(\{.*?\})', response, re.DOTALL)
            if not match:
                legacy = re.search(r'\[EXECUTE:\s*(.+?)\]', response, re.DOTALL)
                if legacy:
                    return self._run_execute(response, legacy.group(1).strip())
                return response

            tool_name = match.group(1)
            args_str = match.group(2)

            try:
                args = json.loads(args_str)
            except json.JSONDecodeError:
                response = f"{response}\n\n[Tool Error: invalid JSON arguments for '{tool_name}']"
                continue

            self.tool_log.append({"tool": tool_name, "args": args})

            print(f"\n\033[1;96m🔧 TOOL: {tool_name}\033[0m \033[2m{json.dumps(args)}\033[0m")

            # ── ForceField Search Governor ─────────────────────────────────────
            if tool_name in _SEARCH_TOOLS and getattr(self.brain, "_current_force_field", None):
                field = self.brain._current_force_field
                query = args.get("pattern") or args.get("query") or args.get("directory") or str(args)
                reason = args.get("reason") or f"Model-initiated {tool_name}"
                decision = None
                try:
                    from vaelrix_forcefield import should_allow_search, record_search, block_search
                    decision = should_allow_search(field, query, reason)
                except Exception:
                    decision = None

                if decision and not decision.allowed:
                    self.brain._current_force_field = block_search(
                        self.brain._current_force_field,
                        query,
                        decision.reason,
                        decision.suggestedAlternative,
                    )
                    result = (
                        f"[ForceField blocked {tool_name}]\n"
                        f"Reason: {decision.reason}\n"
                        f"Alternative: {decision.suggestedAlternative or 'Use a more specific query or read a known file'}"
                    )
                    result_trunc = result[:500] + ('...' if len(result) > 500 else '')
                    self.tool_log[-1]["result"] = result_trunc
                    print(f"\033[2m{result_trunc}\033[0m")
                    response = response[:match.start()] + response[match.end():]
                    response = f"{response}\n\n--- TOOL RESULT [{tool_name}] ---\n{result}"

                    followup = self.brain.model.generate(
                        response,
                        system=self.brain.system_prompt
                    )
                    response = f"{response}\n\n{followup}"
                    continue

                self.brain._current_force_field = record_search(
                    self.brain._current_force_field,
                    query,
                    reason,
                )

            # ── ForceField Tool Governor ───────────────────────────────────────
            if tool_name in _GOVERNED_TOOLS and getattr(self.brain, "_current_force_field", None):
                field = self.brain._current_force_field
                reason = args.get("reason") or f"Model-initiated {tool_name}"
                try:
                    from vaelrix_forcefield.tool_governor import should_allow_tool_call, record_tool_call
                    decision = should_allow_tool_call(field, tool_name, args, reason)
                except Exception:
                    decision = None

                if decision and not decision.allowed:
                    result = (
                        f"[ForceField Tool Governor blocked {tool_name}]\n"
                        f"Reason: {decision.reason}\n"
                        f"Alternative: {decision.suggestedAlternative or 'Refine the request or escalate to the Council Arbiter'}"
                    )
                    result_trunc = result[:500] + ('...' if len(result) > 500 else '')
                    self.tool_log[-1]["result"] = result_trunc
                    print(f"\033[2m{result_trunc}\033[0m")
                    response = response[:match.start()] + response[match.end():]
                    response = f"{response}\n\n--- TOOL RESULT [{tool_name}] ---\n{result}"

                    followup = self.brain.model.generate(
                        response,
                        system=self.brain.system_prompt
                    )
                    response = f"{response}\n\n{followup}"
                    continue

                if decision:
                    self.brain._current_force_field = record_tool_call(
                        self.brain._current_force_field,
                        tool_name,
                        args,
                        reason,
                    )

            result = dispatch_tool(tool_name, args, cortex=self._get_cortex())

            result_trunc = result[:500] + ('...' if len(result) > 500 else '')
            self.tool_log[-1]["result"] = result_trunc
            print(f"\033[2m{result_trunc}\033[0m")

            response = response[:match.start()] + response[match.end():]
            response = f"{response}\n\n--- TOOL RESULT [{tool_name}] ---\n{result}"

            followup = self.brain.model.generate(
                response,
                system=self.brain.system_prompt
            )
            response = f"{response}\n\n{followup}"

        return response

    def _run_execute(self, response: str, cmd: str) -> str:
        """Legacy: handle [EXECUTE: command] blocks."""
        print("\n\033[1;91m🛑 LOGICAL FIREWALL TRIGGERED\033[0m")
        print(f"\033[96mVaelrix requests to execute:\033[0m \033[93m{cmd}\033[0m")

        import threading as th
        if th.current_thread() == self.worker:
            print("\033[93m⚠️ Background task auto-approving execution.\033[0m")
        else:
            approval = input("\033[1;92mAllow execution? (y/n):\033[0m ").strip().lower()
            if approval != 'y':
                print("\033[91m❌ Execution blocked by operator.\033[0m")
                return f"{response}\n\n[Action Blocked by Logical Firewall: Operator denied execution]"

        print(f"\n\033[96m⚙️  Vaelrix Action Layer: Executing\033[0m \033[93m'{cmd}'\033[0m\033[96m...\033[0m")

        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
            output = result.stdout + result.stderr

            if result.returncode != 0:
                print("\033[91m⚠️  Execution failed. Initiating self-correction loop...\033[0m")
                print(f"\033[2m{output.strip()}\033[0m")
                correction_prompt = (
                    f"I attempted to run your command: `{cmd}`\n"
                    f"It failed with this error:\n{output}\n"
                    f"Please provide the fix using your strict Verdict -> Fracture -> Fix format."
                )
                correction_response = self.brain.model.generate(
                    correction_prompt,
                    system=self.brain.system_prompt
                )
                final_fix = self.parse_and_run(correction_response)
                return f"{response}\n\n--- AUTO-CORRECTION TRIGGERED ---\n{final_fix}"

            print(f"\n\033[2m{output.strip()}\033[0m")
            return f"{response}\n\n--- EXECUTION RESULT ---\n{output.strip()}"

        except Exception as e:
            print(f"\033[91m⚠️ Action Error: {e}\033[0m")
            return f"{response}\n\n[Action Error: {str(e)}]"

    def submit_background_task(self, query: str) -> str:
        task_id = f"task_{int(time.time())}"
        self.task_queue.put((task_id, query))
        self.running_tasks[task_id] = "Queued"
        return f"Task {task_id} queued for background execution."

    def _task_worker(self):
        while True:
            task_id, query = self.task_queue.get()
            self.running_tasks[task_id] = "Running"
            try:
                print(f"\n⏳ [Background Task {task_id} started: {query}]")
                res = self.brain.ask_direct(query)
                res = self.parse_and_run(res)
                self.running_tasks[task_id] = "Completed"
                print(f"\n✅ [Background Task {task_id} completed.]")

                with open(f"{task_id}.log", "w") as f:
                    f.write(f"QUERY: {query}\n\nRESULT:\n{res}")
            except Exception as e:
                self.running_tasks[task_id] = f"Failed: {e}"
                print(f"\n❌ [Background Task {task_id} failed: {e}]")
            finally:
                self.task_queue.task_done()
