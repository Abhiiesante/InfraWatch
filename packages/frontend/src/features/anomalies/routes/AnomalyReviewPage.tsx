import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAnomalies } from '../api/useAnomalies';
import { Sparkles, Eye, Clock, Video, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export const AnomalyReviewPage = () => {
  const [page] = useState(1);
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
  const take = 9;
  const skip = (page - 1) * take;

  const { data, isLoading } = useAnomalies({ skip, take, status: statusFilter || undefined });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-300 dark:to-indigo-300 drop-shadow-sm flex items-center gap-3">
            <Sparkles className="w-9 h-9 text-purple-500" />
            AI Computer Vision Review Queue
          </h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">
            Human-in-the-Loop (HITL) review for computer vision flags & detected hazards.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-3 border-b border-white/10 pb-4">
        {[
          { label: 'Pending Review', value: 'PENDING_REVIEW' },
          { label: 'Confirmed', value: 'CONFIRMED' },
          { label: 'Dismissed', value: 'DISMISSED' },
          { label: 'All Flags', value: '' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
              statusFilter === tab.value
                ? 'bg-purple-600 text-white shadow-purple-500/25'
                : 'bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-purple-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Anomaly Cards Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
          <p className="text-slate-500 font-medium">Analyzing camera streams & loading flags...</p>
        </div>
      ) : data?.anomalies?.length === 0 ? (
        <div className="glass rounded-2xl border border-white/20 p-16 text-center shadow-xl">
          <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-purple-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Review Queue Clear!</h3>
          <p className="text-slate-500 max-w-md mx-auto">
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
              <div key={anomaly.id} className="glass rounded-2xl border border-white/20 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group flex flex-col">
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  <img
                    src={anomaly.imageUrl || 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80'}
                    alt="AI Detection Frame"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1.5 border border-white/20">
                    <Video className="w-3.5 h-3.5 text-purple-400" />
                    {anomaly.camera?.name || 'Camera Feed'}
                  </div>
                  <div className="absolute top-3 right-3 bg-purple-600/90 text-white backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold shadow-md">
                    {confDisplay}% Confidence
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wider">
                        {primaryDetection.label}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        anomaly.status === 'PENDING_REVIEW'
                          ? 'bg-amber-100 text-amber-800'
                          : anomaly.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {anomaly.status}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mt-1">
                      {primaryDetection.label.replace(/_/g, ' ')} Flag
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(anomaly.createdAt), 'PPpp')}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <Link
                      to={`/anomalies/${anomaly.id}`}
                      className="w-full bg-purple-600/10 hover:bg-purple-600 text-purple-600 hover:text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-300"
                    >
                      <Eye className="w-4 h-4" />
                      Review Frame & Details
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
