import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const useAnomalies = (params: { skip: number; take: number; status?: string }) => {
  return useQuery({
    queryKey: ['anomalies', params],
    queryFn: async () => {
      const response = await apiClient.get('/anomalies', { params });
      return response.data;
    },
  });
};

export const useAnomalyDetails = (id: number) => {
  return useQuery({
    queryKey: ['anomalies', id],
    queryFn: async () => {
      const response = await apiClient.get(`/anomalies/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useConfirmAnomaly = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post(`/anomalies/${id}/confirm`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
};

export const useDismissAnomaly = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post(`/anomalies/${id}/dismiss`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
    },
  });
};
