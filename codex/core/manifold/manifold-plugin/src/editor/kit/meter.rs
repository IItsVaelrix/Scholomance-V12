use nih_plug_vizia::vizia::prelude::*;

/// Thin level bar (spec §3.2 #6). `level` is a 0..1 lens (see meter::peak_to_meter).
///
/// Horizontal: the track (`.meter`, sized by theme.css) stretches across its
/// rail and the fill grows left-to-right — matching the spec §4 meter rail,
/// which reads as labeled rows ("out L" / "out R").
pub struct Meter;

impl Meter {
    pub fn new<'a>(cx: &'a mut Context, level: impl Lens<Target = f32>) -> Handle<'a, impl View> {
        HStack::new(cx, move |cx| {
            Element::new(cx)
                .class("meter-fill")
                .width(level.map(|v| Percentage(v.clamp(0.0, 1.0) * 100.0)))
                .height(Stretch(1.0));
        })
        .class("meter")
    }
}
