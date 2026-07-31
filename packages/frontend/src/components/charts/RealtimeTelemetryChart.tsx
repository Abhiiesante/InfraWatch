import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface RealtimeTelemetryChartProps {
  title?: string;
  unit?: string;
  color?: string;
  initialValue?: number;
  min?: number;
  max?: number;
  intervalMs?: number;
  readings?: any[];
  sensorType?: string;
}

export function RealtimeTelemetryChart({
  title = 'Vibration Strain Sensor',
  unit = 'mm/s',
  color = '#06b6d4',
  initialValue = 2.14,
  min = 0,
  max = 100,
  intervalMs = 3000,
  readings,
  sensorType,
}: RealtimeTelemetryChartProps) {
  const [data, setData] = useState<{ time: string; value: number }[]>([]);
  const [currentVal, setCurrentVal] = useState<number>(initialValue);

  useEffect(() => {
    if (readings && readings.length > 0) {
      const filtered = sensorType
        ? readings.filter((r: any) => r.sensorType?.toUpperCase() === sensorType.toUpperCase())
        : readings;

      if (filtered.length > 0) {
        const sorted = [...filtered].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const points = sorted.slice(-15).map((r: any) => ({
          time: format(new Date(r.timestamp), 'HH:mm:ss'),
          value: Number(r.value),
        }));
        setData(points);
        setCurrentVal(points[points.length - 1].value);
        return;
      }
    }

    // Fallback: rule-based progression if readings haven't populated yet
    const now = Date.now();
    const points = Array.from({ length: 12 }, (_, i) => {
      const t = new Date(now - (11 - i) * intervalMs);
      const val = +(initialValue + Math.sin((t.getTime() + (sensorType ? sensorType.length * 100 : 0)) / 15000) * 0.8).toFixed(2);
      return {
        time: format(t, 'HH:mm:ss'),
        value: Math.max(min, val),
      };
    });
    setData(points);
    setCurrentVal(points[points.length - 1].value);
  }, [readings, sensorType, initialValue, min, max, intervalMs]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color }} />
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{title}</h4>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span className="text-xs font-black" style={{ color }}>
            {currentVal} {unit}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" /> LIVE
          </span>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} domain={[min, max]} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
                borderRadius: '12px',
                fontSize: '11px',
                color: '#fff',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#grad-${title.replace(/\s+/g, '')})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
