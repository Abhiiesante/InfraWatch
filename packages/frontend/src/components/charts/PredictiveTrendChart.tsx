import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Activity } from 'lucide-react';

interface PredictiveTrendChartProps {
  title?: string;
  data?: { day: string; riskPct: number; healthScore: number }[];
}

export function PredictiveTrendChart({
  title = '14-Day Predictive Failure Risk & Health Trend',
  data = [
    { day: 'Day 1', riskPct: 1.2, healthScore: 98 },
    { day: 'Day 2', riskPct: 1.4, healthScore: 97 },
    { day: 'Day 3', riskPct: 1.5, healthScore: 97 },
    { day: 'Day 4', riskPct: 1.8, healthScore: 96 },
    { day: 'Day 5', riskPct: 2.1, healthScore: 95 },
    { day: 'Day 6', riskPct: 2.5, healthScore: 94 },
    { day: 'Day 7', riskPct: 3.0, healthScore: 93 },
    { day: 'Day 8', riskPct: 3.4, healthScore: 92 },
    { day: 'Day 9', riskPct: 3.8, healthScore: 91 },
    { day: 'Day 10', riskPct: 4.2, healthScore: 90 },
    { day: 'Day 11', riskPct: 4.6, healthScore: 89 },
    { day: 'Day 12', riskPct: 5.1, healthScore: 88 },
    { day: 'Day 13', riskPct: 5.6, healthScore: 87 },
    { day: 'Day 14', riskPct: 6.2, healthScore: 86 },
  ],
}: PredictiveTrendChartProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-600" /> {title}
        </h3>
        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-bold">
          PROPHET AI FORECAST
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
                borderRadius: '12px',
                fontSize: '11px',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Line
              type="monotone"
              dataKey="healthScore"
              name="Health Score (%)"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="riskPct"
              name="Failure Risk (%)"
              stroke="#f43f5e"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
