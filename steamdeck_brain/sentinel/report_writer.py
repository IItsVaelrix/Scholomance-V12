from typing import Dict, Any

def format_report(report: Dict[str, Any]) -> str:
    """
    Format the SentinelReport dictionary into the text output style
    described in the PDR.
    """
    lines = []
    lines.append("❖ VAELRIX SENTINEL ❖")
    lines.append("")
    
    status = report.get("status", "unknown").capitalize()
    lines.append(f"Verdict: {status}")
    
    risk_score = report.get("riskScore", 0)
    lines.append(f"Risk Score: {risk_score} / 100")
    
    findings = report.get("findings", [])
    if not findings:
        lines.append("No fractures detected.")
    else:
        for finding in findings:
            invariant = finding.get("invariant", "System Health")
            lines.append(f"Protected Invariant: {invariant}")
            lines.append("")
            lines.append("Fracture:")
            desc = finding.get("description", "Unknown violation.")
            file_ref = finding.get("file")
            if file_ref:
                desc = f"{file_ref}: {desc}"
            lines.append(desc)
            lines.append("")
            lines.append("Risk Reduced By Fix:")
            lines.append("Prevents future failure or system rot.")
            lines.append("")
            lines.append("Next Move:")
            lines.append(finding.get("recommendation", "Review and fix."))
            lines.append("-" * 40)
            
    return "\n".join(lines)
