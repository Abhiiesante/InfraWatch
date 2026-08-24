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
  const { mutateAsync: updateInspection } = useUpdateInspection();
  const { mutateAsync: uploadImage } = useUploadInspectionImage();

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
        <Clock className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 justify-center">
            <ClipboardCheck className="w-4 h-4 text-indigo-600" />
            Field Inspection Run #{inspectionId}
          </h1>
          <p className="text-[11px] text-slate-500 font-semibold truncate max-w-[200px] sm:max-w-xs">
            {inspection?.asset?.name || 'Target Asset'}
          </p>
        </div>
        <div className="w-9" /> {/* Spacer */}
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        
        {/* Success Banner */}
        {isSubmitted && (
          <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600" />
            <div>
              <p className="font-extrabold text-sm">Inspection Completed Successfully!</p>
              <p className="text-xs text-emerald-700">Asset maintenance record and lastInspectionAt updated. Redirecting...</p>
            </div>
          </div>
        )}

        {/* Asset Context Card */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                Target Facility
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1.5 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                {inspection?.asset?.name}
              </h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {inspection?.asset?.assetType?.name || 'Infrastructure'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 text-xs text-slate-600 border-t border-slate-100 font-medium">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Scheduled: {inspection?.scheduledDate ? new Date(inspection.scheduledDate).toLocaleDateString() : 'Today'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <span>Inspector: {inspection?.inspector?.name || 'Field Operative'}</span>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Interactive Checklist */}
          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Standard Field Checklist
              </h3>
              <span className="text-xs text-slate-500 font-mono font-bold">
                {checklist.filter(c => c.passed !== null).length}/{checklist.length} Verified
              </span>
            </div>

            <div className="space-y-2.5">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.passed === true
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : item.passed === false
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block mb-0.5">
                      {item.category}
                    </span>
                    <p className="text-xs font-bold leading-snug">{item.label}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleCheck(item.id, true)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        item.passed === true
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> Pass
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCheck(item.id, false)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        item.passed === false
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
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
          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                Field Photos & Evidence ({capturedPhotos.length})
              </h3>
            </div>

            {/* Photo Gallery Grid */}
            {capturedPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {capturedPhotos.map((photo, idx) => (
                  <div key={idx} className="relative group rounded-2xl overflow-hidden aspect-video border border-slate-200 bg-slate-100 shadow-xs">
                    <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                      <p className="text-[10px] text-white font-bold truncate">{photo.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Photo Input Controls */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <label className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer transition-colors flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-600" />
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
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
                />
                <button
                  type="button"
                  onClick={handleAddPhoto}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </section>

          {/* Findings & Notes */}
          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Inspector Findings & Field Notes
            </h3>
            <textarea
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Enter detailed observations, sensor calibrations, structural remarks..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors resize-none font-medium"
            />

            {/* Overall Status Selection */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                Overall Inspection Outcome
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setOverallStatus('COMPLETED')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    overallStatus === 'COMPLETED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Passed
                </button>

                <button
                  type="button"
                  onClick={() => setOverallStatus('FAILED')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    overallStatus === 'FAILED'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" /> Failed / Remediation
                </button>

                <button
                  type="button"
                  onClick={() => setOverallStatus('IN_PROGRESS')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    overallStatus === 'IN_PROGRESS'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
              className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold shadow-xl shadow-slate-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Field Report...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
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

