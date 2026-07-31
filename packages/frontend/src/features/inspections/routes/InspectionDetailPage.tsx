import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useInspectionDetails, useUpdateInspection } from '../api/useInspectionDetails';
import { useAuthStore } from '@/store/auth.store';
import { ClipboardCheck, ArrowLeft, Loader2, Camera, User, Calendar, FileText, ChevronRight, CheckCircle2, Clock, Play } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig: Record<string, { bg: string; icon: typeof Clock }> = {
  SCHEDULED: { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30', icon: Calendar },
  IN_PROGRESS: { bg: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30', icon: Play },
  COMPLETED: { bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30', icon: CheckCircle2 },
};

export const InspectionDetailPage = () => {
  const { id } = useParams();
  const inspectionId = Number(id);
  const { user: currentUser } = useAuthStore();
  const { data: inspection, isLoading } = useInspectionDetails(inspectionId);
  const { mutateAsync: updateInspection, isPending: isUpdating } = useUpdateInspection();
  const [notes, setNotes] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!inspection) {
    return <div className="p-8 text-center text-slate-500">Inspection not found</div>;
  }

  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.id === inspection.inspectorId;
  const statusInfo = statusConfig[inspection.status] || statusConfig.SCHEDULED;
  const StatusIcon = statusInfo.icon;

  const handleStatusChange = async (newStatus: string) => {
    try {
      const data: any = { status: newStatus };
      if (newStatus === 'COMPLETED') {
        data.completedAt = new Date().toISOString();
      }
      await updateInspection({ id: inspectionId, data });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleSaveNotes = async () => {
    try {
      await updateInspection({ id: inspectionId, data: { notes } });
      setNotesEditing(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full animate-in fade-in">
      <Link to="/inspections" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-primary transition-colors bg-white/50 dark:bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm backdrop-blur-sm w-fit">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Inspections
      </Link>

      {/* Header Card */}
      <div className="glass rounded-2xl border border-white/20 p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start gap-8 relative z-10">
          <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-2xl shadow-inner">
            <ClipboardCheck className="w-16 h-16 text-primary" />
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  Inspection #{inspection.id}
                </h1>
                <p className="text-slate-500 mt-2 text-base">
                  Scheduled for <span className="font-bold text-slate-700 dark:text-slate-300">{format(new Date(inspection.scheduledDate), 'PPPP')}</span>
                </p>
              </div>
              <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm ${statusInfo.bg}`}>
                <StatusIcon className="w-4 h-4 mr-2" />
                {inspection.status}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              {inspection.asset && (
                <Link to={`/assets/${inspection.asset.id}`} className="bg-white/60 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 font-bold text-primary shadow-sm flex items-center gap-2 hover:bg-primary/5 transition-colors">
                  Asset: {inspection.asset.name}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
              <div className="bg-white/60 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 font-bold text-slate-700 dark:text-slate-300 shadow-sm flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Inspector: {inspection.inspector?.name || 'Unassigned'}
              </div>
              {inspection.completedAt && (
                <div className="bg-white/60 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 font-bold text-emerald-700 dark:text-emerald-300 shadow-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Completed: {format(new Date(inspection.completedAt), 'PPp')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Actions */}
        {canManage && inspection.status !== 'COMPLETED' && (
          <div className="mt-8 pt-6 border-t border-white/10 relative z-10 flex gap-3">
            {inspection.status === 'SCHEDULED' && (
              <button
                onClick={() => handleStatusChange('IN_PROGRESS')}
                disabled={isUpdating}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all duration-300 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                <Play className="w-4 h-4" />
                Start Inspection
              </button>
            )}
            {inspection.status === 'IN_PROGRESS' && (
              <button
                onClick={() => handleStatusChange('COMPLETED')}
                disabled={isUpdating}
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all duration-300 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle2 className="w-4 h-4" />
                Mark as Completed
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Notes */}
        <div className="glass rounded-2xl border border-white/20 p-6 shadow-xl slide-in-bottom">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full"></div>
              <FileText className="w-5 h-5 text-primary" />
              Inspection Notes
            </h2>
            {canManage && !notesEditing && (
              <button
                onClick={() => { setNotes(inspection.notes || ''); setNotesEditing(true); }}
                className="text-sm font-bold text-primary hover:bg-primary/10 px-3 py-1 rounded-lg transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {notesEditing ? (
            <div className="space-y-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border border-white/30 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm transition-all backdrop-blur-sm font-medium resize-y min-h-[150px]"
                placeholder="Enter inspection notes, findings, and observations..."
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setNotesEditing(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={isUpdating}
                  className="bg-primary text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Notes
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white/40 dark:bg-slate-800/40 p-5 rounded-xl border border-white/20 min-h-[120px]">
              {inspection.notes ? (
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{inspection.notes}</p>
              ) : (
                <p className="text-slate-400 italic">No notes recorded yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Inspection Images */}
        <div className="glass rounded-2xl border border-white/20 p-6 shadow-xl slide-in-bottom" style={{ animationDelay: '100ms' }}>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
            <Camera className="w-5 h-5 text-primary" />
            Photos ({inspection.inspectionImages?.length || 0})
          </h2>

          {inspection.inspectionImages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium text-lg">No photos uploaded</p>
              <p className="text-slate-400 text-sm mt-1">Images captured during inspection will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {inspection.inspectionImages?.map((image: any) => (
                <div key={image.id} className="group relative aspect-square rounded-xl overflow-hidden border border-white/20 shadow-sm hover:shadow-lg transition-all cursor-pointer">
                  <img
                    src={image.imageUrl}
                    alt={image.caption || 'Inspection photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <p className="text-white text-xs font-bold">{image.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
