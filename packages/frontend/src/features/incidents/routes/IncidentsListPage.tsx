import { useState } from 'react';
import { useIncidents } from '../api/useIncidents';
import { AlertTriangle, Search, Plus, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { CreateIncidentModal } from '../components/CreateIncidentModal';

export const IncidentsListPage = () => {
  const [page, setPage] = useState(1);
  const take = 10;
  const skip = (page - 1) * take;

  const { data, isLoading } = useIncidents({ skip, take });

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'CRITICAL': return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30';
      case 'HIGH': return 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 border-orange-200 dark:border-orange-500/30';
      case 'MEDIUM': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 drop-shadow-sm">
            Incidents
          </h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">Track and resolve reported infrastructure issues.</p>
        </div>
        <CreateIncidentModal>
          <button className="bg-gradient-to-r from-primary to-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Report Incident
          </button>
        </CreateIncidentModal>
      </div>

      {/* Main Content Area */}
      <div className="glass rounded-2xl border border-white/20 overflow-hidden shadow-xl slide-in-bottom relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>
        
        {/* Toolbar */}
        <div className="p-5 border-b border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-md flex flex-col md:flex-row items-center gap-4 relative z-10">
          <div className="relative flex-1 max-w-md w-full group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Search incidents..." 
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border border-white/30 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 shadow-sm transition-all backdrop-blur-sm font-medium"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-xs backdrop-blur-md">
              <tr>
                <th className="px-8 py-5">Title</th>
                <th className="px-8 py-5">Asset</th>
                <th className="px-8 py-5">Severity</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-500 font-medium">Loading incidents...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.incidents?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium text-lg">No incidents reported</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.incidents?.map((incident: any) => (
                  <tr key={incident.id} className="group hover:bg-white/60 dark:hover:bg-white/5 transition-colors duration-200 cursor-pointer" onClick={() => window.location.href = `/incidents/${incident.id}`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl text-slate-700 dark:text-slate-300 shadow-inner group-hover:shadow-md transition-all">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-base group-hover:text-primary transition-colors">{incident.title}</p>
                          <p className="text-sm font-medium text-slate-500 mt-0.5 flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Reported by {incident.reporter?.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-bold text-slate-700 dark:text-slate-300">
                      {incident.asset?.name || '-'}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-200/50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-300 border border-slate-300/30 dark:border-slate-600/30 shadow-sm">
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-medium text-slate-500 dark:text-slate-400">
                      {format(new Date(incident.createdAt), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        <div className="p-5 border-t border-white/10 bg-white/20 dark:bg-black/10 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-600 dark:text-slate-400 relative z-10">
          <p>Showing <span className="font-bold text-slate-900 dark:text-white">{data?.incidents?.length || 0}</span> of <span className="font-bold text-slate-900 dark:text-white">{data?.total || 0}</span> results</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent shadow-sm transition-all"
            >
              Previous
            </button>
            <button 
              disabled={data?.incidents?.length < take}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent shadow-sm transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
