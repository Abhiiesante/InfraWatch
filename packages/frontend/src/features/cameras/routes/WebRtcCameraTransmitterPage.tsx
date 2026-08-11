import { useState, useEffect, useRef } from 'react';
import { Camera, Radio, Check, Copy, AlertCircle } from 'lucide-react';
import axios from 'axios';

const hostIp = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const API_URL = (import.meta as any).env.VITE_API_URL || '/api';

export const WebRtcCameraTransmitterPage = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<'INITIALIZING' | 'STREAMING' | 'CONNECTED' | 'ERROR'>('INITIALIZING');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  // Automatically start broadcasting on page load (ZERO CLICKS REQUIRED!)
  useEffect(() => {
    const activePin = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(activePin);

    let mediaStream: MediaStream | null = null;
    let pollTimer: any = null;

    const autoStartBroadcasting = async () => {
      try {
        setStatus('STREAMING');
        setErrorMessage('');

        // 1. Check if browser blocked mediaDevices due to HTTP insecure origin
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setStatus('ERROR');
          setErrorMessage(
            'HTTP Security Restriction: Chrome/Edge blocks camera access over plain HTTP IP addresses (http://' + hostIp + '). Please use Chrome flag bypass below or access via localhost.'
          );
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false,
        });

        mediaStream = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }

        // 2. Initialize RTCPeerConnection
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Handle ICE Candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            axios.post(`${API_URL}/cameras/webrtc-offer`, {
              pin: activePin,
              candidate: event.candidate,
            }).catch(() => {});
          }
        };

        // Wait for ICE gathering to complete before sending the offer
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
        });

        // Poll for Answer from Main PC
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
    <div className="min-h-screen bg-transparent text-slate-800 p-6 flex flex-col items-center justify-center font-mono">
      <div className="max-w-md w-full bg-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.60)] rounded-3xl p-8 shadow-2xl space-y-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="p-3 bg-cyan-950/80 rounded-2xl border border-cyan-800 text-cyan-400">
            <Camera className="w-8 h-8 animate-pulse" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Browser Camera Broadcaster</h1>
          <p className="text-xs text-cyan-400 mt-1 font-bold">
            ⚡ Camera Live & Ready (Zero Clicks Needed!)
          </p>
        </div>

        {/* Video Preview */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-[rgba(255,255,255,0.60)] shadow-inner">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>

        {/* PIN Code Box */}
        <div className="p-5 rounded-2xl bg-cyan-950/60 border border-cyan-700/60 space-y-2 shadow-lg">
          <span className="text-[11px] text-cyan-300 font-bold uppercase tracking-wider block">
            Pairing Code for Main PC:
          </span>
          <div className="flex items-center justify-center gap-4">
            <span className="text-4xl font-black text-cyan-300 tracking-widest">{pin}</span>
            <button
              onClick={copyPin}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all "
              title="Copy Code"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Status Indicator */}
        {status === 'STREAMING' && (
          <div className="flex items-center justify-center gap-2 text-xs text-amber-300 bg-amber-950/80 p-3.5 rounded-2xl border border-amber-700 font-extrabold animate-pulse">
            <Radio className="w-4 h-4 text-amber-400 animate-ping" /> BROADCASTING ACTIVE — ENTER CODE {pin} ON MAIN PC
          </div>
        )}

        {status === 'CONNECTED' && (
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-300 bg-emerald-950/80 p-3.5 rounded-2xl border border-emerald-700 font-extrabold shadow-lg">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> LIVE STREAMING ACTIVE TO MAIN PC
          </div>
        )}

        {status === 'ERROR' && (
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-2 text-xs text-red-300 bg-red-950/90 p-4 rounded-2xl border border-red-700 font-sans">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>

            <div className="p-4 bg-transparent rounded-2xl border border-cyan-800/80 space-y-2 text-[11px] text-slate-300">
              <p className="font-bold text-cyan-400">💡 1-Click Fix to Allow Camera on Local Wi-Fi HTTP:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>Copy this URL into a new tab: <code className="bg-[rgba(255,255,255,0.55)] px-2 py-0.5 rounded text-cyan-300 select-all font-mono">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></li>
                <li>Add <code className="bg-[rgba(255,255,255,0.55)] px-2 py-0.5 rounded text-cyan-300 select-all font-mono">http://{hostIp}:5173</code> into the text box.</li>
                <li>Change dropdown to <strong className="text-emerald-400">Enabled</strong> & click <strong className="text-cyan-400">Relaunch</strong>.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
