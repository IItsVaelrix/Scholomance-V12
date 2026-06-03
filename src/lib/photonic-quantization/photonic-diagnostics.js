function stableStringify(value) {
  if (value === null || value === undefined || typeof value !== 'object') {
    return JSON.stringify(value ?? null);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const entries = Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`);

  return `{${entries.join(',')}}`;
}

export function hashString(value) {
  const input = String(value ?? '');
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function hashObject(value) {
  return hashString(stableStringify(value));
}

export function createDiagnostic(code, severity, message, details = {}) {
  return Object.freeze({
    code: String(code || 'PHOTONIC_UNKNOWN'),
    severity: String(severity || 'info'),
    message: String(message || ''),
    details: Object.freeze({ ...details }),
  });
}

export function sortDiagnostics(diagnostics) {
  return Object.freeze(
    [...(Array.isArray(diagnostics) ? diagnostics : [])]
      .sort((left, right) => {
        const severityOrder = { error: 0, warn: 1, info: 2 };
        const severityDelta = (severityOrder[left.severity] ?? 9) - (severityOrder[right.severity] ?? 9);
        if (severityDelta !== 0) return severityDelta;
        return String(left.code).localeCompare(String(right.code));
      })
  );
}
