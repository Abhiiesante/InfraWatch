import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface WorkOrder {
  id: number;
  incidentId?: number;
  assetId: number;
  assignedToId?: number;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  slaDeadline: string;
  completedAt?: string;
  signatureUrl?: string;
  createdAt: string;
  updatedAt: string;
  asset?: { id: number; name: string; address?: string };
  assignedTo?: { id: number; name: string; email: string };
  incident?: { id: number; title: string; severity: string };
}

export interface SLACountdownItem {
  id: number;
  title: string;
  priority: string;
  slaDeadline: string;
  status: string;
  remainingMinutes: number;
  isBreached: boolean;
}

export const useWorkOrders = (filters?: { status?: string; assignedToId?: number }) => {
  return useQuery({
    queryKey: ['work-orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.assignedToId) params.append('assignedToId', filters.assignedToId.toString());
      const response = await apiClient.get(`/work-orders?${params.toString()}`);
      return Array.isArray(response.data) ? response.data : (response.data?.workOrders || []);
    },
  });
};

export const useSLACountdown = () => {
  return useQuery({
    queryKey: ['work-orders-sla'],
    queryFn: async () => {
      const response = await apiClient.get('/work-orders/sla');
      return Array.isArray(response.data) ? response.data : (response.data?.slaItems || response.data?.sla || []);
    },
    refetchInterval: 5000,
  });
};

export const useWorkOrderDetails = (id: number) => {
  return useQuery({
    queryKey: ['work-order', id],
    queryFn: async () => {
      const response = await apiClient.get<WorkOrder>(`/work-orders/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateWorkOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      incidentId?: number;
      assetId: number;
      assignedToId?: number;
      title: string;
      description?: string;
      priority?: string;
      slaHours?: number;
    }) => {
      const response = await apiClient.post<WorkOrder>('/work-orders', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
};

export const useUpdateWorkOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { status?: string; signatureUrl?: string; assignedToId?: number };
    }) => {
      const response = await apiClient.put<WorkOrder>(`/work-orders/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', variables.id] });
    },
  });
};
