from typing import List, Dict

class SessionMemory:
    def __init__(self, max_turns: int = 6):
        """
        max_turns ensures we only keep the last N turns of context to prevent context window overflow
        and memory bloat. A turn is 1 user message + 1 bot response.
        """
        self.max_turns = max_turns
        self.sessions: Dict[str, List[str]] = {}
        
    def add_message(self, session_id: str, message: str):
        if session_id not in self.sessions:
            self.sessions[session_id] = []
            
        self.sessions[session_id].append(message)
        
        # Enforce window size (max_turns * 2 because each turn is 2 messages: user + bot)
        max_messages = self.max_turns * 2
        if len(self.sessions[session_id]) > max_messages:
            self.sessions[session_id] = self.sessions[session_id][-max_messages:]
            
    def get_history(self, session_id: str) -> List[str]:
        return self.sessions.get(session_id, [])
        
    def clear_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]
