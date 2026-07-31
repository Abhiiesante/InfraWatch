import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface AnalyticsMetrics {
  totalAssets: number;
  activeIncidents: number;
  resolvedIncidents: number;
  totalInspections: number;
  completedInspections: number;
  mttrHours: number;
  mtbfDays: number;
  slaCompliance: number;
  healthByAssetType: Array<{
    type: string;
    averageHealth: number;
    assetCount: number;
  }>;
}

export const useAnalyticsMetrics = () => {
  return useQuery({
    queryKey: ['analytics-metrics'],
    queryFn: async () => {
      const response = await apiClient.get<AnalyticsMetrics>('/analytics/metrics');
      return response.data;
    },
  });
};
