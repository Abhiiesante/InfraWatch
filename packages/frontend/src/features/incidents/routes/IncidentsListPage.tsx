import { useState } from 'react';
import { useIncidents } from '../api/useIncidents';
import { AlertTriangle, Search, Plus, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export const IncidentsListPage = () => {
  const [page, setPage] = useState(1);
  const take = 10;
  const skip = (page - 1) * take;

  const { data, isLoading } = useIncidents({ skip, take });

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'CRITICAL': return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Incidents</h1>
          <p className="text-slate-500 mt-2">Track and resolve reported infrastructure issues.</p>
        </div>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Report Incident
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search incidents..." 
              className="w-full pl-9 pr-4 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Asset</th>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              ) : data?.incidents?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No incidents reported.
                  </td>
                </tr>
              ) : (
                data?.incidents?.map((incident: any) => (
                  <tr key={incident.id} className="hover:bg-slate-50 transition cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{incident.title}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Reported by {incident.reporter?.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {incident.asset?.name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {format(new Date(incident.createdAt), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
          <p>Showing {data?.incidents?.length || 0} of {data?.total || 0} results</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={data?.incidents?.length < take}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
