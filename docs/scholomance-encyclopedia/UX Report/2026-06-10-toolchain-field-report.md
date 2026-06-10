# UX Field Report — Driving the Scholomance Toolchain on a Live Session

- **Date:** 2026-06-10
- **Author:** Claude (agent), working with the Scholomance Developer
- **Scope:** A single long working session that touched the immune/diagnostic stack, the phonology/G2P engine, the superpowers workflow skills, the GrimDesign UI skill, the probe pattern, and the persistent memory system.
- **Voice:** First-person, honest, calibrated. This is a field report, not a brochure.

---

## 0. What actually happened (so the report is grounded)

In one session we: (1) reality-checked a "prion detector → mechanistic interpretability" theory, (2) ran the Emergent Disparity skill and found the detector orphaned from the QbitPulse ledger, (3) built a separation probe that returned `0.0000` and killed the phoneme-vector approach, (4) systematic-debugged a real regression where an async G2P-Jury edit had silently nulled the entire phoneme surface, fixed it test-first, and merged to `master`, (5) rebuilt the detector on syntactic-Markov + a semantic "editor" (Phase 1 WEAK, gap 0.27), (6) pivoted to G2P pronunciation, measured a 50% homograph baseline, and built a prosodic metronome (100% precision / 64% coverage), and (7) added a GrimDesign polish layer to the blog. Every claim above is backed by a committed probe or test. That track record is the most important UX fact in this report: **the tools made it cheap to be honest.**

---

## 1. The probe pattern is the single best thing here

The recurring move — *write a tiny measurement script whose output is a verdict, run it before building on top* — was the spine of the whole session, and it is excellent UX.

- `cleri-probe-separation.js` returned `0.0000` and **killed a bad architecture in one afternoon** instead of after a month of wiring it into the ledger.
- The same probe's built-in self-check (`diagonal must be ~1.0`) caught that the detector was emitting *empty vectors* and stopped me from reporting a false "prions aren't separable" verdict. A probe that audits its own measurement before trusting its result is a genuinely good pattern.
- `cleri-probe-mutation.js`, `-pronunciation.js`, and `-metronome.js` each produced a number that turned a debate into a decision. "50% baseline," "gap 0.27," "100% precision" — none of those are arguable.

**Why it felt good:** it externalizes honesty. You cannot oversell `0.0000`. The cost of being wrong dropped to "one script," so the cost of being honest dropped with it. If I were to name one transferable lesson from this project, it is: *make the invalidating test cheaper than the argument about it.*

**Friction:** there is no probe *harness* — each probe re-implements walking the substrate, sampling, printing bars, and a verdict block. A `cleri-probe` core (substrate walk + report formatter + verdict thresholds) would remove ~40 lines of boilerplate per probe and make new probes a 10-minute reflex instead of a 30-minute one.

---

## 2. Workflow skills: rigor that mostly earned its keep, with real ceremony tax

### systematic-debugging — the standout
The Iron Law ("no fixes without root cause") directly produced the session's biggest win. The G2P surface was returning `null` everywhere; the tempting guess was "dictionary not loaded → run the Python builder." The skill's insistence on evidence-at-each-boundary walked me to the actual cause: an in-progress edit had made `_resolveWordAnalysisDetailed` async without updating its seven synchronous callers. A guess would have rebuilt a SQLite the engine doesn't even read. **The discipline paid for itself in one use.**

### test-driven-development — caught my own mistake
Writing the failing test first immediately exposed that *my own plan* had a wrong assumption (`@babel/traverse` doesn't `enter` the root `File` node; the sequence starts at `Program`). Test-after would have encoded the bug as "expected." This is the exact value proposition of TDD, demonstrated live.

### brainstorming / writing-plans / executing-plans — good bones, heavy for a fast collaborator
These are well-designed, but the HARD-GATE ceremony (brainstorm → spec doc → user reviews spec → plan doc → execute) is calibrated for a hand-off to a cold engineer, not for a tight real-time loop with a domain expert who is steering every few minutes. When the user said "drop sound, keep syntax, use a Markov model" they had *already done* the brainstorm; re-deriving it through the formal flow risked friction. I adapted by running the gates fast and letting the probe be the spec, but the skill set assumes more distance between thinker and builder than existed here.

**Recommendation:** a "fast path" variant for expert-in-the-loop work — design decision captured in one round, plan inlined, gate satisfied by an approved probe rather than a committed doc.

### The meta-friction: skill-invocation overhead
Each skill loads a wall of instructions. For genuinely process-shaped tasks (debugging, TDD) that is worth it. For "the user typed /grimdesign," the load-then-act is fine. But there is a standing tension between the system's "invoke a skill if there's a 1% chance" mandate and a user who wants momentum. I resolved it by gating: invoke the process skills (debugging, TDD) always, treat the build skills as lighter. That worked, but it was a judgment call the tooling made me make repeatedly.

---

## 3. GrimDesign — signal-driven UI removes the worst part of design work

The best property of the GrimDesign skill is that it **deletes the bikeshed.** Instead of "should the blog accent be gold or teal," I ran `grimdesign.mjs "...blog..."` and got `WILL / HARMONIC / hsl(12 82% 50%)` with provenance. The color became a *derived fact with a paper trail*, not a preference to defend. That is a real UX improvement over normal design — the decision is traceable to a signal, so review is about whether the signal is right, not whether someone likes orange.

**Friction:**
- The signal gave a warm amber-red, but the existing blog system is a cool violet/cyan palette with a separate gold Wand aesthetic. The skill hands you *a* color; it does not tell you how to reconcile it with an existing system. I made it a "harmonic thread" woven through the cool palette, which felt right, but that synthesis was on me, not the tool.
- The output contract is strict and good, but it assumes a *new component*. For "spruce up an existing, well-tokenized page," I had to read the kit's tokens and core CSS first to avoid clobbering — the skill has no "enhance existing surface" mode.
- One genuinely good forcing function: the skill's QA checklist ("school variables consumed not hardcoded," "reduced motion respected") made me scope everything under `.cz-grim` and gate every animation. That checklist is the kind of guardrail that prevents the slow rot of a design system.

**Honest limit I hit and named:** the request included "use photonic-retina as the visual-encoding engine." Wiring the actual retina codec into a blog would have been over-engineering — the blog needs the *texture*, not the encoder. I honored it as the scan/grain *lineage* (a pure-CSS optical sweep) and said so in the spec. The tooling didn't stop me from over-building; the session's own honesty norm did.

---

## 4. The project's own diagnostic substrate is unusually coherent

Working across `QbitPulse`, `BytecodeHealth`, `BytecodeError`, and the jury/juror pattern, the standout is **determinism as a first-class contract.** `QbitPulse` is content-addressed and frozen; `BytecodeHealth` checksums over stable fields excluding timestamps; the VAELRIX determinism rule ("same input → same output, 100×") is enforced, not aspirational. For an agent, that is a gift: deterministic substrates mean my probes are reproducible and my findings don't evaporate between runs.

**The sharp edge** (and it cost real minutes): the Harkov engine's context-key sentinels are control characters (``/``). They render invisibly in the editor, so I twice "saw" empty strings, panicked about a collision bug, and tried to fix a non-bug. `cat -A` revealed `^B`/`^A` and resolved it. **Invisible-by-design constants are an agent-hostile pattern** — a visible sentinel (`'#BOUNDARY#'`, `'|'`) costs nothing and removes a whole class of false alarms. This is the single most concrete tooling fix I'd recommend.

A second edge: the in-progress G2P-Jury edit had coupled `phoneme.engine.js` to an untracked `g2p/` module with its own failing tests, so committing "just the sync fix" wasn't cleanly separable — the engine wouldn't build without the jury module. The repo's habit of large "checkpoint working tree" commits makes these coupling surprises more likely. Tighter, feature-scoped commits would make the next agent's life easier.

---

## 5. Memory persistence — quietly load-bearing

The file-based memory (`MEMORY.md` + per-fact files) did real work: the `pcaChroma hue collapse` and `honesty over hype` memories shaped my first response before I'd read any code, and I wrote four new memories this session (the prion verdict, detector v2, the pronunciation/TTS thread, the Emergent Disparity skill) so the next session starts from the *measured* state, not the theory. The `[[wikilink]]` convention made the knowledge graph feel intentional.

**Friction:** there is no signal about staleness beyond a date stamp, and it's on me to remember to check a memory against current code before trusting it. A couple of times the system-reminder injected a memory that *could* have been outdated; the convention of "verify file:line before asserting" is correct but entirely manual.

---

## 6. Cross-cutting: the tools made calibration visible

The most interesting human-factors outcome: the user asked, mid-session, whether they were "making senior architecture decisions or just getting lucky." The tooling let me answer with evidence rather than flattery — I could point to probes that came back negative (`0.0000`, `WEAK`, `50%`) as proof my buy-in was *gated*, and to the pattern of their *correct direction wrapped in overstated magnitude*. A toolchain that produces falsifiable artifacts turns a vague "am I good at this" into a reviewable track record. That is a non-obvious UX benefit of measure-first culture: **it makes mentorship honest.**

---

## 7. Top recommendations (ranked by leverage)

1. **Make invisible constants visible.** Replace control-char sentinels with printable ones. Highest value-to-effort fix in the report.
2. **Extract a `cleri-probe` harness.** Substrate walk + report formatter + verdict thresholds. Turns probe-writing into a reflex.
3. **Add a GrimDesign "enhance existing surface" mode** that reads the target's tokens and emits an additive, scoped layer (what I had to do by hand).
4. **Add an expert-in-the-loop fast path** to the brainstorming→plan→execute flow, where an approved probe can satisfy the spec gate.
5. **Tighter, feature-scoped commits** over "checkpoint working tree" so fixes are cleanly separable.
6. **Staleness signals in memory** beyond a date — e.g., a cheap "does this file:line still exist" check surfaced at recall time.

---

## 8. Verdict

The Scholomance toolchain's defining virtue is that **it makes honesty cheap and traceable** — probes that kill bad ideas in an afternoon, deterministic substrates that make findings reproducible, signal-driven UI that turns taste into provenance, and a memory that carries the *measured* state forward. The process skills (debugging, TDD) earned their rigor outright; the heavier workflow skills are well-built but tuned for more distance between thinker and builder than a live expert session has.

The rough edges are real but small and fixable: invisible sentinels, probe boilerplate, coupling surprises in big commits, and a GrimDesign skill that assumes greenfield. None of them undermined the work; all of them are a morning's cleanup.

If I had to compress the experience to one line: **this is a toolchain that rewards measuring before believing, and punishes hand-waving — which is exactly what you want when the goal is to tell the difference between a real signal and a beautiful theory.**
