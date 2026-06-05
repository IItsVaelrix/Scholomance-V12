import { hashString } from '../photonic-quantization/photonic-diagnostics.js';

export function stableSerialize(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (ArrayBuffer.isView(value)) {
    return `[typed:${value.constructor.name}:${Array.from(value).map(stableSerialize).join(',')}]`;
  }

  if (value instanceof Map) {
    const entries = Array.from(value.entries())
      .map(([key, entryValue]) => [stableSerialize(key), stableSerialize(entryValue)])
      .sort(([left], [right]) => left.localeCompare(right));

    return `{map:${entries.map(([key, entryValue]) => `${key}:${entryValue}`).join(',')}}`;
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

export function stableHash(value) {
  return hashString(stableSerialize(value));
}
