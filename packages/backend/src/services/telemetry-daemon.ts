import prisma from '@/lib/prisma.js';
import { telemetryService } from './telemetry.service.js';
import { satelliteService } from './satellite.service.js';
import logger from '@/utils/logger.js';

export class TelemetryDaemon {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(intervalMs = 4000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('📡 Automated Telemetry Daemon started (4s ticks)');

    this.timer = setInterval(async () => {
      try {
        await this.tick();
      } catch (err) {
        logger.error('Error in telemetry daemon tick:', err);
      }
    }, intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('📡 Telemetry Daemon stopped');
  }

  private tickIndex = 0;

  private async tick() {
    const assets = await prisma.asset.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      take: 20,
    });

    if (assets.length === 0) return;

    // Process all assets on every tick to ensure continuous telemetry
    for (const asset of assets) {
      try {
        const satData = await satelliteService.getLiveSatelliteData(asset.tenantId, asset.id);
        const seismicData = await satelliteService.getLiveSeismicData();
        
        const metrics = [
          { type: 'TEMPERATURE', val: satData.temperatureC, u: '°C' },
          { type: 'WIND_SPEED', val: satData.windSpeedKmH, u: 'km/h' },
          { type: 'HUMIDITY', val: satData.relativeHumidity, u: '%' },
          { type: 'PRESSURE', val: satData.surfacePressureHpa, u: 'hPa' },
          { type: 'SOLAR_IRRADIANCE', val: satData.solarIrradianceWm2, u: 'W/m2' },
          { type: 'VIBRATION', val: seismicData.magnitude, u: 'Richter' }
        ];

        // Pick one metric per tick in a round-robin fashion per asset
        const metricIndex = (this.tickIndex + asset.id) % metrics.length;
        const picked = metrics[metricIndex];
        
        await telemetryService.ingestReading(asset.tenantId, {
          assetId: asset.id,
          sensorType: picked.type,
          value: picked.val,
          unit: picked.u,
        });
      } catch (err) {
        logger.error(`Error in telemetry daemon tick for asset ${asset.id}:`, err);
      }
    }
    
    this.tickIndex++;
  }
}

export const telemetryDaemon = new TelemetryDaemon();
