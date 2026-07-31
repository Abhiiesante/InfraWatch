import { useState } from 'react';
import { useReports } from '../api/useReports';
import { useGenerateAIReport } from '@/features/ai/api/useAI';
import { FileText, Search, Loader2, Download, Sparkles, X } from 'lucide-react';
import { format } from 'date-fns';

export const ReportsListPage = () => {
  const [page, setPage] = useState(1);
  const [aiReportResult, setAiReportResult] = useState<any>(null);
  const take = 10;
  const skip = (page - 1) * take;

  const { data, isLoading } = useReports({ skip, take });
  const { mutateAsync: generateAiReport, isPending: isGenerating } = useGenerateAIReport();

  const handleGenerateAiReport = async () => {
    try {
      const res = await generateAiReport({ reportType: 'EXECUTIVE_SUMMARY', dateRange: 'Last 30 Days' });
      setAiReportResult(res);
    } catch (error) {
      console.error('Failed to generate AI report:', error);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 drop-shadow-sm">
            Reports & Analytics
          </h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">Generate and view automated compliance, audit, and AI narrative reports.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateAiReport}
            disabled={isGenerating}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Generate AI Narrative Report
          </button>
        </div>
      </div>

      {/* AI Generated Narrative Display Modal */}
      {aiReportResult && (
        <div className="glass rounded-2xl border border-purple-500/30 p-8 shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in">
          <button
            onClick={() => setAiReportResult(null)}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{aiReportResult.title}</h2>
              <p className="text-xs text-slate-500 font-medium">Generated at {format(new Date(aiReportResult.generatedAt), 'PPpp')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200">
              <p className="text-xs font-extrabold text-purple-600 dark:text-purple-300">Total Assets</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{aiReportResult.metrics?.totalAssets}</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200">
              <p className="text-xs font-extrabold text-purple-600 dark:text-purple-300">Total Incidents</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{aiReportResult.metrics?.totalIncidents}</p>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200">
              <p className="text-xs font-extrabold text-rose-600 dark:text-rose-300">High Risk Incidents</p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{aiReportResult.metrics?.criticalIncidents}</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200">
              <p className="text-xs font-extrabold text-purple-600 dark:text-purple-300">Scheduled Audits</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{aiReportResult.metrics?.pendingInspections}</p>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-white/20 font-serif text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap text-sm shadow-inner">
            {aiReportResult.executiveSummary}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="glass rounded-2xl border border-white/20 overflow-hidden shadow-xl slide-in-bottom relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>
        
        {/* Toolbar */}
        <div className="p-5 border-b border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-md flex flex-col md:flex-row items-center gap-4 relative z-10">
          <div className="relative flex-1 max-w-md w-full group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Search reports..." 
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border border-white/30 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 shadow-sm transition-all backdrop-blur-sm font-medium"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-xs backdrop-blur-md">
              <tr>
                <th className="px-8 py-5">Report Name</th>
                <th className="px-8 py-5">Type</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Generated Date</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-500 font-medium">Loading reports...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.reports?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium text-lg">No reports generated yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.reports?.map((report: any) => (
                  <tr key={report.id} className="group hover:bg-white/60 dark:hover:bg-white/5 transition-colors duration-200">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl text-slate-700 dark:text-slate-300 shadow-inner group-hover:shadow-md transition-all">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-base group-hover:text-primary transition-colors">{report.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-200/50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-300 border border-slate-300/30 dark:border-slate-600/30 shadow-sm">
                        {report.reportType}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                        report.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' : 
                        report.status === 'FAILED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                      }`}>
                        {report.status === 'COMPLETED' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>}
                        {report.status === 'FAILED' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2"></span>}
                        {report.status !== 'COMPLETED' && report.status !== 'FAILED' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 animate-pulse"></span>}
                        {report.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-medium text-slate-500 dark:text-slate-400">
                      {format(new Date(report.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        disabled={report.status !== 'COMPLETED'}
                        className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-bold border shadow-sm transition-all
                          ${report.status === 'COMPLETED' 
                            ? 'text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 border-slate-200 dark:border-slate-600 hover:shadow' 
                            : 'text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-700/50 cursor-not-allowed opacity-50'
                          }
                        `}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        <div className="p-5 border-t border-white/10 bg-white/20 dark:bg-black/10 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-600 dark:text-slate-400 relative z-10">
          <p>Showing <span className="font-bold text-slate-900 dark:text-white">{data?.reports?.length || 0}</span> of <span className="font-bold text-slate-900 dark:text-white">{data?.total || 0}</span> results</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent shadow-sm transition-all"
            >
              Previous
            </button>
            <button 
              disabled={data?.reports?.length < take}
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
