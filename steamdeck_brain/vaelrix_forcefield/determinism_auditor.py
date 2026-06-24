"""
Vaelrix Cortex ForceField — Determinism Auditor.

Verifies that a ForceField execution remains reproducible and stable. When
non-deterministic tools, unstable ordering, or missing seeds are detected,
the auditor emits structured findings and PixelBrain error bytecodes so the
Council Arbiter and ActionEngine can act on them.
"""

from __future__ import annotations

from .pixelbrain import emit_error
from .scdna import emit_health_signal
from .types import AmplifierResult, ResonanceScore, VaelrixCortexForceField


# Tools that are inherently non-deterministic or environment-dependent.
_NON_DETERMINISTIC_TOOLS = {
    "run_command",
    "execute",
    "shell",
    "exec",
    "run_tests",  # Test output ordering/timing can vary; flagged unless seed fixed
}


def _is_non_deterministic_tool(tool: str, banned: set[str]) -> bool:
    return tool in _NON_DETERMINISTIC_TOOLS or tool in banned


def audit_determinism(
    field: VaelrixCortexForceField,
    results: list[AmplifierResult],
) -> AmplifierResult:
    """
    Audit a ForceField execution for determinism violations.

    Returns an AmplifierResult from DETERMINISM_BRAIN containing findings,
    recommended action, and PB-ERR-v1 bytecodes for any violation.
    """

    def _tiered_signal(tier: str, code: str, context: dict) -> str:
        return emit_health_signal(
            severity="yellow" if tier.startswith("Y") else "red",
            component="DETERMINISM_AUDITOR",
            stable_id=code,
            tier=tier,
            **context,
        )

    findings: list[str] = []
    bytecodes: list[str] = []
    tiered_signals: list[str] = []

    det = field.determinism
    deterministic = det.deterministicMode
    banned = set(det.bannedNonDeterministicTools)

    if not deterministic:
        findings.append("Deterministic mode is disabled; variance is acceptable.")
        return AmplifierResult(
            brainId="DETERMINISM_BRAIN",
            summary="Determinism audit skipped because deterministicMode is disabled.",
            findings=findings,
            recommendedAction="No action needed.",
            resonance=ResonanceScore(
                intentMatch=1.0,
                evidenceStrength=1.0,
                novelty=0.3,
                actionability=0.5,
                conflictRisk=0.0,
            ),
        )

    if det.seed is None:
        findings.append(
            "Deterministic mode is enabled but no stable seed is set; "
            "results may vary across runs."
        )
        bytecodes.append(
            emit_error(
                category="DETERMINISM",
                severity="WARN",
                module="FORCEFIELD",
                code="0701",
                context={"field": "determinism.seed", "value": None},
            )
        )
        tiered_signals.append(
            _tiered_signal("Y1", "0701", {"field": "determinism.seed", "value": "null"})
        )

    if deterministic and not det.stableOrdering:
        findings.append(
            "Stable ordering is disabled while deterministic mode is on; "
            "brain output order may shift between runs."
        )
        bytecodes.append(
            emit_error(
                category="DETERMINISM",
                severity="WARN",
                module="FORCEFIELD",
                code="0702",
                context={"field": "determinism.stableOrdering", "value": False},
            )
        )
        tiered_signals.append(
            _tiered_signal(
                "Y1", "0702", {"field": "determinism.stableOrdering", "value": "false"}
            )
        )

    # Check active brains for banned tools in their allowedTools list.
    from .amplifier_registry import get_brain_by_id

    for result in results:
        brain = get_brain_by_id(result.brainId)
        if brain is None:
            continue
        bad_tools = [
            tool
            for tool in brain.allowedTools
            if _is_non_deterministic_tool(tool, banned)
        ]
        if bad_tools:
            findings.append(
                f"{brain.id} allows non-deterministic tools: {', '.join(bad_tools)}"
            )
            for tool in bad_tools:
                severity = "WARN" if not deterministic else "CRIT"
                bytecodes.append(
                    emit_error(
                        category="DETERMINISM",
                        severity=severity,
                        module=brain.id,
                        code="0703",
                        context={
                            "tool": tool,
                            "deterministicMode": deterministic,
                            "source": "allowedTools",
                        },
                    )
                )
                tiered_signals.append(
                    _tiered_signal(
                        "R2" if deterministic else "Y1",
                        "0703",
                        {
                            "tool": tool,
                            "source": "allowedTools",
                            "brain": brain.id,
                        },
                    )
                )

    # Check requested tool calls emitted by brains.
    for result in results:
        for request in getattr(result, "requestedToolCalls", []) or []:
            if _is_non_deterministic_tool(request.tool, banned):
                findings.append(
                    f"{result.brainId} requested non-deterministic tool "
                    f"'{request.tool}' for reason: {request.reason}"
                )
                severity = "WARN" if not deterministic else "CRIT"
                bytecodes.append(
                    emit_error(
                        category="DETERMINISM",
                        severity=severity,
                        module=result.brainId,
                        code="0704",
                        context={
                            "tool": request.tool,
                            "reason": request.reason,
                            "args": request.args,
                            "deterministicMode": deterministic,
                        },
                    )
                )
                tiered_signals.append(
                    _tiered_signal(
                        "R2" if deterministic else "Y1",
                        "0704",
                        {
                            "tool": request.tool,
                            "brain": result.brainId,
                        },
                    )
                )


    # Check that results are returned in activeBrains order.
    active = field.routing.activeBrains
    observed_order = [r.brainId for r in results]
    expected_order = [b for b in active if b in observed_order]
    if observed_order != expected_order:
        findings.append(
            f"Brain output order is unstable: observed {observed_order}, "
            f"expected {expected_order}"
        )
        bytecodes.append(
            emit_error(
                category="DETERMINISM",
                severity="CRIT",
                module="FORCEFIELD",
                code="0705",
                context={
                    "observedOrder": observed_order,
                    "expectedOrder": expected_order,
                },
            )
        )

    if not findings:
        findings.append("ForceField execution is deterministic and stable.")

    return AmplifierResult(
        brainId="DETERMINISM_BRAIN",
        summary=(
            "Determinism audit passed."
            if not bytecodes
            else f"Determinism audit found {len(bytecodes)} issue(s)."
        ),
        findings=findings,
        bytecodes=bytecodes,
        tieredSignals=tiered_signals,
        recommendedAction=(
            "No action needed."
            if not bytecodes
            else "Review flagged tools or disable deterministic mode if variance is acceptable."
        ),
        resonance=ResonanceScore(
            intentMatch=1.0,
            evidenceStrength=1.0,
            novelty=0.7,
            actionability=0.9 if bytecodes else 0.5,
            conflictRisk=0.8 if bytecodes else 0.0,
        ),
    )
