import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, addDoc } from 'firebase/firestore';
import { 
  ClipboardList, MonitorPlay, Check, X, Undo2, Settings, 
  Users, RotateCcw, AlertCircle, BarChart3, Swords, LogIn, Plus, Copy, CloudLightning, Download, BookOpen, ChevronRight, Link2, Trophy, PlayCircle, ChevronLeft
} from 'lucide-react';

// Custom Animated Volleyball Icon
const VolleyballIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a15.3 15.3 0 0 1 7.1 17.1" />
    <path d="M12 22a15.3 15.3 0 0 1-7.1-17.1" />
    <path d="M2 12a15.3 15.3 0 0 1 17.1 7.1" />
    <path d="M22 12a15.3 15.3 0 0 1-17.1-7.1" />
  </svg>
);

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  projectId: "demo-project"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'volleydata-app';

const ROLES = { UNASSIGNED: 'unassigned', HOME: 'home', AWAY: 'away', COACH: 'coach' };

const SKILLS = [
  { id: 'serve', label: 'เสิร์ฟ (S)' }, 
  { id: 'receive', label: 'รับเสิร์ฟ (R)' },
  { id: 'set', label: 'เซต (E)' }, 
  { id: 'attack', label: 'ตบ (A)' },
  { id: 'block', label: 'บล็อก (B)' }, 
  { id: 'dig', label: 'รับตบ (D)' }
];

const EVALUATIONS = [
  { id: '#', label: 'Perfect (#)', color: 'bg-emerald-600' }, 
  { id: '+', label: 'Good (+)', color: 'bg-indigo-500' },
  { id: '!', label: 'Okay (!)', color: 'bg-amber-600' }, 
  { id: '-', label: 'Poor (-)', color: 'bg-orange-600' },
  { id: '=', label: 'Error (=)', color: 'bg-rose-600' }, 
  { id: '/', label: 'Blocked (/)', color: 'bg-purple-600' }
];

const COURT_ZONES = [
  { id: 4, label: 'R4' }, { id: 3, label: 'R3' }, { id: 2, label: 'R2' }, 
  { id: 5, label: 'R5' }, { id: 6, label: 'R6' }, { id: 1, label: 'R1' }  
];

const OPP_COURT_ZONES = [
  { id: 1, label: 'R1' }, { id: 6, label: 'R6' }, { id: 5, label: 'R5' }, 
  { id: 2, label: 'R2' }, { id: 3, label: 'R3' }, { id: 4, label: 'R4' }  
];

const POSITIONS = ['S', 'OH', 'OP', 'MB', 'L'];

const INITIAL_MATCH_STATE = {
  status: 'ongoing',
  teamNames: { home: "HOME", away: "AWAY" },
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
  events: []
};

const getSetterZone = (rotations, roster) => {
  if (!rotations || !roster) return null;
  const setterNum = rotations.find(num => roster[num]?.position === 'S');
  if (!setterNum) return null;
  const idx = rotations.indexOf(setterNum);
  return idx !== -1 ? idx + 1 : null;
};

/* ========================================================================= */
/* HELPER COMPONENTS                                                         */
/* ========================================================================= */

function RotationAnalysisView({ team, events, teamName, isHome }) {
  const themeBorder = isHome ? 'border-indigo-900/40 bg-indigo-950/20' : 'border-rose-900/40 bg-rose-950/20';
  const themeText = isHome ? 'text-indigo-400 bg-indigo-950/60' : 'text-rose-400 bg-rose-950/60';

  return (
    <div className={`rounded-xl p-3 border ${themeBorder} shadow-lg flex flex-col min-h-0 w-full h-full`}>
      <h3 className={`text-[11px] sm:text-[12px] font-black px-3 py-2 rounded-lg mb-3 uppercase tracking-wider text-center border ${themeText} shrink-0 shadow-sm`}>
        วิเคราะห์หน้าเซต: ทีม {teamName}
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 flex-1 overflow-y-auto custom-scrollbar p-1">
        {[1, 6, 5, 2, 3, 4].map(zone => {
          const rotEvents = events.filter(e => e.team === team && (team === 'home' ? e.setterZoneHome === zone : e.setterZoneAway === zone));
          
          const total = rotEvents.length;
          const wins = rotEvents.filter(e => e.eval === '#' || e.eval === '+').length;
          const errors = rotEvents.filter(e => e.eval === '=' || e.eval === '/').length;
          const winPercent = total > 0 ? ((wins / total) * 100).toFixed(0) : 0;

          return (
            <div key={zone} className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-between shadow-md relative text-center min-h-[160px] sm:min-h-[180px] hover:border-slate-500 transition-colors">
              <span className="text-[9px] sm:text-[10px] font-black text-amber-400 bg-slate-950 px-3 py-1 rounded-md border border-slate-800 shrink-0 mb-2 shadow-inner">
                S ยืน R{zone}
              </span>
              
              {/* คอร์ทจำลองจิ๋วขยายขนาดใหญ่ขึ้นมาก เพื่อให้อ่านง่าย */}
              <div className="w-[100px] h-[75px] sm:w-[120px] sm:h-[90px] grid grid-cols-3 grid-rows-2 gap-[1.5px] bg-slate-950 border border-slate-600/60 p-[1.5px] rounded-md my-2 shrink-0">
                {[4, 3, 2, 5, 6, 1].map(z => (
                  <div 
                    key={z} 
                    className={`flex items-center justify-center text-[9px] sm:text-[11px] font-black rounded-[3px] transition-all
                      ${z === zone ? 'bg-amber-500 text-slate-900 font-extrabold shadow-inner scale-105 z-10' : 'bg-slate-800 text-slate-400'}
                    `}
                  >
                    {z === zone ? 'SET' : `R${z}`}
                  </div>
                ))}
              </div>

              {/* ข้อมูลสถิติของหน้าเซตนี้ */}
              <div className="w-full flex justify-between items-center text-[10px] sm:text-[12px] font-bold text-slate-400 px-1 mt-1 leading-none shrink-0">
                <span className="text-emerald-400 font-extrabold">+{wins}</span>
                <span className="text-[9px] sm:text-[10px] text-slate-500">({total})</span>
                <span className="text-rose-400 font-extrabold">-{errors}</span>
              </div>
              
              <div className="w-full bg-slate-950 h-2 rounded-full mt-2.5 overflow-hidden flex shrink-0 border border-slate-800">
                 <div style={{ width: `${winPercent}%` }} className="bg-emerald-500 h-full transition-all duration-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
              </div>
              <span className="text-[10px] sm:text-[12px] text-emerald-400 font-black mt-1.5 shrink-0">{winPercent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeatmapCourt({ strengths, weaknesses }) {
  const getZoneColor = (zoneId) => {
    const sCount = strengths[zoneId] || 0;
    const wCount = weaknesses[zoneId] || 0;
    
    if (sCount === 0 && wCount === 0) return 'bg-slate-800/40 text-slate-600';
    
    if (sCount >= wCount) {
      if (sCount >= 3) return 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]';
      return 'bg-emerald-800 text-emerald-200 font-semibold shadow-[inset_0_0_8px_rgba(0,0,0,0.4)]';
    } else {
      if (wCount >= 3) return 'bg-rose-600 text-white font-bold ring-2 ring-rose-400 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]';
      return 'bg-rose-800 text-rose-200 font-semibold shadow-[inset_0_0_8px_rgba(0,0,0,0.4)]';
    }
  };

  return (
    <div className="w-[140px] sm:w-[180px] md:w-[200px] lg:w-[240px] aspect-square grid grid-cols-3 grid-rows-[2fr_1fr] border-2 border-white/40 synthetic-court relative shadow-xl rounded-lg overflow-hidden">
      {OPP_COURT_ZONES.map(zone => (
        <div
          key={`heat-${zone.id}`}
          className={`flex flex-col items-center justify-center border border-white/20 relative transition-all ${getZoneColor(zone.id)}`}
        >
          <span className="absolute top-1 right-1.5 text-[9px] sm:text-[11px] lg:text-[12px] opacity-50 font-black">{zone.label}</span>
          <div className="flex flex-col items-center leading-none gap-1">
            <span className="text-sm sm:text-base md:text-lg lg:text-xl font-black text-emerald-300 drop-shadow-md">+{strengths[zone.id] || 0}</span>
            <span className="text-sm sm:text-base md:text-lg lg:text-xl font-black text-rose-300 drop-shadow-md">-{weaknesses[zone.id] || 0}</span>
          </div>
        </div>
      ))}
      <div className="absolute bottom-[33.33%] left-0 w-full border-b-2 border-white/40 pointer-events-none"></div>
    </div>
  );
}

function SkillBarStats({ teamStats }) {
  return (
    <div className="flex flex-col gap-2">
      {SKILLS.map(skill => {
        const stats = teamStats[skill.id] || { total: 0, goodPercent: '0', errorPercent: '0', neutralPercent: '0' };
        return (
          <div key={skill.id} className="flex items-center gap-2">
            <div className="w-16 sm:w-20 shrink-0 text-[10px] sm:text-[12px] font-bold text-slate-300 flex justify-between">
              <span>{skill.label.split(' ')[0]}</span>
              <span className="text-slate-500 font-mono text-[10px]">({stats.total})</span>
            </div>
            
            {stats.total === 0 ? (
              <div className="flex-1 h-3.5 bg-slate-950 rounded border border-slate-800/50 flex items-center justify-center">
                <span className="text-[9px] text-slate-600 tracking-wider">ไม่มีข้อมูล</span>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-3.5 bg-slate-950 rounded overflow-hidden flex shadow-inner">
                  {stats.goodPercent > 0 && (
                    <div style={{ width: `${stats.goodPercent}%` }} className="bg-emerald-500 transition-all"></div>
                  )}
                  {stats.neutralPercent > 0 && (
                    <div style={{ width: `${stats.neutralPercent}%` }} className="bg-amber-500 transition-all"></div>
                  )}
                  {stats.errorPercent > 0 && (
                    <div style={{ width: `${stats.errorPercent}%` }} className="bg-rose-500 transition-all"></div>
                  )}
                </div>
                <div className="w-[38px] sm:w-[48px] shrink-0 flex justify-between text-[10px] sm:text-[11px] font-black">
                  <span className="text-emerald-400">{stats.goodPercent}%</span>
                  <span className="text-rose-400">{stats.errorPercent}%</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RotPlayer({ num, zone, pos }) {
  return (
    <div className="flex flex-col items-center justify-center bg-slate-800 border border-slate-700 py-1.5 rounded-lg relative z-10 shadow-sm">
      <span className="absolute top-0 right-1 text-[7px] text-slate-400 font-bold">{zone}</span>
      <span className="font-black text-white text-[12px] leading-tight mt-0.5">{num || '-'}</span>
      <span className="text-[7px] text-amber-400 leading-none truncate max-w-[32px] uppercase font-mono font-bold">{pos || '-'}</span>
    </div>
  );
}

function ScoreBoard({ score, setsWon, role, teamNames, timeouts, currentServe, onUpdateScore, onTimeout, onUpdateServe }) {
  const isHomeServe = currentServe === 'home';
  const isAwayServe = currentServe === 'away';

  return (
    <div className="bg-slate-900 rounded-xl p-2 border border-slate-700 shrink-0 shadow-lg relative">
      <div className="flex justify-between items-center">
        <div className="flex flex-col items-center w-5/12">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-indigo-400 font-black text-[10px] sm:text-xs truncate max-w-[100px]">{teamNames.home}</span>
            {isHomeServe && <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping" title="ทีมเสิร์ฟ"></span>}
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono leading-none my-1 text-white">{score.home}</div>
          <div className="text-[8px] sm:text-[9px] text-slate-400 font-bold mb-1 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
            เซตได้: <span className="text-indigo-400">{setsWon?.home || 0}</span>
          </div>
          
          <div className="flex flex-col gap-1 w-full items-center mt-0.5">
            {(role === ROLES.HOME || role === ROLES.COACH) && (
              <div className="flex gap-1 w-full justify-center">
                <button onClick={() => onUpdateScore('home', -1)} className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 border border-slate-600 text-[9px] font-bold text-slate-300 leading-none transition-colors">-1</button>
                <button onClick={() => onUpdateScore('home', 1)} disabled={currentServe === null} className="px-3 py-1 bg-indigo-600 rounded hover:bg-indigo-500 text-[10px] font-black text-white shadow-md leading-none disabled:opacity-40 transition-colors">+1</button>
              </div>
            )}
            {(role === ROLES.HOME || role === ROLES.COACH) && (
              <button 
                onClick={() => onTimeout('home')}
                disabled={timeouts?.home >= 2}
                className="text-[8px] bg-slate-800 disabled:opacity-40 hover:bg-amber-900/50 text-amber-400 border border-slate-700 px-2 py-1 rounded-md font-bold transition-colors w-full max-w-[80px]"
              >
                เวลานอก ({timeouts?.home || 0}/2)
              </button>
            )}
          </div>
        </div>

        <div className="w-2/12 flex flex-col items-center justify-center shrink-0 leading-none relative">
          <span className="text-[8px] font-black text-slate-300 tracking-widest bg-slate-950 px-2 py-1 rounded border border-slate-700">SET {score.set}</span>
          <div className="text-sm font-bold text-slate-600 leading-none py-1.5">:</div>
          
          {currentServe === null && score.home === 0 && score.away === 0 && (
            role !== ROLES.COACH ? (
              <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50 w-[150px] bg-slate-800 border border-amber-500/50 p-2.5 rounded-xl shadow-2xl text-center">
                <p className="text-[10px] font-bold mb-2 text-amber-400 leading-normal">กำหนดฝ่ายเสิร์ฟแรก</p>
                <div className="flex gap-1.5 justify-center">
                  <button onClick={() => onUpdateServe('home')} className="flex-1 py-1.5 text-[9px] font-bold bg-indigo-600 rounded-lg hover:bg-indigo-500 text-white shadow-sm transition-transform active:scale-95">HOME</button>
                  <button onClick={() => onUpdateServe('away')} className="flex-1 py-1.5 text-[9px] font-bold bg-rose-600 rounded-lg hover:bg-rose-500 text-white shadow-sm transition-transform active:scale-95">AWAY</button>
                </div>
              </div>
            ) : (
              <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50 w-[160px] bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-center shadow-xl">
                <span className="text-[9px] text-amber-400 font-bold block animate-pulse leading-normal">รอสต๊าฟกำหนดสิทธิ์เสิร์ฟแรก...</span>
              </div>
            )
          )}
        </div>

        <div className="flex flex-col items-center w-5/12">
          <div className="flex items-center gap-1.5 leading-none">
            {isAwayServe && <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping" title="ทีมเสิร์ฟ"></span>}
            <span className="text-rose-400 font-black text-[10px] sm:text-xs truncate max-w-[100px]">{teamNames.away}</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono leading-none my-1 text-white">{score.away}</div>
          <div className="text-[8px] sm:text-[9px] text-slate-400 font-bold mb-1 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
            เซตได้: <span className="text-rose-400">{setsWon?.away || 0}</span>
          </div>
          
          <div className="flex flex-col gap-1 w-full items-center mt-0.5">
            {(role === ROLES.AWAY || role === ROLES.COACH) && (
              <div className="flex gap-1 w-full justify-center">
                <button onClick={() => onUpdateScore('away', 1)} disabled={currentServe === null} className="px-3 py-1 bg-rose-600 rounded hover:bg-rose-500 text-[10px] font-black text-white shadow-md leading-none disabled:opacity-40 transition-colors">+1</button>
                <button onClick={() => onUpdateScore('away', -1)} className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 border border-slate-600 text-[9px] font-bold text-slate-300 leading-none transition-colors">-1</button>
              </div>
            )}
            {(role === ROLES.AWAY || role === ROLES.COACH) && (
              <button 
                onClick={() => onTimeout('away')}
                disabled={timeouts?.away >= 2}
                className="text-[8px] bg-slate-800 disabled:opacity-40 hover:bg-amber-900/50 text-amber-400 border border-slate-700 px-2 py-1 rounded-md font-bold transition-colors w-full max-w-[80px]"
              >
                เวลานอก ({timeouts?.away || 0}/2)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleSelection({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950 p-4 overflow-hidden">
      <div className="text-center mb-8 max-w-sm">
        <VolleyballIcon className="w-12 h-12 text-slate-400 mx-auto mb-4 animate-[spin_10s_linear_infinite]" />
        <h2 className="text-lg md:text-xl font-black mb-2 text-white leading-tight">V Project (beta)</h2>
        <p className="text-[11px] sm:text-xs text-slate-400 leading-normal">
          กรุณาเลือกบทบาทการใช้งานของคุณ ข้อมูลจะถูกซิงค์ผ่านคลาวด์ร่วมกับทีมแบบ Real-time
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 max-w-xl w-full justify-center">
        <button 
          onClick={() => onSelect(ROLES.HOME)} 
          className="flex items-center sm:flex-col sm:items-center p-5 bg-slate-900 rounded-2xl border border-slate-800 hover:border-indigo-500 transition-all w-full sm:w-44 text-left sm:text-center shadow-lg group active:scale-95"
        >
          <ClipboardList className="w-10 h-10 text-indigo-400 mr-4 sm:mr-0 sm:mb-3 group-hover:scale-110 transition-transform duration-300" />
          <div>
            <h3 className="text-[12px] sm:text-sm font-black leading-tight text-white">HOME SCOUT</h3>
            <p className="text-[10px] text-slate-500 leading-tight sm:mt-1.5">จดบันทึกทีมเหย้า</p>
          </div>
        </button>

        <button 
          onClick={() => onSelect(ROLES.AWAY)} 
          className="flex items-center sm:flex-col sm:items-center p-5 bg-slate-900 rounded-2xl border border-slate-800 hover:border-rose-500 transition-all w-full sm:w-44 text-left sm:text-center shadow-lg group active:scale-95"
        >
          <ClipboardList className="w-10 h-10 text-rose-400 mr-4 sm:mr-0 sm:mb-3 group-hover:scale-110 transition-transform duration-300" />
          <div>
            <h3 className="text-[12px] sm:text-sm font-black leading-tight text-white">AWAY SCOUT</h3>
            <p className="text-[10px] text-slate-500 leading-tight sm:mt-1.5">จดบันทึกทีมเยือน</p>
          </div>
        </button>

        <button 
          onClick={() => onSelect(ROLES.COACH)} 
          className="flex items-center sm:flex-col sm:items-center p-5 bg-slate-900 rounded-2xl border border-slate-800 hover:border-emerald-500 transition-all w-full sm:w-44 text-left sm:text-center shadow-lg group active:scale-95"
        >
          <MonitorPlay className="w-10 h-10 text-emerald-400 mr-4 sm:mr-0 sm:mb-3 group-hover:scale-110 transition-transform duration-300" />
          <div>
            <h3 className="text-[12px] sm:text-sm font-black leading-tight text-white">COACH BOARD</h3>
            <p className="text-[10px] text-slate-500 leading-tight sm:mt-1.5">แดชบอร์ดสรุปผล</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function LobbyScreen({ roomId, setRoomId, onCreateRoom, onJoinRoom, error }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        
        {/* Decorative background element */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-lg shadow-slate-950/50 border border-slate-700">
            <VolleyballIcon className="w-10 h-10 text-emerald-400 animate-[spin_8s_linear_infinite]" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">V Project <span className="text-sm text-amber-500 font-bold align-top">beta</span></h1>
          <p className="text-xs text-slate-400 text-center leading-relaxed">
            ระบบจดบันทึกสถิติวอลเลย์บอลระดับมืออาชีพ
            <br />
            <span className="text-emerald-400 font-medium">Cloud Connectivity Enabled</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 relative z-10">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            ระบุโค้ดห้อง (Room Code)
          </label>
          <div className="relative">
            <input 
              type="text" 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="เช่น VNL-2026-THA"
              className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3.5 text-white text-base font-mono font-bold tracking-widest outline-none transition-all uppercase text-center shadow-inner"
            />
          </div>
          <span className="text-[10px] text-slate-500 leading-normal text-center mt-1">
            ใช้รหัสห้องร่วมกันเพื่อซิงค์ข้อมูลลงแดชบอร์ดเดียว
          </span>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 relative z-10 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 relative z-10 mt-2">
          <button 
            onClick={() => onJoinRoom(roomId)}
            className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
          >
            <LogIn className="w-4 h-4 text-indigo-400" />
            เข้าห้องเดิม
          </button>
          
          <button 
            onClick={() => onCreateRoom(roomId)}
            className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl border border-indigo-500 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4 text-emerald-300" />
            สร้างห้องใหม่
          </button>
        </div>
      </div>
    </div>
  );
}

function HelpGuideModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('scout');

  const tabs = [
    { id: 'scout', label: '1. การคีย์สถิติ (Action)' },
    { id: 'rally', label: '2. การจัดการแรลลี่/ย้อนกลับ' },
    { id: 'manage', label: '3. เปลี่ยนตัว/ฟาล์ว/เวลานอก' },
    { id: 'coach', label: '4. แดชบอร์ดและ PDF' },
  ];

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl my-4 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-slate-800 shrink-0 bg-slate-950/80">
          <h2 className="text-xs sm:text-sm font-extrabold flex items-center gap-2 text-amber-500">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>คู่มือปฏิบัติงานฉบับสมบูรณ์ (V Project)</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-950 p-1 border-b border-slate-800 shrink-0 text-[10px] sm:text-xs font-bold text-slate-400 overflow-x-auto custom-scrollbar gap-1">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-lg transition-all shrink-0 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow font-black' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Container */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 text-xs sm:text-sm text-slate-300 space-y-5">
          
          {/* TAB 1: SCOUTER - ACTION KEYING */}
          {activeTab === 'scout' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> ขั้นตอนการบันทึกสถิติ 3 สเต็ป (3-Step Keying)
              </h3>
              <p className="text-slate-400 leading-relaxed text-[11px] sm:text-xs">
                การบันทึกสถิติออกแบบมาให้ลดการสัมผัสจอ โดยมีลำดับที่ตายตัวเพื่อให้ข้อมูลครบถ้วน:
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="grid grid-cols-1 gap-2 mt-2 text-[11px] sm:text-xs">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                    <span className="text-amber-400 font-black block mb-1">1️⃣ เลือกระบุตัวผู้เล่น (Player Source)</span>
                    แตะที่ตัวผู้เล่นใน <strong>OWN COURT</strong> หรือแตะปุ่มเบอร์ผู้เล่นในแผงคีย์ด้านขวา (อัปเดตตามตำแหน่งหมุนจริง)
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                    <span className="text-amber-400 font-black block mb-1">2️⃣ เลือกทักษะที่กระทำ (Skill)</span>
                    แตะเลือกทักษะ เช่น <strong>เสิร์ฟ (S), รับ (R), เซต (E), ตบ (A), บล็อก (B), รับตบ (D)</strong>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                    <span className="text-amber-400 font-black block mb-1">🎯 (Optional) กำหนดเป้าหมาย (End Zone)</span>
                    หากเป็นทักษะบุกหรือเสิร์ฟ ให้แตะเลือกตำแหน่งตกบน <strong>OPPONENT COURT</strong> ก่อนกดให้คะแนน
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                    <span className="text-emerald-400 font-black block mb-1">3️⃣ ให้เกรดผลประเมิน (Evaluation)</span>
                    แตะที่ปุ่มสีต่างๆ ตั้งแต่ <strong># (Perfect)</strong> ไปจนถึง <strong>= (Error)</strong> <br/>
                    <span className="text-[10px] text-slate-500">* ทันทีที่กดเกรด สถิติจะพุ่งเข้าสู่ "แรลลี่แต้มปัจจุบัน" ทันที</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RALLY CHAIN & UNDO */}
          {activeTab === 'rally' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> การโต้ตอบแรลลี่, การจบแต้ม และปุ่มย้อนกลับ
              </h3>
              
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                  <h4 className="text-blue-400 font-black text-xs sm:text-sm mb-1">🏁 การจบแต้ม (Commit Rally):</h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    เมื่อเกิดลูกตายและมีผู้ได้คะแนน ให้กดปุ่ม <strong>"จบแรลลี่: HOME ได้แต้ม"</strong> หรือ <strong>"AWAY ได้แต้ม"</strong> <br/>
                    ระบบจะทำ 3 อย่างอัตโนมัติ: (1) บวกคะแนน (2) ส่งประวัติเข้าเซิร์ฟเวอร์ (3) <strong>หมุนตำแหน่งผู้เล่น (Rotate) หากมีการ Side-out</strong>
                  </p>
                </div>

                <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                  <h4 className="text-rose-400 font-black text-xs sm:text-sm mb-1 flex items-center gap-1">
                    <Undo2 className="w-4 h-4" /> การใช้ปุ่ม "ย้อนกลับ" (Undo) อย่างถูกต้อง:
                  </h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    ปุ่ม <strong>"ย้อนกลับ"</strong> ออกแบบมาให้ทำงาน 2 ระดับอย่างชาญฉลาด:
                  </p>
                  <ul className="list-disc pl-4 mt-2 text-[11px] text-slate-300 space-y-1">
                    <li><span className="text-amber-400 font-bold">กรณีคีย์ผิดในแรลลี่ที่ยังไม่จบ:</span> พอกด "ย้อนกลับ" ระบบจะลบแอคชั่นตัวล่าสุดที่โชว์ในแถบแรลลี่ปัจจุบันออกให้คุณคีย์ใหม่</li>
                    <li><span className="text-indigo-400 font-bold">กรณีเผลอกด "จบแรลลี่" ผิดฝั่ง หรือกดบวกแต้มผิด:</span> ให้กดย้อนกลับ ระบบจะไปดึงเหตุการณ์ล่าสุดพร้อมคะแนนของทีมคุณที่บันทึกไปแล้ว คืนค่ากลับมา (ลบออกจากเซิร์ฟเวอร์)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANAGE */}
          {activeTab === 'manage' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                <Settings className="w-4 h-4" /> การบริหารหน้างาน (เปลี่ยนตัว, ฟาล์ว, เวลานอก)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] sm:text-xs">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-purple-400 font-black block mb-1">🔄 ปุ่ม "เปลี่ยนตัว"</span>
                  ใช้สลับผู้เล่นในสนามกับตัวสำรอง:
                  <ol className="list-decimal pl-4 mt-1 text-slate-400 space-y-0.5">
                    <li>กดปุ่มเปลี่ยนตัว</li>
                    <li>เลือกคนที่อยู่ในสนาม (สีเหลือง)</li>
                    <li>เลือกตัวสำรองที่จะลงไปแทน (สีม่วง)</li>
                    <li>กดยืนยัน (ระบบจะจดสถิติ Sub ลงประวัติอัตโนมัติ)</li>
                  </ol>
                </div>
                
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-rose-400 font-black block mb-1">🛑 ปุ่ม "ฟาล์ว"</span>
                  เมื่อทีมเราทำฟาล์วเทคนิค (เช่น โดนตาข่าย, ฟาล์วเสิร์ฟ, ตำแหน่งผิด)
                  <br/><br/>
                  <span className="text-slate-400">เมื่อกดเลือกประเภทฟาล์ว <strong className="text-white">ระบบจะบวกคะแนนให้ฝ่ายตรงข้ามทันที 1 คะแนน</strong> พร้อมหมุนตำแหน่งให้ถ้าจำเป็น</span>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 md:col-span-2">
                  <span className="text-amber-400 font-black block mb-1">⏱️ ปุ่ม "เวลานอก" (หน้า Scoreboard)</span>
                  <ul className="list-disc pl-4 text-slate-400 space-y-1">
                    <li>ใช้กดเพื่อขอเวลานอก (จำกัด 2 ครั้งต่อเซต)</li>
                    <li>เมื่อขึ้นเซตใหม่ หรือจบแมตช์ ระบบจะรีเซ็ตโควต้าเวลานอกกลับเป็น 0/2 ให้อัตโนมัติ</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COACH DASHBOARD & PDF */}
          {activeTab === 'coach' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                <MonitorPlay className="w-4 h-4" /> แดชบอร์ดของโค้ช & การเซฟประวัติ
              </h3>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex gap-3 items-start border-b border-slate-800 pb-3">
                  <CloudLightning className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h5 className="font-bold text-white text-xs">ปุ่ม เซฟคลาวด์ (Save to Cloud)</h5>
                    <p className="text-slate-400 text-[10px] mt-0.5">บันทึกสถิติ ณ ปัจจุบัน เก็บถาวรลงในฐานข้อมูล Match History เพื่อให้สามารถดึงกลับมาวิเคราะห์ภายหลังได้ ป้องกันข้อมูลสูญหายหลังจบเกม</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <Download className="w-6 h-6 text-blue-400 shrink-0" />
                  <div>
                    <h5 className="font-bold text-white text-xs">ปุ่ม ออก PDF (Export PDF Report)</h5>
                    <p className="text-slate-400 text-[10px] mt-0.5">ระบบจะเจนเรตไฟล์เอกสารสรุปประสิทธิภาพการเล่นทุกทักษะ (%ดี, %เสีย) แยกทีมเหย้าและทีมเยือน พร้อมพิมพ์แจกจ่ายให้ทีมงานทันทีด้วยดีไซน์ทางการของ V Project</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex justify-end shrink-0 rounded-b-2xl">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            เข้าใจแล้ว กลับสู่หน้าจดสถิติ
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerSetupModal({ team, currentRotations, currentRoster, currentTeamNames, onSave, onClose }) {
  const [lineup, setLineup] = useState([...currentRotations]);
  const [roster, setRoster] = useState({...currentRoster});
  const [teamNames, setTeamNames] = useState({ 
    home: currentTeamNames?.home || "HOME", 
    away: currentTeamNames?.away || "AWAY" 
  });

  const [newSubNum, setNewSubNum] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubPos, setNewSubPos] = useState('OH');

  const handleNumChange = (index, value) => {
    const newRots = [...lineup];
    const oldNum = newRots[index];
    newRots[index] = value;
    setLineup(newRots);
    
    const updated = { ...roster };
    if (oldNum && updated[oldNum]) {
      updated[oldNum].isStarter = false;
    }
    updated[value] = { 
      name: updated[value]?.name || `Player-${value}`, 
      position: updated[value]?.position || 'OH',
      isStarter: true 
    };
    setRoster(updated);
  };

  const handleMetadataChange = (num, field, val) => {
    setRoster(prev => ({
      ...prev,
      [num]: { ...prev[num], [field]: val }
    }));
  };

  const handleAddSubstitute = () => {
    if (!newSubNum || !newSubName) return;
    setRoster(prev => ({
      ...prev,
      [newSubNum]: { name: newSubName, position: newSubPos, isStarter: false }
    }));
    setNewSubNum('');
    setNewSubName('');
  };

  const handleRemoveSub = (num) => {
    const updated = { ...roster };
    delete updated[num];
    setRoster(updated);
  };

  const handleSave = () => {
    onSave(lineup, roster, teamNames);
  };

  const substitutes = Object.entries(roster).filter(([_, details]) => !details.isStarter);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl my-4 shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex justify-between items-center p-3 border-b border-slate-800 shrink-0 bg-slate-950">
          <h2 className="text-xs md:text-sm font-extrabold flex items-center gap-2 text-indigo-400">
            <Users className="w-4 h-4"/> ตั้งค่าผู้เล่นจริง & สำรอง ({team.toUpperCase()})
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4"/></button>
        </div>
        
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
           <div className="flex flex-col gap-3">
             <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-inner">
               <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1 mb-2">
                 <Settings className="w-3.5 h-3.5" /> เปลี่ยนชื่อทีมแสดงผล (Team Name)
               </span>
               <div className="grid grid-cols-2 gap-2">
                 <div>
                   <label className="text-[9px] text-slate-400 block mb-1">ทีมเหย้า (HOME)</label>
                   <input 
                     type="text" 
                     value={teamNames.home}
                     onChange={(e) => setTeamNames(prev => ({ ...prev, home: e.target.value.toUpperCase() }))}
                     className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-[11px] font-bold text-indigo-300 outline-none focus:border-indigo-500 text-center uppercase"
                   />
                 </div>
                 <div>
                   <label className="text-[9px] text-slate-400 block mb-1">ทีมเยือน (AWAY)</label>
                   <input 
                     type="text" 
                     value={teamNames.away}
                     onChange={(e) => setTeamNames(prev => ({ ...prev, away: e.target.value.toUpperCase() }))}
                     className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-[11px] font-bold text-rose-300 outline-none focus:border-rose-500 text-center uppercase"
                   />
                 </div>
               </div>
             </div>

             <div>
               <h3 className="text-[11px] font-bold text-indigo-400 mb-2 border-b border-slate-800 pb-1.5 flex justify-between items-center">
                 <span>ผู้เล่นตัวจริง 6 คนในสนาม ( R1 - R6 )</span>
               </h3>
               <div className="flex flex-col gap-1.5">
                 {[1, 2, 3, 4, 5, 6].map((zone, idx) => {
                   const playerNum = lineup[idx] || '';
                   const playerDetails = roster[playerNum] || { name: '', position: 'OH' };
                   return (
                     <div key={idx} className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50 flex flex-col gap-1.5">
                       <span className="text-[9px] text-amber-400 font-bold leading-none">ตำแหน่งโซน R{zone}</span>
                       <div className="flex gap-1.5">
                         <input 
                           type="text" 
                           value={playerNum} 
                           onChange={(e) => handleNumChange(idx, e.target.value)} 
                           placeholder="เบอร์" 
                           className="w-12 bg-slate-950 border border-slate-600 rounded px-1.5 py-1 text-white text-center text-[12px] font-bold focus:border-indigo-500 outline-none" 
                         />
                         <input 
                           type="text" 
                           value={playerDetails.name} 
                           onChange={(e) => handleMetadataChange(playerNum, 'name', e.target.value)} 
                           placeholder="ชื่อย่อผู้เล่น" 
                           disabled={!playerNum}
                           className="flex-1 bg-slate-950 border border-slate-600 rounded px-2 text-white text-[12px] disabled:opacity-40 focus:border-indigo-500 outline-none" 
                         />
                         <select 
                           value={playerDetails.position} 
                           onChange={(e) => handleMetadataChange(playerNum, 'position', e.target.value)} 
                           disabled={!playerNum}
                           className="w-16 bg-slate-950 border border-slate-600 rounded px-1 text-white text-[11px] outline-none disabled:opacity-40 focus:border-indigo-500"
                         >
                           {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                         </select>
                       </div>
                     </div>
                   )
                 })}
               </div>
             </div>
           </div>

           <div className="flex flex-col gap-2">
             <div className="h-full flex flex-col">
               <h3 className="text-[11px] font-bold text-purple-400 mb-2 border-b border-slate-800 pb-1.5">
                 รายชื่อผู้เล่นสำรอง (Substitutes)
               </h3>
               
               <div className="bg-purple-900/10 border border-purple-800/30 p-3 rounded-xl flex flex-col gap-2 mb-3 shrink-0">
                 <span className="text-[9px] text-purple-300 font-bold uppercase tracking-wider">เพิ่มรายชื่อสำรอง</span>
                 <div className="flex gap-1.5">
                   <input 
                     type="text" 
                     value={newSubNum} 
                     onChange={(e) => setNewSubNum(e.target.value)} 
                     placeholder="เบอร์" 
                     className="w-10 bg-slate-950 border border-slate-600 rounded px-1.5 text-white text-center text-[12px] font-bold outline-none focus:border-purple-500" 
                   />
                   <input 
                     type="text" 
                     value={newSubName} 
                     onChange={(e) => setNewSubName(e.target.value)} 
                     placeholder="ชื่อย่อ" 
                     className="flex-1 bg-slate-950 border border-slate-600 rounded px-2 text-white text-[12px] outline-none focus:border-purple-500" 
                   />
                   <select 
                     value={newSubPos} 
                     onChange={(e) => setNewSubPos(e.target.value)} 
                     className="w-14 bg-slate-950 border border-slate-600 rounded px-1 text-white text-[11px] outline-none focus:border-purple-500"
                   >
                     {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                   <button 
                     onClick={handleAddSubstitute}
                     className="bg-purple-600 hover:bg-purple-500 text-white px-3 rounded-lg text-[10px] font-bold shadow-md transition-all active:scale-95"
                   >
                     เพิ่ม
                   </button>
                 </div>
               </div>

               <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar min-h-0 bg-slate-950/50 p-2 rounded-xl border border-slate-800/50">
                 {substitutes.length === 0 ? (
                   <div className="text-slate-500 text-[10px] text-center py-6">ยังไม่มีผู้เล่นสำรองในระบบ</div>
                 ) : (
                   substitutes.map(([num, details]) => (
                     <div key={num} className="bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-lg flex justify-between items-center text-[12px] shadow-sm">
                       <div className="flex items-center gap-2">
                         <span className="font-bold bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded text-[10px] w-6 text-center">#{num}</span>
                         <span className="text-white font-medium truncate max-w-[120px]">{details.name}</span>
                         <span className="text-slate-400 text-[9px] font-mono bg-slate-900 px-1.5 rounded">{details.position}</span>
                       </div>
                       <button 
                         onClick={() => handleRemoveSub(num)}
                         className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-1 rounded transition-colors"
                       >
                         <X className="w-3.5 h-3.5"/>
                       </button>
                     </div>
                   ))
                 )}
               </div>
             </div>
           </div>
        </div>

        <div className="p-3 border-t border-slate-800 flex justify-end gap-2 bg-slate-950 rounded-b-2xl shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-xs font-medium">ยกเลิก</button>
          <button onClick={handleSave} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md flex items-center gap-1.5 text-xs transition-transform active:scale-95">
            <Check className="w-4 h-4"/> บันทึกตั้งค่า
          </button>
        </div>
      </div>
    </div>
  );
}

function TrackerView({ 
  role, score, teamNames, rotations, roster, tempRallyEvents, onSaveEvent, onCommitRally, onClearRally, onUndo, onFoul, onSubstitution, onManualRotate, hasEvents, timeouts, currentServe 
}) {
  const teamColor = role === ROLES.HOME ? 'text-indigo-400' : 'text-rose-400';
  const teamLabel = role === 'home' ? teamNames.home : teamNames.away;
  const players = role === ROLES.HOME ? rotations.home : rotations.away;
  const teamRoster = role === ROLES.HOME ? roster.home : roster.away;

  const [step, setStep] = useState('select_start'); 
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [foulModalOpen, setFoulModalOpen] = useState(false);
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(true);
  
  const [isChainedScout, setIsChainedScout] = useState(false);

  const [currentEvent, setCurrentEvent] = useState({
    team: role, player: null, skill: null, eval: null, startZone: null, endZone: null
  });

  useEffect(() => {
    if (step === 'select_action') {
      setIsActionPanelOpen(true);
    }
  }, [step]);

  const getPlayerInZone = (zoneId) => players[zoneId - 1];

  const resetFlow = (nextPreselectedSkill = null) => {
    if (nextPreselectedSkill) {
      setIsChainedScout(true);
      setCurrentEvent({
        team: role, player: null, skill: nextPreselectedSkill, eval: null, startZone: null, endZone: null
      });
    } else {
      setIsChainedScout(false);
      setCurrentEvent({
        team: role, player: null, skill: null, eval: null, startZone: null, endZone: null
      });
    }
  };

  const handleZoneClick = (zoneId, isOpponentCourt) => {
    if (!isOpponentCourt) {
      const autoPlayer = getPlayerInZone(zoneId);
      setCurrentEvent(prev => ({ ...prev, startZone: zoneId, player: autoPlayer || prev.player }));
    } else {
       setCurrentEvent(prev => ({ ...prev, endZone: zoneId }));
    }
  };

  const handleEvalClick = (evalId) => {
    const completeEvent = { ...currentEvent, eval: evalId };
    onSaveEvent(completeEvent); 
    
    if (completeEvent.skill === 'set') {
      setCurrentEvent({ team: role, player: null, skill: 'attack', eval: null, startZone: null, endZone: null });
      setIsChainedScout(true);
    } else {
      setCurrentEvent({ team: role, player: null, skill: null, eval: null, startZone: null, endZone: null });
      setIsChainedScout(false);
    }
    setStep('select_action');
  };

  const substitutes = Object.entries(teamRoster).filter(([_, details]) => !details.isStarter);
  const isHomeServe = currentServe === 'home';
  const isAwayServe = currentServe === 'away';

  // Determine if undo should be enabled (either temp events exist, OR committed events exist for this team)
  const canUndo = (tempRallyEvents && tempRallyEvents.length > 0) || hasEvents;

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden min-h-0 w-full">
      {/* Live score header */}
      <div className="bg-slate-950 p-2 border-b border-slate-800 flex items-center justify-between shadow-inner shrink-0 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-wider">LIVE SCORE:</span>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 px-3 py-1 rounded-full border border-slate-700 shadow">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] sm:text-xs font-black ${role === 'home' ? 'text-indigo-400' : 'text-slate-400'}`}>{teamNames.home}</span>
            {isHomeServe && <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-400 rounded-full animate-ping"></span>}
            <span className="text-xs sm:text-sm font-extrabold font-mono text-white bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{score.home}</span>
          </div>
          <span className="text-slate-500 font-black text-xs">:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-extrabold font-mono text-white bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{score.away}</span>
            {isAwayServe && <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-400 rounded-full animate-ping"></span>}
            <span className={`text-[10px] sm:text-xs font-black ${role === 'away' ? 'text-rose-400' : 'text-slate-400'}`}>{teamNames.away}</span>
          </div>
          <div className="text-[8px] sm:text-[9px] bg-slate-800 text-amber-400 font-extrabold px-1.5 py-0.5 rounded leading-none border border-amber-900/30">SET {score.set}</div>
        </div>
      </div>

      {/* Control Actions bar */}
      <div className="bg-slate-950/70 p-1.5 border-b border-slate-800 flex justify-between items-center px-2 shrink-0">
        <div className="flex items-center gap-1">
           <span className={`font-black text-xs tracking-wider ${teamColor}`}>{teamLabel} SCOUT</span>
        </div>
        
        <div className="flex gap-1 shrink-0">
          <button 
            onClick={() => setSubModalOpen(true)}
            className="text-[9px] sm:text-[10px] bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 px-2 py-1.5 rounded-lg font-bold transition-all border border-purple-800/40 active:scale-95"
          >
            เปลี่ยนตัว
          </button>
          <button 
            onClick={() => setFoulModalOpen(true)}
            className="text-[9px] sm:text-[10px] bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 px-2 py-1.5 rounded-lg font-bold transition-all border border-rose-800/40 active:scale-95"
          >
            ฟาล์ว
          </button>
          <button 
            onClick={onUndo} 
            disabled={!canUndo} 
            className="text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-[9px] sm:text-[10px] bg-slate-800 px-2 py-1.5 rounded-lg transition-all border border-slate-700 flex items-center gap-1 active:scale-95"
          >
            <Undo2 className="w-3 h-3" /> ย้อนกลับ
          </button>
        </div>
      </div>

      {/* Current Rally details */}
      <div className="bg-slate-900 p-2 border-b border-slate-800 flex flex-col gap-1.5 shrink-0 z-20 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[9px] sm:text-[10px] text-amber-400 font-bold tracking-wider flex items-center gap-1">
            <span>แรลลี่แต้มปัจจุบัน (Current Rally):</span>
            {isChainedScout && (
              <span className="inline-flex items-center gap-0.5 bg-indigo-950 border border-indigo-800 text-indigo-400 text-[8px] px-1.5 py-0.5 rounded animate-pulse font-extrabold">
                <Link2 className="w-2.5 h-2.5" /> ล็อกทักษะ "ตบ" ถัดไป
              </span>
            )}
          </span>
          {tempRallyEvents.length > 0 && (
            <button 
              onClick={onClearRally}
              className="text-[8px] sm:text-[9px] bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-900/50 px-2 py-0.5 rounded transition-all active:scale-95"
            >
              เคลียร์แรลลี่
            </button>
          )}
        </div>
        
        <div className="flex gap-1.5 items-center overflow-x-auto py-1 custom-scrollbar min-h-[38px] bg-slate-950 px-2 rounded-lg border border-slate-800/80 shadow-inner">
          {tempRallyEvents.length === 0 ? (
            <span className="text-[9px] sm:text-[10px] text-slate-500 italic flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span> รอการบันทึกสถิติจังหวะแรก...
            </span>
          ) : (
            tempRallyEvents.map((evt, idx) => (
              <React.Fragment key={evt.id}>
                {idx > 0 && <span className="text-slate-600 font-black text-xs">➔</span>}
                <div className="bg-slate-800 border border-slate-700 px-2 py-1 rounded flex items-center gap-1.5 text-[10px] sm:text-[11px] shrink-0 shadow-sm">
                  <span className="font-extrabold text-indigo-400">#{evt.player}</span>
                  <span className="text-slate-200 font-medium">{SKILLS.find(s => s.id === evt.skill)?.label.split(' ')[0]}</span>
                  <span className={`px-1.5 text-[8px] sm:text-[9px] rounded font-black text-white ${EVALUATIONS.find(e => e.id === evt.eval)?.color}`}>
                    {evt.eval}
                  </span>
                </div>
              </React.Fragment>
            ))
          )}
        </div>

        {tempRallyEvents.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-0.5 shrink-0">
            <button
              onClick={() => { onCommitRally('home'); setIsChainedScout(false); }}
              className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] sm:text-[11px] rounded-lg border border-indigo-500 shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Check className="w-3.5 h-3.5" /> จบแรลลี่: {teamNames.home} ได้แต้ม
            </button>
            <button
              onClick={() => { onCommitRally('away'); setIsChainedScout(false); }}
              className="py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[10px] sm:text-[11px] rounded-lg border border-rose-500 shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Check className="w-3.5 h-3.5" /> จบแรลลี่: {teamNames.away} ได้แต้ม
            </button>
          </div>
        )}
      </div>

      {/* Main Interactive Screen layout: Left is Court, Right is Action Panel */}
      <div className="flex-1 flex flex-row overflow-hidden relative min-h-0 w-full gap-2 p-2">
        
        {/* LEFT: Compact courts wrapper */}
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-950/40 rounded-xl border border-slate-800/60 p-2 min-h-0 overflow-y-auto custom-scrollbar">
           {/* Opponent Court */}
           <div className="flex flex-col items-center relative w-full max-w-[280px] sm:max-w-[320px] aspect-[4/3] mb-1.5 shrink-0">
             <div className="text-rose-400 font-extrabold text-[8px] sm:text-[9px] mb-1 tracking-wider uppercase">OPPONENT COURT (เป้าหมายตก)</div>
             <div className="w-full h-full grid grid-cols-3 grid-rows-[2fr_1fr] border-2 border-slate-300/80 synthetic-court relative z-10 shadow-lg rounded">
               {OPP_COURT_ZONES.map(zone => (
                 <button
                   key={`opp-${zone.id}`}
                   onClick={() => handleZoneClick(zone.id, true)}
                   className={`border border-white/20 flex items-center justify-center text-sm sm:text-base md:text-lg font-black transition-all relative group cursor-pointer hover:bg-white/20 hover:text-white
                     ${currentEvent.endZone === zone.id ? 'bg-rose-500/80 text-white scale-95 shadow-inner ring-2 ring-white' : 'text-white/20'}
                   `}
                 >
                   {zone.label}
                 </button>
               ))}
               <div className="absolute bottom-[33.33%] left-0 w-full border-b border-white/40 pointer-events-none"></div>
             </div>
           </div>

           {/* Net line */}
           <div className="w-full max-w-[240px] h-1.5 bg-slate-300 z-20 shadow-[0_0_5px_rgba(255,255,255,0.5)] my-1 relative rounded-full shrink-0">
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="bg-slate-900 px-2 py-0.5 rounded-full text-[6px] text-white font-extrabold tracking-widest leading-none border border-slate-700">NET</div>
              </div>
           </div>

           {/* Own Court */}
           <div className="flex flex-col items-center relative w-full max-w-[280px] sm:max-w-[320px] aspect-[4/3] mt-1.5 shrink-0">
             <div className="w-full h-full grid grid-cols-3 grid-rows-[1fr_2fr] border-2 border-slate-300/80 synthetic-court relative z-10 shadow-lg rounded">
               {COURT_ZONES.map(zone => {
                 const playerNum = getPlayerInZone(zone.id);
                 const playerDetails = teamRoster[playerNum] || { name: '-', position: '-' };
                 const isSelected = currentEvent.startZone === zone.id;

                 return (
                   <button
                     key={`own-${zone.id}`}
                     onClick={() => handleZoneClick(zone.id, false)}
                     className={`border border-white/20 flex flex-col items-center justify-center transition-all relative group cursor-pointer hover:bg-white/10
                       ${isSelected ? 'bg-emerald-500/80 text-white scale-95 shadow-inner ring-2 ring-white' : ''}
                     `}
                   >
                     <span className={`absolute top-1 left-1 text-[7px] sm:text-[8px] font-black ${isSelected ? 'text-white' : 'text-white/40'}`}>{zone.label}</span>
                     {playerNum ? (
                       <div className="flex flex-col items-center justify-center">
                         <span className={`text-xl sm:text-2xl md:text-3xl font-black leading-none drop-shadow-md ${isSelected ? 'text-white' : 'text-white/90'}`}>{playerNum}</span>
                         <span className="text-[6px] sm:text-[8px] px-1.5 font-bold bg-slate-900/60 text-amber-300 rounded-sm leading-none mt-1 uppercase shadow-sm border border-slate-800/50">{playerDetails.position}</span>
                       </div>
                     ) : (
                       <span className="text-xs sm:text-sm font-black text-white/10">{zone.label}</span>
                     )}
                   </button>
                 );
               })}
               <div className="absolute top-[33.33%] left-0 w-full border-t border-white/40 pointer-events-none"></div>
             </div>
             <div className={`mt-1 font-extrabold text-[8px] sm:text-[9px] tracking-wider ${teamColor}`}>OWN COURT (เริ่มกระทำทักษะ)</div>
           </div>
        </div>

        {/* RIGHT: Action Keying Panel placed directly on the right side of courts */}
        <div className={`shrink-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col z-35 transition-all duration-300
          ${isActionPanelOpen 
            ? 'absolute inset-y-2 right-2 w-[210px] sm:relative sm:inset-auto sm:w-[220px] lg:w-[240px] opacity-100 p-2 sm:p-3' 
            : 'w-0 overflow-hidden opacity-0 p-0 border-none'
          }
        `}>
          {/* Toggle Panel Button sticking on the left side of the panel (Desktop/Tablet sibling toggle) */}
          <button 
            onClick={() => setIsActionPanelOpen(!isActionPanelOpen)}
            className="absolute top-1/2 -left-8 transform -translate-y-1/2 w-8 h-12 bg-slate-900 border-y border-l border-slate-700 rounded-l-xl hidden sm:flex items-center justify-center text-amber-400 hover:text-amber-300 shadow-[-4px_0_10px_rgba(0,0,0,0.3)] z-40 transition-colors"
            title={isActionPanelOpen ? "ซ่อนแผงคีย์" : "แสดงแผงคีย์"}
          >
            {isActionPanelOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>

          {/* Header title inside panel */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">แผงบันทึกสถิติ</span>
            <button onClick={() => setIsActionPanelOpen(false)} className="text-slate-500 hover:text-white p-1 bg-slate-800 rounded-md sm:hidden">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar gap-3 text-[10px] pr-0.5">
            {/* Step 1: Player selection mapped to court rotation */}
            <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800">
              <label className="text-[8px] sm:text-[9px] text-amber-500 mb-1.5 font-black uppercase tracking-wider flex justify-between items-center">
                <span>1. ระบุผู้เล่น</span>
                <span className="text-slate-500 text-[7px] bg-slate-900 px-1 rounded border border-slate-800">SYNCED</span>
              </label>
              
              {/* Grid 3x2 corresponding to actual court rotation positions */}
              <div className="grid grid-cols-3 gap-1.5">
                {[3, 2, 1, 4, 5, 0].map(idx => {
                  const num = players[idx];
                  const zoneNum = idx + 1;
                  const details = teamRoster[num] || { name: '-', position: '-' };
                  return (
                    <button
                      key={`p-panel-${zoneNum}-${num}`}
                      onClick={() => setCurrentEvent(prev => ({ ...prev, player: num, startZone: zoneNum }))}
                      className={`py-2 rounded-lg border flex flex-col items-center justify-center transition-all active:scale-95 shadow-sm relative
                        ${currentEvent.player === num ? 'bg-amber-500 border-amber-400 text-slate-900 ring-2 ring-white scale-105 shadow-lg' : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'}
                      `}
                    >
                      <span className="absolute top-0.5 left-1 text-[5px] sm:text-[6px] font-black opacity-40">R{zoneNum}</span>
                      <span className="font-black text-sm leading-none mt-1.5">{num}</span>
                      <span className="text-[6px] opacity-80 uppercase mt-0.5 font-bold">({details.position})</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Skills */}
            <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800">
              <label className="text-[8px] sm:text-[9px] text-amber-500 mb-1.5 block font-black uppercase tracking-wider">
                2. เลือกทักษะ (SKILL)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {SKILLS.map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => setCurrentEvent(prev => ({ ...prev, skill: skill.id }))}
                    className={`py-2.5 rounded-lg text-[9px] sm:text-[10px] font-black transition-colors border leading-none shadow-sm active:scale-95
                      ${currentEvent.skill === skill.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg ring-1 ring-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}
                    `}
                  >
                    {skill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Evaluations */}
            <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800 flex-1 flex flex-col">
              <label className="text-[8px] sm:text-[9px] text-amber-500 mb-1.5 block font-black uppercase tracking-wider">
                3. ให้ผลประเมิน (EVAL)
              </label>
              <div className="grid grid-cols-2 gap-1.5 flex-1">
                {EVALUATIONS.map(evalObj => (
                  <button
                    key={evalObj.id}
                    onClick={() => {
                      if (currentEvent.player && currentEvent.skill) {
                        handleEvalClick(evalObj.id);
                      }
                    }}
                    disabled={!currentEvent.player || !currentEvent.skill}
                    className={`py-2 rounded-lg font-black text-[10px] text-white transition-all active:scale-95 leading-none shadow-md disabled:opacity-20 disabled:scale-100 flex items-center justify-center
                      ${currentEvent.eval === evalObj.id ? evalObj.color + ' ring-2 ring-white scale-105 shadow-xl' : evalObj.color + ' opacity-90 hover:opacity-100 border border-black/20'}
                    `}
                  >
                    {evalObj.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Toggle Handle for Action Panel when it is fully CLOSED (sm and up) */}
      {!isActionPanelOpen && (
        <button 
          onClick={() => setIsActionPanelOpen(true)}
          className="absolute top-1/2 right-2 transform -translate-y-1/2 w-8 h-12 bg-slate-900 border border-slate-700 rounded-l-xl hidden sm:flex items-center justify-center text-amber-400 hover:text-amber-300 shadow-[-4px_0_10px_rgba(0,0,0,0.4)] z-50 transition-colors"
          title="แสดงแผงคีย์"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Floating Toggle Button for Mobile overlay */}
      <button 
        onClick={() => setIsActionPanelOpen(!isActionPanelOpen)}
        className="absolute bottom-4 right-4 bg-slate-800 hover:bg-slate-700 text-amber-400 p-3 rounded-full border border-slate-600 shadow-2xl z-50 flex sm:hidden items-center justify-center active:scale-90 transition-transform"
      >
        {isActionPanelOpen ? <X className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
      </button>

      {subModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-sm font-black text-amber-400 mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> เปลี่ยนตัวผู้เล่น
            </h3>
            
            {substitutes.length === 0 ? (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                <AlertCircle className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <div className="text-slate-400 text-xs">ไม่มีผู้เล่นสำรองในระบบ</div>
                <div className="text-slate-500 text-[10px] mt-1">กรุณาเพิ่มทางเมนู "ตั้งค่าทีม"</div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700">
                  <label className="text-[10px] text-slate-300 font-bold block mb-1.5 flex justify-between">
                    <span>1. เลือกตัวจริง (เปลี่ยนออก)</span>
                    <span className="text-[9px] text-slate-500">R1-R6</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {players.map(num => (
                      <button 
                        key={`t-${num}`}
                        onClick={() => {
                          setCurrentEvent(prev => ({ ...prev, _targetSubOut: num }));
                        }}
                        className={`p-2 rounded-lg text-[11px] border shadow-sm transition-all ${currentEvent._targetSubOut === num ? 'bg-amber-500 border-amber-400 text-slate-900 font-black scale-105' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 font-bold'}`}
                      >
                        #{num} <span className="text-[9px] opacity-70">({teamRoster[num]?.position})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700">
                  <label className="text-[10px] text-slate-300 font-bold block mb-1.5">2. เลือกตัวสำรอง (เปลี่ยนเข้า)</label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                    {substitutes.map(([num, details]) => (
                      <button 
                        key={`s-${num}`}
                        onClick={() => {
                          setCurrentEvent(prev => ({ ...prev, _targetSubIn: num }));
                        }}
                        className={`p-2 rounded-lg text-[10px] border truncate text-left shadow-sm transition-all ${currentEvent._targetSubIn === num ? 'bg-purple-600 border-purple-400 text-white font-black scale-105' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 font-bold'}`}
                      >
                        #{num} {details.name} <span className="opacity-70">({details.position})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                  <button onClick={() => { setSubModalOpen(false); resetFlow(); }} className="text-slate-400 hover:text-white text-[11px] px-3 py-1.5 font-bold">ยกเลิก</button>
                  <button 
                    disabled={!currentEvent._targetSubOut || !currentEvent._targetSubIn}
                    onClick={() => {
                      onSubstitution(currentEvent._targetSubOut, currentEvent._targetSubIn);
                      setSubModalOpen(false);
                      resetFlow();
                    }}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white text-[11px] px-4 py-1.5 rounded-lg font-black shadow-md transition-all active:scale-95"
                  >
                    ยืนยันเปลี่ยนตัว
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {foulModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-black text-rose-400 mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> ทำฟาล์ว (เสียแต้ม)
            </h3>
            <p className="text-[10px] text-slate-400 mb-3">เมื่อเลือก ฝ่ายตรงข้ามจะได้ 1 คะแนนอัตโนมัติ</p>
            <div className="grid grid-cols-1 gap-1.5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {['โดนตาข่าย (Net Touch)', 'ฟาล์วเสิร์ฟ (Service Fault)', 'ตำแหน่งหมุนผิดพลาด (Rotation Fault)', 'ดับเบิลคอนแทกต์ (Double Contact)', 'ถือบอล/ลูกติดมือ (Catch)', 'สี่จังหวะ (Four Hits)', 'ล้ำแดน (Penetration Fault)'].map((fType, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onFoul(fType);
                    setFoulModalOpen(false);
                  }}
                  className="bg-slate-800 hover:bg-rose-600 border border-slate-700 hover:border-rose-500 text-left px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white transition-all shadow-sm active:scale-95"
                >
                  {fType}
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t border-slate-800">
              <button onClick={() => setFoulModalOpen(false)} className="text-slate-400 hover:text-white text-[11px] px-3 py-1.5 font-bold">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({ events, rotations, roster, role, teamNames, timeouts }) {
  const [activeTab, setActiveTab] = useState('summary'); 

  const calculateStats = (team) => {
    const teamEvents = events.filter(e => e.team === team);
    
    const results = {};
    SKILLS.forEach(skill => {
      const skillEvents = teamEvents.filter(e => e.skill === skill.id);
      const total = skillEvents.length;
      const perfect = skillEvents.filter(e => e.eval === '#').length;
      const good = skillEvents.filter(e => e.eval === '+').length;
      const okay = skillEvents.filter(e => e.eval === '!').length;
      const poor = skillEvents.filter(e => e.eval === '-').length;
      const error = skillEvents.filter(e => e.eval === '=').length;
      const blocked = skillEvents.filter(e => e.eval === '/').length;

      const positiveCount = perfect + good;
      const negativeCount = error + blocked;

      results[skill.id] = {
        total,
        goodPercent: total > 0 ? ((positiveCount / total) * 100).toFixed(0) : '0',
        errorPercent: total > 0 ? ((negativeCount / total) * 100).toFixed(0) : '0',
        neutralPercent: total > 0 ? (((okay + poor) / total) * 100).toFixed(0) : '0'
      };
    });

    return results;
  };

  const homeStats = useMemo(() => calculateStats(ROLES.HOME), [events]);
  const awayStats = useMemo(() => calculateStats(ROLES.AWAY), [events]);

  const zoneDistribution = useMemo(() => {
    const data = {
      home: { strengths: Array(7).fill(0), weaknesses: Array(7).fill(0) },
      away: { strengths: Array(7).fill(0), weaknesses: Array(7).fill(0) }
    };

    events.forEach(evt => {
      if (!evt.endZone || evt.endZone < 1 || evt.endZone > 6) return;
      
      const isSuccess = evt.eval === '#' || evt.eval === '+';
      const isError = evt.eval === '=' || evt.eval === '/';

      if (evt.team === 'home') {
        if (isSuccess) data.home.strengths[evt.endZone]++;
        if (isError) data.home.weaknesses[evt.endZone]++;
      } else {
        if (isSuccess) data.away.strengths[evt.endZone]++;
        if (isError) data.away.weaknesses[evt.endZone]++;
      }
    });

    return data;
  }, [events]);

  const showHome = role === ROLES.HOME || role === ROLES.COACH;
  const showAway = role === ROLES.AWAY || role === ROLES.COACH;

  return (
    <div className="flex flex-col gap-1.5 h-full overflow-hidden min-h-0">
      {/* Tab Switchers */}
      <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 gap-1 shadow-sm">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-2 text-[10px] md:text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all
            ${activeTab === 'summary' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
          `}
        >
          <BarChart3 className="w-3.5 h-3.5" /> %คุณภาพ
        </button>
        <button
          onClick={() => setActiveTab('heatmap')}
          className={`flex-1 py-2 text-[10px] md:text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all
            ${activeTab === 'heatmap' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
          `}
        >
          <Swords className="w-3.5 h-3.5" /> จุดลงบุก
        </button>
        <button
          onClick={() => setActiveTab('rotation')}
          className={`flex-1 py-2 text-[10px] md:text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all
            ${activeTab === 'rotation' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
          `}
        >
          <RotateCcw className="w-3.5 h-3.5" /> หน้าเซต
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-2 text-[10px] md:text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all
            ${activeTab === 'logs' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
          `}
        >
          <ClipboardList className="w-3.5 h-3.5" /> บันทึก
        </button>
      </div>

      {/* SUMMARY / STATS VIEW */}
      {activeTab === 'summary' && (
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-0.5 min-h-0">
          {showHome && (
            <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 shadow-md shrink-0">
              <h3 className="text-[11px] sm:text-[13px] font-black text-indigo-400 mb-2.5 flex justify-between items-center tracking-wider border-b border-slate-800 pb-1.5">
                <span>{teamNames.home} TEAM STATS</span>
                <span className="text-[9px] text-slate-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-700 shadow-inner">เวลานอกใช้ไป: {timeouts?.home || 0}/2</span>
              </h3>
              <SkillBarStats teamStats={homeStats} />
            </div>
          )}

          {showAway && (
            <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 shadow-md shrink-0">
              <h3 className="text-[11px] sm:text-[13px] font-black text-rose-400 mb-2.5 flex justify-between items-center tracking-wider border-b border-slate-800 pb-1.5">
                <span>{teamNames.away} TEAM STATS</span>
                <span className="text-[9px] text-slate-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-700 shadow-inner">เวลานอกใช้ไป: {timeouts?.away || 0}/2</span>
              </h3>
              <SkillBarStats teamStats={awayStats} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 shrink-0">
            {showHome && (
              <div className="bg-indigo-950/20 p-2 rounded-xl border border-indigo-900/30">
                <span className="text-[10px] font-black text-indigo-400 block mb-1.5 tracking-wider uppercase text-center bg-indigo-900/40 py-1 rounded">{teamNames.home} Layout</span>
                <div className="grid grid-cols-3 gap-1">
                  <RotPlayer num={rotations.home[3]} zone="R4" pos={roster.home[rotations.home[3]]?.position} />
                  <RotPlayer num={rotations.home[2]} zone="R3" pos={roster.home[rotations.home[2]]?.position} />
                  <RotPlayer num={rotations.home[1]} zone="R2" pos={roster.home[rotations.home[1]]?.position} />
                  <RotPlayer num={rotations.home[4]} zone="R5" pos={roster.home[rotations.home[4]]?.position} />
                  <RotPlayer num={rotations.home[5]} zone="R6" pos={roster.home[rotations.home[5]]?.position} />
                  <RotPlayer num={rotations.home[0]} zone="R1" pos={roster.home[rotations.home[0]]?.position} />
                </div>
              </div>
            )}
            {showAway && (
              <div className="bg-rose-950/20 p-2 rounded-xl border border-rose-900/30">
                <span className="text-[10px] font-black text-rose-400 block mb-1.5 tracking-wider uppercase text-center bg-rose-900/40 py-1 rounded">{teamNames.away} Layout</span>
                <div className="grid grid-cols-3 gap-1">
                  <RotPlayer num={rotations.away[3]} zone="R4" pos={roster.away[rotations.away[3]]?.position} />
                  <RotPlayer num={rotations.away[2]} zone="R3" pos={roster.away[rotations.away[2]]?.position} />
                  <RotPlayer num={rotations.away[1]} zone="R2" pos={roster.away[rotations.away[1]]?.position} />
                  <RotPlayer num={rotations.away[4]} zone="R5" pos={roster.away[rotations.away[4]]?.position} />
                  <RotPlayer num={rotations.away[5]} zone="R6" pos={roster.away[rotations.away[5]]?.position} />
                  <RotPlayer num={rotations.away[0]} zone="R1" pos={roster.away[rotations.away[0]]?.position} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HEATMAP / ATTACK ZONES VIEW */}
      {activeTab === 'heatmap' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 flex flex-col gap-2 min-h-0">
          <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 shadow-md shrink-0">
            <h3 className="text-[11px] sm:text-[13px] font-black text-slate-300 mb-4 uppercase tracking-wider text-center border-b border-slate-800 pb-2">แผนภูมิความสำเร็จและข้อผิดพลาดในฝั่งตรงข้าม</h3>
            
            <div className="flex flex-col sm:flex-row justify-around items-center gap-6 py-2">
              <div className="flex flex-col items-center bg-slate-950/50 p-4 rounded-2xl border border-slate-800 shadow-inner w-full sm:w-auto">
                <span className="text-[11px] sm:text-xs font-black text-indigo-400 mb-3 tracking-widest uppercase bg-indigo-900/20 px-4 py-1.5 rounded-lg border border-indigo-900/40">ทิศทางทำแต้ม {teamNames.home}</span>
                <HeatmapCourt strengths={zoneDistribution.home.strengths} weaknesses={zoneDistribution.home.weaknesses} />
              </div>

              <div className="flex flex-col items-center bg-slate-950/50 p-4 rounded-2xl border border-slate-800 shadow-inner w-full sm:w-auto">
                <span className="text-[11px] sm:text-xs font-black text-rose-400 mb-3 tracking-widest uppercase bg-rose-900/20 px-4 py-1.5 rounded-lg border border-rose-900/40">ทิศทางทำแต้ม {teamNames.away}</span>
                <HeatmapCourt strengths={zoneDistribution.away.strengths} weaknesses={zoneDistribution.away.weaknesses} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-center gap-6 text-[10px] sm:text-[11px]">
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-emerald-900 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                <span className="text-slate-300 font-bold">ประสิทธิผลเยี่ยม (+)</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="w-3.5 h-3.5 bg-rose-500 rounded-full ring-2 ring-rose-900 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                <span className="text-slate-300 font-bold">คอนแทกต์บกพร่อง (-)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROTATION (R1 - R6) VIEW - SPLIT APART AND DISPLAYED COMPACTLY ON ONE PAGE IN VERTICAL COLUMNS */}
      {activeTab === 'rotation' && (
        <div className="flex-1 flex flex-col md:flex-row gap-2.5 min-h-0 overflow-y-auto custom-scrollbar">
           {showHome && (
             <div className="flex-1 min-w-0">
               <RotationAnalysisView 
                 team="home" 
                 events={events} 
                 teamName={teamNames.home} 
                 isHome={true}
               />
             </div>
           )}
           {showAway && (
             <div className="flex-1 min-w-0">
               <RotationAnalysisView 
                 team="away" 
                 events={events} 
                 teamName={teamNames.away} 
                 isHome={false}
               />
             </div>
           )}
        </div>
      )}

      {/* LOGS TAB VIEW */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 flex-1 min-h-0 flex flex-col overflow-hidden shadow-md">
          <h3 className="text-[11px] sm:text-[12px] font-black mb-1 text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-amber-500" /> บันทึกเหตุการณ์เรียลไทม์ (Live Logs)
          </h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1 mt-1.5">
            {events.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-8 flex flex-col items-center gap-2">
                 <Activity className="w-6 h-6 opacity-40" />
                 <span>ยังไม่มีรายการสถิติ</span>
              </div>
            ) : (
              [...events].reverse().map(evt => (
                <div key={evt.id} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg text-[10px] border border-slate-800 shadow-sm mb-0.5 hover:border-slate-600 transition-colors">
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-1.5 h-4 shrink-0 rounded-full ${evt.team === 'home' ? 'bg-indigo-500' : 'bg-rose-500'}`}></span>
                    <span className="font-mono text-[9px] text-slate-400 shrink-0 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{evt.scoreAt}</span>
                    <span className="font-black text-slate-200 shrink-0 bg-slate-800 px-1.5 py-0.5 rounded shadow-inner text-[11px]">#{evt.player}</span>
                    <span className="text-slate-300 truncate">
                      {evt.skill === 'substitute' || evt.skill === 'timeout' || evt.skill === 'foul' ? (
                        <span className="text-amber-400 font-bold">{evt.detail}</span>
                      ) : (
                        <span className="flex gap-1.5 items-center font-medium">
                          <span className="text-white bg-slate-800 px-1.5 rounded">{SKILLS.find(s=>s.id===evt.skill)?.label.split(' ')[0]}</span>
                          {evt.startZone && <span className="text-[9px] text-slate-400 border border-slate-700 px-1 rounded bg-slate-900">R{evt.startZone}</span>}
                          {evt.endZone && <span className="text-slate-500 text-[9px] leading-none">➔</span>}
                          {evt.endZone && <span className="text-[9px] text-amber-500/90 border border-amber-900/40 px-1 rounded bg-amber-950/30">เป้าR{evt.endZone}</span>}
                        </span>
                      )}
                    </span>
                  </div>
                  {evt.eval && evt.skill !== 'substitute' && evt.skill !== 'timeout' && evt.skill !== 'foul' && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black text-white shrink-0 shadow-sm border border-black/20 ${EVALUATIONS.find(e=>e.id===evt.eval)?.color}`}>
                      {evt.eval}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(ROLES.UNASSIGNED);
  const [roomId, setRoomId] = useState('');
  const [activeRoom, setActiveRoom] = useState(null); 
  const [matchData, setMatchData] = useState(INITIAL_MATCH_STATE);
  const [loading, setLoading] = useState(true);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [lobbyError, setLobbyError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  const [activeMobileView, setActiveMobileView] = useState('court');
  const [setEndData, setSetEndData] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { 
        console.error("Auth initialization error:", error); 
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !activeRoom) return;
    
    const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', activeRoom);
    
    const unsubscribe = onSnapshot(matchRef, (docSnap) => {
      if (docSnap.exists()) {
        setMatchData(docSnap.data());
      } else {
        setDoc(matchRef, INITIAL_MATCH_STATE);
      }
    }, (error) => {
      console.error("Firestore snapshot error:", error);
    });
    return () => unsubscribe();
  }, [user, activeRoom]);

  const checkSetEnd = (homeScore, awayScore, currentSet) => {
    const targetScore = currentSet === 5 ? 15 : 25;
    if (homeScore >= targetScore && homeScore - awayScore >= 2) return 'home';
    if (awayScore >= targetScore && awayScore - homeScore >= 2) return 'away';
    return null;
  };

  useEffect(() => {
    if (matchData.score) {
       const winner = checkSetEnd(matchData.score.home, matchData.score.away, matchData.score.set);
       if (winner) {
          setSetEndData({
             winner,
             homeScore: matchData.score.home,
             awayScore: matchData.score.away,
             isMatchOver: (matchData.setsWon?.[winner] || 0) + 1 >= 3
          });
       } else {
          setSetEndData(null);
       }
    }
  }, [matchData.score, matchData.setsWon]);

  const handleCreateRoom = async (selectedId) => {
    if (!user) return;
    const cleanId = selectedId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!cleanId) {
      setLobbyError('กรุณากรอกรหัสห้องให้ถูกต้อง (อังกฤษ/ตัวเลข)');
      return;
    }
    setLoading(true);
    try {
      const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', cleanId);
      await setDoc(matchRef, INITIAL_MATCH_STATE, { merge: false });
      setActiveRoom(cleanId);
      setLobbyError('');
    } catch (e) {
      console.error(e);
      setLobbyError('เกิดข้อผิดพลาดในการสร้างห้อง โปรดลองรหัสอื่น');
    }
    setLoading(false);
  };

  const handleJoinRoom = async (selectedId) => {
    if (!user) return;
    const cleanId = selectedId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!cleanId) {
      setLobbyError('กรุณากรอกรหัสห้องที่จะเข้าร่วม');
      return;
    }
    setLoading(true);
    try {
      setActiveRoom(cleanId);
      setLobbyError('');
    } catch (e) {
      setLobbyError('ไม่พบรหัสห้องนี้ หรือไม่สามารถเชื่อมต่อได้');
    }
    setLoading(false);
  };

  const handleUpdateServe = async (team) => {
    if (!user || !activeRoom) return;
    const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', activeRoom);
    await updateDoc(matchRef, { currentServe: team });
  };

  const handleUpdateScore = async (team, increment) => {
    if (!user || !activeRoom || setEndData) return;
    const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', activeRoom);
    const newScore = Math.max(0, matchData.score[team] + increment);
    
    const prevServe = matchData.currentServe;
    let nextServe = prevServe;
    let newRotations = { ...matchData.rotations };

    if (increment > 0) {
      nextServe = team;
      if (prevServe !== null && prevServe !== team) {
        const currentRot = [...matchData.rotations[team]];
        newRotations[team] = [
          currentRot[1], currentRot[2], currentRot[3],
          currentRot[4], currentRot[5], currentRot[0]
        ];
      }
    }

    await updateDoc(matchRef, { 
      [`score.${team}`]: newScore,
      currentServe: nextServe,
      [`rotations.${team}`]: newRotations[team]
    });
  };

  const handleNextSet = async () => {
    if (!user || !activeRoom || !setEndData) return;
    const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', activeRoom);
    const winner = setEndData.winner;
    const newSetsWon = { ...(matchData.setsWon || { home: 0, away: 0 }) };
    newSetsWon[winner] += 1;

    if (setEndData.isMatchOver) {
       await updateDoc(matchRef, {
          score: { home: 0, away: 0, set: 1 },
          setsWon: { home: 0, away: 0 },
          currentServe: null,
          events: [],
          tempRallyEvents: [],
          timeouts: { home: 0, away: 0 }
       });
    } else {
       await updateDoc(matchRef, {
          score: { home: 0, away: 0, set: matchData.score.set + 1 },
          setsWon: newSetsWon,
          currentServe: null,
          tempRallyEvents: [],
          timeouts: { home: 0, away: 0 }
       });
    }
    setSetEndData(null);
  };

  const rotateTeamClockwise = async (team) => {
    if (!user || !activeRoom) return;
    const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', activeRoom);
    const currentRot = [...matchData.rotations[team]];
    
    const nextRot = [
      currentRot[1], currentRot[2], currentRot[3], 
      currentRot[4], currentRot[5], currentRot[0]  
    ];

    await updateDoc(matchRef, {
      [`rotations.${team}`]: nextRot
    });
  };

  const handleAddToTempRally = async (eventData) => {
    if (!user || !activeRoom) return;
    const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', activeRoom);
    
    const newTempEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...eventData
    };

    await updateDoc(matchRef, {
      tempRallyEvents: arrayUnion(newTempEvent)
    });
  };

  const handleClearTempRally = async () => {
    if (!user || !activeRoom) return;
    const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', activeRoom);
    await updateDoc(matchRef, {
      tempRallyEvents: []
    });
  };

  const handleCommitRally = async (winningTeam) => {
    if (!user || !activeRoom || setEndData) return;
    const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', activeRoom);
    
    const rallyEvents = matchData.tempRallyEvents || [];
    if (rallyEvents.length === 0) {
      await handleUpdateScore(winningTeam, 1);
      return;
    }

    const scoreText = `[${matchData.score.home}-${matchData.score.away}]`;
    const sZoneHome = getSetterZone(matchData.rotations.home, matchData.roster.home);
    const sZoneAway = getSetterZone(matchData.rotations.away, matchData.roster.away);

    const finalEventsToCommit = rallyEvents.map(evt => ({
      ...evt,
      scoreAt: scoreText,
      setterZoneHome: sZoneHome,
      setterZoneAway: sZoneAway
    }));

    const currentScoreObj = { ...matchData.score };
    const newScore = currentScoreObj[winningTeam] + 1;
    
    const prevServe = matchData.currentServe;
    let nextServe = winningTeam;
    let newRotations = { ...matchData.rotations };

    if (prevServe !== null && prevServe !== winningTeam) {
      const currentRot = [...matchData.rotations[winningTeam]];
      newRotations[winningTeam] = [
        currentRot[1], currentRot[2], currentRot[3],
        currentRot[4], currentRot[5], currentRot[0]
      ];
    }

    await updateDoc(matchRef, {
      events: arrayUnion(...finalEventsToCommit),
      tempRallyEvents: [],
      [`score.${winningTeam}`]: newScore,
      currentServe: nextServe,
      [`rotations.${winningTeam}`]: newRotations[winningTeam]
    });
  };

  const handleAddEvent = async (eventData) => {
    if (!user || !activeRoom) return;
    const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', activeRoom);
    
    const sZoneHome = getSetterZone(matchData.rotations.home, matchData.roster.home);
    const sZoneAway = getSetterZone(matchData.rotations.away, matchData.roster.away);

    const newEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      scoreAt: `[${matchData.score.home}-${matchData.score.away}]`,
      setterZoneHome: sZoneHome,
      setterZoneAway: sZoneAway,
      ...eventData
    };

    await updateDoc(matchRef, { events: arrayUnion(newEvent) });
  };

  const handleUndoLastEvent = async () => {
    if (!user || !activeRoom) return;
    const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', activeRoom);

    if (matchData.tempRallyEvents && matchData.tempRallyEvents.length > 0) {
      const lastTempEvent = matchData.tempRallyEvents[matchData.tempRallyEvents.length - 1];
      await updateDoc(matchRef, { tempRallyEvents: arrayRemove(lastTempEvent) });
      return;
    }

    if (matchData.events && matchData.events.length > 0) {
      const teamEvents = matchData.events.filter(e => role === ROLES.COACH || e.team === role);
      if (teamEvents.length === 0) return;
      
      const lastEvent = teamEvents[teamEvents.length - 1];
      await updateDoc(matchRef, { events: arrayRemove(lastEvent) });
    }
  };

  const handleUpdateRoster = async (team, newRotations, newRoster, customNames = null) => {
    if (!user || !activeRoom) return;
    const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', activeRoom);
    
    const updatePayload = {
      [`rotations.${team}`]: newRotations,
      [`roster.${team}`]: newRoster
    };

    if (customNames) {
      updatePayload['teamNames'] = customNames;
    }

    await updateDoc(matchRef, updatePayload);
    setIsSetupModalOpen(false);
  };

  const handleTimeout = async (team) => {
    if (!user || !activeRoom) return;
    const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', activeRoom);
    const currentTO = matchData.timeouts?.[team] || 0;
    if (currentTO >= 2) return; 

    const textNum = currentTO + 1;
    await updateDoc(matchRef, {
      [`timeouts.${team}`]: textNum
    });

    await handleAddEvent({
      team: team,
      player: "TEAM",
      skill: "timeout",
      eval: "!",
      startZone: null,
      endZone: null,
      detail: `ขอเวลานอกครั้งที่ ${textNum}`
    });
  };

  const handleSubstitution = async (team, targetNum, subNum) => {
    if (!user || !activeRoom) return;
    const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', activeRoom);
    
    const updatedRot = matchData.rotations[team].map(num => num === targetNum ? subNum : num);
    
    const updatedRoster = { ...matchData.roster[team] };
    if (updatedRoster[targetNum]) updatedRoster[targetNum].isStarter = false;
    if (updatedRoster[subNum]) updatedRoster[subNum].isStarter = true;

    await updateDoc(matchRef, {
      [`rotations.${team}`]: updatedRot,
      [`roster.${team}`]: updatedRoster
    });

    await handleAddEvent({
      team: team,
      player: targetNum,
      skill: "substitute",
      eval: "#",
      startZone: null,
      endZone: null,
      detail: `เปลี่ยนตัว: ${subNum} ลงแทน ${targetNum}`
    });
  };

  const handleFoul = async (team, foulType) => {
    if (!user || !activeRoom || setEndData) return;
    
    await handleAddEvent({
      team: team,
      player: "TEAM",
      skill: "foul",
      eval: "=",
      startZone: null,
      endZone: null,
      detail: `ทำฟาล์ว: ${foulType}`
    });

    const opponent = team === 'home' ? 'away' : 'home';
    await handleUpdateScore(opponent, 1);
  };

  const handleSaveToCloud = async () => {
    if (!user || !activeRoom) return;
    setIsSavingHistory(true);
    setSaveStatus('กำลังเซฟลงคลาวด์...');
    try {
      const historyCollection = collection(db, 'artifacts', appId, 'public', 'data', 'match_history');
      await addDoc(historyCollection, {
        roomId: activeRoom,
        savedAt: Date.now(),
        teamNames: matchData.teamNames || { home: "HOME", away: "AWAY" },
        score: matchData.score,
        events: matchData.events,
        roster: matchData.roster
      });
      setSaveStatus('บันทึกสมบูรณ์!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (e) {
      console.error(e);
      setSaveStatus('เกิดข้อผิดพลาด');
      setTimeout(() => setSaveStatus(''), 3000);
    }
    setIsSavingHistory(false);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Helper: Skills Overall Table
    const compileTeamStatsHtml = (team) => {
      const tEvents = matchData.events.filter(e => e.team === team);
      return SKILLS.map(skill => {
        const sEvents = tEvents.filter(e => e.skill === skill.id);
        const total = sEvents.length;
        const perfect = sEvents.filter(e => e.eval === '#').length;
        const good = sEvents.filter(e => e.eval === '+').length;
        const error = sEvents.filter(e => e.eval === '=').length;
        const blocked = sEvents.filter(e => e.eval === '/').length;
        
        const effPercent = total > 0 ? (((perfect + good) / total) * 100).toFixed(0) : '0';
        const errPercent = total > 0 ? (((error + blocked) / total) * 100).toFixed(0) : '0';
        
        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${skill.label}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${total}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #059669; font-weight: 800;">${effPercent}%</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #e11d48; font-weight: bold;">${errPercent}%</td>
          </tr>
        `;
      }).join('');
    };

    // Helper: Heatmap Attack Zones Table
    const compileHeatmapHtml = (team) => {
      let rows = '';
      const strengths = Array(7).fill(0);
      const weaknesses = Array(7).fill(0);
      let totalZones = 0;

      matchData.events.forEach(evt => {
        if (evt.team === team && evt.endZone >= 1 && evt.endZone <= 6) {
          const isSuccess = evt.eval === '#' || evt.eval === '+';
          const isError = evt.eval === '=' || evt.eval === '/';
          if (isSuccess) strengths[evt.endZone]++;
          if (isError) weaknesses[evt.endZone]++;
          totalZones++;
        }
      });

      [1, 2, 3, 4, 5, 6].forEach(zone => {
        const s = strengths[zone];
        const w = weaknesses[zone];
        const totalInZone = matchData.events.filter(e => e.team === team && e.endZone === zone).length;
        const distPercent = totalZones > 0 ? ((totalInZone / totalZones) * 100).toFixed(0) : '0';
        
        rows += `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: center; background: #f8fafc;">Zone ${zone}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${totalInZone} <span style="color:#64748b; font-size:11px">(${distPercent}%)</span></td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #059669; font-weight: bold;">+${s}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #e11d48; font-weight: bold;">-${w}</td>
          </tr>
        `;
      });
      return rows;
    };

    // Helper: Setter Rotation Performance Table
    const compileRotationHtml = (team) => {
      let rows = '';
      [1, 6, 5, 2, 3, 4].forEach(zone => {
        const rotEvents = matchData.events.filter(e => e.team === team && (team === 'home' ? e.setterZoneHome === zone : e.setterZoneAway === zone));
        const total = rotEvents.length;
        const wins = rotEvents.filter(e => e.eval === '#' || e.eval === '+').length;
        const errors = rotEvents.filter(e => e.eval === '=' || e.eval === '/').length;
        const winPercent = total > 0 ? ((wins / total) * 100).toFixed(0) : '0';
        const errPercent = total > 0 ? ((errors / total) * 100).toFixed(0) : '0';

        rows += `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: center; background: #f8fafc;">S ยืน R${zone}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${total}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #059669; font-weight: bold;">${winPercent}%</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #e11d48; font-weight: bold;">${errPercent}%</td>
          </tr>
        `;
      });
      return rows;
    }

    const homeName = matchData.teamNames?.home || "HOME";
    const awayName = matchData.teamNames?.away || "AWAY";

    const printContent = `
      <html>
      <head>
        <title>V Project (beta) - Detailed Scout Report [${activeRoom}]</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
          body { font-family: 'Inter', Arial, sans-serif; padding: 30px; color: #0f172a; line-height: 1.6; background: #fff; }
          .header { border-bottom: 3px solid #334155; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo { font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
          .logo span { color: #f59e0b; font-size: 14px; vertical-align: super; }
          .match-meta { background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 35px; border: 1px solid #e2e8f0; }
          .score-card { font-size: 42px; font-weight: 900; letter-spacing: -1px; text-align: center; margin: 15px 0; color: #1e293b; }
          
          .section-box { border: 1px solid #cbd5e1; border-radius: 16px; padding: 25px; background: #ffffff; margin-bottom: 40px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
          .team-title { font-size: 22px; font-weight: 900; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
          .sub-title { font-size: 14px; font-weight: 800; margin-bottom: 12px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; }
          
          .grid-2 { display: flex; gap: 30px; margin-top: 25px; }
          .grid-col { flex: 1; }
          
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { text-align: center; padding: 10px; background: #f1f5f9; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; }
          .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">V Project <span>beta</span></div>
          <div style="font-size: 12px; text-align: right; color: #64748b; font-weight: 500;">LIVE ROOM: ${activeRoom}</div>
        </div>

        <div class="match-meta">
          <div style="text-align: center; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 2px;">Official Match Score</div>
          <div class="score-card">${homeName} ${matchData.score.home} : ${matchData.score.away} ${awayName}</div>
          <div style="text-align: center; font-size: 14px; font-weight: 900; color: #4f46e5; background: #e0e7ff; display: inline-block; padding: 4px 16px; border-radius: 20px; margin: 0 auto; display: block; width: fit-content;">SET ${matchData.score.set}</div>
        </div>

        <!-- HOME TEAM SECTION -->
        <div class="section-box" style="border-top: 6px solid #4f46e5;">
          <div class="team-title" style="color: #4f46e5;">${homeName} (HOME)</div>
          
          <div class="sub-title">ภาพรวมทักษะ (Skills Overview)</div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">ทักษะ (Skill)</th>
                <th>จำนวน (Total)</th>
                <th>% ดี (+)</th>
                <th>% เสีย (-)</th>
              </tr>
            </thead>
            <tbody>
              ${compileTeamStatsHtml('home')}
            </tbody>
          </table>

          <div class="grid-2">
            <div class="grid-col">
              <div class="sub-title" style="color: #0ea5e9;">เป้าหมายจุดลงบุก (Attack Zones)</div>
              <table>
                <thead>
                  <tr>
                    <th>โซนเป้าหมาย</th>
                    <th>จำนวน (%)</th>
                    <th>ได้แต้ม (+)</th>
                    <th>เสียแต้ม (-)</th>
                  </tr>
                </thead>
                <tbody>
                  ${compileHeatmapHtml('home')}
                </tbody>
              </table>
            </div>
            <div class="grid-col">
              <div class="sub-title" style="color: #8b5cf6;">ประสิทธิภาพหน้าเซต (Setter Rotations)</div>
              <table>
                <thead>
                  <tr>
                    <th>ตำแหน่งตัวเซต</th>
                    <th>บุกทั้งหมด</th>
                    <th>% ได้แต้ม</th>
                    <th>% เสียแต้ม</th>
                  </tr>
                </thead>
                <tbody>
                  ${compileRotationHtml('home')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- AWAY TEAM SECTION -->
        <div class="section-box" style="border-top: 6px solid #e11d48; margin-top: 40px; page-break-inside: avoid;">
          <div class="team-title" style="color: #e11d48;">${awayName} (AWAY)</div>
          
          <div class="sub-title">ภาพรวมทักษะ (Skills Overview)</div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">ทักษะ (Skill)</th>
                <th>จำนวน (Total)</th>
                <th>% ดี (+)</th>
                <th>% เสีย (-)</th>
              </tr>
            </thead>
            <tbody>
              ${compileTeamStatsHtml('away')}
            </tbody>
          </table>

          <div class="grid-2">
            <div class="grid-col">
              <div class="sub-title" style="color: #0ea5e9;">เป้าหมายจุดลงบุก (Attack Zones)</div>
              <table>
                <thead>
                  <tr>
                    <th>โซนเป้าหมาย</th>
                    <th>จำนวน (%)</th>
                    <th>ได้แต้ม (+)</th>
                    <th>เสียแต้ม (-)</th>
                  </tr>
                </thead>
                <tbody>
                  ${compileHeatmapHtml('away')}
                </tbody>
              </table>
            </div>
            <div class="grid-col">
              <div class="sub-title" style="color: #8b5cf6;">ประสิทธิภาพหน้าเซต (Setter Rotations)</div>
              <table>
                <thead>
                  <tr>
                    <th>ตำแหน่งตัวเซต</th>
                    <th>บุกทั้งหมด</th>
                    <th>% ได้แต้ม</th>
                    <th>% เสียแต้ม</th>
                  </tr>
                </thead>
                <tbody>
                  ${compileRotationHtml('away')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="footer">
          Generated automatically by V Project (beta) Detailed Analytical Engine.
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const copyRoomCode = () => {
    if (!activeRoom) return;
    const dummy = document.createElement("input");
    document.body.appendChild(dummy);
    dummy.value = activeRoom;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <VolleyballIcon className="w-12 h-12 text-indigo-500 animate-[spin_3s_linear_infinite]" />
        <span className="text-sm font-semibold tracking-widest text-slate-400">CONNECTING...</span>
      </div>
    );
  }

  if (!activeRoom) {
    return (
      <LobbyScreen 
        roomId={roomId}
        setRoomId={setRoomId}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        error={lobbyError}
      />
    );
  }

  return (
    <div className="h-screen max-h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden flex flex-col select-none relative">
      {/* App Main Header */}
      <header className="bg-slate-900 h-14 border-b border-slate-800 flex justify-between items-center px-3 sm:px-5 shrink-0 shadow-md z-30">
        <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg font-black text-white tracking-tight">
          <div className="bg-indigo-600/20 p-1.5 rounded-lg border border-indigo-500/30">
            <VolleyballIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 animate-[spin_10s_linear_infinite]" /> 
          </div>
          <span className="truncate max-w-[120px] sm:max-w-none">V Project <span className="text-[10px] text-amber-500 font-bold align-top">beta</span></span>
          <span className="hidden sm:inline-block text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-md border border-emerald-500/20 font-mono tracking-widest ml-2 shadow-inner">
            LIVE: {activeRoom}
          </span>
        </div>
        
        <div className="flex gap-1.5 sm:gap-2 items-center">
          <button 
            onClick={() => setIsHelpModalOpen(true)}
            className="flex items-center gap-1.5 text-[10px] sm:text-[11px] bg-slate-800 hover:bg-slate-700 hover:text-amber-400 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors font-bold shrink-0 shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden xs:inline">คู่มือ</span>
          </button>

          <div className="hidden xs:flex items-center gap-1.5 bg-slate-950/50 border border-slate-800 px-2.5 py-1.5 rounded-lg text-[11px] shrink-0 shadow-inner">
            <span className="text-slate-400 font-mono font-bold tracking-wider">{activeRoom}</span>
            <button onClick={copyRoomCode} className="text-slate-500 hover:text-emerald-400 transition-colors ml-1 p-0.5">
              {copySuccess ? <span className="text-[9px] text-emerald-400 font-black">Copied!</span> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {role !== ROLES.UNASSIGNED && role !== ROLES.COACH && (
            <button 
              onClick={() => setIsSetupModalOpen(true)}
              className="flex items-center gap-1.5 text-[10px] sm:text-[11px] bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1.5 rounded-lg border border-indigo-500 transition-colors text-white font-bold shadow-md"
            >
              <Users className="w-3.5 h-3.5 text-indigo-200" /> ตั้งค่าทีม
            </button>
          )}

          {role === ROLES.COACH && (
            <div className="flex gap-1.5">
              <button 
                onClick={handleSaveToCloud}
                disabled={isSavingHistory}
                className="flex items-center gap-1.5 text-[10px] sm:text-[11px] bg-emerald-700/80 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg border border-emerald-600 transition-colors font-bold shrink-0 shadow-sm"
              >
                <CloudLightning className="w-3.5 h-3.5" /> <span className="hidden sm:inline">เซฟคลาวด์</span>
              </button>
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 text-[10px] sm:text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg border border-indigo-500 transition-colors font-bold shrink-0 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-indigo-200" /> <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          )}

          <button 
            onClick={() => {
              setActiveRoom(null);
              setRole(ROLES.UNASSIGNED);
            }} 
            className="text-[10px] bg-rose-950/50 hover:bg-rose-900 border border-rose-900/50 text-rose-300 px-2 sm:px-3 py-1.5 rounded-lg transition-colors font-bold ml-1"
          >
            ออก
          </button>
        </div>
      </header>

      {saveStatus && (
        <div className="bg-emerald-600 text-white text-xs py-1.5 px-4 text-center font-bold tracking-widest animate-pulse shrink-0 shadow-md">
          {saveStatus}
        </div>
      )}

      {/* Main Container layout - Adapts to Portrait and Landscape cleanly */}
      <main className="flex-1 flex flex-col md:flex-row w-full h-full gap-2 overflow-hidden p-2 min-h-0">
        {role === ROLES.UNASSIGNED ? (
          <RoleSelection onSelect={setRole} />
        ) : (
          <div className="flex flex-col md:flex-row w-full h-full gap-2 overflow-hidden">
            {/* Dashboard / Stats layout */}
            <div className={`flex flex-col gap-2 h-full min-h-0 shrink-0
              ${role === ROLES.COACH ? 'w-full' : 'w-full md:w-[38%] lg:w-[32%] md:max-w-[420px]'}
              ${role !== ROLES.COACH && activeMobileView !== 'stats' ? 'hidden md:flex' : 'flex'}
            `}>
              <ScoreBoard 
                score={matchData.score} 
                setsWon={matchData.setsWon}
                role={role} 
                teamNames={matchData.teamNames || { home: "HOME", away: "AWAY" }}
                timeouts={matchData.timeouts}
                currentServe={matchData.currentServe}
                onUpdateScore={handleUpdateScore} 
                onTimeout={handleTimeout}
                onUpdateServe={handleUpdateServe}
              />
              
              <div className="flex-1 min-h-0 bg-slate-900 rounded-xl border border-slate-800 shadow-inner p-1.5">
                <Dashboard 
                   events={matchData.events} 
                   rotations={matchData.rotations} 
                   roster={matchData.roster}
                   role={role}
                   teamNames={matchData.teamNames || { home: "HOME", away: "AWAY" }}
                   timeouts={matchData.timeouts}
                />
              </div>
            </div>

            {/* Scouter Court View */}
            {role !== ROLES.COACH && (
              <div className={`flex-1 bg-slate-900 rounded-xl border border-slate-700 flex flex-col relative shadow-xl overflow-hidden min-h-0
                ${activeMobileView !== 'court' ? 'hidden md:flex' : 'flex'}
              `}>
                 <TrackerView 
                    role={role} 
                    score={matchData.score}
                    teamNames={matchData.teamNames || { home: "HOME", away: "AWAY" }}
                    rotations={matchData.rotations} 
                    roster={matchData.roster}
                    tempRallyEvents={matchData.tempRallyEvents || []}
                    timeouts={matchData.timeouts}
                    currentServe={matchData.currentServe}
                    onSaveEvent={handleAddToTempRally}
                    onCommitRally={handleCommitRally}
                    onClearRally={handleClearTempRally}
                    onUndo={handleUndoLastEvent}
                    onFoul={(fType) => handleFoul(role, fType)}
                    onSubstitution={(target, sub) => handleSubstitution(role, target, sub)}
                    onManualRotate={() => rotateTeamClockwise(role)}
                    hasEvents={matchData.events.filter(e => e.team === role).length > 0}
                 />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Set / Match win modal */}
      {setEndData && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center max-w-md w-full animate-in fade-in zoom-in duration-300">
            <Trophy className="w-24 h-24 mx-auto text-amber-400 mb-5 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]" />
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-wide">
              {setEndData.isMatchOver ? 'แมตช์สิ้นสุด!' : `จบเซตที่ ${matchData.score.set}`}
            </h2>
            <p className="text-xl md:text-2xl text-slate-300 mb-6 font-medium">
              ทีมที่ชนะ: <span className={setEndData.winner === 'home' ? 'text-indigo-400 font-black' : 'text-rose-400 font-black'}>
                {matchData.teamNames[setEndData.winner]}
              </span>
            </p>
            
            <div className="bg-slate-950 rounded-2xl p-6 mb-8 border border-slate-800 shadow-inner">
              <div className="text-xs text-slate-500 mb-3 font-bold uppercase tracking-widest">FINAL SET SCORE</div>
              <div className="flex justify-center items-center gap-6 text-6xl font-black">
                <span className="text-indigo-500">{setEndData.homeScore}</span>
                <span className="text-slate-700 text-4xl">-</span>
                <span className="text-rose-500">{setEndData.awayScore}</span>
              </div>
            </div>

            <button
              onClick={handleNextSet}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-lg shadow-lg shadow-emerald-900/50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {setEndData.isMatchOver ? <RotateCcw className="w-6 h-6" /> : <PlayCircle className="w-6 h-6" />}
              {setEndData.isMatchOver ? 'เริ่มการแข่งขันใหม่ (ล้างคะแนน)' : 'เริ่มเกมเซตต่อไป'}
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar navigation for mobile screens */}
      {role !== ROLES.UNASSIGNED && role !== ROLES.COACH && (
        <div className="md:hidden flex h-14 shrink-0 bg-slate-950 border-t border-slate-800 items-center justify-around text-[10px] z-30 pb-2">
          <button 
            onClick={() => setActiveMobileView('stats')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors
              ${activeMobileView === 'stats' ? 'text-indigo-400 font-black' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <BarChart3 className={`w-5 h-5 ${activeMobileView === 'stats' ? 'animate-bounce' : ''}`} />
            <span>กระดานคะแนน</span>
          </button>
          <button 
            onClick={() => setActiveMobileView('court')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors
              ${activeMobileView === 'court' ? 'text-amber-400 font-black' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <ClipboardList className={`w-5 h-5 ${activeMobileView === 'court' ? 'animate-bounce' : ''}`} />
            <span>คีย์สนามสด</span>
          </button>
        </div>
      )}

      {isSetupModalOpen && (
        <PlayerSetupModal 
          team={role} 
          currentRotations={matchData.rotations[role]} 
          currentRoster={matchData.roster[role]}
          currentTeamNames={matchData.teamNames || { home: "HOME", away: "AWAY" }}
          onSave={(newRots, newRoster, names) => handleUpdateRoster(role, newRots, newRoster, names)}
          onClose={() => setIsSetupModalOpen(false)} 
        />
      )}

      {isHelpModalOpen && (
        <HelpGuideModal onClose={() => setIsHelpModalOpen(false)} />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
        .synthetic-court {
          background-color: #d97746;
          background-image: linear-gradient(135deg, #e38758 0%, #c45b2b 100%);
        }
      `}} />
    </div>
  );
}