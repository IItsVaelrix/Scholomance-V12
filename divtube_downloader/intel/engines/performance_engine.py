from ..schema import EngineResult, Flag


def _round_score(x):
    return int(x + 0.5)


def _clamp01(x):
    return max(0.0, min(1.0, x))


def _band(engagement_rate):
    if engagement_rate < 2.0:
        return "weak"
    elif engagement_rate < 4.0:
        return "low"
    elif engagement_rate < 8.0:
        return "healthy"
    elif engagement_rate < 15.0:
        return "strong"
    else:
        return "suspicious"


def _confidence(view_count):
    if view_count < 100:
        return "LOW"
    elif view_count < 1000:
        return "MED"
    else:
        return "HIGH"


def run(analysis):
    telemetry = analysis.telemetry
    flags = []

    engagement_rate = telemetry.engagement_rate
    view_count = telemetry.view_count

    band = _band(engagement_rate)
    conf = _confidence(view_count)

    if band == "weak":
        flags.append(Flag("WARN", "PERFORMANCE_LOW_ENGAGEMENT",
                          f"Engagement rate {engagement_rate}% is below 2% (weak band)"))
    elif band == "suspicious":
        flags.append(Flag("WARN", "PERFORMANCE_SUSPICIOUS_ENGAGEMENT",
                          f"Engagement rate {engagement_rate}% exceeds 15% (suspicious band)"))

    if conf == "LOW":
        flags.append(Flag("WARN", "PERFORMANCE_LOW_SAMPLE_CONFIDENCE",
                          f"View count ({view_count}) too low for reliable performance assessment"))

    if band == "suspicious":
        score = 40
    elif band == "strong":
        score = 90
    elif band == "healthy":
        score = 70
    elif band == "low":
        score = 50
    else:
        score = 30

    if conf == "LOW":
        score = _round_score(score * 0.7)
    elif conf == "MED":
        score = _round_score(score * 0.85)

    views_per_day = telemetry.views_per_day
    if views_per_day > 0:
        days = view_count / views_per_day if views_per_day > 0 else 1
        days = max(days, 1.0)
    else:
        days = 1.0

    metrics = {
        "engagementRate": engagement_rate,
        "band": band,
        "confidence": conf,
        "viewCount": view_count,
        "likeCount": telemetry.like_count,
        "commentCount": telemetry.comment_count,
        "viewsPerDay": views_per_day,
        "estimatedDays": round(days, 1),
        "performanceScore": telemetry.performance_score,
    }

    return EngineResult(score=score, metrics=metrics, flags=flags)
