export function createScholoTimePixelBrainAdapter({ formulaRegistry, evaluateFormula, canvasSize }) {
  return Object.freeze({
    resolveFrame({ project, timeMs, cues, section }) {
      const layers = [];

      for (const track of project.visualTracks || []) {
        if (track.engine !== 'pixelbrain' || track.visible === false) continue;

        const formula = formulaRegistry.get(track.formulaId);
        if (!formula) {
          throw new Error(`SCHOLOTIME_PIXELBRAIN_FORMULA_MISSING: ${track.formulaId}`);
        }

        const coordinates = evaluateFormula ? evaluateFormula(formula, canvasSize, timeMs) : [];

        layers.push({
          id: track.id,
          layer: track.layer,
          formulaId: track.formulaId,
          coordinates,
          cues: cues.filter((cue) => cue.target === track.id),
          sectionEnergy: section?.energy || 0,
        });
      }

      return {
        canvasSize,
        layers: layers.sort((a, b) => a.layer - b.layer),
      };
    },
  });
}
