import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface TelemetryReading {
  id: number;
  assetId: number;
  sensorType: string;
  value: number;
  unit: string;
  isAnomaly: boolean;
  timestamp: string;
}

export interface SensorRule {
  id: number;
  assetId?: number;
  sensorType: string;
  minThreshold?: number;
  maxThreshold?: number;
  action: string;
  isActive: boolean;
  asset?: { id: number; name: string };
}

export const useAssetTelemetry = (assetId: number, limit = 50) => {
  return useQuery({
    queryKey: ['telemetry', assetId, limit],
    queryFn: async () => {
      const response = await apiClient.get(`/telemetry/asset/${assetId}?limit=${limit}`);
      return Array.isArray(response.data) ? response.data : (response.data?.readings || []);
    },
    refetchInterval: 3000, // Poll every 3 seconds for real-time live data stream
    enabled: !!assetId,
  });
};

export const useSensorRules = () => {
  return useQuery({
    queryKey: ['sensor-rules'],
    queryFn: async () => {
      const response = await apiClient.get('/telemetry/rules');
      return Array.isArray(response.data) ? response.data : (response.data?.rules || []);
    },
  });
};

export const useCreateSensorRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      assetId?: number;
      sensorType: string;
      minThreshold?: number;
      maxThreshold?: number;
      action?: string;
    }) => {
      const response = await apiClient.post<SensorRule>('/telemetry/rules', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensor-rules'] });
    },
  });
};
export interface LiveSatelliteData {
  assetId: number;
  latitude: number;
  longitude: number;
  temperatureC: number;
  relativeHumidity: number;
  windSpeedKmH: number;
  surfacePressureHpa: number;
  cloudCoverPercent: number;
  solarIrradianceWm2: number;
  weatherCondition: string;
  timestamp: string;
}

export const useSatelliteTelemetry = (assetId?: number) => {
  return useQuery({
    queryKey: ['satellite-telemetry', assetId],
    queryFn: async () => {
      if (!assetId) return null;
      const response = await apiClient.get<LiveSatelliteData>(`/telemetry/satellite/${assetId}`);
      return response.data;
    },
    refetchInterval: 10000, // Poll every 10 seconds for real-time live satellite parameters
    enabled: !!assetId,
  });
};
