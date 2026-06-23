# PDR: Visualiser Discography Navigation & Bandcamp-Style Feature Suite
## Upload, Distribution, and Truesight-Enhanced Audio Commerce

**Status:** Draft
**Classification:** Architectural | UI | Behavioral
**Priority:** High
**Primary Goal:** Introduce a Bandcamp-style discography navigation and commerce/upload flow within the Visualiser, enhanced by Scholomance's Truesight, Bytecode, and PhonemeEngine integrations.

---

# 1. Executive Summary
This PDR outlines the architecture and UI/UX for a new Discography Navigation Bar within the Visualiser page, bridging traditional Bandcamp-like capabilities (uploading audio, cover art, track descriptions, album grouping, and distribution) with Scholomance-exclusive features. These "bells and whistles" include automatic Truesight phonemic analysis, bytecode mandala generation for cover art, and lore-integrated metadata tagging. The blast radius involves the Visualiser UI, the catalog ingestion backend, and the auth/collaboration plane.

# 2. Out of Scope / Non-Goals
- We are **not** building a full fiat payment gateway in this PDR. We will lay the data structures for commerce but defer Stripe/PayPal integration to a separate PDR.
- We are **not** redesigning the existing `BytecodeVisualiser` engine. We are merely wrapping it in a broader discography and upload ecosystem.
- We are **not** modifying Godot or Phaser rendering substrates in this feature.

# 3. Spec Sheet
- **Functional:** Users must be able to upload tracks (MP3/WAV), supply cover art, and write descriptions. A persistent navigation bar will organize releases by Artist, Album, and Era.
- **Scholomance Functional:** Uploaded audio automatically undergoes `PhonemeEngine` extraction to generate a unique VerseIR bytecode seed and Truesight color palette.
- **Non-Functional:** The upload pipeline must handle audio chunks efficiently. UI must meet WCAG AA accessibility standards. 
- **Determinism:** The Bytecode seed generation from the uploaded audio must remain fully deterministic.

# 4. Change Classification
- **UI:** Structural + Cosmetic (New Discography Navigation Bar and upload modals).
- **Behavioral:** New state flows for uploading and analyzing tracks.
- **Architectural:** Expansion of `catalog.schema.js` to support multi-track albums and artist discographies.

# 5. Assumptions and Unknowns
- **Assumption:** The backend `ingest.service.js` can be extended to handle multi-file album uploads.
- **Unknown:** How intensive the server-side `PhonemeEngine` analysis will be on large batch uploads. 
- **Escalation:** May require background worker queues if sync processing times out.

# 6. Open Questions / Escalations
```markdown
ESCALATION:
- Conflict: Does the upload pipeline execute Truesight analysis strictly on the backend, or should the frontend perform Web Audio processing before upload to save server costs?
- Owner: Gemini (Backend) vs. Claude (UI).
- Needs Angel resolution.
```

# 7. Architecture / File Map
- `src/pages/Visualiser/DiscographyNav.tsx` (Owner: Claude) - The primary navigation component.
- `src/pages/Visualiser/UploadModal.tsx` (Owner: Claude) - The Bandcamp-style upload interface.
- `codex/server/catalog/ingest.service.js` (Owner: Gemini) - Expanded to handle album schemas.
- `codex/server/catalog/catalog.schema.js` (Owner: Codex) - Updates to accommodate Bandcamp-like metadata (ISRC, liner notes).

# 8. Step-by-Step Implementation Plan
1. **Phase 1: Schema Expansion** (Owner: Codex, 1 Day). Update `catalog.schema.js` to support Albums, Discographies, and liner notes. *Exit:* Schema validates successfully.
2. **Phase 2: Ingestion Pipeline** (Owner: Gemini, 2 Days). Update API endpoints to accept multipart form data for audio + images. *Exit:* Tests pass for uploading multiple files.
3. **Phase 3: Navigation UI** (Owner: Claude, 2 Days). Build `DiscographyNav.tsx` behind a feature flag. *Exit:* Nav renders and routes correctly.
4. **Phase 4: Truesight Integration** (Owner: Codex, 1 Day). Hook the upload pipeline into the `PhonemeEngine` for automatic bytecode generation. *Exit:* Uploaded tracks automatically populate VerseIR data.

# 9. Code Examples for the 5–10 Most Pivotal Changes

### 1. DiscographyNav Structure
```tsx
export function DiscographyNav({ albums, activeAlbum }) {
  return (
    <nav className="bcv-disco-nav" aria-label="Discography">
      <ul className="bcv-disco-list">
        {albums.map(album => (
          <li key={album.id}>
            <button 
              className={`bcv-disco-btn ${album.id === activeAlbum ? 'active' : ''}`}
              style={{ '--album-hue': album.truesightHue }}
            >
              <img src={album.coverUrl} alt="" className="bcv-disco-thumb" />
              <span>{album.title}</span>
            </button>
          </li>
        ))}
      </ul>
      <UploadButton />
    </nav>
  );
}
```

### 2. Auto-Truesight Bytecode Hook (Backend pseudo-logic)
```javascript
async function processUpload(audioBuffer, metadata) {
  // Standard ingestion
  const trackId = await saveTrack(audioBuffer, metadata);
  // Scholomance Special: Auto-generate the visualizer seed
  const phonemeData = await PhonemeEngine.analyzeBuffer(audioBuffer);
  const seed = computeFingerprint({ title: metadata.title, bpm: phonemeData.bpm, trackId });
  
  return { trackId, seed, truesightData: phonemeData.dominantSchool };
}
```

# 10. Glossary
- **Truesight:** Scholomance's phonemic visualization engine that maps audio semantics to colors and geometry.
- **VerseIR:** The intermediate representation of lyrics and audio structures.
- **Bytecode Mandala:** The visual representation (Visualiser) of a track's audio seed.

# 11. Q&A — Top 10 Most Confusing Implementation Concerns
1. *How do we handle large WAV file uploads?* We will implement chunked uploading in `ingest.service.js` to prevent memory bloat.
2. *Where does the Discography Nav sit?* It will dock on the left or top of the Visualiser page, allowing users to switch tracks seamlessly without reloading the Web Audio context.

# 12. QA Plan
- **Backend:** `npm run test:api -- --grep "ingest.service"`
- **Frontend:** `npm run test:ui -- --grep "DiscographyNav"`
- **Tests:** Validate that `DiscographyNav` correctly renders 50+ albums without layout breaking. Ensure upload modal enforces file type restrictions.

# 13. Regression Risks and Specific Retest Checklist
- **Visualiser Audio Context:** Ensure that switching tracks via the new Nav does not create dangling Web Audio Contexts or memory leaks.
- *Retest:* Manually switch between 10 tracks rapidly; verify memory profile in Chrome DevTools.

# 14. Rollout Plan
- **Feature Flag:** Wrap `DiscographyNav` in `process.env.ENABLE_DISCOGRAPHY`. 
- **Shadow Mode:** The ingestion pipeline will log upload metrics without writing to the public catalog during testing.
- **Incomplete-but-safe:** The UI can deploy and render mock discographies while the backend upload pipeline is being finalized.

# 15. Definition of Done
- [ ] `catalog.schema.js` supports Albums and Discographies.
- [ ] Upload endpoint handles multipart data and integrates with `PhonemeEngine`.
- [ ] `DiscographyNav` component is accessible and integrated into `BytecodeVisualiserPage`.
- [ ] Feature flag is operational.
- [ ] End-to-end tests for upload and playback pass.

# 16. Final Architectural Verdict
`Safe and complete`
The architecture builds naturally upon the existing Visualiser and catalog ingestion systems, requiring no massive rewrites, merely extensions of existing contracts.

# 17. References
- `catalog.schema.js` - Base data model.
- `ingest.service.js` - Current ingestion flow.
- `BytecodeVisualiserPage.tsx` - Target UI injection point.

# 18. Post-Implementation Report Handoff
- File: `docs/scholomance-encyclopedia/post-implementation-reports/PIR-2026-06-11-DISCOGRAPHY-NAV.md`
