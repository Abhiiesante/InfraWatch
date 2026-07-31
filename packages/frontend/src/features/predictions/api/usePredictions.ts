import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const usePredictions = (params: { skip: number; take: number }) => {
  return useQuery({
    queryKey: ['predictions', params],
    queryFn: async () => {
      const response = await apiClient.get('/predictions', { params });
      return response.data;
    },
  });
};

export const useHealthScore = () => {
  return useQuery({
    queryKey: ['infrastructure-health-score'],
    queryFn: async () => {
      const response = await apiClient.get('/predictions/health-score');
      return response.data;
    },
  });
};

export const useRunPrediction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: number) => {
      const response = await apiClient.post(`/predictions/run/${assetId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      queryClient.invalidateQueries({ queryKey: ['infrastructure-health-score'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
};
