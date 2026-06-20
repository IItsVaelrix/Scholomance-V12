/**
 * Bug status helpers.
 *
 * The bugs-tab alert (the pulsing "!" badge) must reflect *open* criticals only.
 * Counting CRIT/FATAL by severity alone keeps the badge flashing forever once a
 * critical bug is closed — the reported annoyance. Resolution status, not just
 * severity, decides whether a bug still demands attention.
 *
 * Resolved set mirrors the BugBoard maze-status colour grouping: green "done"
 * (fixed/verified) + grey "dismissed" (closed/duplicate). Active = new, triaged,
 * assigned, in_progress.
 */

export const RESOLVED_BUG_STATUSES = Object.freeze([
  'fixed',
  'verified',
  'closed',
  'duplicate',
]);

export function isBugResolved(status) {
  return RESOLVED_BUG_STATUSES.includes(String(status ?? '').toLowerCase());
}

export function isActiveCriticalBug(bug) {
  const critical = bug?.severity === 'CRIT' || bug?.severity === 'FATAL';
  return critical && !isBugResolved(bug?.status);
}

/** Ids of the currently open critical bugs — the acknowledgement set. */
export function activeCriticalIds(bugs) {
  return (bugs || []).filter(isActiveCriticalBug).map((b) => b.id);
}

/**
 * Should the bugs-tab alert pulse? Only when an open critical exists that the
 * user has not yet acknowledged (by viewing the bugs tab). This gives the alert
 * memory across navigation: it stays quiet for already-seen criticals and
 * re-fires only when a NEW critical arrives.
 */
export function hasUnacknowledgedCritical(bugs, seenIds) {
  const seen = seenIds instanceof Set ? seenIds : new Set(seenIds || []);
  return (bugs || []).some((b) => isActiveCriticalBug(b) && !seen.has(b.id));
}
