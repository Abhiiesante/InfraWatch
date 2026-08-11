import { useState } from 'react';
import { useIncidents } from '../api/useIncidents';
import { AlertTriangle, Search, Plus, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { CreateIncidentModal } from '../components/CreateIncidentModal';

function getSeverityChipClass(severity: string) {
  switch (severity) {
    case 'CRITICAL': return 'status-chip status-chip--critical';
    case 'HIGH': return 'status-chip status-chip--high';
    case 'MEDIUM': return 'status-chip status-chip--medium';
    default: return 'status-chip status-chip--low';
  }
}

export const IncidentsListPage = () => {
  const [page, setPage] = useState(1);
  const take = 10;
  const skip = (page - 1) * take;

  const { data, isLoading } = useIncidents({ skip, take });

  return (
    <div className="max-w-7xl mx-auto space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: '#3A4046' }}>
            Incidents
          </h1>
          <p className="mt-2 text-lg font-medium" style={{ color: '#6B7280' }}>Track and resolve reported infrastructure issues.</p>
        </div>
        <CreateIncidentModal>
          <button className="glass-btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Report Incident
          </button>
        </CreateIncidentModal>
      </div>

      {/* Main Content Area */}
      <div className="glass-panel overflow-hidden glass-sheen">
        {/* Toolbar */}
        <div
          className="p-5 flex flex-col md:flex-row items-center gap-4 relative z-10"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.40)', background: 'rgba(255,255,255,0.20)' }}
        >
          <div className="relative flex-1 max-w-md w-full group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5" style={{ color: '#9CA3AF' }} />
            </div>
            <input 
              type="text" 
              placeholder="Search incidents..." 
              className="glass-input w-full pl-11"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.30)' }}>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Title</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Asset</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Severity</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Status</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 rounded-full animate-spin mb-4" style={{ borderColor: 'rgba(127,184,176,0.20)', borderTopColor: '#7FB8B0' }}></div>
                      <p className="font-medium" style={{ color: '#9CA3AF' }}>Loading incidents...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.incidents?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.40)' }}>
                        <AlertTriangle className="w-8 h-8" style={{ color: '#9CA3AF' }} />
                      </div>
                      <p className="font-medium text-lg" style={{ color: '#6B7280' }}>No incidents reported</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.incidents?.map((incident: any, i: number) => (
                  <tr
                    key={incident.id}
                    className="group transition-colors duration-200 cursor-pointer animate-stagger-up"
                    style={{ animationDelay: `${i * 60}ms`, borderBottom: '1px solid rgba(255,255,255,0.30)' }}
                    onClick={() => window.location.href = `/incidents/${incident.id}`}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.30)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div
                          className="p-3 rounded-xl "
                          style={{ background: 'rgba(224,133,133,0.10)', border: '1px solid rgba(224,133,133,0.20)' }}
                        >
                          <AlertTriangle className="w-5 h-5" style={{ color: '#E08585' }} />
                        </div>
                        <div>
                          <p className="font-bold text-base" style={{ color: '#3A4046' }}>{incident.title}</p>
                          <p className="text-sm font-medium mt-0.5 flex items-center gap-1" style={{ color: '#9CA3AF' }}>
                            <MessageSquare className="w-3.5 h-3.5" />
                            Reported by {incident.reporter?.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-bold" style={{ color: '#3A4046' }}>
                      {incident.asset?.name || '-'}
                    </td>
                    <td className="px-8 py-5">
                      <span className={getSeverityChipClass(incident.severity)}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                        style={{ background: 'rgba(255,255,255,0.40)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.50)' }}
                      >
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-medium" style={{ color: '#9CA3AF' }}>
                      {format(new Date(incident.createdAt), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        <div
          className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-medium relative z-10"
          style={{ borderTop: '1px solid rgba(255,255,255,0.40)', background: 'rgba(255,255,255,0.15)', color: '#6B7280' }}
        >
          <p>Showing <span className="font-bold" style={{ color: '#3A4046' }}>{data?.incidents?.length || 0}</span> of <span className="font-bold" style={{ color: '#3A4046' }}>{data?.total || 0}</span> results</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="glass-btn-secondary px-4 py-2 text-xs disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={data?.incidents?.length < take}
              onClick={() => setPage(p => p + 1)}
              className="glass-btn-secondary px-4 py-2 text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
