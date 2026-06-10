# Component Contracts

## Change Classification

Structural and behavioral UI kit. It creates reusable layout, token, and content components without requiring a framework rewrite.

## Dependency Check

- React components assume React 18+.
- CSS is framework-agnostic and can be used without Tailwind.
- No external runtime animation library required.
- Optional fonts can be loaded through Google Fonts, self-hosted files, or existing project font pipeline.

## Contracts

### ChannelShell

Wraps every Channel: Zero page and sets theme scope.

```tsx
<ChannelShell theme="dark">...</ChannelShell>
```

### ChannelHeader

Primary sticky navigation. Accepts route labels and hrefs.

```tsx
<ChannelHeader navItems={[{ href: '/blog', label: 'Broadcasts' }]} />
```

### ArticleCard

Editorial card for index pages. Must include a valid href, title, excerpt, category, date, and readTime.

### SignalTag

Semantic label for content type. Use `kind` to determine token color.

Allowed kinds:

- featured
- skill
- verdict
- essay
- whitepaper

### SkillArticleTemplate

A content skeleton for SEO-friendly skill posts. It preserves the required Skills article structure:

- What It Does
- When To Use It
- Inputs Needed
- Output Contract
- Step-by-Step Method
- Example Prompt
- Example Output
- Failure Modes
- Upgrade Path

## Visual Law

- No hard-coded component colors.
- No unbounded z-index values.
- No hover movement that changes layout dimensions.
- No decorative animation without reduced-motion escape hatch.
- Red-orange is an accent, not the whole weather system.
