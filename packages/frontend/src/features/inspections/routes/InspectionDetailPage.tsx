import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useInspectionDetails, useUpdateInspection, useUploadInspectionImage } from '../api/useInspectionDetails';
import { useAuthStore } from '@/store/auth.store';
import { ClipboardCheck, ArrowLeft, Loader2, Camera, User, Calendar, FileText, ChevronRight, CheckCircle2, Clock, Play, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useRef } from 'react';
import { InspectionCopilot } from '../components/InspectionCopilot';

const statusConfig: Record<string, { bg: string; icon: typeof Clock }> = {
  SCHEDULED: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Calendar },
  IN_PROGRESS: { bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: Play },
  COMPLETED: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
};

export const InspectionDetailPage = () => {
  const { id } = useParams();
  const inspectionId = Number(id);
  const { user: currentUser } = useAuthStore();
  const { data: inspection, isLoading } = useInspectionDetails(inspectionId);
  const { mutateAsync: updateInspection, isPending: isUpdating } = useUpdateInspection();
  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadInspectionImage();
  const [notes, setNotes] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!inspection) {
    return <div className="p-8 text-center text-slate-600 font-bold">Inspection not found</div>;
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

  const handleCaptureImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        await uploadImage({ 
          id: inspectionId, 
          imageUrl: base64Data, 
          caption: `Photo taken on ${format(new Date(), 'PPp')}` 
        });
      } catch (error) {
        console.error('Failed to upload image:', error);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in pb-12">
      <Link to="/inspections" className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-slate-900 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs transition-colors w-fit">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Inspections
      </Link>

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start gap-8">
          <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl">
            <ClipboardCheck className="w-14 h-14 text-indigo-600" />
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  Inspection #{inspection.id}
                </h1>
                <p className="text-slate-600 mt-1 text-sm font-medium">
                  Scheduled for <span className="font-extrabold text-slate-900">{format(new Date(inspection.scheduledDate), 'PPPP')}</span>
                </p>
              </div>
              <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-black border ${statusInfo.bg}`}>
                <StatusIcon className="w-4 h-4 mr-1.5" />
                {inspection.status}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-xs">
              {inspection.asset && (
                <Link to={`/assets/${inspection.asset.id}`} className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 font-bold text-indigo-600 flex items-center gap-1.5 hover:bg-slate-100 transition-colors">
                  Asset: {inspection.asset.name}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
              <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                Inspector: {inspection.inspector?.name || 'Unassigned'}
              </div>
              {inspection.completedAt && (
                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 font-semibold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Completed: {format(new Date(inspection.completedAt), 'PPp')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Actions */}
        {canManage && inspection.status !== 'COMPLETED' && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex gap-3">
            {inspection.status === 'SCHEDULED' && (
              <button
                onClick={() => handleStatusChange('IN_PROGRESS')}
                disabled={isUpdating}
                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle2 className="w-4 h-4" />
                Mark as Completed
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Inspection Notes
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <InspectionCopilot inspectionId={inspectionId} />

              {canManage && (
                <button
                  onClick={() => { setNotes(inspection.notes || ''); setNotesEditing(true); }}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Edit Notes
                </button>
              )}
            </div>
          </div>

          {notesEditing ? (
            <div className="space-y-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium text-xs resize-y min-h-[150px]"
                placeholder="Enter inspection notes, structural findings, and observations..."
              />
              <div className="flex gap-2.5 justify-end">
                <button onClick={() => setNotesEditing(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={isUpdating}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Notes
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 min-h-[120px]">
              {inspection.notes ? (
                <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-medium">{inspection.notes}</p>
              ) : (
                <p className="text-slate-400 text-xs italic">No notes recorded yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Inspection Images */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600" />
              Photos ({inspection.inspectionImages?.length || 0})
            </h2>
            {canManage && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleCaptureImage}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Take Photo
                </button>
              </>
            )}
          </div>

          {inspection.inspectionImages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Camera className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-700 font-bold text-sm">No photos uploaded</p>
              <p className="text-slate-400 text-xs mt-1">Images captured during inspection will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {inspection.inspectionImages?.map((image: any) => (
                <div key={image.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer">
                  <img
                    src={image.imageUrl}
                    alt={image.caption || 'Inspection photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
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

