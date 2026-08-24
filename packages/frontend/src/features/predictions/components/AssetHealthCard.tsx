import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface AssetHealthCardProps {
  score: number; // 0 to 100
  assetName: string;
  assetType?: string;
}

export const AssetHealthCard = ({ score, assetName, assetType }: AssetHealthCardProps) => {
  const getScoreColor = (val: number) => {
    if (val >= 80) return { stroke: '#10b981', text: 'text-emerald-700', bg: 'bg-white border-slate-200', badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    if (val >= 55) return { stroke: '#f59e0b', text: 'text-amber-700', bg: 'bg-white border-slate-200', badgeBg: 'bg-amber-50 text-amber-800 border-amber-200' };
    return { stroke: '#f43f5e', text: 'text-rose-700', bg: 'bg-white border-slate-200', badgeBg: 'bg-rose-50 text-rose-800 border-rose-200' };
  };

  const style = getScoreColor(score);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="p-6 rounded-3xl border bg-white border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
      <div className="space-y-1.5 min-w-0 pr-3">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block truncate">{assetType || 'Infrastructure'}</span>
        <h4 className="font-extrabold text-base text-slate-900 truncate">{assetName}</h4>
        <div className="flex items-center gap-1.5 text-xs font-bold pt-1">
          {score >= 80 ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className={`w-4 h-4 ${style.text} flex-shrink-0`} />
          )}
          <span className={style.text}>
            {score >= 80 ? 'Optimal Health' : score >= 55 ? 'Moderate Degradation' : 'High Failure Risk'}
          </span>
        </div>
      </div>

      {/* Circular Progress Gauge */}
      <div className="relative w-18 h-18 flex items-center justify-center flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r={radius} stroke="currentColor" strokeWidth="7" fill="transparent" className="text-slate-100" />
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
        <span className={`absolute font-black text-lg ${style.text}`}>
          {score}
        </span>
      </div>
    </div>
  );
};

