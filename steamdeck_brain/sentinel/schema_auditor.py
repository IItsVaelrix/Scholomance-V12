import os
import re
from typing import Dict, Any, List, Set

def parse_schema_contract(contract_path: str) -> Set[str]:
    """
    Parses the SCHEMA_CONTRACT.md to find all defined schema names.
    Returns a set of shape names (e.g., 'MemoryCellVectorPacket', 'metadata_filter', etc.)
    """
    shapes = set()
    if not os.path.exists(contract_path):
        return shapes
        
    with open(contract_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Extract TypeScript interfaces, types, and enums
    ts_matches = re.finditer(r'(?:interface|type|enum)\s+([A-Za-z0-9_]+)', content)
    for m in ts_matches:
        shapes.add(m.group(1))
        
    # Extract explicitly mentioned shapes like metadata_filter
    if "metadata_filter" in content:
        shapes.add("metadata_filter")
        
    return shapes

def audit_schema(project_root: str, contract_path: str) -> List[Dict[str, Any]]:
    """
    Scans Python files for class definitions and TypedDicts,
    and flags them if they appear to be schema payload shapes not defined in SCHEMA_CONTRACT.md.
    """
    findings = []
    
    allowed_shapes = parse_schema_contract(contract_path)
    # Some common Python classes that shouldn't be flagged
    ignored_classes = {"Cortex", "ActionEngine", "BrainBridge", "OllamaBridge", "DaemonHandler", "SentinelStore", "DummyArgs"}
    
    for root, dirs, files in os.walk(project_root):
        if "node_modules" in root or "__pycache__" in root or ".git" in root:
            continue
            
        for file in files:
            if not file.endswith(".py"):
                continue
                
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            # Find class definitions
            class_matches = re.finditer(r'class\s+([A-Za-z0-9_]+)', content)
            for m in class_matches:
                class_name = m.group(1)
                
                # Check if it looks like a payload shape (e.g., ends in Payload, Result, etc.)
                # or just any unrecognized class that is suspicious.
                # For phase 2, we will flag explicit mock schemas.
                if class_name not in allowed_shapes and class_name not in ignored_classes and not class_name.startswith("_"):
                    # We will only flag it if it's explicitly marked as a "Shape" or "Schema" 
                    # or if it's a test case designed to trigger this (e.g. UnregisteredShape).
                    if "Payload" in class_name or "Shape" in class_name or "Schema" in class_name or class_name == "metadata_filter":
                        findings.append({
                            "severity": "warn",
                            "invariant": "Schema Is Sovereign",
                            "file": file_path,
                            "description": f"Class '{class_name}' introduces a payload shape without a schema declaration.",
                            "recommendation": "Add this shape to SCHEMA_CONTRACT.md or request Codex schema update.",
                            "evidence": class_name
                        })
                        
    return findings
