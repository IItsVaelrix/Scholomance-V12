import { buildColorIntensityPayload } from './color-intensity-rating-microprocessor.js';
import { buildVectorAmpPayload } from './vector-amp.js';
import { buildTonationAmpPayload } from './tonation-amp.js';
import { buildShadowAmpPayload } from './shadow-amp.js';
import { buildVolumeAmpPayload } from './volume-amp.js';
import { buildFlameTipAmpPayload } from './flame-tip-amp.js';
import { buildFlameTipCellularAutomataPayload } from './flame-tip-ca.js';
import { buildSquareSharpnessContrastPayload } from './square-sharpness-contrast-amp.js';

export function runPixelBrainRenderFidelityPipeline(input, options = {}) {
  // 1. Color Intensity Rating
  const intensity = buildColorIntensityPayload({
    coordinates: input.renderPacket.coordinates,
    options: {}, // intensity options if any
    intent: 'annotate_intensity'
  });

  // 2. VectorAMP
  const vector = buildVectorAmpPayload({
    coordinates: intensity.outputCoordinates,
    intensityRatings: intensity, // Or specifically extract ratings if needed
    canvas: input.canvas,
  });

  // 3. TonationAMP
  const tonation = buildTonationAmpPayload({
    coordinates: intensity.outputCoordinates,
    materialId: input.materialId,
    intensitySummary: intensity.diagnostics,
    canvas: input.canvas,
  });

  // 4. ShadowAMP
  const shadow = buildShadowAmpPayload({
    coordinates: tonation.coordinates,
    materialId: input.materialId,
    intensityRatings: intensity,
    vectorField: vector.vectorField,
    canvas: input.canvas,
  });

  // 5. VolumeAMP
  const volume = buildVolumeAmpPayload({
    coordinates: shadow.coordinates,
    materialId: input.materialId,
    intensityRatings: intensity,
    vectorField: vector.vectorField,
    canvas: input.canvas,
  });

  // 6. FlameTipAMP — top-region taper geometry (between mass and final readability)
  const flameTip = buildFlameTipAmpPayload({
    coordinates: volume.coordinates,
    materialId: input.materialId,
    vectorField: vector.vectorField,
    intensityRatings: intensity,
    canvas: input.canvas,
    options: options.flameTip || {},
    intent: 'shape_flame_tip_taper',
  });

  // 7. FlameTipCA — cellular automata polisher for the tip silhouette
  const flameTipCA = buildFlameTipCellularAutomataPayload({
    coordinates: flameTip.outputCoordinates,
    materialId: input.materialId,
    vectorField: vector.vectorField,
    intensityRatings: intensity,
    canvas: input.canvas,
    options: options.flameTipCA || {},
    intent: 'polish_flame_tip_with_cellular_automata',
  });

  // 8. Square Sharpness Contrast
  const sharpness = buildSquareSharpnessContrastPayload({
    coordinates: flameTipCA.outputCoordinates,
    material: input.materialId,
    canvas: input.canvas,
    options: options.sharpness || {},
    intent: 'enhance_square_render_readability'
  });

  return {
    ok: true,
    coordinates: sharpness.outputCoordinates,
    payloads: {
      intensity,
      vector,
      tonation,
      shadow,
      volume,
      flameTip,
      flameTipCA,
      sharpness,
    },
  };
}
