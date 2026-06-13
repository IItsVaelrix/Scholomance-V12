export class EnhancementError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EnhancementError';
  }
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Call POST /api/character/enhance with the baked character image.
 *
 * @param {string} imageDataUrl  — data:image/png;base64,... from pngToDataUrl()
 * @param {object} spec          — CHARACTER-SPEC-v1 (for school name)
 * @returns {Promise<{glowIntensity: number, rimColor: string|null, atmosphereOpacity: number}>}
 */
export async function enhanceCharacter(imageDataUrl, spec) {
  const schoolName    = spec.combatProfile?.school ?? 'SONIC';
  const characterName = spec.id ?? 'unknown';

  let res;
  try {
    res = await fetch('/api/character/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl, schoolName, characterName }),
    });
  } catch (err) {
    throw new EnhancementError('Network error: ' + err.message);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new EnhancementError(`Server error ${res.status}: ${body.slice(0, 120)}`);
  }

  const data = await res.json();

  if (typeof data.glowIntensity      !== 'number' ||
      typeof data.atmosphereOpacity  !== 'number') {
    throw new EnhancementError('Invalid enhancement response: ' + JSON.stringify(data));
  }

  return {
    glowIntensity:     Math.max(0.3, Math.min(1.5, data.glowIntensity)),
    rimColor:          HEX_RE.test(data.rimColor ?? '') ? data.rimColor : null,
    atmosphereOpacity: Math.max(0.0, Math.min(0.8, data.atmosphereOpacity)),
  };
}
