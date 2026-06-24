"""
Vaelrix Cortex ForceField — MVP law layer for governed multi-agent cognition.

Public API:
  - create_force_field, update_force_field, reset_phase_counters
  - context_ledger operations
  - should_allow_search, record_search, block_search
  - select_amplifiers, apply_routing
  - arbitrate_amplifier_results, update_field_from_arbiter
  - get_registry, get_brain_by_id
"""

from .amplifier_executor import run_amplifiers
from .amplifier_registry import get_brain_by_id, get_registry
from .amplifier_router import apply_routing, select_amplifiers
from .context_ledger import (
    answer_question,
    ask_question,
    confirm_fact,
    confirm_file,
    confirm_symbol,
    get_context,
    reject_path,
)
from .council_arbiter import (
    arbitrate_amplifier_results,
    update_field_from_arbiter,
)
from .forcefield import (
    create_force_field,
    reset_phase_counters,
    update_force_field,
)
from .search_governor import (
    block_search,
    record_search,
    should_allow_search,
)
from .types import (
    AmplifierBrain,
    AmplifierResult,
    ContextField,
    CouncilArbiterOutput,
    DeterminismField,
    EvidenceRef,
    MemoryField,
    OutputField,
    ResonanceScore,
    RetrievedChunk,
    RiskField,
    RoutingField,
    SearchBlock,
    SearchDecision,
    SearchField,
    SearchRecord,
    TaskField,
    ToolCallField,
    VaelrixCortexForceField,
)

__all__ = [
    "run_amplifiers",
    "create_force_field",
    "update_force_field",
    "reset_phase_counters",
    "confirm_fact",
    "confirm_file",
    "confirm_symbol",
    "reject_path",
    "ask_question",
    "answer_question",
    "get_context",
    "should_allow_search",
    "record_search",
    "block_search",
    "select_amplifiers",
    "apply_routing",
    "arbitrate_amplifier_results",
    "update_field_from_arbiter",
    "get_registry",
    "get_brain_by_id",
    "AmplifierBrain",
    "AmplifierResult",
    "ContextField",
    "CouncilArbiterOutput",
    "DeterminismField",
    "EvidenceRef",
    "MemoryField",
    "OutputField",
    "ResonanceScore",
    "RetrievedChunk",
    "RiskField",
    "RoutingField",
    "SearchBlock",
    "SearchDecision",
    "SearchField",
    "SearchRecord",
    "TaskField",
    "ToolCallField",
    "VaelrixCortexForceField",
]
