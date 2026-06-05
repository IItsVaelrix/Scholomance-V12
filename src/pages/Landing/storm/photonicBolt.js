/**
 * PHOTONIC BOLT — lightning geometry seeded by a Photonic-Retina packet.
 *
 * The "algorithmic lightning" is grown by midpoint displacement, but instead of
 * standard random generators, the perpendicular offsets and branch decisions are drawn from
 * the Int8 `data` of a photonic-retina packet. Because the packet is produced by
 * encodeToPhotonicRetina (signed-hash rotation + scalar quantization), each
 * strike is deterministic in its seed yet visually organic — and every byte we
 * consume is real output of the photonic bridge pipeline.
 *
 * bitWidth-4 scalar quantization caps magnitudes at ±7, so we normalise by that.
 */

const INT4_MAGNITUDE = 7;

/**
 * Wrap a packet's Int8 data as a cyclic deterministic noise stream.
 * @param {{data: Int8Array}} packet
 */
export function createPacketNoise(packet) {
  const data = packet && ArrayBuffer.isView(packet.data) && packet.data.length > 0
    ? packet.data
    : Int8Array.of(0);
  const len = data.length;
  let cursor = 0;

  return {
    /** signed value in [-1, 1] */
    next() {
      const value = data[cursor % len];
      cursor += 1;
      return Math.max(-1, Math.min(1, value / INT4_MAGNITUDE));
    },
    /** unsigned value in [0, 1] */
    unit() {
      return (this.next() + 1) / 2;
    },
  };
}

function displacedMidpoint(a, b, amplitude, signed) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  // perpendicular unit vector
  const px = -dy / length;
  const py = dx / length;
  const offset = signed * amplitude * length;
  return { x: (a.x + b.x) / 2 + px * offset, y: (a.y + b.y) / 2 + py * offset };
}

/**
 * Grow a bolt from `start` to `end`, consuming packet noise for every decision.
 * @returns {{ points: Array<{x:number,y:number}>, branches: Array<{points:Array<{x:number,y:number}>}> }}
 */
export function generateBoltFromPacket(packet, start, end, options = {}) {
  const {
    detail = 6,
    displacement = 0.26,
    branchChance = 0.22,
    maxBranches = 18,
  } = options;

  const noise = createPacketNoise(packet);
  let points = [start, end];
  const branches = [];
  let amplitude = displacement;

  for (let pass = 0; pass < detail; pass += 1) {
    const next = [points[0]];

    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const mid = displacedMidpoint(a, b, amplitude, noise.next());
      next.push(mid, b);

      // Spawn a short forking channel; bias its angle off the local direction.
      if (branches.length < maxBranches && pass >= 1 && noise.unit() < branchChance) {
        const angle = Math.atan2(mid.y - a.y, mid.x - a.x) + noise.next() * 0.7;
        const reach = (Math.hypot(b.x - a.x, b.y - a.y) || 1) * (0.6 + noise.unit() * 0.7);
        const tip = { x: mid.x + Math.cos(angle) * reach, y: mid.y + Math.sin(angle) * reach };
        const kink = displacedMidpoint(mid, tip, amplitude * 1.2, noise.next());
        branches.push({ points: [mid, kink, tip] });
      }
    }

    points = next;
    amplitude *= 0.5;
  }

  return { points, branches };
}
