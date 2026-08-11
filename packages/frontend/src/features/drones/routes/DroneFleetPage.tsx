import { useState, useEffect } from 'react';
import { Plane, Battery, Signal, Compass, Play, RefreshCw } from 'lucide-react';

export const DroneFleetPage = () => {
  const [drones, setDrones] = useState<any[]>([]);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadDroneFleet() {
      try {
        const { droneApi } = await import('@/lib/api');
        const droneRes = await droneApi.getFleet();
        if (!mounted) return;
        
        if (droneRes?.data?.fleet?.length > 0) {
          setDrones(droneRes.data.fleet);
        }
      } catch (err) {
        console.error('Failed to load drone fleet:', err);
      }
    }
    
    loadDroneFleet();
    const interval = setInterval(loadDroneFleet, 3000); // Poll drone telemetry every 3s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLaunchMission = async (id: string) => {
    setDispatchingId(id);
    try {
      const { droneApi } = await import('@/lib/api');
      await droneApi.dispatchMission(id, 'Automated Inspection');
      // Optimistically update status
      setDrones(prev =>
        prev.map(d => d.id === id ? { ...d, status: 'IN_FLIGHT_MISSION', waypointsCompleted: 1 } : d)
      );
    } catch (err) {
      console.error('Failed to dispatch mission:', err);
    } finally {
      setDispatchingId(null);
    }
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-[#3A4046]">
              Drone Fleet & Autonomous Missions
            </h1>
            <span className="bg-slate-800/10 text-slate-800 border border-slate-800/20 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5" /> UAV ROBOTIC FLEET
            </span>
          </div>
          <p className="text-slate-800/70 mt-1.5 text-base font-medium">
            Autonomous Flight Waypoints, Aerial Thermal Scans, and Sub-Surface ROV Inspections.
          </p>
        </div>
      </div>

      {/* Fleet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {drones.map((drone) => {
          const isInFlight = drone.status === 'IN_FLIGHT_MISSION';
          return (
            <div
              key={drone.id}
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                isInFlight
                  ? 'bg-[rgba(127,184,176,0.12)] border-indigo-300 shadow-xl'
                  : 'bg-[rgba(255,255,255,0.55)] border-[rgba(255,255,255,0.80)] '
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-400">{drone.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    isInFlight
                      ? 'bg-cyan-100 text-cyan-700 border-cyan-300 animate-pulse'
                      : 'bg-slate-800/10 text-slate-800 border-slate-800/20'
                  }`}>
                    {drone.status}
                  </span>
                </div>

                <h3 className="font-extrabold text-xl text-[#3A4046] mt-2">{drone.name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{drone.model}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Assigned Facility:</span>
                    <span className="text-slate-700 font-bold truncate max-w-[150px]">{drone.assignedFacility}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Battery className="w-3.5 h-3.5 text-slate-800" /> Battery:
                    </span>
                    <span className="font-extrabold text-emerald-600">{drone.batteryPercent}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Compass className="w-3.5 h-3.5 text-slate-800" /> Altitude / Depth:
                    </span>
                    <span className="font-extrabold text-[#7FB8B0]">{drone.altitudeMeters} m</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Signal className="w-3.5 h-3.5 text-purple-500" /> Telemetry:
                    </span>
                    <span className="font-bold text-slate-800">{drone.telemetrySignal}</span>
                  </div>
                </div>

                {/* Waypoint Progress Bar */}
                <div className="mt-5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Mission Waypoints:</span>
                    <span className="font-bold text-[#7FB8B0]">{drone.waypointsCompleted} / {drone.totalWaypoints}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500"
                      style={{ width: `${(drone.waypointsCompleted / drone.totalWaypoints) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  disabled={dispatchingId === drone.id || isInFlight}
                  onClick={() => handleLaunchMission(drone.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5 ${
                    isInFlight
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-[rgba(127,184,176,0.85)] hover:bg-indigo-700 text-slate-800 shadow-indigo-600/30'
                  }`}
                >
                  {dispatchingId === drone.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {isInFlight ? 'Mission Active In Flight' : dispatchingId === drone.id ? 'Launching Flight...' : 'Launch Autonomous Waypoint Mission'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
