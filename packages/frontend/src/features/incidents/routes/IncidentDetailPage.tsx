import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useIncidentDetails, useUpdateIncident, useAddComment, useAssignIncident } from '../api/useIncidentDetails';
import { useUsers } from '@/features/users/api/useUsers';
import { useAuthStore } from '@/store/auth.store';
import { AlertTriangle, ArrowLeft, Loader2, MessageSquare, UserPlus, Clock, Send, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { IncidentCopilot } from '../components/IncidentCopilot';

const severityConfig: Record<string, { bg: string; dot: string }> = {
  CRITICAL: { bg: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500' },
  HIGH: { bg: 'bg-orange-50 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  MEDIUM: { bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  LOW: { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500' },
};

const statusFlow = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

const statusConfig: Record<string, string> = {
  OPEN: 'bg-rose-50 text-rose-800 border-rose-200',
  INVESTIGATING: 'bg-amber-50 text-amber-800 border-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
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
    return <div className="p-8 text-center text-slate-600 font-bold">Incident not found</div>;
  }

  const currentStatusIdx = statusFlow.indexOf(incident.status);
  const nextStatus = currentStatusIdx < statusFlow.length - 1 ? statusFlow[currentStatusIdx + 1] : null;
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
    <div className="space-y-6 w-full animate-in fade-in pb-12">
      <Link to="/incidents" className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-slate-900 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs transition-colors w-fit">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Incidents
      </Link>

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start gap-8">
          <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl">
            <AlertTriangle className="w-14 h-14 text-rose-600" />
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${statusConfig[incident.status]}`}>
                    {incident.status}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border flex items-center gap-1.5 ${severityConfig[incident.severity]?.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${severityConfig[incident.severity]?.dot}`}></span>
                    {incident.severity}
                  </span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {incident.title}
                </h1>
                <p className="text-slate-500 text-xs font-medium mt-1">
                  Reported by <span className="font-bold text-slate-800">{incident.reporter?.name}</span> on {format(new Date(incident.createdAt), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <IncidentCopilot incidentId={incidentId} />
                
                {nextStatus && (
                  <button
                    onClick={() => handleStatusChange(nextStatus)}
                    disabled={isUpdating}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Move to {nextStatus}
                  </button>
                )}
              </div>
            </div>

            {incident.description && (
              <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs leading-relaxed font-medium">
                {incident.description}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3 text-xs">
              <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                {format(new Date(incident.createdAt), 'PPpp')}
              </div>
              {incident.asset && (
                <Link to={`/assets/${incident.asset.id}`} className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 font-bold text-indigo-600 flex items-center gap-1.5 hover:bg-slate-100 transition-colors">
                  Asset: {incident.asset.name}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Status Workflow Bar */}
        {canManage && nextStatus && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <span className="text-xs font-extrabold text-slate-700">Progress:</span>
              <div className="flex items-center gap-1.5 flex-1">
                {statusFlow.map((status, idx) => (
                  <div key={status} className="flex items-center">
                    <div className={`h-2 rounded-full transition-all duration-500 ${idx <= currentStatusIdx ? 'bg-indigo-600 w-16' : 'bg-slate-200 w-16'}`}></div>
                    {idx < statusFlow.length - 1 && <div className="w-1"></div>}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleStatusChange(nextStatus)}
                disabled={isUpdating}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Move to {nextStatus}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comments Section (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 mb-6">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            Comments & Timeline Notes ({incident.comments?.length || 0})
          </h2>

          {/* Comment Thread */}
          <div className="space-y-3 mb-6 max-h-[500px] overflow-y-auto pr-1">
            {incident.comments?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-600 font-bold text-xs">No comments yet. Start the conversation.</p>
              </div>
            ) : (
              incident.comments?.map((comment: any) => (
                <div key={comment.id} className="flex gap-3.5 group">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-xs">
                    {comment.author?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-slate-900 text-xs">{comment.author?.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{comment.content}</p>
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
                placeholder="Add an investigation note or update..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium text-xs resize-none min-h-[80px]"
                rows={3}
              />
            </div>
            <button
              type="submit"
              disabled={isCommenting || !commentText.trim()}
              className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-2xl font-bold shadow-xs transition-all disabled:opacity-50 flex-shrink-0 cursor-pointer"
            >
              {isCommenting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6">
          {/* Assignments */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                Assigned Personnel
              </h3>
              {canManage && (
                <button
                  onClick={() => setShowAssign(!showAssign)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              )}
            </div>

            {showAssign && canManage && (
              <div className="mb-4 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 max-h-[200px] overflow-y-auto space-y-1">
                {usersData?.users?.map((user: any) => (
                  <button
                    key={user.id}
                    onClick={() => handleAssign(user.id)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-white text-xs font-semibold text-slate-800 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px]">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </div>
                    {user.name}
                  </button>
                ))}
              </div>
            )}

            {incident.assignments?.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium">No personnel assigned yet.</p>
            ) : (
              <div className="space-y-2.5">
                {incident.assignments?.map((assignment: any) => (
                  <div key={assignment.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                      {assignment.user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-extrabold text-xs text-slate-900">{assignment.user?.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{assignment.user?.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-indigo-600" />
              Audit Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0"></div>
                <div>
                  <p className="text-xs font-extrabold text-slate-900">Incident Created</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{format(new Date(incident.createdAt), 'PPpp')}</p>
                </div>
              </div>
              {incident.updatedAt !== incident.createdAt && (
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">Last Updated</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{format(new Date(incident.updatedAt), 'PPpp')}</p>
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

