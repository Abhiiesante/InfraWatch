import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/store/auth.store';

const API_URL = (import.meta as any).env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token
apiClient.interceptors.request.use(
  (config) => {
    const { accessToken, organization } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    if (organization) {
      config.headers['x-tenant-id'] = organization.id.toString();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // If token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) {
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        useAuthStore.getState().setAccessToken(accessToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401 && originalRequest._retry) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  register: async (email: string, password: string, name: string, organizationName: string) => {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      name,
      organizationName,
    });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    useAuthStore.getState().logout();
  },
};

export const organizationApi = {
  getCurrent: async () => {
    const response = await apiClient.get('/organizations/current');
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/organizations/current/stats');
    return response.data;
  },
};

export const assetApi = {
  list: async (skip = 0, take = 20) => {
    const response = await apiClient.get('/assets', {
      params: { skip, take },
    });
    return response.data;
  },

  get: async (id: number) => {
    const response = await apiClient.get(`/assets/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/assets', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put(`/assets/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/assets/${id}`);
  },
};

export const incidentApi = {
  list: async (skip = 0, take = 20, filters?: any) => {
    const response = await apiClient.get('/incidents', {
      params: { skip, take, ...filters },
    });
    return response.data;
  },

  get: async (id: number) => {
    const response = await apiClient.get(`/incidents/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/incidents', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put(`/incidents/${id}`, data);
    return response.data;
  },

  addComment: async (id: number, content: string) => {
    const response = await apiClient.post(`/incidents/${id}/comments`, { content });
    return response.data;
  },
};

export const inspectionApi = {
  list: async (skip = 0, take = 20) => {
    const response = await apiClient.get('/inspections', {
      params: { skip, take },
    });
    return response.data;
  },

  get: async (id: number) => {
    const response = await apiClient.get(`/inspections/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/inspections', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put(`/inspections/${id}`, data);
    return response.data;
  },
};

export const userApi = {
  list: async (skip = 0, take = 20) => {
    const response = await apiClient.get('/users', { params: { skip, take } });
    return response.data;
  },
  get: async (id: number) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },
};

export const cameraApi = {
  list: async (skip = 0, take = 20, assetId?: number) => {
    const response = await apiClient.get('/cameras', { params: { skip, take, assetId } });
    return response.data;
  },
  get: async (id: number) => {
    const response = await apiClient.get(`/cameras/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post('/cameras', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await apiClient.put(`/cameras/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await apiClient.delete(`/cameras/${id}`);
  },
};

export const assetTypeApi = {
  list: async (skip = 0, take = 50) => {
    const response = await apiClient.get('/asset-types', { params: { skip, take } });
    return response.data;
  },
  get: async (id: number) => {
    const response = await apiClient.get(`/asset-types/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post('/asset-types', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await apiClient.put(`/asset-types/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await apiClient.delete(`/asset-types/${id}`);
  },
};

export const dashboardApi = {
  getStats: async () => {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },
};

export const reportApi = {
  list: async (skip = 0, take = 20) => {
    const response = await apiClient.get('/reports', { params: { skip, take } });
    return response.data;
  },
  get: async (id: number) => {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post('/reports', data);
    return response.data;
  },
};

export const bimApi = {
  getModels: async () => {
    const response = await apiClient.get('/v4/bim/models');
    return response.data;
  },
};

export const scadaApi = {
  getGridStatus: async () => {
    const response = await apiClient.get('/v4/scada/grid-status');
    return response.data;
  },
  executeCommand: async (actuatorId: string, action: string) => {
    const response = await apiClient.post('/v4/scada/execute-command', { actuatorId, action });
    return response.data;
  },
};

export const droneApi = {
  getFleet: async () => {
    const response = await apiClient.get('/v4/drones/fleet');
    return response.data;
  },
  dispatchMission: async (droneId: string, missionType: string) => {
    const response = await apiClient.post('/v4/drones/dispatch-mission', { droneId, missionType });
    return response.data;
  },
};

export const complianceApi = {
  getAuditSummary: async () => {
    const response = await apiClient.get('/v4/compliance/audit-summary');
    return response.data;
  },
};


