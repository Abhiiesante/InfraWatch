import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const useTriageIncident = () => {
  return useMutation({
    mutationFn: async (data: { title: string; description?: string }) => {
      const response = await apiClient.post('/ai/triage', data);
      return response.data;
    },
  });
};

export const useGenerateAIReport = () => {
  return useMutation({
    mutationFn: async (data: { reportType?: string; dateRange?: string }) => {
      const response = await apiClient.post('/ai/generate-report', data);
      return response.data;
    },
  });
};
