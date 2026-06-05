import crypto from 'node:crypto';
import { parseBytecodeXPVaccineBytecode } from './BytecodeXPVaccine.js';

export const QBIT_PULSE_TYPE = 'BYTECODE_XP_VACCINE_PULSE';

export const DEFAULT_QBIT_PULSE_LIMITS = Object.freeze({
  maxHotspots: 12,
});

export function buildQbitPulseNode(vaccineInput, options = {}) {
  const vaccine = normalizeVaccineInput(vaccineInput);
  const hotspots = normalizeHotspots(options.hotspots || [], {
    maxHotspots: options.maxHotspots ?? DEFAULT_QBIT_PULSE_LIMITS.maxHotspots,
  });
  const origin = normalizeOrigin(options.origin || deriveOriginFromVaccine(vaccine));
  const pulseRadius = normalizeUnitInterval(options.pulseRadius ?? derivePulseRadius(hotspots));
  const collapseConfidence = normalizeUnitInterval(
    options.collapseConfidence ?? deriveCollapseConfidence(hotspots),
  );

  const stable = {
    qbitType: QBIT_PULSE_TYPE,
    vaccineId: vaccine.vaccineId,
    origin,
    pulseRadius,
    collapseConfidence,
    hotspots,
  };

  return stableClone({
    ...stable,
    checksum: checksumQbitPulse(stable),
  });
}

export function normalizeHotspots(hotspots, options = {}) {
  const maxHotspots = normalizePositiveInteger(
    options.maxHotspots ?? DEFAULT_QBIT_PULSE_LIMITS.maxHotspots,
    DEFAULT_QBIT_PULSE_LIMITS.maxHotspots,
  );

  return stableClone(hotspots
    .map(normalizeHotspot)
    .sort(compareHotspots)
    .slice(0, maxHotspots));
}

export function checksumQbitPulse(stable) {
  const checksumSource = {
    qbitType: stable.qbitType,
    vaccineId: stable.vaccineId,
    origin: normalizeOrigin(stable.origin || {}),
    pulseRadius: normalizeUnitInterval(stable.pulseRadius),
    collapseConfidence: normalizeUnitInterval(stable.collapseConfidence),
    hotspots: normalizeHotspots(stable.hotspots || [], {
      maxHotspots: Number.MAX_SAFE_INTEGER,
    }),
  };

  return sha256Hex(stableJson(checksumSource)).slice(0, 12);
}

export function verifyQbitPulseNode(node) {
  if (!node || node.qbitType !== QBIT_PULSE_TYPE || !node.vaccineId || !node.checksum) {
    return false;
  }
  return checksumQbitPulse(node) === node.checksum;
}

function normalizeVaccineInput(input) {
  if (typeof input === 'string') {
    const parsed = parseBytecodeXPVaccineBytecode(input);
    if (!parsed.valid) {
      throw new Error(`Invalid BytecodeXP vaccine bytecode: ${parsed.error}`);
    }
    return {
      vaccineId: parsed.vaccineId,
      stableContext: {},
    };
  }

  const source = input?.toJSON ? input.toJSON() : input;
  const vaccineId = source?.vaccineId || parseVaccineId(source?.bytecode);
  if (!vaccineId) {
    throw new Error('QBIT pulse requires a BytecodeXP vaccineId or bytecode');
  }

  return {
    vaccineId,
    stableContext: stableClone(source?.stableContext || {}),
  };
}

function parseVaccineId(bytecode) {
  if (!bytecode) return null;
  const parsed = parseBytecodeXPVaccineBytecode(bytecode);
  return parsed.valid ? parsed.vaccineId : null;
}

function deriveOriginFromVaccine(vaccine) {
  const context = vaccine.stableContext || {};
  return {
    path: context.path || context.sourceFile || context.contextModuleId || context.moduleId || null,
    code: context.ruleId || context.checkId || context.errorCodeHex || context.errorCode || context.code || context.id || null,
    cellId: context.cellId || null,
  };
}

function normalizeOrigin(origin) {
  return stableClone({
    path: normalizeNullableString(origin.path),
    code: normalizeNullableString(origin.code),
    cellId: normalizeNullableString(origin.cellId),
  });
}

function normalizeHotspot(hotspot) {
  const path = normalizeRequiredString(hotspot?.path, 'hotspot.path');
  const reason = normalizeNullableString(hotspot?.reason) || 'semantic-resonance';
  return {
    path,
    resonance: normalizeUnitInterval(hotspot?.resonance),
    reason,
  };
}

function compareHotspots(a, b) {
  if (b.resonance !== a.resonance) return b.resonance - a.resonance;
  const pathOrder = a.path.localeCompare(b.path);
  if (pathOrder !== 0) return pathOrder;
  return a.reason.localeCompare(b.reason);
}

function derivePulseRadius(hotspots) {
  if (hotspots.length === 0) return 0;
  return normalizeUnitInterval(Math.max(...hotspots.map(hotspot => hotspot.resonance)));
}

function deriveCollapseConfidence(hotspots) {
  if (hotspots.length === 0) return 0;
  const total = hotspots.reduce((sum, hotspot) => sum + hotspot.resonance, 0);
  return normalizeUnitInterval(total / hotspots.length);
}

function normalizePositiveInteger(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) return fallback;
  return Math.floor(numeric);
}

function normalizeUnitInterval(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return roundUnit(Math.min(1, Math.max(0, numeric)));
}

function roundUnit(value) {
  return Number(value.toFixed(6));
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredString(value, fieldName) {
  const normalized = normalizeNullableString(value);
  if (!normalized) {
    throw new Error(`QBIT pulse requires ${fieldName}`);
  }
  return normalized;
}

function stableClone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return Object.freeze(value.map(stableClone));
  return Object.freeze(Object.fromEntries(
    Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .map(key => [key, stableClone(value[key])]),
  ));
}

function stableJson(value) {
  return JSON.stringify(stableClone(value));
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
