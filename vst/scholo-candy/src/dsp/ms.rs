use std::f32::consts::SQRT_2;

// SQRT_2 / 2.0
const INV_SQRT_2: f32 = 0.70710678118;

pub fn encode_ms(left: f32, right: f32) -> (f32, f32) {
    let mid = (left + right) * INV_SQRT_2;
    let side = (left - right) * INV_SQRT_2;
    (mid, side)
}

pub fn decode_ms(mid: f32, side: f32) -> (f32, f32) {
    let left = (mid + side) * INV_SQRT_2;
    let right = (mid - side) * INV_SQRT_2;
    (left, right)
}
