import re
from ..schema import EngineResult, Flag

CLUSTER_KEYWORDS = {
    "identity": [
        "vaelrix", "scholomance", "pixelbrain", "mirrorborne", "divtube",
    ],
    "genre": [
        "rap", "hip hop", "hiphop", "rock", "pop", "jazz", "classical",
        "electronic", "edm", "r&b", "rnb", "soul", "funk", "metal",
        "punk", "indie", "folk", "country", "blues", "reggae", "latin",
        "trap", "drill", "boom bap", "lo-fi", "lofi", "ambient",
        "cinematic rap", "lyrical rap", "underground rap", "dark rap",
        "conscious rap", "battle rap", "emotional rap", "confessional rap",
        "progressive hip hop", "experimental hip hop", "mythic rap",
        "poetic rap", "aggressive rap", "cathartic rap", "bar heavy rap",
    ],
    "format": [
        "music video", "lyric video", "visualizer", "live", "remix",
        "cover", "tutorial", "review", "vlog", "podcast", "interview",
        "documentary", "short film", "animation", "remotion",
        "lyric visualizer", "stream of consciousness",
    ],
    "mood": [
        "dark", "emotional", "epic", "chill", "aggressive", "melancholic",
        "uplifting", "intense", "atmospheric", "cinematic", "raw",
        "cathartic", "polarity", "eclipse imagery", "trauma",
        "recovery", "mental health", "anime references", "black lotus",
    ],
    "technology": [
        "ai", "suno", "sunoai", "remotion", "javascript", "python",
        "godot", "pixelbrain", "4k", "hd", "60fps",
    ],
    "audience-intent": [
        "best", "top", "new", "latest", "2024", "2025", "2026",
        "free", "download", "stream", "playlist", "mix", "compilation",
        "rap storytelling", "gravity bars", "polarity theme",
    ],
}

EXPECTED_CLUSTERS = ["identity", "genre", "format", "mood", "technology", "audience-intent"]
STUFFING_THRESHOLD = 40
NEAR_DUP_RATIO = 0.4


def _round_score(x):
    return int(x + 0.5)


def _clamp01(x):
    return max(0.0, min(1.0, x))


def _normalize_tags(tags):
    seen = set()
    result = []
    for tag in tags:
        normalized = tag.strip().lower()
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return sorted(result)


def _cluster_tag(tag):
    tag_lower = tag.lower()
    for cluster_name, keywords in sorted(CLUSTER_KEYWORDS.items()):
        for kw in keywords:
            if kw in tag_lower or tag_lower in kw:
                return cluster_name
    return "unclustered"


def run(analysis):
    raw_tags = analysis.tags.tags
    flags = []

    if not raw_tags:
        return EngineResult(
            score=0,
            metrics={"tagCount": 0, "uniqueTags": 0, "clusters": {}, "coverage": 0.0},
            flags=[Flag("WARN", "TAG_CLUSTER_TOO_BROAD", "No tags present")],
        )

    tags = _normalize_tags(raw_tags)
    tag_count = len(tags)

    clusters = {}
    for tag in tags:
        cluster = _cluster_tag(tag)
        if cluster not in clusters:
            clusters[cluster] = []
        clusters[cluster].append(tag)

    occupied = [c for c in EXPECTED_CLUSTERS if c in clusters]
    coverage = len(occupied) / len(EXPECTED_CLUSTERS)
    coverage_score = _clamp01(coverage)

    if len(occupied) <= len(EXPECTED_CLUSTERS) - 2:
        missing = [c for c in EXPECTED_CLUSTERS if c not in clusters]
        flags.append(Flag("WARN", "TAG_CLUSTER_TOO_BROAD",
                          f"Missing clusters: {', '.join(missing)}"))

    if tag_count > STUFFING_THRESHOLD:
        stuffing_penalty = _clamp01((tag_count - STUFFING_THRESHOLD) / 20.0)
        flags.append(Flag("WARN", "TAG_STUFFING_RISK",
                          f"Tag count ({tag_count}) exceeds stuffing threshold ({STUFFING_THRESHOLD})"))
    else:
        words_in_tags = []
        for tag in tags:
            words_in_tags.extend(re.findall(r"\w+", tag))
        word_freq = {}
        for w in words_in_tags:
            word_freq[w] = word_freq.get(w, 0) + 1
        near_dup_count = sum(1 for w, c in word_freq.items() if c >= 3 and len(w) > 2)
        if tag_count > 0 and near_dup_count / max(tag_count, 1) > NEAR_DUP_RATIO:
            stuffing_penalty = 0.5
            flags.append(Flag("WARN", "TAG_STUFFING_RISK",
                              "Near-duplicate tag variants detected"))
        else:
            stuffing_penalty = 0.0

    stuffing_inverse = 1.0 - stuffing_penalty

    if tag_count > 0:
        avg_words = sum(len(tag.split()) for tag in tags) / tag_count
        long_tail = _clamp01((avg_words - 1.0) / 2.0)
    else:
        long_tail = 0.0

    if occupied:
        avg_per_cluster = tag_count / len(occupied)
        tightness = _clamp01(1.0 - max(0, avg_per_cluster - 5) / 10.0)
    else:
        tightness = 0.0

    title_words = set(re.findall(r"\w+", analysis.overview.title.lower()))
    tag_words = set(re.findall(r"\w+", " ".join(tags)))
    if tag_words:
        overlap = len(title_words & tag_words)
        alignment = _clamp01(overlap / max(len(title_words), 1))
    else:
        alignment = 0.0

    raw = (tightness * 35 + coverage_score * 25 + stuffing_inverse * 20 +
           long_tail * 10 + alignment * 10)
    score = _round_score(raw)

    metrics = {
        "tagCount": tag_count,
        "uniqueTags": len(tags),
        "clusters": {k: len(v) for k, v in sorted(clusters.items())},
        "occupiedClusters": len(occupied),
        "coverage": round(coverage, 4),
        "semanticTightness": round(tightness, 4),
        "stuffingPenalty": round(stuffing_penalty, 4),
        "longTailSpecificity": round(long_tail, 4),
        "titleTagAlignment": round(alignment, 4),
    }

    return EngineResult(score=score, metrics=metrics, flags=flags)
