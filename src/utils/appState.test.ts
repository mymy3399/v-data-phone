import { describe, it, expect } from 'vitest';
import { ensureValidMatchData, getSetterZone, parseStoredJson } from './appState';

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
