import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { useCreateIncident } from '../api/useIncidentDetails';
import { useAssets } from '@/features/assets/api/useAssets';
import { useTriageIncident } from '@/features/ai/api/useAI';

export const CreateIncidentModal = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');

  const { mutateAsync: createIncident, isPending } = useCreateIncident();
  const { data: assetsData } = useAssets({ skip: 0, take: 100 });
  const { mutate: triage, data: triageResult, isPending: isTriaging } = useTriageIncident();

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (val.trim().length > 5) {
      triage({ title: val, description });
    }
  };

  const handleApplyAiSuggestion = () => {
    if (triageResult?.suggestedSeverity) {
      setSeverity(triageResult.suggestedSeverity);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assetIdVal = formData.get('assetId') as string;

    try {
      await createIncident({
        title,
        description,
        severity,
        assetId: assetIdVal ? parseInt(assetIdVal, 10) : undefined,
      });
      setOpen(false);
      setTitle('');
      setDescription('');
      setSeverity('MEDIUM');
    } catch (error) {
      console.error('Failed to create incident:', error);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
        <Dialog.Content className="glass fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 p-8 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-2xl">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-2xl font-bold leading-none tracking-tight text-foreground flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
              Report Incident
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground mt-1">
              File a new operational issue with optional AI-assisted triage.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            <div className="space-y-2">
              <label htmlFor="inc-title" className="text-sm font-medium leading-none text-foreground">Incident Title</label>
              <input
                required
                id="inc-title"
                name="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-white/20 bg-white/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm hover:shadow-md transition-all"
                placeholder="e.g. Smoke detected near cooling tower intake"
              />
            </div>

            {/* AI Triage Banner */}
            {isTriaging && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3 text-xs text-primary font-semibold animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin" />
                AI Analyzing incident text for severity & triage...
              </div>
            )}

            {triageResult && !isTriaging && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-primary/10 border border-purple-500/30 text-xs text-slate-800 dark:text-slate-200 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-300">
                    <Sparkles className="w-4 h-4" />
                    AI Triage Suggestion ({triageResult.confidence}% confidence)
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyAiSuggestion}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors"
                  >
                    Apply Suggestion
                  </button>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Category: <strong className="text-slate-900 dark:text-white">{triageResult.suggestedCategory}</strong> | Suggested Severity: <strong className="text-purple-600 dark:text-purple-400">{triageResult.suggestedSeverity}</strong>
                </p>
                <p className="italic text-[11px] text-slate-500">{triageResult.rationale}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="inc-asset" className="text-sm font-medium leading-none text-foreground">Associated Asset (Optional)</label>
              <select id="inc-asset" name="assetId" className="flex h-11 w-full rounded-xl border border-white/20 bg-white/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm hover:shadow-md transition-all">
                <option value="">Select an asset...</option>
                {assetsData?.assets?.map((asset: any) => (
                  <option key={asset.id} value={asset.id}>{asset.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="inc-severity" className="text-sm font-medium leading-none text-foreground">Severity Level</label>
              <select
                id="inc-severity"
                name="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-white/20 bg-white/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm hover:shadow-md transition-all"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="inc-desc" className="text-sm font-medium leading-none text-foreground">Detailed Description</label>
              <textarea
                id="inc-desc"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex min-h-[90px] w-full rounded-xl border border-white/20 bg-white/50 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm hover:shadow-md transition-all resize-y"
                placeholder="Provide location details, observations, or potential hazards..."
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 pt-4">
              <Dialog.Close asChild>
                <button type="button" className="mt-2 sm:mt-0 inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all hover:bg-secondary h-11 px-6 py-2">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                disabled={isPending}
                type="submit"
                className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-primary/30 h-11 px-8 py-2"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Incident
              </button>
            </div>
          </form>

          <Dialog.Close className="absolute right-6 top-6 rounded-full p-1 opacity-70 hover:opacity-100">
            <X className="h-5 w-5 text-foreground" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
