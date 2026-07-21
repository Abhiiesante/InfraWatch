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
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome, {user?.name}!</p>
        </div>
      </div>

      {/* Organization Info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Organization</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-slate-500 text-sm font-medium">Name</p>
            <p className="text-lg font-medium text-slate-900 mt-1">{organization?.name}</p>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Plan</p>
            <p className="text-lg font-medium text-slate-900 mt-1">{organization?.plan}</p>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Your Role</p>
            <p className="text-lg font-medium text-slate-900 mt-1">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="bg-white overflow-hidden shadow-sm border border-slate-200 rounded-xl p-6">
            <p className="text-slate-500 text-sm font-medium">Total Users</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.userCount || 0}</p>
          </div>
          <div className="bg-white overflow-hidden shadow-sm border border-slate-200 rounded-xl p-6">
            <p className="text-slate-500 text-sm font-medium">Total Assets</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.assetCount || 0}</p>
          </div>
          <div className="bg-white overflow-hidden shadow-sm border border-slate-200 rounded-xl p-6">
            <p className="text-slate-500 text-sm font-medium">Total Incidents</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.incidentCount || 0}</p>
          </div>
        </div>
      )}

      {/* Recent Assets & Incidents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Assets */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">Recent Assets</h2>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : assets.length > 0 ? (
            <div className="space-y-4">
              {assets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">{asset.name}</p>
                    <p className="text-xs text-slate-500">{asset.assetType?.name}</p>
                  </div>
                  <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {asset.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No assets yet</p>
          )}
        </div>

        {/* Recent Incidents */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">Recent Incidents</h2>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : incidents.length > 0 ? (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div key={incident.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">{incident.title}</p>
                    <p className="text-xs text-slate-500">{incident.status}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
                    incident.severity === 'HIGH' || incident.severity === 'CRITICAL'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : incident.severity === 'MEDIUM'
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {incident.severity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No incidents</p>
          )}
        </div>
      </div>
    </div>
  );
}
