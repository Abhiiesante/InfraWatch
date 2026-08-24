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

interface BIMHotspotNode {
  x: number;
  y: number;
  z: number;
  label: string;
  valueMPa: number;
  stressLevel: string;
}

function generateStructure(
  _modelIdx: number,
  baseStressVal: number = 0.5,
  assetId: number = 0,
  modelName: string = '',
  bimType: string = '',
  rawHotspots: any[] = []
): { nodes: BIMNode[]; edges: BIMEdge[]; hotspotNodes: BIMHotspotNode[] } {
  const nodes: BIMNode[] = [];
  const edges: BIMEdge[] = [];
  const hotspotNodes: BIMHotspotNode[] = [];

  const pseudoRandom = (seed: number) => (Math.sin(seed * 12.9898 + assetId) * 43758.5453) % 1;
  const getStress = (seed: number) => Math.max(0, Math.min(1, baseStressVal * (0.8 + Math.abs(pseudoRandom(seed)) * 0.4)));

  const nameUpper = (modelName || '').toUpperCase();
  const typeUpper = (bimType || '').toUpperCase();

  const isTokamak = typeUpper.includes('REACTOR') || typeUpper.includes('TOKAMAK') || nameUpper.includes('ITER') || nameUpper.includes('TOKAMAK') || nameUpper.includes('FUSION') || assetId === 999;
  const isCERN = typeUpper.includes('COLLIDER') || nameUpper.includes('CERN') || nameUpper.includes('HADRON') || nameUpper.includes('ATLAS');
  const isArchBridge = typeUpper.includes('ARCH') || nameUpper.includes('CHENAB') || nameUpper.includes('RAILWAY ARCH') || nameUpper.includes('KAMALA');
  const isCableBridge = typeUpper.includes('CABLE') || typeUpper.includes('SUSPENSION') || typeUpper.includes('BRIDGE') || nameUpper.includes('BANDRA') || nameUpper.includes('SEA LINK') || nameUpper.includes('WESTSHORE') || nameUpper.includes('PEARL') || nameUpper.includes('NARUTO') || nameUpper.includes('AKASHI') || nameUpper.includes('STRAIT');
  const isDam = typeUpper.includes('DAM') || nameUpper.includes('THREE GORGES') || nameUpper.includes('YANGTZE') || nameUpper.includes('HOOVER') || nameUpper.includes('LONGSHAN') || nameUpper.includes('REDROCK');
  const isTunnel = typeUpper.includes('TUNNEL') || nameUpper.includes('GOTTHARD') || nameUpper.includes('ALBION');
  const isWind = typeUpper.includes('WIND') || nameUpper.includes('HORNSEA') || nameUpper.includes('TURBINE') || nameUpper.includes('NORTHSEA');
  const isSolar = typeUpper.includes('SOLAR') || nameUpper.includes('BHADLA') || nameUpper.includes('PHOTOVOLTAIC') || nameUpper.includes('SURYANAGAR');
  const isSubstation = nameUpper.includes('SUBSTATION') || nameUpper.includes('DELTA STATION') || nameUpper.includes('TRANSFORMER') || typeUpper.includes('SUBSTATION');
  const isPipelineCorridor = nameUpper.includes('PIPELINE') || nameUpper.includes('ZETA CORRIDOR') || (nameUpper.includes('REFINERY') && nameUpper.includes('PIPELINE'));
  const isWarehouse = nameUpper.includes('WAREHOUSE') || nameUpper.includes('HUB EPSILON') || typeUpper.includes('WAREHOUSE') || nameUpper.includes('RACKING');
  const isDemolition = nameUpper.includes('DEMOLITION') || nameUpper.includes('ALPHA SITE') || nameUpper.includes('CONSTRUCTION');
  const isPlantTowers = nameUpper.includes('BETA COMPLEX') || nameUpper.includes('PROCESSING TOWERS') || (nameUpper.includes('PLANT') && nameUpper.includes('TOWER')) || nameUpper.includes('FRACTIONATION');
  const isIndustrial = typeUpper.includes('INDUSTRIAL') || typeUpper.includes('FACILITY') || typeUpper.includes('PLANT') || nameUpper.includes('INDUSTRIAL');

  if (isTokamak) {
    // 1. Toroidal Vacuum Chamber Vessel (Torus Core)
    const phiSteps = 24;
    const thetaSteps = 12;
    const R0 = 1.3;
    const r0 = 0.52;

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

        const wallStress = Math.min(1.0, getStress(i * 100 + j) + (cosTheta < -0.2 ? 0.35 : 0.05));
        nodes.push({ x, y, z, stress: wallStress });
      }
    }

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
          edges.push({ a: idx, b: torusOffset + nextI * thetaSteps + nextJ });
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

    // Hotspot positioning for Tokamak
    hotspotNodes.push({
      x: 0.0,
      y: 0.4,
      z: 1.3,
      label: rawHotspots[0]?.elementId || 'D-Coil #04 Cryostat Feeder',
      valueMPa: rawHotspots[0]?.valueMPa || 140.0,
      stressLevel: rawHotspots[0]?.stressLevel || 'HIGH',
    });

    return { nodes, edges, hotspotNodes };
  }


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
    hotspotNodes.push({
      x: 0.8,
      y: 0.0,
      z: 0.8,
      label: rawHotspots[0]?.elementId || 'ATLAS Toroid Octant #04',
      valueMPa: rawHotspots[0]?.valueMPa || 132.5,
      stressLevel: rawHotspots[0]?.stressLevel || 'HIGH',
    });
    return { nodes, edges, hotspotNodes };
  }

  if (isWarehouse) {
    // 3D Warehouse Bay Storage Racks Grid & AMR Aisles
    const racks = 4;
    const bays = 6;
    const levels = 3;
    const rW = 2.4, rD = 1.6, rH = 1.0;

    for (let r = 0; r < racks; r++) {
      const z = (r / (racks - 1) - 0.5) * rD;
      for (let b = 0; b < bays; b++) {
        const x = (b / (bays - 1) - 0.5) * rW;
        const colBase = nodes.length;
        for (let l = 0; l <= levels; l++) {
          const y = (l / levels - 0.5) * rH;
          nodes.push({ x, y, z: z - 0.15, stress: getStress(r * 20 + b * 5 + l) });
          nodes.push({ x, y, z: z + 0.15, stress: getStress(r * 20 + b * 5 + l + 1) });
        }
        for (let l = 0; l <= levels; l++) {
          const base = colBase + l * 2;
          edges.push({ a: base, b: base + 1 });
          if (l < levels) {
            edges.push({ a: base, b: base + 2 });
            edges.push({ a: base + 1, b: base + 3 });
          }
        }
      }
    }

    hotspotNodes.push({
      x: 0.4,
      y: 0.1,
      z: 0.2,
      label: rawHotspots[0]?.elementId || 'Rack Bay C-04 Load Beam',
      valueMPa: rawHotspots[0]?.valueMPa || 88.5,
      stressLevel: rawHotspots[0]?.stressLevel || 'ELEVATED',
    });

    return { nodes, edges, hotspotNodes };
  }

  if (isArchBridge) {
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
      edges.push({ a: b, b: b + 1 });
      edges.push({ a: b + 2, b: b + 3 });
      edges.push({ a: b, b: b + 2 });
      edges.push({ a: b + 1, b: b + 3 });
      if (i < spans) {
        const nb = b + 4;
        edges.push({ a: b, b: nb });
        edges.push({ a: b + 1, b: nb + 1 });
        edges.push({ a: b + 2, b: nb + 2 });
        edges.push({ a: b + 3, b: nb + 3 });
        edges.push({ a: b, b: nb + 2 });
      }
    }
    hotspotNodes.push({
      x: 0.0,
      y: 0.4,
      z: 0.3,
      label: rawHotspots[0]?.elementId || 'Arch Crown Apex Girder',
      valueMPa: rawHotspots[0]?.valueMPa || 140.0,
      stressLevel: rawHotspots[0]?.stressLevel || 'CRITICAL',
    });
    return { nodes, edges, hotspotNodes };
  }

  if (isCableBridge) {
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

      const cableSegs = 6;
      for (let c = -cableSegs; c <= cableSegs; c++) {
        if (c === 0) continue;
        const cx = px + c * 0.15;
        const deckIdx = nodes.length;
        nodes.push({ x: cx, y: 0.0, z: (c % 2 === 0 ? 0.2 : -0.2), stress: 0.5 });
        edges.push({ a: pylonOffset + 3, b: deckIdx });
      }
    });
    hotspotNodes.push({
      x: -0.6,
      y: -0.8,
      z: 0.4,
      label: rawHotspots[0]?.elementId || 'Anchor Pier #2',
      valueMPa: rawHotspots[0]?.valueMPa || 140.0,
      stressLevel: rawHotspots[0]?.stressLevel || 'CRITICAL',
    });
    return { nodes, edges, hotspotNodes };
  }

  if (isDam) {
    // Hydroelectric Dam - Concrete Gravity Wall & Penstock Channels
    const damBays = 12, damH = 1.6, damW = 2.6;
    for (let b = 0; b <= damBays; b++) {
      const x = (b / damBays - 0.5) * damW;
      nodes.push({ x, y: -damH / 2, z: -0.6, stress: 0.3 });
      nodes.push({ x, y: -damH / 2, z: 0.6, stress: 0.3 });
      nodes.push({ x, y: damH / 2, z: -0.2, stress: 0.5 });
      nodes.push({ x, y: damH / 2, z: 0.2, stress: 0.5 });
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
        edges.push({ a: base + 2, b: next + 1 });
      }
    }
    hotspotNodes.push({
      x: 0.3,
      y: -0.4,
      z: 0.6,
      label: rawHotspots[0]?.elementId || 'Penstock Turbine Sluice #03',
      valueMPa: rawHotspots[0]?.valueMPa || 124.0,
      stressLevel: rawHotspots[0]?.stressLevel || 'HIGH',
    });
    return { nodes, edges, hotspotNodes };
  }

  if (isTunnel) {
    // Tunnel - Twin Parallel Horseshoe Tunnels & Cross Passages
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
    for (let r = 2; r < rings; r += 3) {
      const idxL = r * segs;
      const idxR = (rings + 1) * segs + r * segs;
      edges.push({ a: idxL, b: idxR });
    }
    hotspotNodes.push({
      x: 0.65,
      y: 0.1,
      z: 0.0,
      label: rawHotspots[0]?.elementId || 'Crown Vault Ring #18',
      valueMPa: rawHotspots[0]?.valueMPa || 118.0,
      stressLevel: rawHotspots[0]?.stressLevel || 'ELEVATED',
    });
    return { nodes, edges, hotspotNodes };
  }

  if (isWind) {
    // Offshore Wind Farm - Turbines & Substation Platform
    const positions = [
      { x: -0.9, z: -0.6 },
      { x: 0.9, z: -0.6 },
      { x: -0.9, z: 0.6 },
      { x: 0.9, z: 0.6 },
    ];
    positions.forEach((pos) => {
      const tBase = nodes.length;
      nodes.push({ x: pos.x, y: -0.8, z: pos.z, stress: 0.2 });
      nodes.push({ x: pos.x, y: 0.8, z: pos.z, stress: 0.5 });
      edges.push({ a: tBase, b: tBase + 1 });
      for (let b = 0; b < 3; b++) {
        const angle = (b / 3) * Math.PI * 2;
        const bx = pos.x + Math.cos(angle) * 0.5;
        const by = 0.8 + Math.sin(angle) * 0.5;
        const bladeIdx = nodes.length;
        nodes.push({ x: bx, y: by, z: pos.z + 0.05, stress: 0.6 });
        edges.push({ a: tBase + 1, b: bladeIdx });
      }
    });
    hotspotNodes.push({
      x: 0.9,
      y: 0.8,
      z: -0.6,
      label: rawHotspots[0]?.elementId || 'Nacelle Yaw Bearing #02',
      valueMPa: rawHotspots[0]?.valueMPa || 112.0,
      stressLevel: rawHotspots[0]?.stressLevel || 'HIGH',
    });
    return { nodes, edges, hotspotNodes };
  }

  if (isSolar) {
    // Solar Park - Tracking PV Solar Panel Array
    const rows = 4, cols = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = (c / (cols - 1) - 0.5) * 2.2;
        const pz = (r / (rows - 1) - 0.5) * 1.8;
        const panelBase = nodes.length;
        nodes.push({ x: px, y: -0.5, z: pz, stress: 0.2 });
        nodes.push({ x: px, y: 0.0, z: pz, stress: 0.4 });
        edges.push({ a: panelBase, b: panelBase + 1 });
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
    hotspotNodes.push({
      x: 0.5,
      y: 0.0,
      z: 0.4,
      label: rawHotspots[0]?.elementId || 'PV Inverter Bus Junction D-04',
      valueMPa: rawHotspots[0]?.valueMPa || 76.0,
      stressLevel: rawHotspots[0]?.stressLevel || 'NOMINAL',
    });
    return { nodes, edges, hotspotNodes };
  }

  if (isSubstation) {
    // ⚡ 1. ELECTRICAL SUBSTATION & 230kV GRID TERMINAL (Delta Station)
    // Detailed Power Transformers, Radiator Cooling Fin Banks, 3 Bushings, Lattice Gantry Towers & Switchgear

    // Main Power Transformer Box Tank (Center)
    const tW = 0.9, tH = 0.8, tD = 0.7;
    const tBase = nodes.length;
    nodes.push({ x: -tW/2, y: -0.6, z: -tD/2, stress: getStress(1) });
    nodes.push({ x:  tW/2, y: -0.6, z: -tD/2, stress: getStress(2) });
    nodes.push({ x:  tW/2, y: -0.6, z:  tD/2, stress: getStress(3) });
    nodes.push({ x: -tW/2, y: -0.6, z:  tD/2, stress: getStress(4) });
    nodes.push({ x: -tW/2, y: -0.6 + tH, z: -tD/2, stress: getStress(5) });
    nodes.push({ x:  tW/2, y: -0.6 + tH, z: -tD/2, stress: getStress(6) });
    nodes.push({ x:  tW/2, y: -0.6 + tH, z:  tD/2, stress: getStress(7) });
    nodes.push({ x: -tW/2, y: -0.6 + tH, z:  tD/2, stress: getStress(8) });

    // Transformer box edges
    edges.push({ a: tBase, b: tBase + 1 }, { a: tBase + 1, b: tBase + 2 }, { a: tBase + 2, b: tBase + 3 }, { a: tBase + 3, b: tBase });
    edges.push({ a: tBase + 4, b: tBase + 5 }, { a: tBase + 5, b: tBase + 6 }, { a: tBase + 6, b: tBase + 7 }, { a: tBase + 7, b: tBase + 4 });
    edges.push({ a: tBase, b: tBase + 4 }, { a: tBase + 1, b: tBase + 5 }, { a: tBase + 2, b: tBase + 6 }, { a: tBase + 3, b: tBase + 7 });

    // Radiator Cooling Fin Banks (Left and Right)
    for (const side of [-1, 1]) {
      const xOffset = side * (tW/2 + 0.25);
      for (let fin = 0; fin < 5; fin++) {
        const z = -tD/2 + (fin / 4) * tD;
        const finBase = nodes.length;
        nodes.push({ x: xOffset - 0.15, y: -0.55, z, stress: getStress(20 + fin) });
        nodes.push({ x: xOffset + 0.15, y: -0.55, z, stress: getStress(21 + fin) });
        nodes.push({ x: xOffset + 0.15, y:  0.1, z, stress: getStress(22 + fin) });
        nodes.push({ x: xOffset - 0.15, y:  0.1, z, stress: getStress(23 + fin) });
        edges.push({ a: finBase, b: finBase + 1 }, { a: finBase + 1, b: finBase + 2 }, { a: finBase + 2, b: finBase + 3 }, { a: finBase + 3, b: finBase });
      }
    }

    // Top Oil Conservator Drum (Horizontal Cylinder on top of Transformer)
    const drumSegs = 8;
    for (let c = 0; c < 2; c++) {
      const z = -0.3 + c * 0.6;
      const cBase = nodes.length;
      for (let s = 0; s < drumSegs; s++) {
        const a = (s / drumSegs) * Math.PI * 2;
        nodes.push({ x: Math.cos(a) * 0.18, y: 0.35 + Math.sin(a) * 0.18, z, stress: getStress(40 + s) });
      }
      for (let s = 0; s < drumSegs; s++) {
        edges.push({ a: cBase + s, b: cBase + ((s + 1) % drumSegs) });
        if (c === 0) {
          edges.push({ a: cBase + s, b: cBase + s + drumSegs });
        }
      }
    }

    // 3 High-Voltage Porcelain Bushings on top of Transformer
    for (let b = 0; b < 3; b++) {
      const bx = -0.3 + b * 0.3;
      const bBase = nodes.length;
      nodes.push({ x: bx, y: 0.2, z: 0.25, stress: 0.3 });
      nodes.push({ x: bx + 0.05, y: 0.55, z: 0.4, stress: 0.8 });
      nodes.push({ x: bx + 0.08, y: 0.85, z: 0.55, stress: 0.9 });
      edges.push({ a: bBase, b: bBase + 1 }, { a: bBase + 1, b: bBase + 2 });
    }

    // Substation Lattice Gantry Towers (Left and Right Overhead Gantry)
    for (const gx of [-1.5, 1.5]) {
      const gBase = nodes.length;
      // 4 tower base legs
      nodes.push({ x: gx - 0.2, y: -0.6, z: -0.5, stress: 0.3 });
      nodes.push({ x: gx + 0.2, y: -0.6, z: -0.5, stress: 0.3 });
      nodes.push({ x: gx + 0.2, y: -0.6, z:  0.5, stress: 0.3 });
      nodes.push({ x: gx - 0.2, y: -0.6, z:  0.5, stress: 0.3 });
      // Gantry peak top
      nodes.push({ x: gx, y: 1.4, z: -0.2, stress: 0.5 });
      nodes.push({ x: gx, y: 1.4, z:  0.2, stress: 0.5 });

      // Legs to top
      edges.push({ a: gBase, b: gBase + 4 }, { a: gBase + 1, b: gBase + 4 });
      edges.push({ a: gBase + 2, b: gBase + 5 }, { a: gBase + 3, b: gBase + 5 });
      edges.push({ a: gBase + 4, b: gBase + 5 });
      // Cross lattice bracing
      nodes.push({ x: gx, y: 0.4, z: 0, stress: 0.4 });
      edges.push({ a: gBase, b: gBase + 6 }, { a: gBase + 1, b: gBase + 6 }, { a: gBase + 2, b: gBase + 6 }, { a: gBase + 3, b: gBase + 6 });
    }

    // Horizontal Overhead Busbar Crossarm & Conductors connecting gantries
    const busBase = nodes.length;
    for (let wire = 0; wire < 3; wire++) {
      const wz = -0.3 + wire * 0.3;
      nodes.push({ x: -1.5, y: 1.3, z: wz, stress: 0.6 });
      nodes.push({ x:  1.5, y: 1.3, z: wz, stress: 0.6 });
      edges.push({ a: busBase + wire * 2, b: busBase + wire * 2 + 1 });
      // Hanging insulator string to transformer
      nodes.push({ x: -0.3 + wire * 0.3, y: 1.1, z: wz, stress: 0.7 });
      edges.push({ a: busBase + wire * 2, b: busBase + wire * 2 + 2 });
    }

    hotspotNodes.push({
      x: 0.0,
      y: 0.25,
      z: 0.0,
      label: rawHotspots[0]?.elementId || 'Power Transformer Primary Core Bay',
      valueMPa: rawHotspots[0]?.valueMPa || 158.0,
      stressLevel: rawHotspots[0]?.stressLevel || 'HIGH',
    });

    return { nodes, edges, hotspotNodes };
  }

  if (isPipelineCorridor) {
    // 🛢️ 2. OIL & GAS REFINERY & MULTI-TIER PIPELINE CORRIDOR (Zeta Corridor)
    // Multi-tier Pipe Sleepers, Long Hydrocarbon Conduits, Thermal U-Expansion Loops, ESD Valve Manifold & Tank

    // Multi-tier Pipe Sleeper Racks (8 bays spanning lengthwise)
    const sleeperBays = 9;
    const rackLen = 3.2;
    for (let b = 0; b < sleeperBays; b++) {
      const x = -rackLen/2 + (b / (sleeperBays - 1)) * rackLen;
      const sBase = nodes.length;
      // Foundation posts
      nodes.push({ x, y: -0.6, z: -0.4, stress: getStress(10 + b) });
      nodes.push({ x, y: -0.6, z:  0.4, stress: getStress(11 + b) });
      // Lower tier crossbar (Y = -0.2)
      nodes.push({ x, y: -0.2, z: -0.45, stress: getStress(12 + b) });
      nodes.push({ x, y: -0.2, z:  0.45, stress: getStress(13 + b) });
      // Upper tier crossbar (Y = 0.3)
      nodes.push({ x, y: 0.3, z: -0.45, stress: getStress(14 + b) });
      nodes.push({ x, y: 0.3, z:  0.45, stress: getStress(15 + b) });

      edges.push({ a: sBase, b: sBase + 2 }, { a: sBase + 1, b: sBase + 3 });
      edges.push({ a: sBase + 2, b: sBase + 3 });
      edges.push({ a: sBase + 2, b: sBase + 4 }, { a: sBase + 3, b: sBase + 5 });
      edges.push({ a: sBase + 4, b: sBase + 5 });
    }

    // 6 Continuous Parallel Process Pipelines (3 on lower tier, 3 on upper tier)
    for (const tierY of [-0.2, 0.3]) {
      for (let p = 0; p < 3; p++) {
        const pZ = -0.3 + p * 0.3;
        const pipeBase = nodes.length;
        for (let b = 0; b < sleeperBays; b++) {
          const px = -rackLen/2 + (b / (sleeperBays - 1)) * rackLen;
          nodes.push({ x: px, y: tierY + 0.04, z: pZ, stress: getStress(50 + p * 10 + b) });
          if (b > 0) {
            edges.push({ a: pipeBase + b - 1, b: pipeBase + b });
          }
        }
      }
    }

    // Thermal Expansion U-Loop (Omega Bend branching upwards at mid-span)
    const uBase = nodes.length;
    nodes.push({ x: -0.2, y: 0.34, z: 0.0, stress: 0.5 });
    nodes.push({ x: -0.2, y: 0.75, z: 0.0, stress: 0.7 });
    nodes.push({ x: -0.2, y: 0.75, z: 0.6, stress: 0.8 });
    nodes.push({ x:  0.2, y: 0.75, z: 0.6, stress: 0.8 });
    nodes.push({ x:  0.2, y: 0.75, z: 0.0, stress: 0.7 });
    nodes.push({ x:  0.2, y: 0.34, z: 0.0, stress: 0.5 });
    edges.push({ a: uBase, b: uBase + 1 }, { a: uBase + 1, b: uBase + 2 }, { a: uBase + 2, b: uBase + 3 }, { a: uBase + 3, b: uBase + 4 }, { a: uBase + 4, b: uBase + 5 });

    // Floating-Roof Crude Oil Storage Tank (Offset in background)
    const tankSegs = 16;
    const tankR = 0.55;
    const tankCx = 1.1, tankCz = -0.8;
    for (let r = 0; r < 4; r++) {
      const ty = -0.6 + (r / 3) * 0.7;
      const tRingBase = nodes.length;
      for (let s = 0; s < tankSegs; s++) {
        const a = (s / tankSegs) * Math.PI * 2;
        nodes.push({ x: tankCx + Math.cos(a) * tankR, y: ty, z: tankCz + Math.sin(a) * tankR, stress: getStress(80 + r * tankSegs + s) });
      }
      for (let s = 0; s < tankSegs; s++) {
        edges.push({ a: tRingBase + s, b: tRingBase + ((s + 1) % tankSegs) });
        if (r < 3) {
          edges.push({ a: tRingBase + s, b: tRingBase + s + tankSegs });
        }
      }
    }

    // Automated Emergency Shutdown (ESD) Valve Manifold Block
    const vBase = nodes.length;
    nodes.push({ x: -0.8, y: -0.16, z: 0.0, stress: 0.8 });
    nodes.push({ x: -0.8, y:  0.1, z: 0.0, stress: 0.9 });
    nodes.push({ x: -0.7, y:  0.1, z: 0.0, stress: 0.6 });
    nodes.push({ x: -0.9, y:  0.1, z: 0.0, stress: 0.6 });
    edges.push({ a: vBase, b: vBase + 1 }, { a: vBase + 1, b: vBase + 2 }, { a: vBase + 1, b: vBase + 3 });

    hotspotNodes.push({
      x: 0.0,
      y: 0.75,
      z: 0.6,
      label: rawHotspots[0]?.elementId || 'Thermal Expansion U-Loop Apex',
      valueMPa: rawHotspots[0]?.valueMPa || 164.0,
      stressLevel: rawHotspots[0]?.stressLevel || 'HIGH',
    });

    return { nodes, edges, hotspotNodes };
  }

  if (isWarehouse) {
    // 📦 3. LOGISTICS WAREHOUSE & HIGH-BAY AUTOMATED FACILITY (Hub Epsilon)
    // 4 Aisle High-Bay Pallet Racks, AMR Travel Lanes, Sortation Conveyor Belt & Building Portal Trusses

    const aisleCount = 3;
    const baysPerAisle = 6;
    const rackLevels = 4;
    const rW = 2.4, rD = 1.4, rH = 1.4;

    // Pallet Racking Matrix
    for (let a = 0; a < aisleCount; a++) {
      const az = -rD/2 + (a / (aisleCount - 1)) * rD;
      for (let b = 0; b < baysPerAisle; b++) {
        const bx = -rW/2 + (b / (baysPerAisle - 1)) * rW;
        for (let l = 0; l <= rackLevels; l++) {
          const ly = -0.6 + (l / rackLevels) * rH;
          const nodeBase = nodes.length;
          // Front and back upright posts
          nodes.push({ x: bx, y: ly, z: az - 0.12, stress: getStress(a * 50 + b * 10 + l) });
          nodes.push({ x: bx, y: ly, z: az + 0.12, stress: getStress(a * 50 + b * 10 + l + 1) });
          // Cross beam between front and back
          edges.push({ a: nodeBase, b: nodeBase + 1 });
        }
      }

      // Connect upright vertical posts & horizontal load beams per aisle
      const aisleStart = nodes.length - baysPerAisle * (rackLevels + 1) * 2;
      for (let b = 0; b < baysPerAisle; b++) {
        for (let l = 0; l < rackLevels; l++) {
          const curr = aisleStart + (b * (rackLevels + 1) + l) * 2;
          const next = curr + 2;
          edges.push({ a: curr, b: next });
          edges.push({ a: curr + 1, b: next + 1 });
          // Diagonal bracing
          if (l % 2 === 0) edges.push({ a: curr, b: next + 1 });
        }
        // Horizontal load beams to next bay
        if (b < baysPerAisle - 1) {
          for (let l = 1; l <= rackLevels; l++) {
            const curr = aisleStart + (b * (rackLevels + 1) + l) * 2;
            const adj = aisleStart + ((b + 1) * (rackLevels + 1) + l) * 2;
            edges.push({ a: curr, b: adj });
            edges.push({ a: curr + 1, b: adj + 1 });
          }
        }
      }
    }

    // Continuous Sortation Conveyor Loop (Elevated at Y = -0.35)
    const convBase = nodes.length;
    const cLen = 2.0;
    nodes.push({ x: -cLen/2, y: -0.4, z: 0.9, stress: 0.3 });
    nodes.push({ x:  cLen/2, y: -0.4, z: 0.9, stress: 0.3 });
    nodes.push({ x:  cLen/2, y: -0.4, z: 1.1, stress: 0.3 });
    nodes.push({ x: -cLen/2, y: -0.4, z: 1.1, stress: 0.3 });
    edges.push({ a: convBase, b: convBase + 1 }, { a: convBase + 1, b: convBase + 2 }, { a: convBase + 2, b: convBase + 3 }, { a: convBase + 3, b: convBase });
    // Support legs
    for (let i = 0; i < 4; i++) {
      nodes.push({ x: (i % 2 === 0 ? -cLen/2 : cLen/2), y: -0.6, z: (i < 2 ? 0.9 : 1.1), stress: 0.2 });
      edges.push({ a: convBase + i, b: convBase + 4 + i });
    }

    // Building Roof Portal Frame Trusses (Overhead Span)
    const trussBases = [-1.1, 0, 1.1];
    for (const tx of trussBases) {
      const tBase = nodes.length;
      nodes.push({ x: tx, y: 0.85, z: -1.0, stress: 0.4 });
      nodes.push({ x: tx, y: 1.25, z:  0.0, stress: 0.6 });
      nodes.push({ x: tx, y: 0.85, z:  1.0, stress: 0.4 });
      edges.push({ a: tBase, b: tBase + 1 }, { a: tBase + 1, b: tBase + 2 });
    }

    hotspotNodes.push({
      x: 0.0,
      y: 0.1,
      z: 0.0,
      label: rawHotspots[0]?.elementId || 'High-Bay Rack Bay C-04 Load Beam',
      valueMPa: rawHotspots[0]?.valueMPa || 128.0,
      stressLevel: rawHotspots[0]?.stressLevel || 'HIGH',
    });

    return { nodes, edges, hotspotNodes };
  }

  if (isDemolition) {
    // 🏗️ 4. DEMOLITION & REBAR CONSTRUCTION SITE (Alpha Site)
    // Exposed Concrete Rebar Column Cages, Tubular Scaffolding Tower, Mobile Crane Lattice Truss & Concrete Footings

    // 4 Exposed Steel Rebar Column Cages (Grid of exposed vertical steel rods + tie hoops)
    const rebarPositions = [
      { x: -0.9, z: -0.6 },
      { x: -0.9, z:  0.4 },
      { x:  0.1, z: -0.6 },
      { x:  0.1, z:  0.4 },
    ];

    for (const pos of rebarPositions) {
      const rebarBase = nodes.length;
      const barCount = 6;
      const colR = 0.14;
      // Vertical rebar rods
      for (let b = 0; b < barCount; b++) {
        const a = (b / barCount) * Math.PI * 2;
        const rx = pos.x + Math.cos(a) * colR;
        const rz = pos.z + Math.sin(a) * colR;
        nodes.push({ x: rx, y: -0.6, z: rz, stress: 0.3 });
        nodes.push({ x: rx, y:  0.7, z: rz, stress: 0.85 });
        edges.push({ a: rebarBase + b * 2, b: rebarBase + b * 2 + 1 });
      }
      // Rebar tie hoops at 4 levels
      for (let ring = 0; ring < 4; ring++) {
        const ry = -0.4 + ring * 0.3;
        const ringBase = nodes.length;
        for (let b = 0; b < barCount; b++) {
          const a = (b / barCount) * Math.PI * 2;
          nodes.push({ x: pos.x + Math.cos(a) * colR, y: ry, z: pos.z + Math.sin(a) * colR, stress: 0.7 });
        }
        for (let b = 0; b < barCount; b++) {
          edges.push({ a: ringBase + b, b: ringBase + ((b + 1) % barCount) });
        }
      }
    }

    // Tubular Scaffolding Framework Tower (Right Side)
    const scW = 1.0, scD = 0.8, scH = 1.6;
    const scBase = nodes.length;
    for (let l = 0; l <= 4; l++) {
      const sy = -0.6 + (l / 4) * scH;
      nodes.push({ x: 0.5, y: sy, z: -scD/2, stress: getStress(10 + l) });
      nodes.push({ x: 0.5 + scW, y: sy, z: -scD/2, stress: getStress(11 + l) });
      nodes.push({ x: 0.5 + scW, y: sy, z:  scD/2, stress: getStress(12 + l) });
      nodes.push({ x: 0.5, y: sy, z:  scD/2, stress: getStress(13 + l) });
      const lb = scBase + l * 4;
      edges.push({ a: lb, b: lb + 1 }, { a: lb + 1, b: lb + 2 }, { a: lb + 2, b: lb + 3 }, { a: lb + 3, b: lb });
      if (l < 4) {
        edges.push({ a: lb, b: lb + 4 }, { a: lb + 1, b: lb + 5 }, { a: lb + 2, b: lb + 6 }, { a: lb + 3, b: lb + 7 });
        // Diagonal cross-brace
        edges.push({ a: lb, b: lb + 5 }, { a: lb + 3, b: lb + 6 });
      }
    }

    // Mobile Crane / Hoist Mast Lattice Truss (Tall Vertical Tower with Jib Boom)
    const craneBase = nodes.length;
    const cx = -0.4, cz = 0.9;
    nodes.push({ x: cx - 0.12, y: -0.6, z: cz - 0.12, stress: 0.4 });
    nodes.push({ x: cx + 0.12, y: -0.6, z: cz - 0.12, stress: 0.4 });
    nodes.push({ x: cx + 0.12, y: -0.6, z: cz + 0.12, stress: 0.4 });
    nodes.push({ x: cx - 0.12, y: -0.6, z: cz + 0.12, stress: 0.4 });

    nodes.push({ x: cx - 0.12, y: 1.5, z: cz - 0.12, stress: 0.8 });
    nodes.push({ x: cx + 0.12, y: 1.5, z: cz - 0.12, stress: 0.8 });
    nodes.push({ x: cx + 0.12, y: 1.5, z: cz + 0.12, stress: 0.8 });
    nodes.push({ x: cx - 0.12, y: 1.5, z: cz + 0.12, stress: 0.8 });

    edges.push({ a: craneBase, b: craneBase + 4 }, { a: craneBase + 1, b: craneBase + 5 }, { a: craneBase + 2, b: craneBase + 6 }, { a: craneBase + 3, b: craneBase + 7 });
    // Horizontal Crane Jib
    nodes.push({ x: cx - 1.2, y: 1.45, z: cz, stress: 0.9 });
    edges.push({ a: craneBase + 4, b: craneBase + 8 });

    hotspotNodes.push({
      x: -0.9,
      y: 0.4,
      z: -0.6,
      label: rawHotspots[0]?.elementId || 'Steel Rebar Grid Foundation Cage #01',
      valueMPa: rawHotspots[0]?.valueMPa || 172.0,
      stressLevel: rawHotspots[0]?.stressLevel || 'CRITICAL',
    });

    return { nodes, edges, hotspotNodes };
  }

  if (isPlantTowers || isIndustrial) {
    // 🏭 5. HEAVY INDUSTRIAL PLANT & PROCESSING TOWERS (Beta Complex)
    // Vertical Fractionation Columns, Reaction Vessels, High-Pressure Pipe Bridges & Heat Exchangers

    // Processing Column #1 (Tall Distillation Fractionation Column)
    const towerSegs = 14;
    const towerH = 2.6;
    const towerR = 0.38;
    for (let ring = 0; ring <= 10; ring++) {
      const y = -0.6 + (ring / 10) * towerH;
      const ringBase = nodes.length;
      for (let s = 0; s < towerSegs; s++) {
        const a = (s / towerSegs) * Math.PI * 2;
        nodes.push({ x: -0.85 + Math.cos(a) * towerR, y, z: -0.2 + Math.sin(a) * towerR, stress: getStress(ring * towerSegs + s) });
      }
      for (let s = 0; s < towerSegs; s++) {
        edges.push({ a: ringBase + s, b: ringBase + ((s + 1) % towerSegs) });
        if (ring < 10) {
          edges.push({ a: ringBase + s, b: ringBase + s + towerSegs });
        }
      }
    }

    // Secondary Stripper Tower (Shorter offset column)
    const sColH = 1.7;
    const sColR = 0.28;
    for (let ring = 0; ring <= 6; ring++) {
      const y = -0.6 + (ring / 6) * sColH;
      const ringBase = nodes.length;
      for (let s = 0; s < 10; s++) {
        const a = (s / 10) * Math.PI * 2;
        nodes.push({ x: 0.45 + Math.cos(a) * sColR, y, z: -0.5 + Math.sin(a) * sColR, stress: getStress(120 + ring * 10 + s) });
      }
      for (let s = 0; s < 10; s++) {
        edges.push({ a: ringBase + s, b: ringBase + ((s + 1) % 10) });
        if (ring < 6) {
          edges.push({ a: ringBase + s, b: ringBase + s + 10 });
        }
      }
    }

    // Overhead High-Pressure Pipe Bridge connecting the towers
    const pBridgeBase = nodes.length;
    for (let b = 0; b < 6; b++) {
      const bx = -0.85 + (b / 5) * 1.3;
      nodes.push({ x: bx, y: 0.6, z: -0.2, stress: 0.7 });
      nodes.push({ x: bx, y: 0.6, z: -0.5, stress: 0.7 });
      if (b > 0) {
        edges.push({ a: pBridgeBase + (b - 1) * 2, b: pBridgeBase + b * 2 });
        edges.push({ a: pBridgeBase + (b - 1) * 2 + 1, b: pBridgeBase + b * 2 + 1 });
      }
    }

    // Spherical Butane / LPG Storage Vessel (Sphere on 6 support legs)
    const sphereSegs = 12;
    const sphereR = 0.45;
    const sx = 0.9, sz = 0.6;
    for (let ring = 1; ring <= 4; ring++) {
      const phi = (ring / 5) * Math.PI;
      const ringR = Math.sin(phi) * sphereR;
      const ry = -0.1 + Math.cos(phi) * sphereR;
      const sRingBase = nodes.length;
      for (let s = 0; s < sphereSegs; s++) {
        const a = (s / sphereSegs) * Math.PI * 2;
        nodes.push({ x: sx + Math.cos(a) * ringR, y: ry, z: sz + Math.sin(a) * ringR, stress: getStress(200 + ring * sphereSegs + s) });
      }
      for (let s = 0; s < sphereSegs; s++) {
        edges.push({ a: sRingBase + s, b: sRingBase + ((s + 1) % sphereSegs) });
      }
    }
    // 4 Sphere Legs
    for (let l = 0; l < 4; l++) {
      const a = (l / 4) * Math.PI * 2;
      const lBase = nodes.length;
      nodes.push({ x: sx + Math.cos(a) * 0.4, y: -0.1, z: sz + Math.sin(a) * 0.4, stress: 0.5 });
      nodes.push({ x: sx + Math.cos(a) * 0.45, y: -0.6, z: sz + Math.sin(a) * 0.45, stress: 0.3 });
      edges.push({ a: lBase, b: lBase + 1 });
    }

    hotspotNodes.push({
      x: -0.85,
      y: 0.9,
      z: -0.2,
      label: rawHotspots[0]?.elementId || 'Distillation Column Top Fractionation Section',
      valueMPa: rawHotspots[0]?.valueMPa || 154.0,
      stressLevel: rawHotspots[0]?.stressLevel || 'HIGH',
    });

    return { nodes, edges, hotspotNodes };
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
  hotspotNodes.push({
    x: 0.0,
    y: 0.7,
    z: 0.0,
    label: rawHotspots[0]?.elementId || 'Midspan Tension Gusset',
    valueMPa: rawHotspots[0]?.valueMPa || 140.0,
    stressLevel: rawHotspots[0]?.stressLevel || 'CRITICAL',
  });
  return { nodes, edges, hotspotNodes };
}

function stressColor(stress: number, heatmap: boolean): string {
  if (!heatmap) return `rgba(100, 140, 255, ${0.4 + stress * 0.4})`;
  if (stress < 0.3) return `rgba(34, 197, 94, ${0.5 + stress})`;
  if (stress < 0.6) return `rgba(250, 204, 21, ${0.5 + stress * 0.5})`;
  if (stress < 0.8) return `rgba(249, 115, 22, ${0.6 + stress * 0.3})`;
  return `rgba(239, 68, 68, ${0.7 + stress * 0.3})`;
}

function project(node: { x: number; y: number; z: number }, rx: number, ry: number, zoom: number, cx: number, cy: number, exploded: boolean) {
  let { x, y, z } = node;
  if (exploded) { x *= 1.4; y *= 1.4; z *= 1.4; }
  const cosY = Math.cos(ry), sinY = Math.sin(ry);
  const x1 = x * cosY - z * sinY, z1 = x * sinY + z * cosY;
  const cosX = Math.cos(rx), sinX = Math.sin(rx);
  const y1 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX;
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

  const [liveStress, setLiveStress] = useState(142.8);
  const [liveElements, setLiveElements] = useState(14280);

  const [modelNames, setModelNames] = useState<any[]>([
    { id: 1, name: 'Primary Infrastructure Structure', elements: 14280, stress: 142.8, hotspot: 'Anchor Pier #2 (140.0 MPa)', rating: 'NOMINAL', hotspots: [] },
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
            hotspots: m.hotspots || [],
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
    hotspots: [],
  };

  useEffect(() => { autoRotRef.current = autoRotate; }, [autoRotate]);
  useEffect(() => { rotYRef.current = rotY; }, [rotY]);
  useEffect(() => { rotXRef.current = rotX; }, [rotX]);
  useEffect(() => { zoomRef.current = zoomLevel; }, [zoomLevel]);
  useEffect(() => { heatmapRef.current = heatmapOverlay; }, [heatmapOverlay]);
  useEffect(() => { explodedRef.current = explodedView; }, [explodedView]);

  const [stressStats, setStressStats] = useState({ normal: 0, elevated: 0, high: 0, critical: 0, total: 0 });

  useEffect(() => {
    if (activeModel) {
      structureRef.current = generateStructure(
        selectedModelIdx,
        activeModel.stress / 200,
        activeModel.id,
        activeModel.name,
        activeModel.bimType,
        activeModel.hotspots
      );
      setLiveStress(activeModel.stress);
      setLiveElements(activeModel.elements);
    }
  }, [activeModel, selectedModelIdx]);

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
      const p1 = project({ x: i * 0.15, y: -1.2, z: -3 }, rotXRef.current, rotYRef.current, zoomRef.current, cx, cy, false);
      const p2 = project({ x: i * 0.15, y: -1.2, z: 3 }, rotXRef.current, rotYRef.current, zoomRef.current, cx, cy, false);
      ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy); ctx.stroke();
      const p3 = project({ x: -3, y: -1.2, z: i * 0.15 }, rotXRef.current, rotYRef.current, zoomRef.current, cx, cy, false);
      const p4 = project({ x: 3, y: -1.2, z: i * 0.15 }, rotXRef.current, rotYRef.current, zoomRef.current, cx, cy, false);
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

    // Draw 3D Hotspot Callouts directly on the canvas at real structural coordinates
    const { hotspotNodes = [] } = structureRef.current;
    hotspotNodes.forEach((hs) => {
      const hp = project(hs, rotXRef.current, rotYRef.current, zoomRef.current, cx, cy, explodedRef.current);
      if (hp.depth < 10) {
        const pulse = Math.sin(Date.now() * 0.006) * 3;
        const isCritical = hs.valueMPa > 120 || hs.stressLevel === 'CRITICAL';
        const pinColor = isCritical ? '#ef4444' : '#f59e0b';

        // 1. Pulsing Outer Ring
        ctx.strokeStyle = pinColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hp.sx, hp.sy, 9 + pulse, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Glowing Core Marker
        ctx.fillStyle = pinColor;
        ctx.beginPath();
        ctx.arc(hp.sx, hp.sy, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // 3. Diagonal Callout Leader Line
        const labelX = hp.sx + 35;
        const labelY = hp.sy - 25;
        ctx.strokeStyle = pinColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(hp.sx, hp.sy);
        ctx.lineTo(hp.sx + 15, hp.sy - 12);
        ctx.lineTo(labelX, labelY);
        ctx.stroke();

        // 4. Callout Label Pill
        const tagText = `🔥 ${hs.label}: ${hs.valueMPa} MPa`;
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        const tagW = ctx.measureText(tagText).width + 16;
        const tagH = 20;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        ctx.strokeStyle = pinColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(labelX, labelY - tagH / 2, tagW, tagH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(tagText, labelX + 8, labelY + 3.5);
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
      const p = project({ x: ax.dx * 0.3, y: ax.dy * 0.3, z: ax.dz * 0.3 }, rotXRef.current, rotYRef.current, 1, 0, 0, false);
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
            <h1 className="text-3xl font-black tracking-tight text-[#3A4046]">
              3D BIM CAD Digital Twin Visualizer
            </h1>
            <span className="bg-cyan-100 text-cyan-700 border border-cyan-300 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5" /> Parametric CAD Topology (IFC4)
            </span>
          </div>
          <p className="text-slate-800/70 mt-1.5 text-base font-medium">
            3D structural wireframe with real DB sensor telemetry and spatial hotspot anchors. Drag to orbit, scroll to zoom.
          </p>
        </div>

        <select
          value={selectedModelIdx}
          onChange={e => setSelectedModelIdx(Number(e.target.value))}
          className="h-12 px-4 rounded-xl border border-[rgba(255,255,255,0.80)] bg-[rgba(255,255,255,0.55)] text-sm font-bold text-[#3A4046] "
        >
          {modelNames.map((m, i) => (
            <option key={i} value={i}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* 3D Canvas Viewport */}
      <div className="bg-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.80)] rounded-2xl overflow-hidden shadow-xl relative flex flex-col">
        {/* HUD Header */}
        <div className="p-3 bg-[rgba(255,255,255,0.55)] border-b border-[rgba(255,255,255,0.60)] flex items-center justify-between text-xs font-mono text-slate-800">
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
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${heatmapOverlay ? 'bg-orange-600 text-slate-800' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <Flame className="w-3.5 h-3.5" /> Heatmap
            </button>
            <button
              onClick={() => setExplodedView(!explodedView)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${explodedView ? 'bg-[rgba(127,184,176,0.85)] text-slate-800' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <Layers className="w-3.5 h-3.5" /> Exploded
            </button>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${autoRotate ? 'bg-emerald-600 text-slate-800' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
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
          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-700 text-slate-800 shadow-lg">
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
            <div className="absolute top-4 left-4 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-700 text-[10px] font-mono text-slate-800 space-y-1.5 shadow-2xl min-w-[210px] backdrop-blur-md">
              <p className="font-extrabold text-xs mb-1 flex items-center justify-between border-b border-white/10 pb-1.5 text-cyan-300">
                <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-cyan-400" /> LIVE STRESS BREAKDOWN</span>
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-800" /> 0–30% Normal</span>
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
            <div className="absolute top-4 right-14 bg-slate-900/90 p-3.5 rounded-2xl border border-cyan-500/30 text-[10px] font-mono text-cyan-300 space-y-1.5 backdrop-blur-md shadow-2xl">
              <p className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5 pb-1 border-b border-cyan-500/20">
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
        <div className="p-4 bg-[rgba(255,255,255,0.55)] border-t border-[rgba(255,255,255,0.80)] grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono text-slate-800/80">
          <div>
            <span className="text-slate-400 block text-[10px]">AVG STRUCTURAL STRESS</span>
            <span className="font-extrabold text-[#7FB8B0] text-sm">{liveStress} MPa</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">HIGHEST STRESS POINT</span>
            <span className="font-extrabold text-rose-600 text-sm">{activeModel.hotspot}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">BIM HEALTH RATING</span>
            <span className="font-extrabold text-emerald-600 text-sm">{activeModel.rating}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">RENDER STATUS</span>
            <span className="font-extrabold text-cyan-600 text-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-800 animate-pulse" /> 60 FPS LIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
