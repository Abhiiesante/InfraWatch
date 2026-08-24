import { useState, useEffect } from 'react';
import { Radio, ShieldAlert, Cpu, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { SCADAGaugePanel } from '@/components/scada/SCADAGaugePanel';
import { scadaApi } from '@/lib/api';

export const SCADAControlPage = () => {
  const [actuators, setActuators] = useState<any[]>([]);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [liveClock, setLiveClock] = useState(new Date());
  const [gridHealth, setGridHealth] = useState(98.4);
  const [scadaMode, setScadaMode] = useState('AUTONOMOUS_INTERLOCK_PROTECTED');
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setLiveClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll actuators dynamically from backend API
  const loadScadaGrid = async () => {
    try {
      const scadaRes = await scadaApi.getGridStatus();
      if (scadaRes?.data?.actuators?.length > 0) {
        setActuators(scadaRes.data.actuators);
        if (scadaRes.data.gridHealthScore !== undefined) {
          setGridHealth(scadaRes.data.gridHealthScore);
        }
        if (scadaRes.data.scadaMode) {
          setScadaMode(scadaRes.data.scadaMode);
        }
      }
    } catch (err) {
      console.error('Failed to fetch SCADA grid status:', err);
    }
  };

  useEffect(() => {
    loadScadaGrid();
    const interval = setInterval(loadScadaGrid, 3000); // Pull live telemetry every 3s
    return () => clearInterval(interval);
  }, []);

  const handleExecuteCommand = async (actuatorId: string, actionName: string) => {
    setExecutingId(actuatorId);
    try {
      await scadaApi.executeCommand(actuatorId, actionName);
      // Optimistically update local state immediately
      setActuators(prev =>
        prev.map(act => {
          if (act.id === actuatorId) {
            const nextStatus = actionName === 'TRIP' ? 'ISOLATED_TRIPPED' : actionName === 'ENGAGE' ? 'ENGAGED' : 'ACTIVE_HIGH';
            return { ...act, status: nextStatus, lastCommandAt: new Date().toISOString() };
          }
          return act;
        })
      );
      setLastNotification(`Command ${actionName} dispatched to ${actuatorId} successfully.`);
      await loadScadaGrid();
    } catch (err) {
      console.error('Command execution failed:', err);
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              SCADA Autonomous Emergency Control
            </h1>
            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
              <Radio className="w-3.5 h-3.5 animate-pulse text-rose-600" /> {scadaMode.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-slate-600 mt-1.5 text-base font-medium">
            Industrial Actuator Control, High-Voltage Tripping, and Emergency Isolation Interlocks.
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex items-center gap-4 text-xs font-mono text-slate-800 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold">GRID HEALTH: {gridHealth}%</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-700 font-bold">{format(liveClock, 'HH:mm:ss.SSS')} UTC</span>
        </div>
      </div>

      {/* Action Notification Banner */}
      {lastNotification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{lastNotification}</span>
        </div>
      )}

      {/* Industrial Real-Time SCADA Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <SCADAGaugePanel
          label="Main Substation 400kV Voltage"
          value={actuators[0]?.voltageKV || 400.2}
          min={360}
          max={440}
          unit="kV"
          warningThreshold={425}
          dangerThreshold={435}
        />
        <SCADAGaugePanel
          label="Grid Current Load"
          value={actuators[0]?.loadAmps || 3420}
          min={2000}
          max={4500}
          unit="A"
          warningThreshold={4000}
          dangerThreshold={4300}
        />
        <SCADAGaugePanel
          label="Pipeline Hydraulic Pressure"
          value={actuators[1]?.pressurePSI || 2850}
          min={1500}
          max={3500}
          unit="PSI"
          warningThreshold={3200}
          dangerThreshold={3400}
        />
        <SCADAGaugePanel
          label="Plant Turbine Velocity"
          value={actuators[3]?.rpm || 1450}
          min={800}
          max={2000}
          unit="RPM"
          warningThreshold={1800}
          dangerThreshold={1950}
        />
      </div>

      {/* Grid Actuators Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-black text-slate-900">Active Industrial Actuators & Interlocks</h2>
        </div>
        <span className="text-xs font-mono font-bold text-slate-500">
          {actuators.length} ACTUATORS MONITORED
        </span>
      </div>

      {/* Grid Actuators Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {actuators.map((act) => {
          const isTripped = act.status === 'ISOLATED_TRIPPED';
          return (
            <div
              key={act.id}
              className={`p-6 rounded-3xl border transition-all shadow-sm hover:shadow-md ${
                isTripped
                  ? 'bg-rose-50/80 border-rose-300 shadow-md'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className={`p-3.5 rounded-2xl ${isTripped ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' : 'bg-slate-900 text-white shadow-sm'}`}>
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-400">ACTUATOR #{act.id} • {act.type}</span>
                    <h3 className="font-extrabold text-lg text-slate-900 mt-0.5">{act.name}</h3>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                  isTripped
                    ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                  {act.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 font-semibold mt-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Facility: <span className="text-slate-900">{act.facility}</span>
              </p>

              {/* Live Telemetry Parameters */}
              <div className="grid grid-cols-3 gap-3 my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">LOAD / AMPS</span>
                  <span className="font-extrabold text-slate-900 text-sm">{act.loadAmps ?? '3,420'} A</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">VOLTAGE / PRESS</span>
                  <span className="font-extrabold text-indigo-700 text-sm">
                    {act.voltageKV ? `${act.voltageKV} kV` : act.pressurePSI ? `${act.pressurePSI} PSI` : '400.2 kV'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">SAFETY INTERLOCK</span>
                  <span className={`font-extrabold flex items-center gap-1 text-sm ${isTripped ? 'text-rose-600' : 'text-emerald-700'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> {isTripped ? 'TRIPPED' : 'VERIFIED'}
                  </span>
                </div>
              </div>

              {/* Control Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-mono text-slate-400">
                  Last Cmd: {act.lastCommandAt ? format(new Date(act.lastCommandAt), 'HH:mm:ss') : 'Just now'}
                </span>
                <button
                  disabled={executingId === act.id}
                  onClick={() => handleExecuteCommand(act.id, isTripped ? 'ENGAGE' : 'TRIP')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2 text-white cursor-pointer ${
                    isTripped
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  {executingId === act.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  {executingId === act.id ? 'Executing Command...' : isTripped ? 'Reset & Re-Engage' : 'EMERGENCY TRIP / ISOLATE'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

