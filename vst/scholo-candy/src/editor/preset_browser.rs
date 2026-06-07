use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct PresetEntry {
    pub name: String,
    pub path: PathBuf,
}

pub struct PresetBrowserState {
    pub presets: Vec<PresetEntry>,
    pub selected: Option<usize>,
    pub last_scan_error: Option<String>,
}

impl PresetBrowserState {
    pub fn new() -> Self {
        Self {
            presets: Vec::new(),
            selected: None,
            last_scan_error: None,
        }
    }

    pub fn refresh_from_dir(&mut self, dir: &Path) {
        self.presets.clear();
        self.last_scan_error = None;
        match std::fs::read_dir(dir) {
            Ok(entries) => {
                for entry in entries.filter_map(Result::ok) {
                    let path = entry.path();
                    if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
                        if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                            // Basic filter for now to only include valid-looking files
                            if name.ends_with(".scroll") {
                                self.presets.push(PresetEntry {
                                    name: name.replace(".scroll", ""),
                                    path,
                                });
                            }
                        }
                    }
                }
                self.presets.sort_by(|a, b| a.name.cmp(&b.name));
            }
            Err(e) => {
                self.last_scan_error = Some(e.to_string());
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use tempfile::tempdir;

    #[test]
    fn test_preset_scan_ignores_invalid_files() {
        let dir = tempdir().unwrap();
        let path = dir.path();
        
        // Create a valid scroll
        File::create(path.join("valid.scroll.json")).unwrap();
        // Create an invalid one (not json extension)
        File::create(path.join("invalid.scroll.txt")).unwrap();
        // Create a json but not a scroll
        File::create(path.join("other.json")).unwrap();
        
        let mut browser = PresetBrowserState::new();
        browser.refresh_from_dir(path);
        
        // Should only pick up valid.scroll
        assert_eq!(browser.presets.len(), 1);
        assert_eq!(browser.presets[0].name, "valid");
        assert!(browser.last_scan_error.is_none());
    }
}
