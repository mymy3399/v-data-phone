import VolleyballIcon from './VolleyballIcon';

function RotPlayer({ num, zone, pos, isServer = false }) {
  return (
    <div className={`flex flex-col items-center justify-center bg-slate-800 border ${isServer ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-slate-700'} py-1.5 rounded-lg relative z-10 shadow-sm transition-all duration-300`}>
      <span className="absolute top-0 right-1 text-[7px] text-slate-400 font-bold">{zone}</span>
      {isServer && (
        <VolleyballIcon className="w-3 h-3 text-amber-400 animate-[spin_5s_linear_infinite] absolute -top-1.5 left-1 bg-slate-900 rounded-full border border-amber-500 p-0.5" />
      )}
      <span className={`font-black text-[12px] leading-tight mt-0.5 ${isServer ? 'text-amber-400 font-mono' : 'text-white'}`}>{num || '-'}</span>
      <span className="text-[7px] text-amber-400 leading-none truncate max-w-[32px] uppercase font-mono font-bold">{pos || '-'}</span>
    </div>
  );
}

export default RotPlayer;
