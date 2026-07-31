import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { organizationApi, assetApi, incidentApi, apiClient } from '@/lib/api';
import { Sparkles, Activity, ArrowRight, ShieldCheck, Building2, AlertTriangle, Users, CloudSun, Wind, Droplets, Gauge, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RealtimeTelemetryChart } from '@/components/charts/RealtimeTelemetryChart';

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
    <div className="space-y-6 w-full animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/20 rounded-full border border-indigo-200 dark:border-indigo-500/40 uppercase tracking-wider">
                Executive Command Center
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Database Connected
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome back, <span className="text-indigo-600 dark:text-indigo-400">{user?.name}</span> 👋
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Organization: <strong className="text-slate-900 dark:text-white">{stats?.organizationName || organization?.name || 'InfraWatch National Grid India'}</strong> • Role: <strong className="text-indigo-600 dark:text-indigo-400">{user?.role}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {healthScore !== null && (
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">System Health Score</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{healthScore}%</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registered Assets</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{stats?.totalAssets ?? assets.length}</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">Active in Database</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Incidents</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-100 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-600 dark:text-rose-400">{stats?.totalIncidents ?? incidents.length}</p>
          <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1">Logged issues</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Users</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/20 border border-purple-100 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-purple-600 dark:text-purple-400">{stats?.totalUsers ?? 1}</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-1">Tenant members</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Organization Plan</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-100 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{organization?.plan || 'Enterprise'}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">Active subscription</p>
        </div>
      </div>

      {/* Real-Time Live Open-Meteo Satellite Environment Widget */}
      {satelliteData?.satelliteData && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <CloudSun className="w-6 h-6 text-cyan-400" />
              <div>
                <h3 className="font-extrabold text-base text-white">Live Open-Meteo Satellite Environmental Feed</h3>
                <p className="text-xs text-slate-400">
                  {satelliteData.facility} (Lat: {satelliteData.coordinates.lat}, Lng: {satelliteData.coordinates.lng})
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 w-fit">
              SATELLITE SYNC OK
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
              <Gauge className="w-8 h-8 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Temperature</p>
                <p className="text-lg font-black text-white">{satelliteData.satelliteData.temperatureC}°C</p>
              </div>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
              <Wind className="w-8 h-8 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Wind Speed</p>
                <p className="text-lg font-black text-white">{satelliteData.satelliteData.windSpeedKmH} km/h</p>
              </div>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
              <Droplets className="w-8 h-8 text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Humidity</p>
                <p className="text-lg font-black text-white">{satelliteData.satelliteData.relativeHumidity}%</p>
              </div>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
              <Cpu className="w-8 h-8 text-purple-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Pressure</p>
                <p className="text-lg font-black text-white">{satelliteData.satelliteData.surfacePressureHpa} hPa</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Recharts IoT Telemetry Stream Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RealtimeTelemetryChart
          title="Grid Master Vibration Stream"
          unit="mm/s"
          color="#06b6d4"
          initialValue={2.14}
          min={1.0}
          max={5.0}
        />
        <RealtimeTelemetryChart
          title="Main Transformer Thermal Stream"
          unit="°C"
          color="#f97316"
          initialValue={42.5}
          min={20.0}
          max={80.0}
        />
      </div>

      {/* Feature Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/20 rounded-full border border-purple-200 dark:border-purple-500/40 uppercase tracking-wider">
                AI COMPUTER VISION & PROPHET ENGINE
              </span>
              <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">AI Hazard Detection & Predictive Health</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Real-time computer vision anomaly flags, surface corrosion detection, and 14-day failure risk forecasting.
            </p>
          </div>
          <div className="flex gap-3 pt-2 flex-wrap">
            <Link to="/anomalies" className="px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-sm flex items-center gap-2">
              Review CV Queue <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/predictions" className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-2">
              Predictive Engine <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-500/20 rounded-full border border-cyan-200 dark:border-cyan-500/40 uppercase tracking-wider">
                REAL-TIME IoT TELEMETRY & GIS MAP
              </span>
              <Activity className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">GIS Digital Twin & Work Orders</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Live time-series IoT sensor streams, spatial asset mapping with camera FOV cones, and SLA digital work orders.
            </p>
          </div>
          <div className="flex gap-3 pt-2 flex-wrap">
            <Link to="/telemetry" className="px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white transition-all shadow-sm flex items-center gap-2">
              IoT Telemetry Stream <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/map" className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-2">
              GIS Digital Twin Map <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Assets & Incidents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Infrastructure Nodes
            </h3>
            <Link to="/assets" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold">
              View All Assets →
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">Loading assets...</div>
          ) : assets.length > 0 ? (
            <div className="space-y-3">
              {assets.map((asset) => (
                <Link
                  key={asset.id}
                  to={`/assets/${asset.id}`}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all group"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">{asset.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{asset.assetType?.name || 'Infrastructure'}</p>
                  </div>
                  <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                    {asset.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">No assets found in database</div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span> Operational Incidents
            </h3>
            <Link to="/incidents" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold">
              View All Incidents →
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">Loading incidents...</div>
          ) : incidents.length > 0 ? (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <Link
                  key={incident.id}
                  to={`/incidents/${incident.id}`}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all group"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">{incident.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{incident.status}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-extrabold rounded-full border ${
                    incident.severity === 'HIGH' || incident.severity === 'CRITICAL'
                      ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                      : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                  }`}>
                    {incident.severity}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">No incidents recorded in database</div>
          )}
        </div>
      </div>
    </div>
  );
}
