# FeedbackTraceIR Bytecode Schema

Every full feedback report must include this machine-readable block.

```json
{
  "feedback_trace_ir_version": "1.0.0",
  "agent": {
    "name": "Scholomance Feedback Skill",
    "mode": "Mode A-H",
    "request_type": "string"
  },
  "subject": {
    "title": "string",
    "category": "concept | code | ui_ux | architecture | lore | pdr | agent_instruction | qa | strategy | security | deployment",
    "scholomance_area": ["string"],
    "user_goal": "string"
  },
  "evidence": {
    "direct_evidence": ["string"],
    "repo_context": ["string"],
    "established_project_memory": ["string"],
    "inferences": ["string"],
    "hypotheses": ["string"],
    "unknowns": ["string"]
  },
  "assessment": {
    "what_works": ["string"],
    "what_needs_improvement": ["string"],
    "scholomance_fit": "string",
    "engineering_impact": "string",
    "experience_impact": "string",
    "architecture_impact": "string"
  },
  "fit_matrix": {
    "codex_compatibility": "number | unknown",
    "pixelbrain_compatibility": "number | unknown",
    "truesight_compatibility": "number | unknown",
    "verseir_compatibility": "number | unknown",
    "ui_ux_strength": "number | unknown",
    "maintainability": "number | unknown",
    "testability": "number | unknown",
    "lore_coherence": "number | unknown",
    "scalability": "number | unknown",
    "user_value": "number | unknown"
  },
  "risks": [
    {
      "risk": "string",
      "severity": "low | medium | high | critical",
      "likelihood": "low | medium | high",
      "mitigation": "string"
    }
  ],
  "recommendations": [
    {
      "priority": "P0 | P1 | P2 | P3",
      "recommendation": "string",
      "why": "string",
      "risk_reduced": "string",
      "implementation_hint": "string"
    }
  ],
  "qa_validation": {
    "required_checks": ["string"],
    "suggested_commands": ["string"],
    "manual_review_steps": ["string"],
    "not_run": ["string"]
  },
  "grade": {
    "letter": "A+ | A | B | C | D | F",
    "score": "number",
    "reason": "string",
    "upgrade_path": "string"
  }
}
```
