from typing import List, Dict, Any

def calculate_risk_score(findings: List[Dict[str, Any]]) -> int:
    """
    Deterministic risk heuristic for Phase 1.
    """
    score = 0
    for finding in findings:
        severity = finding.get("severity", "info")
        if severity == "critical":
            score += 40
        elif severity == "error":
            score += 25
        elif severity == "warning":
            score += 10
        elif severity == "info":
            score += 1

    # Cap score at 100
    if score > 100:
        score = 100
    return score

def determine_status(score: int) -> str:
    if score >= 76:
        return "fail"
    elif score >= 26:
        return "warn"
    return "pass"
