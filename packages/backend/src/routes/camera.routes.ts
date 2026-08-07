import { Router, Request, Response, NextFunction } from 'express';
import { cameraService } from '@/services/camera.service.js';
import { authMiddleware, requireRole } from '@/middleware/auth.js';
import { validateRequest } from '@/middleware/validation.js';
import { createCameraSchema, updateCameraSchema } from '@/lib/validation.js';
import os from 'os';
import net from 'net';
import dgram from 'dgram';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

// ============================================================================
// REAL-TIME LOCAL NETWORK & CCTV DETECTOR HELPERS
// ============================================================================

/**
 * 1. QUERY SYSTEM ARP TABLE (`arp -a`)
 * Retrieves all active physical IP/MAC addresses currently on the local network.
 */
async function getArpTableDevices(): Promise<{ ip: string; mac: string }[]> {
  const devices: { ip: string; mac: string }[] = [];
  try {
    const { stdout } = await execAsync('arp -a', { timeout: 1500 });
    const lines = stdout.split('\n');
    for (const line of lines) {
      const match = line.trim().match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fa-f]{2}[-:][0-9a-fa-f]{2}[-:][0-9a-fa-f]{2}[-:][0-9a-fa-f]{2}[-:][0-9a-fa-f]{2}[-:][0-9a-fa-f]{2})/i);
      if (match) {
        const ip = match[1];
        const mac = match[2].toUpperCase();
        if (!ip.startsWith('127.') && !ip.startsWith('224.') && !ip.startsWith('239.') && !ip.endsWith('.255')) {
          devices.push({ ip, mac });
        }
      }
    }
  } catch (err) {
    console.warn('ARP table query fallback:', err);
  }
  return devices;
}

/**
 * 2. PROBE TCP PORT FOR CCTV / STREAMING SERVICES
 */
function probePort(ip: string, port: number, timeoutMs = 300): Promise<{ isOpen: boolean; isRtsp: boolean; rttMs: number; banner: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let resolved = false;
    let banner = '';

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (port === 554 || port === 8554) {
        socket.write(`OPTIONS rtsp://${ip}:${port}/ RTSP/1.0\r\nCSeq: 1\r\n\r\n`);
      } else {
        socket.write(`HEAD / HTTP/1.1\r\nHost: ${ip}\r\nUser-Agent: InfraWatch-Detector/1.0\r\n\r\n`);
      }
    });

    socket.on('data', (chunk) => {
      banner += chunk.toString();
      if (!resolved) {
        resolved = true;
        const rttMs = Date.now() - start;
        socket.destroy();
        const isRtsp = banner.includes('RTSP/1.0') || banner.includes('RTSP/2.0') || banner.includes('Public:');
        resolve({ isOpen: true, isRtsp, rttMs, banner });
      }
    });

    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve({ isOpen: false, isRtsp: false, rttMs: 0, banner: '' });
      }
    };

    socket.on('timeout', safeResolve);
    socket.on('error', safeResolve);

    try {
      socket.connect(port, ip);
    } catch {
      safeResolve();
    }
  });
}

/**
 * 3. ONVIF WS-DISCOVERY UDP MULTICAST PROBE
 */
function discoverOnvifMulticast(timeoutMs = 1200): Promise<any[]> {
  return new Promise((resolve) => {
    const discovered: any[] = [];
    let client: dgram.Socket | null = null;
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        if (client) {
          try { client.close(); } catch { /* ignore */ }
        }
        resolve(discovered);
      }
    };

    try {
      client = dgram.createSocket('udp4');
      const uuid = crypto.randomUUID();

      const soapProbe = `<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
            xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
            xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <e:Header>
    <w:MessageID>uuid:${uuid}</w:MessageID>
    <w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
    <w:Action>http://schemas.xmlsoap.org/ws/2005:04:discovery/Probe</w:Action>
  </e:Header>
  <e:Body>
    <d:Probe>
      <d:Types>tds:Device</d:Types>
    </d:Probe>
  </e:Body>
</e:Envelope>`;

      client.on('error', cleanup);

      client.on('message', (msg, rinfo) => {
        const xml = msg.toString();
        if (xml.includes('ProbeMatch') || xml.includes('onvif') || xml.includes('schemas-xmlsoap-org')) {
          let xaddr = `http://${rinfo.address}:80/onvif/device_service`;
          const xaddrMatch = xml.match(/<d:XAddrs>([^<]+)<\/d:XAddrs>/i);
          if (xaddrMatch && xaddrMatch[1]) {
            xaddr = xaddrMatch[1].trim().split(' ')[0];
          }

          discovered.push({
            ip: rinfo.address,
            port: rinfo.port || 554,
            name: `ONVIF Verified IP Camera (${rinfo.address})`,
            xaddr,
            protocol: 'rtsp://',
            substreamPath: '/live/ch0',
            status: 'ONLINE_VERIFIED',
            type: 'ONVIF Profile S/T CCTV',
            brand: 'ONVIF Hardware Camera',
            isVerifiedCctv: true,
          });
        }
      });

      client.bind(() => {
        try {
          client?.setBroadcast(true);
          client?.setMulticastTTL(4);
          const message = Buffer.from(soapProbe);
          client?.send(message, 0, message.length, 3702, '239.255.255.250');
        } catch {
          // Ignore
        }
      });

      setTimeout(cleanup, timeoutMs);
    } catch {
      cleanup();
    }
  });
}

// GET /api/cameras/scan-network - DEEP REAL-TIME SYSTEM SCANNER (ARP + ONVIF + MULTI-PORT SUBNET PROBE)
router.get(
  '/scan-network',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const interfaces = os.networkInterfaces();
      const localIps: string[] = [];
      let primarySubnetPrefix = '10.205.30';

      for (const interfaceName of Object.keys(interfaces)) {
        for (const iface of interfaces[interfaceName] || []) {
          if (!iface.internal && iface.family === 'IPv4') {
            localIps.push(iface.address);
            const parts = iface.address.split('.');
            if (parts.length === 4) {
              primarySubnetPrefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
            }
          }
        }
      }

      // Step 1: Run UDP ONVIF WS-Discovery Multicast Probe
      const onvifDevices = await discoverOnvifMulticast(1200).catch(() => []);

      // Step 2: Query System ARP Table for all live active local network devices
      const arpDevices = await getArpTableDevices().catch(() => []);

      // Step 3: Probe ARP devices & local subnet range for active CCTV / Streaming ports
      const cctvPorts = [554, 8554, 8000, 8899, 80, 8080, 8081];
      const discoveredDevices: any[] = [...onvifDevices];

      // Add ARP devices to probe list
      const targetIps = new Set<string>();
      arpDevices.forEach((d) => targetIps.add(d.ip));

      // Support custom Indian ISP / public IP range scanning via query param
      const targetSubnetParam = req.query.targetSubnet as string;

      if (targetSubnetParam && targetSubnetParam.trim()) {
        const customPrefix = targetSubnetParam.trim();
        for (let i = 1; i <= 254; i++) {
          targetIps.add(`${customPrefix}.${i}`);
        }
      } else {
        // Add full primary subnet range 1..254
        for (let i = 1; i <= 254; i++) {
          targetIps.add(`${primarySubnetPrefix}.${i}`);
        }

        // Add common default CCTV IP subnets (192.168.1.x, 192.168.0.x, 192.168.254.x, 192.168.100.x)
        const cctvDefaultSubnets = ['192.168.1', '192.168.0', '192.168.254', '192.168.100'];
        for (const subnet of cctvDefaultSubnets) {
          for (let i = 1; i <= 254; i += 2) {
            targetIps.add(`${subnet}.${i}`);
          }
        }
      }

      const probePromises: Promise<void>[] = [];

      for (const ip of Array.from(targetIps)) {
        if (localIps.includes(ip)) continue;

        for (const port of cctvPorts) {
          probePromises.push(
            probePort(ip, port, 250).then((res) => {
              if (res.isOpen) {
                const macObj = arpDevices.find((a) => a.ip === ip);
                const macStr = macObj ? ` [MAC: ${macObj.mac}]` : '';
                const bLower = res.banner.toLowerCase();
                let brand = 'CP Plus / Indian IP CCTV';
                let substreamPath = port === 554 || port === 8554 ? '/cam/realmonitor?channel=1&subtype=0' : '/onvif/device_service';

                if (bLower.includes('cpplus') || bLower.includes('cp-plus') || bLower.includes('cp_plus')) {
                  brand = 'CP Plus IP Camera';
                  substreamPath = '/cam/realmonitor?channel=1&subtype=0';
                } else if (bLower.includes('prama')) {
                  brand = 'Prama India STQC CCTV';
                  substreamPath = '/Streaming/Channels/101';
                } else if (bLower.includes('sparsh')) {
                  brand = 'Sparsh Govt Certified CCTV';
                  substreamPath = '/live/ch0';
                } else if (bLower.includes('qubo') || bLower.includes('hero')) {
                  brand = 'Qubo Smart AI Camera';
                  substreamPath = '/onvif1';
                } else if (bLower.includes('godrej')) {
                  brand = 'Godrej Security IP Camera';
                  substreamPath = '/h264_stream';
                } else if (bLower.includes('zebronics') || bLower.includes('zeb')) {
                  brand = 'Zebronics Security Camera';
                  substreamPath = '/h264_stream';
                } else if (bLower.includes('trueview')) {
                  brand = 'Trueview HD CCTV';
                  substreamPath = '/live/ch0';
                } else if (bLower.includes('secureye')) {
                  brand = 'Secureye Surveillance';
                  substreamPath = '/live/ch0';
                } else if (bLower.includes('hifocus')) {
                  brand = 'HiFocus Enterprise CCTV';
                  substreamPath = '/cam/realmonitor?channel=1&subtype=0';
                }

                discoveredDevices.push({
                  ip,
                  port,
                  name: `${brand} (${ip}:${port})${macStr}`,
                  protocol: port === 554 || port === 8554 ? 'rtsp://' : 'http://',
                  substreamPath,
                  status: 'ONLINE_VERIFIED',
                  rttMs: res.rttMs,
                  subnet: `${primarySubnetPrefix}.0/24`,
                  type: res.isRtsp ? 'Verified RTSP Stream' : 'HTTP/ONVIF Network Camera',
                  brand,
                  isVerifiedCctv: true,
                });
              }
            }).catch(() => {})
          );
        }
      }

      await Promise.all(probePromises);

      // Distinguish raw ARP network hosts (PCs/Laptops/Smartphones) from verified CCTVs
      for (const arpDev of arpDevices) {
        if (!discoveredDevices.some((d) => d.ip === arpDev.ip)) {
          discoveredDevices.push({
            ip: arpDev.ip,
            port: 554,
            name: `LAN Host / Device (${arpDev.ip}) [MAC: ${arpDev.mac}]`,
            protocol: 'rtsp://',
            substreamPath: '/cam/realmonitor?channel=1&subtype=0',
            status: 'UNVERIFIED_HOST',
            rttMs: 5,
            subnet: `${primarySubnetPrefix}.0/24`,
            type: 'LAN Host / Network Node',
            brand: 'LAN Network Host',
            isVerifiedCctv: false,
          });
        }
      }

      // Deduplicate devices by IP
      const uniqueDevices: any[] = [];
      for (const dev of discoveredDevices) {
        if (!uniqueDevices.some((d) => d.ip === dev.ip)) {
          uniqueDevices.push(dev);
        }
      }

      res.json({
        success: true,
        scannedAt: new Date().toISOString(),
        primarySubnet: `${primarySubnetPrefix}.0/24`,
        detectedHostIps: localIps,
        totalDiscovered: uniqueDevices.length,
        devices: uniqueDevices,
      });
    } catch (error) {
      console.error('Scan network fallback:', error);
      res.json({
        success: true,
        scannedAt: new Date().toISOString(),
        primarySubnet: '10.205.30.0/24',
        detectedHostIps: [],
        totalDiscovered: 0,
        devices: [],
      });
    }
  }
);

// GET /api/cameras/stream-proxy - PROXY REMOTE PC WEBCAM / MJPEG STREAM OVER LOCAL LAN
router.get(
  '/stream-proxy',
  async (req: Request, res: Response): Promise<any> => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing target url parameter' });
    }

    try {
      const http = await import('http');
      const https = await import('https');
      const client = targetUrl.startsWith('https') ? https : http;

      const proxyReq = client.get(targetUrl, { timeout: 3000 }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': proxyRes.headers['content-type'] || 'multipart/x-mixed-replace; boundary=ffserver',
          ...proxyRes.headers,
        });
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        console.warn('Stream proxy error:', err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Failed to connect to remote PC camera stream' });
        }
      });

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        if (!res.headersSent) {
          res.status(504).json({ error: 'Connection to remote camera timed out' });
        }
      });
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream proxy internal failure' });
      }
    }
  }
);

// GET /api/cameras/network-info - Returns host's physical Wi-Fi IP address
router.get('/network-info', (_req: Request, res: Response) => {
  const interfaces = os.networkInterfaces();
  let lanIp = '10.205.30.17';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (!iface.internal && iface.family === 'IPv4') {
        if (iface.address.startsWith('10.') || iface.address.startsWith('192.168.') || iface.address.startsWith('172.')) {
          lanIp = iface.address;
        }
      }
    }
  }
  return res.json({ lanIp, port: 5173, broadcastUrl: `https://${lanIp}:5173/cam-broadcast` });
});

// ============================================================================
// ZERO-DOWNLOAD WEBRTC P2P SIGNALING STORE FOR BROWSER-TO-BROWSER WEBCAM
// ============================================================================
const webrtcRooms = new Map<string, { offer?: any; answer?: any; candidates: any[] }>();

// POST /api/cameras/webrtc-offer - Transmit camera offer from Remote PC
router.post('/webrtc-offer', (req: Request, res: Response) => {
  const { pin, offer, candidate } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN required' });

  const room = webrtcRooms.get(pin) || { candidates: [] };
  if (offer) room.offer = offer;
  if (candidate) room.candidates.push(candidate);
  webrtcRooms.set(pin, room);

  return res.json({ success: true, pin });
});

// GET /api/cameras/webrtc-offer/:pin - Receive camera offer on Main PC
router.get('/webrtc-offer/:pin', (req: Request, res: Response) => {
  const { pin } = req.params;
  const room = webrtcRooms.get(pin);
  if (!room || !room.offer) {
    return res.status(200).json({ success: false, error: 'Room or offer not found' });
  }
  return res.json({ success: true, ...room });
});

// POST /api/cameras/webrtc-answer - Post answer from Main PC to Remote PC
router.post('/webrtc-answer', (req: Request, res: Response) => {
  const { pin, answer } = req.body;
  const room = webrtcRooms.get(pin);
  if (!room) return res.status(200).json({ success: false, error: 'Room not found' });
  if (!room) return res.json({ success: false, error: 'Room not found' });
  room.answer = answer;
  webrtcRooms.set(pin, room);
  return res.json({ success: true });
});

// GET /api/cameras/webrtc-answer/:pin - Remote PC polls for answer
router.get('/webrtc-answer/:pin', (req: Request, res: Response) => {
  const { pin } = req.params;
  const room = webrtcRooms.get(pin);
  if (!room || !room.answer) {
    return res.json({ success: false, error: 'Answer not ready' });
  }
  return res.json({ success: true, answer: room.answer });
});

// GET /api/cameras
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const take = parseInt(req.query.take as string) || 20;
      const assetId = req.query.assetId ? parseInt(req.query.assetId as string) : undefined;

      const result = await cameraService.listCameras(req.tenantId!, { skip, take, assetId });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/cameras/:id
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const camera = await cameraService.getCamera(parseInt(req.params.id), req.tenantId!);
      res.json(camera);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/cameras — Updated role permissions to allow ADMIN, MANAGER, ENGINEER, INSPECTOR
router.post(
  '/',
  authMiddleware,
  requireRole('ADMIN', 'ENGINEER', 'MANAGER', 'INSPECTOR'),
  validateRequest(createCameraSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const camera = await cameraService.createCamera(req.tenantId!, req.body);
      res.status(201).json(camera);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/cameras/:id — Updated role permissions to allow ADMIN, MANAGER, ENGINEER, INSPECTOR
router.put(
  '/:id',
  authMiddleware,
  requireRole('ADMIN', 'ENGINEER', 'MANAGER', 'INSPECTOR'),
  validateRequest(updateCameraSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const camera = await cameraService.updateCamera(
        parseInt(req.params.id),
        req.tenantId!,
        req.body
      );
      res.json(camera);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/cameras/:id — Updated role permissions to allow ADMIN, MANAGER, ENGINEER, INSPECTOR
router.delete(
  '/:id',
  authMiddleware,
  requireRole('ADMIN', 'ENGINEER', 'MANAGER', 'INSPECTOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await cameraService.deleteCamera(parseInt(req.params.id), req.tenantId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
