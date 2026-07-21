import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const useInspections = (params: { skip: number; take: number }) => {
  return useQuery({
    queryKey: ['inspections', params],
    queryFn: async () => {
      const response = await apiClient.get('/inspections', { params });
      return response.data;
    },
  });
};
