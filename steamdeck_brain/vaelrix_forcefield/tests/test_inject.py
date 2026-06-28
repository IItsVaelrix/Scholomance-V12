from vaelrix_forcefield.scdna.inject import distill_query


def test_distill_keeps_pixel_domain_tokens():
    q = distill_query("Please render the PixelBrain sprite from coordinates")
    tokens = q.split()
    assert "pixel" in tokens or "pixelbrain" in tokens
    assert "sprite" in tokens
    assert "render" in tokens
    # stopwords / filler removed
    assert "please" not in tokens
    assert "from" not in tokens


def test_distill_empty_for_no_domain_signal():
    assert distill_query("write a short haiku about the quiet moon") == ""


def test_distill_dedupes_and_preserves_order():
    q = distill_query("sprite sprite palette sprite")
    assert q.split() == ["sprite", "palette"]
