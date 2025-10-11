import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

// Get BACKEND_URL from environment variables
const BASE_URL = import.meta.env.VITE_BACKEND_URL as string;


// Helper to build full URL
const buildUrl = (url: string): string => `${BASE_URL}${url}`;

// Simplified CRUD operations
const request = {
    get: async <T = any>(url: string, config: AxiosRequestConfig = {}): Promise<T> => {
        const response = await axios.get<T>(buildUrl(url), config);
        return response.data;
    },

    post: async <T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<T> => {
        const response = await axios.post<T>(buildUrl(url), data, config);
        return response.data;
    },

    put: async <T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<T> => {
        const response = await axios.put<T>(buildUrl(url), data, config);
        return response.data;
    },

    delete: async <T = any>(url: string, config: AxiosRequestConfig = {}): Promise<T> => {
        const response = await axios.delete<T>(buildUrl(url), config);
        return response.data;
    }
};

export default request;