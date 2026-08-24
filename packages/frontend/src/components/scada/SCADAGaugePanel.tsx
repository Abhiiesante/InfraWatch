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
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1.5 truncate">
          <Gauge className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border flex-shrink-0 ${
            isDanger
              ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
              : isWarning
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {isDanger ? 'DANGER HIGH' : isWarning ? 'ELEVATED' : 'NOMINAL'}
        </span>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1">
        <div className="flex items-baseline">
          <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
            {value}
          </span>
          <span className="text-xs font-extrabold text-slate-500 ml-1.5 font-mono">{unit}</span>
        </div>
        <span className="text-xs font-mono font-semibold text-slate-400">
          Range: {min}–{max} {unit}
        </span>
      </div>

      {/* Industrial Progress Bar */}
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isDanger
              ? 'bg-gradient-to-r from-amber-500 to-rose-600'
              : isWarning
              ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
              : 'bg-gradient-to-r from-indigo-500 to-teal-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

