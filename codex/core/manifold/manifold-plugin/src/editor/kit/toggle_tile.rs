use std::sync::Arc;

use nih_plug::prelude::BoolParam;
use nih_plug_vizia::vizia::prelude::*;
use nih_plug_vizia::widgets::{ParamButton, ParamButtonExt};

use crate::ManifoldPluginParams;

/// Freeze-style boolean tile (spec §3.2 #3).
///
/// Double-label fix (Task 13, amendment A3): `ParamButton` renders its own
/// internal `Label` (the param's name by default), so adding a second `Label`
/// below duplicated the text. The tile's label is now carried INTO the button
/// via `ParamButtonExt::with_label`, which overrides the internal label —
/// one rendered label, and it lives inside the `:checked`-styled surface.
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
        let label = label.to_string();
        VStack::new(cx, move |cx| {
            ParamButton::new(cx, params, map).with_label(label);
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
    /// Plain fire-on-press action. Retained for non-momentary callers per
    /// Task 13 amendment A1 ("keep the existing `new` shape for other
    /// callers") even though the composed editor only uses `momentary`.
    #[allow(dead_code)]
    pub fn new<'a>(
        cx: &'a mut Context,
        label: &str,
        on_press: impl Fn(&mut EventContext) + 'static,
    ) -> Handle<'a, impl View> {
        let label = label.to_string();
        Button::new(cx, move |cx| on_press(cx), move |cx| Label::new(cx, &label))
            .class("action-button")
    }

    /// Momentary hold variant (Task 13, amendment A1): `on_press_down` fires
    /// when the hold starts, `on_release` when it ends. Reconciled against the
    /// pinned vizia rev (e3fab55):
    /// - `ActionModifiers::on_press_down` fires on `WindowEvent::PressDown`
    ///   (left mouse down over the view, or Space/Enter keydown while
    ///   focused). Key auto-repeat re-fires it, so the consumer must be
    ///   idempotent (the editor's Model guards with a held flag).
    /// - Mouse release: `Button` captures the mouse on `PressDown`
    ///   (`cx.capture()` in button.rs) and the event manager routes
    ///   `WindowEvent::MouseUp` directly to the captured entity, so
    ///   `on_mouse_up` fires even when the cursor is released off the view —
    ///   no stuck hold on drag-off.
    /// - Keyboard release: keyup of Space/Enter emits
    ///   `WindowEvent::Press { mouse: false }`, so `on_press` doubles as the
    ///   keyboard release hook (it also re-fires on an on-view mouse release;
    ///   redundant calls are harmless given an idempotent consumer).
    /// - `on_focus_out` is a safety net so focus loss mid-hold cannot latch
    ///   the action.
    pub fn momentary<'a>(
        cx: &'a mut Context,
        label: &str,
        on_press_down: impl Fn(&mut EventContext) + Send + Sync + 'static,
        on_release: impl Fn(&mut EventContext) + Send + Sync + 'static,
    ) -> Handle<'a, impl View> {
        let label = label.to_string();
        let release = Arc::new(on_release);
        let release_mouse = release.clone();
        let release_key = release.clone();
        let release_focus = release;

        Button::new(cx, |_| {}, move |cx| Label::new(cx, &label))
            .class("action-button")
            .on_press_down(on_press_down)
            .on_mouse_up(move |cx, button| {
                if button == MouseButton::Left {
                    release_mouse(cx);
                }
            })
            .on_press(move |cx| release_key(cx))
            .on_focus_out(move |cx| release_focus(cx))
    }
}
