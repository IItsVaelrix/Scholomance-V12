use nih_plug_egui::egui::Color32;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SchoolTheme {
    Void,
    Sonic,
    Will,
    Alchemy,
    Psychic,
    Neutral,
}

impl Default for SchoolTheme {
    fn default() -> Self {
        Self::Neutral
    }
}

impl SchoolTheme {
    /// Deterministic per-band school assignment so every band ring carries its own
    /// school color instead of one hardcoded neutral gray (PDR §6 band/school mapping,
    /// Definition of Done §5). Cycles the six schools by band index.
    pub fn for_band(index: usize) -> SchoolTheme {
        const ORDER: [SchoolTheme; 6] = [
            SchoolTheme::Void,
            SchoolTheme::Sonic,
            SchoolTheme::Will,
            SchoolTheme::Alchemy,
            SchoolTheme::Psychic,
            SchoolTheme::Neutral,
        ];
        ORDER[index % ORDER.len()]
    }
}

pub struct ThemeColors {
    pub fill: Color32,
    pub stroke: Color32,
    pub glow: Color32,
}

pub fn get_school_colors(school: SchoolTheme) -> ThemeColors {
    match school {
        SchoolTheme::Void => ThemeColors {
            fill: Color32::from_rgba_premultiplied(40, 50, 70, 200),
            stroke: Color32::from_rgb(100, 120, 160),
            glow: Color32::from_rgba_premultiplied(100, 120, 160, 50),
        },
        SchoolTheme::Sonic => ThemeColors {
            fill: Color32::from_rgba_premultiplied(200, 162, 39, 200),
            stroke: Color32::from_rgb(255, 215, 0),
            glow: Color32::from_rgba_premultiplied(255, 215, 0, 50),
        },
        SchoolTheme::Will => ThemeColors {
            fill: Color32::from_rgba_premultiplied(150, 50, 20, 200),
            stroke: Color32::from_rgb(220, 90, 40),
            glow: Color32::from_rgba_premultiplied(220, 90, 40, 50),
        },
        SchoolTheme::Alchemy => ThemeColors {
            fill: Color32::from_rgba_premultiplied(30, 120, 80, 200),
            stroke: Color32::from_rgb(50, 200, 120),
            glow: Color32::from_rgba_premultiplied(50, 200, 120, 50),
        },
        SchoolTheme::Psychic => ThemeColors {
            fill: Color32::from_rgba_premultiplied(100, 40, 120, 200),
            stroke: Color32::from_rgb(180, 80, 220),
            glow: Color32::from_rgba_premultiplied(180, 80, 220, 50),
        },
        SchoolTheme::Neutral => ThemeColors {
            fill: Color32::from_rgba_premultiplied(80, 80, 80, 200),
            stroke: Color32::from_rgb(180, 180, 180),
            glow: Color32::from_rgba_premultiplied(180, 180, 180, 50),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_school_color_mapping_outputs() {
        // Void
        let void = get_school_colors(SchoolTheme::Void);
        assert_eq!(void.stroke, Color32::from_rgb(100, 120, 160));
        
        // Sonic
        let sonic = get_school_colors(SchoolTheme::Sonic);
        assert_eq!(sonic.stroke, Color32::from_rgb(255, 215, 0));
        
        // Will
        let will = get_school_colors(SchoolTheme::Will);
        assert_eq!(will.stroke, Color32::from_rgb(220, 90, 40));
        
        // Alchemy
        let alchemy = get_school_colors(SchoolTheme::Alchemy);
        assert_eq!(alchemy.stroke, Color32::from_rgb(50, 200, 120));
        
        // Psychic
        let psychic = get_school_colors(SchoolTheme::Psychic);
        assert_eq!(psychic.stroke, Color32::from_rgb(180, 80, 220));
        
        // Neutral
        let neutral = get_school_colors(SchoolTheme::Neutral);
        assert_eq!(neutral.stroke, Color32::from_rgb(180, 180, 180));
    }
}
