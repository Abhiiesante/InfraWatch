import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2, Video, Camera, Search, Wifi, Check, Radio, Zap, Server } from 'lucide-react';
import { useCreateAsset } from '../api/useCreateAsset';
import { useAssetTypes } from '../api/useAssetTypes';
import { useCreateCamera } from '@/features/cameras/api/useCameras';
import { apiClient } from '@/lib/api';

interface DiscoveredCamera {
  id: string;
  name: string;
  ip: string;
  port: string;
  path: string;
  protocol: string;
  type: string;
  brand: string;
  profile: string;
  subnet: string;
}

export const AddAssetModal = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [enableCctv, setEnableCctv] = useState(false);
  const [useLocalWebcam, setUseLocalWebcam] = useState(false);

  // Multi-Subnet Auto-Scan State
  const [selectedSubnetRange, setSelectedSubnetRange] = useState('ALL');
  const [customIpInput, setCustomIpInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanningSubnetLabel, setScanningSubnetLabel] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [discoveredCameras, setDiscoveredCameras] = useState<DiscoveredCamera[]>([]);
  const [selectedDiscovered, setSelectedDiscovered] = useState<DiscoveredCamera | null>(null);

  // Form Fields State for Auto-Fill
  const [cctvProtocol, setCctvProtocol] = useState('rtsp://');
  const [cctvIp, setCctvIp] = useState('');
  const [cctvPort, setCctvPort] = useState('554');
  const [cctvPath, setCctvPath] = useState('/live/ch0');
  const [cameraType, setCameraType] = useState('360° DOME PTZ');

  const { mutateAsync: createAsset, isPending: isCreatingAsset } = useCreateAsset();
  const { mutateAsync: createCamera, isPending: isCreatingCamera } = useCreateCamera();
  const { data: assetTypesData } = useAssetTypes();
  const assetTypes = assetTypesData?.assetTypes || (Array.isArray(assetTypesData) ? assetTypesData : []);

  // STRICT CCTV HANDSHAKE & VERIFIED DEVICE SCANNER
  const handleAutoScanNetwork = async () => {
    setIsScanning(true);
    setScanProgress(20);
    setDiscoveredCameras([]);
    setScanningSubnetLabel('Sending ONVIF UDP Multicast Probe (239.255.255.250:3702) & RTSP Handshakes...');

    try {
      const realDiscovered: DiscoveredCamera[] = [];

      // 1. Detect Real Physical Optical Hardware Video Devices (Webcams / USB Video Capture)
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const mediaDevices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = mediaDevices.filter((d) => d.kind === 'videoinput');

          videoInputs.forEach((dev, idx) => {
            realDiscovered.push({
              id: `webcam-${dev.deviceId || idx}`,
              name: dev.label || `Integrated USB Optical Camera #${idx + 1}`,
              ip: '127.0.0.1',
              port: '8080',
              path: '/webcam',
              protocol: 'webcam://',
              type: 'Physical Hardware Optical Cam',
              brand: 'Local USB Video Input',
              profile: 'Direct Hardware Capture (0ms Latency)',
              subnet: '127.0.0.1 (USB Hardware)',
            });
          });
        }
      } catch (err) {
        console.warn('WebRTC Media Device enumeration:', err);
      }

      setScanProgress(60);
      setScanningSubnetLabel('Verifying RTSP / ONVIF protocol responses on local LAN subnets...');

      // 2. Query Backend Strict RTSP / ONVIF Verified Camera API
      try {
        let queryStr = '';
        if (selectedSubnetRange !== 'ALL' && selectedSubnetRange !== 'CUSTOM') {
          queryStr = `?targetSubnet=${encodeURIComponent(selectedSubnetRange)}`;
        } else if (selectedSubnetRange === 'CUSTOM' && customIpInput.includes('.')) {
          const prefix = customIpInput.trim().substring(0, customIpInput.trim().lastIndexOf('.'));
          if (prefix) queryStr = `?targetSubnet=${encodeURIComponent(prefix)}`;
        }

        const res = await apiClient.get(`/cameras/scan-network${queryStr}`);
        const verifiedNetworkCctvs = res.data?.devices || [];

        verifiedNetworkCctvs.forEach((dev: any, idx: number) => {
          const item = {
            id: `net-cctv-${idx}-${Date.now()}`,
            name: dev.name || `Device (${dev.ip})`,
            ip: dev.ip,
            port: String(dev.port),
            path: dev.substreamPath || '/cam/realmonitor?channel=1&subtype=0',
            protocol: dev.protocol || 'rtsp://',
            type: dev.isVerifiedCctv ? '🔥 Verified Real CCTV' : '💻 LAN PC / Host',
            brand: dev.brand || (dev.isVerifiedCctv ? 'Verified CCTV Hardware' : 'Network PC Host'),
            profile: `Protocol: ${dev.protocol} • Subnet: ${dev.subnet}`,
            subnet: dev.subnet,
            isVerifiedCctv: dev.isVerifiedCctv,
          };

          if (dev.isVerifiedCctv) {
            realDiscovered.unshift(item);
          } else {
            realDiscovered.push(item);
          }
        });
      } catch (err) {
        console.warn('Network CCTV scan error:', err);
      }

      // 3. User Custom Target Host Override
      if (customIpInput.trim()) {
        const customIp = customIpInput.trim();
        realDiscovered.unshift({
          id: `custom-ip-${Date.now()}`,
          name: `User Configured CCTV Target (${customIp})`,
          ip: customIp,
          port: cctvPort || '554',
          path: cctvPath || '/live/ch0',
          protocol: cctvProtocol || 'rtsp://',
          type: 'Manual Network Endpoint',
          brand: 'Custom User Target',
          profile: 'Direct User Configured Host',
          subnet: `${customIp} (Manual Input)`,
        });
      }

      setScanProgress(100);
      setDiscoveredCameras(realDiscovered);
    } catch (error) {
      console.error('Scan error:', error);
    } finally {
      setIsScanning(false);
      setScanningSubnetLabel('');
    }
  };

  const handleSelectDiscovered = (cam: DiscoveredCamera) => {
    setSelectedDiscovered(cam);
    if (cam.protocol === 'webcam://') {
      setUseLocalWebcam(true);
    } else {
      setUseLocalWebcam(false);
      setCctvProtocol(cam.protocol);
      setCctvIp(cam.ip);
      setCctvPort(cam.port);
      setCctvPath(cam.path);
      setCameraType(cam.type);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const assetData = {
      name: formData.get('name') as string,
      assetTypeId: parseInt(formData.get('assetTypeId') as string, 10),
      description: formData.get('description') as string,
      address: formData.get('address') as string,
    };

    try {
      // 1. Create Physical Asset
      const newAsset = await createAsset(assetData);
      const createdAssetId = newAsset?.id || newAsset?.data?.id;

      // 2. If Local CCTV is enabled, register camera feed linked to asset
      if (enableCctv && createdAssetId) {
        const protocol = cctvProtocol;
        const ip = cctvIp || '192.168.1.100';
        const port = cctvPort || '554';
        const path = cctvPath || '/live/ch0';
        const user = formData.get('cctvUser') as string;
        const pass = formData.get('cctvPass') as string;

        let constructedRtsp = '';
        if (useLocalWebcam) {
          constructedRtsp = 'webcam://local';
        } else if (user && pass) {
          constructedRtsp = `${protocol}${user}:${pass}@${ip}:${port}${path}`;
        } else {
          constructedRtsp = `${protocol}${ip}:${port}${path}`;
        }

        try {
          await createCamera({
            name: selectedDiscovered ? selectedDiscovered.name : `${assetData.name} CCTV Cam`,
            assetId: createdAssetId,
            cameraType: cameraType,
            rtspUrl: constructedRtsp,
            ipAddress: ip,
          });
        } catch (camError) {
          console.warn('CCTV association warning (Asset created successfully):', camError);
        }
      }

      setOpen(false);
      setEnableCctv(false);
      setUseLocalWebcam(false);
      setDiscoveredCameras([]);
      setSelectedDiscovered(null);
    } catch (error) {
      console.error('Failed to create asset with CCTV connection:', error);
      alert('Failed to register asset. See console for details.');
    }
  };

  const isPending = isCreatingAsset || isCreatingCamera;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {children}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out">
          <div className="flex flex-col space-y-1.5">
            <Dialog.Title className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Add New Physical Asset
            </Dialog.Title>
            <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
              Register a physical infrastructure asset and auto-detect CCTV cameras across all subnets.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            {/* Section 1: Basic Asset Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                1. Asset Facility Parameters
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="asset-name" className="text-xs font-bold text-slate-700 dark:text-slate-300">Asset Name *</label>
                  <input required id="asset-name" name="name" className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 text-sm font-medium" placeholder="e.g. Tower Alpha-01" />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="assetTypeId" className="text-xs font-bold text-slate-700 dark:text-slate-300">Asset Type *</label>
                  <select required id="assetTypeId" name="assetTypeId" className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 text-sm font-medium">
                    <option value="">Select a type...</option>
                    {assetTypes?.map((type: any) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="address" className="text-xs font-bold text-slate-700 dark:text-slate-300">Location / Address</label>
                <input id="address" name="address" className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 text-sm font-medium" placeholder="e.g. 123 Industrial Parkway, Zone 4" />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="description" className="text-xs font-bold text-slate-700 dark:text-slate-300">Description (Optional)</label>
                <textarea id="description" name="description" rows={2} className="flex w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm font-medium resize-y" placeholder="Facility specs, capacity, or operational notes..." />
              </div>
            </div>

            {/* Section 2: Local CCTV / IP Camera Connection Settings */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Video className="w-4 h-4" />
                  2. Multi-Subnet CCTV & IP Camera Auto-Detector
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={enableCctv} onChange={e => setEnableCctv(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300">Configure CCTV Feed</span>
                </label>
              </div>

              {enableCctv && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in">
                  
                  {/* MULTI-SUBNET IP RANGE AUTO-DETECTOR BANNER */}
                  <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-4 rounded-2xl border border-indigo-500/30 flex flex-col space-y-3.5 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                        <div>
                          <span className="text-xs font-extrabold text-white block">Multi-Subnet ONVIF IP Scanner</span>
                          <span className="text-[10px] text-slate-400 font-mono">Scans all private CIDR blocks (192.168.x.x, 10.x.x.x, 172.16.x.x)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={selectedSubnetRange}
                          onChange={e => setSelectedSubnetRange(e.target.value)}
                          className="h-8 text-[11px] font-mono bg-black/60 text-cyan-300 border border-cyan-500/30 rounded-lg px-2"
                        >
                          <option value="ALL">🌐 ALL Network Subnets</option>
                          <option value="192.168.1">192.168.1.0/24 (Office Subnet)</option>
                          <option value="192.168.10">192.168.10.0/24 (Security NVR)</option>
                          <option value="10.0.0">10.0.0.0/24 (Enterprise Core)</option>
                          <option value="CUSTOM">Custom IP / Hostname...</option>
                        </select>

                        <button
                          type="button"
                          onClick={handleAutoScanNetwork}
                          disabled={isScanning}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-md flex items-center gap-1.5 transition-all whitespace-nowrap"
                        >
                          {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                          {isScanning ? `Scanning...` : 'Scan ALL IP Ranges'}
                        </button>
                      </div>
                    </div>

                    {/* Custom IP Entry Field */}
                    {selectedSubnetRange === 'CUSTOM' && (
                      <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                        <input
                          value={customIpInput}
                          onChange={e => setCustomIpInput(e.target.value)}
                          placeholder="Type custom CCTV IP or hostname (e.g. 192.168.4.150 or cctv-west.local)"
                          className="h-8 w-full bg-black/60 border border-white/20 rounded-lg px-3 text-xs font-mono text-white placeholder:text-slate-500"
                        />
                      </div>
                    )}

                    {/* Active Scanning Status Bar */}
                    {isScanning && (
                      <div className="space-y-1.5 pt-1 animate-in fade-in">
                        <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                          <span>{scanningSubnetLabel}</span>
                          <span>{scanProgress}%</span>
                        </div>
                        <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Discovered Cameras Cards Across All Subnets */}
                    {discoveredCameras.length > 0 && (
                      <div className="space-y-2 pt-2 animate-in fade-in">
                        <span className="text-[11px] font-mono text-cyan-300 font-bold flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5" />
                          DISCOVERED {discoveredCameras.length} CCTV DEVICES ACROSS SUBNETS:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                          {discoveredCameras.map((cam) => {
                            const isSelected = selectedDiscovered?.id === cam.id;
                            return (
                              <div
                                key={cam.id}
                                onClick={() => handleSelectDiscovered(cam)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                                  isSelected
                                    ? 'bg-indigo-600/40 border-cyan-400 text-white shadow-lg ring-1 ring-cyan-400'
                                    : 'bg-black/40 border-white/10 text-slate-300 hover:border-indigo-400'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-bold">{cam.name}</span>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                                </div>
                                <div className="mt-2 text-[10px] font-mono flex items-center justify-between text-slate-400">
                                  <span className="text-cyan-300 font-bold">{cam.ip}:{cam.port}</span>
                                  <span className="bg-indigo-950/80 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-700 text-[9px] font-bold">{cam.subnet}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Local Laptop Webcam Switch */}
                  <div className="flex items-center justify-between bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Auto-Connect Local Laptop Webcam</span>
                    </div>
                    <input type="checkbox" checked={useLocalWebcam} onChange={e => setUseLocalWebcam(e.target.checked)} className="w-4 h-4 accent-emerald-600 rounded cursor-pointer" />
                  </div>

                  {!useLocalWebcam && (
                    <>
                      {/* Indian CCTV Brand Preset Selector */}
                      <div className="space-y-1 bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/20">
                        <label className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                          🇮🇳 Select Indian CCTV Brand Preset:
                        </label>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'CP_PLUS') { setCctvPort('554'); setCctvPath('/cam/realmonitor?channel=1&subtype=0'); setCctvProtocol('rtsp://'); }
                            else if (val === 'PRAMA') { setCctvPort('554'); setCctvPath('/Streaming/Channels/101'); setCctvProtocol('rtsp://'); }
                            else if (val === 'SPARSH') { setCctvPort('554'); setCctvPath('/live/ch0'); setCctvProtocol('rtsp://'); }
                            else if (val === 'QUBO') { setCctvPort('554'); setCctvPath('/onvif1'); setCctvProtocol('rtsp://'); }
                            else if (val === 'GODREJ') { setCctvPort('554'); setCctvPath('/h264_stream'); setCctvProtocol('rtsp://'); }
                            else if (val === 'ZEBRONICS') { setCctvPort('554'); setCctvPath('/h264_stream'); setCctvProtocol('rtsp://'); }
                            else if (val === 'TRUEVIEW') { setCctvPort('554'); setCctvPath('/live/ch0'); setCctvProtocol('rtsp://'); }
                            else if (val === 'SECUREYE') { setCctvPort('554'); setCctvPath('/live/ch0'); setCctvProtocol('rtsp://'); }
                            else if (val === 'HIFOCUS') { setCctvPort('554'); setCctvPath('/cam/realmonitor?channel=1&subtype=0'); setCctvProtocol('rtsp://'); }
                          }}
                          className="flex h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-mono text-cyan-300 font-bold"
                        >
                          <option value="CP_PLUS">CP Plus IP Camera (India #1 - /cam/realmonitor)</option>
                          <option value="PRAMA">Prama India STQC Certified (/Streaming/Channels/101)</option>
                          <option value="SPARSH">Sparsh Govt Certified CCTV (/live/ch0)</option>
                          <option value="QUBO">Qubo Smart AI Camera - Hero Electronix (/onvif1)</option>
                          <option value="GODREJ">Godrej Security Systems (/h264_stream)</option>
                          <option value="ZEBRONICS">Zebronics Smart Security (/h264_stream)</option>
                          <option value="TRUEVIEW">Trueview HD CCTV (/live/ch0)</option>
                          <option value="SECUREYE">Secureye Surveillance (/live/ch0)</option>
                          <option value="HIFOCUS">HiFocus Enterprise CCTV (/cam/realmonitor)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">CCTV Protocol</label>
                          <select value={cctvProtocol} onChange={e => setCctvProtocol(e.target.value)} name="cctvProtocol" className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono">
                            <option value="rtsp://">RTSP (Standard CCTV)</option>
                            <option value="http://">HTTP / HLS (.m3u8)</option>
                            <option value="https://">HTTPS Secure Stream</option>
                          </select>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Camera IP / Hostname *</label>
                          <input value={cctvIp} onChange={e => setCctvIp(e.target.value)} name="cctvIp" className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono" placeholder="10.205.30.20 or cctv.local" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">RTSP Port</label>
                          <input value={cctvPort} onChange={e => setCctvPort(e.target.value)} name="cctvPort" className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono" placeholder="554 (Default RTSP)" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Substream / Stream Path</label>
                          <input value={cctvPath} onChange={e => setCctvPath(e.target.value)} name="cctvPath" className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono" placeholder="/live/ch0 or /h264Preview_01" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">CCTV Username</label>
                          <input name="cctvUser" className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono" placeholder="admin" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">CCTV Password</label>
                          <input type="password" name="cctvPass" className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono" placeholder="••••••••" />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Hardware Optics Type</label>
                    <select value={cameraType} onChange={e => setCameraType(e.target.value)} name="cameraType" className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium">
                      <option value="360° DOME PTZ">360° Dome PTZ Panorama</option>
                      <option value="PTZ 4K Structural">PTZ 4K Structural</option>
                      <option value="Optical Strain HD">Optical Strain HD</option>
                      <option value="THERMAL INFRARED">Thermal Infrared</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Dialog.Close asChild>
                <button type="button" className="mt-2 sm:mt-0 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button disabled={isPending} type="submit" className="px-8 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {isPending ? 'Connecting...' : 'Create Asset & Auto-Connect CCTV'}
              </button>
            </div>
          </form>

          <Dialog.Close className="absolute right-6 top-6 rounded-full p-1 opacity-70 transition-all hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5 text-slate-500" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
