import axios from "axios";
import { useAppStore } from "../store/useAppStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export const getPhotoUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  
  // Fallback if VITE_API_BASE_URL is missing
  const apiBase = import.meta.env.VITE_API_BASE_URL || "https://apima.sylink.my.id/api/v1";
  // Remove /api/v1 or /api to get the root domain
  const baseUrl = apiBase.replace(/\/api(\/v1)?$/, "");
  
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

// Request interceptor untuk inject token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers.Accept = "application/json";
    config.headers["X-Timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor untuk handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Abaikan error 401 jika terjadi saat proses login itu sendiri
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/login")
    ) {
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
