professional-ui-architect-skill.md
# Skill: Professional UI Architect

## Purpose

Generate professional, deterministic, accessible, responsive UI code from structured data, application state, and design-system constraints.

This skill treats UI as a **state renderer**, not a static image. Every visual element must be traceable to data, tokens, layout rules, or interaction state.

---

## Use This Skill When

Use this skill for:

- Web app UI generation
- Dashboard layouts
- Admin panels
- Creative tool interfaces
- E-commerce UI
- SaaS product screens
- Form-heavy workflows
- Interactive prototypes
- Component libraries
- State-driven animation systems
- Design-system enforcement

Do **not** use this skill to generate static concept art, image mockups, moodboards, or non-interactive visual-only screens.

---

## Core Principle

A professional UI is not a picture.

A professional UI is:

```txt
structured data
  → explicit state
  → deterministic layout
  → design-system tokens
  → accessible interaction
  → responsive rendering

If the data changes, the UI must update predictably.

If the viewport changes, the layout must adapt without breaking.

If the user interacts, the state must explain the visual change.

Required Inputs

Before generating code, identify or infer:

targetPlatform: web | ios | android | desktop
appType: dashboard | ecommerce | creative-tool | editor | marketing | admin | other
framework: react | vue | svelte | vanilla | other
stylingSystem: css-modules | tailwind | styled-components | plain-css | other
animationSystem: framer-motion | css-transitions | none | other
designTokens: colors, spacing, radius, typography, shadows
dataModel: JSON shape or expected API payload
interactionStates: loading, empty, error, success, selected, hovered, disabled
accessibilityRequirements: keyboard, screen-reader, contrast, reduced-motion

If any input is missing, make the smallest safe assumption and state it.

Non-Negotiable Laws
1. JSON-to-UI Mapping

Every generated UI must be driven by structured data.

Bad:

<div className="card">
  <h3>Revenue</h3>
  <p>$42,000</p>
</div>

Good:

const metric = {
  label: "Revenue",
  value: "$42,000",
  trend: "up",
};

<MetricCard metric={metric} />

The UI must expose a clear map:

data field → component prop → visual state
2. Design System Compliance

The AI must not invent unauthorized styles.

All colors, spacing, typography, borders, shadows, and radii must come from approved tokens.

Bad:

color: #7b61ff;
padding: 17px;
border-radius: 13px;

Good:

color: var(--color-accent);
padding: var(--space-4);
border-radius: var(--radius-md);

If tokens are missing, define them centrally before using them.

Never scatter magic numbers through components.

3. Responsive Flexbox and Grid Only

Layouts must use CSS Flexbox and CSS Grid as the primary layout engines.

Allowed:

display: flex;
display: grid;
grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));

Avoid:

position: absolute;
left: 37px;
top: 122px;

Absolute positioning is allowed only for overlays, popovers, tooltips, cursors, decorative layers, or canvas-like editors.

4. State-Driven Animations

Animations must be triggered by state changes, not random timing or visual guesswork.

Good:

<motion.div
  animate={{
    opacity: isOpen ? 1 : 0,
    y: isOpen ? 0 : 8,
  }}
/>

Bad:

<motion.div animate={{ y: Math.random() * 20 }} />

Animations must honor reduced-motion preferences.

const shouldReduceMotion = useReducedMotion();

const motionProps = shouldReduceMotion
  ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } }
  : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };
5. Accessibility Is Structural

Generated UI must include:

Semantic HTML
Keyboard navigation
Visible focus states
ARIA only when semantic HTML is insufficient
Screen-reader readable labels
Reduced-motion handling
Color contrast safety
No information conveyed by color alone

Bad:

<div onClick={save}>Save</div>

Good:

<button type="button" onClick={save}>
  Save
</button>
6. Deterministic Output

Given the same:

data
tokens
state
viewport

the UI must render the same result.

Do not use:

Math.random()
Date.now()
performance.now()
unseeded animation randomness
hard-coded hidden global state

unless explicitly isolated and justified.

Why Visual Generative AI Fails Here

Visual image generators fail professional UI generation because they produce pixels, not systems.

They are usually:

non-deterministic
non-interactive
non-semantic
non-responsive
inaccessible
not connected to data
unable to handle real app state

A generated mockup can look impressive and still be unusable.

This skill prioritizes interface machinery over decorative illusion.

Required Output Format

When producing UI work, respond using this structure:

## Summary

What is being built or changed.

## Assumptions

Any missing platform, framework, token, or state assumptions.

## Data Contract

The JSON/data shape driving the UI.

## State Model

The UI states and what triggers them.

## Design Tokens

Only the allowed tokens used.

## Component Architecture

Component breakdown and ownership.

## Code

Changed or generated code.

## Accessibility Notes

Keyboard, screen-reader, focus, contrast, and reduced-motion behavior.

## Responsive Behavior

How the layout adapts at small, medium, and large widths.

## QA Checklist

Exact tests or manual checks.

## Risks

What could break or need follow-up.
Component Generation Rules

Every component must have:

clear props
explicit state source
tokenized styles
responsive layout
empty/loading/error states when relevant
accessible labels
keyboard behavior when interactive
reduced-motion behavior when animated

Preferred component shape:

export function ComponentName({
  data,
  state,
  onAction,
}) {
  return (
    <section aria-labelledby="component-title">
      ...
    </section>
  );
}

Avoid components that secretly depend on unrelated globals.

CSS Rules

Prefer:

.component {
  display: grid;
  gap: var(--space-4);
  color: var(--color-text-primary);
}

Avoid:

.component {
  margin-left: 23px;
  color: #e9d8a6;
}

Use container-safe responsive patterns:

.panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: var(--space-4);
}
Animation Rules

Animations must be:

state-driven
interruptible
reduced-motion safe
layout-safe
non-random
short
purposeful

Allowed animation purposes:

entering/exiting UI
confirming state change
showing loading/progress
guiding attention
revealing hierarchy
communicating drag/drop or selection

Disallowed animation purposes:

random decoration
constant distraction
inaccessible motion
non-deterministic visual noise
animation hiding layout problems
Data-to-UI Mapping Example

Input:

{
  "user": {
    "name": "Vaelrix",
    "role": "Audio Engineer"
  },
  "metrics": [
    {
      "label": "Projects",
      "value": 12,
      "status": "healthy"
    },
    {
      "label": "Open Bugs",
      "value": 3,
      "status": "warning"
    }
  ]
}

Mapping:

user.name → header title
user.role → header subtitle
metrics[] → MetricCard list
metric.status → tokenized visual variant

The UI must never hard-code these values if they belong to data.

Token Example
:root {
  --color-bg: #0b0d10;
  --color-surface: #11161d;
  --color-surface-raised: #171d26;
  --color-text-primary: #f4f0e8;
  --color-text-muted: #a7a29a;
  --color-accent: #c9a227;
  --color-danger: #ff5a5f;
  --color-warning: #f7b955;
  --color-success: #6ee7a8;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  --radius-sm: 0.375rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;

  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
}

These are sample tokens only. If a project already has tokens, use the project tokens instead.

Professional UI Audit Checklist

Before finalizing any generated UI, verify:

[ ] UI is driven by JSON/data, not hard-coded display values.
[ ] All colors use tokens.
[ ] All spacing uses tokens.
[ ] Typography uses defined scale.
[ ] Layout uses Flexbox/Grid.
[ ] No fragile absolute positioning.
[ ] Loading state exists.
[ ] Empty state exists.
[ ] Error state exists.
[ ] Interactive elements use semantic HTML.
[ ] Keyboard navigation works.
[ ] Focus state is visible.
[ ] Reduced-motion is respected.
[ ] Animations are state-driven.
[ ] Layout works at mobile, tablet, desktop widths.
[ ] No random or nondeterministic visual behavior.
[ ] Component props are explicit.
[ ] Styling is maintainable and scoped.
Failure Conditions

Reject or revise generated UI if:

it is only a static image
it cannot respond to data changes
it invents unauthorized styles
it ignores accessibility
it breaks on small screens
it uses hard-coded visual magic numbers everywhere
it depends on randomness
it has animation unrelated to state
it cannot be tested
Final Instruction

When generating professional UI, do not design a screenshot.

Design a deterministic interface system.

Every pixel must have a reason.
Every state must have a source.
Every motion must have a trigger.
Every style must come from law.


---

## QA Checklist

- Skill directly covers **JSON-to-UI mapping**.
- Skill enforces **design-system compliance**.
- Skill requires **Flexbox/Grid responsive layout**.
- Skill requires **state-driven animation**.
- Skill explains why static visual generation fails.
- Skill is usable as a system/developer prompt for Codex, Claude, or local agents.

## Next Risk

The next upgrade would be making this project-specific by binding it to your Scholomance tokens, compo
