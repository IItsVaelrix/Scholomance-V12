"""
Vaelrix Cortex ForceField — Context Ledger.

Tracks confirmed facts, files, symbols, rejected paths, and open questions.
"""

from __future__ import annotations

from copy import deepcopy

from .types import ContextField, VaelrixCortexForceField


def confirm_fact(field: VaelrixCortexForceField, fact: str) -> VaelrixCortexForceField:
    """Add a proven fact to the context ledger."""
    new_field = deepcopy(field)
    if fact not in new_field.context.confirmedFacts:
        new_field.context.confirmedFacts.append(fact)
    return new_field


def confirm_file(
    field: VaelrixCortexForceField,
    label: str,
    path: str,
) -> VaelrixCortexForceField:
    """Record a confirmed file mapping."""
    new_field = deepcopy(field)
    new_field.context.confirmedFiles[label] = path
    return new_field


def confirm_symbol(
    field: VaelrixCortexForceField,
    symbol: str,
    path: str,
) -> VaelrixCortexForceField:
    """Record a confirmed symbol mapping."""
    new_field = deepcopy(field)
    new_field.context.confirmedSymbols[symbol] = path
    return new_field


def reject_path(
    field: VaelrixCortexForceField,
    path: str,
    reason: str,
) -> VaelrixCortexForceField:
    """Mark a path as rejected so it is not revisited."""
    new_field = deepcopy(field)
    new_field.context.rejectedPaths[path] = reason
    return new_field


def ask_question(
    field: VaelrixCortexForceField,
    question: str,
) -> VaelrixCortexForceField:
    """Register an open question."""
    new_field = deepcopy(field)
    if question not in new_field.context.openQuestions:
        new_field.context.openQuestions.append(question)
    return new_field


def answer_question(
    field: VaelrixCortexForceField,
    question: str,
    answer: str,
) -> VaelrixCortexForceField:
    """Resolve an open question into a confirmed fact."""
    new_field = deepcopy(field)
    if question in new_field.context.openQuestions:
        new_field.context.openQuestions.remove(question)
    new_field.context.confirmedFacts.append(f"{question} → {answer}")
    return new_field


def get_context(field: VaelrixCortexForceField) -> ContextField:
    """Return the current context ledger."""
    return field.context
