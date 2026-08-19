import { useState, useEffect, useRef } from 'react';
import { useCameras, useCreateCamera, useDeleteCamera } from '../api/useCameras';
import { useAssets } from '@/features/assets/api/useAssets';
import { apiClient } from '@/lib/api';
import {
  Video, Plus, Loader2, X, Wifi, Trash2, Eye, Play, Pause, Maximize2, Radio,
  Shield, Move, ZoomIn, ZoomOut, Flame, RotateCcw, Compass, Camera as CameraIcon,
  Globe, Settings, Smartphone, Sparkles, Copy, Check, Radar, Scan, Search,
  RefreshCw, CheckCircle2, ShieldCheck, Server, Key, Network, Download,
  Layers, Grid3X3, Grid2X2, Square, Activity, Sliders, AlertTriangle
} from 'lucide-react';
import { CameraManagementModal } from '../components/CameraManagementModal';
import { format } from 'date-fns';
import Hls from 'hls.js';
import { io } from 'socket.io-client';

const socket = io(window.location.origin, { path: '/socket.io', transports: ['websocket'] });

interface DetectionBox {
  id: string | number;
  label: string;
  conf: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

// ============================================================================
// REAL-TIME ROBOFLOW COMPUTER VISION BOUNDING BOX OVERLAY
// ============================================================================
const LiveRoboflowTracker = ({
  isPlaying,
  minConfidence = 30
}: {
  isPlaying: boolean;
  minConfidence?: number;
}) => {
  const [boxes, setBoxes] = useState<DetectionBox[]>([]);
  const [modelId, setModelId] = useState<string>('coco/3');

  useEffect(() => {
    if (!isPlaying) return;

    const handleDetections = (data: any) => {
      if (data && typeof data === 'object' && 'boxes' in data) {
        setBoxes(data.boxes || []);
        if (data.model) setModelId(data.model);
      } else if (Array.isArray(data)) {
        setBoxes(data);
      }
    };

    socket.on('cv-detections', handleDetections);
    return () => {
      socket.off('cv-detections', handleDetections);
    };
  }, [isPlaying]);

  if (!isPlaying) return null;

  const filteredBoxes = boxes.filter(b => (b.conf || 80) >= minConfidence);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      {/* Top AI Telemetry Ribbon */}
      <div className="absolute top-2 left-2 z-30 bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold px-2.5 py-1 rounded shadow-lg flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>MODEL: {modelId.toUpperCase()}</span>
        <span className="text-slate-500">|</span>
        <span className="text-emerald-400">OBJECTS: {filteredBoxes.length}</span>
      </div>

      {filteredBoxes.map((box, idx) => (
        <div
          key={box.id || idx}
          className="absolute border-[2px] transition-all duration-100 ease-out"
          style={{
            left: `${box.x}%`,
            top: `${box.y}%`,
            width: `${box.w}%`,
            height: `${box.h}%`,
            borderColor: box.color || '#00F2FE',
            boxShadow: `0 0 8px ${box.color || '#00F2FE'}60`,
          }}
        >
          {/* Label Badge */}
          <div
            className="absolute -top-5 left-[-2px] text-slate-950 text-[11px] font-black px-1.5 py-0.5 whitespace-nowrap tracking-wide shadow-md uppercase"
            style={{ backgroundColor: box.color || '#00F2FE' }}
          >
            {box.label} {box.conf}%
          </div>

          {/* Precision Crosshairs */}
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: box.color || '#00F2FE' }} />
          <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: box.color || '#00F2FE' }} />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2" style={{ borderColor: box.color || '#00F2FE' }} />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2" style={{ borderColor: box.color || '#00F2FE' }} />
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// ENTERPRISE HLS / RTSP / MP4 VIDEO PLAYER
// ============================================================================
const VideoStreamPlayer = ({
  src,
  className,
  style,
  poster,
  onVideoRef
}: {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  poster?: string;
  onVideoRef?: (el: HTMLVideoElement | null) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (onVideoRef) onVideoRef(video);

    video.defaultMuted = true;
    video.muted = true;

    if (src.endsWith('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        return () => hls.destroy();
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.play().catch(() => {});
      }
    } else {
      video.src = src;
      video.load();
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    }
  }, [src]);

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      poster={poster}
      className={className}
      style={style}
    />
  );
};

// ============================================================================
// MAIN CAMERAS & CCTV SURVEILLANCE SUITE
// ============================================================================
export const CamerasListPage = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [cameraToEdit, setCameraToEdit] = useState<any | null>(null);
  const [activeStreamCamera, setActiveStreamCamera] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'grid2x2' | 'grid3x3' | 'fleet'>('fleet');
  const [thermalFilter, setThermalFilter] = useState(false);
  const [aiOverlay, setAiOverlay] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [useWebcam, setUseWebcam] = useState(false);
  const [liveClock, setLiveClock] = useState(new Date());
  const [minConfidence, setMinConfidence] = useState(40);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // PTZ State
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number } | null>(null);

  // DOM Refs
  const activeVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Wireless Mobile Camera Modal State
  const [showWirelessModal, setShowWirelessModal] = useState(false);
  const [wirelessPin, setWirelessPin] = useState('');
  const [isPairingWireless, setIsPairingWireless] = useState(false);
  const [wirelessError, setWirelessError] = useState('');

  // Radar Scanner State
  const [showRadarModal, setShowRadarModal] = useState(false);
  const [isScanningNetwork, setIsScanningNetwork] = useState(false);
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [customSubnetInput, setCustomSubnetInput] = useState('');
  const [isAutoProvisioning, setIsAutoProvisioning] = useState(false);
  const [autoProvisionSuccessMsg, setAutoProvisionSuccessMsg] = useState('');

  const { data, isLoading, refetch: refetchCameras } = useCameras({ skip: 0, take: 50 });
  const { data: assetsData } = useAssets({ skip: 0, take: 100 });
  const { mutateAsync: deleteCamera } = useDeleteCamera();

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setLiveClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Recording timer
  useEffect(() => {
    let recTimer: any;
    if (isRecording) {
      recTimer = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(recTimer);
  }, [isRecording]);

  // Handle local webcam activation
  useEffect(() => {
    if (useWebcam) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          webcamStreamRef.current = stream;
          if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = stream;
            webcamVideoRef.current.muted = true;
            webcamVideoRef.current.play().catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('Webcam access unavailable:', err);
          setUseWebcam(false);
        });
    } else {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
        webcamStreamRef.current = null;
      }
    }
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [useWebcam]);

  // Resolve authentic stream URL for camera
  const getCameraStreamUrl = (camera: any): string => {
    if (camera.config?.streamUrl) return camera.config.streamUrl;
    if (camera.rtspUrl && (camera.rtspUrl.startsWith('rtsp://') || camera.rtspUrl.startsWith('rtsps://'))) {
      const baseUrl = (import.meta as any).env.VITE_API_URL || '/api';
      return `${baseUrl}/cameras/${camera.id}/live-stream`;
    }
    return 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8';
  };

  // 1-Click High-Res Frame Snapshot
  const handleCaptureSnapshot = () => {
    const video = activeVideoElementRef.current || webcamVideoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Render security timestamp watermark
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(20, canvas.height - 70, 600, 50);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#22d3ee';
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS') + ' UTC';
    const camInfo = `${activeStreamCamera?.name || 'CCTV-STREAM'} [ID #${activeStreamCamera?.id || 1}]`;
    ctx.fillText(`${camInfo} | ${timestamp}`, 35, canvas.height - 38);

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `InfraWatch_Snapshot_${activeStreamCamera?.name || 'Camera'}_${Date.now()}.png`;
    a.click();
  };

  // 1-Click Video Recording
  const handleToggleRecording = () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      const video = activeVideoElementRef.current || webcamVideoRef.current;
      if (!video) return;

      try {
        let stream: MediaStream;
        if (useWebcam && webcamStreamRef.current) {
          stream = webcamStreamRef.current;
        } else if ((video as any).captureStream) {
          stream = (video as any).captureStream(30);
        } else if ((video as any).mozCaptureStream) {
          stream = (video as any).mozCaptureStream(30);
        } else {
          alert('Stream recording is supported on Chrome, Edge, and Firefox.');
          return;
        }

        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `InfraWatch_Clip_${activeStreamCamera?.name || 'Camera'}_${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error('Recording initialization failed:', err);
      }
    }
  };

  // PTZ Control Presets
  const applyPtzPreset = (panXVal: number, panYVal: number, zoomVal: number) => {
    setPanX(panXVal);
    setPanY(panYVal);
    setZoom(zoomVal);
  };

  const resetPTZ = () => {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, startPanX: panX, startPanY: panY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const deltaX = (e.clientX - dragStartRef.current.x) * 0.15;
    const deltaY = (e.clientY - dragStartRef.current.y) * 0.15;
    setPanX(Math.max(-40, Math.min(40, dragStartRef.current.startPanX + deltaX)));
    setPanY(Math.max(-30, Math.min(30, dragStartRef.current.startPanY - deltaY)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Auto-Provisioning Call
  const handleAutoProvisionAll = async () => {
    setIsAutoProvisioning(true);
    setAutoProvisionSuccessMsg('');
    try {
      const res = await apiClient.post('/cameras/auto-provision');
      if (res.data?.success) {
        setAutoProvisionSuccessMsg(res.data.message || 'All local CCTV cameras auto-provisioned!');
        refetchCameras();
        if (res.data.cameras?.length > 0) {
          const first = res.data.cameras[0];
          setActiveStreamCamera(first);
          resetPTZ();
        }
      }
    } catch (err: any) {
      console.error('Auto provision failed:', err);
    } finally {
      setIsAutoProvisioning(false);
    }
  };

  // Network Scan
  const triggerNetworkScan = async (subnet?: string) => {
    setIsScanningNetwork(true);
    try {
      const url = subnet ? `/cameras/scan-network?targetSubnet=${encodeURIComponent(subnet)}` : '/cameras/scan-network';
      const res = await apiClient.get(url);
      if (res.data?.devices) {
        setScanResults(res.data.devices);
      }
    } catch (err) {
      console.error('Network scan failed:', err);
    } finally {
      setIsScanningNetwork(false);
    }
  };

  const handleDeleteCamera = async (id: number) => {
    if (window.confirm('Are you sure you want to remove this camera?')) {
      try {
        await deleteCamera(id);
        refetchCameras();
      } catch (error) {
        console.error('Failed to delete camera:', error);
      }
    }
  };

  const broadcastUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:5173/cam-broadcast`
    : 'http://localhost:5173/cam-broadcast';

  const camerasList = data?.cameras || [];

  return (
    <div className="p-6 md:p-8 max-w-[1700px] mx-auto space-y-8 w-full animate-in fade-in pb-24 text-slate-100">
      <canvas ref={hiddenCanvasRef} className="hidden" />

      {/* Top Command Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                CCTV Surveillance & Optical Matrix
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  VMS V2.4
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Live multi-channel optical monitoring, Roboflow AI inference & PTZ telemetry
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Matrix Selector & Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Matrix View Toggles */}
          <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setViewMode('fleet')}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'fleet' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Fleet Overview"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Fleet</span>
            </button>
            <button
              onClick={() => setViewMode('grid2x2')}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'grid2x2' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="2x2 Quad Matrix"
            >
              <Grid2X2 className="w-4 h-4" />
              <span className="hidden sm:inline">2x2 Quad</span>
            </button>
            <button
              onClick={() => setViewMode('grid3x3')}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'grid3x3' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="3x3 Surveillance Matrix"
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">3x3 Matrix</span>
            </button>
          </div>

          {/* 1-Click Auto-Provision Button */}
          <button
            onClick={handleAutoProvisionAll}
            disabled={isAutoProvisioning}
            className="px-4 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isAutoProvisioning ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <Sparkles className="w-4 h-4" />}
            <span>Auto-Connect All</span>
          </button>

          {/* Network Radar Scanner */}
          <button
            onClick={() => {
              setShowRadarModal(true);
              triggerNetworkScan();
            }}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-2"
          >
            <Radar className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Radar Scanner</span>
          </button>

          {/* Register Camera */}
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Camera</span>
          </button>
        </div>
      </div>

      {/* Auto Provision Alert Feedback */}
      {autoProvisionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{autoProvisionSuccessMsg}</span>
          </div>
          <button onClick={() => setAutoProvisionSuccessMsg('')} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MULTI-VIEW SECURITY MATRIX MODES (2x2 / 3x3) */}
      {/* ========================================================================= */}
      {viewMode === 'grid2x2' || viewMode === 'grid3x3' ? (
        <div className={`grid gap-4 ${viewMode === 'grid2x2' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {camerasList.slice(0, viewMode === 'grid2x2' ? 4 : 9).map((camera: any, idx: number) => {
            const streamUrl = getCameraStreamUrl(camera);

            return (
              <div
                key={camera.id}
                onClick={() => {
                  setActiveStreamCamera(camera);
                  resetPTZ();
                }}
                className="group relative bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-3xl overflow-hidden shadow-xl aspect-video cursor-pointer transition-all duration-300 flex flex-col justify-between"
              >
                {/* Live Stream Viewport */}
                <div className="absolute inset-0 bg-black">
                  <VideoStreamPlayer
                    src={streamUrl}
                    className="w-full h-full object-cover"
                  />
                  {aiOverlay && <LiveRoboflowTracker isPlaying={true} minConfidence={minConfidence} />}
                </div>

                {/* Top Info Bar */}
                <div className="relative z-20 p-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent text-white pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-black tracking-tight">{camera.name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-white/20">
                    CH-0{idx + 1}
                  </span>
                </div>

                {/* Bottom Telemetry HUD */}
                <div className="relative z-20 p-3 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent text-[10px] font-mono text-slate-300 pointer-events-none">
                  <span>{camera.ipAddress || 'DHCP'}</span>
                  <span className="text-cyan-400">1080p • 30 FPS</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* FLEET OVERVIEW GRID (Cards with Full Metadata & Controls) */}
      {/* ========================================================================= */}
      {viewMode === 'fleet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center p-24">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            </div>
          ) : camerasList.length === 0 ? (
            <div className="col-span-full p-16 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
              <CameraIcon className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Surveillance Cameras Registered</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click "Add Camera" or "Auto-Connect All" to scan the local network and stream live CCTV video.
              </p>
            </div>
          ) : (
            camerasList.map((camera: any) => {
              const streamUrl = getCameraStreamUrl(camera);

              return (
                <div
                  key={camera.id}
                  className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col group hover:-translate-y-1"
                >
                  {/* Visual Stream Window */}
                  <div
                    onClick={() => {
                      setActiveStreamCamera(camera);
                      resetPTZ();
                    }}
                    className="relative aspect-video bg-black overflow-hidden cursor-pointer"
                  >
                    <VideoStreamPlayer
                      src={streamUrl}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                    />

                    {/* Status Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-black/70 backdrop-blur-md text-white border border-white/20 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${camera.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                        {camera.status || 'ONLINE'}
                      </span>
                      <span className="px-2 py-1 rounded bg-black/70 font-mono text-[10px] text-cyan-300 border border-white/10">
                        {format(liveClock, 'HH:mm:ss')} UTC
                      </span>
                    </div>

                    {/* Hover Play Button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="p-3 rounded-full bg-cyan-500 text-slate-950 shadow-xl">
                        <Play className="w-6 h-6 fill-current" />
                      </div>
                    </div>
                  </div>

                  {/* Card Metadata */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-base text-white tracking-tight">
                          {camera.name}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                          ID #{camera.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        {camera.asset?.name || 'Primary Facility Asset'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono pt-2 border-t border-slate-800">
                      <span>Type: <strong className="text-slate-200">{camera.cameraType || 'FIXED'}</strong></span>
                      <span>•</span>
                      <span>IP: <strong className="text-cyan-300">{camera.ipAddress || 'DHCP'}</strong></span>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActiveStreamCamera(camera);
                          resetPTZ();
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Launch Stream
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCameraToEdit(camera)}
                          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Edit Camera"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCamera(camera.id)}
                          className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                          title="Remove Camera"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ENTERPRISE PTZ & LIVE AI INSPECTION MODAL */}
      {/* ========================================================================= */}
      {activeStreamCamera && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    {activeStreamCamera.name}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {useWebcam ? 'LOCAL HARDWARE WEBCAM' : 'RTSP / HLS LIVE STREAM'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {activeStreamCamera.rtspUrl || activeStreamCamera.ipAddress} • {activeStreamCamera.asset?.name || 'Infrastructure Facility'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveStreamCamera(null);
                  setUseWebcam(false);
                }}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Video Viewport Canvas */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`relative bg-black flex items-center justify-center overflow-hidden aspect-video select-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              <div className="w-full h-full absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none">
                {useWebcam ? (
                  <video
                    ref={webcamVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      transform: `scale(${zoom}) translate(${panX}%, ${panY}%)`,
                    }}
                    className={`w-full h-full object-cover transition-transform duration-75 ${
                      thermalFilter ? 'invert hue-rotate-180 contrast-200 brightness-110' : ''
                    }`}
                  />
                ) : (
                  <VideoStreamPlayer
                    src={getCameraStreamUrl(activeStreamCamera)}
                    onVideoRef={(el) => { activeVideoElementRef.current = el; }}
                    style={{
                      width: '140%',
                      height: '140%',
                      transform: `scale(${zoom}) translate(${panX}%, ${panY}%)`,
                    }}
                    className={`w-full h-full object-cover transition-transform duration-75 ${
                      thermalFilter ? 'invert hue-rotate-180 contrast-200 brightness-110' : ''
                    }`}
                  />
                )}
              </div>

              {/* AI Bounding Box Tracker Overlay */}
              <div
                className="absolute w-full h-full pointer-events-none z-20"
                style={{
                  width: '140%',
                  height: '140%',
                  transform: `scale(${zoom}) translate(${panX}%, ${panY}%)`,
                }}
              >
                {aiOverlay && <LiveRoboflowTracker isPlaying={isPlaying} minConfidence={minConfidence} />}
              </div>

              {/* Top HUD Display */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs font-mono font-bold pointer-events-none z-30">
                <div className="bg-slate-950/80 text-emerald-400 px-3.5 py-1.5 rounded-full border border-emerald-500/40 backdrop-blur-md flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-rose-500 animate-ping' : 'bg-amber-400'}`} />
                  <span>{isPlaying ? 'LIVE ⏺ 30.0 FPS' : 'PAUSED'}</span>
                  {isRecording && (
                    <span className="text-rose-400 font-black ml-2 animate-pulse">
                      REC [{recordingSeconds}s]
                    </span>
                  )}
                </div>

                <div className="bg-slate-950/80 text-slate-200 px-4 py-1.5 rounded-full border border-slate-700 backdrop-blur-md flex items-center gap-3">
                  <span className="text-cyan-400 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    PAN: {panX.toFixed(0)}° • TILT: {panY.toFixed(0)}° • ZOOM: {zoom.toFixed(1)}x
                  </span>
                  <span className="text-slate-500">|</span>
                  <span>{format(liveClock, 'yyyy-MM-dd HH:mm:ss')}</span>
                </div>
              </div>

              {/* Pan Prompt */}
              <div className="absolute bottom-4 left-4 bg-slate-950/80 text-slate-300 text-[11px] font-semibold px-3 py-1 rounded-full border border-slate-700 backdrop-blur-sm pointer-events-none flex items-center gap-1.5 z-30">
                <Move className="w-3 h-3 text-cyan-400" /> Click & Drag viewport to pan & tilt PTZ optical lens
              </div>
            </div>

            {/* Modal Controls Bar */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
              {/* Playback & View Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isPlaying ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-emerald-500 text-slate-950 font-black'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause' : 'Resume'}
                </button>

                <button
                  onClick={() => setUseWebcam(!useWebcam)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    useWebcam ? 'bg-cyan-500 text-slate-950 font-black shadow-lg' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                  }`}
                >
                  <CameraIcon className="w-4 h-4" /> {useWebcam ? 'Webcam Active' : 'Use PC Webcam'}
                </button>

                <button
                  onClick={() => setThermalFilter(!thermalFilter)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    thermalFilter ? 'bg-orange-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                  }`}
                >
                  <Flame className="w-4 h-4" /> Thermal
                </button>

                <button
                  onClick={() => setAiOverlay(!aiOverlay)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    aiOverlay ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                  }`}
                >
                  <Shield className="w-4 h-4" /> AI Overlays
                </button>

                <button
                  onClick={handleCaptureSnapshot}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
                  title="Capture Snapshot"
                >
                  <Download className="w-4 h-4 text-cyan-400" /> Snapshot
                </button>

                <button
                  onClick={handleToggleRecording}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                    isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                  }`}
                  title="Toggle Video Recording"
                >
                  <Radio className="w-4 h-4" /> {isRecording ? `Recording (${recordingSeconds}s)` : 'Record Clip'}
                </button>
              </div>

              {/* PTZ Presets & Zoom Pad */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Preset Position Buttons */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Presets:</span>
                  <button onClick={() => applyPtzPreset(-20, 10, 1.4)} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 font-bold transition-colors">North Gate</button>
                  <button onClick={() => applyPtzPreset(0, 0, 1.0)} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 font-bold transition-colors">Center</button>
                  <button onClick={() => applyPtzPreset(20, -10, 1.8)} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 font-bold transition-colors">Perimeter</button>
                </div>

                {/* Zoom Buttons */}
                <div className="flex items-center gap-1">
                  <button onClick={() => setZoom(z => Math.min(3.0, z + 0.25))} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button onClick={() => setZoom(z => Math.max(1.0, z - 0.25))} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  {(zoom !== 1.0 || panX !== 0 || panY !== 0) && (
                    <button onClick={resetPTZ} className="p-2 bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white rounded-xl border border-rose-500/30 transition-colors">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Network Radar Scanner Modal */}
      {showRadarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Radar className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Local Network CCTV Radar</h2>
                  <p className="text-xs text-slate-400">Deep ARP, ONVIF (Port 3702) & RTSP (Port 554/8554) Scanner</p>
                </div>
              </div>
              <button onClick={() => setShowRadarModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subnet Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customSubnetInput}
                onChange={(e) => setCustomSubnetInput(e.target.value)}
                placeholder="Scan custom subnet (e.g. 192.168.1)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => triggerNetworkScan(customSubnetInput)}
                disabled={isScanningNetwork}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {isScanningNetwork ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Scan
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-72 overflow-y-auto space-y-2">
              {isScanningNetwork ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                  <p>Broadcasting ONVIF probes and scanning RTSP endpoints...</p>
                </div>
              ) : scanResults.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No active CCTV endpoints answered on this subnet. Try another subnet range above.
                </div>
              ) : (
                scanResults.map((dev: any, i: number) => (
                  <div key={i} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-white">{dev.name}</h4>
                      <p className="text-[11px] font-mono text-cyan-300">{dev.ip}:{dev.port} • {dev.brand || 'IP CCTV'}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowRadarModal(false);
                        setShowCreate(true);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500 hover:text-slate-950 transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera Management Modal */}
      <CameraManagementModal
        isOpen={showCreate || !!cameraToEdit}
        onClose={() => {
          setShowCreate(false);
          setCameraToEdit(null);
        }}
        cameraToEdit={cameraToEdit}
      />
    </div>
  );
};
