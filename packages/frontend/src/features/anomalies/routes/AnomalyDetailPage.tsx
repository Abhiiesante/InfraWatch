import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAnomalyDetails, useConfirmAnomaly, useDismissAnomaly } from '../api/useAnomalies';
import { ArrowLeft, Sparkles, CheckCircle2, XCircle, Loader2, Camera, ShieldCheck, Video, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';
import { BoundingBoxOverlay } from '../components/BoundingBoxOverlay';

export const AnomalyDetailPage = () => {
  const { id } = useParams();
  const anomalyId = Number(id);
  const navigate = useNavigate();

  const { data: anomaly, isLoading } = useAnomalyDetails(anomalyId);
  const { mutateAsync: confirmAnomaly, isPending: isConfirming } = useConfirmAnomaly();
  const { mutateAsync: dismissAnomaly, isPending: isDismissing } = useDismissAnomaly();

  const [streamMode, setStreamMode] = useState<'SNAPSHOT' | 'LIVE'>('SNAPSHOT');
  const [isPlaying, setIsPlaying] = useState(true);
  const [liveTimestamp, setLiveTimestamp] = useState(new Date());

  // Real-time ticking clock for live RTSP stream mode
  useEffect(() => {
    let timer: any;
    if (streamMode === 'LIVE' && isPlaying) {
      timer = setInterval(() => {
        setLiveTimestamp(new Date());
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [streamMode, isPlaying]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!anomaly) {
    return <div className="p-8 text-center text-slate-800/70">Anomaly flag not found</div>;
  }

  const detections = (anomaly.detections as any[]) || [];
  const primaryDetection = detections[0] || { label: 'HAZARD', confidence: anomaly.confidence };

  const confVal = Number(anomaly.confidence);
  const confDisplay = confVal <= 1 ? Math.round(confVal * 100) : Math.round(confVal);

  const handleConfirm = async () => {
    try {
      await confirmAnomaly(anomalyId);
      navigate('/anomalies');
    } catch (error) {
      console.error('Failed to confirm anomaly:', error);
    }
  };

  const handleDismiss = async () => {
    try {
      await dismissAnomaly(anomalyId);
      navigate('/anomalies');
    } catch (error) {
      console.error('Failed to dismiss anomaly:', error);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 w-full animate-in fade-in">
      <Link to="/anomalies" className="inline-flex items-center text-sm font-bold text-slate-800/70 hover:text-slate-800 transition-colors glass-panel/50 px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.80)]  backdrop-blur-sm w-fit">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Review Queue
      </Link>

      {/* Header */}
      <div className="glass rounded-2xl border border-white/20 p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-300">
                AI COMPUTER VISION FLAG
              </span>
              <span className="text-xs text-slate-800/70 font-bold">
                {format(new Date(anomaly.createdAt), 'PPpp')}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#3A4046] mt-2">
              {primaryDetection.label.replace(/_/g, ' ')}
            </h1>
            <p className="text-slate-800/70 mt-1 font-medium">
              Camera: <strong className="text-slate-700">{anomaly.camera?.name}</strong> | Asset: <strong className="text-slate-700">{anomaly.camera?.asset?.name}</strong>
            </p>
          </div>

          <div className="flex items-center gap-4">
            {anomaly.status === 'PENDING_REVIEW' ? (
              <>
                <button
                  onClick={handleDismiss}
                  disabled={isDismissing || isConfirming}
                  className="px-6 py-3 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-2 border border-slate-300"
                >
                  {isDismissing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-5 h-5 text-slate-400" />}
                  Dismiss (False Positive)
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming || isDismissing}
                  className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-slate-800 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all flex items-center gap-2"
                >
                  {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Confirm & File Incident
                </button>
              </>
            ) : (
              <span className="px-5 py-2.5 rounded-xl font-bold text-sm bg-purple-100 text-purple-800 border border-purple-200">
                Status: {anomaly.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Frame Visualizer & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Frame Canvas Overlay */}
        <div className="lg:col-span-2 glass rounded-2xl border border-white/20 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-[#3A4046] flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-500" />
              {streamMode === 'LIVE' ? 'Real-Time Camera RTSP Feed' : 'Analyzed Event Frame'}
            </h2>

            {/* Interactive Stream Mode Toggle */}
            <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.55)] p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setStreamMode('SNAPSHOT')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  streamMode === 'SNAPSHOT' ? 'bg-purple-600 text-slate-800 shadow' : 'text-slate-400 hover:text-slate-800'
                }`}
              >
                Snapshot Frame
              </button>
              <button
                onClick={() => setStreamMode('LIVE')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  streamMode === 'LIVE' ? 'bg-emerald-600 text-slate-800 shadow' : 'text-slate-400 hover:text-slate-800'
                }`}
              >
                <Video className="w-3.5 h-3.5 animate-pulse" /> Live Stream
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden shadow-2xl bg-black aspect-video flex items-center justify-center">
            {streamMode === 'SNAPSHOT' ? (
              <BoundingBoxOverlay 
                imageUrl={anomaly.imageUrl} 
                detections={detections}
                cameraName={anomaly.camera?.name || 'Camera Feed'}
              />
            ) : (
              <div className="relative w-full h-full">
                <img
                  src={anomaly.imageUrl || '/images/bandra_sealink_inspection.png'}
                  alt="Anomaly detection frame"
                  onError={(e) => {
                    e.currentTarget.src = '/images/bandra_sealink_inspection.png';
                  }}
                  className="w-full h-full object-cover opacity-70"
                />
                
                {/* Live RTSP Real-Time HUD Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 bg-gradient-to-b from-black/50 via-transparent to-black/60">
                  {/* Top Live Bar */}
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400">
                    <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full border border-emerald-500/40 backdrop-blur-md">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      <span className="text-slate-800 text-white">REC ⏺ 30.0 FPS</span>
                    </div>
                    <div className="bg-black/60 px-3 py-1 rounded-full text-slate-200 border border-white/20 backdrop-blur-md">
                      {format(liveTimestamp, 'yyyy-MM-dd HH:mm:ss')}
                    </div>
                  </div>

                  {/* Animated Moving Laser Scan Grid Line */}
                  {isPlaying && (
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-scan-laser pointer-events-none top-1/3" />
                  )}

                  {/* Real-time Tracking Bounding Box */}
                  <div className="absolute inset-x-14 inset-y-10 border-2 border-cyan-400 bg-cyan-400/10 rounded-lg animate-pulse pointer-events-none flex items-start justify-start p-2">
                    <span className="bg-cyan-500 text-white font-extrabold text-xs px-2.5 py-1 rounded shadow-lg flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      LIVE TRACKING: {primaryDetection.label.replace(/_/g, ' ')} ({confDisplay}%)
                    </span>
                  </div>

                  {/* Bottom Live Controls Bar */}
                  <div className="flex items-center justify-between text-xs font-bold text-white pointer-events-auto">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-lg border border-slate-700 transition-all flex items-center gap-1.5"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                        {isPlaying ? 'Pause Feed' : 'Resume Feed'}
                      </button>
                      <span className="text-[11px] text-slate-300">RTSP: {anomaly.camera?.rtspUrl || 'rtsp://cam.infrawatch.in/stream'}</span>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                      4K ULTRA HD
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Model Details Sidebar */}
        <div className="space-y-6">
          <div className="glass rounded-2xl border border-white/20 p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-extrabold text-[#3A4046] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Inference Parameters
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-slate-800/70 font-medium">Model Architecture:</span>
                <span className="font-bold text-slate-800">YOLOv8 Industrial CV</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-slate-800/70 font-medium">Confidence Score:</span>
                <span className="font-extrabold text-slate-800">{confDisplay}%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-slate-800/70 font-medium">Flag Type:</span>
                <span className="font-bold text-slate-800">{primaryDetection.label}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-slate-800/70 font-medium">Tenant Threshold:</span>
                <span className="font-bold text-slate-800">75.0%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-slate-800/70 font-medium">Stream Status:</span>
                <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-800 animate-ping" /> Live RTSP Active
                </span>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl border border-white/20 p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-slate-800 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-[#3A4046] text-sm">Human-in-the-Loop Safeguard</h4>
                <p className="text-xs text-slate-800/70 mt-1 leading-relaxed">
                  Confirming this flag trains the model on True Positives and automatically opens an investigation incident. Dismissing marks a False Positive.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
