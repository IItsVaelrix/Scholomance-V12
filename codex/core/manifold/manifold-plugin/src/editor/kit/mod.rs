//! Reusable vizia view kit. Every view consumes theme.css classes only.
//!
//! NOTE: only modules that actually exist are declared here. The brief for
//! this task lists all six planned kit modules, but tasks 8-11 land the
//! remaining ones (`manifold_map`, `meter`, `knob`, `preset_chip`,
//! `toggle_tile`) — declaring them before they exist would break the build.
pub mod panel_card;
