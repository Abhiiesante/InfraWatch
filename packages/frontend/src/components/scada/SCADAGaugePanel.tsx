import { Gauge } from 'lucide-react';

interface SCADAGaugePanelProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  unit: string;
  warningThreshold?: number;
  dangerThreshold?: number;
}

export function SCADAGaugePanel({
  label = 'Grid Voltage Load',
  value = 400.2,
  min = 360,
  max = 440,
  unit = 'kV',
  warningThreshold = 420,
  dangerThreshold = 435,
}: SCADAGaugePanelProps) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const isDanger = value >= dangerThreshold;
  const isWarning = value >= warningThreshold && !isDanger;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-indigo-500 dark:text-cyan-400" /> {label}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
            isDanger
              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/40 animate-pulse'
              : isWarning
              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/40'
              : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40'
          }`}
        >
          {isDanger ? 'DANGER HIGH' : isWarning ? 'ELEVATED' : 'NOMINAL'}
        </span>
      </div>

      <div className="flex items-end justify-between pt-1">
        <div>
          <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {value}
          </span>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400 ml-1.5 font-mono">{unit}</span>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Range: {min}–{max} {unit}
        </span>
      </div>

      {/* Industrial Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden relative">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isDanger
              ? 'bg-gradient-to-r from-amber-500 to-rose-600'
              : isWarning
              ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
              : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
