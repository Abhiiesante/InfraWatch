import React from 'react';
import { Box, Activity, ShieldAlert, Cpu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function WarehouseDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['warehouse-metrics'],
    queryFn: async () => {
      // Mocked endpoint until Phase 2 API is ready
      return {
        activeAMRs: 12,
        zoneViolations: 3,
        rackUtilization: 84,
        safetyScore: 92
      };
    }
  });

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
        <button className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
          Configure Zones
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[rgba(255,255,255,0.65)] backdrop-blur-2xl rounded-2xl border border-[rgba(255,255,255,0.8)] p-6 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-600 font-bold mb-1">Active AMRs</p>
            <p className="text-4xl font-extrabold text-slate-900">{isLoading ? '-' : data?.activeAMRs}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center">
            <Cpu className="w-7 h-7 text-white" />
          </div>
        </div>

        <div className="bg-[rgba(255,255,255,0.65)] backdrop-blur-2xl rounded-2xl border border-[rgba(255,255,255,0.8)] p-6 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-600 font-bold mb-1">Zone Violations</p>
            <p className="text-4xl font-extrabold text-rose-600">{isLoading ? '-' : data?.zoneViolations}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-rose-600" />
          </div>
        </div>

        <div className="bg-[rgba(255,255,255,0.65)] backdrop-blur-2xl rounded-2xl border border-[rgba(255,255,255,0.8)] p-6 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-600 font-bold mb-1">Rack Utilization</p>
            <p className="text-4xl font-extrabold text-slate-900">{isLoading ? '-' : `${data?.rackUtilization}%`}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
            <Box className="w-7 h-7 text-indigo-600" />
          </div>
        </div>

        <div className="bg-[rgba(255,255,255,0.65)] backdrop-blur-2xl rounded-2xl border border-[rgba(255,255,255,0.8)] p-6 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-600 font-bold mb-1">Safety Score</p>
            <p className="text-4xl font-extrabold text-emerald-600">{isLoading ? '-' : data?.safetyScore}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <Activity className="w-7 h-7 text-emerald-600" />
          </div>
        </div>
      </div>
      
      {/* 2D Floorplan Mock */}
      <div className="bg-[rgba(255,255,255,0.65)] backdrop-blur-2xl rounded-2xl border border-[rgba(255,255,255,0.8)] p-8 shadow-xl min-h-[500px] flex items-center justify-center relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-10 grayscale"></div>
         <div className="relative z-10 text-center">
           <Cpu className="w-16 h-16 text-slate-400 mx-auto mb-4" />
           <h2 className="text-2xl font-bold text-slate-800 mb-2">Live Floorplan Tracking</h2>
           <p className="text-slate-600 max-w-md mx-auto">Connecting to logistics vision streams to populate AMR locations and zone boundaries...</p>
         </div>
      </div>

    </div>
  );
}
