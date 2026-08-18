import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAnomalies, useConfirmAnomaly, useDismissAnomaly } from '../api/useAnomalies';
import { Sparkles, Eye, Clock, Video, Loader2, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { BoundingBoxOverlay } from '../components/BoundingBoxOverlay';

export const AnomalyReviewPage = () => {
  const [page] = useState(1);
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
  const take = 9;
  const skip = (page - 1) * take;

  const { data, isLoading } = useAnomalies({ skip, take, status: statusFilter || undefined });
  const { mutateAsync: confirmAnomaly, isPending: isConfirming } = useConfirmAnomaly();
  const { mutateAsync: dismissAnomaly, isPending: isDismissing } = useDismissAnomaly();

  const handleQuickConfirm = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await confirmAnomaly(id);
    } catch (err) {
      console.error('Failed to confirm anomaly:', err);
    }
  };

  const handleQuickDismiss = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dismissAnomaly(id);
    } catch (err) {
      console.error('Failed to dismiss anomaly:', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm flex items-center gap-3">
            <Sparkles className="w-9 h-9 text-cyan-600" />
            AI Computer Vision Review Queue
          </h1>
          <p className="text-slate-600 mt-2 text-lg font-medium">
            Human-in-the-Loop (HITL) review for computer vision flags & detected hazards.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-3 border-b border-slate-200 pb-4">
        {[
          { label: 'Pending Review', value: 'PENDING_REVIEW' },
          { label: 'Confirmed', value: 'CONFIRMED' },
          { label: 'Dismissed', value: 'DISMISSED' },
          { label: 'All Flags', value: '' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
              statusFilter === tab.value
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Anomaly Cards Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-slate-800 mb-4" />
          <p className="text-slate-600 font-medium">Analyzing camera streams & loading flags...</p>
        </div>
      ) : data?.anomalies?.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-16 text-center shadow-lg">
          <div className="w-20 h-20 bg-cyan-50 border border-cyan-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-cyan-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Review Queue Clear!</h3>
          <p className="text-slate-600 max-w-md mx-auto">
            No camera anomalies pending human review under the selected filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data?.anomalies?.map((anomaly: any) => {
            const detections = (anomaly.detections as any[]) || [];
            const primaryDetection = detections[0] || { label: 'HAZARD', confidence: anomaly.confidence };
            const confVal = Number(anomaly.confidence);
            const confDisplay = confVal <= 1 ? Math.round(confVal * 100) : Math.round(confVal);

            return (
              <div key={anomaly.id} className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group flex flex-col hover:-translate-y-1">
                <div className="relative aspect-video rounded-t-3xl overflow-hidden bg-black/5 border-b border-slate-200">
                  <BoundingBoxOverlay 
                    imageUrl={anomaly.imageUrl} 
                    detections={detections} 
                    cameraName={anomaly.camera?.name || 'Camera Feed'}
                  />
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        {primaryDetection.label}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        anomaly.status === 'PENDING_REVIEW'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : anomaly.status === 'CONFIRMED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {anomaly.status} ({confDisplay}%)
                      </span>
                    </div>
                    <h3 className="font-extrabold text-lg text-slate-900 mt-1">
                      {primaryDetection.label.replace(/_/g, ' ')} Flag
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(anomaly.createdAt), 'PPpp')}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    {anomaly.status === 'PENDING_REVIEW' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => handleQuickConfirm(anomaly.id, e)}
                          disabled={isConfirming || isDismissing}
                          className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Hazard</span>
                        </button>
                        <button
                          onClick={(e) => handleQuickDismiss(anomaly.id, e)}
                          disabled={isConfirming || isDismissing}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Dismiss</span>
                        </button>
                      </div>
                    )}
                    <Link
                      to={`/anomalies/${anomaly.id}`}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      View Full Frame Analysis
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
