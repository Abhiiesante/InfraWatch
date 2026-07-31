import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface AssetType {
  id: number;
  name: string;
  description?: string;
  icon?: string;
}

export const useAssetTypes = (params: { skip?: number; take?: number } = { skip: 0, take: 50 }) => {
  return useQuery({
    queryKey: ['assetTypes', params],
    queryFn: async () => {
      const response = await apiClient.get<{ assetTypes: AssetType[]; total: number }>('/asset-types', { params });
      return response.data;
    },
  });
};
