import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const useReports = (params: { skip: number; take: number }) => {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: async () => {
      const response = await apiClient.get('/reports', { params });
      return response.data;
    },
    refetchInterval: 3000, // Poll for async report generation completion
  });
};

export const useCreateReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      type: string;
      format?: 'PDF' | 'CSV';
      domain?: string;
    }) => {
      const response = await apiClient.post('/reports', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};
