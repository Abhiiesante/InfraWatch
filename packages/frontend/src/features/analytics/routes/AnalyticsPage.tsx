import React from 'react';
import { useAnalyticsMetrics } from '../api/useAnalytics';
import { BarChart3, Clock, ShieldCheck, Download, Award, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const { data: metrics, isLoading } = useAnalyticsMetrics();

  const healthData = metrics?.healthByAssetType || [];
  const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6'];

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
      <div className="p-12 text-center text-slate-500 font-semibold text-sm">
        Computing real-time MTTR, MTBF, and SLA compliance metrics from database...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-black text-slate-900">Executive BI Analytics & Operations</h1>
          </div>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Real-time database metrics for Mean Time to Resolution (MTTR), Mean Time Between Failures (MTBF), and SLA Compliance.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all text-xs shadow-md shadow-slate-900/20 cursor-pointer"
        >
          <Download className="w-4 h-4" /> Export CSV Report
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">MTTR (Resolution Time)</span>
            <Clock className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{metrics?.mttrHours ?? 0} Hours</div>
          <p className="text-xs text-indigo-600 font-semibold">Mean resolution duration in DB</p>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">MTBF (Failure Interval)</span>
            <Award className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-700">{metrics?.mtbfDays ?? 0} Days</div>
          <p className="text-xs text-slate-500 font-semibold">Mean duration between incidents</p>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">SLA Compliance</span>
            <ShieldCheck className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{metrics?.slaCompliance ?? 0}%</div>
          <p className="text-xs text-slate-500 font-semibold">Database SLA compliance rate</p>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Monitored Assets</span>
            <Layers className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{metrics?.totalAssets ?? 0} Nodes</div>
          <p className="text-xs text-slate-500 font-semibold">Active infrastructure count</p>
        </div>
      </div>

      {/* Chart: Asset Health Breakdown */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Average Asset Health Score by Category</h3>
            <p className="text-xs text-slate-500 font-medium">Live database category health index breakdown</p>
          </div>
        </div>

        {healthData.length > 0 ? (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={healthData}>
                <XAxis dataKey="type" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '1rem', color: '#0f172a', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
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

