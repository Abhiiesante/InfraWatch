import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface Asset {
  id: number;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  status: string;
  healthScore?: number;
  assetType?: { id: number; name: string };
  cameras?: any[];
}

export const useAssets = (params: { skip?: number; take?: number } = { skip: 0, take: 50 }) => {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: async () => {
      const response = await apiClient.get<{ assets: Asset[]; total: number }>('/assets', { params });
      return response.data;
    },
  });
};

export const useAssetDetails = (id: number) => {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: async () => {
      const response = await apiClient.get(`/assets/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};
