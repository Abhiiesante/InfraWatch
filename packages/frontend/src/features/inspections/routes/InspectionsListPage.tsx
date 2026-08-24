import { useState } from 'react';
import { useInspections } from '../api/useInspections';
import { ClipboardCheck, Search, Plus, Play } from 'lucide-react';
import { format } from 'date-fns';

export const InspectionsListPage = () => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const take = 10;
  const skip = (page - 1) * take;

  const { data, isLoading } = useInspections({ skip, take });

  const inspectionsList = (data?.inspections || []).filter((i: any) =>
    !searchQuery || i.asset?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || i.inspector?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 w-full animate-in fade-in pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-indigo-600" />
            Field Inspections & Compliance Audits
          </h1>
          <p className="text-slate-600 mt-1.5 text-base font-medium">Schedule automated drone flights, robotic crawler audits, and manual structural inspections.</p>
        </div>
        <button
          onClick={() => window.location.href = '/inspections'}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-slate-900/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Schedule Inspection
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search inspections by asset or inspector name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Asset Target</th>
                <th className="px-6 py-4">Assigned Inspector</th>
                <th className="px-6 py-4">Scheduled Date</th>
                <th className="px-6 py-4">Audit Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                      <p className="text-slate-500 font-medium">Loading inspections...</p>
                    </div>
                  </td>
                </tr>
              ) : inspectionsList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <ClipboardCheck className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-slate-700 font-bold text-sm">No inspections found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                inspectionsList.map((inspection: any) => (
                  <tr key={inspection.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 cursor-pointer" onClick={() => window.location.href = `/inspections/${inspection.id}`}>
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
                          <ClipboardCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs hover:text-indigo-600 transition-colors">{inspection.asset?.name || 'Unknown Asset'}</p>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">Inspection #{inspection.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700 text-xs">
                      {inspection.inspector?.name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600 text-xs">
                      {format(new Date(inspection.scheduledDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border ${
                        inspection.status === 'COMPLETED' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {inspection.status === 'COMPLETED' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>}
                        {inspection.status !== 'COMPLETED' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-1.5 animate-pulse"></span>}
                        {inspection.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`/inspections/${inspection.id}/execute`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-all cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Execute Run</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-600 bg-slate-50/50">
          <p>Showing <span className="font-extrabold text-slate-900">{inspectionsList.length}</span> of <span className="font-extrabold text-slate-900">{data?.total || 0}</span> results</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 transition-all cursor-pointer"
            >
              Previous
            </button>
            <button 
              disabled={(data?.inspections?.length || 0) < take}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

