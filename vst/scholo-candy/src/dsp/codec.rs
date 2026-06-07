use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use sha2::{Sha256, Digest};
use crc32fast::Hasher;
use super::filter_band::FilterType;

pub const SCHEMA_ID: &str = "scholomance/eq-preset";
pub const PRESET_VERSION: u32 = 2;
pub const BYTECODE_PREFIX: &str = "BIT-EQ-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Preset {
    pub version: u32,
    pub schema_id: String,
    pub name: String,
    pub school: School,
    pub output_gain_db: f32,
    pub bands: Vec<Band>,
    pub oversample: OversampleKind,
    #[serde(default)]
    pub analyzer: Option<AnalyzerConfig>,
    pub bytecode: String,
    pub checksum: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum School { Sonic, Psychic, Void, Alchemy, Will, Neutral }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Copy)]
pub enum OversampleKind { 
    #[serde(rename = "1x")] X1, 
    #[serde(rename = "2x")] X2, 
    #[serde(rename = "4x")] X4, 
    #[serde(rename = "8x")] X8,
    #[serde(rename = "auto")] Auto,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AnalyzerConfig {
    pub enabled: bool,
    pub peak_hold_ms: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Copy)]
#[serde(rename_all = "camelCase")]
pub enum ChannelKind { Stereo, Mid, Side, L, R }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Band {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: FilterType,
    pub frequency: f32,
    pub gain: f32,
    #[serde(rename = "Q")]
    pub q: f32,
    pub channel: ChannelKind,
    pub oversample: OversampleKind,
    pub bypass: bool,
}

impl Band {
    pub fn id_seed(&self) -> String {
        format!("{}_{}_{:.3}_{:.6}_{:.3}_{:?}_{:?}", 
            self.kind.to_string(),
            self.channel.to_string(),
            self.frequency,
            self.gain,
            self.q,
            self.oversample,
            self.bypass
        )
    }
}

impl ToString for FilterType {
    fn to_string(&self) -> String {
        match self {
            FilterType::Bell => "bell".to_string(),
            FilterType::LowShelf => "lowShelf".to_string(),
            FilterType::HighShelf => "highShelf".to_string(),
            FilterType::LowPass => "lowPass".to_string(),
            FilterType::HighPass => "highPass".to_string(),
            FilterType::Notch => "notch".to_string(),
            FilterType::BandPass => "bandPass".to_string(),
            FilterType::AllPass => "allPass".to_string(),
            FilterType::Tilt => "tilt".to_string(),
        }
    }
}

impl ToString for ChannelKind {
    fn to_string(&self) -> String {
        match self {
            ChannelKind::Stereo => "stereo".to_string(),
            ChannelKind::Mid => "mid".to_string(),
            ChannelKind::Side => "side".to_string(),
            ChannelKind::L => "L".to_string(),
            ChannelKind::R => "R".to_string(),
        }
    }
}

impl Preset {
    pub fn canonical_bytes(&self) -> Vec<u8> {
        serde_json::to_vec(self).expect("Preset is always serializable")
    }

    pub fn canonical_bytes_without_bytecode(&self) -> Vec<u8> {
        let mut clone = self.clone();
        clone.bytecode = "".to_string();
        clone.checksum = "".to_string();
        // Since we want canonical format and BTreeMap sorts by keys, 
        // we could convert to BTreeMap if we want strict field ordering, 
        // but serde_json::to_vec with default struct serialization gives fixed field ordering.
        serde_json::to_vec(&clone).expect("Preset is always serializable")
    }

    pub fn recompute(&mut self) {
        self.version = PRESET_VERSION;
        self.schema_id = SCHEMA_ID.to_string();
        
        for b in &mut self.bands {
            let seed = b.id_seed();
            let mut hasher = Sha256::new();
            hasher.update(seed.as_bytes());
            let hash = hasher.finalize();
            let encoded = base32::encode(base32::Alphabet::RFC4648 { padding: false }, &hash[..8]);
            // 12-char base32
            b.id = format!("band_{}", &encoded.to_lowercase()[..12]);
        }
        
        let bytes = self.canonical_bytes_without_bytecode();
        
        let mut sha256_hasher = Sha256::new();
        sha256_hasher.update(&bytes);
        self.checksum = hex::encode(sha256_hasher.finalize());
        
        let mut crc_hasher = Hasher::new();
        crc_hasher.update(&bytes);
        self.bytecode = format!("{}-{:08x}", BYTECODE_PREFIX, crc_hasher.finalize());
    }
}
