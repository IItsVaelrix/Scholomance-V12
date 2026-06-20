import { describe, it, expect } from 'vitest';
import {
  RESOLVED_BUG_STATUSES,
  isBugResolved,
  isActiveCriticalBug,
  activeCriticalIds,
  hasUnacknowledgedCritical,
} from '../../src/pages/Collab/bug-status.js';

describe('isBugResolved', () => {
  it('treats terminal/done states as resolved', () => {
    expect(isBugResolved('closed')).toBe(true);
    expect(isBugResolved('duplicate')).toBe(true);
    expect(isBugResolved('verified')).toBe(true);
    expect(isBugResolved('fixed')).toBe(true);
  });

  it('treats open states as not resolved', () => {
    expect(isBugResolved('new')).toBe(false);
    expect(isBugResolved('triaged')).toBe(false);
    expect(isBugResolved('assigned')).toBe(false);
    expect(isBugResolved('in_progress')).toBe(false);
  });

  it('is case-insensitive and null-safe', () => {
    expect(isBugResolved('CLOSED')).toBe(true);
    expect(isBugResolved(undefined)).toBe(false);
    expect(isBugResolved(null)).toBe(false);
  });

  it('exposes the canonical resolved set', () => {
    expect([...RESOLVED_BUG_STATUSES].sort()).toEqual(['closed', 'duplicate', 'fixed', 'verified']);
  });
});

describe('isActiveCriticalBug — drives the pulsing bugs-tab alert', () => {
  it('is true for an open CRIT/FATAL bug', () => {
    expect(isActiveCriticalBug({ severity: 'CRIT', status: 'new' })).toBe(true);
    expect(isActiveCriticalBug({ severity: 'FATAL', status: 'in_progress' })).toBe(true);
  });

  it('is false once a critical bug is closed (the reported annoyance)', () => {
    expect(isActiveCriticalBug({ severity: 'CRIT', status: 'closed' })).toBe(false);
    expect(isActiveCriticalBug({ severity: 'FATAL', status: 'duplicate' })).toBe(false);
    expect(isActiveCriticalBug({ severity: 'CRIT', status: 'verified' })).toBe(false);
  });

  it('is false for non-critical bugs regardless of status', () => {
    expect(isActiveCriticalBug({ severity: 'HIGH', status: 'new' })).toBe(false);
    expect(isActiveCriticalBug({ severity: 'LOW', status: 'in_progress' })).toBe(false);
  });
});

describe('activeCriticalIds', () => {
  it('returns ids of only the open critical bugs', () => {
    const bugs = [
      { id: 'a', severity: 'CRIT', status: 'new' },
      { id: 'b', severity: 'CRIT', status: 'closed' },
      { id: 'c', severity: 'HIGH', status: 'new' },
      { id: 'd', severity: 'FATAL', status: 'in_progress' },
    ];
    expect(activeCriticalIds(bugs)).toEqual(['a', 'd']);
  });
});

describe('hasUnacknowledgedCritical — alert only nags for unseen open criticals', () => {
  const bugs = [
    { id: 'a', severity: 'CRIT', status: 'new' },
    { id: 'b', severity: 'CRIT', status: 'closed' },
  ];

  it('is true when an open critical has not been seen', () => {
    expect(hasUnacknowledgedCritical(bugs, [])).toBe(true);
    expect(hasUnacknowledgedCritical(bugs, ['x'])).toBe(true);
  });

  it('is false once every open critical id has been acknowledged', () => {
    expect(hasUnacknowledgedCritical(bugs, ['a'])).toBe(false);
    expect(hasUnacknowledgedCritical(bugs, new Set(['a', 'b']))).toBe(false);
  });

  it('re-fires when a NEW critical arrives after acknowledgement', () => {
    const seen = ['a'];
    const withNew = [...bugs, { id: 'z', severity: 'FATAL', status: 'new' }];
    expect(hasUnacknowledgedCritical(withNew, seen)).toBe(true);
  });

  it('stays quiet when there are no open criticals at all', () => {
    expect(hasUnacknowledgedCritical([{ id: 'b', severity: 'CRIT', status: 'closed' }], [])).toBe(false);
  });
});
