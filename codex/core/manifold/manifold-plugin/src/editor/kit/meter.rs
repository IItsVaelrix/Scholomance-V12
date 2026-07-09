use nih_plug_vizia::vizia::prelude::*;

/// Thin level bar (spec §3.2 #6). `level` is a 0..1 lens (see meter::peak_to_meter).
pub struct Meter;

impl Meter {
    pub fn new<'a>(cx: &'a mut Context, level: impl Lens<Target = f32>) -> Handle<'a, impl View> {
        VStack::new(cx, move |cx| {
            Element::new(cx)
                .class("meter-fill")
                .height(level.map(|v| Percentage(v.clamp(0.0, 1.0) * 100.0)))
                .width(Stretch(1.0));
        })
        .class("meter")
    }
}
