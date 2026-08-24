import { useState } from 'react';
import { useReports, useCreateReport } from '../api/useReports';
import { useGenerateAIReport } from '@/features/ai/api/useAI';
import { FileText, Search, Loader2, Download, Sparkles, X, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';

export const ReportsListPage = () => {
  const [page, setPage] = useState(1);
  const [aiReportResult, setAiReportResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const take = 10;
  const skip = (page - 1) * take;

  const { data, isLoading } = useReports({ skip, take });
  const { mutateAsync: generateAiReport, isPending: isGenerating } = useGenerateAIReport();
  const { mutateAsync: createReport, isPending: isCreatingReport } = useCreateReport();

  const handleGenerateAiReport = async () => {
    try {
      const res = await generateAiReport({ reportType: 'EXECUTIVE_SUMMARY', dateRange: 'Last 30 Days' });
      setAiReportResult(res);
    } catch (error) {
      console.error('Failed to generate AI report:', error);
    }
  };

  const handleTriggerAsyncReport = async (title: string, type: string, reportFormat: 'PDF' | 'CSV') => {
    try {
      await createReport({
        title,
        type,
        format: reportFormat,
      });
    } catch (error) {
      console.error('Failed to queue async report:', error);
    }
  };

  const filteredReports = (data?.reports || []).filter((r: any) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.reportType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 w-full animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-600" />
            Reports & Intelligence
          </h1>
          <p className="text-slate-600 mt-1.5 text-base font-medium">Asynchronous analytics generation from Gold Lakehouse metrics.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleTriggerAsyncReport('Executive Asset Health & MTTR Audit', 'ASSET_HEALTH', 'CSV')}
            disabled={isCreatingReport}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isCreatingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Export Gold CSV
          </button>
          <button
            onClick={handleGenerateAiReport}
            disabled={isGenerating}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-800 transition-all shadow-md shadow-slate-900/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
            Generate AI Narrative
          </button>
        </div>
      </div>

      {/* AI Generated Narrative Display Modal */}
      {aiReportResult && (
        <div className="bg-white rounded-3xl border border-indigo-200 p-8 shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in">
          <button
            onClick={() => setAiReportResult(null)}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{aiReportResult.title}</h2>
              <p className="text-xs text-slate-500 font-medium">Generated at {format(new Date(aiReportResult.generatedAt), 'PPpp')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
              <p className="text-xs font-bold text-slate-600">Total Assets</p>
              <p className="text-2xl font-black text-indigo-700 mt-1">{aiReportResult.metrics?.totalAssets}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-slate-600">Total Incidents</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{aiReportResult.metrics?.totalIncidents}</p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <p className="text-xs font-bold text-rose-700">High Risk Incidents</p>
              <p className="text-2xl font-black text-rose-700 mt-1">{aiReportResult.metrics?.criticalIncidents}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-bold text-emerald-700">Scheduled Audits</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{aiReportResult.metrics?.pendingInspections}</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap text-sm">
            {aiReportResult.executiveSummary}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by title or type..." 
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-semibold text-xs transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-xs border-b border-slate-100">
              <tr>
                <th className="px-8 py-4">Report Name</th>
                <th className="px-8 py-4">Type</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Generated Date</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-500 font-medium">Loading reports...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium text-base">No reports generated yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report: any) => (
                  <tr key={report.id} className="group hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-slate-100 rounded-xl text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{report.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {report.reportType}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold border ${
                        report.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
                        report.status === 'FAILED' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {report.status === 'COMPLETED' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>}
                        {report.status === 'FAILED' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>}
                        {report.status !== 'COMPLETED' && report.status !== 'FAILED' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse"></span>}
                        {report.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-medium text-slate-500 text-xs">
                      {format(new Date(report.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <a
                        href={report.status === 'COMPLETED' ? `/api/reports/${report.id}/download` : undefined}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                          report.status === 'COMPLETED'
                            ? 'text-slate-900 bg-white hover:bg-slate-50 border-slate-300 shadow-xs hover:shadow-sm'
                            : 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60 pointer-events-none'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        {report.status === 'GENERATING' ? 'Generating...' : 'Download'}
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
          <p>Showing <span className="font-bold text-slate-900">{filteredReports.length}</span> of <span className="font-bold text-slate-900">{data?.total || 0}</span> results</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Previous
            </button>
            <button 
              disabled={data?.reports?.length < take}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

