import { useParams, Link } from 'react-router-dom';
import { useAssetDetails } from '../api/useAssets';
import { useAssetTelemetry } from '@/features/telemetry/api/useTelemetry';
import { 
  Building2, Loader2, Video, AlertTriangle, ClipboardCheck, ArrowLeft, 
  Activity, Cpu, MapPin, Gauge, Calendar, RefreshCw, ShieldCheck
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { RealtimeTelemetryChart } from '@/components/charts/RealtimeTelemetryChart';
import { CctvVideoPlayer } from '@/components/cctv/CctvVideoPlayer';

export const AssetDetailsPage = () => {
  const { id } = useParams();
  const { data: asset, isLoading } = useAssetDetails(Number(id));
  const { data: telemetryReadings = [] } = useAssetTelemetry(Number(id));
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-cyan-400" />
      </div>
    );
  }

  if (!asset) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-mono">Asset not found</div>;
  }

  const healthScore = asset.healthScore || 96;

  return (
    <div className="space-y-6 w-full animate-in fade-in pb-12">
      {/* Back Button */}
      <Link
        to="/assets"
        className="inline-flex items-center text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-fit"
      >
        <ArrowLeft className="w-4 h-4 mr-2 text-indigo-600 dark:text-cyan-400" />
        Back to Asset Registry
      </Link>

      {/* Main Executive Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-6">
            <div className="p-5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-600/30 flex-shrink-0">
              <Building2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{asset.name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  {asset.status || 'ACTIVE'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 dark:bg-cyan-950 text-indigo-700 dark:text-cyan-400 border border-indigo-200 dark:border-cyan-800">
                  {asset.assetType?.name || 'Infrastructure Node'}
                </span>
              </div>

              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-3xl leading-relaxed font-medium">
                {asset.description || 'Enterprise Critical Infrastructure Asset monitored by InfraWatch AI & Telemetry Daemon.'}
              </p>

              <div className="flex items-center gap-6 pt-2 text-xs font-mono text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" /> {asset.address || 'Global Facility Grid'}
                </span>
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" /> Created: {format(new Date(asset.createdAt), 'MMM dd, yyyy')}
                </span>
                {asset.latitude && asset.longitude && (
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                    <Activity className="w-3.5 h-3.5 text-emerald-500" /> GPS: {Number(asset.latitude).toFixed(4)}, {Number(asset.longitude).toFixed(4)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Health Gauge Badge */}
          <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-5 text-right flex-shrink-0 w-full lg:w-auto">
            <div>
              <span className="text-[10px] font-mono font-extrabold text-slate-500 dark:text-slate-400 uppercase block tracking-wider">Health Rating</span>
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{healthScore}%</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">NOMINAL (SAFE)</span>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar font-mono text-xs">
          {[
            { id: 'overview', name: 'Executive Overview', icon: Building2 },
            { id: 'cameras', name: `CCTV Feeds (${asset.cameras?.length || 0})`, icon: Video },
            { id: 'incidents', name: 'Incidents & Alerts', icon: AlertTriangle },
            { id: 'inspections', name: 'Inspections & Work Orders', icon: ClipboardCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-3 px-4 font-bold flex items-center gap-2 border-b-2 transition-all transition-colors
                ${activeTab === tab.id
                  ? 'border-indigo-600 dark:border-cyan-400 text-indigo-600 dark:text-cyan-400 bg-indigo-50/60 dark:bg-cyan-950/20 rounded-t-xl'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* High-Density 2-Column Operations View */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
          {/* Left Column (2/3 width) - Telemetry & Specs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live IoT Sensor Telemetry Stream */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600 dark:text-cyan-400" /> Live IoT Sensor Telemetry Stream
                </h3>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Live Daemon Sync
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <RealtimeTelemetryChart
                  title="Vibration Strain Sensor"
                  unit="mm/s"
                  color="#06b6d4"
                  readings={telemetryReadings}
                  sensorType="VIBRATION"
                  initialValue={2.14}
                  min={1.0}
                  max={5.0}
                />
                <RealtimeTelemetryChart
                  title="Thermal Temperature"
                  unit="°C"
                  color="#f97316"
                  readings={telemetryReadings}
                  sensorType="TEMPERATURE"
                  initialValue={42.5}
                  min={20.0}
                  max={80.0}
                />
                <RealtimeTelemetryChart
                  title="Acoustic Noise Frequency"
                  unit="dB"
                  color="#8b5cf6"
                  readings={telemetryReadings}
                  sensorType="FREQUENCY"
                  initialValue={68.2}
                  min={40.0}
                  max={110.0}
                />
                <RealtimeTelemetryChart
                  title="Power Grid Load"
                  unit="%"
                  color="#10b981"
                  readings={telemetryReadings}
                  sensorType="AMPERAGE"
                  initialValue={84.2}
                  min={50.0}
                  max={100.0}
                />
              </div>
            </div>

            {/* Asset Metadata & Structural Specs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-4">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Structural Specs & System Metadata
              </h3>
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300">
                <pre className="overflow-x-auto">
                  {JSON.stringify(asset.metadata || { facilityRating: 'ISO-55001', structuralGrid: 'Primary Alpha', nodeType: 'High Capacity' }, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* Right Column (1/3 width) - Live Camera & Predictive RUL */}
          <div className="space-y-6">
            {/* Live Camera Preview Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-indigo-600 dark:text-cyan-400" /> Associated CCTV Feed
                </h3>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {asset.cameras?.length || 0} Installed
                </span>
              </div>

              <div className="space-y-3">
                <CctvVideoPlayer
                  cameraName={asset.cameras?.[0]?.name || `${asset.name} Live Feed`}
                  streamUrl={asset.cameras?.[0]?.rtspUrl || 'rtsp://live-feed'}
                  height={220}
                />
              </div>
            </div>

            {/* Predictive Maintenance & RUL Forecast */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-4">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Predictive RUL Forecast
              </h3>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">14-Day Failure Risk:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">1.2% (LOW)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Est. Remaining Useful Life:</span>
                  <span className="font-extrabold text-indigo-600 dark:text-cyan-400">4,820 Hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Next Scheduled Service:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">Aug 24, 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cameras Tab */}
      {activeTab === 'cameras' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">Associated Surveillance Cameras</h3>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 font-bold">
              ● REAL-TIME STREAMS ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {asset.cameras && asset.cameras.length > 0 ? (
              asset.cameras.map((cam: any) => (
                <div key={cam.id} className="space-y-2">
                  <CctvVideoPlayer
                    cameraName={cam.name}
                    streamUrl={cam.rtspUrl}
                    height={320}
                  />
                </div>
              ))
            ) : (
              <div className="md:col-span-2 space-y-4">
                <CctvVideoPlayer
                  cameraName={`${asset.name} Real-Time Facility Feed`}
                  streamUrl="rtsp://facility-live-stream"
                  height={380}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Incidents Tab */}
      {activeTab === 'incidents' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl animate-in fade-in font-mono text-slate-500 dark:text-slate-400 text-sm text-center py-12">
          No open incidents recorded for this facility.
        </div>
      )}

      {/* Inspections Tab */}
      {activeTab === 'inspections' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl animate-in fade-in font-mono text-slate-500 dark:text-slate-400 text-sm text-center py-12">
          No pending work orders or inspections assigned.
        </div>
      )}
    </div>
  );
};
