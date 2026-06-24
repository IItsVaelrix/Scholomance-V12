from ..schema import EngineResult, Flag

THUMBNAIL_WIDTH = 48
ASPECT_W = 16
ASPECT_H = 9


def _round_score(x):
    return int(x + 0.5)


def _clamp01(x):
    return max(0.0, min(1.0, x))


def _to_grayscale_luminosity(img):
    w, h = img.size
    pixels = img.load()
    gray = []
    for y in range(h):
        row = []
        for x in range(w):
            r, g, b = pixels[x, y][0], pixels[x, y][1], pixels[x, y][2]
            row.append(0.299 * r + 0.587 * g + 0.114 * b)
        gray.append(row)
    return gray


def _normalize_contrast(gray):
    h = len(gray)
    w = len(gray[0]) if h > 0 else 0
    mn = min(gray[y][x] for y in range(h) for x in range(w))
    mx = max(gray[y][x] for y in range(h) for x in range(w))
    rng = mx - mn
    if rng < 1e-6:
        return [[0.0] * w for _ in range(h)]
    return [[(gray[y][x] - mn) / rng * 255.0 for x in range(w)] for y in range(h)]


def _otsu_threshold(gray):
    h = len(gray)
    w = len(gray[0]) if h > 0 else 0
    total = h * w
    if total == 0:
        return 128

    hist = [0] * 256
    for y in range(h):
        for x in range(w):
            hist[int(gray[y][x])] += 1

    sum_all = sum(i * hist[i] for i in range(256))
    sum_bg = 0.0
    w_bg = 0
    max_var = -1.0
    threshold = 0

    for t in range(256):
        w_bg += hist[t]
        if w_bg == 0:
            continue
        w_fg = total - w_bg
        if w_fg == 0:
            break
        sum_bg += t * hist[t]
        mean_bg = sum_bg / w_bg
        mean_fg = (sum_all - sum_bg) / w_fg
        between_var = w_bg * w_fg * (mean_bg - mean_fg) ** 2
        if between_var > max_var:
            max_var = between_var
            threshold = t

    return threshold


def _connected_components(binary, h, w):
    labels = [[0] * w for _ in range(h)]
    current_label = 0
    components = {}

    for y in range(h):
        for x in range(w):
            if binary[y][x] == 1 and labels[y][x] == 0:
                current_label += 1
                stack = [(y, x)]
                pixels = []
                while stack:
                    cy, cx = stack.pop()
                    if cy < 0 or cy >= h or cx < 0 or cx >= w:
                        continue
                    if binary[cy][cx] == 0 or labels[cy][cx] != 0:
                        continue
                    labels[cy][cx] = current_label
                    pixels.append((cy, cx))
                    stack.extend([(cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)])
                components[current_label] = pixels

    return labels, components


def _bbox(pixels):
    min_y = min(p[0] for p in pixels)
    max_y = max(p[0] for p in pixels)
    min_x = min(p[1] for p in pixels)
    max_x = max(p[1] for p in pixels)
    return min_y, max_y, min_x, max_x


def _crop_to_aspect(img):
    w, h = img.size
    target_ratio = ASPECT_W / ASPECT_H
    current_ratio = w / h

    if abs(current_ratio - target_ratio) < 0.01:
        return img

    if current_ratio > target_ratio:
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    else:
        new_h = int(w / target_ratio)
        top = (h - new_h) // 2
        return img.crop((0, top, w, top + new_h))


def run(analysis, thumbnail_bytes):
    if thumbnail_bytes is None:
        return EngineResult(
            score=None,
            metrics={},
            flags=[Flag("WARN", "YTSEO_THUMBNAIL_FETCH_FAILED", "Thumbnail bytes unavailable")],
        )

    from PIL import Image
    import io

    try:
        img = Image.open(io.BytesIO(thumbnail_bytes)).convert("RGB")
    except Exception:
        return EngineResult(
            score=None,
            metrics={},
            flags=[Flag("WARN", "YTSEO_THUMBNAIL_FETCH_FAILED", "Failed to decode thumbnail image")],
        )

    img = _crop_to_aspect(img)
    target_h = int(THUMBNAIL_WIDTH * ASPECT_H / ASPECT_W)
    img_small = img.resize((THUMBNAIL_WIDTH, target_h), Image.NEAREST)

    small_pixels = img_small.load()
    sw, sh = img_small.size

    color_r = [[small_pixels[x, y][0] for x in range(sw)] for y in range(sh)]
    color_g = [[small_pixels[x, y][1] for x in range(sw)] for y in range(sh)]
    color_b = [[small_pixels[x, y][2] for x in range(sw)] for y in range(sh)]

    gray = _to_grayscale_luminosity(img_small)
    gray = _normalize_contrast(gray)

    threshold = _otsu_threshold(gray)

    h = len(gray)
    w = len(gray[0])
    binary = [[1 if gray[y][x] > threshold else 0 for x in range(w)] for y in range(h)]

    _, components = _connected_components(binary, h, w)

    total_pixels = w * h
    flags = []

    if len(components) <= 1:
        silhouette = 0.0
        flags.append(Flag("WARN", "THUMBNAIL_LOW_SILHOUETTE",
                          "No distinct foreground components detected"))
    else:
        silhouette = _clamp01(1.0 - (len(components) - 1) / 50.0)
        if silhouette < 0.3:
            flags.append(Flag("WARN", "THUMBNAIL_LOW_SILHOUETTE",
                              f"Silhouette clarity is low ({len(components)} components)"))

    if components:
        largest = max(components.values(), key=len)
        largest_area = len(largest)
        largest_fraction = largest_area / total_pixels

        if 0.18 <= largest_fraction <= 0.55:
            focal_dominance = 1.0
        elif largest_fraction < 0.18:
            focal_dominance = _clamp01(largest_fraction / 0.18)
        else:
            focal_dominance = _clamp01((1.0 - largest_fraction) / (1.0 - 0.55))
    else:
        focal_dominance = 0.0
        largest_fraction = 0.0

    fg_vals = []
    bg_vals = []
    for y in range(h):
        for x in range(w):
            if binary[y][x] == 1:
                fg_vals.append(gray[y][x])
            else:
                bg_vals.append(gray[y][x])

    if fg_vals and bg_vals:
        fg_mean = sum(fg_vals) / len(fg_vals)
        bg_mean = sum(bg_vals) / len(bg_vals)
        contrast = _clamp01(abs(fg_mean - bg_mean) / 255.0)
    else:
        contrast = 0.0

    if contrast < 0.15:
        flags.append(Flag("WARN", "THUMBNAIL_LOW_FOREGROUND_CONTRAST",
                          f"Foreground contrast is low ({contrast:.2f})"))

    thin_count = 0
    for comp_pixels in components.values():
        bb = _bbox(comp_pixels)
        comp_h = bb[1] - bb[0] + 1
        comp_w = bb[3] - bb[2] + 1
        if comp_h <= 1 or comp_w <= 1:
            thin_count += 1

    if len(components) > 0:
        text_legibility = _clamp01(1.0 - thin_count / max(len(components), 1))
    else:
        text_legibility = 1.0

    if thin_count > 3:
        flags.append(Flag("WARN", "THUMBNAIL_TEXT_COLLAPSE_48PX",
                          f"{thin_count} thin components likely unreadable at 48px"))

    crop_safety = 1.0
    if components:
        largest_pixels = max(components.values(), key=len)
        bb = _bbox(largest_pixels)
        edge_margin_y = h * 0.05
        edge_margin_x = w * 0.05
        if bb[0] < edge_margin_y or bb[1] > h - edge_margin_y:
            crop_safety -= 0.5
        if bb[2] < edge_margin_x or bb[3] > w - edge_margin_x:
            crop_safety -= 0.5
        crop_safety = max(0.0, crop_safety)

    all_sat = []
    all_hue = []
    for y in range(sh):
        for x in range(sw):
            r, g, b = color_r[y][x] / 255.0, color_g[y][x] / 255.0, color_b[y][x] / 255.0
            mx = max(r, g, b)
            mn = min(r, g, b)
            delta = mx - mn
            sat = 0.0 if mx == 0 else delta / mx
            all_sat.append(sat)
            if delta > 0:
                if mx == r:
                    hue = 60.0 * (((g - b) / delta) % 6)
                elif mx == g:
                    hue = 60.0 * (((b - r) / delta) + 2)
                else:
                    hue = 60.0 * (((r - g) / delta) + 4)
                all_hue.append(hue)

    sat_spread = max(all_sat) - min(all_sat) if all_sat else 0.0
    hue_spread = (max(all_hue) - min(all_hue)) / 360.0 if all_hue else 0.0
    color_separation = _clamp01(sat_spread * 0.5 + hue_spread * 0.5)

    raw = (silhouette * 25 + focal_dominance * 20 + contrast * 20 +
           text_legibility * 15 + crop_safety * 10 + color_separation * 10)
    score = _round_score(raw)

    metrics = {
        "componentCount": len(components),
        "silhouette": round(silhouette, 4),
        "focalDominance": round(focal_dominance, 4),
        "largestComponentFraction": round(largest_fraction, 4),
        "contrast": round(contrast, 4),
        "fgMean": round(sum(fg_vals) / len(fg_vals), 2) if fg_vals else 0.0,
        "bgMean": round(sum(bg_vals) / len(bg_vals), 2) if bg_vals else 0.0,
        "textLegibility": round(text_legibility, 4),
        "thinComponents": thin_count,
        "cropSafety": round(crop_safety, 4),
        "colorSeparation": round(color_separation, 4),
        "saturationSpread": round(sat_spread, 4),
        "hueSpread": round(hue_spread, 4),
        "otsuThreshold": threshold,
        "imageSize": f"{w}x{h}",
    }

    return EngineResult(score=score, metrics=metrics, flags=flags)
