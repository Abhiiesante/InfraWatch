# Camera & Streaming Implementation

> **IEKB Section:** 05 — Frontend  
> **Document:** 07-camera-streaming.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Frontend Lead  
> **Status:** Approved

---

## Table of Contents

1. [V0: Camera Inventory](#v0-camera-inventory)
2. [V1.1: WebRTC Streaming Architecture](#v11-webrtc-streaming-architecture)
3. [Component: VideoPlayer (Future)](#component-videoplayer-future)
4. [Related Documents](#related-documents)

---

## V0: Camera Inventory

In V0, cameras are treated strictly as inventory items. The UI allows users to:
1. List cameras.
2. Register a new camera (providing RTSP URL and credentials).
3. Link/Unlink a camera to an Asset.

The architecture for this matches the [Asset Management Pages](./06-asset-management-pages.md) exactly, utilizing TanStack Table for listing and React Hook Form for creation. No active streaming occurs in the browser during V0.

---

## V1.1: WebRTC Streaming Architecture

When AI and active streaming are introduced in V1.1, the frontend cannot simply render an RTSP stream natively (`<video src="rtsp://...">` does not work in modern browsers). 

The stream must be converted. We will use **WebRTC** for sub-second latency streaming from the backend Media Server to the React client.

### Flow
1. User navigates to `CameraDetailsPage`.
2. Frontend requests a short-lived WebRTC signaling token from the Node API.
3. Frontend uses the token to open a WebSocket connection to the Python Media/Inference Server.
4. Media server negotiates the WebRTC connection (SDP Offer/Answer).
5. Media server starts pumping H.264 video tracks over WebRTC.
6. Frontend attaches the `MediaStream` to a standard `<video>` element.

---

## Component: VideoPlayer (Future)

The WebRTC logic is complex and must be abstracted into a clean, reusable component that handles mounting, signaling, and cleanup automatically.

```tsx
// src/features/cameras/components/WebRTCPlayer.tsx (Conceptual for V1.1)
import { useEffect, useRef, useState } from 'react';
import { useStreamToken } from '../api/useStreamToken';

export const WebRTCPlayer = ({ cameraId }: { cameraId: number }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const [error, setError] = useState('');
  
  // 1. Fetch auth token to talk to media server
  const { data: token } = useStreamToken(cameraId);

  useEffect(() => {
    if (!token || !videoRef.current) return;

    const setupWebRTC = async () => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        peerConnection.current = pc;

        // When stream arrives, attach it to the video element
        pc.ontrack = (event) => {
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
          }
        };

        // ... Signaling logic via WebSocket to Media Server using the token ...
        
      } catch (err) {
        setError('Failed to establish stream');
      }
    };

    setupWebRTC();

    // Crucial: Always close connections when the component unmounts
    return () => {
      peerConnection.current?.close();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [token]);

  if (error) return <div className="text-destructive">{error}</div>;

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full object-contain"
      />
    </div>
  );
};
```

---

## Related Documents

- **Backend:** [Camera Service](../03-backend/07-camera-service.md)
- **AI/Streaming Roadmap:** [V1.1 AI & Data Pipeline](../13-ai/01-data-pipeline.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
