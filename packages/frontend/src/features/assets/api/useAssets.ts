import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const useAssets = (params: { skip: number; take: number }) => {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: async () => {
      const response = await apiClient.get('/assets', { params });
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
