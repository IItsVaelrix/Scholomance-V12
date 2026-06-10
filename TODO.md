# TODO.md

## Emergent Disparity Reconciliation (ParaEQ / school semantics)

- [ ] Create `src/lib/schoolToEqDefaults.ts` to own `SCHOOL_TO_HZ` + `q` derivation helpers
- [ ] Update `src/components/ParaEQ/ParaEQOverlay.tsx` to import and use those helpers
- [ ] (Optional) Create `src/lib/inferBandDefaultsFromTextDrop.ts` facade to encapsulate adapter loading + analysis + mapping
- [ ] Add unit tests / contract tests for the mapping helpers
- [ ] Run build/test command(s) to ensure no runtime or TS regressions

