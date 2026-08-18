import React, { useState, useEffect } from 'react';
import { Camera, Shield, Link2, Eye, EyeOff, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { useCreateCamera, useUpdateCamera } from '../api/useCameras';
import { useAssets } from '@/features/assets/api/useAssets';

interface CameraManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameraToEdit?: any | null;
}

export const CameraManagementModal: React.FC<CameraManagementModalProps> = ({
  isOpen,
  onClose,
  cameraToEdit,
}) => {
  const { data: assetsData } = useAssets({ skip: 0, take: 100 });
  const { mutateAsync: createCamera, isPending: isCreating } = useCreateCamera();
  const { mutateAsync: updateCamera, isPending: isUpdating } = useUpdateCamera();

  const [name, setName] = useState('');
  const [assetId, setAssetId] = useState<number | ''>('');
  const [cameraType, setCameraType] = useState('FIXED');
  const [rtspUrl, setRtspUrl] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [status, setStatus] = useState('ONLINE');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cameraToEdit) {
      setName(cameraToEdit.name || '');
      setAssetId(cameraToEdit.assetId || '');
      setCameraType(cameraToEdit.cameraType || 'FIXED');
      setRtspUrl(cameraToEdit.rtspUrl || cameraToEdit.config?.streamUrl || '');
      setIpAddress(cameraToEdit.ipAddress || '');
      setStatus(cameraToEdit.status || 'ONLINE');
    } else {
      setName('');
      setAssetId(assetsData?.assets?.[0]?.id || '');
      setCameraType('FIXED');
      setRtspUrl('');
      setIpAddress('');
      setStatus('ONLINE');
    }
    setError('');
  }, [cameraToEdit, isOpen, assetsData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Camera name is required');
      return;
    }
    if (!assetId) {
      setError('Please link this camera to an asset');
      return;
    }

    try {
      if (cameraToEdit) {
        await updateCamera({
          id: cameraToEdit.id,
          data: {
            name,
            cameraType,
            rtspUrl: rtspUrl.trim(),
            ipAddress: ipAddress.trim(),
            status,
          },
        });
      } else {
        await createCamera({
          name,
          assetId: Number(assetId),
          cameraType,
          rtspUrl: rtspUrl.trim(),
          ipAddress: ipAddress.trim(),
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to save camera');
    }
  };

  const isSaving = isCreating || isUpdating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {cameraToEdit ? 'Edit Camera Configuration' : 'Register New Edge Camera'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure stream endpoints, telemetry links, and access controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Camera Name & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Camera Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. North Perimeter Pan-Tilt"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Camera Type
              </label>
              <select
                value={cameraType}
                onChange={(e) => setCameraType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="FIXED">Fixed Optical</option>
                <option value="PTZ">Pan-Tilt-Zoom (PTZ)</option>
                <option value="DOME">360° Dome</option>
                <option value="THERMAL">Infrared / Thermal</option>
                <option value="MULTISENSOR">Multi-Sensor Array</option>
              </select>
            </div>
          </div>

          {/* Linked Asset */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-cyan-400" /> Linked Infrastructure Asset
            </label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">Select Asset to Link...</option>
              {assetsData?.assets?.map((asset: any) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.assetType || 'Infrastructure'})
                </option>
              ))}
            </select>
          </div>

          {/* RTSP Stream URL with Credential Masking */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> RTSP / Stream Endpoint
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPassword ? 'Mask Credentials' : 'Show Plaintext'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={rtspUrl}
              onChange={(e) => setRtspUrl(e.target.value)}
              placeholder="rtsp://username:password@192.168.1.100:554/live/ch0"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Passwords are redacted automatically before transmission to analytical Lakehouse layers.
            </p>
          </div>

          {/* IP Address & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Internal IP Address
              </label>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="192.168.1.50"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="ONLINE">ONLINE (Active Feed)</option>
                <option value="OFFLINE">OFFLINE (Deactivated)</option>
                <option value="MAINTENANCE">MAINTENANCE (Servicing)</option>
                <option value="ERROR">ERROR (Feed Down)</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold shadow-lg shadow-cyan-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />}
              {cameraToEdit ? 'Save Changes' : 'Register Camera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
