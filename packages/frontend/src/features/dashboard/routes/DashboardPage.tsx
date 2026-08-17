import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { organizationApi, assetApi, incidentApi, apiClient } from '@/lib/api';
import { ShieldCheck, Building2, AlertTriangle, CloudSun, Wind, Droplets, Gauge, Cpu, Video, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RealtimeTelemetryChart } from '@/components/charts/RealtimeTelemetryChart';
import { useCountUp } from '@/lib/useCountUp';
import { INFRA_IMAGES } from '@/lib/infraImages';
import { motion } from 'framer-motion';

function CountUpMetric({ value, suffix = '' }: { value: number; suffix?: string }) {
  const animated = useCountUp(value, 800, true);
  return <>{animated}{suffix}</>;
}

function getSeverityChipClass(severity: string) {
  return 'status-chip status-chip--uniform';
}

export function DashboardPage() {
  const { user, organization } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [satelliteData, setSatelliteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsData, assetsData, incidentsData] = await Promise.all([
        organizationApi.getStats(),
        assetApi.list(0, 6),
        incidentApi.list(0, 6),
      ]);
      setStats(statsData);
      setAssets(assetsData?.assets || []);
      setIncidents(incidentsData?.incidents || []);

      try {
        const res = await apiClient.get('/predictions/health-score');
        if (res.data?.overallHealth !== undefined) setHealthScore(res.data.overallHealth);
      } catch {
        // Handle gracefully
      }

      try {
        if (assetsData?.assets?.[0]?.id) {
          const satRes = await apiClient.get(`/telemetry/satellite/${assetsData.assets[0].id}`);
          setSatelliteData(satRes.data);
        }
      } catch {
        // Handle gracefully
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full pb-12 pt-4">
      {/* ─── BENTO BOX GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[minmax(180px,_auto)]">
        
        {/* Header Block (Spans 2 cols, 1 row) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 glass-panel p-6 flex flex-col justify-center relative overflow-hidden"
        >
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none text-slate-800">
            <Building2 className="w-48 h-48" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider bg-slate-800/10 border border-slate-800/20 text-slate-800">
              Command Center
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-800">
              <span className="w-2 h-2 rounded-full animate-pulse-glow bg-slate-800"></span> Connected
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
            Welcome, <span>{user?.name}</span>
          </h1>
          <p className="text-sm mt-1 text-slate-800/70 font-medium">
            {stats?.organizationName || organization?.name || 'Enterprise View'}
          </p>
        </motion.div>

        {/* Health Score (Spans 1 col, 1 row) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="col-span-1 glass-panel p-6 flex flex-col items-center justify-center text-center"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm mb-3 bg-slate-800/10 border border-slate-800/20 text-slate-800">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-800/70">System Health</p>
          <p className="text-4xl font-black mt-1 text-slate-800">
            {healthScore !== null ? <CountUpMetric value={healthScore} suffix="%" /> : '--%'}
          </p>
        </motion.div>

        {/* AI Vision Video Card (Spans 1 col, 2 rows) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="col-span-1 md:col-span-1 lg:col-span-1 row-span-2 glass-panel relative overflow-hidden group cursor-pointer"
          onClick={() => window.location.href = '/anomalies'}
        >
          {/* Working CCTV Panning Video Animation */}
          <style>{`
            @keyframes pan-cctv {
              0% { background-position: 0% 50%; transform: scale(1.1); }
              50% { background-position: 100% 50%; transform: scale(1.1); }
              100% { background-position: 0% 50%; transform: scale(1.1); }
            }
          `}</style>
          <div 
            className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
            style={{ 
              backgroundImage: `url(${INFRA_IMAGES.bridge?.[0] || INFRA_IMAGES.general[0]})`, 
              backgroundSize: '150% auto', 
              animation: 'pan-cctv 20s ease-in-out infinite',
              filter: 'grayscale(100%) contrast(1.2) brightness(0.9)'
            }}
          />
          {/* Scanner Line Overlay */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-40 mix-blend-overlay pointer-events-none" />
          
          <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none z-10">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-white/80 border border-white text-slate-800 backdrop-blur-md">
                <Video className="w-5 h-5" />
              </div>
              <span className="px-2 py-1 text-[9px] font-bold uppercase rounded bg-slate-800 text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                LIVE CCTV
              </span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1 text-white drop-shadow-md">Live Feed</p>
              <h3 className="text-xl font-extrabold leading-tight text-white drop-shadow-md">Computer Vision<br/>Anomaly Detection</h3>
            </div>
          </div>
        </motion.div>

        {/* KPI: Assets (Spans 1 col, 1 row) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
          className="col-span-1 glass-card p-6 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <Building2 className="w-5 h-5 text-slate-800" />
            <span className="text-[10px] font-bold uppercase text-slate-800/70">Assets</span>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-800"><CountUpMetric value={stats?.totalAssets ?? assets.length} /></p>
            <p className="text-xs font-semibold mt-1 text-slate-800/70">Active in system</p>
          </div>
        </motion.div>

        {/* KPI: Incidents (Spans 1 col, 1 row) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
          className="col-span-1 glass-card p-6 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-5 h-5 text-slate-800" />
            <span className="text-[10px] font-bold uppercase text-slate-800/70">Incidents</span>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-800"><CountUpMetric value={stats?.totalIncidents ?? incidents.length} /></p>
            <p className="text-xs font-semibold mt-1 text-slate-800/70">Logged issues</p>
          </div>
        </motion.div>

        {/* KPI: Uptime (Spans 1 col, 1 row) - Fills the gap in the grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.55 }}
          className="col-span-1 glass-card p-6 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <Activity className="w-5 h-5 text-slate-800" />
            <span className="text-[10px] font-bold uppercase text-slate-800/70">Uptime</span>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-800"><CountUpMetric value={99} /><span className="text-2xl">.9%</span></p>
            <p className="text-xs font-semibold mt-1 text-slate-800/70">System Availability</p>
          </div>
        </motion.div>

        {/* Chart: Vibration Stream (Spans 2 cols, 1 row) */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1"
        >
          <RealtimeTelemetryChart title="Grid Master Vibration Stream" unit="mm/s" color="#1E293B" initialValue={2.14} min={1.0} max={5.0} />
        </motion.div>

        {/* Chart: Thermal Stream (Spans 2 cols, 1 row) */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1"
        >
          <RealtimeTelemetryChart title="Main Transformer Thermal Stream" unit="°C" color="#1E293B" initialValue={42.5} min={20.0} max={80.0} />
        </motion.div>

        {/* Satellite Data (Spans 2 cols, 1 row) */}
        {satelliteData?.satelliteData && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
            className="col-span-1 md:col-span-3 lg:col-span-2 row-span-1 glass-panel p-6 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4 relative z-10 border-b border-black/5 pb-3">
              <div className="flex items-center gap-2 text-slate-800">
                <CloudSun className="w-5 h-5" />
                <h3 className="font-extrabold text-sm">Live Environmental Satellite</h3>
              </div>
              <span className="text-[9px] font-bold uppercase text-slate-800/70">{satelliteData.facility}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 relative z-10 flex-1">
              {[
                { icon: Gauge, v: `${satelliteData.satelliteData.temperatureC}°` },
                { icon: Wind, v: `${satelliteData.satelliteData.windSpeedKmH}` },
                { icon: Droplets, v: `${satelliteData.satelliteData.relativeHumidity}%` },
                { icon: Cpu, v: `${satelliteData.satelliteData.surfacePressureHpa}` },
              ].map((m, i) => (
                <div key={i} className="flex flex-col items-center justify-center bg-black/5 rounded-xl p-2 border border-black/5 text-slate-800">
                  <m.icon className="w-4 h-4 mb-1" />
                  <span className="font-bold text-sm">{m.v}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Incidents List (Spans 2 cols, 2 rows) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
          className="col-span-1 md:col-span-3 lg:col-span-2 row-span-2 glass-panel p-6 flex flex-col"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/5">
            <h3 className="font-bold text-sm flex items-center gap-2 text-slate-800">
              <span className="w-2 h-2 rounded-full animate-pulse-glow bg-slate-800" /> 
              Recent Incidents
            </h3>
            <Link to="/incidents" className="text-xs font-bold hover:underline text-slate-800">View All</Link>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton-shimmer h-14 rounded-xl" />)}</div>
            ) : incidents.length > 0 ? (
              incidents.map((incident) => (
                <Link
                  key={incident.id} to={`/incidents/${incident.id}`}
                  className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-black/5 border border-transparent hover:border-black/5 bg-transparent"
                >
                  <div className="truncate pr-4">
                    <p className="font-bold text-sm truncate text-slate-800">{incident.title}</p>
                    <p className="text-[10px] text-slate-800/70 font-medium">{incident.status}</p>
                  </div>
                  <span className={getSeverityChipClass(incident.severity)} style={{ transform: 'scale(0.85)' }}>{incident.severity}</span>
                </Link>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-medium text-slate-800/50">No incidents</div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
