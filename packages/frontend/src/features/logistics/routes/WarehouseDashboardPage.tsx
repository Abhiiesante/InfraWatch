import { useState, useEffect } from 'react';
import { Box, Activity, ShieldAlert, Cpu, AlertTriangle } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

export function WarehouseDashboardPage() {
  const [stats, setStats] = useState({
    activeAMRs: 0,
    zoneViolations: 0,
    rackUtilization: 84,
    safetyScore: 99
  });
  const [boxes, setBoxes] = useState<any[]>([]);

  useEffect(() => {
    socket.on('cv-detections', (data) => {
      if (data && data.stats) {
        setStats(prev => ({
          ...prev,
          activeAMRs: data.stats.activeAMRs,
          // Calculate a simple rolling safety score
          safetyScore: Math.max(0, 100 - (data.stats.zoneViolations * 5)),
          zoneViolations: prev.zoneViolations + (data.stats.zoneViolations > 0 ? 1 : 0) // Just increment historically for demo
        }));
      }
      if (data && data.boxes) {
        setBoxes(data.boxes);
      }
    });

    return () => {
      socket.off('cv-detections');
    };
  }, []);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 w-full animate-in fade-in pb-24 mt-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 drop-shadow-sm">
            Warehouse Operations
          </h1>
          <p className="text-slate-800/70 mt-3 text-xl font-medium">
            Logistics, Safety, & Fleet Tracking
          </p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 font-bold text-sm">Roboflow Model Active</span>
          </div>
          <button className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
            Configure Zones
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[rgba(255,255,255,0.65)] backdrop-blur-2xl rounded-2xl border border-[rgba(255,255,255,0.8)] p-6 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-600 font-bold mb-1">Active Fleet</p>
            <p className="text-4xl font-extrabold text-slate-900">{stats.activeAMRs}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center">
            <Cpu className="w-7 h-7 text-white" />
          </div>
        </div>

        <div className={`bg-[rgba(255,255,255,0.65)] backdrop-blur-2xl rounded-2xl border border-[rgba(255,255,255,0.8)] p-6 shadow-xl flex items-center justify-between transition-colors ${stats.zoneViolations > 0 ? 'bg-rose-50/80 border-rose-200' : ''}`}>
          <div>
            <p className="text-slate-600 font-bold mb-1">Zone Violations</p>
            <p className="text-4xl font-extrabold text-rose-600">{stats.zoneViolations}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-rose-600" />
          </div>
        </div>

        <div className="bg-[rgba(255,255,255,0.65)] backdrop-blur-2xl rounded-2xl border border-[rgba(255,255,255,0.8)] p-6 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-600 font-bold mb-1">Rack Utilization</p>
            <p className="text-4xl font-extrabold text-slate-900">{stats.rackUtilization}%</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
            <Box className="w-7 h-7 text-indigo-600" />
          </div>
        </div>

        <div className="bg-[rgba(255,255,255,0.65)] backdrop-blur-2xl rounded-2xl border border-[rgba(255,255,255,0.8)] p-6 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-600 font-bold mb-1">Live Safety Score</p>
            <p className={`text-4xl font-extrabold ${stats.safetyScore < 90 ? 'text-amber-500' : 'text-emerald-600'}`}>{stats.safetyScore}</p>
          </div>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${stats.safetyScore < 90 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            <Activity className={`w-7 h-7 ${stats.safetyScore < 90 ? 'text-amber-600' : 'text-emerald-600'}`} />
          </div>
        </div>
      </div>
      
      {/* 2D Floorplan Live Map */}
      <div className="bg-[rgba(255,255,255,0.65)] backdrop-blur-2xl rounded-2xl border border-[rgba(255,255,255,0.8)] p-8 shadow-xl min-h-[600px] flex flex-col relative overflow-hidden">
         <div className="flex items-center justify-between mb-4 relative z-10">
           <h2 className="text-xl font-bold text-slate-800">Live Spatial Map & Tracking</h2>
           <div className="flex gap-4 text-xs font-bold">
             <span className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 rounded" /> Personnel</span>
             <span className="flex items-center gap-1"><div className="w-3 h-3 bg-cyan-500 rounded" /> Fleet (AMR/Forklift)</span>
             <span className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-500 rounded" /> Violation</span>
           </div>
         </div>
         
         {/* The Map Area */}
         <div className="flex-1 relative bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-800">
           {/* Background Image of Warehouse */}
           <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200" className="absolute inset-0 w-full h-full object-cover opacity-30" alt="Warehouse Map" />
           
           {/* Draw Keep-Out Zone Overlay (Bottom 50%) */}
           <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-rose-500/10 border-t-2 border-dashed border-rose-500/50 pointer-events-none flex items-start justify-center pt-2">
             <span className="bg-rose-500/20 text-rose-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
               <AlertTriangle className="w-3 h-3" />
               RESTRICTED: AUTOMATED MACHINERY ZONE
             </span>
           </div>

           {/* Draw Detections */}
           {boxes.map(box => (
             <div
               key={box.id}
               className="absolute transition-all duration-300 flex items-center justify-center shadow-lg"
               style={{
                 left: `${box.x}%`,
                 top: `${box.y}%`,
                 width: '24px', // fixed size marker on the map
                 height: '24px',
                 marginLeft: '-12px',
                 marginTop: '-12px',
                 backgroundColor: box.color,
                 borderRadius: box.label === 'PERSON' ? '50%' : '4px', // circle for people, square for machines
                 zIndex: box.isViolation ? 40 : 20
               }}
             >
               {box.isViolation && (
                 <div className="absolute -inset-2 bg-rose-500 rounded-full animate-ping opacity-75" />
               )}
               <span className="absolute -top-6 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                 {box.label}
               </span>
             </div>
           ))}
         </div>
      </div>

    </div>
  );
}
