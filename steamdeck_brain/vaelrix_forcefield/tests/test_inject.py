from vaelrix_forcefield.scdna.inject import distill_query, build_injection, format_context
from vaelrix_forcefield.scdna.compiler import compile_gene
from vaelrix_forcefield.scdna.inject import select_genes, MAX_GENES


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


def _pixel_gene(stable_id, confidence=90, freshness=0.9):
    gene, _compact, _warn = compile_gene(
        stable_id=stable_id,
        source_kind="sprite",
        domain="pixel",
        action="recall",
        activation_brains=["PIXEL_BRAIN"],
        imperative="Render the pixel sprite skeleton from its coordinates.",
        short_meaning="pixel sprite skeleton render",
        confidence=confidence,
        freshness=freshness,
        required_checks=["Verify checksum before use."],
        registry={},
        accept_checklist=True,
    )
    return gene


def test_select_returns_matching_pixel_gene():
    g = _pixel_gene("test.pixel.sprite.v1")
    registry = {g.identity.stableId: g}
    out = select_genes("render the pixel sprite", registry=registry)
    assert [x.identity.stableId for x in out] == ["test.pixel.sprite.v1"]


def test_select_empty_when_no_domain_signal():
    g = _pixel_gene("test.pixel.sprite.v2")
    registry = {g.identity.stableId: g}
    assert select_genes("write a haiku about the moon", registry=registry) == []


def test_select_gates_low_freshness():
    g = _pixel_gene("test.pixel.sprite.v3", freshness=0.2)
    registry = {g.identity.stableId: g}
    assert select_genes("render the pixel sprite", registry=registry) == []


def test_select_caps_results():
    registry = {}
    for i in range(MAX_GENES + 2):
        g = _pixel_gene(f"test.pixel.sprite.cap{i}")
        registry[g.identity.stableId] = g
    assert len(select_genes("render the pixel sprite", registry=registry)) == MAX_GENES


def test_format_empty_is_empty_string():
    assert format_context([]) == ""


def test_build_injection_includes_directive_fields():
    g = _pixel_gene("test.pixel.sprite.fmt")
    registry = {g.identity.stableId: g}
    block = build_injection("render the pixel sprite", registry=registry)
    assert "test.pixel.sprite.fmt" in block
    assert "Render the pixel sprite skeleton from its coordinates." in block
    assert "Required checks:" in block
    assert "Verify checksum before use." in block


def test_build_injection_empty_when_no_match():
    g = _pixel_gene("test.pixel.sprite.nomatch")
    registry = {g.identity.stableId: g}
    assert build_injection("write a haiku about the moon", registry=registry) == ""
