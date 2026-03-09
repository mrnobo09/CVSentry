import axios from "axios";
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

// Add _retry to the type definition to avoid TS errors
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const BASE_URL = import.meta.env.VITE_BACKEND_URL as string;

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => (accessToken = token);
export const getAccessToken = () => accessToken;

const instance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

instance.interceptors.request.use((config) => {
  // Only add header if token exists and it's not already set
  if (accessToken && config.headers) { 
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

instance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalConfig = err.config as CustomAxiosRequestConfig;

    // 1. Skip if the error is FROM the refresh endpoint (prevents loop)
    if (originalConfig.url?.includes("/auth/token/refresh/")) {
      return Promise.reject(err);
    }

    // 2. Skip if we already tried to refresh for this request (prevents loop)
    if (err.response?.status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;

      try {
        const refreshRes = await instance.post("/auth/token/refresh/");
        const newAccess = refreshRes.data.access;
        //console.log(`Token refreshed ${newAccess}`);
        setAccessToken(newAccess);
        
        // Update the header for the retry
        originalConfig.headers.Authorization = `Bearer ${newAccess}`;
        
        // Retry the original request
        return instance(originalConfig);
      } catch (refreshError) {
        // If refresh fails, clear token and reject (redirect to login here if needed)
        setAccessToken(null);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(err);
  }
);


const request = {
  get: async <T = any>(url: string, config: AxiosRequestConfig = {}): Promise<T> =>
    (await instance.get<T>(url, config)).data,

  post: async <T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<T> =>
    (await instance.post<T>(url, data, config)).data,

  put: async <T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<T> =>
    (await instance.put<T>(url, data, config)).data,

  delete: async <T = any>(url: string, config: AxiosRequestConfig = {}): Promise<T> =>
    (await instance.delete<T>(url, config)).data,
};

export default request;