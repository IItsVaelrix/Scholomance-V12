"""
Vaelrix Cortex ForceField — core data model.

Python translation of the types defined in
scholomance-encyclopedia/PDR-archive/vaelrix-upgrade.pdr.md
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

TaskClassification = Literal[
    "cosmetic",
    "structural",
    "behavioral",
    "architectural",
    "diagnostic",
    "creative",
    "research",
    "planning",
]

TaskPriority = Literal["speed", "safety", "depth", "minimal_change"]

MemoryScope = Literal["local", "shared", "hybrid"]


@dataclass
class TaskField:
    taskId: str
    rawUserRequest: str
    normalizedGoal: str = ""
    classification: TaskClassification = "diagnostic"
    successCriteria: list[str] = field(default_factory=list)
    forbiddenDrift: list[str] = field(default_factory=list)
    priority: TaskPriority = "safety"


@dataclass
class ContextField:
    confirmedFacts: list[str] = field(default_factory=list)
    confirmedFiles: dict[str, str] = field(default_factory=dict)
    confirmedSymbols: dict[str, str] = field(default_factory=dict)
    rejectedPaths: dict[str, str] = field(default_factory=dict)
    openQuestions: list[str] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)
    staleAssumptions: list[str] = field(default_factory=list)


@dataclass
class RoutingField:
    activeBrains: list[str] = field(default_factory=list)
    suppressedBrains: dict[str, str] = field(default_factory=dict)
    activationReasons: dict[str, str] = field(default_factory=dict)
    personalityWeights: dict[str, float] = field(default_factory=dict)
    maxCouncilRounds: int = 2


@dataclass
class RetrievedChunk:
    id: str
    source: str
    summary: str
    relevance: float = 0.0
    usedByBrains: list[str] = field(default_factory=list)


@dataclass
class MemoryField:
    workingMemory: list[str] = field(default_factory=list)
    turboQuantRefs: list[str] = field(default_factory=list)
    retrievedChunks: list[RetrievedChunk] = field(default_factory=list)
    chunkUseHistory: dict[str, int] = field(default_factory=dict)
    memoryConfidence: dict[str, float] = field(default_factory=dict)


@dataclass
class SearchRecord:
    query: str
    phase: str
    reason: str
    resultsCount: int = 0
    confirmedFindings: list[str] = field(default_factory=list)
    timestampIndex: int = 0


@dataclass
class SearchBlock:
    query: str
    reason: str
    suggestedAlternative: str | None = None


@dataclass
class SearchField:
    searchCount: int = 0
    maxSearchesPerPhase: int = 10
    searchHistory: list[SearchRecord] = field(default_factory=list)
    blockedSearches: list[SearchBlock] = field(default_factory=list)
    repeatedQueryPenalty: float = 0.0
    requireSearchReason: bool = True
    preferKnownTargets: bool = True


@dataclass
class ToolCallRequest:
    tool: str
    args: dict = field(default_factory=dict)
    reason: str = ""


@dataclass
class ToolCallField:
    callsThisPhase: int = 0
    maxCallsPerPhase: int = 50
    lastCalls: list[dict] = field(default_factory=list)


@dataclass
class RiskField:
    riskNotes: list[str] = field(default_factory=list)
    blockedActions: list[str] = field(default_factory=list)
    regressionProneFiles: list[str] = field(default_factory=list)


@dataclass
class OutputField:
    requiredFormat: str = "markdown"
    finalAnswer: str = ""
    handoffNotes: list[str] = field(default_factory=list)


@dataclass
class DeterminismField:
    deterministicMode: bool = True
    stableOrdering: bool = True
    seed: int | None = None
    bannedNonDeterministicTools: list[str] = field(default_factory=list)


@dataclass
class VaelrixCortexForceField:
    task: TaskField
    context: ContextField = field(default_factory=ContextField)
    routing: RoutingField = field(default_factory=RoutingField)
    memory: MemoryField = field(default_factory=MemoryField)
    search: SearchField = field(default_factory=SearchField)
    tools: ToolCallField = field(default_factory=ToolCallField)
    risks: RiskField = field(default_factory=RiskField)
    output: OutputField = field(default_factory=OutputField)
    determinism: DeterminismField = field(default_factory=DeterminismField)


@dataclass
class EvidenceRef:
    source: str
    snippet: str
    relevance: float = 0.0


@dataclass
class ResonanceScore:
    intentMatch: float = 0.0
    evidenceStrength: float = 0.0
    novelty: float = 0.0
    conflictRisk: float = 0.0
    actionability: float = 0.0


@dataclass
class AmplifierBrain:
    id: str
    domain: list[str] = field(default_factory=list)
    activationSignals: list[str] = field(default_factory=list)
    memoryScope: MemoryScope = "shared"
    allowedTools: list[str] = field(default_factory=list)
    defaultSearchBudget: int = 3
    weight: float = 1.0


@dataclass
class AmplifierResult:
    brainId: str
    summary: str = ""
    findings: list[str] = field(default_factory=list)
    evidence: list[EvidenceRef] = field(default_factory=list)
    recommendedAction: str = ""
    requestedToolCalls: list[ToolCallRequest] = field(default_factory=list)
    bytecodes: list[str] = field(default_factory=list)
    resonance: ResonanceScore = field(default_factory=ResonanceScore)


@dataclass
class SearchDecision:
    allowed: bool
    reason: str
    suggestedAlternative: str | None = None


@dataclass
class ToolDecision:
    allowed: bool
    reason: str
    suggestedAlternative: str | None = None
    riskLevel: str = "low"  # low | medium | high | blocked


@dataclass
class CouncilArbiterOutput:
    acceptedFindings: list[str] = field(default_factory=list)
    rejectedFindings: list[str] = field(default_factory=list)
    contradictions: list[str] = field(default_factory=list)
    nextAction: str = ""
    fieldUpdates: dict = field(default_factory=dict)
