use serde::{Serialize, Deserialize};
use nih_plug::prelude::Enum;
use crate::dsp::topology::{TopologyState, Topology};

#[derive(Debug, Clone, Copy, PartialEq, Enum, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FilterType {
    #[id = "bell"]
    #[name = "Bell"]
    Bell,
    #[id = "lowshelf"]
    #[name = "Low Shelf"]
    LowShelf,
    #[id = "highshelf"]
    #[name = "High Shelf"]
    HighShelf,
    #[id = "lowpass"]
    #[name = "Low Pass"]
    LowPass,
    #[id = "highpass"]
    #[name = "High Pass"]
    HighPass,
    #[id = "notch"]
    #[name = "Notch"]
    Notch,
    #[id = "bandpass"]
    #[name = "Band Pass"]
    BandPass,
    #[id = "allpass"]
    #[name = "All Pass"]
    AllPass,
    #[id = "tilt"]
    #[name = "Tilt"]
    Tilt,
}

#[derive(Debug, Clone, Copy, PartialEq, Enum, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ChannelKind {
    #[id = "stereo"]
    #[name = "Stereo"]
    Stereo,
    #[id = "mid"]
    #[name = "Mid"]
    Mid,
    #[id = "side"]
    #[name = "Side"]
    Side,
    #[id = "left"]
    #[name = "Left"]
    Left,
    #[id = "right"]
    #[name = "Right"]
    Right,
}

#[derive(Debug, Clone)]
pub struct FilterBand {
    pub enabled: bool,
    pub filter_type: FilterType,
    pub channel: ChannelKind,
    pub frequency_hz: f32,
    pub gain_db: f32,
    pub q: f32,
    
    // Internal state
    topology_l: TopologyState,
    topology_r: TopologyState,
    sample_rate: f32,
}

impl FilterBand {
    pub fn new(sample_rate: f32) -> Self {
        let mut band = Self {
            enabled: true,
            filter_type: FilterType::Bell,
            channel: ChannelKind::Stereo,
            frequency_hz: 1000.0,
            gain_db: 0.0,
            q: 1.0,
            topology_l: TopologyState::new(FilterType::Bell),
            topology_r: TopologyState::new(FilterType::Bell),
            sample_rate,
        };
        band.update_topology();
        band
    }

    pub fn set_params(&mut self, enabled: bool, filter_type: FilterType, channel: ChannelKind, freq: f32, gain: f32, q: f32) {
        let type_changed = self.filter_type != filter_type;
        let dirty = type_changed || 
                    self.enabled != enabled || 
                    self.channel != channel ||
                    (self.frequency_hz - freq).abs() > 1e-4 || 
                    (self.gain_db - gain).abs() > 1e-4 || 
                    (self.q - q).abs() > 1e-4;

        self.enabled = enabled;
        self.filter_type = filter_type;
        self.channel = channel;
        self.frequency_hz = freq.clamp(20.0, 20000.0);
        self.gain_db = gain.clamp(-24.0, 24.0);
        self.q = q.clamp(0.1, 18.0);

        if dirty {
            if type_changed {
                self.topology_l = TopologyState::new(self.filter_type);
                self.topology_r = TopologyState::new(self.filter_type);
            }
            self.update_topology();
        }
    }

    pub fn set_sample_rate(&mut self, sample_rate: f32) {
        if (self.sample_rate - sample_rate).abs() > 1.0 {
            self.sample_rate = sample_rate;
            self.update_topology();
        }
    }

    fn update_topology(&mut self) {
        self.topology_l.update_params(self.filter_type, self.frequency_hz, self.q, self.gain_db, self.sample_rate);
        self.topology_r.update_params(self.filter_type, self.frequency_hz, self.q, self.gain_db, self.sample_rate);
    }

    #[inline]
    pub fn process_routed(&mut self, mut l: f32, mut r: f32, mut m: f32, mut s: f32) -> (f32, f32, f32, f32) {
        if !self.enabled {
            return (l, r, m, s);
        }
        
        match self.channel {
            ChannelKind::Stereo => {
                l = self.topology_l.process(l);
                r = self.topology_r.process(r);
                let (nm, ns) = crate::dsp::ms::encode_ms(l, r);
                m = nm; s = ns;
            }
            ChannelKind::Left => {
                l = self.topology_l.process(l);
                let (nm, ns) = crate::dsp::ms::encode_ms(l, r);
                m = nm; s = ns;
            }
            ChannelKind::Right => {
                r = self.topology_r.process(r);
                let (nm, ns) = crate::dsp::ms::encode_ms(l, r);
                m = nm; s = ns;
            }
            ChannelKind::Mid => {
                m = self.topology_l.process(m);
                let (nl, nr) = crate::dsp::ms::decode_ms(m, s);
                l = nl; r = nr;
            }
            ChannelKind::Side => {
                s = self.topology_r.process(s);
                let (nl, nr) = crate::dsp::ms::decode_ms(m, s);
                l = nl; r = nr;
            }
        }
        
        (l, r, m, s)
    }

    #[inline]
    pub fn process_stereo(&mut self, left: f32, right: f32) -> (f32, f32) {
        let (m, s) = crate::dsp::ms::encode_ms(left, right);
        let (l, r, _, _) = self.process_routed(left, right, m, s);
        (l, r)
    }
    
    pub fn reset(&mut self) {
        self.topology_l.reset();
        self.topology_r.reset();
    }
    
    pub fn magnitude_response(&self, freq_hz: f32) -> f32 {
        self.topology_l.magnitude_response(freq_hz, self.sample_rate)
    }
}
