import re
from typing import Dict, Any, List

def audit_law(agent_text: str, has_evidence: bool) -> List[Dict[str, Any]]:
    """
    Audits agent output text against VAELRIX_LAW.md invariants.
    Specifically checks for canonical claims made without evidence.
    """
    findings = []
    
    # Dangerous phrases that require evidence
    dangerous_phrases = [
        "from canonical text",
        "retrieved from",
        "fix implemented",
        "as documented in",
        "according to the file",
        "the law states"
    ]
    
    lower_text = agent_text.lower()
    
    for phrase in dangerous_phrases:
        if phrase in lower_text and not has_evidence:
            findings.append({
                "severity": "fail",
                "invariant": "Evidence First Law",
                "description": f"Agent made canonical claim '{phrase}' without providing source or test evidence.",
                "recommendation": "Require the agent to include source path, retrieved excerpt, or test output."
            })
            
    return findings
