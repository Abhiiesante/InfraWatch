import { useState } from 'react';
import { usePredictions, useHealthScore, useRunPrediction } from '../api/usePredictions';
import { useAssets } from '@/features/assets/api/useAssets';
import { AssetHealthCard } from '../components/AssetHealthCard';
import { Activity, ShieldCheck, AlertTriangle, Play, Calendar, Loader2, Cpu } from 'lucide-react';
import { format } from 'date-fns';
import { PredictiveTrendChart } from '@/components/charts/PredictiveTrendChart';

export const PredictionsPage = () => {
  const [page] = useState(1);
  const take = 10;
  const skip = (page - 1) * take;

  const { data: healthData, isLoading: isHealthLoading } = useHealthScore();
  const { data: predictionsData, isLoading: isPredLoading } = usePredictions({ skip, take });
  const { data: assetsData } = useAssets({ skip: 0, take: 50 });
  const { mutateAsync: runPrediction, isPending: isRunning } = useRunPrediction();
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

  const handleRunAnalysis = async (assetId: number) => {
    try {
      setSelectedAssetId(assetId);
      await runPrediction(assetId);
    } catch (error) {
      console.error('Prediction failed:', error);
    } finally {
      setSelectedAssetId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 drop- flex items-center gap-3">
            <Activity className="w-9 h-9 text-slate-800" />
            Predictive Maintenance Engine (V2.0)
          </h1>
          <p className="text-slate-800/70 mt-2 text-lg font-medium">
            Time-series forecasting, risk probability scoring & automated preventive scheduling.
          </p>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 border border-white/20 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Overall Infrastructure Health</p>
            <p className="text-4xl font-black text-[#3A4046] mt-1">
              {isHealthLoading ? '...' : `${healthData?.overallHealth || 100}%`}
            </p>
            <p className="text-xs text-slate-800 font-bold mt-2 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Normal Operating Parameters
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-slate-800/10 border border-emerald-500/30 flex items-center justify-center text-slate-800 font-black text-2xl">
            {healthData?.overallHealth || 100}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-white/20 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Monitored Assets</p>
            <p className="text-4xl font-black text-[#3A4046] mt-1">
              {isHealthLoading ? '...' : healthData?.assetCount || 0}
            </p>
            <p className="text-xs text-slate-800/70 font-medium mt-2">Active telemetry & inspection logs</p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 font-bold">
            <Cpu className="w-8 h-8" />
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-white/20 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">High Risk / At Risk</p>
            <p className="text-4xl font-black text-slate-800 mt-1">
              {isHealthLoading ? '...' : healthData?.atRiskCount || 0}
            </p>
            <p className="text-xs text-slate-800 font-bold mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Requires Preventive Inspection
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-slate-800 font-bold">
            <AlertTriangle className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Recharts Predictive Trend Chart */}
      <PredictiveTrendChart />

      {/* Asset Health Overview Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-[#3A4046] flex items-center gap-2">
          <div className="w-1.5 h-6 bg-slate-800 rounded-full"></div>
          Asset Health Gauges
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assetsData?.assets?.map((asset: any) => (
            <div key={asset.id} className="relative group">
              <AssetHealthCard
                score={asset.healthScore || 95}
                assetName={asset.name}
                assetType={asset.assetType?.name}
              />
              <button
                onClick={() => handleRunAnalysis(asset.id)}
                disabled={isRunning && selectedAssetId === asset.id}
                className="mt-2 w-full py-2 glass-panel/40 hover:bg-slate-800 text-slate-700 hover:text-slate-800 font-bold text-xs rounded-xl border border-white/20 transition-all duration-300 flex items-center justify-center gap-2 "
              >
                {isRunning && selectedAssetId === asset.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-slate-800 group-hover:text-slate-800" />
                )}
                Run Predictive Analysis
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast & Risk Ranking Table */}
      <div className="glass rounded-2xl border border-white/20 overflow-hidden shadow-xl space-y-4">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-[#3A4046] flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-800" />
            Failure Risk Forecasts & Auto-Scheduled Maintenance
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100/50 text-slate-700 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-8 py-4">Asset</th>
                <th className="px-8 py-4">Failure Probability</th>
                <th className="px-8 py-4">Predicted Failure Date</th>
                <th className="px-8 py-4">Recommended Action</th>
                <th className="px-8 py-4">Auto-Scheduled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50">
              {isPredLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-800 mx-auto mb-2" />
                    <p className="text-slate-800/70 font-medium">Computing time-series probabilities...</p>
                  </td>
                </tr>
              ) : predictionsData?.predictions?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-slate-800/70 font-medium">
                    No active prediction forecasts. Click "Run Predictive Analysis" on an asset card above.
                  </td>
                </tr>
              ) : (
                predictionsData?.predictions?.map((pred: any) => (
                  <tr key={pred.id} className="hover:glass-panel/60 transition-colors">
                    <td className="px-8 py-4 font-bold text-[#3A4046]">
                      {pred.asset?.name}
                    </td>
                    <td className="px-8 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                        Number(pred.failureProbability) > 70
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : Number(pred.failureProbability) > 40
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-slate-800/10 text-emerald-800 border-slate-800/20'
                      }`}>
                        {pred.failureProbability}% Risk
                      </span>
                    </td>
                    <td className="px-8 py-4 font-medium text-slate-800/70">
                      {format(new Date(pred.predictedFailureDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-8 py-4 text-xs font-medium text-slate-700 max-w-xs truncate">
                      {pred.recommendedAction}
                    </td>
                    <td className="px-8 py-4">
                      {pred.autoScheduledInspectionId ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <Calendar className="w-3.5 h-3.5" /> Inspection #{pred.autoScheduledInspectionId}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Not Required</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
