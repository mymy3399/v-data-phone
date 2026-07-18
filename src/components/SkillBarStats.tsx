import { useContext } from 'react';
import { LanguageContext } from '../context';
import { translations, getLocalizedSkillLabel } from '../translations';
import { SKILLS } from '../constants';

function SkillBarStats({ teamStats }) {
  const { lang } = useContext(LanguageContext);
  const t = (key: string) => (translations[lang] as any)[key] || (translations['th'] as any)[key] || key;
  return (
    <div className="flex flex-col gap-2">
      {SKILLS.map(skill => {
        const stats = teamStats[skill.id] || { total: 0, goodPercent: '0', errorPercent: '0', neutralPercent: '0' };
        const localizedLabel = getLocalizedSkillLabel(skill.id, lang);

        const goodP = parseFloat(stats.goodPercent) || 0;
        const neutralP = parseFloat(stats.neutralPercent) || 0;
        const errorP = parseFloat(stats.errorPercent) || 0;

        return (
          <div key={skill.id} className="flex items-center gap-2">
            <div className="w-16 sm:w-20 shrink-0 text-[10px] sm:text-[12px] font-bold text-slate-300 flex justify-between">
              <span>{localizedLabel.split(' ')[0]}</span>
              <span className="text-slate-500 font-mono text-[10px]">({stats.total})</span>
            </div>

            {stats.total === 0 ? (
              <div className="flex-1 h-3.5 bg-slate-950 rounded border border-slate-800/50 flex items-center justify-center">
                <span className="text-[9px] text-slate-600 tracking-wider">{t('noDataLabel')}</span>
              </div>
            ) : (
              <div className="flex-1 h-3.5 bg-slate-950 rounded overflow-hidden flex shadow-inner border border-slate-800/50">
                {goodP > 0 && (
                  <div
                    style={{ width: `${goodP}%` }}
                    className="bg-emerald-500 transition-all flex items-center justify-center min-w-0"
                  >
                    {goodP >= 12 && (
                      <span className="text-[8px] sm:text-[9px] font-black text-slate-950 leading-none truncate select-none px-0.5">
                        {stats.goodPercent}%
                      </span>
                    )}
                  </div>
                )}
                {neutralP > 0 && (
                  <div
                    style={{ width: `${neutralP}%` }}
                    className="bg-amber-500 transition-all flex items-center justify-center min-w-0"
                  >
                    {neutralP >= 12 && (
                      <span className="text-[8px] sm:text-[9px] font-black text-slate-950 leading-none truncate select-none px-0.5">
                        {stats.neutralPercent}%
                      </span>
                    )}
                  </div>
                )}
                {errorP > 0 && (
                  <div
                    style={{ width: `${errorP}%` }}
                    className="bg-rose-500 transition-all flex items-center justify-center min-w-0"
                  >
                    {errorP >= 12 && (
                      <span className="text-[8px] sm:text-[9px] font-black text-white leading-none truncate select-none px-0.5">
                        {stats.errorPercent}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default SkillBarStats;
