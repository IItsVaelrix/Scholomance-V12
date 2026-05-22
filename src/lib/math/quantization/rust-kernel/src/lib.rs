use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

#[wasm_bindgen]
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// TurboQuant (TQ) 2.5-bit Quantization Payload
#[wasm_bindgen]
pub struct TQPayload {
    data: Vec<u8>,
    dim: usize,
    norm: f32,
}

#[wasm_bindgen]
impl TQPayload {
    #[wasm_bindgen(getter)]
    pub fn data(&self) -> Vec<u8> {
        self.data.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn dim(&self) -> usize {
        self.dim
    }

    #[wasm_bindgen(getter)]
    pub fn norm(&self) -> f32 {
        self.norm
    }
}

/// Perform Randomized Hadamard Transform (RHT)
/// This "whitens" the vector, making coordinate distributions predictable (Beta/Gaussian).
fn fast_hadamard_transform(vec: &mut [f32]) {
    let n = vec.len();
    let mut h = 1;
    while h < n {
        for i in (0..n).step_by(h * 2) {
            for j in i..i + h {
                let x = vec[j];
                let y = vec[j + h];
                vec[j] = x + y;
                vec[j + h] = x - y;
            }
        }
        h *= 2;
    }
    let inv_sqrt_n = 1.0 / (n as f32).sqrt();
    for x in vec.iter_mut() {
        *x *= inv_sqrt_n;
    }
}

/// Core TurboQuant Quantization Kernel
/// 1. Normalize
/// 2. Randomly rotate (via Hadamard + diagonal +/- 1 matrix)
/// 3. Lloyd-Max quantize to 2-4 bits
#[wasm_bindgen]
pub fn quantize(vector: &[f32], seed: u32) -> TQPayload {
    let dim = vector.len();
    let mut vec = vector.to_vec();
    
    // 1. Calculate L2 Norm
    let norm = vec.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm > 0.0 {
        for x in vec.iter_mut() { *x /= norm; }
    }

    // 2. Apply "Random" diagonal matrix based on seed
    // (Simplified for bridge: we use the seed to flip signs)
    for (i, x) in vec.iter_mut().enumerate() {
        if (seed ^ (i as u32)).count_ones() % 2 == 1 {
            *x *= -1.0;
        }
    }

    // 3. Fast Hadamard Transform (FHT)
    // Note: dim must be a power of 2 for FHT.
    // If not, we should ideally zero-pad, but for this bridge we assume padded input.
    fast_hadamard_transform(&mut vec);

    // 4. Quantize to 4-bit (simplified from 2.5-bit for initial baseline)
    // We pack two 4-bit values per byte
    let mut packed_data = Vec::with_capacity((dim + 1) / 2);
    for chunk in vec.chunks(2) {
        let q1 = quantize_f32_to_4bit(chunk[0]);
        let q2 = if chunk.len() > 1 { quantize_f32_to_4bit(chunk[1]) } else { 0 };
        packed_data.push((q1 << 4) | (q2 & 0x0F));
    }

    TQPayload {
        data: packed_data,
        dim,
        norm,
    }
}

/// Estimate the inner product between two compressed vectors.
/// This uses the TurboQuant dequantization path.
#[wasm_bindgen]
pub fn estimate_inner_product(p1: &TQPayload, p2: &TQPayload) -> f32 {
    if p1.dim != p2.dim { return 0.0; }
    
    let mut sum = 0.0;
    for (b1, b2) in p1.data.iter().zip(p2.data.iter()) {
        // Dequantize pair 1
        let v1_a = dequantize_4bit_to_f32(b1 >> 4);
        let v1_b = dequantize_4bit_to_f32(b1 & 0x0F);
        
        // Dequantize pair 2
        let v2_a = dequantize_4bit_to_f32(b2 >> 4);
        let v2_b = dequantize_4bit_to_f32(b2 & 0x0F);
        
        sum += (v1_a * v2_a) + (v1_b * v2_b);
    }

    // TQ Inner product estimation: multiply by original norms
    sum * p1.norm * p2.norm
}

// Helpers for 4-bit Lloyd-Max approximation (Gaussian assumption after RHT)
fn quantize_f32_to_4bit(val: f32) -> u8 {
    // Clamping to [-1, 1] and mapping to 16 buckets
    let clamped = val.clamp(-1.0, 1.0);
    let mapped = ((clamped + 1.0) * 7.5).round() as u8;
    mapped.min(15)
}

fn dequantize_4bit_to_f32(val: u8) -> f32 {
    (val as f32 / 7.5) - 1.0
}
