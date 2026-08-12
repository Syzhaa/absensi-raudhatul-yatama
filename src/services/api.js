import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor untuk inject token & flag test mode
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers.Accept = "application/json";

    // Inject Test Mode flag secara otomatis jika mode testing aktif
    const isTestMode = localStorage.getItem("is_test_mode") === "true";
    if (isTestMode) {
      config.headers["X-Test-Mode"] = "true";
      config.params = { ...config.params, mode: "test", is_test: true };
    }

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
