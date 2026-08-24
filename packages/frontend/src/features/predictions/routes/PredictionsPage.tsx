import { useState } from 'react';
import { usePredictions, useHealthScore, useRunPrediction } from '../api/usePredictions';
import { useAssets } from '@/features/assets/api/useAssets';
import { AssetHealthCard } from '../components/AssetHealthCard';
import { Activity, ShieldCheck, AlertTriangle, Play, Calendar, Loader2, Cpu, Zap } from 'lucide-react';
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
    <div className="space-y-8 w-full animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              <Activity className="w-8 h-8 text-indigo-600" />
              Predictive Maintenance Engine (V2.0)
            </h1>
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
              <Zap className="w-3.5 h-3.5 text-indigo-600" /> ML FORECASTING
            </span>
          </div>
          <p className="text-slate-600 mt-1.5 text-base font-medium">
            Time-series forecasting, risk probability scoring & automated preventive scheduling.
          </p>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Overall Infrastructure Health</p>
            <p className="text-4xl font-black text-slate-900 mt-1">
              {isHealthLoading ? '...' : `${healthData?.overallHealth || 100}%`}
            </p>
            <p className="text-xs text-emerald-700 font-bold mt-2 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Normal Operating Parameters
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-black text-2xl">
            {healthData?.overallHealth || 100}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Monitored Assets</p>
            <p className="text-4xl font-black text-slate-900 mt-1">
              {isHealthLoading ? '...' : healthData?.assetCount || 0}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-2">Active telemetry & inspection logs</p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold">
            <Cpu className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">High Risk / At Risk</p>
            <p className="text-4xl font-black text-rose-600 mt-1">
              {isHealthLoading ? '...' : healthData?.atRiskCount || 0}
            </p>
            <p className="text-xs text-rose-700 font-bold mt-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-rose-600" /> Requires Preventive Inspection
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-bold">
            <AlertTriangle className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Recharts Predictive Trend Chart */}
      <PredictiveTrendChart />

      {/* Asset Health Overview Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
          <h2 className="text-xl font-extrabold text-slate-900">Asset Health Gauges</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assetsData?.assets?.map((asset: any) => (
            <div key={asset.id} className="relative group space-y-2">
              <AssetHealthCard
                score={asset.healthScore || 95}
                assetName={asset.name}
                assetType={asset.assetType?.name}
              />
              <button
                onClick={() => handleRunAnalysis(asset.id)}
                disabled={isRunning && selectedAssetId === asset.id}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isRunning && selectedAssetId === asset.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-white" />
                )}
                Run Predictive Analysis
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast & Risk Ranking Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-4">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Failure Risk Forecasts & Auto-Scheduled Maintenance
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-xs border-b border-slate-100">
              <tr>
                <th className="px-8 py-4">Asset</th>
                <th className="px-8 py-4">Failure Probability</th>
                <th className="px-8 py-4">Predicted Failure Date</th>
                <th className="px-8 py-4">Recommended Action</th>
                <th className="px-8 py-4">Auto-Scheduled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isPredLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
                    <p className="text-slate-600 font-medium">Computing time-series probabilities...</p>
                  </td>
                </tr>
              ) : predictionsData?.predictions?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-slate-500 font-medium">
                    No active prediction forecasts. Click "Run Predictive Analysis" on an asset card above.
                  </td>
                </tr>
              ) : (
                predictionsData?.predictions?.map((pred: any) => (
                  <tr key={pred.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4 font-bold text-slate-900">
                      {pred.asset?.name}
                    </td>
                    <td className="px-8 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                        Number(pred.failureProbability) > 70
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : Number(pred.failureProbability) > 40
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {pred.failureProbability}% Risk
                      </span>
                    </td>
                    <td className="px-8 py-4 font-medium text-slate-600">
                      {format(new Date(pred.predictedFailureDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-8 py-4 text-xs font-medium text-slate-700 max-w-xs truncate">
                      {pred.recommendedAction}
                    </td>
                    <td className="px-8 py-4">
                      {pred.autoScheduledInspectionId ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
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

