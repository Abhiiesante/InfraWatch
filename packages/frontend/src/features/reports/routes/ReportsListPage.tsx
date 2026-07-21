import { useState } from 'react';
import { useReports } from '../api/useReports';
import { FileText, Search, Plus, Loader2, Download } from 'lucide-react';
import { format } from 'date-fns';

export const ReportsListPage = () => {
  const [page, setPage] = useState(1);
  const take = 10;
  const skip = (page - 1) * take;

  const { data, isLoading } = useReports({ skip, take });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-2">Generate and view automated compliance and summary reports.</p>
        </div>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Generate Report
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search reports..." 
              className="w-full pl-9 pr-4 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Generated Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              ) : data?.reports?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No reports generated yet.
                  </td>
                </tr>
              ) : (
                data?.reports?.map((report: any) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                          <FileText className="w-4 h-4" />
                        </div>
                        {report.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {report.reportType}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        report.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        report.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {format(new Date(report.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        disabled={report.status !== 'COMPLETED'}
                        className="text-slate-600 hover:text-slate-900 disabled:opacity-50 inline-flex items-center gap-1 font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
          <p>Showing {data?.reports?.length || 0} of {data?.total || 0} results</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={data?.reports?.length < take}
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
