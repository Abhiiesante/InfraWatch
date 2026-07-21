import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const useReports = (params: { skip: number; take: number }) => {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: async () => {
      const response = await apiClient.get('/reports', { params });
      return response.data;
    },
  });
};
