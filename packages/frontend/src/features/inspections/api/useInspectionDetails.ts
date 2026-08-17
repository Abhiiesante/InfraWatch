import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const useInspectionDetails = (id: number) => {
  return useQuery({
    queryKey: ['inspections', id],
    queryFn: async () => {
      const response = await apiClient.get(`/inspections/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateInspection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      assetId: number;
      inspectorId: number;
      scheduledDate: string;
      notes?: string;
    }) => {
      const response = await apiClient.post('/inspections', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
  });
};

export const useUpdateInspection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ status: string; notes: string; completedAt: string }> }) => {
      const response = await apiClient.put(`/inspections/${id}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['inspections', variables.id] });
    },
  });
};

export const useUploadInspectionImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, imageUrl, caption }: { id: number; imageUrl: string; caption?: string }) => {
      const response = await apiClient.post(`/inspections/${id}/images`, { imageUrl, caption });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inspections', variables.id] });
    },
  });
};
