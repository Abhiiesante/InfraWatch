import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useIncidentDetails, useUpdateIncident, useAddComment, useAssignIncident } from '../api/useIncidentDetails';
import { useUsers } from '@/features/users/api/useUsers';
import { useAuthStore } from '@/store/auth.store';
import { AlertTriangle, ArrowLeft, Loader2, MessageSquare, UserPlus, Clock, Send, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const severityConfig: Record<string, { bg: string; dot: string }> = {
  CRITICAL: { bg: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30', dot: 'bg-rose-500' },
  HIGH: { bg: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 border-orange-200 dark:border-orange-500/30', dot: 'bg-orange-500' },
  MEDIUM: { bg: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30', dot: 'bg-amber-500' },
  LOW: { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30', dot: 'bg-blue-500' },
};

const statusFlow = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

const statusConfig: Record<string, string> = {
  OPEN: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
  INVESTIGATING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  RESOLVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  CLOSED: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400 border-slate-200 dark:border-slate-600/30',
};

export const IncidentDetailPage = () => {
  const { id } = useParams();
  const incidentId = Number(id);
  const { user: currentUser } = useAuthStore();
  const { data: incident, isLoading } = useIncidentDetails(incidentId);
  const { mutateAsync: updateIncident, isPending: isUpdating } = useUpdateIncident();
  const { mutateAsync: addComment, isPending: isCommenting } = useAddComment();
  const { mutateAsync: assignIncident } = useAssignIncident();
  const { data: usersData } = useUsers({ skip: 0, take: 50 });
  const [commentText, setCommentText] = useState('');
  const [showAssign, setShowAssign] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!incident) {
    return <div className="p-8 text-center text-slate-500">Incident not found</div>;
  }

  const currentStatusIdx = statusFlow.indexOf(incident.status);
  const nextStatus = currentStatusIdx < statusFlow.length - 1 ? statusFlow[currentStatusIdx + 1] : null;
  const sev = severityConfig[incident.severity] || severityConfig.MEDIUM;
  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateIncident({ id: incidentId, data: { status: newStatus } });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await addComment({ incidentId, content: commentText });
      setCommentText('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleAssign = async (userId: number) => {
    try {
      await assignIncident({ incidentId, userId });
      setShowAssign(false);
    } catch (error) {
      console.error('Failed to assign user:', error);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full animate-in fade-in">
      <Link to="/incidents" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-primary transition-colors bg-white/50 dark:bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm backdrop-blur-sm w-fit">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Incidents
      </Link>

      {/* Header Card */}
      <div className="glass rounded-2xl border border-white/20 p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start gap-8 relative z-10">
          <div className="p-6 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/20 rounded-2xl shadow-inner">
            <AlertTriangle className="w-16 h-16 text-rose-500" />
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{incident.title}</h1>
                <p className="text-slate-500 mt-2 text-base">Reported by <span className="font-bold text-slate-700 dark:text-slate-300">{incident.reporter?.name}</span></p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm ${sev.bg}`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${sev.dot}`}></span>
                  {incident.severity}
                </span>
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm ${statusConfig[incident.status] || statusConfig.OPEN}`}>
                  {incident.status}
                </span>
              </div>
            </div>

            {incident.description && (
              <div className="mt-6 bg-white/40 dark:bg-slate-800/40 p-5 rounded-xl border border-white/20 text-slate-700 dark:text-slate-300 leading-relaxed">
                {incident.description}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <div className="bg-white/60 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 font-bold text-slate-700 dark:text-slate-300 shadow-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                {format(new Date(incident.createdAt), 'PPpp')}
              </div>
              {incident.asset && (
                <Link to={`/assets/${incident.asset.id}`} className="bg-white/60 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 font-bold text-primary shadow-sm flex items-center gap-2 hover:bg-primary/5 transition-colors">
                  Asset: {incident.asset.name}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Status Workflow Bar */}
        {canManage && nextStatus && (
          <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-slate-500">Progress:</span>
              <div className="flex items-center gap-1 flex-1">
                {statusFlow.map((status, idx) => (
                  <div key={status} className="flex items-center">
                    <div className={`h-2 rounded-full transition-all duration-500 ${idx <= currentStatusIdx ? 'bg-primary w-16' : 'bg-slate-200 dark:bg-slate-700 w-16'}`}></div>
                    {idx < statusFlow.length - 1 && <div className="w-1"></div>}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleStatusChange(nextStatus)}
                disabled={isUpdating}
                className="bg-gradient-to-r from-primary to-blue-600 text-white px-5 py-2 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                Move to {nextStatus}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Comments Section (2/3) */}
        <div className="lg:col-span-2 glass rounded-2xl border border-white/20 p-6 shadow-xl slide-in-bottom">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
            <MessageSquare className="w-5 h-5 text-primary" />
            Comments ({incident.comments?.length || 0})
          </h2>

          {/* Comment Thread */}
          <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto pr-2">
            {incident.comments?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">No comments yet. Start the conversation.</p>
              </div>
            ) : (
              incident.comments?.map((comment: any) => (
                <div key={comment.id} className="flex gap-4 group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                    {comment.author?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 bg-white/50 dark:bg-slate-800/50 p-4 rounded-xl border border-white/20 shadow-sm group-hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{comment.author?.name}</span>
                      <span className="text-xs text-slate-400 font-medium">{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="flex gap-3 items-end">
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border border-white/30 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm transition-all backdrop-blur-sm font-medium resize-none min-h-[80px]"
                rows={3}
              />
            </div>
            <button
              type="submit"
              disabled={isCommenting || !commentText.trim()}
              className="bg-gradient-to-r from-primary to-blue-600 text-white p-3 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 disabled:opacity-50 flex-shrink-0"
            >
              {isCommenting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6">
          {/* Assignments */}
          <div className="glass rounded-2xl border border-white/20 p-6 shadow-xl slide-in-bottom" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Assigned To
              </h3>
              {canManage && (
                <button
                  onClick={() => setShowAssign(!showAssign)}
                  className="p-2 rounded-lg bg-white/50 dark:bg-slate-800/50 hover:bg-primary/10 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
                >
                  <UserPlus className="w-4 h-4 text-primary" />
                </button>
              )}
            </div>

            {showAssign && canManage && (
              <div className="mb-4 bg-white/50 dark:bg-slate-800/50 p-3 rounded-xl border border-white/20 shadow-sm max-h-[200px] overflow-y-auto">
                {usersData?.users?.map((user: any) => (
                  <button
                    key={user.id}
                    onClick={() => handleAssign(user.id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-3"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/60 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </div>
                    {user.name}
                  </button>
                ))}
              </div>
            )}

            {incident.assignments?.length === 0 ? (
              <p className="text-sm text-slate-500 font-medium">No one assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {incident.assignments?.map((assignment: any) => (
                  <div key={assignment.id} className="flex items-center gap-3 p-3 bg-white/40 dark:bg-slate-800/40 rounded-xl border border-white/20 shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/80 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {assignment.user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{assignment.user?.name}</p>
                      <p className="text-xs text-slate-500">{assignment.user?.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="glass rounded-2xl border border-white/20 p-6 shadow-xl slide-in-bottom" style={{ animationDelay: '200ms' }}>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0 shadow-[0_0_6px_rgba(var(--color-primary),0.5)]"></div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Incident Created</p>
                  <p className="text-xs text-slate-500 mt-0.5">{format(new Date(incident.createdAt), 'PPpp')}</p>
                </div>
              </div>
              {incident.updatedAt !== incident.createdAt && (
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Last Updated</p>
                    <p className="text-xs text-slate-500 mt-0.5">{format(new Date(incident.updatedAt), 'PPpp')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
