"""
Vaelrix Cortex ForceField — BrainBridge.

High-level integration surface that accepts a natural-language query,
runs the full ForceField pipeline (routing → amplifiers → arbiter),
wraps any brain-emitted PixelBrain error bytecodes through the
PixelBrain Router into BytecodeHealth signals, and returns a structured
answer.

The optional ``llm_client`` lets callers inject a mocked or real LLM for
final synthesis while keeping the rest of the pipeline deterministic.
"""

from __future__ import annotations

from typing import Any, Callable

from .amplifier_executor import run_amplifiers
from .amplifier_registry import get_registry
from .amplifier_router import apply_routing
from .brains import BRAIN_RUNNERS
from .council_arbiter import arbitrate_amplifier_results
from .determinism_auditor import audit_determinism
from .diagnostic_memory_submitter import submit_to_diagnostic_memory
from .forcefield import create_force_field
from .personality_weighting import apply_personality_weights, compute_personality_weights
from .persistence import load_force_field, save_force_field
from .pixelbrain.router import route_amplifier_results_to_health
from .scdna import apply_scdna_to_force_field
from .scdna.council_integration import scdna_matches_to_amplifier_results
from .scdna.pixelbrain_router import route_scdna_signals_to_health
from .tool_governor import record_tool_call, should_allow_tool_call
from .turboquant import TurboQuantClient, dispatch_chunks_to_brains
from .types import VaelrixCortexForceField


def _default_llm_client(prompt: str) -> str:
    """Deterministic fallback when no LLM is injected."""
    return f"[deterministic synthesis] {prompt[:200]}"


class BrainBridge:
    """
    End-to-end ForceField pipeline exposed through a single ``ask()`` call.

    Example:
        bridge = BrainBridge()
        result = bridge.ask("Fix the search governor bug")
        print(result["answer"])
        print(result["health_signals"])
    """

    def __init__(
        self,
        llm_client: Callable[[str], str] | None = None,
        registry: list[Any] | None = None,
        runners: dict[str, Callable[[VaelrixCortexForceField, str | None], Any]] | None = None,
        turboquant_client: TurboQuantClient | None = None,
    ):
        self.llm_client = llm_client or _default_llm_client
        self.registry = registry or get_registry()
        self.runners = runners or dict(BRAIN_RUNNERS)
        self.turboquant_client = turboquant_client

    def ask(
        self,
        query: str,
        *,
        classification: str = "diagnostic",
        priority: str = "safety",
        max_workers: int = 4,
        session_id: str | None = None,
        persist: bool = False,
) -> dict[str, Any]:
        """
        Run the full ForceField pipeline for ``query``.

        If ``session_id`` is provided, an existing persisted ForceField is
        loaded and resumed; otherwise a fresh one is created. When
        ``persist=True`` the final ForceField is saved to disk.

        Returns a dict with:
            - answer: synthesized response string
            - findings: list of accepted arbiter findings
            - next_action: recommended next action from the council
            - health_signals: list of BytecodeHealth bytecodes from brain outputs
            - gated_tool_calls: tool-call decisions from the Tool Governor
            - personality_weights: dict of brain-id -> computed weight
            - arbiter_output: raw CouncilArbiterOutput
            - raw_results: list of AmplifierResult objects
            - field: the final ForceField
            - session_id: the session identifier
            - persisted: whether the session was saved
            - scdna_genes: list of compact SCDNA gene strings applied
            - scdna_contradictions: list of contradiction records
            - scdna_health_signals: list of SCDNA health signal strings
            - diagnostic_memory_submission: auto-submission report (inserted/duplicates/failed)
        """

        if session_id is not None:
            try:
                field = load_force_field(session_id)
                # Update the task text so the new query drives this turn.
                field.task.rawUserRequest = query
                if field.task.normalizedGoal == field.task.rawUserRequest:
                    field.task.normalizedGoal = query
            except FileNotFoundError:
                field = create_force_field(
                    query,
                    task_id=session_id,
                    classification=classification,  # type: ignore[arg-type]
                    priority=priority,  # type: ignore[arg-type]
                )
        else:
            field = create_force_field(
                query,
                classification=classification,  # type: ignore[arg-type]
                priority=priority,  # type: ignore[arg-type]
            )
        # SCDNA: detect retrieval genes, resolve contradictions, degrade
        # offending genes, and apply the survivors to ForceField routing/context.
        field, decoded_genes, scdna_contradictions, scdna_signals, _ = apply_scdna_to_force_field(
            field, contradiction_index=field.tools.callsThisPhase
        )

        # Signal-based routing merges with SCDNA-derived routing so that genes
        # can activate brains that would otherwise be suppressed by signals.
        field = apply_routing(field, self.registry)

        # Convert SCDNA gene instructions into AmplifierResult findings so the
        # Council Arbiter can merge them with brain-derived findings.
        gene_results = scdna_matches_to_amplifier_results(decoded_genes)

        # Compute and store personality-aware brain weights.
        personality_weights = compute_personality_weights(field, self.registry)
        field = apply_personality_weights(field, personality_weights)

        # Dispatch TurboQuant chunks through per-brain lenses.
        if self.turboquant_client is not None:
            field = dispatch_chunks_to_brains(field, self.turboquant_client, query=query)

        results = run_amplifiers(field, query=query, max_workers=max_workers, runners=self.runners)

        # Merge SCDNA gene-derived findings with brain-derived results.
        results = [*gene_results, *results]

        # Run the determinism auditor over the execution state and brain outputs.
        determinism_audit = audit_determinism(field, results)
        results.append(determinism_audit)

        # Gate brain-requested tool calls through the Tool Governor.
        gated_tool_calls = self._gate_tool_calls(field, results)

        arbiter_output = arbitrate_amplifier_results(field, results, personality_weights=personality_weights)

        # Collect tiered signals from SCDNA, determinism auditor, and tool governor.
        all_tiered_signals: list[str] = list(scdna_signals)
        for result in results:
            all_tiered_signals.extend(getattr(result, "tieredSignals", []) or [])
        for call in gated_tool_calls:
            all_tiered_signals.extend(call.get("tieredSignals", []))

        # Wire brain outputs and all tiered signals through PixelBrain Router.
        health_signals = route_amplifier_results_to_health(results)
        health_signals.extend(route_scdna_signals_to_health(all_tiered_signals))

        # Automatic submission to diagnostic memory / immune system.
        diagnostic_memory_submission = submit_to_diagnostic_memory(
            health_signals=health_signals,
            scdna_signals=scdna_signals,
            tiered_signals=all_tiered_signals,
            session_id=field.task.taskId,
        )

        synthesis_prompt = self._build_synthesis_prompt(query, arbiter_output, health_signals)
        answer = self.llm_client(synthesis_prompt)

        persisted = False
        if persist:
            save_force_field(field)
            persisted = True

        return {
            "answer": answer,
            "findings": arbiter_output.acceptedFindings,
            "next_action": arbiter_output.nextAction,
            "health_signals": health_signals,
            "gated_tool_calls": gated_tool_calls,
            "personality_weights": personality_weights,
            "arbiter_output": arbiter_output,
            "raw_results": results,
            "field": field,
            "session_id": field.task.taskId,
            "persisted": persisted,
            "scdna_genes": [g.to_compact_string() for g in decoded_genes],
            "scdna_contradictions": [
                {"stableId": c.gene.identity.stableId, "reason": c.reason, "opposing": c.opposing}
                for c in scdna_contradictions
            ],
            "scdna_health_signals": scdna_signals,
            "diagnostic_memory_submission": diagnostic_memory_submission,
        }

    def _gate_tool_calls(
        self,
        field: VaelrixCortexForceField,
        results: list[Any],
    ) -> list[dict[str, Any]]:
        """Run every brain's requested tool calls through the Tool Governor."""
        from .amplifier_registry import get_brain_by_id

        gated: list[dict[str, Any]] = []
        for result in results:
            brain = get_brain_by_id(result.brainId)
            allowed_tools = set(brain.allowedTools) if brain else None
            for request in getattr(result, "requestedToolCalls", []) or []:
                decision = should_allow_tool_call(
                    field,
                    request.tool,
                    request.args,
                    request.reason,
                    allowed_tools=allowed_tools,
                )
                gated.append(
                    {
                        "brainId": result.brainId,
                        "tool": request.tool,
                        "args": request.args,
                        "requestReason": request.reason,
                        "allowed": decision.allowed,
                        "governorReason": decision.reason,
                        "riskLevel": decision.riskLevel,
                        "tieredSignals": decision.tieredSignals,
                    }
                )
                if decision.allowed:
                    field = record_tool_call(field, request.tool, request.args, request.reason)
        return gated

    def _build_synthesis_prompt(
        self,
        query: str,
        arbiter_output: Any,
        health_signals: list[str],
    ) -> str:
        lines = [
            "You are the Vaelrix Cortex synthesis layer.",
            f"User query: {query}",
            "Accepted findings:",
        ]
        for finding in arbiter_output.acceptedFindings:
            lines.append(f"- {finding}")
        if arbiter_output.contradictions:
            lines.append("Contradictions:")
            for contradiction in arbiter_output.contradictions:
                lines.append(f"- {contradiction}")
        if arbiter_output.nextAction:
            lines.append(f"Recommended next action: {arbiter_output.nextAction}")
        if health_signals:
            lines.append(f"BytecodeHealth signals emitted ({len(health_signals)}):")
            for signal in health_signals:
                lines.append(f"- {signal}")
        lines.append("Synthesize a concise, actionable answer.")
        return "\n".join(lines)
