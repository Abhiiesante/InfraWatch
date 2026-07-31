import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Layers, Flame, ZoomIn, ZoomOut, RotateCcw, Activity, Zap } from 'lucide-react';

interface BIMNode {
  x: number; y: number; z: number;
  stress: number; // 0-1
  label?: string;
}

interface BIMEdge {
  a: number; b: number;
}

function generateStructure(_modelIdx: number, baseStressVal: number = 0.5, assetId: number = 0, modelName: string = ''): { nodes: BIMNode[]; edges: BIMEdge[] } {
  const nodes: BIMNode[] = [];
  const edges: BIMEdge[] = [];

  const pseudoRandom = (seed: number) => (Math.sin(seed * 12.9898 + assetId) * 43758.5453) % 1;
  const getStress = (seed: number) => Math.max(0, Math.min(1, baseStressVal * (0.8 + Math.abs(pseudoRandom(seed)) * 0.4)));

  const isTokamak = modelName.includes('ITER') || modelName.includes('Tokamak') || modelName.includes('Fusion') || assetId === 999;

  if (isTokamak) {
    // =========================================================================
    // ULTRA-COMPLEX TOKAMAK SUPERCONDUCTING FUSION REACTOR CORE & BIO-SHIELD
    // =========================================================================
    // 1. Toroidal Vacuum Chamber Vessel (Torus Core)
    const phiSteps = 24;   // Toroidal angular sectors
    const thetaSteps = 12; // Poloidal ring cross-section nodes
    const R0 = 1.3;        // Major radius
    const r0 = 0.52;       // Minor radius

    const torusOffset = nodes.length;
    for (let i = 0; i < phiSteps; i++) {
      const phi = (i / phiSteps) * Math.PI * 2;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      for (let j = 0; j < thetaSteps; j++) {
        const theta = (j / thetaSteps) * Math.PI * 2;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        const x = (R0 + r0 * cosTheta) * cosPhi;
        const z = (R0 + r0 * cosTheta) * sinPhi;
        const y = r0 * sinTheta;

        // Higher thermal stress facing plasma core
        const wallStress = Math.min(1.0, getStress(i * 100 + j) + (cosTheta < -0.2 ? 0.35 : 0.05));
        nodes.push({ x, y, z, stress: wallStress });
      }
    }

    // Connect Toroidal Vacuum Vessel Mesh
    for (let i = 0; i < phiSteps; i++) {
      const nextI = (i + 1) % phiSteps;
      for (let j = 0; j < thetaSteps; j++) {
        const nextJ = (j + 1) % thetaSteps;
        const idx = torusOffset + i * thetaSteps + j;
        const idxPoloidal = torusOffset + i * thetaSteps + nextJ;
        const idxToroidal = torusOffset + nextI * thetaSteps + j;

        edges.push({ a: idx, b: idxPoloidal });
        edges.push({ a: idx, b: idxToroidal });
        if (i % 2 === 0) {
          edges.push({ a: idx, b: torusOffset + nextI * thetaSteps + nextJ }); // Diagonal shear brace
        }
      }
    }

    // 2. 18 Toroidal Field (TF) Superconducting D-Coils
    const dCoilCount = 18;
    for (let c = 0; c < dCoilCount; c++) {
      const phi = (c / dCoilCount) * Math.PI * 2;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);
      const coilOffset = nodes.length;

      const pts = 16;
      for (let p = 0; p < pts; p++) {
        const angle = (p / pts) * Math.PI * 2;
        const rad = 1.35 + 0.75 * Math.sin(angle);
        const y = Math.cos(angle) * 0.95;
        const x = rad * cosPhi;
        const z = rad * sinPhi;
        nodes.push({ x, y, z, stress: 0.35 + Math.sin(c + p) * 0.1 });
      }

      for (let p = 0; p < pts; p++) {
        const nextP = (p + 1) % pts;
        edges.push({ a: coilOffset + p, b: coilOffset + nextP });
      }
    }

    // 3. Central Solenoid Stack
    const solenoidOffset = nodes.length;
    const stackHeight = 1.6;
    const stackR = 0.35;
    const layers = 8;
    for (let l = 0; l <= layers; l++) {
      const y = (l / layers - 0.5) * stackHeight;
      const segs = 10;
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        nodes.push({ x: Math.cos(a) * stackR, y, z: Math.sin(a) * stackR, stress: 0.75 });
      }
    }
    for (let l = 0; l <= layers; l++) {
      const segs = 10;
      const base = solenoidOffset + l * segs;
      for (let s = 0; s < segs; s++) {
        const nextS = base + ((s + 1) % segs);
        edges.push({ a: base + s, b: nextS });
        if (l < layers) {
          edges.push({ a: base + s, b: base + s + segs });
        }
      }
    }

    // 4. Poloidal Field Ring Magnets
    const pfHeights = [-1.1, -0.6, 0.0, 0.6, 1.1];
    const pfRadii = [1.9, 2.1, 2.25, 2.1, 1.9];
    pfHeights.forEach((py, idx) => {
      const pr = pfRadii[idx];
      const ringOffset = nodes.length;
      const segs = 20;
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        nodes.push({ x: Math.cos(a) * pr, y: py, z: Math.sin(a) * pr, stress: 0.4 });
      }
      for (let s = 0; s < segs; s++) {
        edges.push({ a: ringOffset + s, b: ringOffset + ((s + 1) % segs) });
      }
    });

    // 5. Outer Cryostat Shield & Radial Duct Support Pillars
    const cryoOffset = nodes.length;
    const cryoR = 2.4;
    const cryoH = 2.4;
    const cryoPosts = 12;
    for (let cp = 0; cp < cryoPosts; cp++) {
      const a = (cp / cryoPosts) * Math.PI * 2;
      const cx = Math.cos(a) * cryoR;
      const cz = Math.sin(a) * cryoR;
      nodes.push({ x: cx, y: -cryoH / 2, z: cz, stress: 0.2 });
      nodes.push({ x: cx, y: cryoH / 2, z: cz, stress: 0.2 });
    }
    for (let cp = 0; cp < cryoPosts; cp++) {
      const base = cryoOffset + cp * 2;
      edges.push({ a: base, b: base + 1 });
      const nextBase = cryoOffset + ((cp + 1) % cryoPosts) * 2;
      edges.push({ a: base, b: nextBase });
      edges.push({ a: base + 1, b: nextBase + 1 });
      const innerTorusIdx = torusOffset + cp * thetaSteps;
      edges.push({ a: base, b: innerTorusIdx });
      edges.push({ a: base + 1, b: innerTorusIdx });
    }

    return { nodes, edges };
  }

  const nameUpper = modelName.toUpperCase();
  const isCERN = nameUpper.includes('CERN') || nameUpper.includes('HADRON') || nameUpper.includes('ATLAS');
  const isChenab = nameUpper.includes('CHENAB') || nameUpper.includes('RAILWAY ARCH');
  const isBandra = nameUpper.includes('BANDRA') || nameUpper.includes('SEA LINK') || nameUpper.includes('WORLI');
  const isThreeGorges = nameUpper.includes('THREE GORGES') || nameUpper.includes('YANGTZE');
  const isGotthard = nameUpper.includes('GOTTHARD') || nameUpper.includes('TUNNEL');
  const isAkashi = nameUpper.includes('AKASHI') || nameUpper.includes('PEARL BRIDGE');
  const isHoover = nameUpper.includes('HOOVER') || nameUpper.includes('LAKE MEAD');
  const isHornsea = nameUpper.includes('HORNSEA') || nameUpper.includes('OFFSHORE WIND');
  const isBhadla = nameUpper.includes('BHADLA') || nameUpper.includes('SOLAR');

  if (isCERN) {
    // CERN LHC Particle Accelerator Ring & ATLAS Detector Octagonal Magnets
    const segs = 36, rRing = 2.4;
    const ringOffset = nodes.length;
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      nodes.push({ x: Math.cos(a) * rRing, y: -0.2, z: Math.sin(a) * rRing, stress: getStress(s) });
      nodes.push({ x: Math.cos(a) * (rRing + 0.15), y: -0.2, z: Math.sin(a) * (rRing + 0.15), stress: getStress(s + 1) });
    }
    for (let s = 0; s < segs; s++) {
      const b = ringOffset + s * 2;
      const nb = ringOffset + ((s + 1) % segs) * 2;
      edges.push({ a: b, b: b + 1 });
      edges.push({ a: b, b: nb });
      edges.push({ a: b + 1, b: nb + 1 });
    }
    // ATLAS Detector Octagonal Toroid Magnet Assembly
    const octCoils = 8, octR = 1.1;
    const atlasOffset = nodes.length;
    for (let c = 0; c < octCoils; c++) {
      const a = (c / octCoils) * Math.PI * 2;
      const x = Math.cos(a) * octR, z = Math.sin(a) * octR;
      nodes.push({ x, y: -0.8, z, stress: 0.8 });
      nodes.push({ x, y: 0.8, z, stress: 0.8 });
    }
    for (let c = 0; c < octCoils; c++) {
      const base = atlasOffset + c * 2;
      edges.push({ a: base, b: base + 1 });
      const nextBase = atlasOffset + ((c + 1) % octCoils) * 2;
      edges.push({ a: base, b: nextBase });
      edges.push({ a: base + 1, b: nextBase + 1 });
    }
    return { nodes, edges };
  }

  if (isChenab) {
    // Chenab Railway Arch Bridge - Parabolic Steel Arch & Spandrel Piers
    const spans = 16, w = 2.8;
    const archOffset = nodes.length;
    for (let i = 0; i <= spans; i++) {
      const t = i / spans;
      const x = (t - 0.5) * w;
      const archY = -0.9 + 1.3 * (1 - Math.pow((x / (w / 2)), 2));
      const deckY = 0.4;
      nodes.push({ x, y: archY, z: -0.3, stress: getStress(i) });
      nodes.push({ x, y: archY, z: 0.3, stress: getStress(i + 1) });
      nodes.push({ x, y: deckY, z: -0.3, stress: getStress(i + 2) });
      nodes.push({ x, y: deckY, z: 0.3, stress: getStress(i + 3) });
    }
    for (let i = 0; i <= spans; i++) {
      const b = archOffset + i * 4;
      edges.push({ a: b, b: b + 1 }); // Arch cross
      edges.push({ a: b + 2, b: b + 3 }); // Deck cross
      edges.push({ a: b, b: b + 2 }); // Spandrel column L
      edges.push({ a: b + 1, b: b + 3 }); // Spandrel column R
      if (i < spans) {
        const nb = b + 4;
        edges.push({ a: b, b: nb }); // Arch rib L
        edges.push({ a: b + 1, b: nb + 1 }); // Arch rib R
        edges.push({ a: b + 2, b: nb + 2 }); // Deck girder L
        edges.push({ a: b + 3, b: nb + 3 }); // Deck girder R
        edges.push({ a: b, b: nb + 2 }); // Diagonal brace
      }
    }
    return { nodes, edges };
  }

  if (isBandra) {
    // Bandra-Worli Sea Link - Twin Diamond Cable-Stayed Pylons & Fan Cables
    const pylons = [-0.6, 0.6];
    pylons.forEach(px => {
      const pylonOffset = nodes.length;
      const topY = 1.4, baseY = -0.8;
      nodes.push({ x: px, y: baseY, z: -0.4, stress: 0.4 });
      nodes.push({ x: px, y: baseY, z: 0.4, stress: 0.4 });
      nodes.push({ x: px, y: 0.2, z: 0.0, stress: 0.6 });
      nodes.push({ x: px, y: topY, z: 0.0, stress: 0.8 });
      edges.push({ a: pylonOffset, b: pylonOffset + 2 });
      edges.push({ a: pylonOffset + 1, b: pylonOffset + 2 });
      edges.push({ a: pylonOffset + 2, b: pylonOffset + 3 });

      // Stay Cables
      const cableSegs = 6;
      for (let c = -cableSegs; c <= cableSegs; c++) {
        if (c === 0) continue;
        const cx = px + c * 0.15;
        const deckIdx = nodes.length;
        nodes.push({ x: cx, y: 0.0, z: (c % 2 === 0 ? 0.2 : -0.2), stress: 0.5 });
        edges.push({ a: pylonOffset + 3, b: deckIdx });
      }
    });
    return { nodes, edges };
  }

  if (isThreeGorges) {
    // Three Gorges Hydroelectric Dam - Concrete Gravity Wall & Penstock Channels
    const damBays = 12, damH = 1.6, damW = 2.6;
    for (let b = 0; b <= damBays; b++) {
      const x = (b / damBays - 0.5) * damW;
      nodes.push({ x, y: -damH / 2, z: -0.6, stress: 0.3 }); // Base heel
      nodes.push({ x, y: -damH / 2, z: 0.6, stress: 0.3 }); // Base toe
      nodes.push({ x, y: damH / 2, z: -0.2, stress: 0.5 }); // Crest upstream
      nodes.push({ x, y: damH / 2, z: 0.2, stress: 0.5 }); // Crest downstream
    }
    for (let b = 0; b <= damBays; b++) {
      const base = b * 4;
      edges.push({ a: base, b: base + 1 });
      edges.push({ a: base + 2, b: base + 3 });
      edges.push({ a: base, b: base + 2 });
      edges.push({ a: base + 1, b: base + 3 });
      if (b < damBays) {
        const next = (b + 1) * 4;
        edges.push({ a: base, b: next });
        edges.push({ a: base + 1, b: next + 1 });
        edges.push({ a: base + 2, b: next + 2 });
        edges.push({ a: base + 3, b: next + 3 });
        // Penstock Pipe Lines
        edges.push({ a: base + 2, b: next + 1 });
      }
    }
    return { nodes, edges };
  }

  if (isGotthard) {
    // Gotthard Base Tunnel - Twin Parallel Horseshoe Tunnels & Cross Passages
    const rings = 12, segs = 10, tunnelLen = 2.8;
    const tubeOffsets = [-0.65, 0.65];
    tubeOffsets.forEach(tx => {
      const tubeBase = nodes.length;
      for (let r = 0; r <= rings; r++) {
        const z = (r / rings - 0.5) * tunnelLen;
        for (let s = 0; s < segs; s++) {
          const a = (s / segs) * Math.PI;
          const x = tx + Math.cos(a) * 0.45;
          const y = Math.sin(a) * 0.45 - 0.2;
          nodes.push({ x, y, z, stress: getStress(r * segs + s) });
        }
      }
      for (let r = 0; r <= rings; r++) {
        for (let s = 0; s < segs; s++) {
          const idx = tubeBase + r * segs + s;
          const nextS = tubeBase + r * segs + ((s + 1) % segs);
          edges.push({ a: idx, b: nextS });
          if (r < rings) {
            edges.push({ a: idx, b: idx + segs });
          }
        }
      }
    });
    // Cross Passages
    for (let r = 2; r < rings; r += 3) {
      const idxL = r * segs;
      const idxR = (rings + 1) * segs + r * segs;
      edges.push({ a: idxL, b: idxR });
    }
    return { nodes, edges };
  }

  if (isAkashi) {
    // Akashi Kaikyo Suspension Bridge - Dual 298m Towers & Catenary Cables
    const towers = [-1.0, 1.0];
    towers.forEach(tx => {
      const tBase = nodes.length;
      nodes.push({ x: tx, y: -0.8, z: -0.3, stress: 0.3 });
      nodes.push({ x: tx, y: -0.8, z: 0.3, stress: 0.3 });
      nodes.push({ x: tx, y: 1.2, z: -0.3, stress: 0.7 });
      nodes.push({ x: tx, y: 1.2, z: 0.3, stress: 0.7 });
      edges.push({ a: tBase, b: tBase + 2 });
      edges.push({ a: tBase + 1, b: tBase + 3 });
      edges.push({ a: tBase + 2, b: tBase + 3 });
      edges.push({ a: tBase, b: tBase + 3 });
      edges.push({ a: tBase + 1, b: tBase + 2 });
    });
    // Main Catenary Cable & Suspenders
    const cableSteps = 20;
    const catOffset = nodes.length;
    for (let i = 0; i <= cableSteps; i++) {
      const t = i / cableSteps;
      const x = (t - 0.5) * 2.8;
      const sag = 0.7 * Math.cos((x / 1.4) * (Math.PI / 2));
      const y = 1.2 - sag;
      nodes.push({ x, y, z: -0.3, stress: 0.5 });
      nodes.push({ x, y: 0.0, z: -0.3, stress: 0.4 }); // Deck suspender node
      edges.push({ a: catOffset + i * 2, b: catOffset + i * 2 + 1 });
      if (i < cableSteps) {
        edges.push({ a: catOffset + i * 2, b: catOffset + (i + 1) * 2 });
        edges.push({ a: catOffset + i * 2 + 1, b: catOffset + (i + 1) * 2 + 1 });
      }
    }
    return { nodes, edges };
  }

  if (isHoover) {
    // Hoover Dam - Curved Arch-Gravity Dam & 4 Intake Towers
    const archSegs = 14, archH = 1.5;
    const damOffset = nodes.length;
    for (let s = 0; s <= archSegs; s++) {
      const a = (s / archSegs - 0.5) * (Math.PI * 0.7);
      const r = 1.6;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r - 1.2;
      nodes.push({ x, y: -archH / 2, z: z - 0.3, stress: 0.3 });
      nodes.push({ x, y: -archH / 2, z: z + 0.3, stress: 0.3 });
      nodes.push({ x, y: archH / 2, z: z - 0.15, stress: 0.6 });
      nodes.push({ x, y: archH / 2, z: z + 0.15, stress: 0.6 });
    }
    for (let s = 0; s <= archSegs; s++) {
      const b = damOffset + s * 4;
      edges.push({ a: b, b: b + 1 });
      edges.push({ a: b + 2, b: b + 3 });
      edges.push({ a: b, b: b + 2 });
      edges.push({ a: b + 1, b: b + 3 });
      if (s < archSegs) {
        const nb = b + 4;
        edges.push({ a: b, b: nb });
        edges.push({ a: b + 1, b: nb + 1 });
        edges.push({ a: b + 2, b: nb + 2 });
        edges.push({ a: b + 3, b: nb + 3 });
      }
    }
    return { nodes, edges };
  }

  if (isHornsea) {
    // Hornsea Offshore Wind Farm - 4 Wind Turbines & Substation Platform
    const positions = [
      { x: -0.9, z: -0.6 },
      { x: 0.9, z: -0.6 },
      { x: -0.9, z: 0.6 },
      { x: 0.9, z: 0.6 },
    ];
    positions.forEach((pos) => {
      const tBase = nodes.length;
      nodes.push({ x: pos.x, y: -0.8, z: pos.z, stress: 0.2 }); // Monopile sea base
      nodes.push({ x: pos.x, y: 0.8, z: pos.z, stress: 0.5 });  // Tower top nacelle
      edges.push({ a: tBase, b: tBase + 1 });
      // 3 Blades
      for (let b = 0; b < 3; b++) {
        const angle = (b / 3) * Math.PI * 2;
        const bx = pos.x + Math.cos(angle) * 0.5;
        const by = 0.8 + Math.sin(angle) * 0.5;
        const bladeIdx = nodes.length;
        nodes.push({ x: bx, y: by, z: pos.z + 0.05, stress: 0.6 });
        edges.push({ a: tBase + 1, b: bladeIdx });
      }
    });
    return { nodes, edges };
  }

  if (isBhadla) {
    // Bhadla Solar Park - 4x4 Tracking PV Solar Panel Matrix Array
    const rows = 4, cols = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = (c / (cols - 1) - 0.5) * 2.2;
        const pz = (r / (rows - 1) - 0.5) * 1.8;
        const panelBase = nodes.length;
        // Panel pedestal post
        nodes.push({ x: px, y: -0.5, z: pz, stress: 0.2 });
        nodes.push({ x: px, y: 0.0, z: pz, stress: 0.4 });
        edges.push({ a: panelBase, b: panelBase + 1 });
        // Tilted Panel corners
        nodes.push({ x: px - 0.2, y: 0.15, z: pz - 0.15, stress: 0.3 });
        nodes.push({ x: px + 0.2, y: 0.15, z: pz - 0.15, stress: 0.3 });
        nodes.push({ x: px - 0.2, y: -0.15, z: pz + 0.15, stress: 0.3 });
        nodes.push({ x: px + 0.2, y: -0.15, z: pz + 0.15, stress: 0.3 });
        edges.push({ a: panelBase + 2, b: panelBase + 3 });
        edges.push({ a: panelBase + 3, b: panelBase + 5 });
        edges.push({ a: panelBase + 5, b: panelBase + 4 });
        edges.push({ a: panelBase + 4, b: panelBase + 2 });
        edges.push({ a: panelBase + 1, b: panelBase + 2 });
        edges.push({ a: panelBase + 1, b: panelBase + 3 });
      }
    }
    return { nodes, edges };
  }

  // Fallback high-span truss
  const spans = 12;
  const w = 2.6, h = 1.4, d = 1.0;
  for (let i = 0; i <= spans; i++) {
    const x = (i / spans - 0.5) * w;
    nodes.push({ x, y: -h / 2, z: -d / 2, stress: getStress(i * 3) });
    nodes.push({ x, y: -h / 2, z: d / 2, stress: getStress(i * 3 + 1) });
    nodes.push({ x, y: h / 2, z: 0, stress: getStress(i * 3 + 2) });
  }
  for (let i = 0; i <= spans; i++) {
    const base = i * 3;
    edges.push({ a: base, b: base + 1 });
    edges.push({ a: base, b: base + 2 });
    edges.push({ a: base + 1, b: base + 2 });
    if (i < spans) {
      const next = (i + 1) * 3;
      edges.push({ a: base, b: next });
      edges.push({ a: base + 1, b: next + 1 });
      edges.push({ a: base + 2, b: next + 2 });
    }
  }
  return { nodes, edges };
}

function stressColor(stress: number, heatmap: boolean): string {
  if (!heatmap) return `rgba(100, 140, 255, ${0.4 + stress * 0.4})`;
  if (stress < 0.3) return `rgba(34, 197, 94, ${0.5 + stress})`;
  if (stress < 0.6) return `rgba(250, 204, 21, ${0.5 + stress * 0.5})`;
  if (stress < 0.8) return `rgba(249, 115, 22, ${0.6 + stress * 0.3})`;
  return `rgba(239, 68, 68, ${0.7 + stress * 0.3})`;
}

function project(node: BIMNode, rx: number, ry: number, zoom: number, cx: number, cy: number, exploded: boolean) {
  let { x, y, z } = node;
  if (exploded) { x *= 1.4; y *= 1.4; z *= 1.4; }
  // Rotate Y
  const cosY = Math.cos(ry), sinY = Math.sin(ry);
  const x1 = x * cosY - z * sinY, z1 = x * sinY + z * cosY;
  // Rotate X
  const cosX = Math.cos(rx), sinX = Math.sin(rx);
  const y1 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX;
  // Perspective
  const perspective = 4;
  const scale = (perspective / (perspective + z2 + 2)) * zoom * 200;
  return { sx: cx + x1 * scale, sy: cy - y1 * scale, depth: z2 };
}

export const BIMViewerPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedModelIdx, setSelectedModelIdx] = useState(0);
  const [heatmapOverlay, setHeatmapOverlay] = useState(true);
  const [explodedView, setExplodedView] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [rotX, setRotX] = useState(-0.3);
  const [rotY, setRotY] = useState(0.5);
  const [autoRotate, setAutoRotate] = useState(true);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const structureRef = useRef(generateStructure(0));
  const animFrameRef = useRef(0);
  const autoRotRef = useRef(autoRotate);
  const rotYRef = useRef(rotY);
  const rotXRef = useRef(rotX);
  const zoomRef = useRef(zoomLevel);
  const heatmapRef = useRef(heatmapOverlay);
  const explodedRef = useRef(explodedView);

  // Live stress jitter
  const [liveStress, setLiveStress] = useState(142.8);
  const [liveElements, setLiveElements] = useState(14280);

  const [modelNames, setModelNames] = useState<any[]>([
    { id: 1, name: 'Primary Infrastructure Structure', elements: 14280, stress: 142.8, hotspot: 'Anchor Pier #2 (140.0 MPa)', rating: 'NOMINAL' },
  ]);

  useEffect(() => {
    let mounted = true;
    async function pollRealAssets() {
      try {
        const { bimApi } = await import('@/lib/api');
        const res = await bimApi.getModels();
        if (!mounted) return;
        if (res?.data?.models?.length > 0) {
          const apiModels = res.data.models.map((m: any) => ({
            id: m.assetId,
            name: m.assetName || m.name,
            bimType: m.bimType || 'CIVIL_INFRASTRUCTURE',
            elements: m.elementCount || 10000,
            stress: m.structuralStressMPa || 120,
            hotspot: m.hotspots?.[0] ? `${m.hotspots[0].elementId} (${m.hotspots[0].valueMPa} MPa)` : 'Optimal',
            rating: m.healthRating || 'NOMINAL',
            magneticFieldTesla: m.magneticFieldTesla,
            plasmaTempMillionC: m.plasmaTempMillionC,
            cryostatVacuumPa: m.cryostatVacuumPa,
            activeCoils: m.activeCoils,
            totalCoils: m.totalCoils,
          }));
          setModelNames(apiModels);
        }
      } catch (err) {
        console.error('Failed to load real assets for BIM viewer:', err);
      }
    }
    pollRealAssets();
    const interval = setInterval(pollRealAssets, 4000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const activeModel = modelNames[selectedModelIdx] || modelNames[0] || {
    id: 1,
    name: 'Primary Infrastructure Structure',
    elements: 10000,
    stress: 100,
    hotspot: 'N/A',
    rating: 'NOMINAL',
  };

  // Sync refs
  useEffect(() => { autoRotRef.current = autoRotate; }, [autoRotate]);
  useEffect(() => { rotYRef.current = rotY; }, [rotY]);
  useEffect(() => { rotXRef.current = rotX; }, [rotX]);
  useEffect(() => { zoomRef.current = zoomLevel; }, [zoomLevel]);
  useEffect(() => { heatmapRef.current = heatmapOverlay; }, [heatmapOverlay]);
  useEffect(() => { explodedRef.current = explodedView; }, [explodedView]);

  const [stressStats, setStressStats] = useState({ normal: 0, elevated: 0, high: 0, critical: 0, total: 0 });

  // Regenerate structure deterministically when active model data changes
  useEffect(() => {
    if (activeModel) {
      structureRef.current = generateStructure(selectedModelIdx, activeModel.stress / 200, activeModel.id, activeModel.name);
      setLiveStress(activeModel.stress);
      setLiveElements(activeModel.elements);
    }
  }, [activeModel, selectedModelIdx]);

  // Stable real-time node stress breakdown analytics
  useEffect(() => {
    if (!activeModel || !structureRef.current?.nodes) return;
    
    let n = 0, e = 0, h = 0, c = 0;
    structureRef.current.nodes.forEach((node) => {
      const liveVal = node.stress;
      if (liveVal < 0.3) n++;
      else if (liveVal < 0.6) e++;
      else if (liveVal < 0.8) h++;
      else c++;
    });

    const total = structureRef.current.nodes.length || 1;
    setStressStats({ normal: n, elevated: e, high: h, critical: c, total });
  }, [activeModel, selectedModelIdx]);

  // Canvas render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width, H = rect.height;
    const cx = W / 2, cy = H / 2;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#f8fafc');
    bgGrad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Grid floor
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    for (let i = -20; i <= 20; i++) {
      const p1 = project({ x: i * 0.15, y: -1.2, z: -3, stress: 0 }, rotXRef.current, rotYRef.current, zoomRef.current, cx, cy, false);
      const p2 = project({ x: i * 0.15, y: -1.2, z: 3, stress: 0 }, rotXRef.current, rotYRef.current, zoomRef.current, cx, cy, false);
      ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy); ctx.stroke();
      const p3 = project({ x: -3, y: -1.2, z: i * 0.15, stress: 0 }, rotXRef.current, rotYRef.current, zoomRef.current, cx, cy, false);
      const p4 = project({ x: 3, y: -1.2, z: i * 0.15, stress: 0 }, rotXRef.current, rotYRef.current, zoomRef.current, cx, cy, false);
      ctx.beginPath(); ctx.moveTo(p3.sx, p3.sy); ctx.lineTo(p4.sx, p4.sy); ctx.stroke();
    }

    const { nodes, edges } = structureRef.current;

    // Project all nodes
    const projected = nodes.map(n => project(n, rotXRef.current, rotYRef.current, zoomRef.current, cx, cy, explodedRef.current));

    // Sort edges by depth for painter's algorithm
    const sortedEdges = [...edges].sort((a, b) => {
      const da = (projected[a.a].depth + projected[a.b].depth) / 2;
      const db = (projected[b.a].depth + projected[b.b].depth) / 2;
      return db - da;
    });

    // Draw edges
    sortedEdges.forEach(({ a, b }) => {
      const pa = projected[a], pb = projected[b];
      const avgStress = (nodes[a].stress + nodes[b].stress) / 2;
      ctx.strokeStyle = stressColor(avgStress, heatmapRef.current);
      ctx.lineWidth = 1.5 + avgStress;
      ctx.beginPath();
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
      ctx.stroke();
    });

    // Draw nodes
    const sortedNodes = nodes.map((n, i) => ({ ...n, ...projected[i], idx: i })).sort((a, b) => b.depth - a.depth);
    sortedNodes.forEach(n => {
      const r = 2 + n.stress * 3;
      ctx.fillStyle = stressColor(n.stress, heatmapRef.current);
      ctx.beginPath();
      ctx.arc(n.sx, n.sy, r, 0, Math.PI * 2);
      ctx.fill();

      // Glow for high-stress nodes
      if (n.stress > 0.75) {
        ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + Math.sin(Date.now() * 0.005) * 0.1})`;
        ctx.beginPath();
        ctx.arc(n.sx, n.sy, r + 6, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // HUD overlay — axes
    const axLen = 30;
    const axOrg = { x: W - 60, y: H - 50 };
    const axes = [
      { dx: 1, dy: 0, dz: 0, color: '#ef4444', label: 'X' },
      { dx: 0, dy: 1, dz: 0, color: '#22c55e', label: 'Y' },
      { dx: 0, dy: 0, dz: 1, color: '#3b82f6', label: 'Z' },
    ];
    axes.forEach(ax => {
      const p = project({ x: ax.dx * 0.3, y: ax.dy * 0.3, z: ax.dz * 0.3, stress: 0 }, rotXRef.current, rotYRef.current, 1, 0, 0, false);
      ctx.strokeStyle = ax.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(axOrg.x, axOrg.y);
      ctx.lineTo(axOrg.x + p.sx * axLen * 2, axOrg.y - p.sy * axLen * 2);
      ctx.stroke();
      ctx.fillStyle = ax.color;
      ctx.font = 'bold 10px monospace';
      ctx.fillText(ax.label, axOrg.x + p.sx * axLen * 2.5, axOrg.y - p.sy * axLen * 2.5);
    });

    // Auto-rotate
    if (autoRotRef.current) {
      rotYRef.current += 0.004;
      setRotY(rotYRef.current);
    }

    animFrameRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      setZoomLevel(prev => Math.max(0.4, Math.min(3.0, prev - e.deltaY * 0.001)));
    };
    canvas.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheelNative);
    };
  }, []);

  // Mouse interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setAutoRotate(false);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    setRotY(prev => prev + dx * 0.005);
    setRotX(prev => Math.max(-Math.PI / 2, Math.min(Math.PI / 2, prev + dy * 0.005)));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => { isDragging.current = false; };

  return (
    <div className="space-y-6 w-full animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              3D BIM CAD Digital Twin Visualizer
            </h1>
            <span className="bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5" /> IFC4 WebGL Mesh
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-base font-medium">
            Interactive 3D structural wireframe with live stress heatmaps. Drag to orbit, scroll to zoom.
          </p>
        </div>

        <select
          value={selectedModelIdx}
          onChange={e => setSelectedModelIdx(Number(e.target.value))}
          className="h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white shadow-sm"
        >
          {modelNames.map((m, i) => (
            <option key={i} value={i}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* 3D Canvas Viewport */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl relative flex flex-col">
        {/* HUD Header */}
        <div className="p-3 bg-slate-900 dark:bg-black/80 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-white">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-extrabold truncate">{activeModel.name}</span>
            <span className="bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 text-[10px]">
              {liveElements.toLocaleString()} ELEMENTS
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHeatmapOverlay(!heatmapOverlay)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${heatmapOverlay ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <Flame className="w-3.5 h-3.5" /> Heatmap
            </button>
            <button
              onClick={() => setExplodedView(!explodedView)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${explodedView ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <Layers className="w-3.5 h-3.5" /> Exploded
            </button>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${autoRotate ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Auto-Rotate
            </button>
          </div>
        </div>

        {/* Interactive 3D Canvas */}
        <div className="relative" style={{ height: 480 }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/90 dark:bg-black/70 p-2 rounded-xl border border-slate-700 dark:border-white/10 text-white shadow-lg">
            <button onClick={() => setZoomLevel(z => Math.min(3.0, z + 0.2))} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold px-1">{zoomLevel.toFixed(1)}x</span>
            <button onClick={() => setZoomLevel(z => Math.max(0.4, z - 0.2))} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Live Dynamic Stress Legend */}
          {heatmapOverlay && (
            <div className="absolute top-4 left-4 bg-slate-900/90 dark:bg-black/80 p-3.5 rounded-2xl border border-slate-700 dark:border-white/10 text-[10px] font-mono text-white space-y-1.5 shadow-2xl min-w-[210px] backdrop-blur-md">
              <p className="font-extrabold text-xs mb-1 flex items-center justify-between border-b border-white/10 pb-1.5 text-cyan-300">
                <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-cyan-400" /> LIVE STRESS BREAKDOWN</span>
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 0–30% Normal</span>
                <span className="font-bold text-emerald-400">{stressStats.total ? Math.round((stressStats.normal / stressStats.total) * 100) : 0}% ({stressStats.normal})</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> 30–60% Elevated</span>
                <span className="font-bold text-yellow-300">{stressStats.total ? Math.round((stressStats.elevated / stressStats.total) * 100) : 0}% ({stressStats.elevated})</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> 60–80% High</span>
                <span className="font-bold text-orange-400">{stressStats.total ? Math.round((stressStats.high / stressStats.total) * 100) : 0}% ({stressStats.high})</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> 80%+ Critical</span>
                <span className="font-bold text-red-400">{stressStats.total ? Math.round((stressStats.critical / stressStats.total) * 100) : 0}% ({stressStats.critical})</span>
              </div>
            </div>
          )}

          {/* Fusion Tokamak Nuclear Physics Core Telemetry HUD */}
          {(activeModel.name.includes('ITER') || activeModel.name.includes('Tokamak') || activeModel.name.includes('Fusion') || activeModel.bimType === 'TOKAMAK_FUSION_REACTOR') && (
            <div className="absolute top-4 right-14 bg-slate-900/90 dark:bg-slate-950/90 p-3.5 rounded-2xl border border-cyan-500/30 text-[10px] font-mono text-cyan-300 space-y-1.5 backdrop-blur-md shadow-2xl">
              <p className="font-extrabold text-xs text-white flex items-center gap-1.5 pb-1 border-b border-cyan-500/20">
                <Zap className="w-3.5 h-3.5 text-yellow-400 animate-pulse" /> {activeModel.name.toUpperCase().split(' ')[0]} TELEMETRY HUD
              </p>
              <p className="flex justify-between gap-4"><span>MAGNETIC FIELD:</span> <span className="text-yellow-400 font-bold">{activeModel.magneticFieldTesla || 11.8} TESLA</span></p>
              <p className="flex justify-between gap-4"><span>PLASMA CORE TEMP:</span> <span className="text-rose-400 font-bold">{((activeModel.plasmaTempMillionC || 150) * 1000000).toLocaleString()} °C</span></p>
              <p className="flex justify-between gap-4"><span>CRYOSTAT VACUUM:</span> <span className="text-emerald-400 font-bold">{activeModel.cryostatVacuumPa || '1.0e-7'} Pa (4.2 K)</span></p>
              <p className="flex justify-between gap-4"><span>D-FIELD COILS:</span> <span className="text-cyan-400 font-bold">{activeModel.activeCoils || 18} / {activeModel.totalCoils || 18} ONLINE</span></p>
            </div>
          )}
        </div>

        {/* Structural Metrics Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono text-slate-600 dark:text-slate-300">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[10px]">AVG STRUCTURAL STRESS</span>
            <span className="font-extrabold text-indigo-600 dark:text-cyan-400 text-sm">{liveStress} MPa</span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[10px]">HIGHEST STRESS POINT</span>
            <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm">{activeModel.hotspot}</span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[10px]">BIM HEALTH RATING</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{activeModel.rating}</span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[10px]">RENDER STATUS</span>
            <span className="font-extrabold text-cyan-600 dark:text-cyan-400 text-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 60 FPS LIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
