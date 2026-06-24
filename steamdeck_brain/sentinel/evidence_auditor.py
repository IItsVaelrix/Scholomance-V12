from typing import Dict, Any, List

def audit_evidence(agent_text: str, has_test_output: bool) -> List[Dict[str, Any]]:
    """
    Audits agent output for fake QA or test claims.
    """
    findings = []
    
    qa_phrases = [
        "qa confirms",
        "tests passed",
        "benchmark passed"
    ]
    
    lower_text = agent_text.lower()
    
    for phrase in qa_phrases:
        if phrase in lower_text and not has_test_output:
            findings.append({
                "severity": "fail",
                "invariant": "No False Completion Law",
                "description": f"Agent made QA claim '{phrase}' without test output.",
                "recommendation": "Require test output when claiming a test or QA has passed."
            })
            
    return findings
