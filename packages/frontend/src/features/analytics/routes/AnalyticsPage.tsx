import React from 'react';
import { useAnalyticsMetrics } from '../api/useAnalytics';
import { BarChart3, Clock, ShieldCheck, Download, Award, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const { data: metrics, isLoading } = useAnalyticsMetrics();

  const healthData = metrics?.healthByAssetType || [];
  const COLORS = ['#818cf8', '#f43f5e', '#34d399', '#fbbf24'];

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,Metric,Value\nMTTR (Hours)," +
      (metrics?.mttrHours ?? 0) +
      "\nMTBF (Days)," +
      (metrics?.mtbfDays ?? 0) +
      "\nSLA Compliance (%)," +
      (metrics?.slaCompliance ?? 0) +
      "\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "InfraWatch_Executive_Metrics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-300 font-semibold text-sm">
        Computing real-time MTTR, MTBF, and SLA compliance metrics from database...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Executive BI Analytics & Operations</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Real-time database metrics for Mean Time to Resolution (MTTR), Mean Time Between Failures (MTBF), and SLA Compliance.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all text-sm shadow-sm"
        >
          <Download className="w-4 h-4" /> Export CSV Report
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">MTTR (Resolution Time)</span>
            <Clock className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{metrics?.mttrHours ?? 0} Hours</div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Mean resolution duration in DB</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">MTBF (Failure Interval)</span>
            <Award className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{metrics?.mtbfDays ?? 0} Days</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Mean duration between incidents</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SLA Compliance</span>
            <ShieldCheck className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{metrics?.slaCompliance ?? 0}%</div>
          <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">Database SLA compliance rate</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Monitored Assets</span>
            <Layers className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{metrics?.totalAssets ?? 0} Nodes</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Active infrastructure count</p>
        </div>
      </div>

      {/* Chart: Asset Health Breakdown */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Average Asset Health Score by Category</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Live database category health index breakdown</p>
          </div>
        </div>

        {healthData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={healthData}>
                <XAxis dataKey="type" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                />
                <Bar dataKey="averageHealth" radius={[8, 8, 0, 0]}>
                  {healthData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No category breakdown data available in database
          </div>
        )}
      </div>
    </div>
  );
};
