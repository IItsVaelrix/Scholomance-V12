use std::sync::Arc;

use nih_plug::prelude::BoolParam;
use nih_plug_vizia::vizia::prelude::*;
use nih_plug_vizia::widgets::ParamButton;

use crate::ManifoldPluginParams;

/// Freeze-style boolean tile (spec §3.2 #3).
pub struct ToggleTile;

impl ToggleTile {
    pub fn new<'a, L, FMap>(
        cx: &'a mut Context,
        label: &str,
        params: L,
        map: FMap,
    ) -> Handle<'a, impl View>
    where
        L: Lens<Target = Arc<ManifoldPluginParams>> + Clone,
        FMap: Fn(&Arc<ManifoldPluginParams>) -> &BoolParam + Copy + 'static,
    {
        VStack::new(cx, move |cx| {
            ParamButton::new(cx, params, map);
            Label::new(cx, label).class("knob-label");
        })
        .class("toggle-tile")
    }
}

/// Panic-style momentary action (spec §3.2 #4). Reconciled against the
/// pinned vizia rev: `Button::new` here takes `(cx, action, content)`
/// rather than `(cx, content).on_press(..)` — the action closure fires on
/// press, and `content` builds the label.
pub struct ActionButton;

impl ActionButton {
    pub fn new<'a>(
        cx: &'a mut Context,
        label: &str,
        on_press: impl Fn(&mut EventContext) + 'static,
    ) -> Handle<'a, impl View> {
        let label = label.to_string();
        Button::new(cx, move |cx| on_press(cx), move |cx| Label::new(cx, &label))
            .class("action-button")
    }
}
