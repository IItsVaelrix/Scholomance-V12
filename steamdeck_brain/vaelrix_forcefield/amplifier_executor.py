"""
Vaelrix Cortex ForceField — Amplifier Executor.

Runs active Amplifier brains in parallel and returns their results for the
Council Arbiter.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable

from .brains import BRAIN_RUNNERS
from .types import AmplifierResult, VaelrixCortexForceField


def run_amplifiers(
    field: VaelrixCortexForceField,
    query: str | None = None,
    max_workers: int = 4,
    runners: dict[str, Callable[[VaelrixCortexForceField, str | None], AmplifierResult]] | None = None,
) -> list[AmplifierResult]:
    """
    Execute every active brain from the ForceField routing.

    Brains run in a thread pool. Unknown or inactive brains are skipped.
    """
    active = field.routing.activeBrains
    if not active:
        return []

    runner_map = runners or BRAIN_RUNNERS
    results: list[AmplifierResult] = []

    def run_brain(brain_id: str) -> AmplifierResult | None:
        runner = runner_map.get(brain_id)
        if not runner:
            return None
        try:
            return runner(field, query)
        except Exception as exc:
            return AmplifierResult(
                brainId=brain_id,
                summary=f"Brain execution failed: {exc}",
                findings=[f"Execution error: {exc}"],
            )

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(run_brain, brain_id): brain_id for brain_id in active}
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                results.append(result)

    # Stable ordering by activeBrains list for determinism.
    order = {b: i for i, b in enumerate(active)}
    results.sort(key=lambda r: order.get(r.brainId, 9999))
    return results
