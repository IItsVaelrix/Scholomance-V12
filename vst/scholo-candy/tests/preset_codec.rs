use scholo_candy::dsp::codec::Preset;

const FACTORY_VOID: &str = include_str!("../golden/factory_scrolls/void_undertow.scroll.json");

#[test]
fn void_factory_round_trip_is_byte_identical() {
    let mut a: Preset = serde_json::from_str(FACTORY_VOID).unwrap();
    a.recompute();
    let bytes_a = serde_json::to_vec(&a).unwrap();

    let mut b: Preset = serde_json::from_slice(&bytes_a).unwrap();
    b.recompute();
    let bytes_b = serde_json::to_vec(&b).unwrap();

    assert_eq!(bytes_a, bytes_b, "round-trip must be byte-identical");
    assert!(a.bytecode.starts_with("BIT-EQ-v1-"));
    assert_eq!(a.checksum.len(), 64);
}
