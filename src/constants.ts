import { ensureValidMatchData } from './utils/appState';

export const ROLES = { UNASSIGNED: 'unassigned', HOME: 'home', AWAY: 'away', COACH: 'coach' };

export const SKILLS = [
  { id: 'serve',   label: 'เสิร์ฟ (S)',   color: 'bg-emerald-700 border-emerald-600 text-white', colorActive: 'bg-emerald-400 border-emerald-300 text-slate-900' },
  { id: 'receive', label: 'รับเสิร์ฟ (R)', color: 'bg-sky-700 border-sky-600 text-white',       colorActive: 'bg-sky-400 border-sky-300 text-slate-900' },
  { id: 'set',     label: 'เซต (E)',       color: 'bg-violet-700 border-violet-600 text-white',  colorActive: 'bg-violet-400 border-violet-300 text-slate-900' },
  { id: 'attack',  label: 'ตบ (A)',        color: 'bg-rose-700 border-rose-600 text-white',      colorActive: 'bg-rose-400 border-rose-300 text-white' },
  { id: 'block',   label: 'บล็อก (B)',     color: 'bg-amber-600 border-amber-500 text-white',   colorActive: 'bg-amber-400 border-amber-300 text-slate-900' },
  { id: 'dig',     label: 'รับตบ (D)',     color: 'bg-orange-700 border-orange-600 text-white',  colorActive: 'bg-orange-400 border-orange-300 text-slate-900' }
];

export const EVALUATIONS = [
  { id: '#', label: 'Perfect (#)', color: 'bg-emerald-600' },
  { id: '+', label: 'Good (+)', color: 'bg-indigo-500' },
  { id: '!', label: 'Okay (!)', color: 'bg-amber-600' },
  { id: '-', label: 'Poor (-)', color: 'bg-orange-600' },
  { id: '=', label: 'Error (=)', color: 'bg-rose-600' },
  { id: '/', label: 'Blocked (/)', color: 'bg-purple-600' }
];

export const COURT_ZONES = [
  { id: 4, label: 'R4' }, { id: 3, label: 'R3' }, { id: 2, label: 'R2' },
  { id: 5, label: 'R5' }, { id: 6, label: 'R6' }, { id: 1, label: 'R1' }
];

export const OPP_COURT_ZONES = [
  { id: 1, label: 'R1' }, { id: 6, label: 'R6' }, { id: 5, label: 'R5' },
  { id: 2, label: 'R2' }, { id: 3, label: 'R3' }, { id: 4, label: 'R4' }
];

export const POSITIONS = ['S', 'OH', 'OP', 'MB', 'L'];

export const INITIAL_MATCH_STATE = {
  status: 'ongoing',
  teamNames: { home: "HOME", away: "AWAY" },
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
    home: ["1", "2", "3", "4", "5", "6"],
    away: ["7", "8", "9", "10", "11", "12"]
  },
  roster: {
    home: {
      "1": { name: "P1", position: "S", isStarter: true },
      "2": { name: "P2", position: "OH", isStarter: true },
      "3": { name: "P3", position: "MB", isStarter: true },
      "4": { name: "P4", position: "OP", isStarter: true },
      "5": { name: "P5", position: "OH", isStarter: true },
      "6": { name: "P6", position: "MB", isStarter: true },
      "13": { name: "Sub1", position: "L", isStarter: false },
      "14": { name: "Sub2", position: "OH", isStarter: false }
    },
    away: {
      "7": { name: "A1", position: "S", isStarter: true },
      "8": { name: "A2", position: "OH", isStarter: true },
      "9": { name: "A3", position: "MB", isStarter: true },
      "10": { name: "A4", position: "OP", isStarter: true },
      "11": { name: "A5", position: "OH", isStarter: true },
      "12": { name: "A6", position: "MB", isStarter: true },
      "17": { name: "SubA1", position: "L", isStarter: false },
      "18": { name: "SubA2", position: "MB", isStarter: false }
    }
  },
  tempRallyEvents: [],
  events: [],
  setScores: [],
  liberoSwaps: { home: {}, away: {} }
};

export const ensureValidMatchDataLocal = (state: any) => ensureValidMatchData(state, INITIAL_MATCH_STATE);
