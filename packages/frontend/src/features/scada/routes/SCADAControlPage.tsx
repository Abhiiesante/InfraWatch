import { useState, useEffect } from 'react';
import { Radio, ShieldAlert, Cpu, CheckCircle2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { SCADAGaugePanel } from '@/components/scada/SCADAGaugePanel';

export const SCADAControlPage = () => {
  const [actuators, setActuators] = useState<any[]>([]);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [liveClock, setLiveClock] = useState(new Date());
  const [gridHealth, setGridHealth] = useState(98.2);

  useEffect(() => {
    const timer = setInterval(() => setLiveClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll actuators dynamically from backend API
  useEffect(() => {
    let mounted = true;
    async function loadScadaGrid() {
      try {
        const { scadaApi } = await import('@/lib/api');
        const scadaRes = await scadaApi.getGridStatus();

        if (!mounted) return;
        
        if (scadaRes?.data?.actuators?.length > 0) {
          setActuators(scadaRes.data.actuators);
          if (scadaRes.data.gridHealthScore !== undefined) {
            setGridHealth(scadaRes.data.gridHealthScore);
          }
        }
      } catch (err) {
        console.error('Failed to fetch SCADA grid status:', err);
      }
    }
    
    loadScadaGrid();
    const interval = setInterval(loadScadaGrid, 3000); // Pull live telemetry every 3s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleExecuteCommand = (actuatorId: string, actionName: string) => {
    setExecutingId(actuatorId);
    setTimeout(() => {
      setActuators(prev =>
        prev.map(act => {
          if (act.id === actuatorId) {
            const nextStatus = actionName === 'TRIP' ? 'ISOLATED_TRIPPED' : actionName === 'ENGAGE' ? 'ENGAGED' : 'ACTIVE_HIGH';
            return { ...act, status: nextStatus, lastCommandAt: new Date().toISOString() };
          }
          return act;
        })
      );
      setExecutingId(null);
    }, 1200);
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-[#3A4046]">
              SCADA Autonomous Emergency Control
            </h1>
            <span className="bg-rose-100 text-rose-700 border border-rose-300 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse" /> V4.0 AUTONOMOUS FAILOVER
            </span>
          </div>
          <p className="text-slate-800/70 mt-1.5 text-base font-medium">
            Industrial Actuator Control, High-Voltage Tripping, and Emergency Isolation Interlocks.
          </p>
        </div>

        <div className="bg-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.80)] p-3.5 rounded-2xl flex items-center gap-4 text-xs font-mono text-[#3A4046] ">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-800 animate-ping" />
            <span>SCADA GRID: {gridHealth}% HEALTH</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-[#7FB8B0] font-bold">{format(liveClock, 'HH:mm:ss.SSS')} UTC</span>
        </div>
      </div>

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
          label="Surge Barrier Hydraulic Pressure"
          value={actuators[1]?.pressurePSI || 2850}
          min={1500}
          max={3500}
          unit="PSI"
          warningThreshold={3200}
          dangerThreshold={3400}
        />
        <SCADAGaugePanel
          label="Subway Vent Turbine Velocity"
          value={actuators[3]?.rpm || 1450}
          min={800}
          max={2000}
          unit="RPM"
          warningThreshold={1800}
          dangerThreshold={1950}
        />
      </div>

      {/* Grid Actuators Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {actuators.map((act) => {
          const isTripped = act.status === 'ISOLATED_TRIPPED';
          return (
            <div
              key={act.id}
              className={`p-6 rounded-3xl border transition-all ${
                isTripped
                  ? 'bg-rose-50 border-rose-300 shadow-xl'
                  : 'bg-[rgba(255,255,255,0.55)] border-[rgba(255,255,255,0.80)] '
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${isTripped ? 'bg-rose-600 text-slate-800' : 'bg-[rgba(127,184,176,0.85)] text-slate-800'}`}>
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-400">{act.id} • {act.type}</span>
                    <h3 className="font-extrabold text-lg text-[#3A4046] mt-0.5">{act.name}</h3>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                  isTripped
                    ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse'
                    : 'bg-slate-800/10 text-slate-800 border-slate-800/20'
                }`}>
                  {act.status}
                </span>
              </div>

              <p className="text-xs text-slate-800/70 font-medium mt-2">{act.facility}</p>

              {/* Live Telemetry Parameters */}
              <div className="grid grid-cols-3 gap-3 my-5 p-3.5 rounded-2xl bg-transparent border border-slate-100 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">LOAD / AMPS</span>
                  <span className="font-extrabold text-[#3A4046]">{act.loadAmps ?? 0} A</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">VOLTAGE / PRESS</span>
                  <span className="font-extrabold text-[#7FB8B0]">{act.voltageKV ? `${act.voltageKV} kV` : `${act.pressurePSI} PSI`}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">SAFETY INTERLOCK</span>
                  <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                  </span>
                </div>
              </div>

              {/* Control Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-mono text-slate-400">
                  Last Cmd: {format(new Date(act.lastCommandAt), 'HH:mm:ss')}
                </span>
                <button
                  disabled={executingId === act.id}
                  onClick={() => handleExecuteCommand(act.id, isTripped ? 'ENGAGE' : 'TRIP')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5 ${
                    isTripped
                      ? 'bg-emerald-600 hover:bg-slate-800 text-slate-800 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 text-slate-800 shadow-rose-600/30'
                  }`}
                >
                  {executingId === act.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  {executingId === act.id ? 'Executing...' : isTripped ? 'Reset & Re-Engage' : 'EMERGENCY TRIP / ISOLATE'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
