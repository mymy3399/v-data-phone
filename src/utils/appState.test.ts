import { describe, it, expect } from 'vitest';
import { ensureValidMatchData, getSetterZone, parseStoredJson, rotateLineup, unrotateLineup, checkSetEnd, computeRotationStats } from './appState';

describe('ensureValidMatchData', () => {
  const initialState = {
    status: 'ongoing',
    teamNames: { home: 'HOME', away: 'AWAY' },
    matchInfo: {
      tournament: '',
      venue: '',
      matchDate: '',
      matchTime: '',
      gender: '',
      ageGroup: '',
      compLevel: 'general'
    },
    score: { home: 0, away: 0, set: 1 },
    setsWon: { home: 0, away: 0 },
    timeouts: { home: 0, away: 0 },
    currentServe: null,
    rotations: {
      home: ['1', '2', '3', '4', '5', '6'],
      away: ['7', '8', '9', '10', '11', '12']
    },
    roster: { home: {}, away: {} },
    tempRallyEvents: [],
    events: [],
    setScores: [],
    liberoSwaps: { home: {}, away: {} }
  };

  it('repairs malformed rotations and preserves defaults', () => {
    const repaired = ensureValidMatchData({ rotations: { home: ['1', '2'], away: null } }, initialState);
    expect(repaired.rotations.home).toEqual(initialState.rotations.home);
    expect(repaired.rotations.away).toEqual(initialState.rotations.away);
  });

  it('keeps arrays for tempRallyEvents and events', () => {
    const repaired = ensureValidMatchData({ tempRallyEvents: null as any, events: 'bad' as any }, initialState);
    expect(repaired.tempRallyEvents).toEqual([]);
    expect(repaired.events).toEqual([]);
  });
});

describe('getSetterZone', () => {
  it('returns the setter zone when the setter exists', () => {
    const rotations = ['1', '2', '3', '4', '5', '6'];
    const roster = { '2': { position: 'S' } };
    expect(getSetterZone(rotations, roster)).toBe(2);
  });

  it('returns null when no setter is present', () => {
    const rotations = ['1', '2', '3', '4', '5', '6'];
    const roster = { '2': { position: 'OH' } };
    expect(getSetterZone(rotations, roster)).toBeNull();
  });
});

describe('parseStoredJson', () => {
  it('falls back safely for invalid JSON', () => {
    expect(parseStoredJson('{invalid', null)).toBeNull();
  });
});

describe('rotateLineup', () => {
  it('advances every player one position clockwise (R1 takes over from R2, ..., R2 wraps to R1)', () => {
    expect(rotateLineup(['1', '2', '3', '4', '5', '6'])).toEqual(['2', '3', '4', '5', '6', '1']);
  });

  it('returns the input unchanged if it is not a 6-player lineup', () => {
    expect(rotateLineup(['1', '2'] as any)).toEqual(['1', '2']);
    expect(rotateLineup(null as any)).toBeNull();
  });
});

describe('unrotateLineup', () => {
  it('is the exact inverse of rotateLineup, for undoing a side-out rotation', () => {
    const original = ['1', '2', '3', '4', '5', '6'];
    expect(unrotateLineup(rotateLineup(original))).toEqual(original);
  });
});

describe('computeRotationStats', () => {
  const events = [
    // Zone 1: 3 home events, 2 wins -> winPercent 67%
    { team: 'home', setterZoneHome: 1, eval: '#' },
    { team: 'home', setterZoneHome: 1, eval: '+' },
    { team: 'home', setterZoneHome: 1, eval: '=' },
    // Zone 2: 1 home event, 0 wins -> winPercent 0%
    { team: 'home', setterZoneHome: 2, eval: '=' },
    // Away events should never affect home's stats
    { team: 'away', setterZoneAway: 1, eval: '#' }
  ];

  it('computes an independent win rate per zone that does not need to sum to 100%', () => {
    const stats = computeRotationStats(events, 'home');
    const zone1 = stats.find(z => z.zone === 1);
    const zone2 = stats.find(z => z.zone === 2);
    expect(zone1.winPercent).toBe(67);
    expect(zone2.winPercent).toBe(0);
  });

  it('computes a share-of-play percentage that sums to ~100% across all zones', () => {
    const stats = computeRotationStats(events, 'home');
    const totalShare = stats.reduce((sum, z) => sum + z.sharePercent, 0);
    expect(totalShare).toBeGreaterThanOrEqual(99);
    expect(totalShare).toBeLessThanOrEqual(101);
    expect(stats.find(z => z.zone === 1).sharePercent).toBe(75); // 3 of 4 home events
    expect(stats.find(z => z.zone === 2).sharePercent).toBe(25); // 1 of 4 home events
  });

  it('only counts events belonging to the requested team', () => {
    const stats = computeRotationStats(events, 'home');
    const zonesWithEvents = stats.filter(z => z.total > 0).map(z => z.zone);
    expect(zonesWithEvents).toEqual([1, 2]); // not zone 1 from the away event
  });

  it('returns all zeroes for a zone with no events', () => {
    const stats = computeRotationStats(events, 'home');
    const emptyZone = stats.find(z => z.zone === 6);
    expect(emptyZone).toEqual({ zone: 6, total: 0, wins: 0, errors: 0, winPercent: 0, sharePercent: 0 });
  });
});

describe('checkSetEnd', () => {
  it('requires 25 points and a 2-point lead to win sets 1-4', () => {
    expect(checkSetEnd(25, 20, 1)).toBe('home');
    expect(checkSetEnd(25, 24, 1)).toBeNull();
    expect(checkSetEnd(26, 24, 1)).toBe('home');
  });

  it('only requires 15 points in the deciding 5th set', () => {
    expect(checkSetEnd(15, 10, 5)).toBe('home');
    expect(checkSetEnd(25, 20, 5)).toBe('home');
  });

  it('returns null while the set is still in progress', () => {
    expect(checkSetEnd(10, 8, 1)).toBeNull();
  });

  it('detects the away team winning', () => {
    expect(checkSetEnd(20, 25, 1)).toBe('away');
  });
});
