"""
Vaelrix Cortex ForceField — Architecture Brain.

System design and structure domain specialist. Analyzes the task for
architectural concerns: layer boundaries, design patterns, coupling,
separation of concerns, and system organization — deterministic heuristics.
"""

from __future__ import annotations

from pathlib import Path

from ..types import AmplifierBrain, AmplifierResult, ResonanceScore, VaelrixCortexForceField


ARCHITECTURE_BRAIN = AmplifierBrain(
    id="ARCHITECTURE_BRAIN",
    domain=["architecture", "design", "structure", "pattern"],
    activationSignals=["architecture", "design", "structure", "pattern", "system", "organize"],
    allowedTools=["search_code", "read_file", "diagnostic_scan"],
    defaultSearchBudget=3,
)

_ARCHITECTURAL_PATTERNS: dict[str, str] = {
    "mvc": "Model-View-Controller — separates data, UI, and logic.",
    "mvvm": "Model-View-ViewModel — data-binding oriented variant of MVC.",
    "flux": "Flux/Redux — unidirectional data flow.",
    "clean architecture": "Clean Architecture — domain-centric, dependency-inverted layers.",
    "hexagonal": "Hexagonal/Ports & Adapters — isolates domain from infrastructure.",
    "microservices": "Microservices — independently deployable service modules.",
    "monolith": "Monolith — single deployable unit; simpler but less scalable.",
    "cqrs": "CQRS — Command-Query Responsibility Segregation.",
    "event sourcing": "Event Sourcing — state derived from immutable event stream.",
    "layered": "Layered Architecture — presentation/business/data tiers.",
    "serverless": "Serverless — function-as-a-service, no persistent server.",
    "pipeline": "Pipeline/Chain — sequential processing stages.",
    "plugin": "Plugin Architecture — extensible via add-on modules.",
}

_COUPLING_RISK_TERMS = {
    "circular": "Circular dependency — modules mutually importing each other.",
    "god class": "God class — single class doing too many things.",
    "spaghetti": "Spaghetti code — tangled, unstructured control flow.",
    "tight coupling": "Tight coupling — modules cannot change independently.",
    "dependency hell": "Dependency hell — version conflicts and deep dependency trees.",
    "big ball of mud": "Big Ball of Mud — no discernible architecture.",
}

_SOLID_PRINCIPLES = {
    "single responsibility": "SRP — a class should have only one reason to change.",
    "open closed": "OCP — open for extension, closed for modification.",
    "liskov": "LSP — subtypes must be substitutable for their base types.",
    "interface segregation": "ISP — no client forced to depend on methods it doesn't use.",
    "dependency inversion": "DIP — depend on abstractions, not concretions.",
}

_LAYER_NAMES = {"core", "service", "runtime", "server", "ui", "surface", "infra", "domain", "application", "presentation", "data", "persistence"}


def _project_root() -> Path:
    here = Path(__file__).resolve()
    for _ in range(8):
        if here == here.parent:
            break
        if any((here / marker).exists() for marker in (".git", "package.json", "pyproject.toml")):
            return here
        here = here.parent
    return Path.cwd()


def _scan_layer_dirs(root: Path) -> dict[str, list[str]]:
    """Identify directories that match architectural layer names."""
    layers: dict[str, list[str]] = {}
    for item in root.iterdir():
        if item.is_dir() and item.name.lower() in _LAYER_NAMES:
            layers[item.name] = sorted(
                str(p.relative_to(root)) for p in item.rglob("*.py") if p.is_file()
            )[:5]
    return layers


def run_architecture_brain(
    field: VaelrixCortexForceField,
    query: str | None = None,
) -> AmplifierResult:
    text = (query or field.task.rawUserRequest).lower()
    findings: list[str] = []
    root = _project_root()

    # Pattern detection
    pattern_hits = {name: desc for name, desc in _ARCHITECTURAL_PATTERNS.items() if name in text}
    if pattern_hits:
        findings.append(f"Architectural pattern(s): {', '.join(pattern_hits.keys())}")
    else:
        findings.append("No explicit architectural pattern detected — verify design intent.")

    # SOLID principles
    solid_hits = {name: desc for name, desc in _SOLID_PRINCIPLES.items() if name in text}
    if solid_hits:
        findings.append(f"SOLID principle(s) referenced: {', '.join(solid_hits.keys())}")

    # Coupling risks
    risk_hits = {name: desc for name, desc in _COUPLING_RISK_TERMS.items() if name in text}
    if risk_hits:
        findings.append(f"WARNING — coupling risk flagged: {', '.join(risk_hits.keys())}")

    # Layer scan
    layers = _scan_layer_dirs(root)
    if layers:
        layer_summary = ", ".join(f"{name}({len(files)} files)" for name, files in layers.items())
        findings.append(f"Detected layers: {layer_summary}")
    else:
        findings.append("No architectural layer directories detected (e.g. core/, service/, ui/).")

    # Cross-layer analysis
    if "refactor" in text and len(layers) >= 3:
        findings.append("Multi-layer project — refactors should preserve layer boundaries per CODEx contract.")
    if "import" in text and len(layers) >= 2:
        findings.append("Check import direction — inner layers should not import from outer layers.")

    # Structure keywords
    if "modular" in text or "module" in text:
        findings.append("Modularity referenced — verify clear public APIs and minimal cross-module coupling.")
    if "interface" in text or "contract" in text:
        findings.append("Interface/contract referenced — define explicit abstractions and test against them.")
    if "migration" in text or "migrate" in text:
        findings.append("Migration referenced — plan rollback and backward compatibility strategy.")
    if "scale" in text or "scalable" in text:
        findings.append("Scalability referenced — identify bottleneck and measure before optimizing.")

    # Task classification aware
    if field.task.classification == "architectural":
        findings.append("Task classified as ARCHITECTURAL — full design review recommended.")
    elif field.task.classification in ("structural", "behavioral"):
        findings.append(f"Task is {field.task.classification.upper()} — verify alignment with existing architecture.")

    if not findings:
        findings.append("Architecture Brain standing by — no structural concerns detected.")

    return AmplifierResult(
        brainId=ARCHITECTURE_BRAIN.id,
        summary="Architecture/design heuristic analysis.",
        findings=findings,
        recommendedAction="Review architectural decisions against CODEx layer contracts and SOLID principles.",
        resonance=ResonanceScore(
            intentMatch=0.7, evidenceStrength=0.6, novelty=0.5,
            conflictRisk=0.3, actionability=0.7,
        ),
    )
