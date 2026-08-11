import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface AssetHealthCardProps {
  score: number; // 0 to 100
  assetName: string;
  assetType?: string;
}

export const AssetHealthCard = ({ score, assetName, assetType }: AssetHealthCardProps) => {
  const getScoreColor = (val: number) => {
    if (val >= 80) return { stroke: '#10b981', text: 'text-slate-800', bg: 'bg-slate-800/10 border-emerald-500/30' };
    if (val >= 55) return { stroke: '#f59e0b', text: 'text-slate-800', bg: 'bg-amber-500/10 border-amber-500/30' };
    return { stroke: '#f43f5e', text: 'text-slate-800', bg: 'bg-rose-500/10 border-rose-500/30' };
  };

  const style = getScoreColor(score);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:shadow-lg ${style.bg} flex items-center justify-between`}>
      <div className="space-y-1">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{assetType || 'Infrastructure'}</span>
        <h4 className="font-extrabold text-lg text-[#3A4046]">{assetName}</h4>
        <div className="flex items-center gap-1.5 text-xs font-bold mt-2">
          {score >= 80 ? (
            <ShieldCheck className="w-4 h-4 text-slate-800" />
          ) : (
            <AlertTriangle className={`w-4 h-4 ${style.text}`} />
          )}
          <span className={style.text}>
            {score >= 80 ? 'Optimal Health' : score >= 55 ? 'Moderate Degradation' : 'High Failure Risk'}
          </span>
        </div>
      </div>

      {/* Circular Progress Gauge */}
      <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r={radius} stroke="currentColor" strokeWidth="7" fill="transparent" className="text-slate-200" />
          <circle
            cx="45"
            cy="45"
            r={radius}
            stroke={style.stroke}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <span className={`absolute font-black text-xl ${style.text}`}>
          {score}
        </span>
      </div>
    </div>
  );
};
