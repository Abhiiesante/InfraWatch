import React, { useState } from 'react';
import { useAssets } from '@/features/assets/api/useAssets';
import { useAssetTelemetry, useSensorRules, useCreateSensorRule } from '../api/useTelemetry';
import { Activity, Cpu, Plus, Sliders, CheckCircle2 } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Live IoT Telemetry & Sensor Engine</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Real-time streaming telemetry, acoustic/vibration metrics, and dynamic threshold rule evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeAssetId}
            onChange={(e) => setSelectedAssetId(Number(e.target.value))}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold text-xs"
          >
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowRuleModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 text-xs"
          >
            <Plus className="w-4 h-4" /> Add Threshold Rule
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Stream Engine</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Real-time Streaming
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-3">{readings.length} Packets Received</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Last tick {readings[0] ? new Date(readings[0].timestamp).toLocaleTimeString() : 'just now'}</p>
        </div>

        <div className="glass-panel dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Active Sensor Metric</span>
            <Cpu className="w-5 h-5 text-indigo-500 animate-pulse" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-3">
            {readings[0] ? `${readings[0].value} ${readings[0].unit}` : 'Awaiting Sensor Data...'}
          </div>
          <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-1 font-bold">Type: {readings[0]?.sensorType || 'TEMPERATURE'}</p>
        </div>

        <div className="glass-panel dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Rule Evaluators</span>
            <Sliders className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-black text-purple-600 dark:text-purple-300 mt-3">{rules.length} Active Rules</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Auto-triggers alert notifications on breach</p>
        </div>
      </div>

      {/* Main Streaming Chart */}
      <div className="p-6 glass-panel dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-4">Real-Time Sensor Telemetry Stream</h3>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-slate-400">Connecting to stream...</div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                />
                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Threshold Rules Table */}
      <div className="glass-panel dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Active Sensor Threshold Rules</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Automated triggers generate alerts on breach</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-mono">
              <tr>
                <th className="px-6 py-3">Sensor Type</th>
                <th className="px-6 py-3">Asset</th>
                <th className="px-6 py-3">Min Bound</th>
                <th className="px-6 py-3">Max Bound</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {(Array.isArray(rules) ? rules : []).map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 font-mono">{rule.sensorType}</td>
                  <td className="px-6 py-4 font-medium">{rule.asset?.name || 'All Assets (Global)'}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">{rule.minThreshold ?? '—'}</td>
                  <td className="px-6 py-4 text-amber-600 dark:text-amber-400 font-extrabold font-mono">{rule.maxThreshold ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-xs font-black rounded-md bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-500/20">
                      {rule.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-100">Create Sensor Rule</h3>
              <button onClick={() => setShowRuleModal(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Sensor Type</label>
                <select
                  value={newRule.sensorType}
                  onChange={(e) => setNewRule({ ...newRule, sensorType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="TEMPERATURE">Temperature (°C)</option>
                  <option value="VIBRATION">Vibration (mm/s)</option>
                  <option value="ACOUSTIC">Acoustic Noise (dB)</option>
                  <option value="VOLTAGE">Voltage (V)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Min Threshold</label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={newRule.minThreshold}
                    onChange={(e) => setNewRule({ ...newRule, minThreshold: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Max Threshold</label>
                  <input
                    type="number"
                    placeholder="Max"
                    value={newRule.maxThreshold}
                    onChange={(e) => setNewRule({ ...newRule, maxThreshold: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium"
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
