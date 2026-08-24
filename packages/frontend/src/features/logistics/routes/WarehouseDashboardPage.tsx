import { useState, useEffect } from 'react';
import { Box, Activity, ShieldAlert, Cpu, AlertTriangle, BarChart3, TrendingDown, Sliders } from 'lucide-react';
import { io } from 'socket.io-client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '@/lib/api';
import { KeepOutZoneEditor, KeepOutZoneConfig } from '../components/KeepOutZoneEditor';
import { useCameras, useUpdateCamera } from '@/features/cameras/api/useCameras';

const socket = io(window.location.origin, { path: '/socket.io', transports: ['websocket'] });

export function WarehouseDashboardPage() {
  const { data: camerasData } = useCameras({ skip: 0, take: 10 });
  const { mutateAsync: updateCamera, isPending: isSavingZone } = useUpdateCamera();
  const activeCamera = camerasData?.cameras?.[0];

  const [stats, setStats] = useState({
    activeAMRs: 0,
    zoneViolations: 0,
    rackUtilization: 84,
    safetyScore: 99
  });
  const [boxes, setBoxes] = useState<any[]>([]);
  const [frameSource, setFrameSource] = useState<'live' | 'real_no_frame' | 'simulated'>('simulated');
  const [goldMetrics, setGoldMetrics] = useState<any[]>([]);
  const [goldTotals, setGoldTotals] = useState<any>(null);
  const [isZoneEditorOpen, setIsZoneEditorOpen] = useState(false);
  const [keepOutZone, setKeepOutZone] = useState<KeepOutZoneConfig>({
    xMin: 0,
    xMax: 100,
    yMin: 50,
    yMax: 100,
    zoneName: 'AMR Automated Runway Alpha',
    severity: 'CRITICAL',
  });

  // Sync initial keepOutZone from persisted database camera config
  useEffect(() => {
    if (activeCamera?.config && (activeCamera.config as any).keepOutZone) {
      setKeepOutZone((activeCamera.config as any).keepOutZone);
    }
  }, [activeCamera]);

  const handleSaveZone = async (newZone: KeepOutZoneConfig) => {
    setKeepOutZone(newZone);
    if (activeCamera) {
      const existingConfig = (activeCamera.config as Record<string, any>) || {};
      await updateCamera({
        id: activeCamera.id,
        data: {
          config: {
            ...existingConfig,
            keepOutZone: newZone,
          },
        },
      });
    }
  };

  useEffect(() => {
    socket.on('cv-detections', (data) => {
      if (data && data.stats) {
        setStats(prev => ({
          ...prev,
          activeAMRs: data.stats.activeAMRs,
          // Calculate a simple rolling safety score
          safetyScore: Math.max(0, 100 - (data.stats.zoneViolations * 5)),
          zoneViolations: prev.zoneViolations + (data.stats.zoneViolations > 0 ? 1 : 0) // Just increment historically for demo
        }));
      }
      if (data && data.boxes) {
        setBoxes(data.boxes);
      }
      if (data && data.frameSource) {
        setFrameSource(data.frameSource);
      }
      if (data && data.keepOutZone) {
        setKeepOutZone(data.keepOutZone);
      }
    });

    return () => {
      socket.off('cv-detections');
    };
  }, []);

  // Fetch Gold-layer historical metrics
  useEffect(() => {
    const fetchGoldMetrics = async () => {
      try {
        const res = await apiClient.get('/v4/dashboard/safety-metrics?hours=24');
        if (res.data?.data) {
          setGoldMetrics(res.data.data.timeSeries || []);
          setGoldTotals(res.data.data.totals || null);
        }
      } catch (err) {
        // Silently fail — Gold metrics are supplementary
      }
    };
    fetchGoldMetrics();
    const interval = setInterval(fetchGoldMetrics, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 w-full animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Box className="w-8 h-8 text-indigo-600" />
            Warehouse Digital Twin
          </h1>
          <p className="text-slate-600 mt-1.5 text-base font-medium">
            Logistics, Safety, & Autonomous Mobile Robot (AMR) Fleet Tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {frameSource === 'live' && (
            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-800 font-bold text-xs">Real Inference (Live Feed)</span>
            </div>
          )}
          {frameSource === 'real_no_frame' && (
            <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-amber-800 font-bold text-xs">Real Inference (Awaiting Stream)</span>
            </div>
          )}
          {frameSource === 'simulated' && (
            <div className="px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span className="text-indigo-800 font-bold text-xs">Simulated Demo Mode</span>
            </div>
          )}
          <button
            onClick={() => setIsZoneEditorOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-md shadow-slate-900/20 flex items-center gap-2 text-xs cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            Configure Zones
          </button>
        </div>
      </div>

      {/* Keep-Out Zone Editor Modal */}
      <KeepOutZoneEditor
        isOpen={isZoneEditorOpen}
        onClose={() => setIsZoneEditorOpen(false)}
        initialZone={keepOutZone}
        onSaveZone={handleSaveZone}
        isSaving={isSavingZone}
        cameraName={activeCamera?.name || 'Warehouse North Bay PTZ'}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Active Fleet</p>
            <p className="text-3xl font-black text-slate-900">{stats.activeAMRs}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <Cpu className="w-7 h-7" />
          </div>
        </div>

        <div className={`bg-white rounded-3xl border p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between ${stats.zoneViolations > 0 ? 'bg-rose-50/70 border-rose-300' : 'border-slate-200'}`}>
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Zone Violations</p>
            <p className="text-3xl font-black text-rose-600">{stats.zoneViolations}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Rack Utilization</p>
            <p className="text-3xl font-black text-slate-900">{stats.rackUtilization}%</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Box className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Live Safety Score</p>
            <p className={`text-3xl font-black ${stats.safetyScore < 90 ? 'text-amber-600' : 'text-emerald-700'}`}>{stats.safetyScore}%</p>
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stats.safetyScore < 90 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <Activity className={`w-7 h-7 ${stats.safetyScore < 90 ? 'text-amber-600' : 'text-emerald-600'}`} />
          </div>
        </div>
      </div>
      
      {/* 2D Floorplan Live Map */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm min-h-[600px] flex flex-col relative overflow-hidden">
         <div className="flex items-center justify-between mb-4 relative z-10">
           <h2 className="text-xl font-extrabold text-slate-900">Live Spatial Map & Tracking</h2>
           <div className="flex gap-4 text-xs font-bold">
             <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-500 rounded" /> Personnel</span>
             <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-cyan-500 rounded" /> Fleet (AMR/Forklift)</span>
             <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-rose-500 rounded" /> Violation</span>
           </div>
         </div>
         
         {/* The Map Area */}
         <div className="flex-1 relative bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-800 min-h-[450px]">
           {/* Background Image of Warehouse */}
           <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200" className="absolute inset-0 w-full h-full object-cover opacity-30" alt="Warehouse Map" />
           
           {/* Dynamic Configurable Keep-Out Zone Overlay */}
           <div 
             className="absolute border-t-2 border-dashed border-rose-500/80 bg-rose-500/15 pointer-events-none flex items-start justify-center pt-2 transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
             style={{
               left: `${keepOutZone.xMin}%`,
               top: `${keepOutZone.yMin}%`,
               width: `${keepOutZone.xMax - keepOutZone.xMin}%`,
               height: `${keepOutZone.yMax - keepOutZone.yMin}%`,
             }}
           >
             <span className="bg-rose-600/90 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg uppercase tracking-wide">
               <AlertTriangle className="w-3.5 h-3.5" />
               RESTRICTED: {keepOutZone.zoneName}
             </span>
           </div>

           {/* Draw Detections */}
           {boxes.map(box => (
             <div
               key={box.id}
               className="absolute transition-all duration-300 flex items-center justify-center shadow-lg"
               style={{
                 left: `${box.x}%`,
                 top: `${box.y}%`,
                 width: '24px', // fixed size marker on the map
                 height: '24px',
                 marginLeft: '-12px',
                 marginTop: '-12px',
                 backgroundColor: box.color,
                 borderRadius: box.label === 'PERSON' ? '50%' : '4px', // circle for people, square for machines
                 zIndex: box.isViolation ? 40 : 20
               }}
             >
               {box.isViolation && (
                 <div className="absolute -inset-2 bg-rose-500 rounded-full animate-ping opacity-75" />
               )}
               <span className="absolute -top-6 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                 {box.label}
               </span>
             </div>
           ))}
         </div>
      </div>

      {/* Historical Safety Trends (Gold Layer) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detections Over Time */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Detection Trends (24h)</h3>
              <p className="text-xs text-slate-500 font-medium">Hourly aggregated from Gold metrics layer</p>
            </div>
          </div>
          {goldMetrics.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={goldMetrics}>
                <defs>
                  <linearGradient id="gradDetections" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradViolations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="timestamp" tickFormatter={(t: string) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', color: '#0f172a' }}
                  labelFormatter={(label) => String(label ? new Date(label as any).toLocaleString() : '')}
                />
                <Area type="monotone" dataKey="totalDetections" stroke="#6366f1" fill="url(#gradDetections)" strokeWidth={2} name="Total Detections" />
                <Area type="monotone" dataKey="zoneViolations" stroke="#ef4444" fill="url(#gradViolations)" strokeWidth={2} name="Zone Violations" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No historical data yet</p>
                <p className="text-xs mt-1">Gold metrics sync every 60 seconds</p>
              </div>
            </div>
          )}
        </div>

        {/* Gold Totals Summary */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Safety Summary (24h)</h3>
              <p className="text-xs text-slate-500 font-medium">Aggregated from the Gold metrics pipeline</p>
            </div>
          </div>
          {goldTotals ? (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Total Detections</p>
                <p className="text-4xl font-extrabold text-indigo-600">{goldTotals.totalDetections}</p>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Zone Violations</p>
                <p className="text-4xl font-extrabold text-rose-600">{goldTotals.zoneViolations}</p>
              </div>
              <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-6 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Peak Active AMRs</p>
                <p className="text-4xl font-extrabold text-cyan-600">{goldTotals.maxActiveAMRs}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Data Points</p>
                <p className="text-4xl font-extrabold text-emerald-600">{goldTotals.dataPoints}</p>
              </div>
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">
              <div className="text-center">
                <TrendingDown className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Awaiting Gold layer sync</p>
                <p className="text-xs mt-1">Metrics appear after the first sync cycle</p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

