export function classifyVectorCodec(packet) {
  // Rotation fit: random-rotation scores highest because it approximates the Johnson-Lindenstrauss
  // transform, which photonic MACs can execute as dense matrix-vector multiply. Hadamard is
  // structured and slightly less amenable to photonic parallelism. Polar is intermediate.
  // signed-hash-rotation is the deterministic Photonic Retina variant — same JL-style ±1
  // mixing applied via a hash, so it scores alongside random-rotation.
  const rotationFit = {
    none: 0.25,
    'random-rotation': 0.9,
    'signed-hash-rotation': 0.88,
    hadamard: 0.82,
    polar: 0.76,
    custom: 0.5,
  }[packet.rotationKind] ?? 0.4;

  // Quantization fit: polar quantization maps directly to phase-based photonic encoding.
  // QJL-residual is strong but requires an electronic residual correction pass, reducing fit slightly.
  // Scalar is linear-friendly but not photonic-optimized. All scores are provisional estimates.
  const quantizationFit = {
    none: 0.25,
    scalar: 0.7,
    polar: 0.82,
    'qjl-residual': 0.78,
    custom: 0.5,
  }[packet.quantizationKind] ?? 0.4;

  // Residual fit: QJL sign-bit sketching is linear and photonic-compatible. Residual codebooks
  // require table lookups that are electronic-bound. None is acceptable — no residual needed.
  // For qbit-field packets specifically, residual correction is unnecessary because the
  // energy field is smooth-by-construction (Gaussian-correlated, no high-frequency noise).
  // Treat residualKind=none as a strong fit instead of a default-acceptable one.
  const noneResidualFit = packet.sourceKind === 'qbit-field' ? 0.75 : 0.45;
  const residualFit = {
    none: noneResidualFit,
    qjl: 0.82,
    'sign-bit': 0.75,
    'residual-codebook': 0.62,
    custom: 0.5,
  }[packet.residualKind] ?? 0.4;

  // Bit budget fit: photonic analog compute is most efficient at low bit-widths where
  // amplitude/phase precision demands are manageable. Above 8 bits the analog domain
  // precision requirements become difficult to meet without calibration overhead.
  const bitBudgetFit = packet.bitWidth <= 4 ? 0.9 : packet.bitWidth <= 8 ? 0.72 : 0.45;

  return Object.freeze({
    rotationFit,
    quantizationFit,
    residualFit,
    bitBudgetFit,
    notes: Object.freeze([
      `rotationKind=${packet.rotationKind}`,
      `quantizationKind=${packet.quantizationKind}`,
      `residualKind=${packet.residualKind}`,
      `bitWidth=${packet.bitWidth}`,
    ]),
  });
}
