import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  ArrowLeft, 
  Building2, 
  Calendar, 
  User, 
  FileText, 
  Sparkles,
  ShieldCheck,
  Check,
  X,
  Clock
} from 'lucide-react';
import { useInspectionDetails, useUpdateInspection, useUploadInspectionImage } from '../api/useInspections';

interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  passed: boolean | null; // true = Pass, false = Fail, null = Unchecked
  note?: string;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', label: 'Visual surface inspection for cracks & fissures', category: 'Structural', passed: null },
  { id: '2', label: 'Cable tension and anchor bolt torque check', category: 'Mechanical', passed: null },
  { id: '3', label: 'Corrosion level on protective coating & fasteners', category: 'Environmental', passed: null },
  { id: '4', label: 'Thermal hotspot scanning on junction boxes', category: 'Electrical', passed: null },
  { id: '5', label: 'Foundation settlement and soil drainage check', category: 'Civil', passed: null },
];

export const InspectionExecutionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const inspectionId = Number(id);

  const { data: inspection, isLoading } = useInspectionDetails(inspectionId);
  const { mutateAsync: updateInspection, isPending: isUpdating } = useUpdateInspection();
  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadInspectionImage();

  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [notes, setNotes] = useState('');
  const [overallStatus, setOverallStatus] = useState<'COMPLETED' | 'FAILED' | 'IN_PROGRESS'>('COMPLETED');
  const [capturedPhotos, setCapturedPhotos] = useState<Array<{ url: string; caption: string }>>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleCheck = (itemId: string, status: boolean) => {
    setChecklist(prev =>
      prev.map(item => (item.id === itemId ? { ...item, passed: item.passed === status ? null : status } : item))
    );
  };

  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    setCapturedPhotos(prev => [...prev, { url: newPhotoUrl.trim(), caption: newPhotoCaption.trim() || 'Field Inspection Capture' }]);
    setNewPhotoUrl('');
    setNewPhotoCaption('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedPhotos(prev => [...prev, { url: reader.result as string, caption: file.name }]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Upload captured photos
      for (const photo of capturedPhotos) {
        await uploadImage({
          inspectionId,
          imageUrl: photo.url,
          caption: photo.caption,
        });
      }

      // 2. Format checklist summary into notes
      const passedCount = checklist.filter(c => c.passed === true).length;
      const failedCount = checklist.filter(c => c.passed === false).length;
      const checklistSummary = `[FIELD EXECUTION SUMMARY]\n- Checks Passed: ${passedCount}/${checklist.length}\n- Deficiencies Found: ${failedCount}\n\n[INSPECTOR NOTES]\n${notes || 'All standard checks performed in accordance with asset maintenance protocol.'}`;

      // 3. Update inspection to COMPLETED (which automatically updates asset.lastInspectionAt)
      await updateInspection({
        id: inspectionId,
        data: {
          status: overallStatus,
          notes: checklistSummary,
          completedAt: new Date().toISOString(),
        },
      });

      setIsSubmitted(true);
      setTimeout(() => {
        navigate(`/assets/${inspection?.assetId || ''}`);
      }, 1500);
    } catch (err) {
      console.error('Inspection execution failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-slate-500">
        <Clock className="w-8 h-8 animate-spin text-cyan-600 mb-2" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 animate-fade-in">
      {/* Mobile-optimized Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 justify-center">
            <ClipboardCheck className="w-4 h-4 text-cyan-400" />
            Field Inspection Run #{inspectionId}
          </h1>
          <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs">
            {inspection?.asset?.name || 'Target Asset'}
          </p>
        </div>
        <div className="w-9" /> {/* Spacer */}
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        
        {/* Success Banner */}
        {isSubmitted && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-3 animate-bounce">
            <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400" />
            <div>
              <p className="font-bold text-sm">Inspection Completed Successfully!</p>
              <p className="text-xs text-emerald-400/80">Asset maintenance record and lastInspectionAt updated. Redirecting...</p>
            </div>
          </div>
        )}

        {/* Asset Context Card */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                Target Facility
              </span>
              <h2 className="text-lg font-extrabold text-white mt-1.5 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                {inspection?.asset?.name}
              </h2>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {inspection?.asset?.assetType?.name || 'Infrastructure'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-400 border-t border-slate-800">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Scheduled: {inspection?.scheduledDate ? new Date(inspection.scheduledDate).toLocaleDateString() : 'Today'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Inspector: {inspection?.inspector?.name || 'Field Operative'}</span>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Interactive Checklist */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Standard Field Checklist
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {checklist.filter(c => c.passed !== null).length}/{checklist.length} Verified
              </span>
            </div>

            <div className="space-y-2.5">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.passed === true
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                      : item.passed === false
                      ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                      : 'bg-slate-800/50 border-slate-800 text-slate-300'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-0.5">
                      {item.category}
                    </span>
                    <p className="text-xs font-semibold leading-snug">{item.label}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleCheck(item.id, true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        item.passed === true
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> Pass
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCheck(item.id, false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        item.passed === false
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" /> Defect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Photo Capture & Attachments */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                Field Photos & Evidence ({capturedPhotos.length})
              </h3>
            </div>

            {/* Photo Gallery Grid */}
            {capturedPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {capturedPhotos.map((photo, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video border border-slate-700 bg-black">
                    <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                      <p className="text-[10px] text-white font-medium truncate">{photo.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Photo Input Controls */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <label className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white cursor-pointer transition-colors flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Choose Photo / Device Camera</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPhotoUrl}
                  onChange={e => setNewPhotoUrl(e.target.value)}
                  placeholder="Or paste direct image URL (https://...)"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddPhoto}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </section>

          {/* Findings & Notes */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Inspector Findings & Field Notes
            </h3>
            <textarea
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Enter detailed observations, sensor calibrations, structural remarks..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />

            {/* Overall Status Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Overall Inspection Outcome
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOverallStatus('COMPLETED')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    overallStatus === 'COMPLETED'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Passed
                </button>

                <button
                  type="button"
                  onClick={() => setOverallStatus('FAILED')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    overallStatus === 'FAILED'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" /> Failed / Remediation
                </button>

                <button
                  type="button"
                  onClick={() => setOverallStatus('IN_PROGRESS')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    overallStatus === 'IN_PROGRESS'
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-4 h-4" /> In Progress
                </button>
              </div>
            </div>
          </section>

          {/* Submit Action Bar */}
          <div className="sticky bottom-4 z-20">
            <button
              type="submit"
              disabled={isSubmitting || isSubmitted}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 text-base font-extrabold shadow-2xl shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Field Report...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Sign & Complete Inspection</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
