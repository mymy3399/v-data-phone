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
