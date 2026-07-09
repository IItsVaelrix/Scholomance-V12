//! Reusable vizia view kit. Every view consumes theme.css classes only.
//!
//! NOTE: only modules that actually exist are declared here. The brief for
//! this task lists all six planned kit modules, but tasks 10-11 land the
//! remaining ones (`manifold_map`, `meter`, `preset_chip`) —
//! declaring them before they exist would break the build.
pub mod knob;
pub mod panel_card;
pub mod toggle_tile;
