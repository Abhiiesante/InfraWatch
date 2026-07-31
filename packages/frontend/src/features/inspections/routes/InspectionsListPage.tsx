import { useState } from 'react';
import { useInspections } from '../api/useInspections';
import { ClipboardCheck, Search, Plus } from 'lucide-react';
import { format } from 'date-fns';

export const InspectionsListPage = () => {
  const [page, setPage] = useState(1);
  const take = 10;
  const skip = (page - 1) * take;

  const { data, isLoading } = useInspections({ skip, take });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 drop-shadow-sm">
            Inspections
          </h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">Manage routine checks and audits.</p>
        </div>
        <button className="bg-gradient-to-r from-primary to-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Schedule Inspection
        </button>
      </div>

      {/* Main Content Area */}
      <div className="glass rounded-2xl border border-white/20 overflow-hidden shadow-xl slide-in-bottom relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>
        
        {/* Toolbar */}
        <div className="p-5 border-b border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-md flex flex-col md:flex-row items-center gap-4 relative z-10">
          <div className="relative flex-1 max-w-md w-full group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Search inspections..." 
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border border-white/30 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 shadow-sm transition-all backdrop-blur-sm font-medium"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-xs backdrop-blur-md">
              <tr>
                <th className="px-8 py-5">Asset</th>
                <th className="px-8 py-5">Inspector</th>
                <th className="px-8 py-5">Scheduled Date</th>
                <th className="px-8 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-500 font-medium">Loading inspections...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.inspections?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <ClipboardCheck className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium text-lg">No inspections found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.inspections?.map((inspection: any) => (
                  <tr key={inspection.id} className="group hover:bg-white/60 dark:hover:bg-white/5 transition-colors duration-200 cursor-pointer" onClick={() => window.location.href = `/inspections/${inspection.id}`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl text-slate-700 dark:text-slate-300 shadow-inner group-hover:shadow-md transition-all">
                          <ClipboardCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-base group-hover:text-primary transition-colors">{inspection.asset?.name || 'Unknown Asset'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-medium text-slate-700 dark:text-slate-300">
                      {inspection.inspector?.name || 'Unassigned'}
                    </td>
                    <td className="px-8 py-5 font-medium text-slate-500 dark:text-slate-400">
                      {format(new Date(inspection.scheduledDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                        inspection.status === 'COMPLETED' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' 
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                      }`}>
                        {inspection.status === 'COMPLETED' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>}
                        {inspection.status !== 'COMPLETED' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 animate-pulse"></span>}
                        {inspection.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        <div className="p-5 border-t border-white/10 bg-white/20 dark:bg-black/10 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-600 dark:text-slate-400 relative z-10">
          <p>Showing <span className="font-bold text-slate-900 dark:text-white">{data?.inspections?.length || 0}</span> of <span className="font-bold text-slate-900 dark:text-white">{data?.total || 0}</span> results</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent shadow-sm transition-all"
            >
              Previous
            </button>
            <button 
              disabled={data?.inspections?.length < take}
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
