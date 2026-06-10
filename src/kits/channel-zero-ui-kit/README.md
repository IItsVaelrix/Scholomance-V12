# The Scholomance Channel: Zero UI Kit

A code-ready editorial UI kit for the Scholomance blog layer: dark arcane-tech, readable longform, deterministic styling, and signal-first content hierarchy.

## Intent

Channel: Zero is the origin feed: essays, skills, postmortems, white papers, and creative engineering doctrine. The kit is designed for a blog that feels like a forbidden broadcast terminal without sacrificing accessibility or SEO readability.

## Kit Contents

```txt
channel-zero-ui-kit/
  tokens/channel-zero.tokens.css
  styles/channel-zero.css
  components/
    ChannelShell.tsx
    ChannelHeader.tsx
    GlyphButton.tsx
    SignalTag.tsx
    ArticleCard.tsx
    ArticleHero.tsx
    TableOfContents.tsx
    CodeRuneBlock.tsx
    NewsletterSigil.tsx
    SkillArticleTemplate.tsx
  examples/
    BlogIndexPage.tsx
    ArticlePage.tsx
  docs/
    component-contracts.md
    qa-checklist.md
```

## Integration

1. Import tokens first.
2. Import the component stylesheet second.
3. Use the React components, or copy the classes into your existing component structure.

```tsx
import './tokens/channel-zero.tokens.css';
import './styles/channel-zero.css';
```

## Design Rules

- Use CSS variables, not hard-coded visual values in components.
- Keep glow restrained: active, selected, featured, warning, or CTA only.
- Preserve longform readability above ornament.
- Motion must respect `prefers-reduced-motion`.
- Avoid hover-induced layout shift.
- Keep all cards and actions keyboard-visible.

## Recommended Routes

```txt
/blog
/blog/[slug]
/skills
/skills/[skill-slug]
/verdicts
/whitepapers
```

## Voice

The UI should feel like a lucid signal leaking out of a sealed academy terminal: editorial, mythic, precise, and dangerous only in silhouette.
