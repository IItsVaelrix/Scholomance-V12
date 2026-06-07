# ScholoCandy EQ Error Tolerance

The native Rust DSP implementation of ScholoCandy EQ is designed to match the W3C Web Audio API BiquadFilterNode behavior, which is based on the Audio EQ Cookbook by Robert Bristow-Johnson.

Since floating point math can drift slightly across architectures and implementations, we establish the following accepted tolerances for golden fixture parity tests.

## Accepted Error Tolerance

### 1. Coefficient Parity
- Expected tolerance: `1e-5` relative error.
- Calculated `b0, b1, b2, a1, a2` normalized by `a0` must match the golden references up to 5 decimal places.

### 2. Magnitude Response Parity (Frequency Domain)
- Expected tolerance: `0.1 dB` max deviation across the spectrum (20Hz - 20kHz).
- Since human perception of 0.1 dB is largely imperceptible, this proves the filter shape aligns perfectly with the Web Audio reference.

### 3. Time Domain Stability
- Output must remain strictly bounded between `[-1.0, 1.0]` when input is within `[-1.0, 1.0]` and gain is <= 0 dB.
- Infinite precision arithmetic divergence may cause tiny discrepancies in the long tail of impulse responses, which are acceptable as long as it decays correctly. No self-oscillating NaNs allowed.
