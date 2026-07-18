export const ensureValidMatchData = (state: any, initialState: any) => {
  if (!state) return initialState;

  const baseState = initialState || {
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
    roster: {
      home: {},
      away: {}
    },
    tempRallyEvents: [],
    events: [],
    setScores: [],
    liberoSwaps: { home: {}, away: {} }
  };

  return {
    ...baseState,
    ...state,
    teamNames: state.teamNames ? { ...baseState.teamNames, ...state.teamNames } : baseState.teamNames,
    matchInfo: state.matchInfo ? { ...baseState.matchInfo, ...state.matchInfo } : baseState.matchInfo,
    score: state.score ? { ...baseState.score, ...state.score } : baseState.score,
    setsWon: state.setsWon ? { ...baseState.setsWon, ...state.setsWon } : baseState.setsWon,
    timeouts: state.timeouts ? { ...baseState.timeouts, ...state.timeouts } : baseState.timeouts,
    rotations: state.rotations ? {
      home: Array.isArray(state.rotations.home) && state.rotations.home.length === 6 ? state.rotations.home : baseState.rotations.home,
      away: Array.isArray(state.rotations.away) && state.rotations.away.length === 6 ? state.rotations.away : baseState.rotations.away
    } : baseState.rotations,
    roster: state.roster ? {
      home: state.roster.home || baseState.roster.home,
      away: state.roster.away || baseState.roster.away
    } : baseState.roster,
    tempRallyEvents: Array.isArray(state.tempRallyEvents) ? state.tempRallyEvents : baseState.tempRallyEvents,
    events: Array.isArray(state.events) ? state.events : baseState.events,
    setScores: Array.isArray(state.setScores) ? state.setScores : baseState.setScores,
    liberoSwaps: state.liberoSwaps ? { ...baseState.liberoSwaps, ...state.liberoSwaps } : baseState.liberoSwaps
  };
};

export const getSetterZone = (rotations: any, roster: any) => {
  if (!rotations || !roster) return null;
  const setterNum = rotations.find((num: string) => roster[num]?.position === 'S');
  if (!setterNum) return null;
  const idx = rotations.indexOf(setterNum);
  return idx !== -1 ? idx + 1 : null;
};

export const parseStoredJson = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

// Advances a 6-player lineup one position clockwise after a side-out (R1 -> R6 -> ... -> R2 -> R1).
export const rotateLineup = (rotation: string[]): string[] => {
  if (!Array.isArray(rotation) || rotation.length !== 6) return rotation;
  return [rotation[1], rotation[2], rotation[3], rotation[4], rotation[5], rotation[0]];
};

// Exact inverse of rotateLineup, used when undoing a point that triggered a side-out rotation.
export const unrotateLineup = (rotation: string[]): string[] => {
  if (!Array.isArray(rotation) || rotation.length !== 6) return rotation;
  return [rotation[5], rotation[0], rotation[1], rotation[2], rotation[3], rotation[4]];
};

// FIVB rally-point scoring: first to 25 (15 in the deciding 5th set) with a 2-point lead wins the set.
export const checkSetEnd = (homeScore: number, awayScore: number, currentSet: number): 'home' | 'away' | null => {
  const targetScore = currentSet === 5 ? 15 : 25;
  if (homeScore >= targetScore && homeScore - awayScore >= 2) return 'home';
  if (awayScore >= targetScore && awayScore - homeScore >= 2) return 'away';
  return null;
};

export interface RotationZoneStat {
  zone: number;
  total: number;
  wins: number;
  errors: number;
  // Success rate WITHIN this rotation (wins / this zone's total). Independent per zone - does not sum to 100%.
  winPercent: number;
  // This zone's share of the team's total logged events across all 6 rotations. Sums to ~100% across zones.
  sharePercent: number;
}

// Per-rotation (setter zone R1-R6) breakdown for the coach dashboard's Rotation Analysis tab.
export const computeRotationStats = (
  events: Array<{ team: string; setterZoneHome?: number | null; setterZoneAway?: number | null; eval?: string }>,
  team: 'home' | 'away'
): RotationZoneStat[] => {
  const zoneField = team === 'home' ? 'setterZoneHome' : 'setterZoneAway';
  const raw = [1, 2, 3, 4, 5, 6].map(zone => {
    const zoneEvents = (events || []).filter(e => e.team === team && e[zoneField] === zone);
    const total = zoneEvents.length;
    const wins = zoneEvents.filter(e => e.eval === '#' || e.eval === '+').length;
    const errors = zoneEvents.filter(e => e.eval === '=' || e.eval === '/').length;
    return { zone, total, wins, errors };
  });
  const grandTotal = raw.reduce((sum, z) => sum + z.total, 0);

  return raw.map(z => ({
    ...z,
    winPercent: z.total > 0 ? Math.round((z.wins / z.total) * 100) : 0,
    sharePercent: grandTotal > 0 ? Math.round((z.total / grandTotal) * 100) : 0
  }));
};
