use nih_plug_vizia::vizia::prelude::*;

/// Titled container primitive (spec §3.2 #1). Header + body.
pub struct PanelCard;

impl PanelCard {
    pub fn new<'a>(
        cx: &'a mut Context,
        title: &str,
        content: impl Fn(&mut Context) + 'static,
    ) -> Handle<'a, impl View> {
        VStack::new(cx, move |cx| {
            Label::new(cx, title).class("panel-card-title");
            VStack::new(cx, |cx| content(cx));
        })
        .class("panel-card")
    }
}
