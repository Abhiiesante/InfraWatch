import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const useIncidents = (params: { skip: number; take: number }) => {
  return useQuery({
    queryKey: ['incidents', params],
    queryFn: async () => {
      const response = await apiClient.get('/incidents', { params });
      return response.data;
    },
  });
};
