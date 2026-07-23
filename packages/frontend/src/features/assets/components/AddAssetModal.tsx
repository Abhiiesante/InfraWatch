import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2 } from 'lucide-react';
import { useCreateAsset } from '../api/useCreateAsset';
import { useAssetTypes } from '../api/useAssetTypes';

export const AddAssetModal = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { mutateAsync: createAsset, isPending } = useCreateAsset();
  const { data: assetTypes } = useAssetTypes();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      assetTypeId: parseInt(formData.get('assetTypeId') as string, 10),
      description: formData.get('description') as string,
      address: formData.get('address') as string,
    };
    
    try {
      await createAsset(data);
      setOpen(false);
    } catch (error) {
      console.error('Failed to create asset:', error);
      alert('Failed to create asset. See console for details.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {children}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="glass fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 p-8 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-2xl font-bold leading-none tracking-tight text-foreground">Add New Asset</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground mt-1">
              Register a new physical asset in the infrastructure registry.
            </Dialog.Description>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Asset Name</label>
              <input required id="name" name="name" className="flex h-11 w-full rounded-xl border border-white/20 bg-white/50 px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm hover:shadow-md" placeholder="e.g. Tower Alpha-01" />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="assetTypeId" className="text-sm font-medium leading-none text-foreground">Asset Type</label>
              <select required id="assetTypeId" name="assetTypeId" className="flex h-11 w-full rounded-xl border border-white/20 bg-white/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all shadow-sm hover:shadow-md">
                <option value="">Select a type...</option>
                {assetTypes?.map((type: any) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium leading-none text-foreground">Address / Location</label>
              <input id="address" name="address" className="flex h-11 w-full rounded-xl border border-white/20 bg-white/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all shadow-sm hover:shadow-md" placeholder="e.g. 123 Industrial Pkwy" />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium leading-none text-foreground">Description (Optional)</label>
              <textarea id="description" name="description" className="flex min-h-[100px] w-full rounded-xl border border-white/20 bg-white/50 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all shadow-sm hover:shadow-md resize-y" placeholder="Additional details..." />
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 pt-6">
              <Dialog.Close asChild>
                <button type="button" className="mt-2 sm:mt-0 inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all hover:bg-secondary hover:text-secondary-foreground h-11 px-6 py-2 shadow-sm">
                  Cancel
                </button>
              </Dialog.Close>
              <button disabled={isPending} type="submit" className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_4px_20px_hsla(242,84%,58%,0.4)] h-11 px-8 py-2">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Asset
              </button>
            </div>
          </form>
          <Dialog.Close className="absolute right-6 top-6 rounded-full p-1 opacity-70 transition-all hover:opacity-100 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-5 w-5 text-foreground" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
