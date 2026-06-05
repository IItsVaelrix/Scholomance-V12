/**
 * DBM WORKER — off-thread lightning compute.
 *
 * Runs the Dielectric Breakdown Model (heavy: many Poisson/SOR solves), then
 * encodes the resulting breakdown field as a high-dimensional vector and routes
 * it through TurboQuant / the Photonic-Quantization bridge. Both the Laplacian
 * growth and the QJL quantization run here so the main thread never blocks — the
 * worker can be hammered as hard as `intensity` dictates.
 *
 * Posts back bolt geometry (lightly perturbed by the quantized packet bytes, so
 * the bridge output genuinely shapes the render) plus telemetry.
 */

import { runDielectricBreakdown } from "./dbm.js";
import { routeRetinaPacketToPhotonicBridge } from "../../../lib/photonic-retina/index.js";

const INT4_MAGNITUDE = 7;

function perturb(points, packet, amount) {
  const data = packet && ArrayBuffer.isView(packet.data) ? packet.data : null;
  if (!data || data.length === 0 || amount <= 0) return points;
  let cursor = 0;
  const out = new Array(points.length);
  for (let i = 0; i < points.length; i += 1) {
    const prev = points[Math.max(0, i - 1)];
    const cur = points[i];
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const j = (data[cursor % data.length] / INT4_MAGNITUDE) * amount;
    cursor += 1;
    out[i] = { x: cur.x + (-dy / len) * j, y: cur.y + (dx / len) * j };
  }
  return out;
}

self.onmessage = (event) => {
  const { id, cloudId, dbm, dim, jitter = 0, stellarCoords } = event.data || {};
  const t0 = performance.now();

  const result = runDielectricBreakdown(dbm);

  const region = dbm.region || { w: 1, h: 1 };
  let route = null;
  try {
    const payload = [...result.fieldPayload];
    if (Array.isArray(stellarCoords)) {
      payload.push(...stellarCoords);
    }

    route = routeRetinaPacketToPhotonicBridge(
      {
        sourceKind: "coordinates",
        dimensions: { width: Math.max(1, region.w), height: Math.max(1, region.h) },
        payload,
      },
      {
        retina: { targetDimension: Math.max(64, Math.min(4096, dim || payload.length * 4)), bitWidth: 4 },
        bridge: { mode: "shadow" },
      },
    );
  } catch {
    route = null;
  }

  const packet = route?.packet || null;
  const points = perturb(result.points, packet, jitter);
  const branches = result.branches.map((b) => ({ points: perturb(b.points, packet, jitter * 0.7) }));

  self.postMessage({
    id,
    cloudId,
    points,
    branches,
    telemetry: {
      grade: route?.bridgeReport?.compatibilityGrade || "—",
      score: Number(route?.bridgeReport?.compatibilityScore) || 0,
      opticalFit: Number(route?.opticalSimulation?.opticalFit) || 0,
      dim: packet?.dimension || 0,
      sites: result.telemetry.sites,
      grid: `${result.telemetry.gridW}x${result.telemetry.gridH}`,
      solves: result.telemetry.solves,
      computeMs: Math.round(performance.now() - t0),
    },
  });
};
