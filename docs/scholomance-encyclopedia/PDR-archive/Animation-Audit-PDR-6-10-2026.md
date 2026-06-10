PDR: Read/Truesight Animation Findings Remediation

File: animation-findings-remediation-PDR.md
Status: Ready for Codex implementation
Classification: Behavioral + Accessibility + Structural cleanup
Priority: Medium-high
Primary Goal: Fix the remaining Animation Archaeology findings without disturbing the working animation layer.

1. Executive Summary

The Animation Archaeology audit found the Read/Truesight animation system is mostly healthy: key loops are cancelled, Oracle CSS animations are reduced-motion gated, title animations clean up timers, and Truesight debug pulse already disables under reduced-motion. The remaining defects are narrow: two Framer Motion paths in ScrollEditor.jsx bypass reduced-motion, one spin animation appears orphaned or mis-scoped, and the animationSignal → AnimatedSurface → computeAnimationSpec chain needs a documented contract.

This PDR fixes those findings with small, composable edits:

Gate ScrollEditor.jsx root mount animation with usePrefersReducedMotion.
Gate spellcheck-orb motion with the same reduced-motion source.
Verify and either remove, relocate, or explicitly bind the spin animation.
Add a short ADR documenting the AMP animation signal contract.
Add regression tests or grep-based checks to prevent reduced-motion regressions.
2. Change Classification
Area	Classification	Why
ScrollEditor.jsx root motion	Behavioral	Runtime animation behavior changes when reduced-motion is enabled.
spellcheck-orb motion	Behavioral	Tooltip/orb entrance behavior changes under reduced-motion.
spin keyframes/binding	Structural cleanup	Removes or clarifies a likely orphaned CSS animation.
AMP animation contract ADR	Documentation / Architectural support	Makes animationSignal → AnimatedSurface traceable for future maintainers.
Regression tests	Structural	Adds safety rails without changing production behavior.
3. Source Findings

The audit explicitly marks these as failures or unresolved:

Finding	Evidence	Desired state
ScrollEditor.jsx root motion.div always animates	Audit says the root entrance animation runs even in reduced-motion because initial and transition are unconditional.	Reduced-motion users get no translate/entrance animation.
spellcheck-orb has no reduced-motion branch	Audit says the spellcheck orb motion.div has no reduced-motion branch.	Reduced-motion users get instant opacity or no motion transition.
spin appears orphaned or mis-scoped	Audit marks spin @keyframes as likely orphaned/unverified and recommends removing, renaming, or adding a clear selector.	No orphan warning, and ownership is clear.
AMP animation lineage is unverified	Audit says animationSignal feeds AnimatedSurface, but final CSS lineage is unverifiable without documenting computeAnimationSpec.	Contract is documented and testable.
4. Assumptions and Unknowns
Assumptions
usePrefersReducedMotion already exists somewhere in the project because the audit references it in nearby animation systems.
ScrollEditor.jsx uses Framer Motion’s motion.div and AnimatePresence.
The goal is not to remove Read/Truesight animation, only to make the last branches lawful.
CSS animations already gated by prefers-reduced-motion should not be rewritten.
Unknowns Codex Must Resolve
Exact import path for usePrefersReducedMotion.
Whether .spin-icon is styled in WandPage.css, IDE.css, a shared stylesheet, or not at all.
Exact shape of computeAnimationSpec.
Whether tests use Vitest, Jest, Playwright, Testing Library, or project-specific harnesses.
5. Target Files
src/pages/Read/ScrollEditor.jsx
src/pages/Read/IDE.css
src/pages/Wand/WandPage.css              # only if spin belongs to Wand
docs/adr/ADR-animation-signal-contract.md # new
tests or __tests__ matching project layout

Optional, only if existing structure says so:

src/hooks/usePrefersReducedMotion.js
src/components/AnimatedSurface.jsx
src/pages/Read/animationSpec.*
6. Implementation Plan
Step 1: Add reduced-motion source to ScrollEditor.jsx
Why

The audit found the root entrance animation ignores reduced-motion. This is a direct accessibility bug, not aesthetic dust.

Dependency Check

Before editing:

rg "usePrefersReducedMotion" src
rg "motion.div" src/pages/Read/ScrollEditor.jsx

Use the existing hook path. Do not create a duplicate hook unless none exists.

Code
OLD
<motion.div
  className="scroll-editor"
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.24, ease: 'easeOut' }}
>
NEW
const reduceMotion = usePrefersReducedMotion();

const editorMotionProps = reduceMotion
  ? {
      initial: false,
      animate: { opacity: 1 },
      transition: { duration: 0 },
    }
  : {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.24, ease: 'easeOut' },
    };
<motion.div
  className="scroll-editor"
  {...editorMotionProps}
>
Risk Reduced
Removes JS-level motion that CSS media queries cannot catch.
Preserves existing animation for users who have not requested reduced motion.
Keeps Framer Motion mounted, avoiding layout churn.
Step 2: Gate spellcheck-orb motion
Why

The audit found the spellcheck tooltip/orb always animates through Framer Motion. It should resolve immediately under reduced-motion.

Code
OLD
<motion.div
  className="spellcheck-orb"
  initial={{ opacity: 0, scale: 0.94, y: 4 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.96, y: 4 }}
  transition={{ duration: 0.16, ease: 'easeOut' }}
>
NEW
const spellcheckOrbMotionProps = reduceMotion
  ? {
      initial: false,
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0 },
    }
  : {
      initial: { opacity: 0, scale: 0.94, y: 4 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.96, y: 4 },
      transition: { duration: 0.16, ease: 'easeOut' },
    };
<motion.div
  className="spellcheck-orb"
  {...spellcheckOrbMotionProps}
>
Risk Reduced
Prevents a tiny but real motion bypass.
Keeps tooltip visibility behavior unchanged.
Does not modify spellcheck data flow or hover logic.
Step 3: Verify and resolve spin ownership
Why

The audit flags spin as likely orphaned or cross-file ambiguous. The clean fix depends on what Codex finds.

Search Commands
rg "@keyframes spin|animation:\s*spin|spin-icon|className=.*spin" src
Option A: .spin-icon is used and belongs to Wand

Move or ensure the binding lives beside the consumer.

NEW in WandPage.css
.spin-icon {
  animation: spin 1.2s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .spin-icon {
    animation: none;
  }
}

Keep @keyframes spin in WandPage.css if Wand owns it.

Option B: spin is unused

Remove both:

@keyframes spin {
  /* ... */
}

and any unreachable:

animation: spin 1.2s linear infinite;
Option C: shared loader uses it

Rename to a namespaced animation and bind clearly:

@keyframes scholomance-spin {
  to {
    transform: rotate(360deg);
  }
}

.shared-loading-icon {
  animation: scholomance-spin 1.2s linear infinite;
}
Required Decision Rule

Do not leave a bare @keyframes spin in IDE.css unless IDE.css has a direct selector consumer. Generic names are little CSS goblins with passports.

Risk Reduced
Silences orphan warnings.
Prevents cross-page accidental animation inheritance.
Improves ownership clarity.
Step 4: Document animationSignal → AnimatedSurface contract
Why

The audit could not fully verify whether word-level PixelBrain/AMP animation signals always respect reduced-motion. This does not need a big refactor first. It needs a contract map so future edits have a lantern.

New File
docs/adr/ADR-animation-signal-contract.md
Content
# ADR: Read Word Animation Signal Contract

## Status

Accepted.

## Context

`ScrollEditor.jsx` writes per-word `animationSignal` values that are consumed by `AnimatedSurface` through the animation spec resolver.

The intended lineage is:

```txt
word state
  → animationSignal
  → computeAnimationSpec / useAnimationSpec
  → AnimatedSurface props
  → CSS class / overlay / emergent effect
Contract

When reduced-motion is true:

animClass must be null or an inert class.
overlays must be disabled unless static.
emergent animation effects must be disabled.
layout-affecting transforms must not be emitted.
opacity-only visibility changes are allowed only with zero-duration transitions.
Allowed Motion

When reduced-motion is false:

word-level animation may use CSS classes.
Truesight ghost layers may animate.
palette interpolation may run.
GPU promotion is allowed for heavy overlays.
Test Expectations

A reduced-motion test must assert that computeAnimationSpec emits no active animation class, no animated overlay, and no emergent effect for every supported animationSignal.

Ownership

ScrollEditor.jsx owns signal assignment.
computeAnimationSpec owns signal interpretation.
AnimatedSurface owns final render application.


### Risk Reduced

- Turns the unverified AMP path into an inspectable contract.
- Avoids future “it probably gates motion” fog.
- Gives tests a specific truth table.

---

## Step 5: Add regression checks

### Minimum Test Set

Create or update tests based on existing project conventions.

#### Test 1: Root editor obeys reduced-motion

```jsx
it('does not apply root translate entrance motion when reduced-motion is enabled', () => {
  mockPrefersReducedMotion(true);

  render(<ScrollEditor {...requiredProps} />);

  const editor = screen.getByTestId('scroll-editor-root');

  expect(editor).toBeInTheDocument();
  expect(editor).not.toHaveStyle({ transform: expect.stringContaining('translate') });
});

If data-testid does not exist, add:

data-testid="scroll-editor-root"
Test 2: Spellcheck orb obeys reduced-motion
it('uses instant opacity-only spellcheck orb behavior when reduced-motion is enabled', async () => {
  mockPrefersReducedMotion(true);

  render(<ScrollEditor {...propsWithHoveredMisspelling} />);

  const orb = await screen.findByTestId('spellcheck-orb');

  expect(orb).toBeInTheDocument();
});

Add:

data-testid="spellcheck-orb"
Test 3: Animation spec contract
it.each(SUPPORTED_ANIMATION_SIGNALS)(
  'emits inert animation spec under reduced-motion for %s',
  (signal) => {
    const spec = computeAnimationSpec({
      animationSignal: signal,
      reducedMotion: true,
    });

    expect(spec.animClass).toBeFalsy();
    expect(spec.overlay).toBeFalsy();
    expect(spec.emergent).toBeFalsy();
  }
);
Test 4: CSS orphan check

Add a lightweight script or test if the repo already has CSS audit tooling:

rg "@keyframes spin|animation:\s*spin|spin-icon" src

Expected outcome must be one of:

PASS: no spin references exist
PASS: @keyframes spin and .spin-icon live in same owning stylesheet
PASS: spin renamed to namespaced shared animation with direct consumer
7. Acceptance Criteria
ScrollEditor.jsx root motion does not translate, scale, or animate duration when reduced-motion is active.
spellcheck-orb does not translate or scale when reduced-motion is active.
Normal motion remains visually unchanged when reduced-motion is inactive.
spin is either removed, namespaced, or colocated with a real selector consumer.
ADR exists for animationSignal → computeAnimationSpec → AnimatedSurface.
Test suite passes.
No new requestAnimationFrame, setInterval, or infinite CSS animation is introduced.
No existing safe loops are rewritten without reason.
8. QA Checklist
Manual QA
Scenario	Steps	Expected
Reduced motion ON, open Read page	Enable OS/browser reduced-motion, navigate to Read	Editor appears without slide/translate entrance.
Reduced motion OFF, open Read page	Disable reduced-motion, navigate to Read	Existing soft entrance animation still works.
Reduced motion ON, hover misspelling	Trigger spellcheck suggestions	Orb appears without scale/y motion.
Reduced motion OFF, hover misspelling	Trigger spellcheck suggestions	Existing orb animation remains.
Truesight ON	Toggle Truesight with reduced-motion OFF	Ghost layer still works.
Truesight ON + reduced-motion ON	Toggle Truesight	No animated word overlays or emergent effects.
Wand loading/refresh icon	Visit Wand path that uses .spin-icon, if any	Spinner animates only when reduced-motion is OFF.
Command QA
pnpm test
pnpm lint
pnpm build
rg "@keyframes spin|animation:\s*spin|spin-icon" src
rg "initial=\{\{ opacity: 0,.*y:" src/pages/Read/ScrollEditor.jsx
rg "spellcheck-orb" src/pages/Read/ScrollEditor.jsx
9. Regression Risks
Risk	Likelihood	Impact	Mitigation
Hook import path is wrong	Medium	Build fail	Use rg usePrefersReducedMotion src before editing.
Tests rely on animation props not DOM styles	Medium	False negative	Prefer unit tests around motion prop builders if DOM style inspection is brittle.
Removing spin breaks Wand icon	Low-medium	Visual regression	Search all consumers before deletion.
AMP contract doc diverges from implementation	Medium	Future confusion	Add one test around computeAnimationSpec reduced-motion behavior.
Framer initial={false} behaves differently than expected	Low	Minor entrance behavior issue	Validate manually in reduced-motion and normal-motion modes.
10. Final Verdict

Implement this as a small accessibility hardening pass, not an animation refactor.

The core animation cathedral is standing. This PDR only removes two loose Framer Motion sparks, labels one wandering spin gremlin, and nails a contract plaque onto the AMP corridor wall.
