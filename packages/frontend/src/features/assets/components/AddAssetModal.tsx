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
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">Add New Asset</Dialog.Title>
            <Dialog.Description className="text-sm text-slate-500">
              Register a new physical asset in the infrastructure registry.
            </Dialog.Description>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Asset Name</label>
              <input required id="name" name="name" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="e.g. Tower Alpha-01" />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="assetTypeId" className="text-sm font-medium leading-none">Asset Type</label>
              <select required id="assetTypeId" name="assetTypeId" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950">
                <option value="">Select a type...</option>
                {assetTypes?.map((type: any) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium leading-none">Address / Location</label>
              <input id="address" name="address" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" placeholder="e.g. 123 Industrial Pkwy" />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium leading-none">Description (Optional)</label>
              <textarea id="description" name="description" className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" placeholder="Additional details..." />
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
              <Dialog.Close asChild>
                <button type="button" className="mt-2 sm:mt-0 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors hover:bg-slate-100 hover:text-slate-900 h-10 px-4 py-2">
                  Cancel
                </button>
              </Dialog.Close>
              <button disabled={isPending} type="submit" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-slate-50 hover:bg-slate-900/90 h-10 px-4 py-2">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Asset
              </button>
            </div>
          </form>
          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-100 data-[state=open]:text-slate-500">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
