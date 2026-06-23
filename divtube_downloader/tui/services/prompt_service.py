import json
import os
import threading
import urllib.request
import urllib.error

from tui.services.env_config import get_config, get_model
from tui.services.tool_service import ToolService
from tui.utils.throttle import llm_throttle


GOLD    = "#FFD700"
PURPLE  = "#B388FF"
SUCCESS = "#7CFF8B"
ERROR   = "#FF5C7A"
MUTED   = "#6B7280"


class PromptService:
    def __init__(self):
        self.active_model = get_model() or "big-pickle"
        self.history = {}
        self.max_history = 20
        self.tools = ToolService()

    def _mem_read(self, key):
        raw = self.tools.execute_tool("memory_get", {"key": key}, lambda m: None)
        if not raw or raw == "null":
            return None
        if isinstance(raw, str):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict) and "value" in parsed:
                    return parsed["value"]
                return parsed
            except (json.JSONDecodeError, TypeError):
                pass
        return raw

    def _build_law_context(self):
        index = self._mem_read("law:index")
        if not index or not isinstance(index, dict):
            return ""
        files = index.get("files", [])
        lines = []
        for entry in files:
            key = entry.get("key", "")
            desc = entry.get("desc", "")
            if not key:
                continue
            data = self._mem_read(key)
            if not data or not isinstance(data, dict):
                lines.append(f"  - {entry.get('name','?')}: {desc} (not loaded)")
                continue
            data.get("content", "")
            lines.append(f"  - {entry.get('name','?')} [{key}]: {desc}")
            bsc = data.get("bytecode_search_code", "")
            if bsc:
                lines.append(f"    Bytecode: {bsc}")
        return (
            "\n--- Scholomance LAW Context (loaded from persistent memory) ---\n"
            + "\n".join(lines)
            + "\n--------------------------------------------------------------\n"
        )

    def _build_system_prompt(self, hint):
        if hint:
            return hint
        law_ctx = self._build_law_context()
        base = (
            "You are an AI coding assistant integrated into the DivTube Cockpit. "
            "You have direct access to the Scholomance codebase through tools. "
            "When asked about code, architecture, bugs, or implementation details, "
            "use the available tools to read files, search the codebase, and run commands. "
            "Always explore the actual code rather than guessing. "
            "You have FULL read/write privileges. You can edit files via `replace_file_content` "
            "and execute arbitrary shell commands via `run_command` (including git, npm, vitest, and bash pipes). "
            "Do not act as a helpless analyst—if something is broken, fix it. "
            "Answer concisely and accurately. Cite file paths and line numbers when relevant."
        )
        if law_ctx:
            return base + "\n\n" + law_ctx
        return base

    def _call_api(self, messages, model_name, base_url, api_key, use_tools=True):
        payload = {
            "model": model_name,
            "messages": messages
        }
        if use_tools and self.tools.tools:
            payload["tools"] = self.tools.tools

        url = f"{base_url}/chat/completions"
        if not url.endswith("/chat/completions"):
            url = f"{url.rstrip('/')}/chat/completions"

        req = urllib.request.Request(url, method="POST")
        req.add_header("Authorization", f"Bearer {api_key}")
        req.add_header("Content-Type", "application/json")
        req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        req.add_header("HTTP-Referer", "https://github.com/DivTube")
        req.add_header("X-Title", "DivTube Cockpit")

        data = json.dumps(payload).encode("utf-8")
        with urllib.request.urlopen(req, data=data) as response:
            return json.loads(response.read())

    def prompt(self, text, callback, system_hint=None, model=None, state_callback=None, controller=None, agent_id="divtube"):
        def set_state(s):
            if state_callback:
                state_callback(s)

        def run():
            token = controller.begin_agent() if controller else None
            try:
                if agent_id == "vaelrix":
                    import sys, os
                    brain_dir = "/home/deck/Downloads/Scholomance-V12-main/steamdeck_brain"
                    parent = os.path.dirname(brain_dir)
                    if parent not in sys.path:
                        sys.path.insert(0, parent)

                    # Step 1: reuse cached daemon client if we have one
                    if hasattr(self, "_vaelrix_brain") and self._vaelrix_brain is not None:
                        client = self._vaelrix_brain
                        try:
                            response = client.ask(text)
                            if response and not response.startswith("[Error"):
                                set_state("responding")
                                callback(f"\n[bold {GOLD}]❖ VAELRIX RESPONSE ❖[/] [{MUTED}](daemon)[/]\n")
                                if hasattr(callback, "__self__") and hasattr(callback.__self__, "typewriter_log_msg"):
                                    callback.__self__.typewriter_log_msg(response)
                                else:
                                    from rich.markdown import Markdown
                                    callback(Markdown(response))
                                set_state("idle")
                                return
                        except Exception:
                            # Daemon died; invalidate cache and try fresh boot
                            self._vaelrix_brain = None

                    # Step 2: try connecting to daemon for the first time
                    try:
                        from steamdeck_brain.brain_bridge_client import BrainBridgeClient
                        client = BrainBridgeClient(port=9090)
                        if client.is_available():
                            response = client.ask(text)
                            if response and not response.startswith("[Error"):
                                # Cache the live client for subsequent calls
                                self._vaelrix_brain = client
                                set_state("responding")
                                callback(f"\n[bold {GOLD}]❖ VAELRIX RESPONSE ❖[/] [{MUTED}](daemon)[/]\n")
                                if hasattr(callback, "__self__") and hasattr(callback.__self__, "typewriter_log_msg"):
                                    callback.__self__.typewriter_log_msg(response)
                                else:
                                    from rich.markdown import Markdown
                                    callback(Markdown(response))
                                set_state("idle")
                                return
                    except Exception:
                        pass

                    # Step 3: cold-boot fallback (daemon unavailable)
                    from steamdeck_brain.steamdeck_brain import BrainBridge
                    callback(f"\n[{MUTED}]Booting Vaelrix Cortex (daemon unavailable — cold boot)...[/]")
                    bridge = BrainBridge(personality="Vaelrix")
                    set_state("thinking")
                    response = bridge.ask(text)
                    set_state("responding")
                    if response:
                        if agent_id not in self.history:
                            self.history[agent_id] = []
                        self.history[agent_id].append({"role": "user", "content": text})
                        self.history[agent_id].append({"role": "assistant", "content": response})
                        if len(self.history[agent_id]) > self.max_history * 2:
                            self.history[agent_id] = self.history[agent_id][-(self.max_history * 2):]

                        callback(f"\n[bold {GOLD}]❖ VAELRIX RESPONSE ❖[/] [{MUTED}](SteamDeck Brain)[/]\n")
                        if hasattr(callback, "__self__") and hasattr(callback.__self__, "typewriter_log_msg"):
                            callback.__self__.typewriter_log_msg(response)
                        else:
                            from rich.markdown import Markdown
                            callback(Markdown(response))
                            callback("\n")
                    else:
                        callback("(empty response)\n")
                    set_state("idle")
                    return

                api_key, base_url, _ = get_config()

                if not api_key:
                    callback(f"[{ERROR}]No API Key found. Set one via /provider and /apikey.[/]")
                    return

                model_name = model or self.active_model
                system_prompt = self._build_system_prompt(system_hint)

                if agent_id not in self.history:
                    self.history[agent_id] = []

                messages = [
                    {"role": "system", "content": system_prompt},
                    *self.history[agent_id][-(self.max_history * 2):],
                    {"role": "user", "content": text}
                ]

                MAX_TURNS = 50
                use_tools = True

                # We are already in the try block
                for turn in range(MAX_TURNS):
                    if controller and controller.agent_cancelled(token):
                        callback("[#FF5C7A]Agent execution cancelled by user.[/]")
                        set_state("idle")
                        return
                    set_state("thinking")
                    llm_throttle.wait()
                    try:
                        res_json = self._call_api(messages, model_name, base_url, api_key, use_tools)
                    except urllib.error.HTTPError as e:
                        err_body = e.read().decode("utf-8", errors="replace")
                        if use_tools and (e.code in (400, 501) or "support" in err_body.lower() or "tool" in err_body.lower() or "not implemented" in err_body.lower()):
                            callback(f"[dim]{MUTED}]API returned {e.code} with tools — retrying without tool calling. Error: {err_body[:300]}[/]")
                            use_tools = False
                            llm_throttle.wait()
                            try:
                                res_json = self._call_api(messages, model_name, base_url, api_key, use_tools)
                            except urllib.error.HTTPError as e2:
                                err_body2 = e2.read().decode("utf-8", errors="replace")
                                if e2.code == 503:
                                    callback(f"[{ERROR}]API Error (503): Service Unavailable.[/]\n[italic]The AI provider is currently overloaded or down.[/]\n\n[red]Details:[/] {err_body2}")
                                else:
                                    callback(f"[{ERROR}]API Error ({e2.code}): {err_body2}[/]")
                                set_state("idle")
                                return
                        elif e.code == 429:
                            callback(f"[{ERROR}]API Error (429): Too Many Requests.[/]\n[italic]This means you have hit a rate limit or are out of credits with the provider.\nWait a moment, or ensure your account is funded.[/]")
                            set_state("idle")
                            return
                        elif e.code == 503:
                            callback(f"[{ERROR}]API Error (503): Service Unavailable.[/]\n[italic]The AI provider is currently overloaded or down. Please try again later, or switch to a different provider using the /provider command.[/]")
                            set_state("idle")
                            return
                        else:
                            raise

                    if "choices" not in res_json or not res_json["choices"]:
                        callback(f"[{ERROR}]Unexpected API response format.[/]")
                        set_state("idle")
                        return

                    choice = res_json["choices"][0]
                    message = choice["message"]

                    if message.get("tool_calls"):
                        set_state("looking")
                        messages.append(message)
                        for tc in message["tool_calls"]:
                            if controller and controller.agent_cancelled(token):
                                callback("[#FF5C7A]Agent execution cancelled by user.[/]")
                                set_state("idle")
                                return
                            func_name = tc["function"]["name"]
                            try:
                                func_args = json.loads(tc["function"]["arguments"])
                                tool_result = self.tools.execute_tool(func_name, func_args, callback)
                            except json.JSONDecodeError as e:
                                func_args = None
                                tool_result = f"Error: Invalid JSON arguments provided. {str(e)}"

                            def log_tool(msg):
                                callback(msg)

                            import rich.panel, rich.syntax
                            if func_args is not None:
                                args_str = json.dumps(func_args, indent=2)
                                syntax = rich.syntax.Syntax(args_str, "json", theme="monokai", word_wrap=True)
                                panel = rich.panel.Panel(syntax, title=f"[bold #FFD700]⚡ {func_name}[/]", border_style="#B48EAD", expand=False)
                                callback(panel)
                            else:
                                callback(f"  [bold #FFD700]⚡[/] [#B48EAD]{func_name}()[/] -> [red]ERROR[/]")

                            result_str = str(tool_result)[:32000]
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tc["id"],
                                "name": func_name,
                                "content": result_str
                            })
                            
                            if hasattr(callback, "__self__") and hasattr(callback.__self__, "show_code"):
                                try:
                                    # Try formatting as JSON if it's a dict or parsable JSON string
                                    if isinstance(tool_result, dict) or isinstance(tool_result, list):
                                        disp_str = json.dumps(tool_result, indent=2)
                                    else:
                                        disp_str = json.dumps(json.loads(tool_result), indent=2)
                                except Exception:
                                    disp_str = result_str
                                callback.__self__.show_code(disp_str, filename=f"{func_name}_output", language="json")

                            import time
                            time.sleep(1.0) # Prevent 429 rate limit death spirals
                            
                            if "⛔ GATE" in result_str:
                                # Count gate blocks to prevent infinite loops
                                self._gate_blocks = getattr(self, "_gate_blocks", 0) + 1
                                if self._gate_blocks >= 3:
                                    callback(f"[bold {ERROR}]Agent stopped due to repeated GateKeeper blocks.[/]")
                                    set_state("idle")
                                    self._gate_blocks = 0
                                    return
                            else:
                                self._gate_blocks = 0
                        continue

                    set_state("responding")
                    reply = message.get("content", "")
                    if reply:
                        self.history[agent_id].append({"role": "user", "content": text})
                        self.history[agent_id].append({"role": "assistant", "content": reply})
                        if len(self.history[agent_id]) > self.max_history * 2:
                            self.history[agent_id] = self.history[agent_id][-(self.max_history * 2):]

                    callback(f"\n[bold {GOLD}]❖ AI RESPONSE ❖[/] [{MUTED}]({model_name})[/]\n")
                    if reply:
                        if hasattr(callback.__self__, "typewriter_log_msg"):
                            callback.__self__.typewriter_log_msg(reply)
                        else:
                            from rich.markdown import Markdown
                            callback(Markdown(reply))
                            callback("\n")
                    else:
                        callback("(empty response)\n")
                    set_state("idle")
                    return

                callback(f"[{ERROR}]Exceeded maximum tool iterations ({MAX_TURNS} turns).[/]")
                set_state("idle")

            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8", errors="replace").replace("[", "\\[")
                callback(f"[{ERROR}]API Error ({e.code}):[/] {err_body}")
                set_state("idle")
            except Exception as e:
                err_str = str(e).replace("[", "\\[")
                callback(f"[{ERROR}]Request Error:[/] {err_str}")
                set_state("idle")
            finally:
                if controller:
                    controller.end_agent()

        threading.Thread(target=run).start()

    def set_model(self, model_name):
        self.active_model = model_name

    def clear_history(self, agent_id=None):
        if agent_id and agent_id in self.history:
            self.history[agent_id].clear()
        elif not agent_id:
            self.history.clear()

