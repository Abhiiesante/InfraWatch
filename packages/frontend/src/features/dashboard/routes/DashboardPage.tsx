import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { organizationApi, assetApi, incidentApi } from '@/lib/api';

export function DashboardPage() {
  const { user, organization } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsData, assetsData, incidentsData] = await Promise.all([
        organizationApi.getStats(),
        assetApi.list(0, 5),
        incidentApi.list(0, 5),
      ]);
      setStats(statsData);
      setAssets(assetsData.assets || []);
      setIncidents(incidentsData.incidents || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full animate-in fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 drop-shadow-sm">
            Dashboard
          </h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">Welcome back, {user?.name}!</p>
        </div>
      </div>

      {/* Organization Info */}
      <div className="glass rounded-2xl p-8 relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 transition-transform group-hover:scale-150 duration-700"></div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 relative z-10 flex items-center gap-2">
          <span className="w-2 h-6 bg-primary rounded-full inline-block"></span>
          Organization Details
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 relative z-10">
          <div className="p-4 rounded-xl bg-white/40 dark:bg-black/20 border border-white/20 backdrop-blur-md">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Name</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{organization?.name || 'Loading...'}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/40 dark:bg-black/20 border border-white/20 backdrop-blur-md">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Plan</p>
            <div className="mt-1 flex items-center">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-primary text-white shadow-md">
                {organization?.plan || 'Free'}
              </span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/40 dark:bg-black/20 border border-white/20 backdrop-blur-md">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Your Role</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{user?.role || 'User'}</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { label: 'Total Users', value: stats.userCount || 0, color: 'from-blue-400 to-blue-600' },
            { label: 'Total Assets', value: stats.assetCount || 0, color: 'from-emerald-400 to-emerald-600' },
            { label: 'Total Incidents', value: stats.incidentCount || 0, color: 'from-rose-400 to-rose-600' },
          ].map((stat, idx) => (
            <div key={idx} className="glass rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 slide-in-bottom" style={{ animationDelay: `${idx * 100}ms` }}>
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br ${stat.color} rounded-full opacity-20 blur-xl group-hover:scale-150 transition-transform duration-500`}></div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">{stat.label}</p>
              <p className="text-4xl font-extrabold text-slate-900 dark:text-white mt-2 drop-shadow-sm">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Assets & Incidents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Recent Assets */}
        <div className="glass rounded-2xl p-6 flex flex-col slide-in-bottom" style={{ animationDelay: '300ms' }}>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Recent Assets
          </h2>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : assets.length > 0 ? (
            <div className="space-y-3">
              {assets.map((asset) => (
                <div key={asset.id} className="group flex items-center justify-between p-4 bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/40 rounded-xl border border-white/20 backdrop-blur-sm transition-all cursor-pointer">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{asset.name}</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{asset.assetType?.name}</p>
                  </div>
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 shadow-sm">
                    {asset.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <p className="text-sm font-medium">No assets found</p>
            </div>
          )}
        </div>

        {/* Recent Incidents */}
        <div className="glass rounded-2xl p-6 flex flex-col slide-in-bottom" style={{ animationDelay: '400ms' }}>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            Recent Incidents
          </h2>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : incidents.length > 0 ? (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div key={incident.id} className="group flex items-center justify-between p-4 bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/40 rounded-xl border border-white/20 backdrop-blur-sm transition-all cursor-pointer">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{incident.title}</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{incident.status}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border shadow-sm ${
                    incident.severity === 'HIGH' || incident.severity === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                      : incident.severity === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                  }`}>
                    {incident.severity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <p className="text-sm font-medium">No incidents reported</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
