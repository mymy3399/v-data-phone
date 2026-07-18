import { OPP_COURT_ZONES } from '../constants';

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

export default HeatmapCourt;
