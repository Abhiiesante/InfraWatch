import React, { useState } from 'react';
import { useAssets, Asset } from '@/features/assets/api/useAssets';
import { useSatelliteTelemetry } from '@/features/telemetry/api/useTelemetry';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, CloudSun, Wind, Thermometer, Sun, RefreshCw } from 'lucide-react';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export const DigitalTwinMapPage: React.FC = () => {
  const { data: assetsData, refetch } = useAssets({ skip: 0, take: 50 });
  const assets = assetsData?.assets || [];

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [mapTile, setMapTile] = useState<'STANDARD' | 'DARK' | 'SATELLITE'>('STANDARD');

  const { data: satelliteData } = useSatelliteTelemetry(selectedAsset?.id);

  const centerLat = selectedAsset?.latitude ? Number(selectedAsset.latitude) : 20.5937;
  const centerLng = selectedAsset?.longitude ? Number(selectedAsset.longitude) : 78.9629;

  const tileUrls = {
    STANDARD: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    SATELLITE: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Navigation className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">GIS Digital Twin & Real Map Visualizer</h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Real-world OpenStreetMap interactive tiles displaying real facility nodes and live satellite telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className="w-4 h-4" /> Refresh GIS Feed
          </button>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['STANDARD', 'DARK', 'SATELLITE'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setMapTile(mode)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mapTile === mode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Map Visualizer Container */}
      <div className="relative h-[650px] bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex">
        {/* Real Leaflet Map */}
        <div className="flex-1 h-full w-full z-0">
          <MapContainer
            center={[centerLat, centerLng]}
            zoom={4}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={tileUrls[mapTile]}
            />
            {assets.map((asset) => {
              const lat = asset.latitude ? Number(asset.latitude) : 40.7128;
              const lng = asset.longitude ? Number(asset.longitude) : -74.0060;

              return (
                <Marker
                  key={asset.id}
                  position={[lat, lng]}
                  eventHandlers={{
                    click: () => setSelectedAsset(asset),
                  }}
                >
                  <Popup>
                    <div className="p-2 space-y-1">
                      <p className="font-bold text-slate-900 text-sm">{asset.name}</p>
                      <p className="text-xs text-slate-600">{asset.address}</p>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">
                        Health: {asset.healthScore ?? 100}%
                      </span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Selected Asset Details Drawer */}
        {selectedAsset && (
          <div className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col justify-between z-20 space-y-4 shadow-lg">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Facility GIS Details</span>
                <button onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-slate-900 font-bold">
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{selectedAsset.name}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{selectedAsset.address}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Health Index</span>
                  <span className="text-sm font-black text-emerald-600">{selectedAsset.healthScore ?? 100}%</span>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">GPS Latitude</span>
                    <span className="font-bold text-slate-900">{selectedAsset.latitude}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">GPS Longitude</span>
                    <span className="font-bold text-slate-900">{selectedAsset.longitude}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Asset Type</span>
                    <span className="font-bold text-indigo-600">{selectedAsset.assetType?.name || 'Facility'}</span>
                  </div>
                </div>

                {/* Real Live Satellite Data Section */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                      <CloudSun className="w-4 h-4 text-indigo-600 animate-pulse" /> Real Satellite Telemetry
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      LIVE
                    </span>
                  </div>

                  {satelliteData ? (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600 flex items-center gap-1"><Thermometer className="w-3.5 h-3.5 text-rose-600" /> Temperature:</span>
                        <span className="font-bold text-slate-900">{satelliteData.temperatureC} °C</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 flex items-center gap-1"><Wind className="w-3.5 h-3.5 text-cyan-600" /> Wind Speed:</span>
                        <span className="font-bold text-slate-900">{satelliteData.windSpeedKmH} km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-amber-600" /> Solar Irradiance:</span>
                        <span className="font-bold text-slate-900">{satelliteData.solarIrradianceWm2} W/m²</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 text-[11px]">
                        <span className="text-slate-600">Sky Condition:</span>
                        <span className="font-extrabold text-indigo-700">{satelliteData.weatherCondition}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-slate-500 text-xs font-medium">Loading live satellite metrics...</div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => (window.location.href = `/assets/${selectedAsset.id}`)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all text-center"
            >
              Open Full Facility View →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
