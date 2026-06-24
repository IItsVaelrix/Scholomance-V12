import re
from ..schema import EngineResult, Flag

MAX_RECOMMENDED = 50
HARD_WARN = 60
HOOK_WINDOW = 3
KEYWORD_FRONTLOAD = 32

STOPWORDS = frozenset({
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "above", "below", "between", "and", "but", "or",
    "nor", "not", "so", "yet", "both", "either", "neither", "each",
    "every", "all", "any", "few", "more", "most", "other", "some", "such",
    "no", "only", "own", "same", "than", "too", "very", "just", "because",
    "if", "when", "while", "that", "this", "these", "those", "it", "its",
    "i", "me", "my", "we", "our", "you", "your", "he", "him", "his",
    "she", "her", "they", "them", "their", "what", "which", "who", "whom",
})

HOOK_PATTERNS = [
    r"\?", r"!", r"\bwhy\b", r"\bhow\b", r"\bsecret\b", r"\brevealed\b",
    r"\btruth\b", r"\bnever\b", r"\balways\b", r"\bshocking\b", r"\bsurprising\b",
    r"\bunbelievable\b", r"\binsane\b", r"\bcrazy\b", r"\bepic\b", r"\bultimate\b",
    r"\bworst\b", r"\bbest\b", r"\btop\b", r"\bmust\b", r"\bdon'?t\b",
    r"\bstop\b", r"\bwatch\b", r"\bbefore\b", r"\bafter\b", r"\bvs\b",
    r"\bversus\b", r"\bdeadly\b", r"\bdangerous\b", r"\bhidden\b", r"\bexposed\b",
]


def _round_score(x):
    return int(x + 0.5)


def _clamp01(x):
    return max(0.0, min(1.0, x))


def _extract_keyword(title):
    words = re.findall(r"[A-Za-z0-9']+", title)
    candidates = []
    for w in words:
        if w.lower() not in STOPWORDS and len(w) > 2:
            candidates.append(w)
    if not candidates:
        return ""
    caps = [w for w in candidates if w[0].isupper() and len(w) > 2]
    if caps:
        return max(caps, key=len)
    return max(candidates, key=len)


def _has_hook_in_window(title):
    words = title.split()[:HOOK_WINDOW]
    window_text = " ".join(words)
    for pattern in HOOK_PATTERNS:
        if re.search(pattern, window_text, re.IGNORECASE):
            return True
    return False


def run(analysis):
    title = analysis.overview.title
    flags = []

    if not title:
        return EngineResult(
            score=0,
            metrics={"length": 0, "hasHook": False, "keyword": "", "keywordPosition": -1},
            flags=[Flag("CRIT", "YTSEO_INVALID_VIDEO_ANALYSIS_SCHEMA", "Video title is empty")],
        )

    length = len(title)
    words = title.split()

    if length <= MAX_RECOMMENDED:
        length_score = 1.0
    elif length <= HARD_WARN:
        length_score = 1.0 - (length - MAX_RECOMMENDED) / (HARD_WARN - MAX_RECOMMENDED) * 0.5
    else:
        length_score = 0.2
        flags.append(Flag("WARN", "TITLE_MOBILE_TRUNCATION",
                          f"Title is {length} chars (>{HARD_WARN} mobile truncation threshold)"))

    has_hook = _has_hook_in_window(title)
    hook_score = 1.0 if has_hook else 0.3
    if not has_hook:
        flags.append(Flag("WARN", "TITLE_HOOK_AFTER_WORD_3",
                          "No emotional/curiosity hook in first 3 words"))

    keyword = _extract_keyword(title)
    keyword_pos = title.find(keyword) if keyword else -1
    if keyword_pos >= 0 and keyword_pos < KEYWORD_FRONTLOAD:
        kw_score = 1.0
    elif keyword_pos >= 0:
        kw_score = 0.4
        flags.append(Flag("WARN", "TITLE_KEYWORD_AFTER_CHAR_32",
                          f"Keyword '{keyword}' appears at position {keyword_pos}"))
    else:
        kw_score = 0.2

    curiosity_patterns = [r"\?", r"\bwhy\b", r"\bhow\b", r"\bsecret\b", r"\btruth\b",
                          r"\brevealed\b", r"\bhidden\b", r"\bexposed\b"]
    has_curiosity = any(re.search(p, title, re.IGNORECASE) for p in curiosity_patterns)
    curiosity_score = 1.0 if has_curiosity else 0.4

    if length > 0:
        alpha_count = sum(1 for c in title if c.isalpha())
        clarity_score = _clamp01(alpha_count / max(length, 1))
    else:
        clarity_score = 0.0

    if words:
        unique = len(set(w.lower() for w in words))
        uniqueness_score = _clamp01(unique / len(words))
    else:
        uniqueness_score = 0.0

    raw = (length_score * 20 + hook_score * 25 + kw_score * 20 +
           curiosity_score * 15 + clarity_score * 15 + uniqueness_score * 5)
    score = _round_score(raw)

    metrics = {
        "length": length,
        "wordCount": len(words),
        "hasHook": has_hook,
        "keyword": keyword,
        "keywordPosition": keyword_pos,
        "hasCuriosity": has_curiosity,
        "clarity": round(clarity_score, 4),
        "uniqueness": round(uniqueness_score, 4),
    }

    return EngineResult(score=score, metrics=metrics, flags=flags)
