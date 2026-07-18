import { describe, it, expect } from 'vitest';
import { ensureValidMatchData, getSetterZone, parseStoredJson, rotateLineup, unrotateLineup, checkSetEnd } from './appState';

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
