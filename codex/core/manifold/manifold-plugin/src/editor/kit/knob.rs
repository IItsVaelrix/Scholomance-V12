use std::sync::Arc;

use nih_plug::prelude::Param;
use nih_plug_vizia::vizia::prelude::*;
use nih_plug_vizia::widgets::ParamSlider;

use crate::ManifoldPluginParams;

/// Rotary macro (spec §3.2 #2). Label above, ParamSlider (keyboard + scroll +
/// double-click reset come free from nih_plug_vizia; the slider renders the
/// value text itself).
pub struct Knob;

impl Knob {
    pub fn new<'a, L, P, FMap>(
        cx: &'a mut Context,
        label: &str,
        params: L,
        map: FMap,
    ) -> Handle<'a, impl View>
    where
        L: Lens<Target = Arc<ManifoldPluginParams>> + Clone,
        P: Param + 'static,
        FMap: Fn(&Arc<ManifoldPluginParams>) -> &P + Copy + 'static,
    {
        VStack::new(cx, move |cx| {
            Label::new(cx, label).class("knob-label");
            ParamSlider::new(cx, params, map);
        })
        .class("knob")
    }
}
