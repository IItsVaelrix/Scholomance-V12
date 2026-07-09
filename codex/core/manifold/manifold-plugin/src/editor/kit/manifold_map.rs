use nih_plug_vizia::vizia::prelude::*;

const ZONES: [&str; 6] = ["floor", "ceiling", "left", "right", "front", "core"];

/// Hero radial visualizer (spec §3.2 #7). Six zone nodes; the core scales with
/// live energy (0..1) published by the audio thread.
///
/// Reconciled against the pinned vizia rev (e3fab55): the brief's
/// `.scale(energy.map(|e| Scale::new(..)))` does not compile — `scale`'s
/// modifier bound is `impl Res<U> where U: Into<Scale>`, and the blanket
/// `impl<L: Lens> Res<L::Target> for L` additionally requires
/// `L::Target: Data`. `vizia_style::Scale` has no `Data` impl (confirmed:
/// no `impl Data for Scale` in `vizia_core::binding::data`, unlike e.g.
/// `Color` or `morphorm::Units`), so `Map<L, Scale>` cannot satisfy `Res`.
/// A literal `Scale` value *does* satisfy `Res<Scale>` directly
/// (`impl_res_clone!(Scale)`), so instead of binding the modifier to a
/// mapped lens, `Binding` rebuilds the core element from a plain `Scale`
/// value each time `energy` changes. Public shape unchanged:
/// `ManifoldMap::new(cx, energy_lens)`.
pub struct ManifoldMap;

impl ManifoldMap {
    pub fn new<'a>(
        cx: &'a mut Context,
        energy: impl Lens<Target = f32> + Copy,
    ) -> Handle<'a, impl View> {
        ZStack::new(cx, move |cx| {
            for z in ZONES {
                Element::new(cx).class("manifold-zone").class(z);
            }
            Binding::new(cx, energy, |cx, energy| {
                let e = energy.get(cx).clamp(0.0, 1.0);
                let s = 0.6 + e * 0.5;
                Element::new(cx).class("manifold-core").scale(Scale::new(s, s));
            });
        })
        .class("manifold-map")
    }
}
