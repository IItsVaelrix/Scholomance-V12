class SafetyFilter:
    def __init__(self):
        # A simple profanity/toxicity filter placeholder
        self.blocked_words = {"badword1", "badword2", "toxic", "offensive"}

    def is_safe(self, text: str) -> bool:
        text_lower = text.lower()
        return not any(bw in text_lower for bw in self.blocked_words)
        
    def generate_fallback(self) -> str:
        return "I'm sorry, I cannot respond to that."

_global_filter = SafetyFilter()

def filter_unsafe(text: str) -> bool:
    """Returns True if the text is safe, False if it contains blocked content."""
    return _global_filter.is_safe(text)

def get_fallback_response() -> str:
    return _global_filter.generate_fallback()

def hallucination_guard(query: str, response: str) -> str:
    """
    Prevents the bot from pretending to know facts. 
    A basic rule-based guardrail for a lightweight MVP.
    """
    fact_triggers = ["what is", "who is", "when did", "where is"]
    if any(trigger in query.lower() for trigger in fact_triggers):
        # DialoGPT doesn't know facts accurately, so we inject a disclaimer
        return "I am an AI and don't have access to a real-time factual database, but " + response
    return response
