import os
import sys
import subprocess
import argparse
import datetime
import uuid
from typing import Dict, Any, List

# If run directly as a script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sentinel.sentinel_store import SentinelStore
from sentinel.risk_model import calculate_risk_score, determine_status
from sentinel.report_writer import format_report

def run_basic_scan() -> Dict[str, Any]:
    findings = []
    
    # 1. Compileall check
    try:
        res = subprocess.run(
            ["python3", "-m", "compileall", "-q", "steamdeck_brain"],
            capture_output=True, text=True, timeout=10
        )
        if res.returncode != 0:
            findings.append({
                "severity": "error",
                "invariant": "Python Syntax",
                "description": f"Syntax errors detected: {res.stderr.strip()}",
                "recommendation": "Fix syntax errors in Python files.",
                "evidence": res.stderr.strip()
            })
    except Exception as e:
        findings.append({
            "severity": "warning",
            "invariant": "Python Syntax",
            "description": f"Failed to run compileall: {str(e)}",
            "recommendation": "Check Python environment."
        })

    # 2. SQLite Integrity
    db_path = os.path.expanduser("~/.substrate/memory.sqlite")
    if os.path.exists(db_path):
        try:
            res = subprocess.run(
                ["sqlite3", db_path, "PRAGMA integrity_check;"],
                capture_output=True, text=True, timeout=5
            )
            if "ok" not in res.stdout.strip().lower() and res.returncode == 0:
                findings.append({
                    "severity": "critical",
                    "invariant": "SQLite Integrity",
                    "description": f"Database corruption detected: {res.stdout.strip()}",
                    "recommendation": "Restore database from backup.",
                    "evidence": res.stdout.strip()
                })
        except Exception as e:
            findings.append({
                "severity": "warning",
                "invariant": "SQLite Integrity",
                "description": f"Failed to check SQLite: {str(e)}",
                "recommendation": "Ensure sqlite3 is installed."
            })

    # 3. Schema Audit
    try:
        from sentinel.schema_auditor import audit_schema
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        contract_path = os.path.join(os.path.dirname(project_root), "docs", "scholomance-encyclopedia", "Scholomance LAW", "SCHEMA_CONTRACT.md")
        schema_findings = audit_schema(project_root, contract_path)
        findings.extend(schema_findings)
    except Exception as e:
        findings.append({
            "severity": "warning",
            "invariant": "Schema Is Sovereign",
            "description": f"Failed to run schema audit: {str(e)}",
            "recommendation": "Check schema_auditor module."
        })

    # Calculate risk score
    risk_score = calculate_risk_score(findings)
    status = determine_status(risk_score)
    
    report = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "scope": "full",
        "status": status,
        "riskScore": risk_score,
        "findings": findings
    }
    return report

def cmd_scan(args):
    print("Running Sentinel Scan...")
    report = run_basic_scan()
    store = SentinelStore()
    store.save_report(report)
    print(format_report(report))

def cmd_status(args):
    store = SentinelStore()
    report = store.get_latest_report()
    if report:
        print("Sentinel is ONLINE.")
        print(f"Latest Scan Status: {report.get('status', 'unknown').upper()}")
        print(f"Risk Score: {report.get('riskScore', 0)}")
    else:
        print("Sentinel is ONLINE, but no scans have been run.")

def cmd_audit_law(args):
    from sentinel.law_auditor import audit_law
    text = args.text
    has_evidence = args.has_evidence
    findings = audit_law(text, has_evidence)
    if findings:
        print("Verdict: Fail")
        for f in findings:
            print(f"Violation: {f['invariant']}")
            print(f"Reason: {f['description']}")
    else:
        print("Verdict: Pass")

def cmd_audit_evidence(args):
    from sentinel.evidence_auditor import audit_evidence
    text = args.text
    has_test_output = args.has_test_output
    findings = audit_evidence(text, has_test_output)
    if findings:
        print("Verdict: Fail")
        for f in findings:
            print(f"Violation: {f['invariant']}")
            print(f"Reason: {f['description']}")
    else:
        print("Verdict: Pass")

def cmd_audit_schema(args):
    from sentinel.schema_auditor import audit_schema
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    contract_path = os.path.join(os.path.dirname(project_root), "docs", "scholomance-encyclopedia", "Scholomance LAW", "SCHEMA_CONTRACT.md")
    findings = audit_schema(project_root, contract_path)
    if findings:
        print("Verdict: Warn or fail")
        for f in findings:
            print(f"Violation: {f['invariant']}")
            print(f"Next Move: request schema addition")
            print(f"Details: {f['description']}")
    else:
        print("Verdict: Pass")

def main():
    parser = argparse.ArgumentParser(description="Vaelrix Integrity Sentinel CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    p_scan = subparsers.add_parser("scan", help="Run a full sentinel scan")
    p_scan.add_argument("--changed", action="store_true", help="Scan only changed files (stubbed for Phase 1)")
    
    p_status = subparsers.add_parser("status", help="Get sentinel status")
    
    p_audit_law = subparsers.add_parser("audit-law", help="Audit text against VAELRIX_LAW.md")
    p_audit_law.add_argument("--text", required=True, help="Text to audit")
    p_audit_law.add_argument("--has-evidence", action="store_true", help="Whether evidence is provided")
    
    p_audit_evidence = subparsers.add_parser("audit-evidence", help="Audit text for fake QA claims")
    p_audit_evidence.add_argument("--text", required=True, help="Text to audit")
    p_audit_evidence.add_argument("--has-test-output", action="store_true", help="Whether test output is provided")
    
    p_audit_schema = subparsers.add_parser("audit-schema", help="Audit codebase for parallel schemas")
    
    args = parser.parse_args()
    if args.command == "scan":
        cmd_scan(args)
    elif args.command == "status":
        cmd_status(args)
    elif args.command == "audit-law":
        cmd_audit_law(args)
    elif args.command == "audit-evidence":
        cmd_audit_evidence(args)
    elif args.command == "audit-schema":
        cmd_audit_schema(args)

if __name__ == "__main__":
    main()
