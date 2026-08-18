import { useState, useEffect, useRef } from 'react';
import { useCameras, useCreateCamera, useDeleteCamera } from '../api/useCameras';
import { useAssets } from '@/features/assets/api/useAssets';
import { Video, Plus, Loader2, X, Wifi, Trash2, Eye, Play, Pause, Maximize2, Radio, Shield, Move, ZoomIn, ZoomOut, Flame, RotateCcw, Compass, Camera as CameraIcon, Globe, Settings } from 'lucide-react';
import { CameraManagementModal } from '../components/CameraManagementModal';
import * as Dialog from '@radix-ui/react-dialog';
import { format } from 'date-fns';
import Hls from 'hls.js';
import { io } from 'socket.io-client';

const socket = io(window.location.origin, { path: '/socket.io' });

const LiveRoboflowTracker = ({ isPlaying }: { isPlaying: boolean }) => {
  const [boxes, setBoxes] = useState<any[]>([]);
  const [frameSource, setFrameSource] = useState<'live' | 'static_test' | 'simulated'>('simulated');

  useEffect(() => {
    if (!isPlaying) return;
    
    socket.on('cv-detections', (data) => {
      if (data && typeof data === 'object' && 'boxes' in data) {
        setBoxes(data.boxes || []);
        // Legacy fallback support for older payload
        setFrameSource(data.frameSource || (data.simulated ? 'simulated' : 'live'));
      } else if (Array.isArray(data)) {
        setBoxes(data);
        setFrameSource('live');
      }
    });

    return () => {
      socket.off('cv-detections');
    };
  }, [isPlaying]);

  if (!isPlaying) return null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* 3-State Honesty Badge */}
      {frameSource === 'simulated' && (
        <div className="absolute top-2 right-2 z-30 bg-indigo-500/90 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg tracking-wide flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          SIMULATED DEMO MODE
        </div>
      )}
      {frameSource === 'real_no_frame' && (
        <div className="absolute top-2 right-2 z-30 bg-amber-500/90 text-black text-[10px] font-bold px-2 py-1 rounded shadow-lg tracking-wide flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-900" />
          REAL INFERENCE — AWAITING FEED
        </div>
      )}
      {frameSource === 'live' && (
        <div className="absolute top-2 right-2 z-30 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg tracking-wide flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          REAL INFERENCE — LIVE STREAM
        </div>
      )}

      {boxes.map(box => (
        <div
          key={box.id}
          className="absolute border-[2px] transition-all duration-75"
          style={{
            left: `${box.x}%`,
            top: `${box.y}%`,
            width: `${box.w}%`,
            height: `${box.h}%`,
            borderColor: box.color,
            boxShadow: `0 0 10px ${box.color}40`,
            borderStyle: frameSource === 'simulated' ? 'dashed' : 'solid',
          }}
        >
          {/* Label Tab */}
          <div 
            className="absolute -top-5 left-[-2px] text-white text-xs font-extrabold px-1.5 py-0.5 whitespace-nowrap tracking-wide shadow-sm"
            style={{ backgroundColor: box.color }}
          >
            {box.label} {box.conf}%
          </div>
          
          {/* Corner crosshairs */}
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: box.color }} />
          <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: box.color }} />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2" style={{ borderColor: box.color }} />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2" style={{ borderColor: box.color }} />
        </div>
      ))}
    </div>
  );
};

// Dedicated HLS / Youtube / MP4 Video Player with Autoplay Mute Enforcement & Zero Blackout Fallbacks
const HlsVideoPlayer = ({ src, className, style, poster }: { src: string; className?: string; style?: React.CSSProperties; poster?: string }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (src.includes('youtube.com') || src.includes('youtu.be')) {
    return (
      <iframe
        src={src}
        className={className}
        style={style}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Force browser autoplay compliance to prevent pitch black screens
    video.defaultMuted = true;
    video.muted = true;

    if (!src.endsWith('.m3u8')) {
      video.src = src;
      video.load();
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = true;
        video.play().catch(() => {});
      });
      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.muted = true;
      video.play().catch(() => {});
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

export const CamerasListPage = () => {
  const [page] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [cameraToEdit, setCameraToEdit] = useState<any | null>(null);
  const [activeStreamCamera, setActiveStreamCamera] = useState<any | null>(null);
  const [thermalFilter, setThermalFilter] = useState(false);
  const [aiOverlay, setAiOverlay] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [useWebcam, setUseWebcam] = useState(false);
  const [liveClock, setLiveClock] = useState(new Date());

  // Real 360° Optical Camera PTZ State
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number } | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const take = 12;
  const skip = (page - 1) * take;

  const { data, isLoading } = useCameras({ skip, take });
  const { data: assetsData } = useAssets({ skip: 0, take: 100 });
  const { mutateAsync: createCamera, isPending: isCreating } = useCreateCamera();
  const { mutateAsync: deleteCamera } = useDeleteCamera();

  // Ticking live stream clock
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setLiveClock(new Date());
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Handle local webcam stream start / stop
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
          console.warn('Webcam permission denied or unavailable:', err);
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

  const resetPTZ = () => {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
  };

  // Mouse Drag to Pan Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: panX,
      startPanY: panY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    setPanX(Math.max(-30, Math.min(30, dragStartRef.current.startPanX + (dx / 15))));
    setPanY(Math.max(-20, Math.min(20, dragStartRef.current.startPanY + (dy / 20))));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleCreateCamera = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createCamera({
        name: formData.get('name') as string,
        assetId: parseInt(formData.get('assetId') as string, 10),
        cameraType: formData.get('cameraType') as string,
        rtspUrl: formData.get('rtspUrl') as string,
        ipAddress: (formData.get('ipAddress') as string) || undefined,
      });
      setShowCreate(false);
    } catch (error) {
      console.error('Failed to create camera:', error);
    }
  };

  const handleDeleteCamera = async (id: number) => {
    if (window.confirm('Are you sure you want to remove this camera?')) {
      try {
        await deleteCamera(id);
      } catch (error) {
        console.error('Failed to delete camera:', error);
      }
    }
  };

  // Resolve video stream URL for each camera. Returns isDemoStream flag
  // to honestly indicate when a fallback video is used instead of a real camera feed.
  const getCameraHlsStream = (camera: any): { url: string; isDemoStream: boolean } => {
    if (camera.config?.streamUrl) {
      return { url: camera.config.streamUrl, isDemoStream: false };
    }
    // Default fallback — Generic demonstration video
    return { url: 'https://media.roboflow.com/supervision/video-examples/vehicles.mp4', isDemoStream: true };
  };

  const getCameraPoster = (camera: any) => {
    if (camera.name?.includes('360') || camera.cameraType?.includes('360')) {
      return '/images/mumbai_sealink_360_panorama.png';
    }
    if (camera.name?.toLowerCase().includes('bridge') || camera.name?.toLowerCase().includes('crossing')) {
      return '/images/chenab_bridge_inspection.png';
    }
    return '/images/bandra_sealink_inspection.png';
  };

  // Calculate cardinal compass heading (0° to 360°)
  const headingNormalized = Math.abs(Math.round((180 + panX * 5.14) % 360));
  const getCardinal = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
  };
  const cardinalStr = getCardinal(headingNormalized);
  const tiltDeg = Math.round(panY);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 w-full animate-in fade-in pb-24 mt-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 drop-shadow-sm">
            Cameras & Surveillance Streams
          </h1>
          <p className="text-slate-800/70 mt-3 text-xl font-medium">
            Global Camera & Surveillance Network
          </p>
        </div>
        <button
          onClick={() => {
            setCameraToEdit(null);
            setShowCreate(true);
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Register Camera
        </button>
      </div>

      {/* Camera Management Modal (Create & Edit) */}
      <CameraManagementModal
        isOpen={showCreate || !!cameraToEdit}
        onClose={() => {
          setShowCreate(false);
          setCameraToEdit(null);
        }}
        cameraToEdit={cameraToEdit}
      />

      {/* Camera Video Matrix Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-24">
          <Loader2 className="w-12 h-12 text-slate-800 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data?.cameras?.map((camera: any) => {
            const is360 = camera.cameraType.includes('360') || camera.cameraType.includes('DOME') || camera.cameraType.includes('PTZ');
            const hasCustomStream = Boolean(camera.config?.streamUrl || (camera.rtspUrl && !camera.rtspUrl.includes('demo')));

            return (
              <div
                key={camera.id}
                className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col group/card hover:-translate-y-1"
              >
                {/* Visual Camera Feed Display */}
                <div 
                  onClick={() => {
                    setActiveStreamCamera(camera);
                    resetPTZ();
                  }}
                  className="relative aspect-video bg-black overflow-hidden cursor-pointer group/feed"
                >
                  <img
                    src={getCameraPoster(camera)}
                    alt={camera.name}
                    className="w-full h-full object-cover group-hover/feed:scale-105 transition-transform duration-700 opacity-90"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f6?auto=format&fit=crop&w=800&q=80';
                    }}
                  />

                  {/* Badges on Video */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center gap-1.5 shadow-lg">
                        <span className={`w-2 h-2 rounded-full ${camera.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {camera.status || 'ONLINE'}
                      </span>
                      {hasCustomStream ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-cyan-500/80 text-white border border-cyan-400/40 backdrop-blur-md shadow">
                          CUSTOM FEED
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/80 text-slate-950 border border-amber-400/40 backdrop-blur-md shadow">
                          DEMO STREAM
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-white">
                      <span className="px-2 py-1 rounded bg-black/60 backdrop-blur-md font-mono">
                        {format(new Date(liveClock.getTime() + (camera.id * 1000 * 60 * 3)), 'HH:mm:ss')} UTC
                      </span>
                      {aiOverlay && (
                        <span className="px-2 py-1 rounded bg-black/60 backdrop-blur-md text-emerald-400 tracking-wide ml-1">
                          AI: Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hover Overlay Play Icon */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/feed:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <Play className="w-12 h-12 text-white opacity-80" fill="currentColor" />
                  </div>
                </div>

                {/* Card Content & Action Bar */}
                <div className="p-6 flex-1 flex flex-col justify-between z-10 border-t border-slate-200">
                  <div className="mb-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-xl text-slate-900 tracking-tight">
                        {camera.name}
                      </h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        ID #{camera.id}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mt-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-600" />
                      {camera.asset?.name || 'Unassigned Facility'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs mt-auto pb-4 text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <CameraIcon className="w-4 h-4 text-slate-400" /> Type: <strong className="text-slate-900">{camera.cameraType || (is360 ? '360° PTZ' : 'Fixed Mount')}</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>
                      IP: <strong className="text-slate-900 font-mono">{camera.ipAddress || 'DHCP'}</strong>
                    </span>
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setActiveStreamCamera(camera);
                        resetPTZ();
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Live View
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCameraToEdit(camera)}
                        className="px-3 py-2 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors flex items-center gap-1 font-bold text-xs border border-slate-200"
                        title="Edit Camera Configuration"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Remove "${camera.name}" camera?\n\nThis will remove the camera from the monitoring dashboard.`)) {
                            handleDeleteCamera(camera.id);
                          }
                        }}
                        className="p-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors flex items-center justify-center font-bold text-xs"
                        title="Remove Camera"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* IN-PAGE REAL-TIME SURVEILLANCE VIDEO MONITOR MODAL */}
      {activeStreamCamera && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <div className="bg-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.60)] w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-[rgba(255,255,255,0.60)] flex items-center justify-between bg-transparent text-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-slate-800 animate-ping" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base">{activeStreamCamera.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800/20 text-emerald-300 border border-emerald-500/40">
                      {useWebcam ? '📷 MY LOCAL WEBCAM (LIVE)' : '🌐 24/7 REAL-TIME WEBCAM'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {activeStreamCamera.rtspUrl} • {activeStreamCamera.asset?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveStreamCamera(null);
                  setUseWebcam(false);
                }}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-800 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* REAL-TIME STREAMING VIDEO VIEWPORT CANVAS */}
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
                  /* Option 1: Live Hardware Local Webcam Feed */
                  <video
                    ref={webcamVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      transform: `scale(${zoom}) translate(${panX}%, ${panY}%)`,
                    }}
                    className={`w-full h-full object-cover transition-transform duration-100 ease-out ${
                      thermalFilter ? 'invert hue-rotate-180 contrast-200 brightness-110' : ''
                    }`}
                  />
                ) : (
                  /* Option 2: Real 24/7 Live Public Infrastructure Video Stream */
                  <HlsVideoPlayer
                    src={getCameraHlsStream(activeStreamCamera).url}
                    poster={getCameraPoster(activeStreamCamera)}
                    style={{
                      width: '160%',
                      height: '140%',
                      transform: `scale(${zoom}) translate(${panX}%, ${panY}%)`,
                    }}
                    className={`w-full h-full object-cover transition-transform duration-100 ease-out border-0 ${
                      thermalFilter ? 'invert hue-rotate-180 contrast-200 brightness-110' : ''
                    }`}
                  />
                )}
              </div>

              {/* Laser Scanner Animation */}
              {isPlaying && (
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-scan-laser pointer-events-none top-1/3 z-20" />
              )}

              {/* LIVE REAL-TIME AI BOUNDING OVERLAY */}
              <div 
                className="absolute w-full h-full pointer-events-none z-20"
                style={{
                  width: '160%',
                  height: '140%',
                  transform: `scale(${zoom}) translate(${panX}%, ${panY}%)`,
                }}
              >
                {aiOverlay && <LiveRoboflowTracker isPlaying={isPlaying} />}
              </div>

              {/* Top HUD Display */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs font-mono font-bold pointer-events-none z-30">
                <div className="bg-black/70 text-emerald-400 px-3.5 py-1.5 rounded-full border border-emerald-500/40 backdrop-blur-md flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-rose-500 animate-ping' : 'bg-amber-400'}`} />
                  <span>{isPlaying ? 'REC ⏺ 60.0 FPS • 24/7 OPEN STREAM' : 'STREAM PAUSED'}</span>
                </div>

                {/* Live 360° Compass Pointing Degree HUD Readout */}
                <div className="bg-black/70 text-slate-200 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-md flex items-center gap-3">
                  <span className="text-[#7FB8B0] font-extrabold flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
                    BEARING: {headingNormalized}° {cardinalStr} • TILT: {tiltDeg}° • LENS: {zoom.toFixed(1)}x
                  </span>
                  <span className="text-slate-400 font-normal">|</span>
                  <span>{format(liveClock, 'yyyy-MM-dd HH:mm:ss.SSS')}</span>
                </div>
              </div>

              {/* Drag Prompt Tooltip */}
              <div className="absolute bottom-4 left-4 bg-black/60 text-slate-300 text-[11px] font-semibold px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm pointer-events-none flex items-center gap-1.5 z-30">
                <Move className="w-3 h-3 text-cyan-400" /> Click & Drag screen to adjust PTZ optical pan & tilt
              </div>
            </div>

            {/* Modal Interactive Controls Bar */}
            <div className="p-4 bg-transparent border-t border-[rgba(255,255,255,0.60)] flex flex-wrap items-center justify-between gap-4">
              {/* Webcam / 24/7 Stream Switch / Thermal Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isPlaying ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-600 text-slate-800 shadow'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
                  {isPlaying ? 'Pause Stream' : 'Resume Stream'}
                </button>

                <button
                  onClick={() => setUseWebcam(!useWebcam)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    useWebcam ? 'bg-emerald-600 text-slate-800 shadow-lg shadow-emerald-600/40 ring-2 ring-emerald-400 animate-pulse' : 'bg-slate-800 text-slate-300 hover:text-slate-800'
                  }`}
                >
                  <CameraIcon className="w-4 h-4" /> {useWebcam ? 'Webcam Active (Live)' : 'Use My Local Webcam'}
                </button>

                <button
                  onClick={() => setThermalFilter(!thermalFilter)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    thermalFilter ? 'bg-orange-600 text-slate-800 shadow-lg shadow-orange-600/40 ring-2 ring-orange-400' : 'bg-slate-800 text-slate-300 hover:text-slate-800'
                  }`}
                >
                  <Flame className="w-4 h-4" /> Thermal
                </button>
                  <button
                    onClick={() => setAiOverlay(!aiOverlay)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      aiOverlay ? 'bg-slate-800 text-white shadow-lg ring-2 ring-slate-400' : 'bg-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Shield className="w-4 h-4" /> AI Overlays
                </button>
              </div>

              {/* Real PTZ Optics Control Pad */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Move className="w-3.5 h-3.5 text-[#7FB8B0]" /> PTZ Optics:
                </span>
                <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.55)] p-1 rounded-xl border border-[rgba(255,255,255,0.60)]">
                  <button
                    onClick={() => setPanX(x => Math.max(-30, x - 10))}
                    className="px-3 py-1 text-xs font-bold text-slate-200 hover:bg-[rgba(127,184,176,0.85)] hover:text-slate-800 rounded transition-colors"
                    title="Pan Left"
                  >◀</button>
                  <button
                    onClick={() => setPanY(y => Math.min(20, y + 5))}
                    className="px-3 py-1 text-xs font-bold text-slate-200 hover:bg-[rgba(127,184,176,0.85)] hover:text-slate-800 rounded transition-colors"
                    title="Tilt Up"
                  >▲</button>
                  <button
                    onClick={() => setPanY(y => Math.max(-20, y - 5))}
                    className="px-3 py-1 text-xs font-bold text-slate-200 hover:bg-[rgba(127,184,176,0.85)] hover:text-slate-800 rounded transition-colors"
                    title="Tilt Down"
                  >▼</button>
                  <button
                    onClick={() => setPanX(x => Math.min(30, x + 10))}
                    className="px-3 py-1 text-xs font-bold text-slate-200 hover:bg-[rgba(127,184,176,0.85)] hover:text-slate-800 rounded transition-colors"
                    title="Pan Right"
                  >▶</button>
                </div>
                <button
                  onClick={() => setZoom(z => Math.min(3.0, z + 0.25))}
                  className="p-2 bg-slate-800 hover:bg-[rgba(127,184,176,0.85)] text-slate-200 hover:text-slate-800 rounded-xl transition-colors"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoom(z => Math.max(1.0, z - 0.25))}
                  className="p-2 bg-slate-800 hover:bg-[rgba(127,184,176,0.85)] text-slate-200 hover:text-slate-800 rounded-xl transition-colors"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                {(zoom !== 1.0 || panX !== 0 || panY !== 0) && (
                  <button
                    onClick={resetPTZ}
                    className="p-2 bg-rose-900/60 hover:bg-rose-600 text-slate-800 rounded-xl transition-colors"
                    title="Reset Position"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
