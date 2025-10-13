import axios from "axios";
import type { AxiosRequestConfig} from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_URL as string;

// keep token in memory
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => (accessToken = token);

// create one axios instance
const instance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // for refresh cookie
});

// attach JWT
instance.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `JWT ${accessToken}`;
  return config;
});

// handle all 401s here globally
instance.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      try {
        const refresh = await instance.post("/auth/jwt/refresh/");
        accessToken = refresh.data.access;
        err.config.headers.Authorization = `JWT ${accessToken}`;
        return instance(err.config); // retry original request once
      } catch {
        accessToken = null;
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// helper for consistent URL
const buildUrl = (url: string): string => `${BASE_URL}${url}`;

// simplified CRUD — no need for individual try/catch
const request = {
  get: async <T = any>(url: string, config: AxiosRequestConfig = {}): Promise<T> =>
    (await instance.get<T>(buildUrl(url), config)).data,

  post: async <T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<T> =>
    (await instance.post<T>(buildUrl(url), data, config)).data,

  put: async <T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<T> =>
    (await instance.put<T>(buildUrl(url), data, config)).data,

  delete: async <T = any>(url: string, config: AxiosRequestConfig = {}): Promise<T> =>
    (await instance.delete<T>(buildUrl(url), config)).data,
};

export default request;
