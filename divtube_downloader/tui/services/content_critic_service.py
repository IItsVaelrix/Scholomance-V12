import json
import os
import threading
import urllib.request
import urllib.error

from tui.services.memory_service import MemoryService
from tui.services.tool_service import ToolService

class ContentCriticService:
    def __init__(self):
        self.active_model = "grok-build-0.1"
        self.memory = MemoryService()
        self.tools = ToolService()
    def _get_api_config(self):
        api_key = os.environ.get("CUSTOM_API_KEY")
        base_url = os.environ.get("CUSTOM_API_BASE", "https://opencode.ai/zen/v1")
        models_url = os.environ.get("CUSTOM_MODELS_URL", "https://opencode.ai/zen/v1")
        
        if os.path.exists(".env"):
            with open(".env", "r") as f:
                for line in f:
                    if line.startswith("CUSTOM_API_KEY="):
                        api_key = line.split("=", 1)[1].strip()
                    elif line.startswith("CUSTOM_API_BASE="):
                        base_url = line.split("=", 1)[1].strip()
                    elif line.startswith("CUSTOM_MODELS_URL="):
                        models_url = line.split("=", 1)[1].strip()
        
        if not api_key:
            api_key = os.environ.get("OPENCODE_API_KEY")
            if not api_key and os.path.exists(".env"):
                with open(".env", "r") as f:
                    for line in f:
                        if line.startswith("OPENCODE_API_KEY="):
                            api_key = line.split("=", 1)[1].strip()
        return api_key, base_url, models_url

    def get_models(self, callback, on_fetched=None):
        def run():
            api_key, base_url, models_url = self._get_api_config()
            
            if not api_key:
                callback("[red]Error: No API Key found. Run '/provider' to set it up.[/]")
                return

            callback(f"[#6B7280]Fetching available models from {models_url}...[/]")
            url = f"{models_url}/models" if not models_url.endswith("/models") else models_url
            req = urllib.request.Request(url, method="GET")
            req.add_header("Authorization", f"Bearer {api_key}")
            req.add_header("User-Agent", "curl/8.5.0")
            
            try:
                with urllib.request.urlopen(req) as response:
                    res_body = response.read()
                    res_json = json.loads(res_body)
                    
                    if "data" in res_json:
                        models = []
                        for m in res_json["data"]:
                            m_id = m.get("id", "unknown")
                            models.append(m_id)

                        if on_fetched:
                            on_fetched(models, []) # treat all as available
                        else:
                            callback(f"\n[bold magenta]❖ API MODELS ❖[/]\nAvailable: {len(models)}\n")
                    else:
                        callback("[red]Error: Invalid response format from models endpoint.[/]")
            except urllib.error.HTTPError as e:
                err_msg = e.read().decode('utf-8').replace('[', '\\[')
                callback(f"[red]API Error ({e.code}):[/] {err_msg}")
            except Exception as e:
                err_str = str(e).replace('[', '\\[')
                callback(f"[red]Request Error:[/] {err_str}")

        threading.Thread(target=run).start()

    def critique(self, file_path, model_name, callback, skill_name="youtube_feedback.md"):
        def run():
            if not os.path.exists(file_path):
                callback(f"[red]Error: File '{file_path}' not found.[/]", success=False, is_final=True)
                return
            
            try:
                with open(file_path, 'r') as f:
                    content_json = f.read()
                    if file_path.endswith(".json"):
                        json.loads(content_json)
            except Exception as e:
                callback(f"[red]Error reading file:[/] {e}", success=False, is_final=True)
                return

            api_key, base_url, models_url = self._get_api_config()
            
            if not api_key:
                callback("[red]Error: No API Key found. Run '/provider' to set it up.[/]", success=False, is_final=True)
                return

            callback(f"[#6B7280]Analyzing '{file_path}' via {base_url}...[/]", success=True, is_final=False)

            # Determine where to find the prompt
            if skill_name == "mirrorborne-scholomance":
                prompt_path = "/home/deck/Downloads/Scholomance-V12-main/.agents/skills/mirrorborne-scholomance/SKILL.md"
                base_prompt = "You are the Mirrorborne Scholomance. Analyze this text with maximum depth."
            else:
                prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "skills", skill_name)
                base_prompt = "You are an elite YouTube Content Strategist."
                
            if os.path.exists(prompt_path):
                with open(prompt_path, "r", encoding="utf-8") as pf:
                    base_prompt = pf.read()

            memory_context = self.memory.get_recent_critiques(limit=2)
            system_prompt = base_prompt + f"\n\n{memory_context}\n\nCRITIQUE INSTRUCTIONS:\nCritique the provided video JSON against the above framework and output your analysis following the exact 'Report Template' format. Use tools if necessary."

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Critique this video JSON:\n\n{content_json}"}
            ]

            def do_api_call(msgs, use_tools=True):
                payload = {
                    "model": model_name,
                    "messages": msgs
                }
                if use_tools and hasattr(self, "tools") and self.tools.tools:
                    payload["tools"] = self.tools.tools
                    
                url = f"{base_url}/chat/completions" if not base_url.endswith("/chat/completions") else base_url
                req = urllib.request.Request(url, method="POST")
                req.add_header("Authorization", f"Bearer {api_key}")
                req.add_header("Content-Type", "application/json")
                req.add_header("User-Agent", "curl/8.5.0")
                
                data = json.dumps(payload).encode('utf-8')
                with urllib.request.urlopen(req, data=data) as response:
                    return json.loads(response.read())

            try:
                MAX_TURNS = 3
                use_tools = True
                for turn in range(MAX_TURNS):
                    try:
                        res_json = do_api_call(messages, use_tools)
                    except urllib.error.HTTPError as e:
                        err_msg = e.read().decode('utf-8')
                        if use_tools and (e.code == 400 or "support" in err_msg.lower() or "tool" in err_msg.lower()):
                            # Fallback without tools if the model doesn't support them
                            use_tools = False
                            res_json = do_api_call(messages, use_tools)
                        else:
                            raise Exception(f"API Error ({e.code}): {err_msg}")
                    
                    if "choices" in res_json and len(res_json["choices"]) > 0:
                        choice = res_json["choices"][0]
                        message = choice["message"]
                        
                        if message.get("tool_calls"):
                            # Agent wants to use a tool
                            messages.append(message)
                            for tool_call in message["tool_calls"]:
                                func_name = tool_call["function"]["name"]
                                func_args = json.loads(tool_call["function"]["arguments"])
                                
                                def log_tool(msg):
                                    callback(msg, success=True, is_final=False)
                                
                                tool_result = self.tools.execute_tool(func_name, func_args, log_tool)
                                
                                messages.append({
                                    "role": "tool",
                                    "tool_call_id": tool_call["id"],
                                    "name": func_name,
                                    "content": tool_result
                                })
                            continue # Call API again with tool results
                        else:
                            # Final text response
                            criticism = message.get("content", "")
                            
                            # Save to memory so the AI remembers it next time
                            self.memory.save_critique(file_path, content_json, criticism)
                            
                            # Automatically save the report as a markdown file for external viewing
                            reports_dir = os.path.join(os.getcwd(), "reports")
                            os.makedirs(reports_dir, exist_ok=True)
                            
                            base_name = os.path.basename(file_path)
                            name_without_ext = os.path.splitext(base_name)[0]
                            report_filename = os.path.join(reports_dir, f"{name_without_ext}_critique.md")
                            
                            try:
                                with open(report_filename, "w", encoding="utf-8") as rf:
                                    rf.write(criticism)
                                saved_msg = f"Saved critique to {report_filename} and local SQLite memory"
                            except Exception as e:
                                saved_msg = f"Saved to local SQLite memory (Failed to write markdown file: {e})"
                            
                            formatted = criticism.replace("[", "\\[")
                            callback(f"\n[bold magenta]❖ OPENCODE CONTENT CRITIC ❖[/]\n\n{formatted}\n", success=True, is_final=True)
                            
                            # Update inspector or UI silently
                            callback(f"[dim green]✔ {saved_msg} ({self.memory.count()} total records)[/]", success=True, is_final=False)
                            return
                    else:
                        callback("[red]Error: Invalid response format from OpenCode.[/]", success=False, is_final=True)
                        return
                
                callback("[red]Error: Exceeded maximum tool iterations (3 turns).[/]", success=False, is_final=True)
            except urllib.error.HTTPError as e:
                err_msg = e.read().decode('utf-8').replace('[', '\\[')
                callback(f"[red]API Error ({e.code}):[/] {err_msg}", success=False, is_final=True)
            except Exception as e:
                err_str = str(e).replace('[', '\\[')
                callback(f"[red]Request Error:[/] {err_str}", success=False, is_final=True)

        threading.Thread(target=run).start()
