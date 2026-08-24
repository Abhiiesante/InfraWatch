import { useState, useEffect, useRef } from 'react';
import { Camera, Radio, Check, Copy, AlertCircle, Sparkles } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

const hostIp = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const API_URL = (import.meta as any).env.VITE_API_URL || '/api';

export const WebRtcCameraTransmitterPage = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<'INITIALIZING' | 'STREAMING' | 'CONNECTED' | 'ERROR'>('INITIALIZING');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [boxes, setBoxes] = useState<any[]>([]);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);

  // Automatically start broadcasting on page load (ZERO CLICKS REQUIRED!)
  useEffect(() => {
    const activePin = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(activePin);

    let mediaStream: MediaStream | null = null;
    let pollTimer: any = null;
    let framePushTimer: any = null;

    // Connect to WebSocket for live frame transmission
    const socket = io(window.location.origin, { path: '/socket.io', transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('cv-detections', (data: any) => {
      if (data && (String(data.cameraId) === String(activePin) || data.frameSource === 'live')) {
        setBoxes(data.boxes || []);
      }
    });

    const autoStartBroadcasting = async () => {
      try {
        setStatus('STREAMING');
        setErrorMessage('');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setStatus('ERROR');
          setErrorMessage(
            'HTTP Security Restriction: Chrome/Edge blocks camera access over plain HTTP IP addresses (http://' + hostIp + '). Please use Chrome flag bypass below or access via localhost.'
          );
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
          audio: false,
        });

        mediaStream = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }

        // Periodic Frame Pusher to Backend CVDaemon for Live Roboflow Inference (2 FPS)
        framePushTimer = setInterval(() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState < 2) return;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = 640;
          canvas.height = 480;
          ctx.drawImage(video, 0, 0, 640, 480);
          const base64Image = canvas.toDataURL('image/jpeg', 0.65);

          socket.emit('cv:push-frame', {
            cameraId: activePin,
            base64Image,
          });
        }, 500);

        // 2. Initialize RTCPeerConnection for WebRTC Peer Streaming
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            axios.post(`${API_URL}/cameras/webrtc-offer`, {
              pin: activePin,
              candidate: event.candidate,
            }).catch(() => {});
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
          } else {
            const checkState = () => {
              if (pc.iceGatheringState === 'complete') {
                pc.removeEventListener('icegatheringstatechange', checkState);
                resolve();
              }
            };
            pc.addEventListener('icegatheringstatechange', checkState);
            setTimeout(() => {
              pc.removeEventListener('icegatheringstatechange', checkState);
              resolve();
            }, 2500);
          }
        });

        await axios.post(`${API_URL}/cameras/webrtc-offer`, {
          pin: activePin,
          offer: pc.localDescription,
        }).catch(() => {});

        // Poll for WebRTC Answer from Main PC
        pollTimer = setInterval(async () => {
          try {
            const res = await axios.get(`${API_URL}/cameras/webrtc-answer/${activePin}`);
            if (res.data?.answer && pc.signalingState !== 'stable') {
              await pc.setRemoteDescription(new RTCSessionDescription(res.data.answer));
              setStatus('CONNECTED');
              clearInterval(pollTimer);
            }
          } catch {
            // Waiting for answer
          }
        }, 1000);
      } catch (err: any) {
        console.error('Auto broadcasting error:', err);
        setStatus('ERROR');
        setErrorMessage('Camera permission required. Click allow camera in browser bar.');
      }
    };

    autoStartBroadcasting();

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      if (framePushTimer) clearInterval(framePushTimer);
      if (socketRef.current) socketRef.current.disconnect();
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const copyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 flex flex-col items-center justify-center font-sans">
      {/* Hidden processing canvas for frame grabbing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-center backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 text-cyan-400">
              <Camera className="w-6 h-6 animate-pulse" />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-black text-white">Wireless CCTV Broadcaster</h1>
              <p className="text-xs text-cyan-400 font-medium">⚡ Connected to Roboflow Inference</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            LIVE
          </span>
        </div>

        {/* Video Preview with Real AI Overlays */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

          {/* Real-time Roboflow AI Bounding Box Overlays */}
          {boxes.map((box) => (
            <div
              key={box.id}
              className="absolute border-[2px] transition-all duration-75 pointer-events-none"
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.w}%`,
                height: `${box.h}%`,
                borderColor: box.color || '#10B981',
                boxShadow: `0 0 10px ${box.color || '#10B981'}40`,
              }}
            >
              <div
                className="absolute -top-5 left-[-2px] text-white text-[10px] font-black px-1.5 py-0.5 whitespace-nowrap tracking-wide shadow-sm rounded-t"
                style={{ backgroundColor: box.color || '#10B981' }}
              >
                {box.label} {box.conf}%
              </div>
            </div>
          ))}

          {/* Status HUD Chip */}
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>AI Detections: {boxes.length} Active</span>
          </div>
        </div>

        {/* PIN Code Box */}
        <div className="p-5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-2 shadow-lg">
          <span className="text-xs text-cyan-300 font-bold uppercase tracking-wider block">
            Pairing PIN Code for Main Dashboard:
          </span>
          <div className="flex items-center justify-center gap-4">
            <span className="text-4xl font-mono font-black text-cyan-400 tracking-widest">{pin}</span>
            <button
              onClick={copyPin}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all shadow"
              title="Copy Code"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Enter this PIN in the <strong>"Connect Wireless Device"</strong> popup on the Cameras page.
          </p>
        </div>

        {/* Status Indicator */}
        {status === 'STREAMING' && (
          <div className="flex items-center justify-center gap-2 text-xs text-amber-300 bg-amber-950/40 p-3 rounded-2xl border border-amber-500/40 font-bold animate-pulse">
            <Radio className="w-4 h-4 text-amber-400 animate-ping" /> BROADCASTING ACTIVE — ENTER PIN {pin}
          </div>
        )}

        {status === 'CONNECTED' && (
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 p-3 rounded-2xl border border-emerald-500/40 font-bold shadow-lg">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> LIVE STREAMING & DETECTING ON MAIN PC
          </div>
        )}

        {status === 'ERROR' && (
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-950/50 p-4 rounded-2xl border border-rose-500/40 font-sans">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>

            <div className="p-4 bg-slate-900 rounded-2xl border border-cyan-800/80 space-y-2 text-[11px] text-slate-300">
              <p className="font-bold text-cyan-400">💡 1-Click Fix to Allow Camera on Local Wi-Fi HTTP:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>Open a new tab: <code className="bg-slate-800 px-2 py-0.5 rounded text-cyan-300 select-all font-mono">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></li>
                <li>Add <code className="bg-slate-800 px-2 py-0.5 rounded text-cyan-300 select-all font-mono">http://{hostIp}:5173</code> into the text box.</li>
                <li>Set dropdown to <strong className="text-emerald-400">Enabled</strong> & click <strong className="text-cyan-400">Relaunch</strong>.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
