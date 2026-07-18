import { useContext, useMemo } from 'react';
import { LanguageContext } from '../context';
import { translations } from '../translations';
import { ROLES } from '../constants';

function ScoreBoard({ score, setsWon, role, teamNames, timeouts, currentServe, onUpdateScore, onTimeout, onUpdateServe, onReduceTimeout, events = [] }) {
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
  const isHomeServe = currentServe === 'home';
  const isAwayServe = currentServe === 'away';

  const homeSubs = useMemo(() => {
    return (events || []).filter(e => e.set === score.set && e.team === 'home' && e.skill === 'substitute').length;
  }, [events, score.set]);

  const awaySubs = useMemo(() => {
    return (events || []).filter(e => e.set === score.set && e.team === 'away' && e.skill === 'substitute').length;
  }, [events, score.set]);

  return (
    <div className="bg-slate-900 rounded-xl p-3 pb-3.5 border border-slate-700 shrink-0 shadow-lg relative flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span>{lang === 'en' ? 'Live Scoreboard' : 'สกอร์บอร์ดสด'}</span>
        </div>
        <div className="text-[9px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-indigo-400 font-mono tracking-widest font-black shadow-inner animate-pulse">
          SET {score.set}
        </div>
      </div>

      {/* Score Row */}
      <div className="flex items-center justify-between">
        {/* HOME */}
        <div className="flex flex-col items-center w-[38%] gap-0.5">
          <div className="flex items-center gap-1 leading-none">
            <span className="text-indigo-400 font-black text-[10px] sm:text-xs truncate max-w-[90px]">{teamNames.home}</span>
            {isHomeServe && <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping" title={lang === 'th' ? 'ทีมเสิร์ฟ' : 'Serving'}></span>}
          </div>
          <div className="flex items-center gap-1.5 leading-none">
            {role !== ROLES.UNASSIGNED ? (
              <>
                <button
                  onClick={() => onUpdateScore('home', -1)}
                  className="w-5 h-5 flex items-center justify-center bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-md text-[10px] active:scale-90 font-black cursor-pointer shadow-inner shrink-0"
                  title="Decrease Score"
                >
                  -
                </button>
                <span className="text-3xl sm:text-4xl font-black font-mono leading-none text-white px-0.5 select-none">{score.home}</span>
                <button
                  onClick={() => onUpdateScore('home', 1)}
                  className="w-5 h-5 flex items-center justify-center bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-emerald-400 rounded-md text-[10px] active:scale-90 font-black cursor-pointer shadow-inner shrink-0"
                  title="Increase Score"
                >
                  +
                </button>
              </>
            ) : (
              <span className="text-3xl sm:text-4xl font-black font-mono leading-none text-white select-none">{score.home}</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <div className="text-[10px] sm:text-[11px] text-slate-300 font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850 shadow-inner flex items-center gap-1 leading-none">
              <span className="opacity-70 uppercase text-[8px] font-black tracking-wider">{t('setLabel')}</span>
              <span className="text-indigo-400 font-black text-xs sm:text-sm">{setsWon?.home || 0}</span>
            </div>
            {currentServe !== null && (
              <span className={`text-[8px] px-2 py-1 rounded-lg font-black uppercase tracking-wider border leading-none shadow-sm
                ${isHomeServe ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse font-extrabold' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
                {isHomeServe ? (lang === 'en' ? 'SRV' : 'เสิร์ฟ') : (lang === 'en' ? 'RCV' : 'รับ')}
              </span>
            )}
          </div>
        </div>

        {/* CENTER: Set label + Timeout + Sub status */}
        <div className="w-[24%] flex flex-col items-center justify-center shrink-0 gap-1.5 relative">
          <div className="text-sm font-bold text-slate-600 leading-none">:</div>

          {/* Timeout status both teams */}
          <div className="flex flex-col items-center gap-1 w-full bg-slate-950/60 border border-slate-800 rounded-xl p-1.5 shadow-inner">
            <div className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">T-OUT</div>
            <div className="flex items-center justify-center w-full gap-1.5">
              {/* Home timeout btn */}
              {(role === ROLES.HOME || role === ROLES.COACH) ? (
                <button
                  onClick={() => onTimeout('home')}
                  disabled={timeouts?.home >= 2}
                  className={`text-[11px] sm:text-xs font-mono font-black transition-all flex-1 flex items-center justify-center px-2 py-1 rounded-lg border active:scale-95 cursor-pointer shadow-md
                    ${timeouts?.home >= 2
                      ? 'bg-slate-950 border-slate-800 text-slate-600 opacity-40'
                      : 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.35)]'}`}
                >
                  {timeouts?.home || 0}/2
                </button>
              ) : (
                <span className="text-[11px] sm:text-xs font-mono font-black text-amber-500/80 bg-slate-950/60 border border-slate-850 px-2 py-1 rounded-lg flex-1 flex items-center justify-center">
                  {timeouts?.home || 0}/2
                </span>
              )}
              {/* Away timeout btn */}
              {(role === ROLES.AWAY || role === ROLES.COACH) ? (
                <button
                  onClick={() => onTimeout('away')}
                  disabled={timeouts?.away >= 2}
                  className={`text-[11px] sm:text-xs font-mono font-black transition-all flex-1 flex items-center justify-center px-2 py-1 rounded-lg border active:scale-95 cursor-pointer shadow-md
                    ${timeouts?.away >= 2
                      ? 'bg-slate-950 border-slate-800 text-slate-600 opacity-40'
                      : 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.35)]'}`}
                >
                  {timeouts?.away || 0}/2
                </button>
              ) : (
                <span className="text-[11px] sm:text-xs font-mono font-black text-amber-500/80 bg-slate-950/60 border border-slate-850 px-2 py-1 rounded-lg flex-1 flex items-center justify-center">
                  {timeouts?.away || 0}/2
                </span>
              )}
            </div>
          </div>

          {/* Sub status both teams */}
          <div className="flex flex-col items-center gap-1 w-full">
            <div className="text-[7px] font-black text-slate-500 uppercase tracking-wider">SUB</div>
            <div className="flex items-center justify-between w-full px-0.5 gap-0.5">
              {/* Home subs */}
              <div className="flex gap-[2px]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`w-1 h-2 rounded-sm border ${i < homeSubs ? 'bg-indigo-500 border-indigo-400' : 'bg-slate-950 border-slate-700'}`} />
                ))}
              </div>
              <span className="text-[6px] text-slate-600 font-black">|</span>
              {/* Away subs */}
              <div className="flex gap-[2px]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`w-1 h-2 rounded-sm border ${i < awaySubs ? 'bg-rose-500 border-rose-400' : 'bg-slate-950 border-slate-700'}`} />
                ))}
              </div>
            </div>
            <div className="flex justify-between w-full px-0.5">
              <span className="text-[7px] text-indigo-400 font-black">{homeSubs}/6</span>
              <span className="text-[7px] text-rose-400 font-black">{awaySubs}/6</span>
            </div>
          </div>

          {/* First serve popup */}
          {currentServe === null && score.home === 0 && score.away === 0 && (
            role !== ROLES.COACH ? (
              <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50 w-[150px] bg-slate-800 border border-amber-500/50 p-2.5 rounded-xl shadow-2xl text-center">
                <p className="text-[10px] font-bold mb-2 text-amber-400 leading-normal">{t('setFirstServeTitle')}</p>
                <div className="flex gap-1.5 justify-center">
                  <button onClick={() => onUpdateServe('home')} className="flex-1 py-1.5 text-[9px] font-bold bg-indigo-600 rounded-lg hover:bg-indigo-500 text-white shadow-sm transition-transform active:scale-95">HOME</button>
                  <button onClick={() => onUpdateServe('away')} className="flex-1 py-1.5 text-[9px] font-bold bg-rose-600 rounded-lg hover:bg-rose-500 text-white shadow-sm transition-transform active:scale-95">AWAY</button>
                </div>
              </div>
            ) : (
              <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50 w-[160px] bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-center shadow-xl">
                <span className="text-[9px] text-amber-400 font-bold block animate-pulse leading-normal">{t('waitingFirstServe')}</span>
              </div>
            )
          )}
        </div>

        {/* AWAY */}
        <div className="flex flex-col items-center w-[38%] gap-0.5">
          <div className="flex items-center gap-1 leading-none">
            {isAwayServe && <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping" title={lang === 'th' ? 'ทีมเสิร์ฟ' : 'Serving'}></span>}
            <span className="text-rose-400 font-black text-[10px] sm:text-xs truncate max-w-[90px]">{teamNames.away}</span>
          </div>
          <div className="flex items-center gap-1.5 leading-none">
            {role !== ROLES.UNASSIGNED ? (
              <>
                <button
                  onClick={() => onUpdateScore('away', -1)}
                  className="w-5 h-5 flex items-center justify-center bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-md text-[10px] active:scale-90 font-black cursor-pointer shadow-inner shrink-0"
                  title="Decrease Score"
                >
                  -
                </button>
                <span className="text-3xl sm:text-4xl font-black font-mono leading-none text-white px-0.5 select-none">{score.away}</span>
                <button
                  onClick={() => onUpdateScore('away', 1)}
                  className="w-5 h-5 flex items-center justify-center bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-emerald-400 rounded-md text-[10px] active:scale-90 font-black cursor-pointer shadow-inner shrink-0"
                  title="Increase Score"
                >
                  +
                </button>
              </>
            ) : (
              <span className="text-3xl sm:text-4xl font-black font-mono leading-none text-white select-none">{score.away}</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {currentServe !== null && (
              <span className={`text-[8px] px-2 py-1 rounded-lg font-black uppercase tracking-wider border leading-none shadow-sm
                ${isAwayServe ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse font-extrabold' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
                {isAwayServe ? (lang === 'en' ? 'SRV' : 'เสิร์ฟ') : (lang === 'en' ? 'RCV' : 'รับ')}
              </span>
            )}
            <div className="text-[10px] sm:text-[11px] text-slate-300 font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850 shadow-inner flex items-center gap-1 leading-none">
              <span className="opacity-70 uppercase text-[8px] font-black tracking-wider">{t('setLabel')}</span>
              <span className="text-rose-400 font-black text-xs sm:text-sm">{setsWon?.away || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScoreBoard;
