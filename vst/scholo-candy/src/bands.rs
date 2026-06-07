use std::env;

pub struct BandCatalog;

impl BandCatalog {
    pub fn count() -> usize {
        if let Ok(val) = env::var("BAND_COUNT") {
            if let Ok(count) = val.parse::<usize>() {
                return count.clamp(1, 12);
            }
        }
        6
    }
}
