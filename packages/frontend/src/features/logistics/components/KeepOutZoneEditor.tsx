import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, Check, Sliders, AlertTriangle, Move, Loader2 } from 'lucide-react';

export interface KeepOutZoneConfig {
  xMin: number; // 0-100%
  xMax: number; // 0-100%
  yMin: number; // 0-100%
  yMax: number; // 0-100%
  zoneName: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

interface KeepOutZoneEditorProps {
  isOpen: boolean;
  onClose: () => void;
  initialZone?: KeepOutZoneConfig;
  onSaveZone: (zone: KeepOutZoneConfig) => Promise<void> | void;
  isSaving?: boolean;
  cameraName?: string;
  referenceImage?: string;
}

export const KeepOutZoneEditor: React.FC<KeepOutZoneEditorProps> = ({
  isOpen,
  onClose,
  initialZone = {
    xMin: 0,
    xMax: 100,
    yMin: 50,
    yMax: 100,
    zoneName: 'AMR Automation Runway Alpha',
    severity: 'CRITICAL',
  },
  onSaveZone,
  isSaving = false,
  cameraName = 'Warehouse North Bay PTZ',
  referenceImage = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200',
}) => {
  const [zone, setZone] = useState<KeepOutZoneConfig>(initialZone);

  useEffect(() => {
    if (initialZone) {
      setZone(initialZone);
    }
  }, [initialZone, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    await onSaveZone(zone);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-6 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Keep-Out Zone Spatial Editor</h2>
              <p className="text-xs text-slate-400">
                Define restricted safety boundaries for {cameraName} (persisted to database & CV daemon)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Visual Canvas */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border-2 border-slate-800 select-none flex-1 min-h-[300px]">
          <img
            src={referenceImage}
            alt="Reference Frame"
            className="w-full h-full object-cover opacity-60 pointer-events-none"
          />

          {/* Rendered Configurable Keep-Out Zone Rectangle */}
          <div
            className="absolute border-2 border-dashed border-rose-500 bg-rose-500/20 backdrop-blur-[1px] transition-all flex flex-col items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)] pointer-events-none"
            style={{
              left: `${zone.xMin}%`,
              top: `${zone.yMin}%`,
              width: `${zone.xMax - zone.xMin}%`,
              height: `${zone.yMax - zone.yMin}%`,
            }}
          >
            <div className="bg-rose-600/90 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wide">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{zone.zoneName} ({zone.severity})</span>
            </div>
            <span className="text-[10px] font-mono text-rose-200 mt-1">
              Top: {zone.yMin}% • Bottom: {zone.yMax}% • Width: {zone.xMax - zone.xMin}%
            </span>
          </div>

          {/* Coordinate Guide Legend */}
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-300 border border-white/10 flex items-center gap-2">
            <Move className="w-3 h-3 text-cyan-400" />
            <span>Use coordinate sliders below to adjust boundary bounds</span>
          </div>
        </div>

        {/* Sliders & Configuration Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-300">
                <span>Top Boundary (yMin)</span>
                <span className="font-mono text-cyan-400">{zone.yMin}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={zone.yMin}
                onChange={(e) => setZone(z => ({ ...z, yMin: Number(e.target.value) }))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-300">
                <span>Bottom Boundary (yMax)</span>
                <span className="font-mono text-cyan-400">{zone.yMax}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={zone.yMax}
                onChange={(e) => setZone(z => ({ ...z, yMax: Number(e.target.value) }))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Zone Identifier / Label
              </label>
              <input
                type="text"
                value={zone.zoneName}
                onChange={(e) => setZone(z => ({ ...z, zoneName: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Violation Severity Level
              </label>
              <select
                value={zone.severity}
                onChange={(e) => setZone(z => ({ ...z, severity: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="CRITICAL">CRITICAL (Direct Emergency Halt / Siren)</option>
                <option value="HIGH">HIGH (Immediate Supervisor Alert)</option>
                <option value="MEDIUM">MEDIUM (Telemetry Logged)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{isSaving ? 'Saving to Database...' : 'Save & Apply Zone'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
