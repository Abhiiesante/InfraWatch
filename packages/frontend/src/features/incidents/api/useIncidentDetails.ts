import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const useIncidentDetails = (id: number) => {
  return useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => {
      const response = await apiClient.get(`/incidents/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateIncident = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      severity: string;
      assetId?: number;
    }) => {
      const response = await apiClient.post('/incidents', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
};

export const useUpdateIncident = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ title: string; description: string; severity: string; status: string }> }) => {
      const response = await apiClient.put(`/incidents/${id}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incidents', variables.id] });
    },
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ incidentId, content }: { incidentId: number; content: string }) => {
      const response = await apiClient.post(`/incidents/${incidentId}/comments`, { content });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents', variables.incidentId] });
    },
  });
};

export const useAssignIncident = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ incidentId, userId }: { incidentId: number; userId: number }) => {
      const response = await apiClient.post(`/incidents/${incidentId}/assign`, { userId });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents', variables.incidentId] });
    },
  });
};
