import React, { useState } from 'react';
import { useAssets } from '@/features/assets/api/useAssets';
import { useAssetTelemetry, useSensorRules, useCreateSensorRule } from '../api/useTelemetry';
import { Activity, Cpu, Plus, Sliders, CheckCircle2, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const TelemetryDashboardPage: React.FC = () => {
  const { data: assetsData } = useAssets({ skip: 0, take: 50 });
  const assets = assetsData?.assets || [];

  const [selectedAssetId, setSelectedAssetId] = useState<number | undefined>(assets[0]?.id);
  const activeAssetId = selectedAssetId || assets[0]?.id || 1;

  const { data: readings = [], isLoading } = useAssetTelemetry(activeAssetId);
  const { data: rules = [] } = useSensorRules();
  const createRuleMutation = useCreateSensorRule();

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newRule, setNewRule] = useState({
    sensorType: 'TEMPERATURE',
    minThreshold: '',
    maxThreshold: '85',
    action: 'ALERT',
  });

  const chartData = [...readings].reverse().map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    value: Number(r.value),
    isAnomaly: r.isAnomaly,
  }));

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRuleMutation.mutateAsync({
      assetId: activeAssetId,
      sensorType: newRule.sensorType,
      minThreshold: newRule.minThreshold ? Number(newRule.minThreshold) : undefined,
      maxThreshold: newRule.maxThreshold ? Number(newRule.maxThreshold) : undefined,
      action: newRule.action,
    });
    setShowRuleModal(false);
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Activity className="w-8 h-8 text-indigo-600 animate-pulse" />
              Live IoT Telemetry & Sensor Engine
            </h1>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
              <Zap className="w-3.5 h-3.5 text-emerald-600" /> REAL-TIME STREAMING
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Real-time streaming telemetry, acoustic/vibration metrics, and dynamic threshold rule evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeAssetId}
            onChange={(e) => setSelectedAssetId(Number(e.target.value))}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 font-bold text-xs shadow-xs"
          >
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowRuleModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md shadow-slate-900/20 text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Threshold Rule
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Stream Engine</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Live Connected
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-3">{readings.length} Packets Received</div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Last packet {readings[0] ? new Date(readings[0].timestamp).toLocaleTimeString() : 'just now'}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Active Sensor Metric</span>
            <Cpu className="w-5 h-5 text-indigo-600 animate-pulse" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-3">
            {readings[0] ? `${readings[0].value} ${readings[0].unit}` : 'Awaiting Telemetry...'}
          </div>
          <p className="text-xs text-indigo-600 mt-1 font-bold">Type: {readings[0]?.sensorType || 'TEMPERATURE'}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Rule Evaluators</span>
            <Sliders className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-purple-700 mt-3">{rules.length} Active Rules</div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Auto-triggers alert notifications on breach</p>
        </div>
      </div>

      {/* Main Streaming Chart */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900">Real-Time Sensor Telemetry Stream</h3>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 font-medium">Connecting to stream...</div>
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '1rem', color: '#0f172a', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Threshold Rules Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900">Active Sensor Threshold Rules</h3>
          <span className="text-xs text-slate-500 font-medium">Automated triggers generate alerts on breach</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100 font-mono">
              <tr>
                <th className="px-6 py-4">Sensor Type</th>
                <th className="px-6 py-4">Asset</th>
                <th className="px-6 py-4">Min Bound</th>
                <th className="px-6 py-4">Max Bound</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Array.isArray(rules) ? rules : []).map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900 font-mono">{rule.sensorType}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{rule.asset?.name || 'All Assets (Global)'}</td>
                  <td className="px-6 py-4 text-slate-500 font-mono">{rule.minThreshold ?? '—'}</td>
                  <td className="px-6 py-4 text-amber-700 font-extrabold font-mono">{rule.maxThreshold ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {rule.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs font-extrabold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                    </span>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No active threshold rules configured. Click "Add Threshold Rule" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-extrabold text-slate-900">Create Sensor Rule</h3>
              <button onClick={() => setShowRuleModal(false)} className="text-slate-400 hover:text-slate-700 font-bold p-1">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sensor Type</label>
                <select
                  value={newRule.sensorType}
                  onChange={(e) => setNewRule({ ...newRule, sensorType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="TEMPERATURE">Temperature (°C)</option>
                  <option value="VIBRATION">Vibration (mm/s)</option>
                  <option value="ACOUSTIC">Acoustic Noise (dB)</option>
                  <option value="VOLTAGE">Voltage (V)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Threshold</label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={newRule.minThreshold}
                    onChange={(e) => setNewRule({ ...newRule, minThreshold: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Threshold</label>
                  <input
                    type="number"
                    placeholder="Max"
                    value={newRule.maxThreshold}
                    onChange={(e) => setNewRule({ ...newRule, maxThreshold: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

