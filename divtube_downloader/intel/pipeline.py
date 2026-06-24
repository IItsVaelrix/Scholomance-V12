from .schema import (
    SeoCritiqueResult, DeterminismInfo, SCHEMA_VERSION, SCORING_VERSION, RULESET_VERSION,
)
from .engines import thumbnail_engine, title_engine, tag_engine, performance_engine

WEIGHTS = {
    "thumbnail": 0.25,
    "title": 0.30,
    "tag": 0.20,
    "performance": 0.25,
}


def _round_score(x):
    return int(x + 0.5)


def _compute_overall(scores):
    total_weight = 0.0
    weighted_sum = 0.0
    for key, weight in WEIGHTS.items():
        val = scores.get(key)
        if val is not None:
            weighted_sum += val * weight
            total_weight += weight
    if total_weight == 0:
        return 0
    return _round_score(weighted_sum / total_weight)


def _compute_replication(scores):
    thumb = scores.get("thumbnail", 0) or 0
    title = scores.get("title", 0) or 0
    tag = scores.get("tag", 0) or 0
    perf = scores.get("performance", 0) or 0
    return _round_score(thumb * 0.2 + title * 0.3 + tag * 0.2 + perf * 0.3)


def run_critique(analysis, thumbnail_bytes=None, references=None):
    title_result = title_engine.run(analysis)
    tag_result = tag_engine.run(analysis)
    perf_result = performance_engine.run(analysis)
    thumb_result = thumbnail_engine.run(analysis, thumbnail_bytes)

    scores = {
        "thumbnail": thumb_result.score,
        "title": title_result.score,
        "tag": tag_result.score,
        "performance": perf_result.score,
    }

    overall = _compute_overall(scores)
    replication = _compute_replication(scores)

    all_flags = []
    all_flags.extend(thumb_result.flags)
    all_flags.extend(title_result.flags)
    all_flags.extend(tag_result.flags)
    all_flags.extend(perf_result.flags)

    metrics = {
        "thumbnail": thumb_result.metrics,
        "title": title_result.metrics,
        "tags": tag_result.metrics,
        "performance": perf_result.metrics,
    }

    video_id = analysis.overview.video_id
    run_id = f"YT-INTEL-{video_id}"

    full_scores = dict(scores)
    full_scores["overall"] = overall
    full_scores["replicationValue"] = replication

    return SeoCritiqueResult(
        analysis_run_id=run_id,
        video_id=video_id,
        overall_score=overall,
        scores=full_scores,
        flags=all_flags,
        metrics=metrics,
        determinism=DeterminismInfo(
            schema_version=SCHEMA_VERSION,
            ruleset_version=RULESET_VERSION,
            scoring_version=SCORING_VERSION,
        ),
    )
