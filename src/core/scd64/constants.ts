export const SCD64_SLOT_NAMES = [
  "BUGCLASS",
  "COORDSYS",
  "INVARIANT",
  "MAGNITUDE",
  "MASKING",
  "GATE",
  "PROPAGATE",
  "VERDICT"
] as const;

export const SCD64_REGEX = /^[0-9A-F]{64}$/;
