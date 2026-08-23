import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface VideoFinding {
  id: number;
  tenantId: number;
  videoId: number;
  frameIndex: number;
  frameTimestamp: number;
  frameImageUrl?: string;
  defectType: string;
  confidence: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  bbox: [number, number, number, number];
  rawPrediction?: any;
  triageNotes?: string;
  status: 'PENDING_REVIEW' | 'CONFIRMED' | 'DISMISSED';
  aiEventId?: number;
  createdAt: string;
}

export interface InspectionVideo {
  id: number;
  tenantId: number;
  inspectionId?: number | null;
  assetId: number;
  uploadedById: number;
  fileName: string;
  fileUrl: string;
  fileSizeBytes?: string | null;
  durationSeconds?: number | null;
  sourceType: string;
  status: 'PENDING' | 'EXTRACTING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  frameCount: number;
  samplingRateFps?: number | null;
  targetFrameBudget: number;
  summary?: string | null;
  createdAt: string;
  updatedAt: string;
  asset?: {
    id: number;
    name: string;
    assetType?: { name: string };
  };
  uploadedBy?: {
    id: number;
    name: string;
    email: string;
  };
  findings?: VideoFinding[];
}

export function useVideoAnalyses(params?: { assetId?: number; status?: string }) {
  return useQuery<{ videos: InspectionVideo[]; total: number }>({
    queryKey: ['video-analyses', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.assetId) searchParams.append('assetId', String(params.assetId));
      if (params?.status) searchParams.append('status', params.status);
      const res = await apiClient.get(`/video-analysis?${searchParams.toString()}`);
      return res.data;
    },
    refetchInterval: (query) => {
      // Poll every 3 seconds if any video is actively processing
      const hasActive = query.state.data?.videos.some(
        (v) => v.status === 'PENDING' || v.status === 'EXTRACTING' || v.status === 'ANALYZING'
      );
      return hasActive ? 3000 : false;
    },
  });
}

export function useVideoAnalysisDetail(id: number | null) {
  return useQuery<InspectionVideo>({
    queryKey: ['video-analysis-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('Video ID is required');
      const res = await apiClient.get(`/video-analysis/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useUploadVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiClient.post('/video-analysis/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-analyses'] });
    },
  });
}

export function useReanalyzeVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, targetFrameBudget }: { id: number; targetFrameBudget?: number }) => {
      const res = await apiClient.post(`/video-analysis/${id}/reanalyze`, { targetFrameBudget });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-analyses'] });
    },
  });
}
