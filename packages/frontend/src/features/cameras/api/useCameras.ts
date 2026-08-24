import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const useCameras = (params: { skip?: number; take?: number; assetId?: number } = { skip: 0, take: 50 }) => {
  return useQuery({
    queryKey: ['cameras', params],
    queryFn: async () => {
      const response = await apiClient.get('/cameras', { params });
      return response.data;
    },
  });
};

export const useCameraDetails = (id: number) => {
  return useQuery({
    queryKey: ['cameras', id],
    queryFn: async () => {
      const response = await apiClient.get(`/cameras/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateCamera = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      assetId: number;
      cameraType: string;
      rtspUrl: string;
      ipAddress?: string;
    }) => {
      const response = await apiClient.post('/cameras', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });
};

export const useUpdateCamera = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<{
        name: string;
        cameraType: string;
        rtspUrl: string;
        ipAddress: string;
        config: Record<string, unknown>;
        status: string;
      }>;
    }) => {
      const response = await apiClient.put(`/cameras/${id}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      queryClient.invalidateQueries({ queryKey: ['cameras', variables.id] });
    },
  });
};

export const useDeleteCamera = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/cameras/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });
};
