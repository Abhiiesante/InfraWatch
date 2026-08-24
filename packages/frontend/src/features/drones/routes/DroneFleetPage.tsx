import { useState, useEffect } from 'react';
import { Plane, Battery, Signal, Compass, Play, RefreshCw, Radio } from 'lucide-react';
import { droneApi } from '@/lib/api';

export const DroneFleetPage = () => {
  const [drones, setDrones] = useState<any[]>([]);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadDroneFleet() {
      try {
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
      await droneApi.dispatchMission(id, 'Automated Inspection');
      // Optimistically update status
      setDrones(prev =>
        prev.map(d => d.id === id ? { ...d, status: 'IN_FLIGHT_MISSION', waypointsCompleted: 1, totalWaypoints: 12 } : d)
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
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Drone Fleet & Autonomous Missions
            </h1>
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
              <Plane className="w-3.5 h-3.5 text-indigo-600" /> UAV ROBOTIC FLEET
            </span>
          </div>
          <p className="text-slate-600 mt-1.5 text-base font-medium">
            Autonomous Flight Waypoints, Aerial Thermal Scans, and Sub-Surface ROV Inspections.
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex items-center gap-4 text-xs font-mono text-slate-800 shadow-sm">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span className="font-bold">FLEET ONLINE: {drones.length} UNITS</span>
          </div>
        </div>
      </div>

      {/* Fleet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {drones.map((drone) => {
          const isInFlight = drone.status === 'IN_FLIGHT_MISSION';
          return (
            <div
              key={drone.id}
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between shadow-sm hover:shadow-md ${
                isInFlight
                  ? 'bg-cyan-50/70 border-cyan-300 shadow-md'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-400">UAV #{drone.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    isInFlight
                      ? 'bg-cyan-100 text-cyan-800 border-cyan-300 animate-pulse'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {drone.status}
                  </span>
                </div>

                <h3 className="font-extrabold text-lg text-slate-900 mt-2">{drone.name}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{drone.model}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Assigned Facility:</span>
                    <span className="text-slate-900 font-bold truncate max-w-[140px]">{drone.assignedFacility || 'Delta Station'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Battery className="w-3.5 h-3.5 text-emerald-600" /> Battery:
                    </span>
                    <span className="font-extrabold text-emerald-700">{drone.batteryPercent}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Compass className="w-3.5 h-3.5 text-indigo-600" /> Altitude / Depth:
                    </span>
                    <span className="font-extrabold text-slate-900">{drone.altitudeMeters || 0} m</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Signal className="w-3.5 h-3.5 text-indigo-600" /> Link:
                    </span>
                    <span className="font-bold text-emerald-700">AES-256 ENCRYPTED</span>
                  </div>
                </div>

                {/* Waypoint Progress Bar */}
                <div className="mt-5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Mission Waypoints:</span>
                    <span className="font-bold text-slate-900">{drone.waypointsCompleted || 0} / {drone.totalWaypoints || 12}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-teal-500 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${Math.max(5, ((drone.waypointsCompleted || 0) / (drone.totalWaypoints || 12)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  disabled={dispatchingId === drone.id || isInFlight}
                  onClick={() => handleLaunchMission(drone.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer ${
                    isInFlight
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/20'
                  }`}
                >
                  {dispatchingId === drone.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {isInFlight ? 'Mission Active In Flight' : dispatchingId === drone.id ? 'Launching Flight...' : 'Launch Mission'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

