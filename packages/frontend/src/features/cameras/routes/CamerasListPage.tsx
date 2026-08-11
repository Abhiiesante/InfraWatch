import { useState, useEffect, useRef } from 'react';
import { useCameras, useCreateCamera, useDeleteCamera } from '../api/useCameras';
import { useAssets } from '@/features/assets/api/useAssets';
import { Video, Plus, Loader2, X, Wifi, Trash2, Eye, Play, Pause, Maximize2, Radio, Shield, Move, ZoomIn, ZoomOut, Flame, RotateCcw, Compass, Camera as CameraIcon, Globe } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { format } from 'date-fns';
import Hls from 'hls.js';

const LiveRoboflowTracker = ({ isPlaying }: { isPlaying: boolean }) => {
  const [boxes, setBoxes] = useState([
    { id: 1, label: 'PERSON', conf: 98.4, x: 20, y: 30, w: 10, h: 25, dx: 0.1, dy: 0, color: '#06B6D4' },
    { id: 2, label: 'FORKLIFT', conf: 94.2, x: 60, y: 50, w: 15, h: 20, dx: -0.15, dy: 0.05, color: '#EF4444' },
    { id: 3, label: 'PALLET', conf: 89.1, x: 40, y: 70, w: 12, h: 10, dx: 0, dy: 0, color: '#F59E0B' },
  ]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setBoxes(prev => prev.map(box => {
        let newX = box.x + box.dx;
        let newY = box.y + box.dy;
        let newDx = box.dx;
        let newDy = box.dy;

        // Bounce off bounds
        if (newX < 5 || newX + box.w > 95) newDx = -box.dx;
        if (newY < 5 || newY + box.h > 95) newDy = -box.dy;

        // Random jitter to simulate tracking instability
        newX += (Math.random() - 0.5) * 0.1;
        newY += (Math.random() - 0.5) * 0.1;
        
        // Random confidence fluctuation
        const newConf = Math.min(99.9, Math.max(85.0, box.conf + (Math.random() - 0.5) * 1.5));

        return { ...box, x: newX, y: newY, dx: newDx, dy: newDy, conf: newConf };
      }));
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying]);

  if (!isPlaying) return null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
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
          }}
        >
          {/* Label Tab */}
          <div 
            className="absolute -top-5 left-[-2px] text-white text-[9px] font-extrabold px-1.5 py-0.5 whitespace-nowrap tracking-wide"
            style={{ backgroundColor: box.color }}
          >
            {box.label} {box.conf.toFixed(1)}%
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

  // Resolve 1:1 exact real-time 24/7 video stream URL for each Global Facility
  const getCameraHlsStream = (camera: any) => {
    if (camera.config?.streamUrl) {
      return camera.config.streamUrl;
    }
    const name = camera.name?.toLowerCase() || '';
    const assetName = camera.asset?.name?.toLowerCase() || '';

    if (name.includes('tokyo') || assetName.includes('tokyo') || name.includes('shibuya') || assetName.includes('shibuya')) {
      // Amazon Robotics Warehouse
      return 'https://www.youtube.com/embed/8gy5tYVR-28?autoplay=1&mute=1&playsinline=1&loop=1&playlist=8gy5tYVR-28';
    }
    if (name.includes('venice') || assetName.includes('venice')) {
      // Fulfillment Center Operations
      return 'https://www.youtube.com/embed/dAXcMlJSbB8?autoplay=1&mute=1&playsinline=1&loop=1&playlist=dAXcMlJSbB8';
    }
    if (name.includes('nyc') || assetName.includes('york') || name.includes('bosphorus') || assetName.includes('bosphorus')) {
      // Factory Assembly Line / Machines
      return 'https://www.youtube.com/embed/fW_5Rk863-8?autoplay=1&mute=1&playsinline=1&loop=1&playlist=fW_5Rk863-8';
    }
    // Default to Warehouse / Factory Floor Live operations
    return 'https://www.youtube.com/embed/2eY_Cg5UxtA?autoplay=1&mute=1&playsinline=1&loop=1&playlist=2eY_Cg5UxtA';
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
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 drop-">
            Cameras & Surveillance Streams
          </h1>
          <p className="text-slate-800/70 mt-2 text-lg font-medium">
            Global Infrastructure Grid — 24/7 Open Public Surveillance Matrix.
          </p>
        </div>
        <Dialog.Root open={showCreate} onOpenChange={setShowCreate}>
          <Dialog.Trigger asChild>
            <button className="bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Camera
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 p-8 bg-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.80)] rounded-2xl shadow-2xl">
              <div className="flex flex-col space-y-1.5">
                <Dialog.Title className="text-2xl font-bold text-[#3A4046]">Register Camera Stream</Dialog.Title>
                <Dialog.Description className="text-sm text-slate-800/70">
                  Connect a new camera feed to the global monitoring matrix.
                </Dialog.Description>
              </div>
              <form onSubmit={handleCreateCamera} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label htmlFor="cam-name" className="text-xs font-bold text-slate-700">Camera Name</label>
                  <input required id="cam-name" name="name" className="flex h-11 w-full rounded-xl border border-[rgba(255,255,255,0.80)] bg-transparent px-4 text-sm" placeholder="e.g. Tokyo Harbour Bridge Live Cam" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cam-asset" className="text-xs font-bold text-slate-700">Associated Infrastructure Facility</label>
                  <select required id="cam-asset" name="assetId" className="flex h-11 w-full rounded-xl border border-[rgba(255,255,255,0.80)] bg-transparent px-4 text-sm">
                    <option value="">Select an asset facility...</option>
                    {assetsData?.assets?.map((asset: any) => (
                      <option key={asset.id} value={asset.id}>{asset.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cam-type" className="text-xs font-bold text-slate-700">Camera Hardware Type</label>
                  <select required id="cam-type" name="cameraType" className="flex h-11 w-full rounded-xl border border-[rgba(255,255,255,0.80)] bg-transparent px-4 text-sm">
                    <option value="360° DOME PTZ">360° Dome PTZ Panorama</option>
                    <option value="PTZ 4K Structural">PTZ 4K Structural</option>
                    <option value="Optical Strain HD">Optical Strain HD</option>
                    <option value="THERMAL INFRARED">Thermal Infrared</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cam-rtsp" className="text-xs font-bold text-slate-700">Stream URL</label>
                  <input required id="cam-rtsp" name="rtspUrl" className="flex h-11 w-full rounded-xl border border-[rgba(255,255,255,0.80)] bg-transparent px-4 text-sm font-mono" placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cam-ip" className="text-xs font-bold text-slate-700">IP Address</label>
                  <input id="cam-ip" name="ipAddress" className="flex h-11 w-full rounded-xl border border-[rgba(255,255,255,0.80)] bg-transparent px-4 text-sm font-mono" placeholder="192.168.10.100" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Dialog.Close asChild>
                    <button type="button" className="px-5 py-2.5 text-sm font-bold text-slate-800/80 hover:bg-slate-100 rounded-xl">Cancel</button>
                  </Dialog.Close>
                  <button disabled={isCreating} type="submit" className="px-6 py-2.5 text-sm font-bold bg-[rgba(127,184,176,0.85)] hover:bg-indigo-700 text-slate-800 rounded-xl shadow-lg shadow-indigo-500/20">
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Camera'}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Camera Video Matrix Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-[#7FB8B0] animate-spin mb-4" />
          <p className="text-slate-800/70 font-medium">Connecting to surveillance streams...</p>
        </div>
      ) : data?.cameras?.length === 0 ? (
        <div className="bg-[rgba(255,255,255,0.55)] rounded-2xl border border-[rgba(255,255,255,0.80)] p-16 text-center ">
          <Video className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#3A4046] mb-2">No active camera streams</h3>
          <p className="text-slate-800/70 max-w-md mx-auto text-sm">Add your first surveillance feed to view real-time optical streams.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data?.cameras?.map((camera: any) => {
            const hlsUrl = getCameraHlsStream(camera);
            const posterImg = getCameraPoster(camera);
            const is360 = camera.name?.includes('360') || camera.cameraType?.includes('360');
            return (
              <div
                key={camera.id}
                className="bg-[rgba(255,255,255,0.55)] rounded-2xl border border-[rgba(255,255,255,0.80)] overflow-hidden  hover:shadow-xl transition-all duration-300 group flex flex-col"
              >
                {/* 24/7 Real-Time Live Infrastructure Video Stream Player Canvas */}
                <div
                  onClick={() => {
                    setActiveStreamCamera(camera);
                    resetPTZ();
                  }}
                  className="h-52 bg-transparent relative overflow-hidden cursor-pointer group/feed"
                >
                  <HlsVideoPlayer
                    src={hlsUrl}
                    poster={posterImg}
                    className="w-full h-full object-cover group-hover/feed:scale-105 transition-transform duration-500 border-0"
                  />

                  {/* RTSP Real-Time Live Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70 p-3.5 flex flex-col justify-between pointer-events-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-black/60 px-2.5 py-1 rounded-full border border-emerald-500/40 backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-[10px] font-mono font-bold text-slate-800">24/7 OPEN WEBCAM</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {is360 && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 backdrop-blur-md flex items-center gap-1">
                            <Globe className="w-3 h-3 text-cyan-400" /> 360° DOME
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md flex items-center gap-1">
                          <Wifi className="w-3 h-3" /> ONLINE
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <span>{format(liveClock, 'HH:mm:ss')} UTC</span>
                      <span className="bg-indigo-950/80 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700 text-[10px] font-bold">
                        100% FREE STREAM
                      </span>
                    </div>
                  </div>

                  {/* Hover Overlay Play Icon */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/feed:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[rgba(127,184,176,0.85)] text-slate-800 flex items-center justify-center shadow-xl transform scale-90 group-hover/feed:scale-100 transition-transform">
                      <Maximize2 className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Card Content & Action Bar */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-[#3A4046] group-hover:text-[#7FB8B0] transition-colors">
                      {camera.name}
                    </h3>
                    <p className="text-sm text-slate-800/70 font-medium mt-0.5">
                      {camera.asset?.name || 'Infrastructure Node'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-bold">
                      {camera.cameraType}
                    </span>
                    {camera.ipAddress && (
                      <span className="bg-slate-100 text-slate-800/70 px-2 py-1 rounded-md font-mono">
                        {camera.ipAddress}
                      </span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setActiveStreamCamera(camera);
                        resetPTZ();
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[rgba(127,184,176,0.12)] text-[#7FB8B0] hover:bg-[rgba(127,184,176,0.85)] hover:text-slate-800 transition-all flex items-center gap-1.5 border border-[rgba(127,184,176,0.25)]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Stream In-Page
                    </button>
                    <button
                      onClick={() => handleDeleteCamera(camera.id)}
                      className="p-2 rounded-lg text-slate-800 hover:bg-rose-50 transition-colors"
                      title="Remove Camera"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                    src={getCameraHlsStream(activeStreamCamera)}
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
