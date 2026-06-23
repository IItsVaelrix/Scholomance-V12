from typing import List, Dict

class PromptBuilder:
    @staticmethod
    def build(user_input: str, memories: List[Dict], task: str = "Respond as a literary genius") -> str:
        prompt = "SYSTEM STYLE:
You are a literary collaborator. Be specific, vivid, technically useful, and voice-preserving.

"
        
        if memories:
            prompt += "RELEVANT MEMORY:
"
            for m in memories:
                prompt += f"- {m['summary']}
"
            prompt += "
"
            
        prompt += f"USER TEXT:
{user_input}

"
        prompt += f"TASK:
{task}

ASSISTANT:
"
        
        return prompt