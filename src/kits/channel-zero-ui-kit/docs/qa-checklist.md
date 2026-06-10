# QA Checklist

## Visual Regression

- Check desktop width: 1440px.
- Check laptop width: 1280px.
- Check tablet width: 768px.
- Check mobile width: 390px.
- Confirm featured card spans wider on desktop and stacks on mobile.
- Confirm no text is unreadable in light theme.

## Accessibility

- Tab through header, article cards, form, and all CTAs.
- Confirm visible focus ring on every interactive element.
- Confirm article page has one h1.
- Confirm nav has `aria-label`.
- Confirm newsletter input has an accessible label.
- Run Lighthouse accessibility pass.

## Motion Safety

- Enable reduced motion in OS or browser dev tools.
- Confirm hover lift is suppressed.
- Confirm scanline/grid overlays do not block clicks.

## Content QA

- Article titles should stay under 70 characters when possible.
- Excerpts should be 120 to 180 characters.
- Every Skill article should include the full skill template sections.
- Every post should have category, date, read time, and canonical slug.

## Integration Retest Steps

1. Import `tokens/channel-zero.tokens.css` before `styles/channel-zero.css`.
2. Render `BlogIndexPage`.
3. Render `ArticlePage`.
4. Switch `ChannelShell` to `theme="light"`.
5. Resize browser from 1440px to 390px.
6. Tab through every interactive element.
7. Inspect CSS for accidental hard-coded colors in new components.
