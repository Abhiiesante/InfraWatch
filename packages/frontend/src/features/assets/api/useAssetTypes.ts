import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const useAssetTypes = () => {
  return useQuery({
    queryKey: ['assetTypes'],
    queryFn: async () => {
      const response = await apiClient.get('/asset-types');
      return response.data;
    },
  });
};
