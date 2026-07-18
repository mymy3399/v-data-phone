import React, { useState, useEffect, useMemo, useContext } from 'react';
import { io } from 'socket.io-client';
import { translations, getLocalizedSkillLabel, getLocalizedEvalLabel } from './translations';
import { getSetterZone, parseStoredJson } from './utils/appState';
import {
  ClipboardList, MonitorPlay, Check, X, Undo2, Settings,
  Users, RotateCcw, AlertCircle, BarChart3, Swords, LogIn, Plus, Copy, CloudLightning, Download, BookOpen, ChevronRight, Link2, Trophy, PlayCircle, ChevronLeft,
  Activity, Lock, Unlock, Trash2, Calendar, KeyRound, UserPlus, Sliders, LayoutGrid, List, MapPin, Sun, Moon
} from 'lucide-react';
import { LanguageContext } from './context';
import {
  ROLES, SKILLS, EVALUATIONS, COURT_ZONES, OPP_COURT_ZONES, POSITIONS,
  INITIAL_MATCH_STATE, ensureValidMatchDataLocal
} from './constants';
import HeatmapCourt from './components/HeatmapCourt';
import SkillBarStats from './components/SkillBarStats';
import RotPlayer from './components/RotPlayer';
import ScoreBoard from './components/ScoreBoard';
import VolleyballIcon from './components/VolleyballIcon';

const BACKEND_URL = '';
const socket = io(BACKEND_URL, { autoConnect: false });

/* ========================================================================= */
/* HELPER COMPONENTS                                                         */
/* ========================================================================= */

function RotationAnalysisView({ team, events, teamName, isHome }) {
  const { lang } = useContext(LanguageContext);
  const t = (key: string, params?: Record<string, string | number>) => {
    let val = (translations[lang] as any)[key] || (translations['th'] as any)[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, String(v));
      });
    }
    return val;
  };
  const themeBorder = isHome ? 'border-indigo-900/40 bg-indigo-950/20' : 'border-rose-900/40 bg-rose-950/20';
  const themeText = isHome ? 'text-indigo-400 bg-indigo-950/60' : 'text-rose-400 bg-rose-950/60';

  return (
    <div className={`rounded-xl p-3 border ${themeBorder} shadow-lg flex flex-col min-h-0 w-full h-full`}>
      <h3 className={`text-[11px] sm:text-[12px] font-black px-3 py-2 rounded-lg mb-3 uppercase tracking-wider text-center border ${themeText} shrink-0 shadow-sm`}>
        {t('rotationAnalysisTitle', { name: teamName })}
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
                {t('setterAtZone', { zone })}
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

function RoleSelection({ onSelect }) {
  const { lang, setLang } = useContext(LanguageContext);
  const t = (key: string) => (translations[lang] as any)[key] || (translations['th'] as any)[key] || key;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950 p-4 overflow-hidden relative">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-50">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button 
            onClick={() => setLang('th')} 
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${lang === 'th' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            TH
          </button>
          <button 
            onClick={() => setLang('en')} 
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${lang === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            EN
          </button>
        </div>
      </div>

      <div className="text-center mb-8 max-w-sm flex flex-col items-center">
        <img src="/logo.png" className="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-xl border border-slate-800 object-cover bg-slate-950" alt="VolleyData Logo" />
        <h2 className="text-lg md:text-xl font-black mb-2 text-white leading-tight">{t('appTitle')} <span className="text-sm text-amber-500 font-bold align-top">{t('beta')}</span></h2>
        <p className="text-[11px] sm:text-xs text-slate-400 leading-normal">
          {t('roleTitle')}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 max-w-xl w-full justify-center">
        <button 
          onClick={() => onSelect(ROLES.HOME)} 
          className="flex items-center sm:flex-col sm:items-center p-5 bg-slate-900 rounded-2xl border border-slate-800 hover:border-indigo-500 transition-all w-full sm:w-44 text-left sm:text-center shadow-lg group active:scale-95"
        >
          <ClipboardList className="w-10 h-10 text-indigo-400 mr-4 sm:mr-0 sm:mb-3 group-hover:scale-110 transition-transform duration-300" />
          <div>
            <h3 className="text-[12px] sm:text-sm font-black leading-tight text-white">{t('homeScout')}</h3>
            <p className="text-[10px] text-slate-500 leading-tight sm:mt-1.5">{t('homeScoutDesc')}</p>
          </div>
        </button>

        <button 
          onClick={() => onSelect(ROLES.AWAY)} 
          className="flex items-center sm:flex-col sm:items-center p-5 bg-slate-900 rounded-2xl border border-slate-800 hover:border-rose-500 transition-all w-full sm:w-44 text-left sm:text-center shadow-lg group active:scale-95"
        >
          <ClipboardList className="w-10 h-10 text-rose-400 mr-4 sm:mr-0 sm:mb-3 group-hover:scale-110 transition-transform duration-300" />
          <div>
            <h3 className="text-[12px] sm:text-sm font-black leading-tight text-white">{t('awayScout')}</h3>
            <p className="text-[10px] text-slate-500 leading-tight sm:mt-1.5">{t('awayScoutDesc')}</p>
          </div>
        </button>

        <button 
          onClick={() => onSelect(ROLES.COACH)} 
          className="flex items-center sm:flex-col sm:items-center p-5 bg-slate-900 rounded-2xl border border-slate-800 hover:border-emerald-500 transition-all w-full sm:w-44 text-left sm:text-center shadow-lg group active:scale-95"
        >
          <MonitorPlay className="w-10 h-10 text-emerald-400 mr-4 sm:mr-0 sm:mb-3 group-hover:scale-110 transition-transform duration-300" />
          <div>
            <h3 className="text-[12px] sm:text-sm font-black leading-tight text-white">{t('coachBoard')}</h3>
            <p className="text-[10px] text-slate-500 leading-tight sm:mt-1.5">{t('coachBoardDesc')}</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function LoginScreen({ 
  loginForm, 
  setLoginForm, 
  handleLogin, 
  adminPin, 
  setAdminPin, 
  adminPinError, 
  setAdminPinError, 
  handleUnlockAdmin 
}) {
  const { lang, setLang } = useContext(LanguageContext);
  const t = (key: string) => (translations[lang] as any)[key] || (translations['th'] as any)[key] || key;

  return (
    <div className="min-h-full bg-slate-950 flex flex-col items-center justify-center p-4 relative">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-50">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button 
            type="button"
            onClick={() => setLang('th')} 
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${lang === 'th' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            TH
          </button>
          <button 
            type="button"
            onClick={() => setLang('en')} 
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${lang === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            EN
          </button>
        </div>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        
        {/* Decorative background element */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-lg shadow-slate-950/50 border border-slate-700 overflow-hidden">
            <img src="/logo.png" className="w-full h-full object-cover" alt="VolleyData Logo" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">{t('appTitle')} <span className="text-sm text-amber-500 font-bold align-top">{t('beta')}</span></h1>
          <p className="text-xs text-slate-400 text-center leading-relaxed">
            {t('systemDesc')}
            <br />
            <span className="text-indigo-400 font-bold tracking-wide">{t('loginToUse')}</span>
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4 relative z-10">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('username')}</label>
            <input 
              type="text" 
              value={loginForm.username}
              onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
              placeholder={t('usernamePlaceholder')}
              className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('password')}</label>
            <input 
              type="password" 
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
              placeholder={t('passwordPlaceholder')}
              className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
              required
            />
          </div>

          {loginForm.error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 relative z-10 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginForm.error}</span>
            </div>
          )}

          <button 
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl border border-indigo-500 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-indigo-600/20 mt-2"
          >
            <LogIn className="w-4 h-4" />
            {t('loginBtn')}
          </button>
        </form>
        
      </div>
    </div>
  );
}

function AdminPanelModal({ 
  isOpen, 
  onClose, 
  adminPin, 
  setAdminPin, 
  adminPinError, 
  setAdminPinError, 
  isAdminUnlocked, 
  handleUnlockAdmin, 
  adminUsers, 
  handleCreateUser, 
  handleDeleteUser, 
  handleUpdateExpiry, 
  handleResetPassword,
  handleToggleAdminRole,
  adminUsername,
  setAdminUsername,
  adminPassword,
  setAdminPassword,
  adminExpiryDate,
  setAdminExpiryDate,
  adminUnlimitedExpiry,
  setAdminUnlimitedExpiry,
  adminFormError,
  adminFormSuccess
}) {
  if (!isOpen) return null;

  const { lang } = useContext(LanguageContext);
  const t = (key: string, params?: Record<string, string | number>) => {
    let val = (translations[lang] as any)[key] || (translations['th'] as any)[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, String(v));
      });
    }
    return val;
  };

  const [selectedUserForExpiry, setSelectedUserForExpiry] = useState<any>(null);
  const [newExpiryDateValue, setNewExpiryDateValue] = useState('');
  const [isExpiryUnlimited, setIsExpiryUnlimited] = useState(false);
  const [selectedUserForPasswordReset, setSelectedUserForPasswordReset] = useState<any>(null);
  const [adminNewPasswordInput, setAdminNewPasswordInput] = useState('');


  if (!isAdminUnlocked) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner">
              <Lock className="w-6 h-6 text-amber-500 animate-[bounce_2s_infinite]" />
            </div>
            <h2 className="text-xl font-bold text-white">{t('adminOnlyHeader')}</h2>
            <p className="text-xs text-slate-400 text-center">
              {t('adminPinPlaceholder')}
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleUnlockAdmin(adminPin); }} className="flex flex-col gap-4">
            <input 
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder={t('adminPinPlaceholder')}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-center text-white text-lg font-mono font-bold tracking-widest outline-none transition-all"
              autoFocus
            />
            {adminPinError && (
              <span className="text-xs text-rose-400 text-center font-semibold">{adminPinError}</span>
            )}

            <div className="flex gap-2 mt-2">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition-colors text-sm"
              >
                {t('cancelBtn')}
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl border border-indigo-500 transition-colors text-sm"
              >
                {t('verifyPinBtn')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl md:text-2xl font-black text-white">{t('adminPanelTitle')}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition-colors text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Create User Form Section */}
          <div className="md:col-span-1 bg-slate-950/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 h-fit">
            <h3 className="text-sm font-bold text-indigo-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" /> {t('createUserTitle')}
            </h3>

            <form onSubmit={handleCreateUser} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-semibold">{t('username')}</label>
                <input 
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder={t('usernamePlaceholder')}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-semibold">{t('password')}</label>
                <input 
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2 my-1">
                <input 
                  type="checkbox"
                  id="unlimited-expiry"
                  checked={adminUnlimitedExpiry}
                  onChange={(e) => setAdminUnlimitedExpiry(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
                />
                <label htmlFor="unlimited-expiry" className="text-slate-300 font-semibold select-none cursor-pointer">
                  {t('unlimitedExpiry')}
                </label>
              </div>

              {!adminUnlimitedExpiry && (
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold">{t('expiryDateLabel')}</label>
                  <input 
                     type="date"
                     value={adminExpiryDate}
                     onChange={(e) => setAdminExpiryDate(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white outline-none font-mono"
                     required={!adminUnlimitedExpiry}
                  />
                </div>
              )}

              {adminFormError && (
                <div className="text-rose-400 text-[11px] font-bold text-center mt-1 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
                  {adminFormError}
                </div>
              )}

              {adminFormSuccess && (
                <div className="text-emerald-400 text-[11px] font-bold text-center mt-1 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                  {adminFormSuccess}
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg border border-indigo-500 transition-colors shadow-md mt-2 flex items-center justify-center gap-2 active:scale-95"
              >
                <Plus className="w-4 h-4" /> {t('addUserBtn')}
              </button>
            </form>
          </div>

          {/* User List Section */}
          <div className="md:col-span-2 bg-slate-950/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4" /> {t('userAccountsTitle', { count: adminUsers.length })}
            </h3>

            <div className="flex flex-col gap-3 overflow-y-auto max-h-[450px] pr-1">
              {adminUsers.map((userItem) => {
                const isExpired = userItem.expiresAt && new Date() > new Date(userItem.expiresAt);
                return (
                  <div 
                    key={userItem._id}
                    className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col gap-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{userItem.username}</span>
                        {(userItem.isAdmin || userItem.username === 'vbdata01' || userItem.username === 'vdata2026') ? (
                          <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 font-black">
                            ADMIN
                          </span>
                        ) : (
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-bold">
                            USER
                          </span>
                        )}
                        {isExpired ? (
                          <span className="text-[9px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/20 font-bold">
                            {t('expiredLabel')}
                          </span>
                        ) : (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                            {t('activeLabel')}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {t('expiryDateLabel')}:{' '}
                        {userItem.expiresAt ? (
                          <span className={isExpired ? 'text-rose-400 font-bold font-mono' : 'text-slate-300 font-medium font-mono'}>
                            {new Date(userItem.expiresAt).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US')}
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">{t('unlimitedExpiry')}</span>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center shrink-0">
                      {/* Set Admin Button */}
                      {userItem.username !== 'vbdata01' && userItem.username !== 'vdata2026' && (
                        <button 
                          onClick={() => handleToggleAdminRole(userItem._id, !userItem.isAdmin)}
                          className={`text-[10px] border px-2 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                            userItem.isAdmin 
                              ? 'bg-rose-950/20 hover:bg-rose-900/40 border-rose-900/35 text-rose-300' 
                              : 'bg-indigo-950/25 hover:bg-indigo-900/40 border-indigo-900/35 text-indigo-300'
                          }`}
                          title={userItem.isAdmin ? t('demoteUserTitle') : t('promoteAdminTitle')}
                        >
                          {userItem.isAdmin ? (
                            <>
                              <Lock className="w-3.5 h-3.5" /> {t('makeUserBtn')}
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" /> {t('makeAdminBtn')}
                            </>
                          )}
                        </button>
                      )}

                      {/* Expiry Button */}
                      <button 
                        onClick={() => {
                          setSelectedUserForExpiry(userItem);
                          setNewExpiryDateValue(userItem.expiresAt ? new Date(userItem.expiresAt).toISOString().split('T')[0] : '');
                          setIsExpiryUnlimited(!userItem.expiresAt);
                        }}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1.5 rounded-lg text-slate-300 font-bold transition-all flex items-center gap-1 active:scale-95"
                      >
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" /> {t('expiryDateLabel')}
                      </button>

                      {/* Reset Password Button */}
                      <button 
                        onClick={() => {
                          setSelectedUserForPasswordReset(userItem);
                          setAdminNewPasswordInput('');
                        }}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1.5 rounded-lg text-slate-300 font-bold transition-all flex items-center gap-1 active:scale-95"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" /> {t('resetPassBtn')}
                      </button>

                      {userItem.username !== 'vbdata01' && userItem.username !== 'vdata2026' && (
                        <button 
                          onClick={() => handleDeleteUser(userItem._id)}
                          className="text-[10px] bg-rose-950/40 hover:bg-rose-900 border border-rose-900/50 px-2.5 py-1.5 rounded-lg text-rose-300 font-bold transition-all flex items-center gap-1 active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" /> {t('deleteUserBtn')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* BEAUTIFUL MODAL: SET EXPIRY DATE WITH CALENDAR */}
      {selectedUserForExpiry && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 relative text-left">
            <button 
              onClick={() => setSelectedUserForExpiry(null)}
              className="absolute top-4 right-4 text-slate-550 hover:text-white p-1.5 bg-slate-855 hover:bg-slate-800 border border-slate-800/80 rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Calendar className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">{t('setUserExpiryTitle')}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{t('userLabel')} {selectedUserForExpiry.username}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 my-2">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="expiry-modal-unlimited"
                  checked={isExpiryUnlimited}
                  onChange={(e) => setIsExpiryUnlimited(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-650 bg-slate-950 border-slate-750"
                />
                <label htmlFor="expiry-modal-unlimited" className="text-xs font-bold text-slate-350 select-none cursor-pointer">
                  {t('unlimitedExpiry')}
                </label>
              </div>

              {!isExpiryUnlimited && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('expiryDateLabel')}</label>
                  <input 
                    type="date"
                    value={newExpiryDateValue}
                    onChange={(e) => setNewExpiryDateValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-750 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-white outline-none font-mono text-sm"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-4 mt-1">
              <button
                type="button"
                onClick={() => setSelectedUserForExpiry(null)}
                className="py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-800 transition-all text-center active:scale-95"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isExpiryUnlimited) {
                    handleUpdateExpiry(selectedUserForExpiry._id, null);
                  } else {
                    if (!newExpiryDateValue) {
                      alert(t('expiryDateLabel'));
                      return;
                    }
                    handleUpdateExpiry(selectedUserForExpiry._id, newExpiryDateValue);
                  }
                  setSelectedUserForExpiry(null);
                }}
                className="py-2.5 bg-gradient-to-r from-indigo-650 to-violet-650 hover:from-indigo-550 hover:to-violet-550 text-white font-bold text-xs rounded-xl border border-indigo-500/40 transition-all text-center shadow-lg active:scale-95"
              >
                {t('saveSettingsBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BEAUTIFUL MODAL: PASSWORD RESET */}
      {selectedUserForPasswordReset && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 relative text-left animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Top gradient accent glow bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-500"></div>

            <button 
              onClick={() => {
                setSelectedUserForPasswordReset(null);
                setAdminNewPasswordInput('');
              }}
              className="absolute top-4 right-4 text-slate-555 hover:text-white p-1.5 bg-slate-855 hover:bg-slate-800 border border-slate-800/80 rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5 border-b border-slate-800/85 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">{t('resetUserPassTitle')}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{t('userLabel')} {selectedUserForPasswordReset.username}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('newPasswordLabel')}</label>
              <input 
                type="password"
                value={adminNewPasswordInput}
                onChange={(e) => setAdminNewPasswordInput(e.target.value)}
                placeholder="อย่างน้อย 4 ตัวอักษร"
                autoFocus
                className="w-full bg-slate-950 border border-slate-755 focus:border-amber-550 focus:ring-1 focus:ring-amber-550 rounded-xl px-4 py-2.5 text-white outline-none transition-all text-sm font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-4 mt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedUserForPasswordReset(null);
                  setAdminNewPasswordInput('');
                }}
                className="py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-800 transition-all text-center active:scale-95"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!adminNewPasswordInput) {
                    alert('กรุณากรอกรหัสผ่านใหม่');
                    return;
                  }
                  if (adminNewPasswordInput.length < 4) {
                    alert('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
                    return;
                  }
                  handleResetPassword(selectedUserForPasswordReset._id, adminNewPasswordInput);
                  setSelectedUserForPasswordReset(null);
                  setAdminNewPasswordInput('');
                }}
                className="py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs rounded-xl border border-amber-500/40 transition-all text-center shadow-lg active:scale-95"
              >
                {t('confirmPasswordChangeBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LobbyScreen({ roomId, setRoomId, onCreateRoom, onJoinRoom, error, user, onLogout, onOpenAdmin, onOpenDisplaySettings, onOpenHelp }) {
  const { lang, setLang } = useContext(LanguageContext);
  const t = (key: string, params?: Record<string, string | number>) => {
    let val = (translations[lang] as any)[key] || (translations['th'] as any)[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, String(v));
      });
    }
    return val;
  };

  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomViewMode, setRoomViewMode] = useState<'list' | 'grid'>('grid');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomIdInput, setNewRoomIdInput] = useState('');
  const [createModalError, setCreateModalError] = useState('');
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput) {
      setChangePasswordError(t('changePasswordErrorEmpty'));
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setChangePasswordError(t('changePasswordErrorMatch'));
      return;
    }
    if (newPasswordInput.length < 4) {
      setChangePasswordError(t('changePasswordErrorLength'));
      return;
    }
    
    setSubmittingPassword(true);
    setChangePasswordError('');
    setChangePasswordSuccess('');

    try {
      const targetUserId = user?.id || user?._id;
      if (!targetUserId) {
        setChangePasswordError(t('loginErrorEmpty'));
        setSubmittingPassword(false);
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/auth/users/${targetUserId}/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': '062026'
        },
        body: JSON.stringify({ password: newPasswordInput })
      });

      if (res.ok) {
        setChangePasswordSuccess(t('changePasswordSuccess'));
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        setTimeout(() => {
          setIsChangePasswordModalOpen(false);
          setChangePasswordSuccess('');
        }, 1500);
      } else {
        const data = await res.json();
        setChangePasswordError(data.error || t('changePasswordFail'));
      }
    } catch (err) {
      setChangePasswordError(t('changePasswordConnError'));
    }
    setSubmittingPassword(false);
  };


  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const usernameParam = user?.username ? `?username=${encodeURIComponent(user.username)}` : '';
      const res = await fetch(`${BACKEND_URL}/api/rooms${usernameParam}`);
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (e) {
      console.error('Error fetching rooms:', e);
    }
    setLoadingRooms(false);
  };

  useEffect(() => {
    fetchRooms();
  }, [user]);

  const handleDeleteRoom = async (e: React.MouseEvent, targetRoomId: string) => {
    e.stopPropagation();
    if (window.confirm(t('confirmDeleteRoom', { roomId: targetRoomId }))) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/rooms/${targetRoomId}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          fetchRooms();
        } else {
          alert(t('deleteRoomError'));
        }
      } catch (err) {
        console.error('Error deleting room:', err);
        alert(t('deleteRoomConnError'));
      }
    }
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newRoomIdInput.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!cleanId) {
      setCreateModalError(t('invalidRoomCode'));
      return;
    }
    onCreateRoom(cleanId);
    setIsCreateModalOpen(false);
    setNewRoomIdInput('');
    setCreateModalError('');
  };

  return (
    <div className="min-h-full bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Outer container expanded to max-w-6xl for full widescreen layout */}
      <div className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        
        {/* Decorative background gradients */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-600/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header Panel: Branding & Controls in single horizontal dashboard bar */}
        <div className="flex flex-col gap-4 pb-6 border-b border-slate-800/80 relative z-10">
          
          {/* Row 1: Logo & Branding (Left) and Buttons Row (Right) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Branding */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 flex items-center justify-center shadow-lg border border-indigo-500/20">
                <VolleyballIcon className="w-6 h-6 text-emerald-400 animate-[spin_12s_linear_infinite]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
                  {t('appTitle')} <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-md font-extrabold border border-amber-500/20 align-middle">{t('beta')}</span>
                </h1>
                <p className="text-[10px] text-slate-400">{t('systemDesc')}</p>
              </div>
            </div>

            {/* Right: Actions and Controls Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-nowrap shrink-0 max-w-full">
              {/* Language Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner mr-1 shrink-0 h-[38px]">
                <button 
                  onClick={() => setLang('th')} 
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all h-[30px] ${lang === 'th' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  TH
                </button>
                <button 
                  onClick={() => setLang('en')} 
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all h-[30px] ${lang === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  EN
                </button>
              </div>

              {/* Create Room Button (Call to action) */}
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs rounded-xl border border-indigo-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-indigo-600/20 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 text-emerald-300" />
                <span>{t('createRoom')}</span>
              </button>

              {/* Help Manual Button */}
              <button 
                onClick={onOpenHelp}
                className="py-2.5 px-3.5 bg-slate-850 hover:bg-slate-800 text-slate-200 font-bold rounded-xl border border-slate-800 transition-all flex items-center gap-1.5 active:scale-95 text-[11px] shadow-sm whitespace-nowrap shrink-0"
                title={t('helpTitle')}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('guideBtn')}</span>
              </button>

              {/* Admin Controls */}
              {(user?.username === 'vbdata01' || user?.username === 'vdata2026') && (
                <button 
                  onClick={onOpenAdmin}
                  className="py-2.5 px-3.5 bg-slate-850 hover:bg-slate-800 text-slate-200 font-bold rounded-xl border border-slate-800 transition-all flex items-center gap-1.5 active:scale-95 text-[11px] shadow-sm whitespace-nowrap shrink-0"
                  title={t('adminPanelTitle')}
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('manageSystem')}</span>
                </button>
              )}

              {/* Display & Font Settings */}
              <button 
                onClick={onOpenDisplaySettings}
                className="py-2.5 px-3.5 bg-slate-850 hover:bg-slate-800 text-slate-200 font-bold rounded-xl border border-slate-800 transition-all flex items-center gap-1.5 active:scale-95 text-[11px] shadow-sm whitespace-nowrap shrink-0"
                title={t('displaySettings')}
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('displaySettings')}</span>
              </button>

              {/* Change Password */}
              <button 
                onClick={() => setIsChangePasswordModalOpen(true)}
                className="py-2.5 px-3.5 bg-slate-850 hover:bg-slate-800 text-slate-200 font-bold rounded-xl border border-slate-800 transition-all flex items-center gap-1.5 active:scale-95 text-[11px] shadow-sm whitespace-nowrap shrink-0"
                title={t('changePasswordHeader')}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('changePassword')}</span>
              </button>

              {/* Logout (Moved to the very end) */}
              <button 
                onClick={onLogout}
                className="py-2.5 px-3.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/40 text-rose-300 font-bold rounded-xl transition-all text-[11px] active:scale-95 shadow-sm whitespace-nowrap shrink-0"
              >
                {t('logout')}
              </button>
            </div>
          </div>

          {/* Row 2: Profile Info Row (Displays under logo/buttons) */}
          <div className="w-full flex items-center justify-between sm:justify-start gap-4 sm:gap-6 bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2.5 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('userLabel')}</span>
              <span className="font-extrabold text-indigo-400 text-xs">{user?.username}</span>
            </div>
            <div className="w-px h-4 bg-slate-800"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('expiryLabel')}</span>
              <span className="font-semibold text-amber-400">
                {user?.expiresAt ? new Date(user.expiresAt).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US') : t('expiryPermanent')}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Active Rooms List (Takes Full Width) */}
        <div className="flex flex-col gap-4 relative z-10 flex-1">
          {/* Subheader with View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
              <label className="text-xs font-black text-slate-200 uppercase tracking-wider">
                {t('allRoomsTitle', { count: rooms.length })}
              </label>
            </div>
            
            <div className="flex items-center gap-3 justify-between sm:justify-end">
              {/* View Mode Toggle Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850 shadow-inner">
                <button 
                  onClick={() => setRoomViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg transition-all text-xs font-bold flex items-center gap-1.5 ${roomViewMode === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  title={t('listView')}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="text-[10px]">{t('listView')}</span>
                </button>
                <button 
                  onClick={() => setRoomViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg transition-all text-xs font-bold flex items-center gap-1.5 ${roomViewMode === 'grid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  title={t('gridView')}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="text-[10px]">{t('gridView')}</span>
                </button>
              </div>

              {/* Refresh Button */}
              <button 
                onClick={fetchRooms}
                className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-800 px-3 py-2 rounded-xl text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 transition-all active:scale-95"
                title={t('refreshBtn')}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
                <span>{t('refreshBtn')}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Rooms Scrollable View Box */}
          <div className="max-h-[480px] overflow-y-auto custom-scrollbar border border-slate-800 bg-slate-950/45 backdrop-blur-md rounded-2xl p-4 flex flex-col gap-3 min-h-[320px] flex-1">
            {loadingRooms && rooms.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-500 py-12 gap-3 my-auto">
                <RotateCcw className="w-6 h-6 animate-spin text-indigo-500" />
                <span>{t('loadingRooms')}</span>
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-500 py-12 text-center my-auto">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-600 mb-3 shadow-inner">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <span className="font-bold text-slate-400">{t('noActiveRooms')}</span>
                <span className="text-[10px] text-slate-650 mt-1">{t('clickCreateRoomDesc')}</span>
              </div>
            ) : roomViewMode === 'grid' ? (
              /* GRID VIEW MODE - Wide and spacious dashboard */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {rooms.map((room) => {
                  const homeName = room.teamNames?.home || 'HOME';
                  const awayName = room.teamNames?.away || 'AWAY';
                  const scoreHome = room.score?.home ?? 0;
                  const scoreAway = room.score?.away ?? 0;
                  const scoreSet = room.score?.set ?? 1;
                  const formattedDate = room.updatedAt 
                    ? new Date(room.updatedAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
                    : '-';

                  return (
                    <div 
                      key={room.roomId}
                      onClick={() => onJoinRoom(room.roomId)}
                      className="flex flex-col justify-between p-5 bg-slate-900/90 hover:bg-indigo-950/20 border border-slate-800 hover:border-indigo-500/40 rounded-2xl transition-all duration-300 cursor-pointer group shadow-lg hover:shadow-indigo-950/30 text-left relative overflow-hidden"
                    >
                      {/* Card Glow Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                      {/* Header */}
                      <div className="flex justify-between items-center mb-4 gap-2 border-b border-slate-800/80 pb-2.5 relative z-10">
                        <span className="font-mono font-black text-sm text-white uppercase group-hover:text-indigo-400 transition-colors truncate">
                          {room.roomId}
                        </span>
                        {room.status === 'finished' ? (
                          <span className="text-[9px] bg-slate-800/90 text-slate-400 px-2 py-0.5 rounded-md leading-none border border-slate-700 font-bold uppercase shrink-0">
                            FINISHED
                          </span>
                        ) : (
                          <span className="text-[9px] bg-emerald-950/90 text-emerald-400 px-2 py-0.5 rounded-md leading-none border border-emerald-800/60 font-bold uppercase animate-pulse shrink-0 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            LIVE
                          </span>
                        )}
                      </div>

                      {/* Scoreboard block */}
                      <div className="flex flex-col gap-3 mb-4 relative z-10">
                        <div className="flex items-center justify-between text-xs font-black px-1">
                          <div className="flex flex-col min-w-0 max-w-[42%]">
                            <span className="text-indigo-400 truncate text-xs">{homeName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-850 px-3 py-1.5 rounded-xl font-mono text-[11px] font-black text-white shrink-0 shadow-inner">
                            <span className="text-indigo-400">{scoreHome}</span>
                            <span className="text-slate-650">:</span>
                            <span className="text-rose-400">{scoreAway}</span>
                          </div>
                          <div className="flex flex-col items-end min-w-0 max-w-[42%] text-right">
                            <span className="text-rose-400 truncate text-xs">{awayName}</span>
                          </div>
                        </div>
                        
                        <div className="text-[9px] text-slate-400 font-semibold font-mono text-center bg-slate-950/40 py-1.5 rounded-lg border border-slate-900 shadow-inner">
                          {lang === 'th' ? `เซต ${scoreSet} กำลังแข่ง` : `Set ${scoreSet} in progress`}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex justify-between items-center border-t border-slate-800/40 pt-3 text-[9px] text-slate-500 font-mono mt-auto relative z-10">
                        <span>{t('updatedPrefix')} {formattedDate}</span>
                        
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={(e) => handleDeleteRoom(e, room.roomId)}
                            className="p-1.5 bg-slate-800/80 hover:bg-rose-950 text-slate-500 hover:text-rose-400 border border-slate-705/50 hover:border-rose-900 rounded-lg transition-all duration-200 active:scale-90"
                            title={lang === 'th' ? "ลบห้องสถิตินี้" : "Delete match room"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => onJoinRoom(room.roomId)}
                            className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500 rounded-lg transition-all duration-200 active:scale-90"
                            title={lang === 'th' ? "เข้าร่วมแมตช์" : "Join match"}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW MODE - Widescreen Table-style rows */
              <div className="flex flex-col gap-2">
                {rooms.map((room) => {
                  const homeName = room.teamNames?.home || 'HOME';
                  const awayName = room.teamNames?.away || 'AWAY';
                  const scoreHome = room.score?.home ?? 0;
                  const scoreAway = room.score?.away ?? 0;
                  const scoreSet = room.score?.set ?? 1;
                  const formattedDate = room.updatedAt 
                    ? new Date(room.updatedAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
                    : '-';

                  return (
                    <div 
                      key={room.roomId}
                      onClick={() => onJoinRoom(room.roomId)}
                      className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-4 bg-slate-900/85 hover:bg-indigo-950/20 border border-slate-800 hover:border-indigo-500/40 rounded-2xl transition-all cursor-pointer group shadow-sm relative overflow-hidden"
                    >
                      {/* Left Block: Room ID & Live/Finished Status */}
                      <div className="flex items-center gap-3 min-w-0 sm:w-[22%]">
                        <span className="font-mono font-black text-sm text-white uppercase group-hover:text-indigo-400 transition-colors truncate">
                          {room.roomId}
                        </span>
                        {room.status === 'finished' ? (
                          <span className="text-[8px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded leading-none border border-slate-700 font-bold uppercase shrink-0">
                            FINISHED
                          </span>
                        ) : (
                          <span className="text-[8px] bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded leading-none border border-emerald-800/60 font-bold uppercase animate-pulse shrink-0">
                            LIVE
                          </span>
                        )}
                      </div>

                      {/* Middle Block: Teams and live match stats scoreboard */}
                      <div className="flex items-center gap-3 text-xs text-slate-350 font-bold min-w-0 sm:w-[48%] bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-900 shadow-inner">
                        <span className="text-indigo-400 font-extrabold truncate max-w-[38%]">{homeName}</span>
                        <div className="flex items-center gap-1.5 font-mono text-[10px] font-black text-white shrink-0 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800/80">
                          <span className="text-indigo-400">{scoreHome}</span>
                          <span className="text-slate-655">:</span>
                          <span className="text-rose-400">{scoreAway}</span>
                        </div>
                        <span className="text-rose-400 font-extrabold truncate max-w-[38%]">{awayName}</span>
                        <span className="text-[9px] text-slate-550 font-semibold font-mono ml-auto">
                          {lang === 'th' ? `เซต ${scoreSet}` : `Set ${scoreSet}`}
                        </span>
                      </div>

                      {/* Right Block: Updated time & Delete buttons */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:w-[25%] shrink-0">
                        <span className="text-[8.5px] text-slate-550 font-mono">
                          {t('updatedPrefix')} {formattedDate}
                        </span>
                        
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={(e) => handleDeleteRoom(e, room.roomId)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-550 hover:text-rose-400 border border-slate-705/50 hover:border-rose-900 rounded-lg transition-all active:scale-90"
                            title={lang === 'th' ? "ลบห้องสถิตินี้" : "Delete match room"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] font-bold text-slate-400 group-hover:text-indigo-455 transition-colors hidden lg:inline-block">
                            {t('joinRoomBtn')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PREMIUM HIGH-END CUSTOM CREATION POPUP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 text-left animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative flex flex-col gap-4 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Top gradient accent glow bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            {/* Decorative soft purple background glow sphere */}
            <div className="absolute -top-20 -left-20 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Close button */}
            <button 
              onClick={() => {
                setIsCreateModalOpen(false);
                setNewRoomIdInput('');
                setCreateModalError('');
              }}
              className="absolute top-4 right-4 text-slate-550 hover:text-white p-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800/80 rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Title Block */}
            <div className="flex items-center gap-3.5 border-b border-slate-800/85 pb-4 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <VolleyballIcon className="w-5 h-5 text-emerald-400 animate-[spin_15s_linear_infinite]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">{t('createRoomHeader')}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{lang === 'th' ? 'ระบุชื่อย่อหรือโค้ดการแข่งสำหรับการประมวลผลสถิติ' : 'Enter match abbreviation/code for stats processing'}</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleModalSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-0.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {t('roomCodeLabel')}
                  </label>
                  <button 
                    type="button"
                    onClick={() => {
                      const randNum = Math.floor(1000 + Math.random() * 9000);
                      const today = new Date();
                      const dayStr = today.getDate().toString().padStart(2, '0');
                      const monthStr = (today.getMonth() + 1).toString().padStart(2, '0');
                      setNewRoomIdInput(`ROOM-${dayStr}${monthStr}-${randNum}`);
                      setCreateModalError('');
                    }}
                    className="text-[9.5px] text-indigo-400 hover:text-indigo-300 font-bold tracking-wide transition-colors flex items-center gap-1 bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-lg hover:border-indigo-500/40"
                  >
                    <span>🎲 {lang === 'th' ? 'สุ่มรหัสห้อง' : 'Random Room Code'}</span>
                  </button>
                </div>
                
                <input 
                  type="text"
                  value={newRoomIdInput}
                  onChange={(e) => {
                    setNewRoomIdInput(e.target.value);
                    if (createModalError) setCreateModalError('');
                  }}
                  placeholder={lang === 'th' ? "ตัวอย่าง: THA-JPN-2026" : "e.g. THA-JPN-2026"}
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-750 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-white text-sm font-mono font-black tracking-widest outline-none transition-all uppercase text-center shadow-inner"
                />
                
                <div className="flex items-start gap-1 text-[9.5px] text-slate-500 leading-normal bg-slate-950/40 p-2.5 rounded-xl border border-slate-850/65">
                  <span className="text-amber-500 shrink-0 font-bold">{lang === 'th' ? 'ℹ️ ข้อแนะนำ:' : 'ℹ️ Hint:'}</span>
                  <span>{t('roomCodeHint')}</span>
                </div>
              </div>

              {createModalError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createModalError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-2 border-t border-slate-800/80 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setNewRoomIdInput('');
                    setCreateModalError('');
                  }}
                  className="py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-800 transition-all text-center active:scale-95"
                >
                  {t('cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="py-2.5 bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-550 hover:to-purple-550 text-white font-bold text-xs rounded-xl border border-indigo-500/40 transition-all text-center shadow-lg shadow-indigo-600/15 active:scale-95"
                >
                  {lang === 'th' ? 'ยืนยันสร้างห้อง' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREMIUM CHANGE PASSWORD POPUP MODAL */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 text-left animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative flex flex-col gap-4 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Top gradient accent glow bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-500"></div>
            
            {/* Decorative background glow sphere */}
            <div className="absolute -top-20 -left-20 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Close button */}
            <button 
              onClick={() => {
                setIsChangePasswordModalOpen(false);
                setNewPasswordInput('');
                setConfirmPasswordInput('');
                setChangePasswordError('');
                setChangePasswordSuccess('');
              }}
              className="absolute top-4 right-4 text-slate-550 hover:text-white p-1.5 bg-slate-855 hover:bg-slate-800 border border-slate-800/80 rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Title Block */}
            <div className="flex items-center gap-3.5 border-b border-slate-800/85 pb-4 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">{t('changePasswordHeader')}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{lang === 'th' ? 'ตั้งรหัสผ่านใหม่เพื่อความปลอดภัยของบัญชีผู้ใช้' : 'Set a new password for account security'}</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleChangePasswordSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                
                {/* New Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {t('newPasswordLabel')}
                  </label>
                  <input 
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => {
                      setNewPasswordInput(e.target.value);
                      if (changePasswordError) setChangePasswordError('');
                    }}
                    placeholder={t('newPasswordPlaceholder')}
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-750 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all"
                  />
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {t('confirmPasswordLabel')}
                  </label>
                  <input 
                    type="password"
                    value={confirmPasswordInput}
                    onChange={(e) => {
                      setConfirmPasswordInput(e.target.value);
                      if (changePasswordError) setChangePasswordError('');
                    }}
                    placeholder={t('confirmPasswordPlaceholder')}
                    className="w-full bg-slate-950 border border-slate-750 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {changePasswordError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{changePasswordError}</span>
                </div>
              )}

              {changePasswordSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{changePasswordSuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-2 border-t border-slate-800/80 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePasswordModalOpen(false);
                    setNewPasswordInput('');
                    setConfirmPasswordInput('');
                    setChangePasswordError('');
                    setChangePasswordSuccess('');
                  }}
                  className="py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-800 transition-all text-center active:scale-95"
                  disabled={submittingPassword}
                >
                  {t('cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs rounded-xl border border-amber-500/30 transition-all text-center shadow-lg shadow-amber-600/15 active:scale-95"
                  disabled={submittingPassword}
                >
                  {submittingPassword ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...') : t('confirmChangePasswordBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



function HelpGuideModal({ onClose }) {
  const { lang } = useContext(LanguageContext);
  const t = (key: string) => (translations[lang] as any)[key] || (translations['th'] as any)[key] || key;

  const [activeTab, setActiveTab] = useState('scout');

  const tabs = [
    { id: 'scout', label: t('tabScout') },
    { id: 'rally', label: t('tabRally') },
    { id: 'manage', label: t('tabManage') },
    { id: 'coach', label: t('tabCoach') },
    { id: 'system', label: t('tabSystem') },
  ];

  const handleExportGuidePDF = () => {
    const isEn = lang === 'en';
    const guideContent = `
      <html>
      <head>
        <title>V Project - ${isEn ? 'Complete Operational Guide (Official Manual)' : 'คู่มือปฏิบัติงานฉบับสมบูรณ์ (Official Manual)'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Sarabun:wght@400;500;700;800&display=swap');
          body { font-family: 'Sarabun', 'Inter', Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; background: #f8fafc; }
          .header { border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 40px; }
          .title { font-size: 26px; font-weight: 900; color: #1e1b4b; }
          .subtitle { font-size: 14px; color: #4f46e5; font-weight: 700; margin-top: 5px; text-transform: uppercase; }
          .section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .section-title { font-size: 18px; font-weight: 800; color: #4f46e5; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 15px; }
          .sub-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
          .sub-title { font-size: 13px; font-weight: 800; color: #b45309; text-transform: uppercase; margin-bottom: 8px; }
          ul, ol { padding-left: 20px; font-size: 13px; color: #475569; }
          li { margin-bottom: 8px; }
          strong { color: #0f172a; }
          .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          
          @media print {
            .no-print { display: none !important; }
            body { padding: 20px; background: #ffffff; }
          }
          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: #f8fafc;
            padding: 14px 20px;
            border-radius: 12px;
            margin-bottom: 30px;
            gap: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            border: 1px solid #334155;
            font-family: 'Sarabun', 'Inter', Arial, sans-serif;
          }
          .print-tip {
            font-size: 13px;
            font-weight: 500;
            color: #cbd5e1;
          }
          .print-btn {
            background: #4f46e5;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .print-btn:hover {
            background: #4338ca;
          }
        </style>
      </head>
      <body>
        <div class="no-print print-header">
          <span class="print-tip">${isEn ? '💡 Tip: You can print or save this guide as PDF by clicking the print button on the right, or press Ctrl+P / Cmd+P' : '💡 คำแนะนำ: คุณสามารถพิมพ์หรือบันทึกคู่มือนี้เป็น PDF ได้โดยกดปุ่มพิมพ์ด้านขวา หรือกด Ctrl+P / Cmd+P'}</span>
          <button onclick="window.print()" class="print-btn">${isEn ? 'Print / Save as PDF' : 'พิมพ์ / บันทึกเป็น PDF'}</button>
        </div>

        <div class="header">
          <div class="title">${isEn ? 'Complete Operational Guide (VolleyData Pro)' : 'คู่มือปฏิบัติงานฉบับสมบูรณ์ (VolleyData Pro)'}</div>
          <div class="subtitle">Official Operational & Technical Guide</div>
        </div>

        ${isEn ? `
        <div class="section">
          <div class="section-title">1. 3-Step Action Keying Process</div>
          <p style="font-size: 13px; color: #475569;">Statistics logging is designed to be quick and structured for real-time match tracking:</p>
          <div class="sub-section">
            <div class="sub-title">1️⃣ Select Player Source</div>
            <ul>
              <li>Tap the player position in our court (<strong>OWN COURT</strong>) or tap the player number panel on the right.</li>
              <li>Player number buttons automatically rotate according to their actual rotation positions in court.</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">2️⃣ Select Executed Skill</div>
            <ul>
              <li>Select a skill: <strong>Serve (S), Reception (R), Set (E), Attack (A), Block (B), or Dig (D)</strong>.</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">🎯 Define Target Zone</div>
            <ul>
              <li>For Attack (A) or Serve (S) skills, tap a zone (1 to 6) in the opponent court (<strong>OPPONENT COURT</strong>) to log target location.</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">3️⃣ Select Evaluation Grade</div>
            <ul>
              <li><strong># (Perfect / Point)</strong>: Perfect play or direct point.</li>
              <li><strong>+ (Good)</strong>: Good play, team keeps advantage.</li>
              <li><strong>! (Okay)</strong>: Normal play / Okay.</li>
              <li><strong>- (Poor)</strong>: Poor play, team at disadvantage.</li>
              <li><strong>/ (Blocked)</strong>: Attack blocked by opponent.</li>
              <li><strong>= (Error / Fault)</strong>: Direct error or technical fault.</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">📱 Mobile Portrait Layout (Optimized)</div>
            <ul>
              <li>To prevent vertical layout overlapping on very small screens, the mock court is hidden by default.</li>
              <li>You can toggle the mock court visibility by checking the <strong>"COURT"</strong> checkbox in the control bar.</li>
              <li>In the <strong>Logs</strong> tab, only the last logged event row is displayed to save vertical space; previous logs are safely stored and can still be undone using the <strong>Undo</strong> button.</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="section-title">2. Rally Management, Score Commitment, and Undo</div>
          <div class="sub-section">
            <div class="sub-title">🏁 Commit Rally Score</div>
            <ul>
              <li>When the ball is dead, press <strong>"Commit Rally: HOME Won Point"</strong> or <strong>"AWAY Won Point"</strong>.</li>
              <li>The system commits score, updates the cloud database, and <strong>automatically rotates player positions on Side-out</strong>.</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">🔄 Smart Undo Function</div>
            <ul>
              <li><strong>During Rally:</strong> Press undo to delete the last action in the current rally chain to correct a typo.</li>
              <li><strong>After Committing Rally:</strong> Press undo to revert score, restore the previous rotation state, and retrieve the last rally actions for editing.</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="section-title">3. Substitutions, Technical Fouls, Timeouts, and Sets</div>
          <div class="sub-section">
            <div class="sub-title">🔄 Substitutions</div>
            <ul>
              <li>Press the substitution button, select the active player (yellow card), then select the sub player (purple card), and confirm.</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">🛑 Technical Fault</div>
            <ul>
              <li>If the team commits a fault (net touch, double contact, rotational fault, etc.), select the fault type. <strong>This immediately awards 1 point to the opponent</strong>.</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">⏱️ Timeouts</div>
            <ul>
              <li>Log team timeouts (limited to 2 per set). Timeout quotas automatically reset on set transition.</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">🏆 End Set & End Match</div>
            <ul>
              <li><strong>End Set</strong>: Save set stats. Scores reset to 0-0 for the next set.</li>
              <li><strong>End Match</strong>: Commit final victory/loss, save data, and change room status to finished.</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="section-title">4. Coach Technical Dashboard & PDF Report</div>
          <div class="sub-section">
            <div class="sub-title">📊 Coach Dashboard Analysis</div>
            <ul>
              <li><strong>Summary</strong>: Efficiency stats (% perfect/errors) for each skill and starting rosters.</li>
              <li><strong>Heatmap</strong>: Visual attack success/fail heatmap mapped across 6 zones.</li>
              <li><strong>Rotation</strong>: Analytical summary for each setter rotation (R1 to R6).</li>
              <li><strong>Logs</strong>: Real-time event log timeline.</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">📥 Export PDF Summary Report</div>
            <ul>
              <li>Press <strong>"PDF"</strong> on the app header to generate a beautiful, print-ready summaries including volleyball court graphics and rotation summaries.</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="section-title">5. Room Control & User Management</div>
          <div class="sub-section">
            <div class="sub-title">🔒 Room Ownership & Privacy</div>
            <ul>
              <li>Users only see match rooms they created. Admins can view and manage all rooms in the system.</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">⚙️ Admin User Management</div>
            <ul>
              <li>Admins can toggle admin privileges, modify account expiry dates (calendar datepicker), or reset user passwords.</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">📐 Scale Control</div>
            <ul>
              <li>Click <strong>"Scale" (Sliders icon)</strong> on the header to scale logging panel font size and elements for tablets/phones.</li>
            </ul>
          </div>
        </div>
        ` : `
        <div class="section">
          <div class="section-title">1. ขั้นตอนการบันทึกสถิติ 3 สเต็ป (3-Step Keying)</div>
          <p style="font-size: 13px; color: #475569;">การบันทึกสถิติถูกออกแบบมาให้รวดเร็วและกระชับหน้างานจริงในสนาม เพื่อความแม่นยำสูงสุด:</p>
          <div class="sub-section">
            <div class="sub-title">1️⃣ เลือกระบุตัวผู้เล่น (Player Source)</div>
            <ul>
              <li>แตะที่ตำแหน่งตัวผู้เล่นในคอร์ทจำลองฝั่งเรา (<strong>OWN COURT</strong>) หรือแตะที่แผงปุ่มเบอร์ผู้เล่นทางขวา</li>
              <li>ปุ่มเบอร์ผู้เล่นจะอ้างอิงและหมุนตามตำแหน่งการยืนจริงในสนามโดยอัตโนมัติ ช่วยลดความจำสับสน</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">2️⃣ เลือกทักษะที่กระทำ (Skill Selection)</div>
            <ul>
              <li>เลือกทักษะ เช่น <strong>เสิร์ฟ (S), รับเสิร์ฟ (R), เซต (E), ตบ/โจมตี (A), บล็อก (B), หรือ รับตบ (D)</strong></li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">🎯 กำหนดโซนเป้าหมาย (End Zone Target)</div>
            <ul>
              <li>สำหรับทักษะบุก (Attack) หรือเสิร์ฟ (Serve) ให้เลือกโซนตกบนคอร์ทฝั่งตรงข้าม (<strong>OPPONENT COURT</strong>) โดยแบ่งเป็นโซน 1 ถึง 6 เพื่อวิเคราะห์ทิศทางและจุดโจมตี</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">3️⃣ ให้เกรดผลลัพธ์การเล่น (Evaluation Grade)</div>
            <ul>
              <li><strong># (Perfect / Point)</strong>: ได้แต้ม หรือการเล่นที่สมบูรณ์</li>
              <li><strong>+ (Good)</strong>: เล่นได้ดี ฝั่งเราสามารถบุกต่อได้ง่าย</li>
              <li><strong>! (Okay)</strong>: พอใช้ ทั่วไป</li>
              <li><strong>- (Poor)</strong>: ผิดพลาดเล็กน้อย หรือทำทีมเสียเปรียบ</li>
              <li><strong>/ (Blocked)</strong>: บุกโดนบล็อกกลับมา</li>
              <li><strong>= (Error / Fault)</strong>: เสียแต้มโดยตรง หรือทำฟาล์วเทคนิค</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">📱 รูปแบบหน้าจอจอมือถือแนวตั้ง (Mobile Portrait Layout)</div>
            <ul>
              <li>เพื่อป้องกันการแสดงผลซ้อนทับกันในอุปกรณ์จอเล็ก ระบบจะซ่อนสนามจำลองโดยอัตโนมัติเป็นค่าเริ่มต้น</li>
              <li>ท่านสามารถเลือกเปิดหรือปิดการแสดงสนามจำลองได้ด้วยการติ๊กถูกที่ช่อง <strong>"แสดงสนาม"</strong> ในแถบด้านบน</li>
              <li>ในแท็บ <strong>Logs</strong> บนมือถือแนวตั้งจะแสดงผลเฉพาะเหตุการณ์สถิติล่าสุดเพียงรายการเดียวเพื่อความกระชับ โดยที่รายการเก่าทั้งหมดยังถูกบันทึกไว้อย่างปลอดภัยและสามารถกดปุ่ม <strong>ย้อนกลับ (Undo)</strong> เพื่อลบออกได้</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="section-title">2. การจัดการแรลลี่, การบันทึกแต้ม และปุ่มย้อนกลับ</div>
          <div class="sub-section">
            <div class="sub-title">🏁 การบันทึกแต้มจบแรลลี่ (Commit Rally)</div>
            <ul>
              <li>เมื่อเกิดลูกตาย ให้กดปุ่ม <strong>"จบแรลลี่: HOME ได้แต้ม"</strong> หรือ <strong>"AWAY ได้แต้ม"</strong></li>
              <li>ระบบจะทำการบวกคะแนน ส่งประวัติเหตุการณ์เข้าฐานข้อมูล และ<strong>หมุนตำแหน่งตำแหน่งตัวผู้เล่นในสนาม (Rotate) โดยอัตโนมัติเมื่อมีการ Side-out</strong></li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">🔄 การย้อนกลับสถิติ (Smart Undo)</div>
            <ul>
              <li><strong>ระหว่างจดแรลลี่:</strong> กดปุ่มย้อนกลับเพื่อลบประวัติเหตุการณ์ตัวล่าสุดในแรลลี่ปัจจุบัน เพื่อแก้ตัวคีย์ใหม่</li>
              <li><strong>หลังจบแรลลี่:</strong> กดปุ่มย้อนกลับเพื่อถอยคะแนน คืนสภาพตำแหน่งหมุนก่อนหน้า และดึงข้อมูลแรลลี่ชุดล่าสุดกลับมาแก้ไขให้ถูกต้อง</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="section-title">3. การเปลี่ยนตัว, ปุ่มฟาล์ว, ขอนอกเวลา และการจบเซต/แมตช์</div>
          <div class="sub-section">
            <div class="sub-title">🔄 เปลี่ยนตัวผู้เล่น (Substitution)</div>
            <ul>
              <li>กดปุ่มเปลี่ยนตัว เลือกผู้เล่นในสนาม (สีเหลือง) จากนั้นเลือกผู้เล่นสำรองที่จะเปลี่ยนลงไปแทน (สีม่วง) และกดยืนยัน</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">🛑 ปุ่มบันทึกฟาล์ว (Technical Fault)</div>
            <ul>
              <li>เมื่อทีมเราทำฟาล์ว (เน็ต, ดับเบิ้ลคอนแทกต์, ยืนตำแหน่งผิด) ให้เลือกประเภทฟาล์ว <strong>ระบบจะบวกแต้มให้คู่แข่ง 1 คะแนนทันที</strong></li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">⏱️ ปุ่มขอนอกเวลา (Timeout Control)</div>
            <ul>
              <li>กดขอนอกเวลาได้จำกัด 2 ครั้งต่อทีมในแต่ละเซต เมื่อเริ่มเซตถัดไป โควตาจะถูกรีเซ็ตกลับเป็น 0/2 ครั้งอัตโนมัติ</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">🏆 จบเซต / จบการแข่งขัน (Set & Match Actions)</div>
            <ul>
              <li><strong>จบเซต (End Set)</strong>: กดบันทึกเพื่อบันทึกสถิติเซตนั้นๆ คะแนนจะถูกสลับและล้างกลับไปเป็น 0-0 ในเซตถัดไป</li>
              <li><strong>จบการแข่งขัน (End Match)</strong>: กดปุ่มเมื่อการแข่งขันเสร็จสิ้น เพื่อบันทึกผลแพ้ชนะอย่างถาวรและเปลี่ยนสถานะห้องเป็นจบแล้ว</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="section-title">4. แดชบอร์ดวิเคราะห์ทางเทคนิคของโค้ช & การดาวน์โหลด PDF</div>
          <div class="sub-section">
            <div class="sub-title">📊 รายการวิเคราะห์ใน Coach Dashboard</div>
            <ul>
              <li><strong>Summary</strong>: สถิติ %ดี/เสีย ของแต่ละทักษะ พร้อมรูปแบบการยืนจริง</li>
              <li><strong>Heatmap</strong>: แสดงแผนผังความสำเร็จ/ล้มเหลวของการโจมตีลงบนคอร์ทจำลองทั้ง 6 โซน</li>
              <li><strong>Rotation</strong>: วิเคราะห์ประสิทธิภาพหน้าเซต (การหมุนยืนของตัวเซต R1-R6)</li>
              <li><strong>Logs</strong>: ประวัติการคีย์เหตุการณ์แบบเรียลไทม์</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">📥 การดาวน์โหลดไฟล์ PDF / HTML Summary Report</div>
            <ul>
              <li>กดปุ่ม <strong>"PDF"</strong> บริเวณส่วนหัวเพื่อบันทึกสรุปผลสถิติเป็นเอกสารออฟไลน์สวยงาม แสดงภาพกราฟิกคอร์ทวอลเลย์บอลและทิศทางการบุกและตำแหน่งหน้าเซตอย่างครบถ้วน</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="section-title">5. ระบบห้องและการจัดการผู้ใช้ (Room & Accounts)</div>
          <div class="sub-section">
            <div class="sub-title">🔒 สิทธิ์ผู้สร้างห้อง (Room Creator Visibility)</div>
            <ul>
              <li>ผู้ใช้จะเห็นห้องเฉพาะที่ตนเองเป็นเจ้าของเท่านั้นเพื่อความปลอดภัยของข้อมูล แอดมินสามารถดูและแก้ไขห้องทั้งหมดได้</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">⚙️ แผงจัดการผู้ใช้ (Admin User Panel)</div>
            <ul>
              <li>แอดมินสามารถเปิดแผงตั้งค่าเพื่อระบุสิทธิ์แอดมิน, กำหนดวันหมดอายุบัญชี (Calendar Datepicker) หรือรีเซ็ตรหัสผ่านของผู้ใช้งานผ่านป๊อปอัปดีไซน์สวยงามได้</li>
            </ul>
          </div>
          <div class="sub-section">
            <div class="sub-title">📐 การปรับขนาดหน้าจอ (Scale Control)</div>
            <ul>
              <li>กดปุ่ม <strong>"ปรับขนาด" (Sliders)</strong> บนทาสก์บาร์เพื่อปรับสเกลขนาดแผงจดบันทึกให้เหมาะสมกับขนาดจอแสดงผลของท่าน</li>
            </ul>
          </div>
        </div>
        `}

        <div class="footer">
          ${isEn ? 'This manual is automatically generated by VolleyData Pro Complete Guide Engine.' : 'เอกสารนี้จัดทำโดยอัตโนมัติผ่านระบบ VolleyData Pro Complete Guide Engine.'}
        </div>
      </body>
      </html>
    `;

    try {
      const blob = new Blob([guideContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (newWindow) {
        newWindow.focus();
      } else {
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error('Failed to export guide:', error);
      alert(lang === 'en' ? 'Unable to export the guide right now.' : 'ไม่สามารถส่งออกคู่มือได้ในขณะนี้');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl my-4 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-slate-800 shrink-0 bg-slate-950/80">
          <h2 className="text-xs sm:text-sm font-extrabold flex items-center gap-2 text-amber-500">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>{t('helpTitle')}</span>
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportGuidePDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] rounded-lg shadow transition-all active:scale-95 border border-indigo-500"
            >
              <Download className="w-3 h-3 text-indigo-200" />
              <span>{t('downloadHelpBtn')}</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors">
              <X className="w-4 h-4"/>
            </button>
          </div>
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
            lang === 'en' ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> 3-Step Action Keying Process
                </h3>
                <p className="text-slate-400 leading-relaxed text-[11px] sm:text-xs">
                  Statistics logging is designed to be quick and structured for real-time match tracking:
                </p>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 gap-2 mt-2 text-[11px] sm:text-xs">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-amber-400 font-black block mb-1">1️⃣ Select Player Source</span>
                      Tap the player position in our court (<strong>OWN COURT</strong>) or tap the player number panel on the right (number buttons automatically rotate to match the active court rotation).
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-amber-400 font-black block mb-1">2️⃣ Select Executed Skill</span>
                      Tap the played skill, e.g., <strong>Serve (S), Reception (R), Set (E), Attack (A), Block (B), or Dig (D)</strong>.
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-amber-400 font-black block mb-1">🎯 (Optional) Define Target Zone</span>
                      For Attack (A) or Serve (S) skills, tap a zone (1 to 6) in the opponent court (<strong>OPPONENT COURT</strong>) to log target location.
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-emerald-400 font-black block mb-1">3️⃣ Select Evaluation Grade</span>
                      Tap the evaluation grade:
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-400">
                        <li><strong># (Perfect / Point)</strong>: Perfect play or direct point.</li>
                        <li><strong>+ (Good)</strong>: Good play, team keeps advantage.</li>
                        <li><strong>! (Okay)</strong>: Normal play / Okay.</li>
                        <li><strong>- (Poor)</strong>: Poor play, team at disadvantage.</li>
                        <li><strong>/ (Blocked)</strong>: Attack blocked by opponent.</li>
                        <li><strong>= (Error / Fault)</strong>: Direct error or technical fault.</li>
                      </ul>
                      <span className="text-[10px] text-slate-500 font-bold block mt-2">* Tapping the grade immediately adds the stat to the current rally.</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> ขั้นตอนการบันทึกสถิติ 3 สเต็ป (3-Step Keying)
                </h3>
                <p className="text-slate-400 leading-relaxed text-[11px] sm:text-xs">
                  การบันทึกสถิติออกแบบมาให้รวดเร็วและเป็นลำดับที่แน่นอน เพื่อความกระชับในการบันทึกข้อมูลหน้างานจริงในสนาม:
                </p>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 gap-2 mt-2 text-[11px] sm:text-xs">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-amber-400 font-black block mb-1">1️⃣ เลือกระบุตัวผู้เล่น (Player Source)</span>
                      แตะที่ตำแหน่งผู้เล่นในคอร์ทจำลองฝั่งเรา (<strong>OWN COURT</strong>) หรือแตะแผงหมายเลขผู้เล่นด้านขวา (ปุ่มหมายเลขจะอ้างอิงและหมุนตามตำแหน่งการยืนจริงในสนามโดยอัตโนมัติ)
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-amber-400 font-black block mb-1">2️⃣ เลือกทักษะที่กระทำ (Skill Selection)</span>
                      แตะเลือกทักษะที่เล่น เช่น <strong>เสิร์ฟ (S), รับเสิร์ฟ (R), เซต (E), ตบ/โจมตี (A), บล็อก (B), หรือ รับตบ (D)</strong>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-amber-400 font-black block mb-1">🎯 (ทางเลือก) กำหนดโซนเป้าหมาย (End Zone Target)</span>
                      หากเป็นทักษะบุก (Attack) หรือทักษะเสิร์ฟ (Serve) จะมีแผงคอร์ทฝั่งตรงข้าม (<strong>OPPONENT COURT</strong>) แสดงขึ้นมา ให้เลือกโซน (R1 - R6) ที่ลูกตกลงไป เพื่อเก็บสถิติประสิทธิภาพตามโซน
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-emerald-400 font-black block mb-1">3️⃣ ให้เกรดผลลัพธ์การเล่น (Evaluation Grade)</span>
                      แตะระดับคะแนนผลงาน:
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-400">
                        <li><strong># (Perfect / Point)</strong>: ได้แต้ม หรือการเล่นสมบูรณ์แบบ</li>
                        <li><strong>+ (Good)</strong>: เล่นได้ดี ฝั่งเราสามารถบุกต่อได้ง่าย</li>
                        <li><strong>! (Okay)</strong>: พอใช้ ทั่วไป</li>
                        <li><strong>- (Poor)</strong>: ผิดพลาดเล็กน้อย หรือเสียเปรียบ</li>
                        <li><strong>/ (Blocked)</strong>: ถูกบล็อกกลับมา</li>
                        <li><strong>= (Error / Fault)</strong>: เสียแต้มโดยตรง หรือทำฟาล์ว</li>
                      </ul>
                      <span className="text-[10px] text-slate-500 font-bold block mt-2">* เมื่อกดระดับผลลัพธ์ สถิติจะถูกเพิ่มเข้าสู่แรลลี่แต้มปัจจุบันทันที</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* TAB 2: RALLY CHAIN & UNDO */}
          {activeTab === 'rally' && (
            lang === 'en' ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Rally Chains, Score Commitment & Undo
                </h3>
                
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                    <h4 className="text-blue-400 font-black text-xs sm:text-sm mb-1">🏁 Commit Rally Score:</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      When the ball is dead, press <strong>"Commit Rally: HOME Won Point"</strong> or <strong>"AWAY Won Point"</strong>.<br/>
                      The system commits score, updates cloud database, and <strong>automatically rotates player positions on Side-out</strong>.
                    </p>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                    <h4 className="text-rose-400 font-black text-xs sm:text-sm mb-1 flex items-center gap-1">
                      <Undo2 className="w-4 h-4" /> Smart Undo Function:
                    </h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      The <strong>"Undo"</strong> button resolves errors step-by-step:
                    </p>
                    <ul className="list-disc pl-4 mt-2 text-[11px] text-slate-300 space-y-1.5">
                      <li><span className="text-amber-400 font-bold">During Rally (uncommitted):</span> Deletes the last logged action in the current rally chain to let you log again.</li>
                      <li><span className="text-indigo-400 font-bold">After Committing Rally:</span> Reverts the score, restores the previous rotation state, and retrieves the last committed rally actions for editing.</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> การโต้ตอบแรลลี่, การบันทึกแต้ม และฟังก์ชันย้อนกลับ
                </h3>
                
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                    <h4 className="text-blue-400 font-black text-xs sm:text-sm mb-1">🏁 การบันทึกแต้มจบแรลลี่ (Commit Rally):</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      เมื่อเกิดลูกตายและมีการตัดสินแต้ม ให้กดปุ่ม <strong>"จบแรลลี่: HOME ได้แต้ม"</strong> หรือ <strong>"AWAY ได้แต้ม"</strong> ที่แถบควบคุมแรลลี่<br/>
                      ระบบจะอัปเดตคะแนนรวม ส่งประวัติเหตุการณ์เข้าฐานข้อมูลเพื่อรายงานผลสด และ<strong>หมุนตำแหน่งตำแหน่งตัวผู้เล่นในสนาม (Rotate) โดยอัตโนมัติหากฝ่ายรับได้คะแนน (Side-out)</strong>
                    </p>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                    <h4 className="text-rose-400 font-black text-xs sm:text-sm mb-1 flex items-center gap-1">
                      <Undo2 className="w-4 h-4" /> การย้อนกลับสถิติ (Smart Undo):
                    </h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      ปุ่ม <strong>"ย้อนกลับ"</strong> ได้รับการพัฒนาให้ช่วยแก้ไขความผิดพลาดอย่างเป็นขั้นตอน:
                    </p>
                    <ul className="list-disc pl-4 mt-2 text-[11px] text-slate-300 space-y-1.5">
                      <li><span className="text-amber-400 font-bold">ระหว่างจดแรลลี่ (แรลลี่ยังไม่จบ):</span> กดปุ่มย้อนกลับเพื่อลบการคีย์สถิติตัวล่าสุดออก เพื่อทำการแก้ไขใหม่ทันที</li>
                      <li><span className="text-indigo-400 font-bold">หลังกดจบแรลลี่ไปแล้ว (เผลอเคลียร์แต้มผิดฝั่งหรือแต้มเกิน):</span> กดปุ่มย้อนกลับระบบจะถอยคะแนนล่าสุด คืนสภาพตำแหน่งหมุนก่อนหน้า และดึงแรลลี่ชุดล่าสุดกลับมาให้บันทึกต่ออย่างสมบูรณ์</li>
                    </ul>
                  </div>
                </div>
              </div>
            )
          )}
          
          {/* TAB 3: MANAGE */}
          {activeTab === 'manage' && (
            lang === 'en' ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Subs, Fouls, Timeouts & Sets Control
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] sm:text-xs">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-purple-400 font-black block mb-1">🔄 Substitutions</span>
                    Swap active players with bench players:
                    <ol className="list-decimal pl-4 mt-1 text-slate-400 space-y-0.5">
                      <li>Tap the substitution button.</li>
                      <li>Tap the active player on court (yellow card).</li>
                      <li>Tap the substitute player from the bench list (purple card).</li>
                      <li>Click confirm (substitution is logged instantly).</li>
                    </ol>
                  </div>
                  
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-rose-400 font-black block mb-1">🛑 Technical Fault</span>
                    Log mechanical errors (net touch, positional error, double contact, etc.):
                    <br/><br/>
                    <span className="text-slate-400">Selecting a fault type <strong>immediately awards 1 point to the opponent</strong> and automatically rotates on Side-out.</span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-amber-400 font-black block mb-1">⏱️ Timeouts</span>
                    Timeout controls located below team name (max 2 per set):
                    <br/><br/>
                    <span className="text-slate-400">On set transition, timeout quotas automatically reset to 0/2.</span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-sky-400 font-black block mb-1">🏆 End Set & End Match</span>
                    Actions when sets/matches conclude:
                    <br/>
                    <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-0.5">
                      <li><strong>End Set</strong>: Save set stats. Scores reset to 0-0 for the next set.</li>
                      <li><strong>End Match</strong>: Save final victory/loss and change room status to finished.</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> การเปลี่ยนตัว, ปุ่มฟาล์ว, ขอนอกเวลา และการควบคุมแต้มเซต
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] sm:text-xs">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-purple-400 font-black block mb-1">🔄 เปลี่ยนตัวผู้เล่น (Substitution)</span>
                    สลับผู้เล่นในสนามจริงกับผู้เล่นตัวสำรองตามกติกา:
                    <ol className="list-decimal pl-4 mt-1 text-slate-400 space-y-0.5">
                      <li>กดปุ่มเปลี่ยนตัว</li>
                      <li>แตะเลือกผู้เล่นในสนาม (การยืนจริง - การ์ดสีเหลือง)</li>
                      <li>แตะเลือกผู้เล่นสำรองจากรายชื่อด้านล่าง (การ์ดสีม่วง)</li>
                      <li>กดยืนยันการเปลี่ยนตัว (ระบบจะบันทึกประวัติเปลี่ยนตัวให้ทันที)</li>
                    </ol>
                  </div>
                  
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-rose-400 font-black block mb-1">🛑 ปุ่มบันทึกฟาล์ว (Technical Fault)</span>
                    ใช้ในกรณีทำฟาล์วตามหน้างาน (เช่น เน็ต, ฟาล์วตำแหน่งหมุนยืนผิด, บอลสอง, ฟาล์วเสิร์ฟ):
                    <br/><br/>
                    <span className="text-slate-400">เมื่อเลือกประเภทฟาล์วแล้ว <strong className="text-white">ระบบจะบวกแต้มให้ฝ่ายตรงข้ามทันที 1 คะแนน</strong> และหมุนตำแหน่งให้อัตโนมัติในกรณี Side-out</span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-amber-400 font-black block mb-1">⏱️ ปุ่มขอนอกเวลา (Timeout Control)</span>
                    ระบบบันทึกปุ่มเวลานอกใต้ชื่อทีม (ขอได้จำกัด 2 ครั้งต่อเซต) 
                    <br/><br/>
                    <span className="text-slate-400">เมื่อขึ้นเซตใหม่ หรือจบเซต ระบบจะรีเซตโควตาขอนอกเวลาของทีมกลับเป็น 0/2 ครั้ง โดยอัตโนมัติ</span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-sky-400 font-black block mb-1">🏆 การจบเซต / จบแมตช์ (Set & Match Actions)</span>
                    เมื่อเซตจบลงตามเกณฑ์คะแนน (ดิวซ์อัตโนมัติ):
                    <br/>
                    <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-0.5">
                      <li>กดปุ่ม <strong>"จบเซต" (End Set)</strong> เพื่อบันทึกผลชนะเซต คะแนนจะถูกรีเซ็ตเป็น 0-0 ในเซตถัดไป</li>
                      <li>กดปุ่ม <strong>"จบการแข่งขัน" (End Match)</strong> เพื่อบันทึกผลการแข่งขันและเปลี่ยนสถานะห้องเป็นจบแล้วอย่างสมบูรณ์</li>
                    </ul>
                  </div>
                </div>
              </div>
            )
          )}

          {/* TAB 4: COACH DASHBOARD & PDF */}
          {activeTab === 'coach' && (
            lang === 'en' ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <MonitorPlay className="w-4 h-4" /> Coach technical dashboard & PDF Export
                </h3>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] sm:text-xs">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-indigo-400 font-black block mb-1">📊 Coach Dashboard Analysis</span>
                      Review team performance through tabs:
                      <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-0.5">
                        <li><strong>Summary</strong>: Efficiency stats (% perfect/errors) for each skill and starting rosters.</li>
                        <li><strong>Heatmap</strong>: Visual attack success/fail heatmap mapped across 6 zones.</li>
                        <li><strong>Rotation</strong>: Detailed setter rotation summary (R1 to R6) showing points won/lost.</li>
                        <li><strong>Logs</strong>: Real-time event log timeline.</li>
                      </ul>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-emerald-400 font-black block mb-1">📥 Export HTML Summary Report (PDF)</span>
                      <p className="text-slate-400 leading-relaxed mb-2">
                        Press <strong>"PDF"</strong> on the app header to generate a print-ready report including volleyball court graphics and rotation summaries for team meetings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <MonitorPlay className="w-4 h-4" /> แดชบอร์ดวิเคราะห์ทางเทคนิคของโค้ช & การส่งออก PDF
                </h3>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] sm:text-xs">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-indigo-400 font-black block mb-1">📊 รายการวิเคราะห์ใน Coach Dashboard</span>
                      เข้าสู่เมนูเพื่อตรวจสอบประสิทธิภาพทีมผ่านแท็บ:
                      <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-0.5">
                        <li><strong>Summary</strong>: สถิติ %ดี/เสีย ของแต่ละทักษะ พร้อมรูปแบบการยืนจริง</li>
                        <li><strong>Heatmap</strong>: แสดงกราฟิกความสำเร็จของการโจมตีลงบนคอร์ทจำลองทั้ง 6 โซน</li>
                        <li><strong>Rotation</strong>: วิเคราะห์ประสิทธิภาพหน้าเซต (การยืนของตัวเซต R1-R6) เพื่อดูแต้มได้แต้มเสียอย่างละเอียด</li>
                        <li><strong>Logs</strong>: รายการเหตุการณ์แบบเรียลไทม์</li>
                      </ul>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-emerald-400 font-black block mb-1">📥 ดาวน์โหลดรายงานผลลัพธ์ (Download PDF)</span>
                      <p className="text-slate-400 leading-relaxed mb-2">
                        เมื่อกดปุ่ม <strong>"PDF"</strong> บนส่วนหัวของแอป ระบบจะจัดทำโครงสร้างเอกสารสรุปสถิติทั้งหมดอย่างเป็นทางการเป็นไฟล์ HTML พร้อมใช้งานยามไม่มีเน็ต โดยจะแสดงผลลัพธ์เป็นภาพกราฟิกสนามคอร์ทวอลเลย์บอลจริงที่สมบูรณ์ ทั้งสถิติ Attack Zones และ Setter Rotations ทั้ง 6 โซน เพื่อใช้ในการประชุมทีมได้ทันที
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* TAB 5: SYSTEM & USER MANAGEMENT */}
          {activeTab === 'system' && (
            lang === 'en' ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Rooms, Accounts & Scaling Management
                </h3>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] sm:text-xs">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-amber-400 font-black block mb-1">🔒 Room Ownership & Privacy</span>
                      For analytical data security:
                      <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-0.5">
                        <li>General users only see and enter match rooms they created.</li>
                        <li>Admins can view and manage all rooms in the system.</li>
                      </ul>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-indigo-400 font-black block mb-1">⚙️ Admin User Management Panel</span>
                      Manage accounts securely:
                      <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-0.5">
                        <li><strong>Permissions</strong>: Toggle user admin privileges.</li>
                        <li><strong>Expiry</strong>: Modify account expiry dates using a clean datepicker.</li>
                        <li><strong>Password Reset</strong>: Reset user passwords safely.</li>
                      </ul>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 md:col-span-2">
                      <span className="text-emerald-400 font-black block mb-1">📐 Interface Scaling Control</span>
                      If UI buttons are too small or large on your tablet/phone:
                      <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-1">
                        <li>Click <strong>"Scale" (Sliders icon)</strong> on the header.</li>
                        <li>Drag the scale slider to scale the buttons and panels dynamically.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <Users className="w-4 h-4" /> ระบบการจัดการสิทธิ์การใช้งาน, บัญชีผู้ใช้ และการปรับแต่งสเกล
                </h3>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] sm:text-xs">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-amber-400 font-black block mb-1">🔒 สิทธิ์การเป็นเจ้าของห้อง (Room Privacy)</span>
                      เพื่อความปลอดภัยของข้อมูลการวิเคราะห์:
                      <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-0.5">
                        <li>ผู้ใช้งานทั่วไปจะมองเห็นและเข้าทำงานได้เฉพาะห้องการแข่งขันที่ตนเองเป็นผู้สร้างขึ้นเท่านั้น</li>
                        <li>แอดมิน (Admin) จะสามารถสลับสิทธิ์การจัดการและมองเห็นห้องทั้งหมดที่มีในระบบได้</li>
                      </ul>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-indigo-400 font-black block mb-1">⚙️ แผงจัดการผู้ใช้ของแอดมิน (Admin Panel)</span>
                      ฟังก์ชันปรับแต่งบัญชีผ่านป๊อปอัปดีไซน์พรีเมียม:
                      <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-0.5">
                        <li><strong>กำหนดสิทธิ์</strong>: สลับสิทธิ์ผู้ใช้เป็นแอดมินได้ทันทีผ่านสวิตช์เปิด-ปิด</li>
                        <li><strong>ตั้งอายุบัญชี</strong>: ปรับปฏิทินวันหมดอายุด้วย UI ปฏิทินที่สวยงาม</li>
                        <li><strong>รีเซตรหัสผ่าน</strong>: ตั้งรหัสผ่านใหม่ได้อย่างปลอดภัยผ่านหน้าต่างกรอกโดยไม่ต้องพึ่งพาเบราว์เซอร์แจ้งเตือน</li>
                      </ul>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 md:col-span-2">
                      <span className="text-emerald-400 font-black block mb-1">📐 ฟังก์ชันย่อขยายขนาดอินเทอร์เฟซ (Interface Scaling)</span>
                      หากขนาดสวิตช์ปุ่มจดสถิติเล็กหรือใหญ่เกินไปบนแท็บเล็ต/โทรศัพท์มือถือของคุณ:
                      <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-1">
                        <li>กดปุ่ม <strong>"ปรับขนาด" (สัญลักษณ์แถบเลื่อน Sliders)</strong> บริเวณเมนูบาร์ด้านบน</li>
                        <li>ลากแถบสเกลเพื่อขยายหรือย่อขนาดตัวอักษรและหน้าต่างจดให้เหมาะกับสายตาและขนาดมือของคุณโดยสมบูรณ์</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* TAB 3: MANAGE */}
          {activeTab === 'manage' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                <Settings className="w-4 h-4" /> การเปลี่ยนตัว, ปุ่มฟาล์ว, ขอนอกเวลา และการควบคุมแต้มเซต
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] sm:text-xs">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-purple-400 font-black block mb-1">🔄 เปลี่ยนตัวผู้เล่น (Substitution)</span>
                  สลับผู้เล่นในสนามจริงกับผู้เล่นตัวสำรองตามกติกา:
                  <ol className="list-decimal pl-4 mt-1 text-slate-400 space-y-0.5">
                    <li>กดปุ่มเปลี่ยนตัว</li>
                    <li>แตะเลือกผู้เล่นในสนาม (การยืนจริง - การ์ดสีเหลือง)</li>
                    <li>แตะเลือกผู้เล่นสำรองจากรายชื่อด้านล่าง (การ์ดสีม่วง)</li>
                    <li>กดยืนยันการเปลี่ยนตัว (ระบบจะบันทึกประวัติเปลี่ยนตัวให้ทันที)</li>
                  </ol>
                </div>
                
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-rose-400 font-black block mb-1">🛑 ปุ่มบันทึกฟาล์ว (Technical Fault)</span>
                  ใช้ในกรณีทำฟาล์วตามหน้างาน (เช่น เน็ต, ฟาล์วตำแหน่งหมุนยืนผิด, บอลสอง, ฟาล์วเสิร์ฟ):
                  <br/><br/>
                  <span className="text-slate-400">เมื่อเลือกประเภทฟาล์วแล้ว <strong className="text-white">ระบบจะบวกแต้มให้ฝ่ายตรงข้ามทันที 1 คะแนน</strong> และหมุนตำแหน่งให้อัตโนมัติในกรณี Side-out</span>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-amber-400 font-black block mb-1">⏱️ ปุ่มขอนอกเวลา (Timeout Control)</span>
                  ระบบบันทึกปุ่มเวลานอกใต้ชื่อทีม (ขอได้จำกัด 2 ครั้งต่อเซต) 
                  <br/><br/>
                  <span className="text-slate-400">เมื่อขึ้นเซตใหม่ หรือจบเซต ระบบจะรีเซตโควตาขอนอกเวลาของทีมกลับเป็น 0/2 ครั้ง โดยอัตโนมัติ</span>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-sky-400 font-black block mb-1">🏆 การจบเซต / จบแมตช์ (Set & Match Actions)</span>
                  เมื่อเซตจบลงตามเกณฑ์คะแนน (ดิวซ์อัตโนมัติ):
                  <br/>
                  <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-0.5">
                    <li>กดปุ่ม <strong>"จบเซต" (End Set)</strong> เพื่อบันทึกผลชนะเซต คะแนนจะถูกรีเซ็ตเป็น 0-0 ในเซตถัดไป</li>
                    <li>กดปุ่ม <strong>"จบการแข่งขัน" (End Match)</strong> เพื่อบันทึกผลการแข่งขันและเปลี่ยนสถานะห้องเป็นจบแล้วอย่างสมบูรณ์</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COACH DASHBOARD & PDF */}
          {activeTab === 'coach' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                <MonitorPlay className="w-4 h-4" /> แดชบอร์ดวิเคราะห์ทางเทคนิคของโค้ช & การส่งออก PDF
              </h3>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] sm:text-xs">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                    <span className="text-indigo-400 font-black block mb-1">📊 การตรวจสอบประวัติย้อนหลัง</span>
                    เข้าสู่เมนูเพื่อตรวจสอบประสิทธิภาพทีมผ่านแท็บ:
                    <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-0.5">
                      <li><strong>Summary</strong>: สถิติ %ดี/เสีย ของแต่ละทักษะ พร้อมรูปแบบการยืนจริง</li>
                      <li><strong>Heatmap</strong>: แสดงกราฟิกความสำเร็จของการโจมตีลงบนคอร์ทจำลองทั้ง 6 โซน</li>
                      <li><strong>Rotation</strong>: วิเคราะห์ประสิทธิภาพหน้าเซต (การยืนของตัวเซต R1-R6) เพื่อดูแต้มได้แต้มเสียอย่างละเอียด</li>
                      <li><strong>Logs</strong>: รายการเหตุการณ์แบบเรียลไทม์</li>
                    </ul>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                    <span className="text-emerald-400 font-black block mb-1">📥 ดาวน์โหลดรายงานผลลัพธ์ (Download PDF)</span>
                    <p className="text-slate-400 leading-relaxed mb-2">
                      เมื่อกดปุ่ม <strong>"PDF"</strong> บนส่วนหัวของแอป ระบบจะจัดทำโครงสร้างเอกสารสรุปสถิติทั้งหมดอย่างเป็นทางการเป็นไฟล์ HTML พร้อมใช้งานยามไม่มีเน็ต โดยจะแสดงผลลัพธ์เป็นภาพกราฟิกสนามคอร์ทวอลเลย์บอลจริงที่สมบูรณ์ ทั้งสถิติ Attack Zones และ Setter Rotations ทั้ง 6 โซน เพื่อใช้ในการประชุมทีมได้ทันที
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM & USER MANAGEMENT */}
          {activeTab === 'system' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-indigo-400 font-black text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                <Users className="w-4 h-4" /> ระบบการจัดการสิทธิ์การใช้งาน, บัญชีผู้ใช้ และการปรับแต่งสเกล
              </h3>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] sm:text-xs">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                    <span className="text-amber-400 font-black block mb-1">🔒 สิทธิ์การเป็นเจ้าของห้อง (Room Privacy)</span>
                    เพื่อความปลอดภัยของข้อมูลการวิเคราะห์:
                    <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-0.5">
                      <li>ผู้ใช้งานทั่วไปจะมองเห็นและเข้าทำงานได้เฉพาะห้องการแข่งขันที่ตนเองเป็นผู้สร้างขึ้นเท่านั้น</li>
                      <li>แอดมิน (Admin) จะสามารถสลับสิทธิ์การจัดการและมองเห็นห้องทั้งหมดที่มีในระบบได้</li>
                    </ul>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                    <span className="text-indigo-400 font-black block mb-1">⚙️ แผงจัดการผู้ใช้ของแอดมิน (Admin Panel)</span>
                    ฟังก์ชันปรับแต่งบัญชีผ่านป๊อปอัปดีไซน์พรีเมียม:
                    <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-0.5">
                      <li><strong>กำหนดสิทธิ์</strong>: สลับสิทธิ์ผู้ใช้เป็นแอดมินได้ทันทีผ่านสวิตช์เปิด-ปิด</li>
                      <li><strong>ตั้งอายุบัญชี</strong>: ปรับปฏิทินวันหมดอายุด้วย UI ปฏิทินที่สวยงาม</li>
                      <li><strong>รีเซตรหัสผ่าน</strong>: ตั้งรหัสผ่านใหม่ได้อย่างปลอดภัยผ่านหน้าต่างกรอกโดยไม่ต้องพึ่งพาเบราว์เซอร์แจ้งเตือน</li>
                    </ul>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 md:col-span-2">
                    <span className="text-emerald-400 font-black block mb-1">📐 ฟังก์ชันย่อขยายขนาดอินเทอร์เฟซ (Interface Scaling)</span>
                    หากขนาดสวิตช์ปุ่มจดสถิติเล็กหรือใหญ่เกินไปบนแท็บเล็ต/โทรศัพท์มือถือของคุณ:
                    <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-1">
                      <li>กดปุ่ม <strong>"ปรับขนาด" (สัญลักษณ์แถบเลื่อน Sliders)</strong> บริเวณเมนูบาร์ด้านบน</li>
                      <li>ลากแถบสเกลเพื่อขยายหรือย่อขนาดตัวอักษรและหน้าต่างจดให้เหมาะกับสายตาและขนาดมือของคุณโดยสมบูรณ์</li>
                    </ul>
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

function PlayerSetupModal({ team, currentRotations, currentRoster, currentTeamNames, currentMatchInfo, onSave, onClose }) {
  const { lang } = useContext(LanguageContext);
  const t = (key: string) => (translations[lang] as any)[key] || (translations['th'] as any)[key] || key;

  const [lineup, setLineup] = useState([...currentRotations]);
  const [roster, setRoster] = useState({...currentRoster});
  const [teamNames, setTeamNames] = useState({ 
    home: currentTeamNames?.home || "HOME", 
    away: currentTeamNames?.away || "AWAY" 
  });
  const [matchInfo, setMatchInfo] = useState({
    tournament: currentMatchInfo?.tournament || '',
    venue: currentMatchInfo?.venue || '',
    matchDate: currentMatchInfo?.matchDate || '',
    matchTime: currentMatchInfo?.matchTime || '',
    gender: currentMatchInfo?.gender || '',
    ageGroup: currentMatchInfo?.ageGroup || '',
    compLevel: currentMatchInfo?.compLevel || 'general'
  });

  const [newSubNum, setNewSubNum] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubPos, setNewSubPos] = useState('OH');
  
  const [activeSelectZoneIndex, setActiveSelectZoneIndex] = useState<number | null>(null);
  const [quickNum, setQuickNum] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickPos, setQuickPos] = useState('OH');

  const COURT_LAYOUT = [
    { index: 3, label: 'R4' }, { index: 2, label: 'R3' }, { index: 1, label: 'R2' },
    { index: 4, label: 'R5' }, { index: 5, label: 'R6' }, { index: 0, label: 'R1' }
  ];

  const handleAssignPlayer = (num) => {
    if (activeSelectZoneIndex === null) return;
    const idx = activeSelectZoneIndex;
    
    const newLRot = [...lineup];
    const existingIdx = newLRot.indexOf(num);
    
    if (existingIdx !== -1 && existingIdx !== idx) {
      // Swap the players between these two zones
      const temp = newLRot[idx];
      newLRot[idx] = num;
      newLRot[existingIdx] = temp;
    } else {
      // Unassign whatever was in this zone
      const oldNum = newLRot[idx];
      if (oldNum && roster[oldNum]) {
        setRoster(prev => ({
          ...prev,
          [oldNum]: { ...prev[oldNum], isStarter: false }
        }));
      }
      newLRot[idx] = num;
    }
    
    setLineup(newLRot);
    
    if (num && roster[num]) {
      setRoster(prev => ({
        ...prev,
        [num]: { ...prev[num], isStarter: true }
      }));
    }
    
    setActiveSelectZoneIndex(null);
  };

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
    const cleanNum = newSubNum.trim();
    if (lineup.includes(cleanNum)) {
      alert(
        lang === 'en'
          ? `Number #${cleanNum} is already assigned to a starting player on the court.`
          : `หมายเลข #${cleanNum} ถูกใช้งานโดยผู้เล่นตัวจริงในสนามแล้ว`
      );
      return;
    }
    if (roster[cleanNum]) {
      alert(
        lang === 'en'
          ? `Number #${cleanNum} is already used by another player.`
          : `หมายเลข #${cleanNum} ถูกใช้งานโดยผู้เล่นคนอื่นแล้ว`
      );
      return;
    }
    setRoster(prev => ({
      ...prev,
      [cleanNum]: { name: newSubName, position: newSubPos, isStarter: false }
    }));
    setNewSubNum('');
    setNewSubName('');
  };

  const handleRemoveSub = (num) => {
    const updated = { ...roster };
    delete updated[num];
    setRoster(updated);
    
    const newLRot = lineup.map(item => item === num ? '' : item);
    setLineup(newLRot);
  };

  const handleSave = () => {
    // Check for duplicate player numbers
    const starterNums = lineup.filter(num => num && num.trim() !== '');
    const subNums = Object.keys(roster).filter(num => num && num.trim() !== '' && !roster[num].isStarter);
    
    // Total list of numbers
    const allNums = [...starterNums, ...subNums];
    const uniqueNums = new Set(allNums);
    
    if (uniqueNums.size < allNums.length) {
      const duplicates = allNums.filter((item, index) => allNums.indexOf(item) !== index);
      const duplicateSet = Array.from(new Set(duplicates));
      
      alert(
        lang === 'en'
          ? `Duplicate player numbers found: #${duplicateSet.join(', #')}. Every player must have a unique number.`
          : `พบหมายเลขผู้เล่นซ้ำกัน: #${duplicateSet.join(', #')} กรุณาแก้ไขให้หมายเลขไม่ซ้ำกัน`
      );
      return;
    }

    onSave(lineup, roster, teamNames, matchInfo);
  };

  const allPlayers = Object.entries(roster as Record<string, any>).sort((a, b) => (parseInt(a[0]) || 0) - (parseInt(b[0]) || 0));

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl my-4 shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex justify-between items-center p-3 border-b border-slate-800 shrink-0 bg-slate-950">
          <h2 className="text-xs md:text-sm font-extrabold flex items-center gap-2 text-indigo-400">
            <Users className="w-4 h-4"/> {t('playerSetupTitle').replace('{team}', team.toUpperCase())}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4"/></button>
        </div>
        
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
           <div className="flex flex-col gap-3">
             <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-inner">
                <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" /> {t('matchInfoSection')}
                </span>
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">{t('tournamentLabel')}</label>
                      <input 
                        type="text" 
                        value={matchInfo.tournament}
                        placeholder={t('tournamentPlaceholder')}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, tournament: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-[11px] font-bold text-slate-200 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">{t('venueLabel')}</label>
                      <input 
                        type="text" 
                        value={matchInfo.venue}
                        placeholder={t('venuePlaceholder')}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, venue: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-[11px] font-bold text-slate-200 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">{t('matchDateLabel')}</label>
                      <input 
                        type="date" 
                        value={matchInfo.matchDate}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, matchDate: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-[11px] font-bold text-slate-200 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">{t('matchTimeLabel')}</label>
                      <input 
                        type="time" 
                        value={matchInfo.matchTime}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, matchTime: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-[11px] font-bold text-slate-200 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">{t('ageGroupLabel')}</label>
                      <input 
                        type="text" 
                        value={matchInfo.ageGroup}
                        placeholder={t('ageGroupPlaceholder')}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, ageGroup: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-[11px] font-bold text-slate-200 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">{t('genderLabel')}</label>
                      <select 
                        value={matchInfo.gender}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-[11px] font-bold text-slate-200 outline-none focus:border-indigo-500 text-xs"
                      >
                        <option value="">-- {lang === 'en' ? 'Select Gender' : 'เลือกเพศ'} --</option>
                        <option value="male">{t('genderMale')}</option>
                        <option value="female">{t('genderFemale')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">{t('compLevelLabel')}</label>
                      <select 
                        value={matchInfo.compLevel}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, compLevel: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-[11px] font-bold text-slate-200 outline-none focus:border-indigo-500 text-xs"
                      >
                        <option value="highschool">{t('levelHighSchool')}</option>
                        <option value="university">{t('levelUniversity')}</option>
                        <option value="general">{t('levelGeneral')}</option>
                      </select>
                    </div>
                  </div>
                </div>
             </div>

             <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-inner">
                <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Settings className="w-3.5 h-3.5" /> {t('teamNamesSection')}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1">{t('homeTeamLabel')} (HOME)</label>
                    <input 
                      type="text" 
                      value={teamNames.home}
                      onChange={(e) => setTeamNames(prev => ({ ...prev, home: e.target.value.toUpperCase() }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-[11px] font-bold text-indigo-300 outline-none focus:border-indigo-500 text-center uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1">{t('awayTeamLabel')} (AWAY)</label>
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
                  <span>{t('startersTitle')}</span>
                </h3>
                
                {/* COURT DIAGRAM VIEW FOR STARTING ROTATION */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner relative flex flex-col items-center">
                  <span className="text-[9px] text-amber-500 font-extrabold uppercase tracking-wider mb-3.5 block text-center animate-pulse">
                    {lang === 'en' ? '👉 Tap zones to assign/select starters' : '👉 แตะตำแหน่งในสนามเพื่อจัดตัวจริง'}
                  </span>
                  
                  {/* Court grid layout */}
                  <div className="w-full max-w-[280px] sm:max-w-[300px] aspect-[4/3] grid grid-cols-3 grid-rows-2 gap-2 bg-slate-900 border-2 border-slate-700/80 p-2 rounded-xl relative shadow-md">
                    {COURT_LAYOUT.map(layout => {
                      const idx = layout.index;
                      const zoneLabel = layout.label;
                      const playerNum = lineup[idx];
                      const playerDetails = roster[playerNum];
                      
                      return (
                        <button
                          key={zoneLabel}
                          type="button"
                          onClick={() => setActiveSelectZoneIndex(idx)}
                          className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all duration-300 relative hover:scale-102 cursor-pointer shadow active:scale-95
                            ${playerNum 
                              ? 'bg-slate-800 border-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.2)]' 
                              : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 border-dashed text-slate-500'
                            }
                          `}
                        >
                          {/* Zone label */}
                          <span className="absolute top-1 right-1 text-[8px] font-black text-slate-500/85 uppercase">{zoneLabel}</span>
                          
                          {playerNum ? (
                            <div className="flex flex-col items-center justify-center leading-none mt-1">
                              {/* Jersey */}
                              <span className="w-6 h-6 rounded-full bg-slate-950 border border-indigo-500/40 flex items-center justify-center font-mono font-black text-xs text-indigo-400 shadow-inner mb-1 select-none">
                                {playerNum}
                              </span>
                              {/* Name */}
                              <span className="text-[9px] font-extrabold text-slate-200 truncate max-w-[65px] mb-0.5">
                                {playerDetails?.name || `Player-${playerNum}`}
                              </span>
                              {/* Position */}
                              <span className={`text-[6.5px] px-1 rounded uppercase font-black tracking-wider leading-none mt-0.5
                                ${playerDetails?.position === 'S' ? 'bg-indigo-500/20 text-indigo-300' :
                                  playerDetails?.position === 'OH' ? 'bg-sky-500/20 text-sky-300' :
                                  playerDetails?.position === 'OP' ? 'bg-teal-500/20 text-teal-300' :
                                  playerDetails?.position === 'MB' ? 'bg-emerald-500/20 text-emerald-300' :
                                  playerDetails?.position === 'L' ? 'bg-amber-500/20 text-amber-300' :
                                  'bg-slate-500/20 text-slate-300'}
                              `}>
                                {playerDetails?.position || 'OH'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 text-slate-655 hover:text-slate-400 mt-1 select-none">
                              <Plus className="w-3.5 h-3.5 opacity-40" />
                              <span className="text-[8px] font-extrabold uppercase tracking-wider">{lang === 'en' ? 'Assign' : 'ระบุตัว'}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                    {/* Net line */}
                    <div className="absolute top-1/2 left-0 w-full border-t border-slate-700/60 pointer-events-none"></div>
                  </div>
                </div>
             </div>
           </div>

           <div className="flex flex-col gap-2">
             <div className="h-full flex flex-col">
                <h3 className="text-[11px] font-bold text-indigo-400 mb-2 border-b border-slate-800 pb-1.5">
                  {lang === 'en' ? 'All Team Players' : 'รายชื่อผู้เล่นทั้งหมดในทีม'}
                </h3>
                
                <div className="bg-slate-805 p-3 rounded-xl border border-slate-700 flex flex-col gap-2 mb-3 shrink-0 shadow-inner">
                  <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider">{lang === 'en' ? 'Add Player to Team:' : 'เพิ่มผู้เล่นใหม่เข้าสู่ทีม:'}</span>
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      value={newSubNum} 
                      onChange={(e) => setNewSubNum(e.target.value)} 
                      placeholder={t('noPlaceholder')} 
                      className="w-10 bg-slate-950 border border-slate-600 rounded px-1.5 text-white text-center text-[12px] font-bold outline-none focus:border-indigo-500" 
                    />
                    <input 
                      type="text" 
                      value={newSubName} 
                      onChange={(e) => setNewSubName(e.target.value)} 
                      placeholder={t('namePlaceholder')} 
                      className="flex-1 bg-slate-950 border border-slate-600 rounded px-2 text-white text-[12px] outline-none focus:border-indigo-500" 
                    />
                    <select 
                      value={newSubPos} 
                      onChange={(e) => setNewSubPos(e.target.value)} 
                      className="w-14 bg-slate-950 border border-slate-600 rounded px-1 text-white text-[11px] outline-none focus:border-indigo-500"
                    >
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button 
                      onClick={handleAddSubstitute}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-lg text-[10px] font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      {t('addBtn')}
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar min-h-0 bg-slate-950/50 p-2 rounded-xl border border-slate-800/50">
                  {allPlayers.length === 0 ? (
                    <div className="text-slate-500 text-[10px] text-center py-6">{lang === 'en' ? 'No players in roster' : 'ไม่มีรายชื่อผู้เล่นในทีม'}</div>
                  ) : (
                    allPlayers.map(([num, details]) => (
                      <div key={num} className="bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-lg flex justify-between items-center text-[12px] shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold bg-indigo-950 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded text-[10px] w-6 text-center">#{num}</span>
                          <span className="text-white font-medium truncate max-w-[100px]">{details.name}</span>
                          <span className="text-slate-400 text-[9px] font-mono bg-slate-900 px-1.5 rounded">{details.position}</span>
                          
                          {/* Starter status badge */}
                          {details.isStarter ? (
                            <span className="text-[7.5px] bg-indigo-500/20 text-indigo-300 px-1 rounded uppercase font-black tracking-wide leading-none py-0.5">
                              {lang === 'en' ? 'Starter' : 'ตัวจริง'}
                            </span>
                          ) : (
                            <span className="text-[7.5px] bg-slate-750 text-slate-400 px-1 rounded uppercase font-black tracking-wide leading-none py-0.5">
                              {lang === 'en' ? 'Sub' : 'สำรอง'}
                            </span>
                          )}
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
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-xs font-medium">{t('cancelBtn')}</button>
          <button onClick={handleSave} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md flex items-center gap-1.5 text-xs transition-transform active:scale-95">
            <Check className="w-4 h-4"/> {t('saveSetupBtn')}
          </button>
        </div>
      </div>

      {/* Interactive Zone Assignment Dropdown Modal overlay */}
      {activeSelectZoneIndex !== null && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-4 shadow-2xl flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 mb-3 shrink-0">
              <h3 className="text-xs sm:text-sm font-black text-indigo-400 flex items-center gap-1.5 uppercase">
                <Users className="w-4 h-4 text-indigo-300" />
                {lang === 'en' 
                  ? `Assign Player to R${activeSelectZoneIndex === 0 ? 1 : activeSelectZoneIndex === 1 ? 2 : activeSelectZoneIndex === 2 ? 3 : activeSelectZoneIndex === 3 ? 4 : activeSelectZoneIndex === 4 ? 5 : 6}`
                  : `ระบุผู้เล่นตำแหน่ง R${activeSelectZoneIndex === 0 ? 1 : activeSelectZoneIndex === 1 ? 2 : activeSelectZoneIndex === 2 ? 3 : activeSelectZoneIndex === 3 ? 4 : activeSelectZoneIndex === 4 ? 5 : 6}`}
              </h3>
              <button 
                onClick={() => {
                  setActiveSelectZoneIndex(null);
                  setQuickNum('');
                  setQuickName('');
                }} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of existing players in roster */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-1 min-h-0">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                {lang === 'en' ? 'Select from roster:' : 'เลือกผู้เล่นจากรายชื่อ:'}
              </span>
              
              {/* Option to clear zone */}
              <button
                type="button"
                onClick={() => {
                  const newLRot = [...lineup];
                  const oldNum = newLRot[activeSelectZoneIndex];
                  if (oldNum && roster[oldNum]) {
                    setRoster(prev => ({ ...prev, [oldNum]: { ...prev[oldNum], isStarter: false } }));
                  }
                  newLRot[activeSelectZoneIndex] = '';
                  setLineup(newLRot);
                  setActiveSelectZoneIndex(null);
                }}
                className="w-full bg-slate-950/60 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 py-2.5 px-3 rounded-xl flex items-center gap-2.5 transition-all text-rose-450 font-extrabold text-[11px] cursor-pointer shadow-sm"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>{lang === 'en' ? 'Clear Position (Empty)' : 'เคลียร์ตำแหน่งนี้ (ว่าง)'}</span>
              </button>

              {/* Roster players list */}
              {Object.entries(roster as Record<string, any>).map(([num, details]) => {
                const isCurrentStarter = lineup[activeSelectZoneIndex] === num;
                const isOtherStarter = lineup.includes(num) && !isCurrentStarter;
                const otherZoneIdx = lineup.indexOf(num);
                const otherZoneLabel = otherZoneIdx !== -1 ? `R${otherZoneIdx === 0 ? 1 : otherZoneIdx === 1 ? 2 : otherZoneIdx === 2 ? 3 : otherZoneIdx === 3 ? 4 : otherZoneIdx === 4 ? 5 : 6}` : '';

                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleAssignPlayer(num)}
                    className={`w-full text-left py-2 px-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer shadow-sm
                      ${isCurrentStarter 
                        ? 'bg-indigo-600 border-indigo-500 text-white font-extrabold' 
                        : 'bg-slate-950 border-slate-850 hover:border-slate-700 text-slate-300 hover:bg-slate-800'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full font-mono font-black text-[10px] border flex items-center justify-center
                        ${isCurrentStarter 
                          ? 'bg-indigo-950 text-indigo-400 border-indigo-400/40 shadow-inner' 
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                        }
                      `}>
                        {num}
                      </span>
                      <div className="flex flex-col leading-tight">
                        <span className="text-[11px] font-bold">{details.name}</span>
                        <span className="text-[8px] text-slate-500 lowercase font-medium">
                          {isOtherStarter 
                            ? (lang === 'en' ? `currently in ${otherZoneLabel}` : `ยืนอยู่ที่ตำแหน่ง ${otherZoneLabel}`) 
                            : details.isStarter 
                              ? (lang === 'en' ? 'starter' : 'ตัวจริง') 
                              : (lang === 'en' ? 'sub' : 'ตัวสำรอง')
                          }
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[9px] bg-slate-900 border border-slate-850 text-amber-400 px-1.5 py-0.5 rounded uppercase font-bold shrink-0">
                      {details.position}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick add new player block */}
            <div className="border-t border-slate-800 pt-3.5 mt-3 shrink-0 flex flex-col gap-2 bg-slate-900">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                {lang === 'en' ? 'Or create & assign a new player:' : 'หรือสร้างผู้เล่นใหม่และระบุตำแหน่ง:'}
              </span>
              
              <div className="flex flex-col gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850 shadow-inner">
                <div className="flex gap-1.5">
                  <input 
                    type="text" 
                    value={quickNum}
                    onChange={(e) => setQuickNum(e.target.value)}
                    placeholder={lang === 'en' ? 'No.' : 'เบอร์'}
                    className="w-10 bg-slate-900 border border-slate-700 rounded px-1 text-white text-center text-[11px] font-bold outline-none focus:border-indigo-500"
                  />
                  <input 
                    type="text" 
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder={lang === 'en' ? 'Name' : 'ชื่อ'}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 text-white text-[11px] outline-none focus:border-indigo-500"
                  />
                  <select 
                    value={quickPos}
                    onChange={(e) => setQuickPos(e.target.value)}
                    className="w-14 bg-slate-900 border border-slate-700 rounded px-1 text-white text-[11px] outline-none focus:border-indigo-500"
                  >
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!quickNum || !quickName) return;
                    const cleanNum = quickNum.trim();
                    if (roster[cleanNum]) {
                      alert(lang === 'en' ? `Number #${cleanNum} already exists in the roster!` : `หมายเลข #${cleanNum} มีอยู่รายชื่อทีมแล้ว!`);
                      return;
                    }
                    setRoster(prev => ({
                      ...prev,
                      [cleanNum]: { name: quickName, position: quickPos, isStarter: true }
                    }));
                    handleAssignPlayer(cleanNum);
                    setQuickNum('');
                    setQuickName('');
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 py-1.5 rounded-lg text-white font-bold text-[10px] shadow active:scale-95 transition-transform cursor-pointer"
                >
                  {lang === 'en' ? 'Add & Assign Player' : 'เพิ่มและระบุตำแหน่ง'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrackerView({ 
  role, score, teamNames, rotations, roster, tempRallyEvents, onSaveEvent, onCommitRally, onClearRally, onUndo, onFoul, onSubstitution, onManualRotate, hasEvents, timeouts, currentServe,
  status, onManualEndSet, onManualEndMatch, onResumeMatch, onExitMatch, hideCourts = false,
  autoLiberoSwapEnabled, setAutoLiberoSwapEnabled,
  isPortrait = false,
  setsWon = { home: 0, away: 0 },
  events = [],
  currentSet = 1,
  setScores = [],
  hideTabs = false,
  onUpdateScore = () => {},
  onTimeout = () => {},
  onUpdateServe = () => {},
  onReduceTimeout = () => {}
}: any) {
  const { lang } = useContext(LanguageContext);
  const t = (key: string, params?: Record<string, string | number>) => {
    let val = (translations[lang] as any)[key] || (translations['th'] as any)[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, String(v));
      });
    }
    return val;
  };

  const teamColor = role === ROLES.HOME ? 'text-indigo-400' : 'text-rose-400';
  const teamLabel = role === 'home' ? teamNames?.home : teamNames?.away;
  const players = (role === ROLES.HOME ? rotations?.home : rotations?.away) || [];
  const teamRoster = (role === ROLES.HOME ? roster?.home : roster?.away) || {};

  const [step, setStep] = useState('select_start'); 
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [foulModalOpen, setFoulModalOpen] = useState(false);
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(true);
  const [rightWidth, setRightWidth] = useState(260);
  const [showCourtOnMobile, setShowCourtOnMobile] = useState(false);
  
  const handleRightMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = rightWidth;
    const onMove = (mv: MouseEvent) => {
      const delta = startX - mv.clientX; // drag left = wider
      setRightWidth(Math.max(180, Math.min(420, startW + delta)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleRightTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startW = rightWidth;
    const onMove = (mv: TouchEvent) => {
      const delta = startX - mv.touches[0].clientX;
      setRightWidth(Math.max(180, Math.min(420, startW + delta)));
    };
    const onEnd = () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  };

  const [isChainedScout, setIsChainedScout] = useState(false);

  const [currentEvent, setCurrentEvent] = useState<any>({
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

  const substitutes = Object.entries(teamRoster as Record<string, any>).filter(([_, details]) => !details.isStarter);
  const isHomeServe = currentServe === 'home';
  const isAwayServe = currentServe === 'away';

  const canUndo = (tempRallyEvents && tempRallyEvents.length > 0) || hasEvents;

  const foulTypes = [
    { id: 'netTouch', label: t('netTouch') },
    { id: 'serviceFault', label: t('serviceFault') },
    { id: 'rotationFault', label: t('rotationFault') },
    { id: 'doubleContact', label: t('doubleContact') },
    { id: 'catch', label: t('catch') },
    { id: 'fourHits', label: t('fourHits') },
    { id: 'penetrationFault', label: t('penetrationFault') },
    { id: 'otherFault', label: t('otherFault') }
  ];

  const renderCourt = () => {
    return (
      <>
        {/* Opponent Court */}
        <div className={`flex flex-col items-center relative w-full max-w-[280px] sm:max-w-[320px] aspect-[4/3] mb-1 shrink-0 ${isPortrait ? '' : 'max-h-[36vh] min-h-0'}`}>
          <div className="text-rose-400 font-extrabold text-[9px] sm:text-[10px] mb-0.5 tracking-wider uppercase">
            {t('opponentCourtLabel')} {currentServe !== null && (currentServe === (role === 'home' ? 'away' : 'home') ? (lang === 'en' ? ' - SERVING' : ' - เสิร์ฟ') : (lang === 'en' ? ' - RECEIVING' : ' - รับเสิร์ฟ'))}
          </div>
          <div className="w-full h-full grid grid-cols-3 grid-rows-[2fr_1fr] border-2 border-slate-300/80 synthetic-court relative z-10 shadow-lg rounded">
            {OPP_COURT_ZONES.map(zone => {
              const oppIsFrontRow = [2, 3, 4].includes(zone.id);
              const isOppSelected = currentEvent.endZone === zone.id;
              const isOppServing = currentServe !== null && currentServe === (role === 'home' ? 'away' : 'home');
              return (
                <button
                  key={`opp-${zone.id}`}
                  onClick={() => handleZoneClick(zone.id, true)}
                  style={{ backgroundColor: isOppSelected ? undefined : oppIsFrontRow ? 'rgba(60,20,0,0.38)' : 'rgba(255,220,180,0.10)' }}
                  className={`border border-white/20 flex flex-col items-center justify-center text-sm sm:text-base md:text-lg font-black transition-all relative group cursor-pointer hover:bg-white/20 hover:text-white
                    ${isOppSelected ? 'bg-rose-500/80 text-white scale-95 shadow-inner ring-2 ring-white' : 'text-white/20'}
                  `}
                >
                  {zone.id === 1 && isOppServing && (
                    <VolleyballIcon className="w-[18px] h-[18px] text-amber-400 animate-[spin_5s_linear_infinite] mb-1.5 z-30" />
                  )}
                  <span className={isOppSelected ? 'text-white' : 'text-white/20'}>{zone.label}</span>
                </button>
              );
            })}
            <div className="absolute bottom-[33.33%] left-0 w-full border-b border-white/40 pointer-events-none"></div>
          </div>
        </div>

        {/* Net line */}
        <div className="w-full max-w-[240px] h-1 sm:h-1.5 bg-slate-300 z-20 shadow-[0_0_5px_rgba(255,255,255,0.5)] my-0.5 sm:my-1 relative rounded-full shrink-0">
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-slate-900 px-1.5 py-0.5 rounded-full text-[6px] sm:text-[7px] text-white font-extrabold tracking-widest leading-none border border-slate-700">NET</div>
           </div>
        </div>

        {/* Own Court */}
        <div className={`flex flex-col items-center relative w-full max-w-[280px] sm:max-w-[320px] aspect-[4/3] mt-1 shrink-0 ${isPortrait ? '' : 'max-h-[36vh] min-h-0'}`}>
          <div className="w-full h-full grid grid-cols-3 grid-rows-[1fr_2fr] border-2 border-slate-300/80 synthetic-court relative z-10 shadow-lg rounded">
            {COURT_ZONES.map(zone => {
              const playerNum = getPlayerInZone(zone.id);
              const playerDetails = (teamRoster as Record<string, any>)[playerNum] || { name: '-', position: '-' };
              const isSelected = currentEvent.startZone === zone.id;
              const isOwnServing = currentServe !== null && currentServe === role;

              return (
                <button
                  key={`own-${zone.id}`}
                  onClick={() => handleZoneClick(zone.id, false)}
                  style={{ backgroundColor: isSelected ? undefined : [2, 3, 4].includes(zone.id) ? 'rgba(60,20,0,0.38)' : 'rgba(255,220,180,0.10)' }}
                  className={`border border-white/20 flex flex-col items-center justify-center transition-all relative group cursor-pointer hover:bg-white/10
                    ${isSelected ? 'bg-emerald-500/80 text-white scale-95 shadow-inner ring-2 ring-white' : ''}
                  `}
                >
                  <span className={`absolute top-0.5 left-1 text-[9px] sm:text-[10px] font-black ${isSelected ? 'text-white' : 'text-white/40'}`}>{zone.label}</span>
                  {playerNum ? (
                    <div className="flex flex-col items-center justify-center w-full px-1">
                       {zone.id === 1 && isOwnServing && (
                         <VolleyballIcon className="w-[18px] h-[18px] text-amber-400 animate-[spin_5s_linear_infinite] mb-1.5 z-30" />
                       )}
                       <span className={`text-xl sm:text-2xl md:text-3xl font-black leading-none drop-shadow-md ${isSelected ? 'text-white' : 'text-white/90'}`}>{playerNum}</span>
                       <span className="text-[8px] sm:text-[9.5px] px-1.5 py-0.5 font-bold bg-slate-900/60 text-amber-300 rounded-sm leading-none mt-0.5 uppercase shadow-sm border border-slate-800/50">{playerDetails.position}</span>
                       {playerDetails.name && playerDetails.name !== '-' && (
                         <span className={`text-[9px] sm:text-[10.5px] font-black truncate w-full text-center mt-0.5 tracking-wide leading-none ${isSelected ? 'text-indigo-100 font-extrabold' : 'text-slate-350'}`}>
                           {playerDetails.name.split(' ')[0].slice(0, 8)}
                         </span>
                       )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                       {zone.id === 1 && isOwnServing && (
                         <VolleyballIcon className="w-[18px] h-[18px] text-amber-400 animate-[spin_5s_linear_infinite] mb-1.5 z-30" />
                       )}
                       <span className="text-xs sm:text-sm font-black text-white/10">{zone.label}</span>
                    </div>
                  )}
                </button>
              );
            })}
            <div className="absolute top-[33.33%] left-0 w-full border-t border-white/40 pointer-events-none"></div>
          </div>
          <div className={`mt-0.5 font-extrabold text-[9px] sm:text-[10px] tracking-wider ${teamColor}`}>
            {t('ownCourtLabel')} {currentServe !== null && (currentServe === role ? (lang === 'en' ? ' - SERVING' : ' - เสิร์ฟ') : (lang === 'en' ? ' - RECEIVING' : ' - รับเสิร์ฟ'))}
          </div>
        </div>
      </>
    );
  };

  const renderActionPanel = () => {
    return (
      <>
        {/* Header title inside panel */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-1 sm:pb-1.5 mb-1 sm:mb-1.5">
          <span className="text-[9px] sm:text-[10px] font-black text-amber-400 uppercase tracking-widest">{t('statEntryPanelTitle')}</span>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar gap-1 sm:gap-2 text-[10px] sm:text-[11px] pr-0.5 touch-pan-y">
          {/* Step 1: Player selection mapped to court rotation */}
          <div className="bg-slate-950/50 p-1 sm:p-1.5 rounded-xl border border-slate-800">
            <label className="text-[9px] sm:text-[10px] text-amber-500 mb-0.5 sm:mb-1 font-black uppercase tracking-wider flex justify-between items-center">
              <span>{t('step1Player')}</span>
              <span className="text-slate-500 text-[8px] bg-slate-900 px-1 rounded border border-slate-800">SYNCED</span>
            </label>
            
            {/* Grid 3x2 corresponding to actual court rotation positions */}
            <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
              {[3, 2, 1, 4, 5, 0].map(idx => {
                const num = players[idx];
                const zoneNum = idx + 1;
                const details = (teamRoster as Record<string, any>)[num] || { name: '-', position: '-' };
                const shortName = details.name && details.name !== '-' ? details.name.split(' ')[0].slice(0, 7) : null;
                return (
                  <button
                    key={`p-panel-${zoneNum}-${num}`}
                    onClick={() => setCurrentEvent(prev => ({ ...prev, player: num, startZone: zoneNum }))}
                    className={`py-1 sm:py-1.5 rounded-lg border flex flex-col items-center justify-center transition-all active:scale-95 shadow-sm relative
                      ${currentEvent.player === num ? 'bg-amber-500 border-amber-400 text-slate-900 ring-2 ring-white scale-105 shadow-lg' : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'}
                    `}
                  >
                    <span className="absolute top-0.5 left-1 text-[8px] sm:text-[9px] font-black opacity-45">R{zoneNum}</span>
                    <span className="font-black text-sm sm:text-base md:text-lg leading-none mt-0.5 sm:mt-1">{num}</span>
                    {shortName && <span className="text-[9px] sm:text-[10px] opacity-90 mt-0.5 font-bold truncate max-w-full px-0.5">{shortName}</span>}
                    <span className="text-[8px] sm:text-[9px] opacity-70 uppercase font-bold">({details.position})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step 2: Skills */}
          <div className="bg-slate-950/50 p-1 sm:p-1.5 rounded-xl border border-slate-800">
            <label className="text-[9px] sm:text-[10px] text-amber-500 mb-0.5 sm:mb-1 block font-black uppercase tracking-wider">
              {t('step2Skill')}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-2 gap-1 sm:gap-1.5">
              {SKILLS.map(skill => (
                <button
                  key={skill.id}
                  onClick={() => setCurrentEvent(prev => ({ ...prev, skill: skill.id }))}
                  className={`py-1.5 sm:py-2 rounded-lg font-black transition-colors border leading-none shadow-sm active:scale-95 text-[11px] sm:text-xs md:text-sm
                    ${currentEvent.skill === skill.id ? (skill.colorActive + ' ring-2 ring-white shadow-lg') : (skill.color + ' opacity-80 hover:opacity-100')}
                  `}
                >
                  <span className="hidden sm:inline">{getLocalizedSkillLabel(skill.id, lang)}</span>
                  <span className="sm:hidden">{getLocalizedSkillLabel(skill.id, lang).split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Evaluations */}
          <div className="bg-slate-950/50 p-1 sm:p-1.5 rounded-xl border border-slate-800 flex-1 flex flex-col">
            <label className="text-[9px] sm:text-[10px] text-amber-500 mb-0.5 sm:mb-1 block font-black uppercase tracking-wider flex justify-between items-center">
              <span>{t('step3Eval')}</span>
              {['attack', 'serve'].includes(currentEvent.skill || '') && currentEvent.endZone === null && (
                <span className="text-rose-400 text-[7px] sm:text-[8px] bg-rose-950 px-1 py-0.5 rounded border border-rose-900 animate-pulse font-bold">
                  {lang === 'en' ? '*TAP OPPONENT COURT' : '*แตะสนามฝั่งตรงข้ามเลือกจุดตก'}
                </span>
              )}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-2 gap-1 sm:gap-1.5 flex-1">
              {EVALUATIONS.map(evalObj => (
                <button
                  key={evalObj.id}
                  onClick={() => {
                    if (currentEvent.player && currentEvent.skill) {
                      handleEvalClick(evalObj.id);
                    }
                  }}
                  disabled={!currentEvent.player || !currentEvent.skill}
                  className={`py-1.5 sm:py-2 rounded-lg font-black text-white transition-all active:scale-95 leading-none shadow-md disabled:opacity-20 disabled:scale-100 flex items-center justify-center text-[11px] sm:text-xs md:text-sm
                    ${currentEvent.eval === evalObj.id ? evalObj.color + ' ring-2 ring-white scale-105 shadow-xl' : evalObj.color + ' opacity-90 hover:opacity-100 border border-black/20'}
                  `}
                >
                  <span className="hidden sm:inline">{getLocalizedEvalLabel(evalObj.id, lang)}</span>
                  <span className="sm:hidden text-sm font-black">{evalObj.id}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden min-h-0 w-full">


      {/* Control Actions bar */}
      <div className="bg-slate-950/70 p-1.5 border-b border-slate-800 flex justify-between items-center px-2 shrink-0">
        <div className="flex items-center gap-2">
           <span className={`font-black text-[10px] sm:text-xs tracking-wider ${teamColor}`}>{teamLabel} SCOUT</span>
           <label className="flex items-center gap-1 cursor-pointer select-none border border-slate-800 bg-slate-900 px-1.5 py-0.5 rounded text-[8px] sm:text-[9.5px] font-black text-slate-400 hover:text-slate-200">
             <input
               type="checkbox"
               checked={autoLiberoSwapEnabled}
               onChange={(e) => {
                 const val = e.target.checked;
                 setAutoLiberoSwapEnabled(val);
                 localStorage.setItem('app_auto_libero', val ? 'true' : 'false');
               }}
               className="w-2.5 h-2.5 accent-amber-500 rounded cursor-pointer"
             />
             {lang === 'en' ? 'AUTO L' : 'ลิเบอโร่ Auto'}
           </label>
           {isPortrait && (
             <label className="flex items-center gap-1 cursor-pointer select-none border border-slate-800 bg-slate-900 px-1.5 py-0.5 rounded text-[8px] sm:text-[9.5px] font-black text-slate-400 hover:text-slate-200 sm:hidden">
               <input
                 type="checkbox"
                 checked={showCourtOnMobile}
                 onChange={(e) => setShowCourtOnMobile(e.target.checked)}
                 className="w-2.5 h-2.5 accent-amber-500 rounded cursor-pointer"
               />
               {lang === 'en' ? 'COURT' : 'แสดงสนาม'}
             </label>
           )}
        </div>
        
        <div className="flex gap-1 shrink-0 overflow-x-auto custom-scrollbar max-w-[65vw] sm:max-w-none pb-0.5">
          <button 
            onClick={() => setSubModalOpen(true)}
            className="text-[9px] sm:text-[10px] bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 px-2 py-1.5 rounded-lg font-bold transition-all border border-purple-800/40 active:scale-95 shrink-0"
          >
            {t('substituteBtn')}
          </button>
          <button 
            onClick={() => setFoulModalOpen(true)}
            className="text-[9px] sm:text-[10px] bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 px-2 py-1.5 rounded-lg font-bold transition-all border border-rose-800/40 active:scale-95 shrink-0"
          >
            {t('foulBtn')}
          </button>
          <button 
            onClick={() => {
              const confirmText = t('confirmEndSet')
                .replace('{home}', teamNames.home)
                .replace('{away}', teamNames.away);
              const choice = window.confirm(confirmText);
              onManualEndSet(choice ? 'home' : 'away');
            }}
            className="text-[9px] sm:text-[10px] bg-amber-900/40 hover:bg-amber-900/60 text-amber-300 px-2 py-1.5 rounded-lg font-bold transition-all border border-amber-800/40 active:scale-95 shrink-0"
          >
            {t('endSetBtn')}
          </button>
          <button 
            onClick={() => {
              const confirmText = t('confirmEndMatch')
                .replace('{home}', teamNames.home)
                .replace('{away}', teamNames.away);
              const choice = window.confirm(confirmText);
              onManualEndMatch(choice ? 'home' : 'away');
            }}
            className="text-[9px] sm:text-[10px] bg-rose-950 hover:bg-rose-900 text-rose-300 px-2 py-1.5 rounded-lg font-bold transition-all border border-rose-900/40 active:scale-95 shrink-0"
          >
            {t('endMatchBtn')}
          </button>
          <button 
            onClick={onUndo} 
            disabled={!canUndo} 
            className="text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-[9px] sm:text-[10px] bg-slate-800 px-2 py-1.5 rounded-lg transition-all border border-slate-700 flex items-center gap-1 active:scale-95 shrink-0"
          >
            <Undo2 className="w-3 h-3" /> {t('undoBtn')}
          </button>
        </div>
      </div>


      {isPortrait ? (
        /* Portrait layout: 2 Columns (Stacked on mobile, side-by-side on tablets) */
        <div className="flex-1 flex flex-col sm:flex-row overflow-y-auto sm:overflow-hidden relative min-h-0 w-full gap-2 p-1 sm:p-2">
          {status === 'finished' && (
            <div className="absolute inset-0 bg-slate-950/85 z-40 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200">
              <Trophy className="w-12 h-12 text-amber-400 mb-2 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]" />
              <h3 className="text-sm font-black text-white mb-0.5">{t('matchHasEnded')}</h3>
              <p className="text-[10px] text-slate-400 mb-3 max-w-xs">{t('roomFinishedStatus')}</p>
              <div className="flex gap-2">
                <button 
                  onClick={onResumeMatch}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg border border-indigo-500 shadow-md active:scale-95 transition-all"
                >
                  {t('resumeMatchBtn')}
                </button>
                <button 
                  onClick={onExitMatch}
                  className="px-3.5 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-bold text-[10px] rounded-lg border border-rose-800/40 shadow-md active:scale-95 transition-all"
                >
                  {lang === 'en' ? 'Exit Room' : 'ออกจากห้อง'}
                </button>
              </div>
            </div>
          )}
          
          {/* Column 1: ScoreBoard + Mock Court + Dashboard */}
          <div className="w-full sm:flex-1 flex flex-col gap-2 h-auto sm:h-full min-h-0 overflow-visible sm:overflow-y-auto custom-scrollbar touch-pan-y">
            {/* ScoreBoard */}
            <ScoreBoard 
              score={score} 
              setsWon={setsWon}
              role={role} 
              teamNames={teamNames}
              timeouts={timeouts}
              currentServe={currentServe}
              onUpdateScore={onUpdateScore} 
              onTimeout={onTimeout}
              onUpdateServe={onUpdateServe}
              onReduceTimeout={onReduceTimeout}
              events={events}
            />

            {/* Mock Court */}
            <div className={`${showCourtOnMobile ? 'flex' : 'hidden sm:flex'} bg-slate-900 rounded-xl border border-slate-800 p-2 flex-col items-center justify-center shrink-0`}>
               <div className="w-full flex flex-col items-center justify-center bg-slate-950/40 rounded-xl border border-slate-800/60 p-1.5 sm:p-2">
                  {renderCourt()}
               </div>
            </div>

            {/* Dashboard */}
            <div className="flex-1 min-h-[350px] bg-slate-900 rounded-xl border border-slate-800 shadow-inner p-1.5">
              <Dashboard 
                 events={events} 
                 rotations={rotations} 
                 roster={roster}
                 role={role}
                 teamNames={teamNames}
                 timeouts={timeouts}
                 currentSet={currentSet}
                 setScores={setScores}
                 hideTabs={hideTabs}
                 currentServe={currentServe}
                 tempRallyEvents={tempRallyEvents}
                 isPortrait={isPortrait}
              />
            </div>
          </div>

          {/* Column 2: Action Keying Panel */}
          <div className="relative w-full sm:w-[320px] shrink-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col z-35 p-1.5 sm:p-3 h-auto sm:h-full overflow-visible sm:overflow-hidden">
            {renderActionPanel()}
          </div>
        </div>
      ) : (
        /* Original Landscape layout */
        <div className="flex-1 flex flex-row overflow-hidden relative min-h-0 w-full gap-1.5 p-1 sm:p-2">
          {status === 'finished' && (
            <div className="absolute inset-0 bg-slate-950/85 z-40 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200">
              <Trophy className="w-12 h-12 text-amber-400 mb-2 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]" />
              <h3 className="text-sm font-black text-white mb-0.5">{t('matchHasEnded')}</h3>
              <p className="text-[10px] text-slate-400 mb-3 max-w-xs">{t('roomFinishedStatus')}</p>
              <div className="flex gap-2">
                <button 
                  onClick={onResumeMatch}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg border border-indigo-500 shadow-md active:scale-95 transition-all"
                >
                  {t('resumeMatchBtn')}
                </button>
                <button 
                  onClick={onExitMatch}
                  className="px-3.5 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-bold text-[10px] rounded-lg border border-rose-800/40 shadow-md active:scale-95 transition-all"
                >
                  {lang === 'en' ? 'Exit Room' : 'ออกจากห้อง'}
                </button>
              </div>
            </div>
          )}
          
          {/* LEFT: Compact courts wrapper */}
          {!hideCourts && (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-950/40 rounded-xl border border-slate-800/60 p-1 sm:p-2 min-h-0 overflow-hidden">
               {renderCourt()}
            </div>
          )}

          {/* Splitter handle */}
          {!hideCourts && (
            <div
              className="hidden md:flex w-2.5 hover:w-3 bg-slate-900 border-x border-slate-800 hover:bg-indigo-600 hover:border-indigo-500 cursor-col-resize self-stretch transition-all duration-150 relative items-center justify-center shrink-0 group select-none z-40"
              onMouseDown={handleRightMouseDown}
              onTouchStart={handleRightTouchStart}
            >
              <div className="w-1 h-8 rounded-full bg-slate-700 group-hover:bg-indigo-300 transition-colors" />
            </div>
          )}

          {/* RIGHT: Action Keying Panel */}
          <div
            className={`relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col z-35 transition-none
              ${hideCourts ? 'flex-1 w-full p-2 sm:p-4' : 'p-1.5 sm:p-3'}
            `}
            style={hideCourts ? undefined : { width: `${rightWidth}px`, minWidth: '180px', maxWidth: '420px' }}
          >
            {renderActionPanel()}
          </div>
        </div>
      )}


      {subModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-sm font-black text-amber-400 mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> {t('substituteModalTitle')}
            </h3>
            
            {substitutes.length === 0 ? (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                <AlertCircle className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <div className="text-slate-400 text-xs">{t('noSubsAvailable')}</div>
                <div className="text-slate-500 text-[10px] mt-1">{t('addSubsPrompt')}</div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700">
                  <label className="text-[10px] text-slate-300 font-bold block mb-1.5 flex justify-between">
                    <span>{t('subOutLabel')}</span>
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
                        #{num} <span className="text-[9px] opacity-70">({(teamRoster as Record<string, any>)[num]?.position})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700">
                  <label className="text-[10px] text-slate-300 font-bold block mb-1.5">{t('subInLabel')}</label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                    {substitutes.map(([num, details]) => (
                      <button 
                        key={`s-${num}`}
                        onClick={() => {
                          setCurrentEvent(prev => ({ ...prev, _targetSubIn: num }));
                        }}
                        className={`p-2 rounded-lg text-[10px] border truncate text-left shadow-sm transition-all ${currentEvent._targetSubIn === num ? 'bg-purple-600 border-purple-400 text-white font-black scale-105' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 font-bold'}`}
                      >
                        #{num} {(details as any).name} <span className="opacity-70">({(details as any).position})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                  <button onClick={() => { setSubModalOpen(false); resetFlow(); }} className="text-slate-400 hover:text-white text-[11px] px-3 py-1.5 font-bold">{t('cancelBtn')}</button>
                  <button 
                    disabled={!currentEvent._targetSubOut || !currentEvent._targetSubIn}
                    onClick={() => {
                      onSubstitution(currentEvent._targetSubOut, currentEvent._targetSubIn);
                      setSubModalOpen(false);
                      resetFlow();
                    }}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white text-[11px] px-4 py-1.5 rounded-lg font-black shadow-md transition-all active:scale-95"
                  >
                    {t('confirmSubSubmit')}
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
              <AlertCircle className="w-4 h-4" /> {t('foulModalTitle')}
            </h3>
            <p className="text-[10px] text-slate-400 mb-3">{t('foulPointWarning')}</p>
            <div className="grid grid-cols-1 gap-1.5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {foulTypes.map((fType, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onFoul(fType.label);
                    setFoulModalOpen(false);
                  }}
                  className="bg-slate-800 hover:bg-rose-600 border border-slate-700 hover:border-rose-500 text-left px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white transition-all shadow-sm active:scale-95"
                >
                  {fType.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t border-slate-800">
              <button onClick={() => setFoulModalOpen(false)} className="text-slate-400 hover:text-white text-[11px] px-3 py-1.5 font-bold">{t('cancelBtn')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}function Dashboard({ events, rotations, roster, role, teamNames, timeouts, currentSet = 1, setScores = [], hideTabs = false, currentServe = null, tempRallyEvents = [], isPortrait = false }) {
  const { lang } = useContext(LanguageContext);
  const [activeTab, setActiveTab] = useState<'summary' | 'players' | 'heatmap' | 'rotation' | 'logs'>('summary');
  const [selectedSet, setSelectedSet] = useState<number | 'all'>('all');
  const [selectedPlayerTeam, setSelectedPlayerTeam] = useState<'home' | 'away'>('home');
  const [sortField, setSortField] = useState<'starter' | 'number' | 'totalActions' | 'successRate'>('starter');
  const [sortAscending, setSortAscending] = useState<boolean>(true);
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<any | null>(null);

  const handleSort = (field: 'starter' | 'number' | 'totalActions' | 'successRate') => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(field === 'number' || field === 'starter');
    }
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    let val = (translations[lang] as any)[key] || (translations['th'] as any)[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, String(v));
      });
    }
    return val;
  };

  const allEventsCombined = useMemo(() => {
    return [...events, ...(tempRallyEvents || [])];
  }, [events, tempRallyEvents]);

  const TeamStatusGraphics = ({ team, timeoutsCount }) => {
    const subsCount = useMemo(() => {
      const tEvents = selectedSet === 'all' 
        ? allEventsCombined 
        : allEventsCombined.filter(e => e.set === selectedSet);
      return tEvents.filter(e => e.team === team && e.skill === 'substitute').length;
    }, [team, allEventsCombined, selectedSet]);

    return (
      <div className="flex flex-wrap items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner shrink-0">
        {/* Timeouts Indicator */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase">
            {t('timeoutsLabel')}:
          </span>
          <div className="flex gap-1">
            {Array.from({ length: 2 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-3.5 h-3.5 rounded flex items-center justify-center font-black font-mono text-[8px] border transition-all duration-300
                  ${i < timeoutsCount 
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse' 
                    : 'bg-slate-900 border-slate-700 text-slate-600'
                  }`}
              >
                T
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <span className="text-slate-800 text-[10px] font-black">|</span>

        {/* Substitutions Indicator */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase">
            {t('subsLabel')}:
          </span>
          <div className="flex gap-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-3 rounded-sm border transition-all duration-300
                  ${i < subsCount 
                    ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.6)]' 
                    : 'bg-slate-900 border-slate-800'
                  }`} 
              />
            ))}
          </div>
          <span className="text-[9px] font-mono font-black text-slate-300 ml-1">{subsCount}/6</span>
        </div>
      </div>
    );
  };

  const filteredEvents = useMemo(() => {
    if (selectedSet === 'all') return allEventsCombined;
    return allEventsCombined.filter(e => e.set === selectedSet);
  }, [allEventsCombined, selectedSet]);

  const calculateStats = (team) => {
    const teamEvents = Array.isArray(filteredEvents) ? filteredEvents.filter(e => e?.team === team) : [];
    
    const results = {};
    SKILLS.forEach(skill => {
      const skillEvents = teamEvents.filter(e => e?.skill === skill.id);
      const total = skillEvents.length;
      const perfect = skillEvents.filter(e => e.eval === '#').length;
      const good = skillEvents.filter(e => e.eval === '+').length;
      const okay = skillEvents.filter(e => e.eval === '!').length;
      const poor = skillEvents.filter(e => e.eval === '-').length;
      const error = skillEvents.filter(e => e.eval === '=').length;
      const blocked = skillEvents.filter(e => e.eval === '/').length;

      let positiveCount = perfect + good;
      let negativeCount = error + blocked;
      let neutralCount = okay + poor;

      if (skill.id === 'block') {
        positiveCount = perfect;
        neutralCount = good + okay + poor;
        negativeCount = error + blocked;
      }

      results[skill.id] = {
        total,
        goodPercent: total > 0 ? ((positiveCount / total) * 100).toFixed(0) : '0',
        errorPercent: total > 0 ? ((negativeCount / total) * 100).toFixed(0) : '0',
        neutralPercent: total > 0 ? ((neutralCount / total) * 100).toFixed(0) : '0'
      };
    });

    return results;
  };

  const homeStats = useMemo(() => calculateStats(ROLES.HOME), [filteredEvents]);
  const awayStats = useMemo(() => calculateStats(ROLES.AWAY), [filteredEvents]);

  const playerStats = useMemo(() => {
    const calculatePlayerStatsForTeam = (teamKey: 'home' | 'away') => {
      const teamRoster = roster[teamKey] || {};
      const teamEvents = Array.isArray(filteredEvents) ? filteredEvents.filter(e => e?.team === teamKey) : [];
      
      return Object.entries(teamRoster).map(([num, details]: [string, any]) => {
        const pEvents = teamEvents.filter(e => e?.player === num);
        
        const skillCounts: Record<string, { total: number; perfect: number; good: number; okay: number; poor: number; error: number; blocked: number }> = {};
        SKILLS.forEach(s => {
          const sEvts = pEvents.filter(e => e?.skill === s.id);
          skillCounts[s.id] = {
            total: sEvts.length,
            perfect: sEvts.filter(e => e.eval === '#').length,
            good: sEvts.filter(e => e.eval === '+').length,
            okay: sEvts.filter(e => e.eval === '!').length,
            poor: sEvts.filter(e => e.eval === '-').length,
            error: sEvts.filter(e => e.eval === '=').length,
            blocked: sEvts.filter(e => e.eval === '/').length,
          };
        });

        const totalActions = pEvents.length;
        const successCount = pEvents.filter(e => e?.eval === '#' || e?.eval === '+').length;
        const errorCount = pEvents.filter(e => e?.eval === '=' || e?.eval === '/').length;
        
        const successRate = totalActions > 0 ? ((successCount / totalActions) * 100).toFixed(0) : '0';
        const errorRate = totalActions > 0 ? ((errorCount / totalActions) * 100).toFixed(0) : '0';

        return {
          num,
          name: details.name,
          position: details.position,
          isStarter: details.isStarter,
          totalActions,
          successCount,
          errorCount,
          successRate,
          errorRate,
          skills: skillCounts
        };
      }).sort((a, b) => {
        if (a.isStarter && !b.isStarter) return -1;
        if (!a.isStarter && b.isStarter) return 1;
        const aNum = parseInt(a.num) || 0;
        const bNum = parseInt(b.num) || 0;
        return aNum - bNum;
      });
    };

    return {
      home: calculatePlayerStatsForTeam('home'),
      away: calculatePlayerStatsForTeam('away')
    };
  }, [filteredEvents, roster]);

  const sortedPlayerStats = useMemo(() => {
    const sortTeam = (teamKey: 'home' | 'away') => {
      const stats = [...playerStats[teamKey]];
      stats.sort((a, b) => {
        let comparison = 0;
        if (sortField === 'starter') {
          if (a.isStarter && !b.isStarter) comparison = -1;
          else if (!a.isStarter && b.isStarter) comparison = 1;
          else {
            const aNum = parseInt(a.num) || 0;
            const bNum = parseInt(b.num) || 0;
            comparison = aNum - bNum;
          }
        } else if (sortField === 'number') {
          const aNum = parseInt(a.num) || 0;
          const bNum = parseInt(b.num) || 0;
          comparison = aNum - bNum;
        } else if (sortField === 'totalActions') {
          comparison = a.totalActions - b.totalActions;
        } else if (sortField === 'successRate') {
          comparison = parseFloat(a.successRate) - parseFloat(b.successRate);
        }
        return sortAscending ? comparison : -comparison;
      });
      return stats;
    };

    return {
      home: sortTeam('home'),
      away: sortTeam('away')
    };
  }, [playerStats, sortField, sortAscending]);

  const zoneDistribution = useMemo(() => {
    const data = {
      home: { strengths: Array(7).fill(0), weaknesses: Array(7).fill(0) },
      away: { strengths: Array(7).fill(0), weaknesses: Array(7).fill(0) }
    };

    filteredEvents.forEach(evt => {
      if (!evt || !evt.endZone || evt.endZone < 1 || evt.endZone > 6) return;
      
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
  }, [filteredEvents]);

  const showHome = role === ROLES.HOME || role === ROLES.COACH;
  const showAway = role === ROLES.AWAY || role === ROLES.COACH;

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden min-h-0">
      {/* Tab Switchers */}
      <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 shrink-0 gap-1.5 shadow-sm overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 min-w-[80px] py-2.5 sm:py-3 text-xs md:text-sm font-extrabold rounded-lg flex items-center justify-center gap-2 transition-all uppercase tracking-wider shrink-0
            ${activeTab === 'summary' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
          `}
        >
          <BarChart3 className="w-4 h-4 text-indigo-300" /> {t('qualityTab')}
        </button>
        {!hideTabs && (
          <button
            onClick={() => setActiveTab('players')}
            className={`flex-1 min-w-[80px] py-2.5 sm:py-3 text-xs md:text-sm font-extrabold rounded-lg flex items-center justify-center gap-2 transition-all uppercase tracking-wider shrink-0
              ${activeTab === 'players' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
            `}
          >
            <Users className="w-4 h-4 text-sky-400" /> {lang === 'en' ? 'Players' : 'วิเคราะห์ผู้เล่น'}
          </button>
        )}
        {!hideTabs && (
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`flex-1 min-w-[80px] py-2.5 sm:py-3 text-xs md:text-sm font-extrabold rounded-lg flex items-center justify-center gap-2 transition-all uppercase tracking-wider shrink-0
              ${activeTab === 'heatmap' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
            `}
          >
            <Swords className="w-4 h-4 text-rose-400" /> {t('attackZoneTab')}
          </button>
        )}
        {!hideTabs && (
          <button
            onClick={() => setActiveTab('rotation')}
            className={`flex-1 min-w-[80px] py-2.5 sm:py-3 text-xs md:text-sm font-extrabold rounded-lg flex items-center justify-center gap-2 transition-all uppercase tracking-wider shrink-0
              ${activeTab === 'rotation' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
            `}
          >
            <RotateCcw className="w-4 h-4 text-amber-400" /> {t('rotationTab')}
          </button>
        )}
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 min-w-[80px] py-2.5 sm:py-3 text-xs md:text-sm font-extrabold rounded-lg flex items-center justify-center gap-2 transition-all uppercase tracking-wider shrink-0
            ${activeTab === 'logs' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
          `}
        >
          <ClipboardList className="w-4 h-4 text-emerald-400" /> {t('logsTab')}
        </button>
      </div>

      {/* Set Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner">
        <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider shrink-0 mr-1 pl-1">
          {lang === 'en' ? 'Set Filter:' : 'กรองเซต:'}
        </span>
        <button
          onClick={() => setSelectedSet('all')}
          className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all shrink-0 border
            ${selectedSet === 'all' 
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' 
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}
          `}
        >
          {lang === 'en' ? 'All Sets' : 'ทุกเซต'}
        </button>
        {Array.from({ length: currentSet }, (_, i) => i + 1).map(setNum => {
          const compScore = setScores?.find(s => s.setNum === setNum);
          const scoreDisplay = compScore ? ` (${compScore.home}-${compScore.away})` : '';
          const isCurrent = setNum === currentSet;
          return (
            <button
              key={setNum}
              onClick={() => setSelectedSet(setNum)}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all shrink-0 border flex items-center gap-1
                ${selectedSet === setNum 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' 
                  : isCurrent
                    ? 'bg-slate-900 border-amber-500/50 text-amber-400 hover:text-amber-200 hover:bg-slate-800'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}
              `}
            >
              <span>{lang === 'en' ? `Set ${setNum}` : `เซต ${setNum}`}</span>
              {scoreDisplay && <span className="font-mono text-[10px] opacity-80">{scoreDisplay}</span>}
              {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live Set" />}
            </button>
          );
        })}
      </div>

      {/* SUMMARY / STATS VIEW */}
      {activeTab === 'summary' && (
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-0.5 min-h-0">
          {showHome && (
            <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-700 shadow-md shrink-0">
              <h3 className="text-xs sm:text-sm md:text-base font-black text-indigo-400 mb-3 flex justify-between items-center tracking-wider border-b border-slate-800 pb-2">
                <span>{lang === 'en' ? `${teamNames.home} TEAM STATS` : `สถิติทีม ${teamNames.home}`}</span>
                <TeamStatusGraphics team="home" timeoutsCount={timeouts?.home || 0} />
              </h3>
              <SkillBarStats teamStats={homeStats} />
            </div>
          )}

          {showAway && (
            <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-700 shadow-md shrink-0">
              <h3 className="text-xs sm:text-sm md:text-base font-black text-rose-400 mb-3 flex justify-between items-center tracking-wider border-b border-slate-800 pb-2">
                <span>{lang === 'en' ? `${teamNames.away} TEAM STATS` : `สถิติทีม ${teamNames.away}`}</span>
                <TeamStatusGraphics team="away" timeoutsCount={timeouts?.away || 0} />
              </h3>
              <SkillBarStats teamStats={awayStats} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 shrink-0">
            {showHome && (
              <div className="bg-indigo-950/20 p-2 rounded-xl border border-indigo-900/30">
                <span className="text-[10px] font-black text-indigo-400 block mb-1.5 tracking-wider uppercase text-center bg-indigo-900/40 py-1 rounded">
                  {lang === 'en' ? `${teamNames?.home} Rotation` : `ตำแหน่งการยืน ${teamNames?.home}`}
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <RotPlayer num={rotations?.home?.[3]} zone="R4" pos={roster?.home?.[rotations?.home?.[3]]?.position} />
                  <RotPlayer num={rotations?.home?.[2]} zone="R3" pos={roster?.home?.[rotations?.home?.[2]]?.position} />
                  <RotPlayer num={rotations?.home?.[1]} zone="R2" pos={roster?.home?.[rotations?.home?.[1]]?.position} />
                  <RotPlayer num={rotations?.home?.[4]} zone="R5" pos={roster?.home?.[rotations?.home?.[4]]?.position} />
                  <RotPlayer num={rotations?.home?.[5]} zone="R6" pos={roster?.home?.[rotations?.home?.[5]]?.position} />
                  <RotPlayer num={rotations?.home?.[0]} zone="R1" pos={roster?.home?.[rotations?.home?.[0]]?.position} isServer={currentServe === 'home'} />
                </div>
              </div>
            )}
            {showAway && (
              <div className="bg-rose-950/20 p-2 rounded-xl border border-rose-900/30">
                <span className="text-[10px] font-black text-rose-400 block mb-1.5 tracking-wider uppercase text-center bg-rose-900/40 py-1 rounded">
                  {lang === 'en' ? `${teamNames?.away} Rotation` : `ตำแหน่งการยืน ${teamNames?.away}`}
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <RotPlayer num={rotations?.away?.[3]} zone="R4" pos={roster?.away?.[rotations?.away?.[3]]?.position} />
                  <RotPlayer num={rotations?.away?.[2]} zone="R3" pos={roster?.away?.[rotations?.away?.[2]]?.position} />
                  <RotPlayer num={rotations?.away?.[1]} zone="R2" pos={roster?.away?.[rotations?.away?.[1]]?.position} />
                  <RotPlayer num={rotations?.away?.[4]} zone="R5" pos={roster?.away?.[rotations?.away?.[4]]?.position} />
                  <RotPlayer num={rotations?.away?.[5]} zone="R6" pos={roster?.away?.[rotations?.away?.[5]]?.position} />
                  <RotPlayer num={rotations?.away?.[0]} zone="R1" pos={roster?.away?.[rotations?.away?.[0]]?.position} isServer={currentServe === 'away'} />
                </div>
              </div>
            )}
          </div>

          {/* Explanation Legend */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 mt-1.5 shadow-sm shrink-0 flex items-center">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold leading-relaxed">
              {lang === 'en' 
                ? '💡 Chart Legend: Green = Point/Advantage | Orange = Neutral | Red = Error/Lost'
                : '💡 วิธีอ่านกราฟ: เขียว = ได้แต้ม/ได้เปรียบ | ส้ม = ประคองเกม | แดง = เสียแต้ม (Error)'}
            </span>
          </div>
        </div>
      )}

      {/* PLAYERS STATS VIEW */}
      {activeTab === 'players' && (
        <div className="flex-1 flex flex-col gap-2.5 overflow-hidden min-h-0">
          {/* Team Switcher for Player Stats */}
          <div className="flex gap-2 shrink-0 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner">
            {showHome && (
              <button
                onClick={() => setSelectedPlayerTeam('home')}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all border
                  ${selectedPlayerTeam === 'home' 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm font-extrabold' 
                    : 'bg-slate-900 border-slate-800 text-indigo-400 hover:bg-slate-800 hover:text-indigo-200'}
                `}
              >
                {teamNames.home} ({lang === 'en' ? 'HOME' : 'ทีมเหย้า'})
              </button>
            )}
            {showAway && (
              <button
                onClick={() => setSelectedPlayerTeam('away')}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all border
                  ${selectedPlayerTeam === 'away' 
                    ? 'bg-rose-600 border-rose-500 text-white shadow-sm font-extrabold' 
                    : 'bg-slate-900 border-slate-800 text-rose-400 hover:bg-slate-800 hover:text-rose-200'}
                `}
              >
                {teamNames.away} ({lang === 'en' ? 'AWAY' : 'ทีมเยือน'})
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 flex-1 min-h-0 flex flex-col overflow-hidden shadow-md">
            <h3 className={`text-[11px] sm:text-[12px] font-black px-3 py-2 border-b border-slate-800 flex items-center justify-between shrink-0 uppercase tracking-wider
              ${selectedPlayerTeam === 'home' ? 'text-indigo-400' : 'text-rose-400'}
            `}>
              <span>{t('playerStatsTitle')} - {selectedPlayerTeam === 'home' ? teamNames.home : teamNames.away}</span>
              <span className="text-[10px] text-slate-500 lowercase">({lang === 'en' ? 'click headers to sort, click row for details' : 'กดหัวตารางเพื่อเรียงลำดับ / กดแถวเพื่อดูรายละเอียดเพิ่มเติม'})</span>
            </h3>

            <div className="flex-1 overflow-auto custom-scrollbar p-1">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-extrabold text-[10px] uppercase bg-slate-950/40">
                    <th 
                      onClick={() => handleSort('number')}
                      className="py-2.5 px-3 w-12 text-center cursor-pointer hover:text-indigo-400 select-none transition-colors"
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        {t('playerNo')} {sortField === 'number' && (sortAscending ? '▲' : '▼')}
                      </div>
                    </th>
                    <th className="py-2.5 px-3 min-w-[100px]">{t('playerName')}</th>
                    <th 
                      onClick={() => handleSort('starter')}
                      className="py-2.5 px-2 w-16 text-center cursor-pointer hover:text-indigo-400 select-none transition-colors"
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        {t('playerPos')} {sortField === 'starter' && (sortAscending ? '▲' : '▼')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('totalActions')}
                      className="py-2.5 px-2 w-20 text-center cursor-pointer hover:text-indigo-400 select-none transition-colors"
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        {t('totalActions')} {sortField === 'totalActions' && (sortAscending ? '▲' : '▼')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('successRate')}
                      className="py-2.5 px-2 w-28 text-center cursor-pointer hover:text-indigo-400 select-none transition-colors"
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        {lang === 'en' ? 'Performance Ratio' : 'อัตราส่วนผลงาน'} {sortField === 'successRate' && (sortAscending ? '▲' : '▼')}
                      </div>
                    </th>
                    {SKILLS.map(s => (
                      <th key={s.id} className="py-2.5 px-1.5 text-center w-24">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black text-white ${s.colorActive.split(' ')[0]}`}>
                          {s.label.split(' ')[0]}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {sortedPlayerStats[selectedPlayerTeam].map(p => {
                    const hasData = p.totalActions > 0;
                    return (
                      <tr 
                        key={p.num} 
                        onClick={() => setSelectedPlayerForModal(p)}
                        className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-[11px] border
                            ${p.isStarter 
                              ? 'bg-indigo-950 text-indigo-400 border-indigo-500/50 shadow-[0_0_6px_rgba(99,102,241,0.2)]' 
                              : 'bg-slate-950 text-slate-500 border-slate-850'
                            }
                          `}>
                            {p.num}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-200">
                          <div className="flex flex-col">
                            <span className="truncate max-w-[120px]">{p.name || '-'}</span>
                            <span className="text-[9px] text-slate-500 font-bold lowercase">
                              {p.isStarter ? (lang === 'en' ? 'starter' : 'ตัวจริง') : (lang === 'en' ? 'sub' : 'สำรอง')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`font-extrabold text-[9px] px-1.5 py-0.5 rounded border uppercase
                            ${p.position === 'S' ? 'bg-indigo-950 text-indigo-400 border-indigo-500/30' :
                              p.position === 'OH' ? 'bg-sky-950 text-sky-400 border-sky-500/30' :
                              p.position === 'OP' ? 'bg-teal-950 text-teal-400 border-teal-500/30' :
                              p.position === 'MB' ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' :
                              p.position === 'L' ? 'bg-amber-950 text-amber-400 border-amber-500/30' :
                              'bg-slate-950 text-slate-400 border-slate-800'
                            }
                          `}>
                            {p.position || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-300 font-mono">
                          {p.totalActions}
                        </td>
                        <td className="py-3 px-2">
                          {hasData ? (
                            <div className="flex flex-col gap-1 px-1">
                              <div className="flex justify-between text-[9px] font-mono leading-none">
                                <span className="text-emerald-400 font-extrabold">+{p.successRate}%</span>
                                <span className="text-rose-400 font-extrabold">-{p.errorRate}%</span>
                              </div>
                              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden flex border border-slate-800/50 shrink-0">
                                <div style={{ width: `${p.successRate}%` }} className="bg-emerald-500 h-full transition-all" />
                                <div style={{ width: `${100 - parseFloat(p.successRate) - parseFloat(p.errorRate)}%` }} className="bg-slate-700 h-full" />
                                <div style={{ width: `${p.errorRate}%` }} className="bg-rose-500 h-full" />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[10px] block text-center italic">-</span>
                          )}
                        </td>
                        {SKILLS.map(s => {
                          const sStats = p.skills[s.id];
                          const sTotal = sStats?.total || 0;
                          
                          if (sTotal === 0) {
                            return (
                              <td key={s.id} className="py-3 px-1.5 text-center text-slate-600 font-mono text-[10px] italic">
                                -
                              </td>
                            );
                          }
                          
                          const pos = sStats.perfect + sStats.good;
                          const neg = sStats.error + sStats.blocked;
                          
                          return (
                            <td key={s.id} className="py-3 px-1.5 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-black text-slate-300 font-mono text-[10px]">{sTotal}</span>
                                <div className="flex gap-0.5 text-[8px] font-mono mt-0.5">
                                  {pos > 0 && <span className="text-emerald-400 font-bold bg-emerald-950/40 px-0.5 rounded leading-none">+{pos}</span>}
                                  {neg > 0 && <span className="text-rose-400 font-bold bg-rose-950/40 px-0.5 rounded leading-none">-{neg}</span>}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Explanation Legend */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 mt-1 shadow-sm shrink-0 flex items-center">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold leading-relaxed">
              {lang === 'en' 
                ? '💡 Stats Legend: Main number = Count | (+1 Green) = Scored | (-1 Red) = Error | EFF = Net Efficiency'
                : '💡 วิธีอ่านสถิติ: ตัวเลขหลัก = จำนวนครั้ง | (+1 เขียว) = ได้แต้ม | (-1 แดง) = เสียแต้ม | EFF = ประสิทธิภาพสุทธิ'}
            </span>
          </div>
        </div>
      )}

      {/* HEATMAP / ATTACK ZONES VIEW */}
      {activeTab === 'heatmap' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 flex flex-col gap-2 min-h-0">
          <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 shadow-md shrink-0">
            <h3 className="text-[11px] sm:text-[13px] font-black text-slate-300 mb-4 uppercase tracking-wider text-center border-b border-slate-800 pb-2">
              {t('heatmapTitle')}
            </h3>
            
            <div className={`flex justify-around items-center gap-6 py-2 ${role === ROLES.COACH ? 'flex-col sm:flex-row' : 'flex-col'}`}>
              <div className="flex flex-col items-center bg-slate-950/50 p-4 rounded-2xl border border-slate-800 shadow-inner w-full sm:w-auto">
                <span className="text-[11px] sm:text-xs font-black text-indigo-400 mb-3 tracking-widest uppercase bg-indigo-900/20 px-4 py-1.5 rounded-lg border border-indigo-900/40">
                  {t('attackDirections').replace('{team}', teamNames.home)}
                </span>
                <HeatmapCourt strengths={zoneDistribution.home.strengths} weaknesses={zoneDistribution.home.weaknesses} />
              </div>

              <div className="flex flex-col items-center bg-slate-950/50 p-4 rounded-2xl border border-slate-800 shadow-inner w-full sm:w-auto">
                <span className="text-[11px] sm:text-xs font-black text-rose-400 mb-3 tracking-widest uppercase bg-rose-900/20 px-4 py-1.5 rounded-lg border border-rose-900/40">
                  {t('attackDirections').replace('{team}', teamNames.away)}
                </span>
                <HeatmapCourt strengths={zoneDistribution.away.strengths} weaknesses={zoneDistribution.away.weaknesses} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-center gap-6 text-[10px] sm:text-[11px]">
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-emerald-900 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                <span className="text-slate-300 font-bold">{t('excellentPoints')}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="w-3.5 h-3.5 bg-rose-500 rounded-full ring-2 ring-rose-900 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                <span className="text-slate-300 font-bold">{t('errorsFaults')}</span>
              </div>
            </div>
          </div>

          {/* Explanation Legend */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 mt-1 shadow-sm shrink-0 flex items-center">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold leading-relaxed">
              {lang === 'en' 
                ? '💡 Heatmap Legend: Opponent court (front on top, back on bottom) | 🟩 Green = High score | 🟫 Brown/Red = High error/blocked'
                : '💡 วิธีอ่าน Heatmap: จำลองแดนคู่แข่ง (แดนหน้าอยู่บน แดนหลังอยู่ล่าง) | 🟩 เขียว = ได้แต้มบ่อย | 🟫 น้ำตาล/แดง = ตีเสีย/ติดบล็อกบ่อย'}
            </span>
          </div>
        </div>
      )}

      {/* ROTATION (R1 - R6) VIEW - SPLIT APART AND DISPLAYED COMPACTLY ON ONE PAGE IN VERTICAL COLUMNS */}
      {activeTab === 'rotation' && (
        <div className="flex-1 flex flex-col gap-2.5 min-h-0">
          <div className={`flex-1 flex gap-2.5 min-h-0 overflow-y-auto custom-scrollbar ${role === ROLES.COACH ? 'flex-col md:flex-row' : 'flex-col'}`}>
             {showHome && (
               <div className="flex-1 min-w-0">
                 <RotationAnalysisView 
                   team="home" 
                   events={filteredEvents} 
                   teamName={teamNames.home} 
                   isHome={true}
                 />
               </div>
             )}
             {showAway && (
               <div className="flex-1 min-w-0">
                 <RotationAnalysisView 
                   team="away" 
                   events={filteredEvents} 
                   teamName={teamNames.away} 
                   isHome={false}
                 />
               </div>
             )}
          </div>

          {/* Explanation Legend */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 mt-1 shadow-sm shrink-0 flex items-center">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold leading-relaxed">
              {lang === 'en' 
                ? '💡 Rotation Legend: High % = Strong rotation | 🟥 Red border = Critical rotation (adjust needed)'
                : '💡 วิธีอ่าน: เปอร์เซ็นต์สูง = หน้าเข้าทำดี | 🟥 กรอบสีแดง = หน้าวิกฤตที่เสียแต้มต่อเนื่อง (ควรแก้เกม)'}
            </span>
          </div>
        </div>
      )}

      {/* LOGS TAB VIEW */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 flex-1 min-h-0 flex flex-col overflow-hidden shadow-md">
          <h3 className="text-[11px] sm:text-[12px] font-black mb-1 text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-amber-500" /> {t('liveLogsTitle')}
          </h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1 mt-1.5">
            {filteredEvents.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-8 flex flex-col items-center gap-2">
                 <Activity className="w-6 h-6 opacity-40" />
                 <span>{t('noStatsLogged')}</span>
              </div>
            ) : (
              <>
                {isPortrait && filteredEvents.length > 1 && (
                  <div className="text-[8px] text-slate-500 text-center italic mb-1.5 bg-slate-950/40 py-1 rounded border border-slate-800/40 select-none">
                    {lang === 'en' ? `Showing last touch only (total ${filteredEvents.length})` : `แสดงจังหวะล่าสุดแถวเดียว (บันทึกสะสม ${filteredEvents.length} รายการ)`}
                  </div>
                )}
                {(isPortrait ? [...filteredEvents].reverse().slice(0, 1) : [...filteredEvents].reverse()).map(evt => (
                  <div key={evt.id} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg text-[10px] border border-slate-800 shadow-sm mb-0.5 hover:border-slate-600 transition-colors">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-1.5 h-4 shrink-0 rounded-full ${evt.team === 'home' ? 'bg-indigo-500' : 'bg-rose-500'}`}></span>
                      <span className="font-mono text-[9px] text-slate-400 shrink-0 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{evt.scoreAt}</span>
                      {evt.timestamp && (
                        <span className="font-mono text-[8px] text-slate-500 shrink-0 bg-slate-900/40 px-1 py-0.5 rounded border border-slate-800/30 select-none">
                          {new Date(evt.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      )}
                      <span className="font-black text-slate-200 shrink-0 bg-slate-800 px-1.5 py-0.5 rounded shadow-inner text-[11px]">#{evt.player}</span>
                      <span className="text-slate-300 truncate">
                        {evt.skill === 'substitute' || evt.skill === 'timeout' || evt.skill === 'foul' ? (
                          <span className="text-amber-400 font-bold">{evt.detail}</span>
                        ) : (
                          <span className="flex gap-1.5 items-center font-medium">
                            <span className="text-white bg-slate-800 px-1.5 rounded">{getLocalizedSkillLabel(evt.skill, lang).split(' ')[0]}</span>
                            {evt.startZone && <span className="text-[9px] text-slate-400 border border-slate-700 px-1 rounded bg-slate-900">R{evt.startZone}</span>}
                            {evt.endZone && <span className="text-slate-500 text-[9px] leading-none">➔</span>}
                            {evt.endZone && <span className="text-[9px] text-amber-500/90 border border-amber-900/40 px-1 rounded bg-amber-950/30">
                              {lang === 'en' ? `Target R${evt.endZone}` : `เป้าR${evt.endZone}`}
                            </span>}
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
                ))}
              </>
            )}
          </div>
        </div>
      )}
      {/* Detailed Player Stats Modal */}
      {selectedPlayerForModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[99999]">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-sm border bg-indigo-950 text-indigo-400 border-indigo-500/50">
                  {selectedPlayerForModal.num}
                </span>
                <div>
                  <h3 className="text-base font-black text-white">{selectedPlayerForModal.name || '-'}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className={`font-black text-[10px] px-2 py-0.5 rounded border leading-none
                      ${selectedPlayerForModal.position === 'S' ? 'bg-indigo-950 text-indigo-400 border-indigo-500/30' :
                        selectedPlayerForModal.position === 'OH' ? 'bg-sky-950 text-sky-400 border-sky-500/30' :
                        selectedPlayerForModal.position === 'OP' ? 'bg-teal-950 text-teal-400 border-teal-500/30' :
                        selectedPlayerForModal.position === 'MB' ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' :
                        selectedPlayerForModal.position === 'L' ? 'bg-amber-950 text-amber-400 border-amber-500/30' :
                        'bg-slate-950 text-slate-400 border-slate-800'
                      }
                    `}>
                      {selectedPlayerForModal.position || '-'}
                    </span>
                    <span>•</span>
                    <span>{selectedPlayerForModal.isStarter ? (lang === 'en' ? 'Starter' : 'ตัวจริง') : (lang === 'en' ? 'Substitute' : 'ตัวสำรอง')}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPlayerForModal(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
              {/* Summary Stats Card */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 grid grid-cols-3 gap-4 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">{t('totalActions')}</span>
                  <span className="text-xl font-black text-slate-200 font-mono">{selectedPlayerForModal.totalActions}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider block mb-1">{lang === 'en' ? 'Success' : 'ทำคะแนนดี'}</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">+{selectedPlayerForModal.successRate}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider block mb-1">{lang === 'en' ? 'Errors' : 'ทำเสีย'}</span>
                  <span className="text-xl font-black text-rose-400 font-mono">-{selectedPlayerForModal.errorRate}%</span>
                </div>
              </div>

              {/* Skills Breakdown Title */}
              <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
                {lang === 'en' ? 'Detailed Skills Breakdown' : 'วิเคราะห์ผลงานแยกตามทักษะ'}
              </h4>

              {/* Skills Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SKILLS.map(s => {
                  const sStats = selectedPlayerForModal.skills[s.id];
                  const sTotal = sStats?.total || 0;
                  
                  return (
                    <div key={s.id} className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black text-white ${s.colorActive.split(' ')[0]}`}>
                          {getLocalizedSkillLabel(s.id, lang)}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {lang === 'en' ? `Total: ${sTotal}` : `ทำทั้งหมด: ${sTotal}`}
                        </span>
                      </div>

                      {sTotal > 0 ? (
                        <div className="space-y-1.5 mt-1.5">
                          {/* Progress bar of evals */}
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden flex border border-slate-800/80 animate-pulse">
                            {sStats.perfect > 0 && <div style={{ width: `${(sStats.perfect / sTotal) * 100}%` }} className="bg-emerald-500 h-full" title="Perfect" />}
                            {sStats.good > 0 && <div style={{ width: `${(sStats.good / sTotal) * 100}%` }} className="bg-teal-500 h-full" title="Good" />}
                            {sStats.okay > 0 && <div style={{ width: `${(sStats.okay / sTotal) * 100}%` }} className="bg-slate-500 h-full" title="Okay" />}
                            {sStats.poor > 0 && <div style={{ width: `${(sStats.poor / sTotal) * 100}%` }} className="bg-orange-500 h-full" title="Poor" />}
                            {sStats.error > 0 && <div style={{ width: `${(sStats.error / sTotal) * 100}%` }} className="bg-red-500 h-full" title="Error" />}
                            {sStats.blocked > 0 && <div style={{ width: `${(sStats.blocked / sTotal) * 100}%` }} className="bg-rose-700 h-full" title="Blocked" />}
                          </div>

                          {/* Evaluation Counters Grid */}
                          <div className="grid grid-cols-3 gap-x-1.5 gap-y-1 text-[9px] font-mono text-slate-400 pt-1">
                            <div className="flex justify-between">
                              <span className="text-emerald-400 font-bold"># (${lang === 'en' ? 'Perf' : 'ดีเลิศ'}):</span>
                              <span className="text-slate-300 font-bold">{sStats.perfect}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-teal-400 font-bold">+ (${lang === 'en' ? 'Good' : 'ดี'}):</span>
                              <span className="text-slate-300 font-bold">{sStats.good}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-bold">! (${lang === 'en' ? 'Okay' : 'ปกติ'}):</span>
                              <span className="text-slate-300 font-bold">{sStats.okay}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-orange-400 font-bold">- (${lang === 'en' ? 'Poor' : 'พอใช้'}):</span>
                              <span className="text-slate-300 font-bold">{sStats.poor}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-red-400 font-bold">= (${lang === 'en' ? 'Err' : 'เสีย'}):</span>
                              <span className="text-slate-300 font-bold">{sStats.error}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-rose-500 font-bold">/ (${lang === 'en' ? 'Blk' : 'ติดบล็อก'}):</span>
                              <span className="text-slate-300 font-bold">{sStats.blocked}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600 italic block text-center mt-1 py-1 bg-slate-900/20 rounded border border-dashed border-slate-800/40">
                          {lang === 'en' ? 'No actions recorded' : 'ไม่มีข้อมูลการเล่น'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/20 flex justify-end">
              <button 
                onClick={() => setSelectedPlayerForModal(null)} 
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 shadow-md"
              >
                {lang === 'en' ? 'Close' : 'ปิดหน้าต่าง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState<'th' | 'en'>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved === 'en' || saved === 'th') ? saved : 'th';
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('app_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const handleSetLang = (newLang: 'th' | 'en') => {
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    let val = (translations[lang] as any)[key] || (translations['th'] as any)[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, String(v));
      });
    }
    return val;
  };

  const [user, setUser] = useState<any>(() => {
    return parseStoredJson(localStorage.getItem('volley_user'), null);
  });
  const [appState, setAppState] = useState(() => {
    const saved = localStorage.getItem('volley_user');
    return saved ? 'setup' : 'login';
  });
  const [loginForm, setLoginForm] = useState({ username: '', password: '', error: '' });
  const [adminMode, setAdminMode] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminExpiryDate, setAdminExpiryDate] = useState('');
  const [adminUnlimitedExpiry, setAdminUnlimitedExpiry] = useState(true);
  const [adminFormError, setAdminFormError] = useState('');
  const [adminFormSuccess, setAdminFormSuccess] = useState('');

  const [role, setRole] = useState(ROLES.UNASSIGNED);
  const [roomId, setRoomId] = useState('');
  const [activeRoom, setActiveRoom] = useState(null); 
  const [matchData, rawSetMatchData] = useState(ensureValidMatchDataLocal(INITIAL_MATCH_STATE));
  const setMatchData = (data: any) => {
    if (typeof data === 'function') {
      rawSetMatchData((prev: any) => ensureValidMatchDataLocal(data(prev)));
    } else {
      rawSetMatchData(ensureValidMatchDataLocal(data));
    }
  };

  const [loading, setLoading] = useState(true);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [lobbyError, setLobbyError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  const [activeMobileView, setActiveMobileView] = useState('court');
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [setEndData, setSetEndData] = useState(null);

  const [leftWidth, setLeftWidth] = useState(380);
  const [isActionLocked, setIsActionLocked] = useState(false);
  const [autoLiberoSwapEnabled, setAutoLiberoSwapEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('app_auto_libero');
    return saved !== 'false';
  });

  const triggerActionLock = () => {
    setIsActionLocked(true);
    setTimeout(() => {
      setIsActionLocked(false);
    }, 400);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(280, Math.min(600, startWidth + deltaX));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startWidth = leftWidth;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const touchMove = moveEvent.touches[0];
      const deltaX = touchMove.clientX - startX;
      const newWidth = Math.max(280, Math.min(600, startWidth + deltaX));
      setLeftWidth(newWidth);
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const [appFontSize, setAppFontSize] = useState(() => {
    const saved = localStorage.getItem('app_font_size');
    return saved ? parseInt(saved) : 16;
  });
  const [appZoom, setAppZoom] = useState(() => {
    const saved = localStorage.getItem('app_zoom');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [cachedFonts, setCachedFonts] = useState<{ regular: string | null; bold: string | null }>({
    regular: null,
    bold: null
  });

  useEffect(() => {
    const prefetchFonts = async () => {
      try {
        const getBaseUrl = () => {
          const url = window.location.href;
          return url.substring(0, url.lastIndexOf('/') + 1);
        };
        const baseUrl = getBaseUrl();
        
        const fetchFontBase64 = async (url: string) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result as string;
              const base64 = base64data.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        };

        const [regular, bold] = await Promise.all([
          fetchFontBase64(baseUrl + 'fonts/Sarabun-Regular.ttf'),
          fetchFontBase64(baseUrl + 'fonts/Sarabun-Bold.ttf')
        ]);
        setCachedFonts({ regular, bold });
        console.log('PDF fonts pre-cached successfully!');
      } catch (err) {
        console.error('Failed to pre-cache PDF fonts:', err);
      }
    };
    prefetchFonts();
  }, []);

  useEffect(() => {
    localStorage.setItem('app_font_size', appFontSize.toString());
    document.documentElement.style.fontSize = `${appFontSize}px`;
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [appFontSize]);

  useEffect(() => {
    localStorage.setItem('app_zoom', appZoom.toString());
  }, [appZoom]);

  useEffect(() => {
    const saved = localStorage.getItem('volley_user');
    const parsedUser = parseStoredJson<any | null>(saved, null);
    if (parsedUser) {
      if (parsedUser.expiresAt && new Date() > new Date(parsedUser.expiresAt)) {
        localStorage.removeItem('volley_user');
        setUser(null);
        setAppState('login');
      } else {
        setUser(parsedUser);
        setAppState('setup');
      }
    } else {
      setUser(null);
      setAppState('login');
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      setLoginForm(prev => ({ ...prev, error: t('loginErrorEmpty') }));
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password
        })
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (res.ok && data && typeof data === 'object') {
        localStorage.setItem('volley_user', JSON.stringify(data));
        setUser(data);
        setAppState('setup');
        setLoginForm({ username: '', password: '', error: '' });
      } else {
        const message = data?.error || (lang === 'en' ? 'An error occurred during login' : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
        setLoginForm(prev => ({ ...prev, error: message }));
      }
    } catch (err) {
      console.error(err);
      setLoginForm(prev => ({ ...prev, error: lang === 'en' ? 'Unable to connect to the server' : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('volley_user');
    setUser(null);
    setAppState('login');
    setActiveRoom(null);
    setRole(ROLES.UNASSIGNED);
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/users`, {
        headers: { 'x-admin-pin': '062026' }
      });
      if (res.ok) {
        let data: any = [];
        try {
          data = await res.json();
        } catch {
          data = [];
        }
        setAdminUsers(Array.isArray(data) ? data : []);
      } else {
        let errMessage = lang === 'en' ? 'Access denied' : 'ไม่มีสิทธิ์เข้าถึง';
        try {
          const err = await res.json();
          errMessage = err.error || errMessage;
        } catch {
          errMessage = errMessage;
        }
        setAdminPinError(errMessage);
        setIsAdminUnlocked(false);
      }
    } catch (e) {
      console.error(e);
      setAdminPinError(lang === 'en' ? 'Failed to load user data' : 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    }
  };

  const handleUnlockAdmin = async (pin: string) => {
    const targetPin = pin || adminPin;
    if (targetPin === '062026') {
      setIsAdminUnlocked(true);
      setAdminPinError('');
      setAdminMode(true);
      // Fetch users list
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/users`, {
          headers: { 'x-admin-pin': '062026' }
        });
        if (res.ok) {
          const data = await res.json();
          setAdminUsers(data);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setAdminPinError(lang === 'en' ? 'Invalid PIN' : 'PIN ไม่ถูกต้อง');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername || !adminPassword) {
      setAdminFormError(lang === 'en' ? 'Please enter Username and Password' : 'กรุณากรอก Username และ Password');
      return;
    }
    setAdminFormError('');
    setAdminFormSuccess('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': '062026'
        },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
          expiresAt: adminUnlimitedExpiry ? null : adminExpiryDate
        })
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (res.ok) {
        setAdminFormSuccess(lang === 'en' ? 'User created successfully' : 'สร้างผู้ใช้สำเร็จ');
        setAdminUsername('');
        setAdminPassword('');
        setAdminExpiryDate('');
        setAdminUnlimitedExpiry(true);
        fetchAdminUsers();
      } else {
        setAdminFormError(data?.error || (lang === 'en' ? 'Failed to create user' : 'เกิดข้อผิดพลาดในการสร้างผู้ใช้'));
      }
    } catch (err) {
      setAdminFormError(lang === 'en' ? 'Unable to connect to the server' : 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(lang === 'en' ? 'Are you sure you want to delete this user?' : 'คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': '062026' }
      });
      if (res.ok) {
        fetchAdminUsers();
      } else {
        let message = lang === 'en' ? 'Failed to delete user' : 'ไม่สามารถลบผู้ใช้ได้';
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          message = message;
        }
        alert(message);
      }
    } catch (err) {
      alert(lang === 'en' ? 'Unable to connect to the server' : 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleUpdateExpiry = async (userId: string, expiresAt: string | null) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/users/${userId}/expiry`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': '062026'
        },
        body: JSON.stringify({ expiresAt })
      });
      if (res.ok) {
        fetchAdminUsers();
      } else {
        let message = lang === 'en' ? 'Failed to update expiry date' : 'ไม่สามารถอัปเดตวันหมดอายุได้';
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          message = message;
        }
        alert(message);
      }
    } catch (err) {
      alert(lang === 'en' ? 'Unable to connect to the server' : 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/users/${userId}/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': '062026'
        },
        body: JSON.stringify({ password: newPassword })
      });
      if (res.ok) {
        alert(lang === 'en' ? 'Password changed successfully' : 'เปลี่ยนรหัสผ่านสำเร็จ');
      } else {
        let message = lang === 'en' ? 'Failed to change password' : 'ไม่สามารถเปลี่ยนรหัสผ่านได้';
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          message = message;
        }
        alert(message);
      }
    } catch (err) {
      alert(lang === 'en' ? 'Unable to connect to the server' : 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleToggleAdminRole = async (userId: string, isAdmin: boolean) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': '062026'
        },
        body: JSON.stringify({ isAdmin })
      });
      if (res.ok) {
        fetchAdminUsers();
      } else {
        let message = lang === 'en' ? 'Failed to modify permissions' : 'ไม่สามารถแก้ไขสิทธิ์ได้';
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          message = message;
        }
        alert(message);
      }
    } catch (err) {
      alert(lang === 'en' ? 'Unable to connect to the server' : 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };


  useEffect(() => {
    if (!activeRoom) return;

    // Fetch initial match state from MongoDB via REST
    const loadMatch = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/matches/${activeRoom}`);
        const data = await res.json();
        if (data.notFound) {
          // Initialize in MongoDB if not found
          await fetch(`${BACKEND_URL}/api/matches/${activeRoom}/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(INITIAL_MATCH_STATE)
          });
          setMatchData(INITIAL_MATCH_STATE);
        } else {
          setMatchData(data);
        }
      } catch (err) {
        console.error('Error fetching match from MongoDB, loading local backup:', err);
        const savedBackup = localStorage.getItem(`local_match_backup_${activeRoom}`);
        if (savedBackup) {
          try {
            const parsedBackup = JSON.parse(savedBackup);
            setMatchData(parsedBackup);
            console.log('Restored match state from local storage backup!');
          } catch (backupErr) {
            console.error('Error parsing local storage backup:', backupErr);
          }
        }
      }
    };

    loadMatch();

    // Connect to Socket.io and join the room
    socket.connect();
    socket.emit('join_room', activeRoom);

    // Re-join the room automatically if the socket reconnects after a signal drop
    socket.on('connect', () => {
      socket.emit('join_room', activeRoom);
    });

    // Listen to real-time updates from other clients
    socket.on('match_updated', (updatedData) => {
      setMatchData(updatedData);
    });

    return () => {
      socket.off('connect');
      socket.off('match_updated');
      socket.disconnect();
    };
  }, [activeRoom]);

  const checkSetEnd = (homeScore, awayScore, currentSet) => {
    const targetScore = currentSet === 5 ? 15 : 25;
    if (homeScore >= targetScore && homeScore - awayScore >= 2) return 'home';
    if (awayScore >= targetScore && awayScore - homeScore >= 2) return 'away';
    return null;
  };

  useEffect(() => {
    if (matchData.status === 'finished') {
      setSetEndData(null);
      return;
    }
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
  }, [matchData.score, matchData.setsWon, matchData.status]);

  useEffect(() => {
    if (matchData.status === 'finished') {
      setActiveMobileView('stats');
    }
  }, [matchData.status]);

  const applyAutoLiberoSwaps = (state: any) => {
    if (!state || !state.rotations || !state.roster || !autoLiberoSwapEnabled) return state;

    let updatedRotations = { ...state.rotations };
    let updatedSwaps = { ...(state.liberoSwaps || {}) };
    let updatedEvents = [...(state.events || [])];
    let changed = false;

    const getLiberoNumber = (team: string) => {
      const roster = state.roster[team] || {};
      const entry = Object.entries(roster).find(([_, details]) => (details as any).position === 'L');
      return entry ? entry[0] : null;
    };

    const getMBs = (team: string) => {
      const roster = state.roster[team] || {};
      return Object.entries(roster)
        .filter(([_, details]) => (details as any).position === 'MB')
        .map(([num]) => num);
    };

    ['home', 'away'].forEach(team => {
      const liberoNum = getLiberoNumber(team);
      if (!liberoNum) return;

      let teamRot = [...(updatedRotations[team] || [])];
      if (teamRot.length !== 6) return;

      if (!updatedSwaps[team]) updatedSwaps[team] = {};
      
      const mbs = getMBs(team);
      const isServing = state.currentServe === team;

      // 1. Libero to front row must swap out
      [1, 2, 3].forEach(idx => {
        if (teamRot[idx] === liberoNum) {
          const zoneId = idx + 1;
          const originalPlayer = updatedSwaps[team][zoneId] || mbs[0];
          teamRot[idx] = originalPlayer;
          updatedSwaps[team][zoneId] = null;
          changed = true;

          updatedEvents.push({
            id: `auto-swap-out-${Date.now()}-${team}-${zoneId}`,
            timestamp: Date.now(),
            scoreAt: `[${state.score?.home || 0}-${state.score?.away || 0}]`,
            team: team,
            player: liberoNum,
            skill: "libero_swap",
            eval: "#",
            startZone: zoneId,
            endZone: null,
            detail: lang === 'en' ? `Auto: Libero out, #${originalPlayer} in` : `อัตโนมัติ: ลิเบอโร่ออก, #${originalPlayer} กลับเข้าสนาม`
          });
        }
      });

      // 2. Receiving team: swap Libero in for any MB in back row
      if (!isServing) {
        [0, 5, 4].forEach(idx => {
          const currentPlayer = teamRot[idx];
          const isLiberoOnCourt = teamRot.includes(liberoNum);
          if (mbs.includes(currentPlayer) && !isLiberoOnCourt) {
            const zoneId = idx + 1;
            updatedSwaps[team][zoneId] = currentPlayer;
            teamRot[idx] = liberoNum;
            changed = true;

            updatedEvents.push({
              id: `auto-swap-in-${Date.now()}-${team}-${zoneId}`,
              timestamp: Date.now(),
              scoreAt: `[${state.score?.home || 0}-${state.score?.away || 0}]`,
              team: team,
              player: currentPlayer,
              skill: "libero_swap",
              eval: "#",
              startZone: zoneId,
              endZone: null,
              detail: lang === 'en' ? `Auto: Libero in for #${currentPlayer}` : `อัตโนมัติ: ลิเบอโร่ลงแทน #${currentPlayer}`
            });
          }
        });
      }
      
      // 3. Serving team: Libero cannot serve, swap out back to original MB in zone R1
      if (isServing && teamRot[0] === liberoNum) {
        const zoneId = 1;
        const originalPlayer = updatedSwaps[team][zoneId] || mbs[0];
        teamRot[0] = originalPlayer;
        updatedSwaps[team][zoneId] = null;
        changed = true;

        updatedEvents.push({
          id: `auto-swap-out-serve-${Date.now()}-${team}-1`,
          timestamp: Date.now(),
          scoreAt: `[${state.score?.home || 0}-${state.score?.away || 0}]`,
          team: team,
          player: liberoNum,
          skill: "libero_swap",
          eval: "#",
          startZone: 1,
          endZone: null,
          detail: lang === 'en' ? `Auto: Libero out for server #${originalPlayer}` : `อัตโนมัติ: ลิเบอโร่ออกให้ #${originalPlayer} เสิร์ฟ`
        });
      }

      if (changed) {
        updatedRotations[team] = teamRot;
      }
    });

    if (changed) {
      return {
        ...state,
        rotations: updatedRotations,
        liberoSwaps: updatedSwaps,
        events: updatedEvents
      };
    }
    return state;
  };

  const syncMatchState = (nextState: any) => {
    const finalState = applyAutoLiberoSwaps(nextState);
    setMatchData(finalState);
    if (activeRoom) {
      try {
        localStorage.setItem(`local_match_backup_${activeRoom}`, JSON.stringify(finalState));
      } catch (err) {
        console.error('Error writing match backup to localStorage:', err);
      }
      socket.emit('update_match', { roomId: activeRoom, matchData: finalState });
    }
  };

  const handleCreateRoom = async (selectedId) => {
    if (!user) return;
    const cleanId = selectedId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!cleanId) {
      setLobbyError(lang === 'en' ? 'Please enter a valid room ID (letters/numbers)' : 'กรุณากรอกรหัสห้องให้ถูกต้อง (อังกฤษ/ตัวเลข)');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/matches/${cleanId}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...INITIAL_MATCH_STATE,
          createdBy: user.username
        })
      });
      if (res.ok) {
        setActiveRoom(cleanId);
        setLobbyError('');
      } else {
        setLobbyError(lang === 'en' ? 'Unable to create this room' : 'ไม่สามารถสร้างห้องนี้ได้');
      }
    } catch (e) {
      console.error(e);
      setLobbyError(lang === 'en' ? 'Error creating room, please try another code' : 'เกิดข้อผิดพลาดในการสร้างห้อง โปรดลองรหัสอื่น');
    }
    setLoading(false);
  };

  const handleJoinRoom = async (selectedId) => {
    if (!user) return;
    const cleanId = selectedId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!cleanId) {
      setLobbyError(lang === 'en' ? 'Please enter the room code to join' : 'กรุณากรอกรหัสห้องที่จะเข้าร่วม');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/matches/${cleanId}`);
      const data = await res.json();
      if (data.notFound) {
        setLobbyError(lang === 'en' ? 'Room not found' : 'ไม่พบรหัสห้องนี้ในระบบ');
      } else {
        setActiveRoom(cleanId);
        setLobbyError('');
      }
    } catch (e) {
      console.error(e);
      setLobbyError(lang === 'en' ? 'Unable to connect to server to join room' : 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อเข้าร่วมห้องได้');
    }
    setLoading(false);
  };

  const handleUpdateServe = (team) => {
    const nextState = { ...matchData, currentServe: team };
    syncMatchState(nextState);
  };

  const handleUpdateScore = (team, increment) => {
    triggerActionLock();
    if (setEndData) return;
    if (increment > 0 && matchData.tempRallyEvents && matchData.tempRallyEvents.length > 0) {
      handleCommitRally(team);
      return;
    }
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

    const sZoneHome = getSetterZone(matchData.rotations?.home || [], matchData.roster?.home || {});
    const sZoneAway = getSetterZone(matchData.rotations?.away || [], matchData.roster?.away || {});

    let addedEvents = [];
    if (increment > 0) {
      addedEvents = [{
        id: Date.now().toString(),
        timestamp: Date.now(),
        scoreAt: `[${matchData.score.home}-${matchData.score.away}]`,
        setterZoneHome: sZoneHome,
        setterZoneAway: sZoneAway,
        team: team,
        player: "TEAM",
        skill: "point",
        eval: "#",
        detail: lang === 'en' ? `Point won by ${matchData.teamNames[team]}` : `ได้แต้มปกติสำหรับทีม ${matchData.teamNames[team]}`,
        pointWonBy: team
      }];
    }

    const nextState = {
      ...matchData,
      score: {
        ...matchData.score,
        [team]: newScore
      },
      currentServe: nextServe,
      rotations: newRotations,
      events: addedEvents.length > 0 ? [...(matchData.events || []), ...addedEvents] : (matchData.events || [])
    };
    syncMatchState(nextState);
  };

  const handleNextSet = () => {
    if (!setEndData) return;
    const winner = setEndData.winner;
    const newSetsWon = { ...(matchData.setsWon || { home: 0, away: 0 }) };
    newSetsWon[winner] += 1;

    let nextState;
    if (setEndData.isMatchOver) {
      const completedSetScore = {
        setNum: matchData.score.set,
        home: matchData.score.home,
        away: matchData.score.away,
        winner
      };
      const newSetScores = [...(matchData.setScores || []), completedSetScore];
      nextState = {
        ...matchData,
        status: 'finished',
        setsWon: newSetsWon,
        setScores: newSetScores
      };
    } else {
      const completedSetScore = {
        setNum: matchData.score.set,
        home: matchData.score.home,
        away: matchData.score.away,
        winner
      };
      const newSetScores = [...(matchData.setScores || []), completedSetScore];
      nextState = {
        ...matchData,
        score: { home: 0, away: 0, set: matchData.score.set + 1 },
        setsWon: newSetsWon,
        currentServe: null,
        tempRallyEvents: [],
        timeouts: { home: 0, away: 0 },
        setScores: newSetScores
      };
    }
    syncMatchState(nextState);
    setSetEndData(null);
  };

  const handleManualEndSet = (winner: 'home' | 'away') => {
    const newSetsWon = { ...(matchData.setsWon || { home: 0, away: 0 }) };
    newSetsWon[winner] += 1;
    const isMatchOver = newSetsWon[winner] >= 3;

    const completedSetScore = {
      setNum: matchData.score.set,
      home: matchData.score.home,
      away: matchData.score.away,
      winner
    };
    const newSetScores = [...(matchData.setScores || []), completedSetScore];

    const nextState = {
      ...matchData,
      status: isMatchOver ? 'finished' : 'ongoing',
      score: { home: 0, away: 0, set: isMatchOver ? matchData.score.set : matchData.score.set + 1 },
      setsWon: newSetsWon,
      currentServe: null,
      tempRallyEvents: [],
      timeouts: { home: 0, away: 0 },
      setScores: newSetScores
    };
    syncMatchState(nextState);
    alert(lang === 'en' ? `Set over! Team ${matchData.teamNames[winner]} won set ${matchData.score.set}` : `จบเซต! ทีม ${matchData.teamNames[winner]} ชนะเซตที่ ${matchData.score.set}`);
  };

  const handleManualEndMatch = (winner: 'home' | 'away') => {
    const newSetsWon = { ...(matchData.setsWon || { home: 0, away: 0 }) };
    newSetsWon[winner] = Math.max(newSetsWon[winner], 3);

    const nextState = {
      ...matchData,
      status: 'finished',
      setsWon: newSetsWon
    };
    syncMatchState(nextState);
    alert(lang === 'en' ? `Match over! Winner: ${matchData.teamNames[winner]}` : `จบการแข่งขัน! ผู้ชนะการแข่งขัน: ${matchData.teamNames[winner]}`);
  };

  const handleResumeMatch = () => {
    const nextState = {
      ...matchData,
      status: 'ongoing'
    };
    syncMatchState(nextState);
    alert(lang === 'en' ? 'Returned to the main match successfully' : 'กลับเข้าสู่การแข่งขันหลักเรียบร้อย');
  };

  const rotateTeamClockwise = (team) => {
    const currentRot = [...matchData.rotations[team]];
    const nextRot = [
      currentRot[1], currentRot[2], currentRot[3], 
      currentRot[4], currentRot[5], currentRot[0]  
    ];
    const nextState = {
      ...matchData,
      rotations: {
        ...matchData.rotations,
        [team]: nextRot
      }
    };
    syncMatchState(nextState);
  };

  const handleAddToTempRally = (eventData) => {
    triggerActionLock();
    const newTempEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      set: matchData.score.set,
      ...eventData
    };

    // Check if evaluation ends the rally (point-winning/losing evaluation)
    const isRallyEnd = eventData.eval === '#' || eventData.eval === '=' || eventData.eval === '/';

    if (isRallyEnd) {
      const winningTeam = eventData.eval === '#' 
        ? eventData.team 
        : (eventData.team === 'home' ? 'away' : 'home');
      
      handleCommitRallyWithEvents([...(matchData.tempRallyEvents || []), newTempEvent], winningTeam);
    } else {
      const nextState = {
        ...matchData,
        tempRallyEvents: [...(matchData.tempRallyEvents || []), newTempEvent]
      };
      syncMatchState(nextState);
    }
  };

  const handleClearTempRally = () => {
    triggerActionLock();
    const nextState = {
      ...matchData,
      tempRallyEvents: []
    };
    syncMatchState(nextState);
  };

  const handleCommitRally = (winningTeam) => {
    triggerActionLock();
    handleCommitRallyWithEvents(matchData.tempRallyEvents || [], winningTeam);
  };

  const handleCommitRallyWithEvents = (rallyEvents, winningTeam) => {
    if (setEndData) return;
    const scoreText = `[${matchData.score.home}-${matchData.score.away}]`;
    const sZoneHome = getSetterZone(matchData.rotations?.home || [], matchData.roster?.home || {});
    const sZoneAway = getSetterZone(matchData.rotations?.away || [], matchData.roster?.away || {});

    let finalEventsToCommit;
    if (rallyEvents.length === 0) {
      finalEventsToCommit = [{
        id: Date.now().toString(),
        timestamp: Date.now(),
        scoreAt: scoreText,
        setterZoneHome: sZoneHome,
        setterZoneAway: sZoneAway,
        team: winningTeam,
        player: "TEAM",
        skill: "point",
        eval: "#",
        detail: lang === 'en' ? `Point won by ${matchData.teamNames[winningTeam]}` : `ได้แต้มโดยทีม ${matchData.teamNames[winningTeam]}`,
        pointWonBy: winningTeam,
        set: matchData.score.set
      }];
    } else {
      finalEventsToCommit = rallyEvents.map((evt, idx) => {
        const isLast = idx === rallyEvents.length - 1;
        return {
          ...evt,
          scoreAt: scoreText,
          setterZoneHome: sZoneHome,
          setterZoneAway: sZoneAway,
          set: evt.set || matchData.score.set,
          ...(isLast ? { pointWonBy: winningTeam } : {})
        };
      });
    }

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

    const nextState = {
      ...matchData,
      events: [...(matchData.events || []), ...finalEventsToCommit],
      tempRallyEvents: [],
      score: {
        ...matchData.score,
        [winningTeam]: newScore
      },
      currentServe: nextServe,
      rotations: newRotations
    };
    syncMatchState(nextState);
  };

  const handleAddEvent = (eventData) => {
    const sZoneHome = getSetterZone(matchData.rotations?.home || [], matchData.roster?.home || {});
    const sZoneAway = getSetterZone(matchData.rotations?.away || [], matchData.roster?.away || {});

    const newEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      scoreAt: `[${matchData.score.home}-${matchData.score.away}]`,
      setterZoneHome: sZoneHome,
      setterZoneAway: sZoneAway,
      set: matchData.score.set,
      ...eventData
    };

    const nextState = {
      ...matchData,
      events: [...(matchData.events || []), newEvent]
    };
    syncMatchState(nextState);
  };

  const handleUndoLastEvent = () => {
    triggerActionLock();
    if (matchData.tempRallyEvents && matchData.tempRallyEvents.length > 0) {
      const nextState = {
        ...matchData,
        tempRallyEvents: matchData.tempRallyEvents.slice(0, -1)
      };
      syncMatchState(nextState);
      return;
    }

    if (matchData.events && matchData.events.length > 0) {
      let lastEvent = null;
      let lastEventIndex = -1;

      if (role === ROLES.COACH) {
        lastEventIndex = matchData.events.length - 1;
        lastEvent = matchData.events[lastEventIndex];
      } else {
        // Find last event for this team
        for (let i = matchData.events.length - 1; i >= 0; i--) {
          if (matchData.events[i].team === role) {
            lastEvent = matchData.events[i];
            lastEventIndex = i;
            break;
          }
        }
      }

      if (!lastEvent) {
        alert(lang === 'en' ? "No events found to undo for your team." : "ไม่พบเหตุการณ์สำหรับทีมของคุณที่จะยกเลิก");
        return;
      }
      
      let nextScore = { ...matchData.score };
      let nextRotations = { ...matchData.rotations };
      let nextRoster = { ...matchData.roster };
      let nextSwaps = { ...matchData.liberoSwaps };
      let nextServe = matchData.currentServe;

      if (lastEvent.pointWonBy) {
        const winner = lastEvent.pointWonBy;
        nextScore[winner] = Math.max(0, nextScore[winner] - 1);
        
        let prevServe = null;
        for (let i = lastEventIndex - 1; i >= 0; i--) {
          const evt = matchData.events[i];
          if (evt.pointWonBy) {
            prevServe = evt.pointWonBy;
            break;
          }
        }
        
        if (prevServe && prevServe !== winner) {
          const currentRot = [...nextRotations[winner]];
          nextRotations[winner] = [
            currentRot[5], currentRot[0], currentRot[1],
            currentRot[2], currentRot[3], currentRot[4]
          ];
        }
        nextServe = prevServe;
      }

      if (lastEvent.skill === 'libero_swap') {
        const zoneId = lastEvent.startZone;
        const team = lastEvent.team;
        const idx = zoneId - 1;
        if (nextSwaps[team] && nextSwaps[team][zoneId]) {
          nextRotations[team][idx] = nextSwaps[team][zoneId];
          nextSwaps[team][zoneId] = null;
        }
      }

      if (lastEvent.skill === 'substitute' && lastEvent.subOut && lastEvent.subIn) {
        const team = lastEvent.team;
        const subOut = lastEvent.subOut;
        const subIn = lastEvent.subIn;
        
        nextRotations[team] = matchData.rotations[team].map(num => num === subIn ? subOut : num);
        nextRoster[team] = { ...matchData.roster[team] };
        if (nextRoster[team][subOut]) nextRoster[team][subOut].isStarter = true;
        if (nextRoster[team][subIn]) nextRoster[team][subIn].isStarter = false;
      }

      const nextState = {
        ...matchData,
        score: nextScore,
        rotations: nextRotations,
        roster: nextRoster,
        liberoSwaps: nextSwaps,
        currentServe: nextServe,
        events: matchData.events.filter(e => e.id !== lastEvent.id)
      };
      syncMatchState(nextState);
    }
  };

  const handleUpdateRoster = (team, newRotations, newRoster, customNames = null, newMatchInfo = null) => {
    const normalizedRotations = Array.isArray(newRotations) && newRotations.length === 6 ? newRotations : [...(matchData.rotations?.[team] || [])];
    const normalizedRoster = newRoster && typeof newRoster === 'object' ? newRoster : { ...(matchData.roster?.[team] || {}) };

    const nextState = {
      ...matchData,
      rotations: {
        ...matchData.rotations,
        [team]: normalizedRotations
      },
      roster: {
        ...matchData.roster,
        [team]: normalizedRoster
      }
    };
    if (customNames) {
      nextState.teamNames = customNames;
    }
    if (newMatchInfo) {
      nextState.matchInfo = newMatchInfo;
    }
    syncMatchState(nextState);
    setIsSetupModalOpen(false);
  };

  const handleTimeout = (team) => {
    triggerActionLock();
    const currentTO = matchData.timeouts?.[team] || 0;
    if (currentTO >= 2) return; 

    const textNum = currentTO + 1;
    const sZoneHome = getSetterZone(matchData.rotations?.home || [], matchData.roster?.home || {});
    const sZoneAway = getSetterZone(matchData.rotations?.away || [], matchData.roster?.away || {});

    const newEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      scoreAt: `[${matchData.score.home}-${matchData.score.away}]`,
      setterZoneHome: sZoneHome,
      setterZoneAway: sZoneAway,
      team: team,
      player: "TEAM",
      skill: "timeout",
      eval: "!",
      startZone: null,
      endZone: null,
      detail: lang === 'en' ? `Timeout #${textNum}` : `ขอเวลานอกครั้งที่ ${textNum}`
    };

    const nextState = {
      ...matchData,
      timeouts: {
        ...matchData.timeouts,
        [team]: textNum
      },
      events: [...(matchData.events || []), newEvent]
    };
    syncMatchState(nextState);
  };

  const handleReduceTimeout = (team) => {
    const currentTO = matchData.timeouts?.[team] || 0;
    if (currentTO <= 0) return;

    const nextState = {
      ...matchData,
      timeouts: {
        ...matchData.timeouts,
        [team]: currentTO - 1
      },
      events: (() => {
        const events = [...(matchData.events || [])];
        for (let i = events.length - 1; i >= 0; i--) {
          if (events[i].team === team && events[i].skill === 'timeout') {
            events.splice(i, 1);
            break;
          }
        }
        return events;
      })()
    };
    syncMatchState(nextState);
  };

  const handleSubstitution = (team, targetNum, subNum) => {
    triggerActionLock();
    const currentRotation = Array.isArray(matchData.rotations?.[team]) ? matchData.rotations[team] : [];
    if (!currentRotation.length) {
      alert(lang === 'en' ? 'Rotation data is missing.' : 'ข้อมูลตำแหน่งหมุนไม่ครบ');
      return;
    }
    const updatedRot = currentRotation.map(num => num === targetNum ? subNum : num);
    const updatedRoster = { ...(matchData.roster?.[team] || {}) };
    if (updatedRoster[targetNum]) updatedRoster[targetNum].isStarter = false;
    if (updatedRoster[subNum]) updatedRoster[subNum].isStarter = true;

    const sZoneHome = team === 'home'
      ? getSetterZone(updatedRot, updatedRoster)
      : getSetterZone(matchData.rotations?.home || [], matchData.roster?.home || {});
    const sZoneAway = team === 'away'
      ? getSetterZone(updatedRot, updatedRoster)
      : getSetterZone(matchData.rotations?.away || [], matchData.roster?.away || {});

    const newEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      scoreAt: `[${matchData.score.home}-${matchData.score.away}]`,
      setterZoneHome: sZoneHome,
      setterZoneAway: sZoneAway,
      team: team,
      player: targetNum,
      skill: "substitute",
      eval: "#",
      startZone: null,
      endZone: null,
      detail: lang === 'en' ? `Sub: #${subNum} in for #${targetNum}` : `เปลี่ยนตัว: ${subNum} ลงแทน ${targetNum}`,
      subOut: targetNum,
      subIn: subNum
    };

    const nextState = {
      ...matchData,
      rotations: {
        ...matchData.rotations,
        [team]: updatedRot
      },
      roster: {
        ...matchData.roster,
        [team]: updatedRoster
      },
      events: [...(matchData.events || []), newEvent]
    };
    syncMatchState(nextState);
  };

  const handleLiberoQuickSwap = (team, zoneId) => {
    triggerActionLock();
    const teamRoster = matchData.roster?.[team] || {};
    const currentRotation = Array.isArray(matchData.rotations?.[team]) ? matchData.rotations[team] : [];
    if (!currentRotation.length) {
      alert(lang === 'en' ? 'Rotation data is missing.' : 'ข้อมูลหมุนตำแหน่งไม่ครบ');
      return;
    }
    const liberoEntry = Object.entries(teamRoster).find(([_, details]) => (details as any).position === 'L');
    if (!liberoEntry) {
      alert(lang === 'en' 
        ? "No Libero (L) found in the roster. Please add a Libero first in Setup." 
        : "ไม่พบผู้เล่นตำแหน่งลิเบอโร่ (L) ในรายชื่อกรุณาตั้งค่ารายชื่อนักกีฬาก่อน");
      return;
    }
    const liberoNum = liberoEntry[0];
    
    const idx = zoneId - 1;
    const currentPlayer = currentRotation[idx];
    const isCurrentLibero = currentPlayer === liberoNum;
    
    let updatedRot = [...currentRotation];
    let updatedSwaps = { ...(matchData.liberoSwaps || {}) };
    if (!updatedSwaps[team]) updatedSwaps[team] = {};
    
    if (isCurrentLibero) {
      const originalPlayer = updatedSwaps[team][zoneId];
      if (!originalPlayer) {
        alert(lang === 'en' ? "Original player not found to swap back." : "ไม่พบข้อมูลผู้เล่นเดิมที่จะสลับกลับ");
        return;
      }
      updatedRot[idx] = originalPlayer;
      updatedSwaps[team][zoneId] = null;
    } else {
      const liberoIndex = currentRotation.indexOf(liberoNum);
      if (liberoIndex !== -1) {
        alert(lang === 'en' 
          ? `Libero is already on court in Position ${liberoIndex + 1}` 
          : `ลิเบอโร่อยู่ในสนามแล้วที่ตำแหน่ง ${liberoIndex + 1}`);
        return;
      }
      updatedSwaps[team][zoneId] = currentPlayer;
      updatedRot[idx] = liberoNum;
    }

    const sZoneHome = team === 'home' 
      ? getSetterZone(updatedRot, matchData.roster?.home || {}) 
      : getSetterZone(matchData.rotations?.home || [], matchData.roster?.home || {});
    const sZoneAway = team === 'away' 
      ? getSetterZone(updatedRot, matchData.roster?.away || {}) 
      : getSetterZone(matchData.rotations?.away || [], matchData.roster?.away || {});

    const newEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      scoreAt: `[${matchData.score.home}-${matchData.score.away}]`,
      setterZoneHome: sZoneHome,
      setterZoneAway: sZoneAway,
      team: team,
      player: isCurrentLibero ? liberoNum : currentPlayer,
      skill: "libero_swap",
      eval: "#",
      startZone: zoneId,
      endZone: null,
      detail: isCurrentLibero 
        ? (lang === 'en' ? `Libero out, #${updatedSwaps[team][zoneId]} in` : `ลิเบอโร่ออก, #${updatedSwaps[team][zoneId]} กลับเข้าสนาม`)
        : (lang === 'en' ? `Libero in for #${currentPlayer}` : `ลิเบอโร่ลงแทน #${currentPlayer}`)
    };

    const nextState = {
      ...matchData,
      rotations: {
        ...matchData.rotations,
        [team]: updatedRot
      },
      liberoSwaps: updatedSwaps,
      events: [...(matchData.events || []), newEvent]
    };
    syncMatchState(nextState);
  };

  const handleFoul = (team, foulType) => {
    triggerActionLock();
    const sZoneHome = getSetterZone(matchData.rotations?.home || [], matchData.roster?.home || {});
    const sZoneAway = getSetterZone(matchData.rotations?.away || [], matchData.roster?.away || {});
    const opponent = team === 'home' ? 'away' : 'home';
    const newScore = Math.max(0, matchData.score[opponent] + 1);

    const newEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      scoreAt: `[${matchData.score.home}-${matchData.score.away}]`,
      setterZoneHome: sZoneHome,
      setterZoneAway: sZoneAway,
      team: team,
      player: "TEAM",
      skill: "foul",
      eval: "=",
      startZone: null,
      endZone: null,
      detail: lang === 'en' ? `Foul: ${foulType}` : `ทำฟาล์ว: ${foulType}`,
      pointWonBy: opponent
    };

    const prevServe = matchData.currentServe;
    let nextServe = opponent;
    let newRotations = { ...matchData.rotations };

    if (prevServe !== null && prevServe !== opponent) {
      const currentRot = [...matchData.rotations[opponent]];
      newRotations[opponent] = [
        currentRot[1], currentRot[2], currentRot[3],
        currentRot[4], currentRot[5], currentRot[0]
      ];
    }

    const nextState = {
      ...matchData,
      events: [...(matchData.events || []), newEvent],
      score: {
        ...matchData.score,
        [opponent]: newScore
      },
      currentServe: nextServe,
      rotations: newRotations
    };
    syncMatchState(nextState);
  };

  const handleSaveToCloud = async () => {
    if (!activeRoom) return;
    setIsSavingHistory(true);
    setSaveStatus(lang === 'en' ? 'Saving to cloud...' : 'กำลังเซฟลงคลาวด์...');
    try {
      const response = await fetch(`${BACKEND_URL}/api/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: activeRoom,
          savedAt: Date.now(),
          teamNames: matchData.teamNames || { home: "HOME", away: "AWAY" },
          score: matchData.score,
          events: matchData.events,
          roster: matchData.roster
        })
      });
      if (response.ok) {
        setSaveStatus(lang === 'en' ? 'Saved successfully!' : 'บันทึกสมบูรณ์!');
      } else {
        throw new Error('Server returned error');
      }
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (e) {
      console.error(e);
      setSaveStatus(lang === 'en' ? 'Error occurred' : 'เกิดข้อผิดพลาด');
      setTimeout(() => setSaveStatus(''), 3000);
    }
    setIsSavingHistory(false);
  };

  const handleExportPDF = () => {
    const t = (key: string, params?: Record<string, string | number>) => {
      let val = (translations[lang] as any)[key] || (translations['th'] as any)[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          val = val.replace(`{${k}}`, String(v));
        });
      }
      return val;
    };

    const teamNames = matchData.teamNames || { home: 'HOME', away: 'AWAY' };
    const matchInfo = matchData.matchInfo || {};
    const events = matchData.events || [];
    const sets = matchData.setScores || [];

    const metaTournament = matchInfo.tournament || '-';
    const metaVenue = matchInfo.venue || '-';
    const metaDate = matchInfo.matchDate || '-';
    const metaTime = matchInfo.matchTime || '-';
    const metaGender = matchInfo.gender || '-';
    const metaAge = matchInfo.ageGroup || '-';
    const metaLevel = matchInfo.compLevel || '-';

    const generateRadarChartSVG = (teamKey: 'home' | 'away') => {
      const size = 260;
      const center = size / 2;
      const maxRadius = center - 35;
      const zones = [1, 2, 3, 4, 5, 6];
      const getAngle = (i: number) => (i * 2 * Math.PI) / 6 - Math.PI / 2;

      const getMetrics = (zone: number) => {
        const rotEvents = events.filter(e => e.team === teamKey && (teamKey === 'home' ? e.setterZoneHome === zone : e.setterZoneAway === zone));
        const total = rotEvents.length;

        const wins = rotEvents.filter(e => e.eval === '#' || e.eval === '+').length;
        const winRate = total > 0 ? (wins / total) * 100 : 0;

        const recEvents = rotEvents.filter(e => e.skill === 'receive');
        const passQuality = recEvents.length > 0 
          ? recEvents.reduce((acc, e) => acc + (e.eval === '#' ? 100 : e.eval === '+' ? 75 : e.eval === '!' ? 50 : e.eval === '-' ? 25 : 0), 0) / recEvents.length
          : 0;

        const attEvents = rotEvents.filter(e => e.skill === 'attack');
        const attKills = attEvents.filter(e => e.eval === '#').length;
        const attackComp = attEvents.length > 0 ? (attKills / attEvents.length) * 100 : 0;

        return { winRate, passQuality, attackComp };
      };

      const zoneData = zones.map(z => ({ zone: z, ...getMetrics(z) }));

      const getPolygonPoints = (key: 'winRate' | 'passQuality' | 'attackComp') => {
        return zoneData.map((data, i) => {
          const angle = getAngle(i);
          const val = data[key];
          const radius = (val / 100) * maxRadius;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return `${x},${y}`;
        }).join(' ');
      };

      const rings = [20, 40, 60, 80, 100];

      let svgHtml = `<svg width="${size}" height="${size}" class="radar-chart" style="overflow: visible;">`;
      
      rings.forEach(ring => {
        const radius = (ring / 100) * maxRadius;
        const points = zones.map((_, i) => {
          const angle = getAngle(i);
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return `${x},${y}`;
        }).join(' ');
        svgHtml += `
          <polygon points="${points}" fill="none" stroke="#e2e8f0" stroke-width="0.75" stroke-dasharray="2 2" />
          <text x="${center}" y="${center - radius + 8}" fill="#94a3b8" font-size="7" font-weight="bold" text-anchor="middle">${ring}%</text>
        `;
      });

      zones.forEach((_, i) => {
        const angle = getAngle(i);
        const x2 = center + maxRadius * Math.cos(angle);
        const y2 = center + maxRadius * Math.sin(angle);
        const lx = center + (maxRadius + 15) * Math.cos(angle);
        const ly = center + (maxRadius + 15) * Math.sin(angle) + 3;
        svgHtml += `
          <line x1="${center}" y1="${center}" x2="${x2}" y2="${y2}" stroke="#cbd5e1" stroke-width="1" />
          <text x="${lx}" y="${ly}" fill="#475569" font-size="10" font-weight="bold" text-anchor="middle">R${zones[i]}</text>
        `;
      });

      svgHtml += `
        <polygon points="${getPolygonPoints('winRate')}" fill="rgba(16, 185, 129, 0.15)" stroke="rgb(16, 185, 129)" stroke-width="2" />
        <polygon points="${getPolygonPoints('passQuality')}" fill="rgba(99, 102, 241, 0.15)" stroke="rgb(99, 102, 241)" stroke-width="2" />
        <polygon points="${getPolygonPoints('attackComp')}" fill="rgba(244, 63, 94, 0.15)" stroke="rgb(244, 63, 94)" stroke-width="2" />
      `;

      zones.forEach((_, i) => {
        const angle = getAngle(i);
        const drawMarker = (val: number, color: string) => {
          const radius = (val / 100) * maxRadius;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return `<circle cx="${x}" cy="${y}" r="3" fill="${color}" stroke="#fff" stroke-width="1" />`;
        };
        const metrics = zoneData[i];
        svgHtml += drawMarker(metrics.winRate, 'rgb(16, 185, 129)');
        svgHtml += drawMarker(metrics.passQuality, 'rgb(99, 102, 241)');
        svgHtml += drawMarker(metrics.attackComp, 'rgb(244, 63, 94)');
      });

      svgHtml += `</svg>`;
      return svgHtml;
    };

    const generateHeatmapHTML = (teamKey: 'home' | 'away') => {
      const tEvents = events.filter(e => e.team === teamKey);
      const strengths = Array(7).fill(0);
      const weaknesses = Array(7).fill(0);

      tEvents.forEach(evt => {
        if (evt.endZone >= 1 && evt.endZone <= 6) {
          const isSuccess = evt.eval === '#' || evt.eval === '+';
          const isError = evt.eval === '=' || evt.eval === '/';
          if (isSuccess) strengths[evt.endZone]++;
          if (isError) weaknesses[evt.endZone]++;
        }
      });

      const zones = [
        [1, 6, 5],
        [2, 3, 4]
      ];

      let gridHtml = `<div class="heatmap-container">`;
      zones.forEach(row => {
        row.forEach(z => {
          const s = strengths[z] || 0;
          const w = weaknesses[z] || 0;
          const sum = s + w;
          let bgClass = 'bg-slate-50';
          if (sum > 0) {
            if (s >= w) {
              bgClass = s >= 3 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
            } else {
              bgClass = w >= 3 ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-50 text-rose-700 border-rose-200';
            }
          }
          gridHtml += `
            <div class="heatmap-cell ${bgClass}">
              <span class="cell-label">R${z}</span>
              <div class="cell-stats">
                <span class="stat-plus">+${s}</span>
                <span class="stat-minus">-${w}</span>
              </div>
            </div>
          `;
        });
      });
      gridHtml += `</div>`;
      return gridHtml;
    };

    const homeStatsRows = SKILLS.map(skill => {
      const sEvents = events.filter(e => e.team === 'home' && e.skill === skill.id);
      const total = sEvents.length;
      const perfect = sEvents.filter(e => e.eval === '#').length;
      const good = sEvents.filter(e => e.eval === '+').length;
      const error = sEvents.filter(e => e.eval === '=').length;
      const blocked = sEvents.filter(e => e.eval === '/').length;
      
      const effPercent = total > 0 ? (((perfect + good) / total) * 100).toFixed(0) : '0';
      const errPercent = total > 0 ? (((error + blocked) / total) * 100).toFixed(0) : '0';

      return `
        <tr>
          <td>${getLocalizedSkillLabel(skill.id, lang)}</td>
          <td class="text-center font-mono">${total}</td>
          <td class="text-center text-emerald-600 font-bold">${effPercent}%</td>
          <td class="text-center text-rose-600 font-bold">${errPercent}%</td>
        </tr>
      `;
    }).join('');

    const awayStatsRows = SKILLS.map(skill => {
      const sEvents = events.filter(e => e.team === 'away' && e.skill === skill.id);
      const total = sEvents.length;
      const perfect = sEvents.filter(e => e.eval === '#').length;
      const good = sEvents.filter(e => e.eval === '+').length;
      const error = sEvents.filter(e => e.eval === '=').length;
      const blocked = sEvents.filter(e => e.eval === '/').length;
      
      const effPercent = total > 0 ? (((perfect + good) / total) * 100).toFixed(0) : '0';
      const errPercent = total > 0 ? (((error + blocked) / total) * 100).toFixed(0) : '0';

      return `
        <tr>
          <td>${getLocalizedSkillLabel(skill.id, lang)}</td>
          <td class="text-center font-mono">${total}</td>
          <td class="text-center text-emerald-600 font-bold">${effPercent}%</td>
          <td class="text-center text-rose-600 font-bold">${errPercent}%</td>
        </tr>
      `;
    }).join('');

    const generatePlayerRows = (teamKey: 'home' | 'away') => {
      const roster = matchData.roster?.[teamKey] || {};
      return Object.entries(roster).map(([num, details]: [string, any]) => {
        const pEvents = events.filter(e => e.team === teamKey && e.player === num);
        const total = pEvents.length;
        const perfect = pEvents.filter(e => e.eval === '#').length;
        const good = pEvents.filter(e => e.eval === '+').length;
        const error = pEvents.filter(e => e.eval === '=').length;
        const blocked = pEvents.filter(e => e.eval === '/').length;
        
        const effPercent = total > 0 ? (((perfect + good) / total) * 100).toFixed(0) : '0';
        const errPercent = total > 0 ? (((error + blocked) / total) * 100).toFixed(0) : '0';
        const ratio = total > 0 ? `+${effPercent}% / -${errPercent}%` : '-';

        const skillCounts = SKILLS.map(s => {
          const count = pEvents.filter(e => e.skill === s.id).length;
          return count > 0 ? `<td class="text-center font-mono">${count}</td>` : `<td class="text-center text-slate-300">-</td>`;
        }).join('');

        return `
          <tr>
            <td class="text-center font-bold">${num}</td>
            <td>${details.name || '-'}</td>
            <td class="text-center font-bold">${details.position || '-'}</td>
            <td class="text-center font-mono">${total}</td>
            <td class="text-center font-mono text-[11px] font-bold">${ratio}</td>
            ${skillCounts}
          </tr>
        `;
      }).join('');
    };

    const eventLogsRows = events.map((e, idx) => {
      const isHomeEvent = e.team === 'home';
      const teamLabel = isHomeEvent ? teamNames.home : teamNames.away;
      const skillName = getLocalizedSkillLabel(e.skill, lang);
      const evalName = getLocalizedEvalLabel(e.eval, lang);
      const badgeClass = isHomeEvent ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800';
      return `
        <tr>
          <td class="text-center font-mono text-slate-400">${idx + 1}</td>
          <td><span class="badge ${badgeClass}">${teamLabel}</span></td>
          <td class="text-center font-bold">#${e.player || '-'}</td>
          <td>${skillName}</td>
          <td class="text-center"><span class="eval-badge">${e.eval}</span> ${evalName}</td>
          <td class="text-center font-mono text-slate-500">S${e.set || 1}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <title>VolleyData Pro Match Report - ${teamNames.home} vs ${teamNames.away}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;850;900&family=Sarabun:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #4f46e5;
      --primary-hover: #4338ca;
      --slate-50: #f8fafc;
      --slate-100: #f1f5f9;
      --slate-200: #e2e8f0;
      --slate-700: #334155;
      --slate-800: #1e293b;
      --slate-900: #0f172a;
    }
    body {
      font-family: 'Sarabun', 'Inter', sans-serif;
      background-color: var(--slate-50);
      color: var(--slate-900);
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border: 1px solid var(--slate-200);
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
    }
    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid var(--slate-200);
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .title {
      font-size: 24px;
      font-weight: 900;
      color: var(--primary);
      margin: 0;
    }
    .subtitle {
      font-size: 14px;
      color: var(--slate-700);
      margin: 4px 0 0 0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      background: var(--slate-100);
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .meta-item {
      font-size: 12px;
    }
    .meta-label {
      font-weight: bold;
      color: var(--slate-700);
      display: block;
    }
    .meta-val {
      font-weight: 800;
    }
    .score-summary {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 24px;
      font-size: 20px;
      font-weight: 900;
      margin: 24px 0;
      padding: 16px;
      border: 2px solid var(--slate-200);
      border-radius: 12px;
      background: var(--slate-50);
    }
    .team-score {
      font-size: 32px;
      color: var(--primary);
    }
    .controls {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }
    .btn {
      padding: 10px 18px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover {
      background: var(--primary-hover);
    }
    .btn-secondary {
      background: var(--slate-700);
    }
    .btn-secondary:hover {
      background: var(--slate-800);
    }
    .section-title {
      font-size: 18px;
      font-weight: 800;
      border-left: 4px solid var(--primary);
      padding-left: 8px;
      margin: 32px 0 16px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 13px;
    }
    th, td {
      border: 1px solid var(--slate-200);
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: var(--slate-100);
      font-weight: 800;
    }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .font-mono { font-family: monospace; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }
    .bg-indigo-100 { background-color: #e0e7ff; color: #4338ca; }
    .bg-rose-100 { background-color: #ffe4e6; color: #be123c; }
    .visuals-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    .visual-card {
      border: 1px solid var(--slate-200);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--slate-50);
    }
    .visual-card h5 {
      margin: 0 0 12px 0;
      font-size: 13px;
      font-weight: 800;
      color: var(--slate-800);
    }
    .heatmap-container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 3px;
      width: 220px;
      height: 150px;
      background: var(--slate-200);
      border: 2px solid var(--slate-700);
      padding: 3px;
      border-radius: 8px;
    }
    .heatmap-cell {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 4px;
      font-size: 10px;
      font-weight: bold;
      border-radius: 4px;
      border: 1px solid transparent;
    }
    .cell-label {
      align-self: flex-end;
      opacity: 0.6;
    }
    .cell-stats {
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1.1;
    }
    .stat-plus { color: #059669; font-weight: 800; }
    .stat-minus { color: #dc2626; font-weight: 800; }
    .bg-slate-50 { background-color: #f8fafc; }
    .bg-emerald-50 { background-color: #ecfdf5; }
    .bg-emerald-100 { background-color: #d1fae5; }
    .bg-rose-50 { background-color: #fff5f5; }
    .bg-rose-100 { background-color: #fee2e2; }
    
    .radar-chart {
      margin: 8px 0;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        border: none;
        padding: 0;
      }
      .controls {
        display: none;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-banner">
      <div>
        <h1 class="title">${lang === 'en' ? 'VolleyData Pro - Match Analysis Report' : 'VolleyData Pro - รายงานผลวิเคราะห์สถิติการแข่งขัน'}</h1>
        <p class="subtitle">${lang === 'en' ? 'Official analytical summary of match rotation and play statistics.' : 'เอกสารรายงานการแข่งขันอย่างเป็นทางการ'}</p>
      </div>
      <button class="btn no-print" onclick="window.print()">${lang === 'en' ? 'Print / PDF' : 'พิมพ์ / บันทึก PDF'}</button>
    </div>

    <!-- Metadata Section -->
    <div class="meta-grid">
      <div class="meta-item"><span class="meta-label">${lang === 'en' ? 'Tournament' : 'รายการแข่งขัน'}</span><span class="meta-val">${metaTournament}</span></div>
      <div class="meta-item"><span class="meta-label">${lang === 'en' ? 'Venue' : 'สนามแข่งขัน'}</span><span class="meta-val">${metaVenue}</span></div>
      <div class="meta-item"><span class="meta-label">${lang === 'en' ? 'Match Date' : 'วันที่แข่งขัน'}</span><span class="meta-val">${metaDate}</span></div>
      <div class="meta-item"><span class="meta-label">${lang === 'en' ? 'Match Time' : 'เวลาแข่งขัน'}</span><span class="meta-val">${metaTime}</span></div>
      <div class="meta-item"><span class="meta-label">${lang === 'en' ? 'Gender' : 'ประเภททีม'}</span><span class="meta-val">${metaGender}</span></div>
      <div class="meta-item"><span class="meta-label">${lang === 'en' ? 'Age Group' : 'รุ่นอายุ'}</span><span class="meta-val">${metaAge}</span></div>
      <div class="meta-item"><span class="meta-label">${lang === 'en' ? 'Comp Level' : 'ระดับการแข่งขัน'}</span><span class="meta-val">${metaLevel}</span></div>
    </div>

    <!-- Score Summary -->
    <div class="score-summary">
      <span class="font-bold">${teamNames.home}</span>
      <span class="team-score">${sets.filter(s => s.home > s.away).length}</span>
      <span>vs</span>
      <span class="team-score">${sets.filter(s => s.away > s.home).length}</span>
      <span class="font-bold">${teamNames.away}</span>
    </div>

    <!-- Toggle Controls -->
    <div class="controls no-print">
      <button class="btn btn-secondary" onclick="toggleSection('heatmap-sec')">${lang === 'en' ? 'Toggle Heatmaps' : 'แสดง/ซ่อน แผนภาพบุก'}</button>
      <button class="btn btn-secondary" onclick="toggleSection('radar-sec')">${lang === 'en' ? 'Toggle Setter Radars' : 'แสดง/ซ่อน กราฟเรดาร์'}</button>
      <button class="btn btn-secondary" onclick="toggleSection('logs-sec')">${lang === 'en' ? 'Toggle Event Logs' : 'แสดง/ซ่อน บันทึกคำสั่ง'}</button>
    </div>

    <!-- Team Overview Stats -->
    <h2 class="section-title">${lang === 'en' ? 'Team Performance Overview' : 'สรุปผลงานระดับทีม'}</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
      <div>
        <h4 style="margin: 0 0 8px 0; color: #4f46e5;">${teamNames.home} (HOME)</h4>
        <table>
          <thead>
            <tr>
              <th>${lang === 'en' ? 'Skill' : 'ทักษะ'}</th>
              <th class="text-center">${lang === 'en' ? 'Total' : 'จำนวน'}</th>
              <th class="text-center">% Good</th>
              <th class="text-center">% Error</th>
            </tr>
          </thead>
          <tbody>
            ${homeStatsRows}
          </tbody>
        </table>
      </div>
      <div>
        <h4 style="margin: 0 0 8px 0; color: #e11d48;">${teamNames.away} (AWAY)</h4>
        <table>
          <thead>
            <tr>
              <th>${lang === 'en' ? 'Skill' : 'ทักษะ'}</th>
              <th class="text-center">${lang === 'en' ? 'Total' : 'จำนวน'}</th>
              <th class="text-center">% Good</th>
              <th class="text-center">% Error</th>
            </tr>
          </thead>
          <tbody>
            ${awayStatsRows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Visual Charts Sections -->
    <div id="heatmap-sec">
      <h2 class="section-title">${lang === 'en' ? 'Attack Target Zone Heatmaps' : 'วิเคราะห์จุดตกการทำคะแนน (Heatmaps)'}</h2>
      <div class="visuals-layout">
        <div class="visual-card">
          <h5>${teamNames.home} (HOME) - Attack Target Zones</h5>
          ${generateHeatmapHTML('home')}
        </div>
        <div class="visual-card">
          <h5>${teamNames.away} (AWAY) - Attack Target Zones</h5>
          ${generateHeatmapHTML('away')}
        </div>
      </div>
    </div>

    <div id="radar-sec">
      <h2 class="section-title">${lang === 'en' ? 'Setter Rotation Performance Radar' : 'กราฟเรดาร์วิเคราะห์ประสิทธิภาพหน้าเซต (Setter Rotations)'}</h2>
      <div class="visuals-layout">
        <div class="visual-card">
          <h5>${teamNames.home} (HOME) - Rotation Performance</h5>
          ${generateRadarChartSVG('home')}
        </div>
        <div class="visual-card">
          <h5>${teamNames.away} (AWAY) - Rotation Performance</h5>
          ${generateRadarChartSVG('away')}
        </div>
      </div>
    </div>

    <!-- Individual Player Stats -->
    <h2 class="section-title">${lang === 'en' ? 'HOME Team Player Individual Performance' : 'ผลงานรายบุคคล - ทีมเหย้า'}</h2>
    <table style="font-size: 11px;">
      <thead>
        <tr>
          <th style="width: 30px;">No.</th>
          <th>Player Name</th>
          <th>Pos</th>
          <th>Total</th>
          <th>+/-% Ratio</th>
          ${SKILLS.map(s => `<th>${s.label.split(' ')[0]}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${generatePlayerRows('home')}
      </tbody>
    </table>

    <h2 class="section-title">${lang === 'en' ? 'AWAY Team Player Individual Performance' : 'ผลงานรายบุคคล - ทีมเยือน'}</h2>
    <table style="font-size: 11px;">
      <thead>
        <tr>
          <th style="width: 30px;">No.</th>
          <th>Player Name</th>
          <th>Pos</th>
          <th>Total</th>
          <th>+/-% Ratio</th>
          ${SKILLS.map(s => `<th>${s.label.split(' ')[0]}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${generatePlayerRows('away')}
      </tbody>
    </table>

    <!-- Event logs chronological list -->
    <div id="logs-sec">
      <h2 class="section-title">${lang === 'en' ? 'Chronological Action History' : 'ประวัติบันทึกการแข่งขันตามเวลาจริง (Match Play-by-Play Logs)'}</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 40px;" class="text-center">#</th>
            <th>Team</th>
            <th class="text-center">Player</th>
            <th>Skill</th>
            <th class="text-center">Evaluation</th>
            <th class="text-center">Set</th>
          </tr>
        </thead>
        <tbody>
          ${eventLogsRows}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    function toggleSection(id) {
      const el = document.getElementById(id);
      if (el.style.display === 'none') {
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    }
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const matchName = `${teamNames.home}_vs_${teamNames.away}`.replace(/\s+/g, '_');
    const dateStr = matchInfo.matchDate || new Date().toISOString().slice(0, 10);
    link.download = `VolleyData_Report_${matchName}_${dateStr}.html`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <LanguageContext.Provider value={{ lang, setLang: handleSetLang }}>
        <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-white gap-4">
          <VolleyballIcon className="w-12 h-12 text-indigo-500 animate-[spin_3s_linear_infinite]" />
          <span className="text-sm font-semibold tracking-widest text-slate-400">CONNECTING...</span>
        </div>
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang }}>
      <div className="h-screen w-screen bg-slate-950 overflow-hidden relative font-sans">
      <div 
        style={{ 
          transform: `scale(${appZoom})`,
          transformOrigin: 'top left',
          width: `${100 / appZoom}%`,
          height: `${100 / appZoom}%`,
          transition: 'transform 0.15s ease-out',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
        className="h-full w-full flex flex-col relative overflow-hidden"
      >
      {adminMode && (
        <AdminPanelModal 
          isOpen={adminMode}
          onClose={() => setAdminMode(false)}
          adminPin={adminPin}
          setAdminPin={setAdminPin}
          adminPinError={adminPinError}
          setAdminPinError={setAdminPinError}
          isAdminUnlocked={isAdminUnlocked}
          handleUnlockAdmin={handleUnlockAdmin}
          adminUsers={adminUsers}
          handleCreateUser={handleCreateUser}
          handleDeleteUser={handleDeleteUser}
          handleUpdateExpiry={handleUpdateExpiry}
          handleResetPassword={handleResetPassword}
          handleToggleAdminRole={handleToggleAdminRole}
          adminUsername={adminUsername}
          setAdminUsername={setAdminUsername}
          adminPassword={adminPassword}
          setAdminPassword={setAdminPassword}
          adminExpiryDate={adminExpiryDate}
          setAdminExpiryDate={setAdminExpiryDate}
          adminUnlimitedExpiry={adminUnlimitedExpiry}
          setAdminUnlimitedExpiry={setAdminUnlimitedExpiry}
          adminFormError={adminFormError}
          adminFormSuccess={adminFormSuccess}
        />
      )}

      {appState === 'login' ? (
        <LoginScreen 
          loginForm={loginForm}
          setLoginForm={setLoginForm}
          handleLogin={handleLogin}
          adminPin={adminPin}
          setAdminPin={setAdminPin}
          adminPinError={adminPinError}
          setAdminPinError={setAdminPinError}
          handleUnlockAdmin={handleUnlockAdmin}
        />
      ) : !activeRoom ? (
        <LobbyScreen 
          roomId={roomId}
          setRoomId={setRoomId}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          error={lobbyError}
          user={user}
          onLogout={handleLogout}
          onOpenAdmin={() => {
            setAdminPin('');
            setAdminPinError('');
            setIsAdminUnlocked(false);
            setAdminMode(true);
          }}
          onOpenDisplaySettings={() => setIsDisplaySettingsOpen(true)}
          onOpenHelp={() => setIsHelpModalOpen(true)}
        />
      ) : (
        <div className="h-full max-h-full bg-slate-950 text-slate-200 font-sans overflow-hidden flex flex-col select-none relative">
      {/* App Main Header */}
      <header className="bg-slate-900 h-14 border-b border-slate-800 flex justify-between items-center px-3 sm:px-5 shrink-0 shadow-md z-30">
        <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg font-black text-white tracking-tight">
          <div className="p-0.5 rounded-lg bg-slate-950 border border-slate-800 shadow-inner shrink-0 overflow-hidden">
            <img src="/logo.png" className="w-6 h-6 sm:w-7 sm:h-7 object-cover rounded-md" alt="VolleyData Logo" /> 
          </div>
          <span className="truncate max-w-[120px] sm:max-w-none">VolleyData <span className="text-[10px] text-amber-500 font-bold align-top">Pro</span></span>
          <span className="hidden sm:inline-block text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-md border border-emerald-500/20 font-mono tracking-widest ml-2 shadow-inner">
            LIVE: {activeRoom}
          </span>
        </div>
        
        <div className="flex gap-1.5 sm:gap-2 items-center">
          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner mr-1 shrink-0 h-[38px]">
            <button 
              onClick={() => setLang('th')} 
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all h-[30px] ${lang === 'th' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              TH
            </button>
            <button 
              onClick={() => setLang('en')} 
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all h-[30px] ${lang === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              EN
            </button>
          </div>

          <button 
            onClick={() => setIsHelpModalOpen(true)}
            className="flex items-center gap-1.5 text-[10px] sm:text-[11px] bg-slate-800 hover:bg-slate-700 hover:text-amber-400 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors font-bold shrink-0 shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden xs:inline">{t('guideBtn')}</span>
          </button>

          <button 
            onClick={() => setIsDisplaySettingsOpen(true)}
            className="flex items-center gap-1.5 text-[10px] sm:text-[11px] bg-slate-800 hover:bg-slate-700 hover:text-indigo-400 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors font-bold shrink-0 shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xs:inline">{t('adjustSizeBtn')}</span>
          </button>

          <div className="hidden xs:flex items-center gap-1.5 bg-slate-950/50 border border-slate-800 px-2.5 py-1.5 rounded-lg text-[11px] shrink-0 shadow-inner">
            <span className="text-slate-400 font-mono font-bold tracking-wider">{activeRoom}</span>
            <button onClick={copyRoomCode} className="text-slate-500 hover:text-emerald-400 transition-colors ml-1 p-0.5">
              {copySuccess ? <span className="text-[9px] text-emerald-400 font-black">Copied!</span> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {role !== ROLES.UNASSIGNED && (
            <button 
              onClick={() => setIsSetupModalOpen(true)}
              className="flex items-center gap-1.5 text-[10px] sm:text-[11px] bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1.5 rounded-lg border border-indigo-500 transition-colors text-white font-bold shadow-md"
            >
              <Users className="w-3.5 h-3.5 text-indigo-200" /> <span>{lang === 'en' ? 'Match & Team Setup' : 'ตั้งค่าแมตช์ & ทีม'}</span>
            </button>
          )}

          {(role === ROLES.COACH || matchData.status === 'finished') && (
            <div className="flex gap-1.5">
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 text-[10px] sm:text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg border border-indigo-500 transition-colors font-bold shrink-0 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-indigo-200" /> <span className="hidden sm:inline">PDF Report</span>
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
            {lang === 'en' ? 'Log Out' : 'ออก'}
          </button>
        </div>
      </header>

      {matchData.status === 'finished' && role !== ROLES.UNASSIGNED && (
        <div className="bg-rose-950 border-b border-rose-900/60 p-3 sm:p-4 flex justify-between items-center px-4 sm:px-6 shrink-0 shadow-lg z-50 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            <span className="text-xs sm:text-sm font-black text-rose-200 uppercase tracking-widest">{t('matchHasEnded')}</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleResumeMatch}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] sm:text-[11px] rounded-lg border border-indigo-500 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              {t('resumeMatchBtn')}
            </button>
            <button 
              onClick={() => {
                setActiveRoom(null);
                setRole(ROLES.UNASSIGNED);
              }}
              className="px-3.5 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-900/40 text-rose-300 font-bold text-[10px] sm:text-[11px] rounded-lg shadow-md active:scale-95 transition-all cursor-pointer"
            >
              {lang === 'en' ? 'Exit Room' : 'ออกจากห้อง'}
            </button>
          </div>
        </div>
      )}

      {saveStatus && (
        <div className="bg-emerald-600 text-white text-xs py-1.5 px-4 text-center font-bold tracking-widest animate-pulse shrink-0 shadow-md">
          {saveStatus}
        </div>
      )}

      {matchData.matchInfo && (matchData.matchInfo.tournament || matchData.matchInfo.venue || matchData.matchInfo.matchDate) ? (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 shadow-sm transition-all duration-300">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-300 font-medium">
            {matchData.matchInfo.tournament ? (
              <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                {matchData.matchInfo.tournament}
              </span>
            ) : null}
            {matchData.matchInfo.venue ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {matchData.matchInfo.venue}
              </span>
            ) : null}
            {(matchData.matchInfo.matchDate || matchData.matchInfo.matchTime) ? (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {matchData.matchInfo.matchDate} {matchData.matchInfo.matchTime}
              </span>
            ) : null}
            {matchData.matchInfo.gender ? (
              <span className="px-2 py-0.5 bg-slate-800 rounded-md border border-slate-700 text-[10px] text-indigo-300 font-bold uppercase">
                {matchData.matchInfo.gender === 'male' ? t('genderMale') : t('genderFemale')}
              </span>
            ) : null}
            {matchData.matchInfo.compLevel ? (
              <span className="px-2 py-0.5 bg-slate-800 rounded-md border border-slate-700 text-[10px] text-purple-300 font-bold uppercase">
                {matchData.matchInfo.compLevel === 'highschool' && t('levelHighSchool')}
                {matchData.matchInfo.compLevel === 'university' && t('levelUniversity')}
                {matchData.matchInfo.compLevel === 'general' && t('levelGeneral')}
              </span>
            ) : null}
            {matchData.matchInfo.ageGroup ? (
              <span className="px-2 py-0.5 bg-slate-800 rounded-md border border-slate-700 text-[10px] text-amber-400 font-bold">
                {matchData.matchInfo.ageGroup}
              </span>
            ) : null}
          </div>
          <button 
            onClick={() => {
              if (window.confirm(lang === 'en' ? 'Are you sure you want to delete the match information?' : 'คุณแน่ใจหรือไม่ที่จะลบข้อมูลการแข่งขันนี้?')) {
                const nextState = {
                  ...matchData,
                  matchInfo: {
                    tournament: '',
                    venue: '',
                    matchDate: '',
                    matchTime: '',
                    gender: '',
                    ageGroup: '',
                    compLevel: 'general'
                  }
                };
                syncMatchState(nextState);
              }
            }}
            className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-1 rounded transition-all active:scale-95 flex items-center gap-1 text-[11px]"
            title={lang === 'en' ? 'Delete match info' : 'ลบข้อมูลการแข่งขัน'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'en' ? 'Clear' : 'ลบข้อมูล'}</span>
          </button>
        </div>
      ) : null}

      {/* Main Container layout - Adapts to Portrait and Landscape cleanly */}
      <main className="flex-1 flex flex-col md:flex-row w-full h-full gap-2 overflow-hidden p-2 min-h-0">
        {role === ROLES.UNASSIGNED ? (
          <RoleSelection onSelect={setRole} />
        ) : isPortrait && role !== ROLES.COACH && matchData.status !== 'finished' ? (
          <div className="flex flex-col w-full h-full overflow-hidden transition-all duration-150">
             <TrackerView 
                status={matchData.status}
                onManualEndSet={handleManualEndSet}
                onManualEndMatch={handleManualEndMatch}
                onResumeMatch={handleResumeMatch}
                onExitMatch={() => {
                  setActiveRoom(null);
                  setRole(ROLES.UNASSIGNED);
                }}
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
                autoLiberoSwapEnabled={autoLiberoSwapEnabled}
                setAutoLiberoSwapEnabled={setAutoLiberoSwapEnabled}
                isPortrait={true}
                setsWon={matchData.setsWon}
                events={matchData.events}
                currentSet={matchData.score?.set || 1}
                setScores={matchData.setScores || []}
                hideTabs={role !== ROLES.COACH}
                onUpdateScore={handleUpdateScore}
                onTimeout={handleTimeout}
                onUpdateServe={handleUpdateServe}
                onReduceTimeout={handleReduceTimeout}
             />
          </div>
        ) : (
          <div className={`flex flex-col md:flex-row w-full h-full gap-1 md:gap-0 overflow-hidden transition-all duration-150 ${isActionLocked ? 'pointer-events-none opacity-60 cursor-not-allowed select-none' : ''}`}>
            {/* Dashboard / Stats layout */}
            <div 
              className={`flex flex-col gap-2 h-full min-h-0 shrink-0
                ${(role === ROLES.COACH || matchData.status === 'finished') ? 'w-full' : ''}
                ${role !== ROLES.COACH && activeMobileView !== 'stats' ? 'hidden md:flex' : 'flex'}
              `}
              style={{
                width: (role === ROLES.COACH || matchData.status === 'finished') ? '100%' : undefined,
                flexBasis: (role === ROLES.COACH || matchData.status === 'finished') ? 'auto' : `${leftWidth}px`,
                maxWidth: (role === ROLES.COACH || matchData.status === 'finished') ? 'none' : '100%'
              }}
            >
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
                onReduceTimeout={handleReduceTimeout}
                events={matchData.events}
              />
              
              <div className="flex-1 min-h-0 bg-slate-900 rounded-xl border border-slate-800 shadow-inner p-1.5">
                <Dashboard 
                   events={matchData.events} 
                   rotations={matchData.rotations} 
                   roster={matchData.roster}
                   role={role}
                   teamNames={matchData.teamNames || { home: "HOME", away: "AWAY" }}
                   timeouts={matchData.timeouts}
                   currentSet={matchData.score?.set || 1}
                   setScores={matchData.setScores || []}
                   hideTabs={role !== ROLES.COACH && matchData.status !== 'finished'}
                   currentServe={matchData.currentServe}
                   tempRallyEvents={matchData.tempRallyEvents || []}
                />
              </div>
            </div>

            {/* Splitter bar (only shown if not COACH, not finished and role is selected) */}
            {role !== ROLES.COACH && role !== ROLES.UNASSIGNED && matchData.status !== 'finished' && (
              <div 
                className="hidden md:flex w-2.5 hover:w-3 bg-slate-900 border-x border-slate-800 hover:bg-indigo-600 hover:border-indigo-500 cursor-col-resize self-stretch transition-all duration-150 relative items-center justify-center shrink-0 group select-none"
                onTouchStart={handleTouchStart}
                onMouseDown={handleMouseDown}
              >
                <div className="w-1 h-8 rounded-full bg-slate-700 group-hover:bg-indigo-300 transition-colors" />
              </div>
            )}

            {/* Scouter Court View (hidden when finished to show full-width dashboard stats) */}
            {role !== ROLES.COACH && matchData.status !== 'finished' && (
              <div className={`flex-1 bg-slate-900 rounded-xl border border-slate-700 flex flex-col relative shadow-xl overflow-hidden min-h-0
                ${activeMobileView !== 'court' ? 'hidden md:flex' : 'flex'}
              `}>
                 <TrackerView 
                    status={matchData.status}
                    onManualEndSet={handleManualEndSet}
                    onManualEndMatch={handleManualEndMatch}
                    onResumeMatch={handleResumeMatch}
                    onExitMatch={() => {
                      setActiveRoom(null);
                      setRole(ROLES.UNASSIGNED);
                    }}
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
                    autoLiberoSwapEnabled={autoLiberoSwapEnabled}
                    setAutoLiberoSwapEnabled={setAutoLiberoSwapEnabled}
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
              {setEndData.isMatchOver ? (lang === 'en' ? 'Match Over!' : 'แมตช์สิ้นสุด!') : (lang === 'en' ? `Set ${matchData.score.set} Finished` : `จบเซตที่ ${matchData.score.set}`)}
            </h2>
            <p className="text-xl md:text-2xl text-slate-300 mb-6 font-medium">
              {lang === 'en' ? 'Winner: ' : 'ทีมที่ชนะ: '} <span className={setEndData.winner === 'home' ? 'text-indigo-400 font-black' : 'text-rose-400 font-black'}>
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
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-lg shadow-lg shadow-emerald-900/50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {setEndData.isMatchOver ? <Trophy className="w-5.5 h-5.5" /> : <PlayCircle className="w-5.5 h-5.5" />}
              {setEndData.isMatchOver ? (lang === 'en' ? 'Save Results & View Stats' : 'บันทึกผลและดูสถิติการแข่งขัน') : (lang === 'en' ? 'Start Next Set' : 'เริ่มเกมเซตต่อไป')}
            </button>

            <button 
              onClick={() => setSetEndData(null)}
              className="w-full mt-2.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-sm border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Undo2 className="w-4 h-4" />
              {lang === 'en' ? 'Cancel / Fix Score' : 'ยกเลิก / แก้ไขคะแนน'}
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar navigation for mobile screens */}
      {role !== ROLES.UNASSIGNED && role !== ROLES.COACH && !isPortrait && (
        <div className="md:hidden flex h-14 shrink-0 bg-slate-950 border-t border-slate-800 items-center justify-around text-[10px] z-30 pb-2">
          <button 
            onClick={() => setActiveMobileView('stats')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors
              ${activeMobileView === 'stats' ? 'text-indigo-400 font-black' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <BarChart3 className={`w-5 h-5 ${activeMobileView === 'stats' ? 'animate-bounce' : ''}`} />
            <span>{lang === 'en' ? 'Scoreboard' : 'กระดานคะแนน'}</span>
          </button>
          <button 
            onClick={() => setActiveMobileView('court')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors
              ${activeMobileView === 'court' ? 'text-amber-400 font-black' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <ClipboardList className={`w-5 h-5 ${activeMobileView === 'court' ? 'animate-bounce' : ''}`} />
            <span>{lang === 'en' ? 'Live Scout' : 'คีย์สนามสด'}</span>
          </button>
        </div>
      )}

      {isSetupModalOpen && (
        <PlayerSetupModal 
          team={role === ROLES.COACH || !matchData.rotations?.[role] ? 'home' : role} 
          currentRotations={matchData.rotations?.[role === ROLES.COACH || !matchData.rotations?.[role] ? 'home' : role] || []} 
          currentRoster={matchData.roster?.[role === ROLES.COACH || !matchData.rotations?.[role] ? 'home' : role] || {}}
          currentTeamNames={matchData.teamNames || { home: "HOME", away: "AWAY" }}
          currentMatchInfo={matchData.matchInfo}
          onSave={(newRots, newRoster, names, newMatchInfo) => handleUpdateRoster(role === ROLES.COACH || !matchData.rotations?.[role] ? 'home' : role, newRots, newRoster, names, newMatchInfo)}
          onClose={() => setIsSetupModalOpen(false)} 
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
        .synthetic-court {
          background-color: #d97746;
          background-image: linear-gradient(135deg, #e38758 0%, #c45b2b 100%);
        }
        .touch-pan-y {
          touch-action: pan-y;
        }
      `}} />
        </div>
      )}

      {isHelpModalOpen && (
        <HelpGuideModal onClose={() => setIsHelpModalOpen(false)} />
      )}
      </div>

      {/* Display Settings Modal Popover */}
      {isDisplaySettingsOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsDisplaySettingsOpen(false)}>
          <div 
            className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setIsDisplaySettingsOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-white">{lang === 'en' ? 'Display Scaling Settings' : 'ปรับขนาดการแสดงผล'}</span>
            </div>

            {/* Font Size Settings */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>{lang === 'en' ? 'Font Size' : 'ขนาดตัวอักษร'}</span>
                <span className="text-indigo-400 font-mono text-xs">{appFontSize}px</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setAppFontSize(prev => Math.max(12, prev - 1))}
                  disabled={appFontSize <= 12}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold rounded-lg border border-slate-700 transition-colors text-xs active:scale-95"
                >
                  {lang === 'en' ? 'Decrease (A-)' : 'ลด (A-)'}
                </button>
                <button 
                  onClick={() => setAppFontSize(16)}
                  className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-lg border border-slate-700 transition-colors text-xs active:scale-95"
                >
                  {lang === 'en' ? 'Reset' : 'ปกติ'}
                </button>
                <button 
                  onClick={() => setAppFontSize(prev => Math.min(22, prev + 1))}
                  disabled={appFontSize >= 22}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold rounded-lg border border-slate-700 transition-colors text-xs active:scale-95"
                >
                  {lang === 'en' ? 'Increase (A+)' : 'เพิ่ม (A+)'}
                </button>
              </div>
            </div>

            {/* UI Zoom Settings */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>{lang === 'en' ? 'Screen Zoom' : 'ซูมหน้าจอ'}</span>
                <span className="text-amber-400 font-mono text-xs">{Math.round(appZoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setAppZoom(prev => Math.max(0.75, Math.round((prev - 0.05) * 100) / 100))}
                  disabled={appZoom <= 0.75}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold rounded-lg border border-slate-700 transition-colors text-xs active:scale-95"
                >
                  {lang === 'en' ? 'Zoom Out (-)' : 'ย่อ (-)'}
                </button>
                <button 
                  onClick={() => setAppZoom(1.0)}
                  className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-lg border border-slate-700 transition-colors text-xs active:scale-95"
                >
                  100%
                </button>
                <button 
                  onClick={() => setAppZoom(prev => Math.min(1.3, Math.round((prev + 0.05) * 100) / 100))}
                  disabled={appZoom >= 1.3}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold rounded-lg border border-slate-700 transition-colors text-xs active:scale-95"
                >
                  {lang === 'en' ? 'Zoom In (+)' : 'ขยาย (+)'}
                </button>
              </div>
            </div>

            <button 
              onClick={() => setIsDisplaySettingsOpen(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors text-xs shadow-md mt-1 active:scale-95"
            >
              {lang === 'en' ? 'OK' : 'ตกลง'}
            </button>
          </div>
        </div>
      )}
    </div>
    </LanguageContext.Provider>
  );
}