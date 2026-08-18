import api from "./api";
import { format } from "date-fns";

export const authService = {
  login: async (email, password, deviceId) => {
    const response = await api.post("/auth/login", {
      email,
      password,
      device_id: deviceId,
    });
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  me: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

export const logsService = {
  getAbsentStudents: async (params = {}) => {
    const response = await api.get("/attendance/logs/absent-students", {
      params,
    });
    return response.data;
  },

  createManual: async (data) => {
    const response = await api.post("/attendance/logs/manual", data);
    return response.data;
  },

  updateStatus: async (id, data) => {
    const response = await api.put(`/attendance/logs/${id}/status`, data);
    return response.data;
  },
};
export const attendanceService = {
  getDashboard: async (lembaga = null, kelas = null, date = null) => {
    const params = {};
    if (lembaga) params.lembaga = lembaga;
    if (kelas) params.kelas = kelas;
    if (date) params.date = date;
    const response = await api.get("/attendance/dashboard", { params });
    return response.data;
  },

  getRecentLogs: async (limit = 5, lembaga = null, date = null) => {
    const today = date || format(new Date(), "yyyy-MM-dd");
    const params = { date: today };
    if (lembaga) params.lembaga = lembaga;

    const [studentsRes, teachersRes] = await Promise.all([
      api.get("/attendance/logs/students", { params }),
      api.get("/attendance/logs/teachers", { params }),
    ]);

    const students = (studentsRes.data?.data || []).map((s) => ({
      ...s,
      role: "student",
    }));
    const teachers = (teachersRes.data?.data || []).map((t) => ({
      ...t,
      role: "teacher",
    }));

    const combined = [...students, ...teachers].sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return (b.id || 0) - (a.id || 0);
    });

    return { success: true, data: combined.slice(0, limit) };
  },

  // New: Auto-detect scan (student or teacher) with Anti-Bypass Signature
  scan: async (uuid, scanType = null) => {
    const timestamp = Date.now();
    const secret = import.meta.env.VITE_SCAN_SECRET;
    
    if (!secret) {
      throw new Error("VITE_SCAN_SECRET not configured");
    }

    // Generate SHA-256 Hash
    const msgBuffer = new TextEncoder().encode(uuid + timestamp + secret);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const response = await api.post("/attendance/scan", {
      uuid,
      scan_type: scanType,
      timestamp,
      signature,
    });
    return response.data;
  },

  // Legacy: specific scan endpoints
  scanStudent: async (uuid) => {
    const response = await api.post("/attendance/scan/student", { uuid });
    return response.data;
  },

  scanTeacher: async (uuid) => {
    const response = await api.post("/attendance/scan/teacher", { uuid });
    return response.data;
  },
};

export const studentService = {
  getAll: async (params = {}) => {
    const response = await api.get("/attendance/students", { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/attendance/students/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/attendance/students", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/attendance/students/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/attendance/students/${id}`);
    return response.data;
  },

  uploadPhoto: async (id, file) => {
    const formData = new FormData();
    formData.append("foto", file);
    console.log('Uploading photo for student', id, 'file:', file.name, 'size:', file.size);
    const response = await api.post(`/attendance/students/${id}/photo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    console.log('Upload response:', response.data);
    return response.data;
  },

  deletePhoto: async (id) => {
    const response = await api.delete(`/attendance/students/${id}/photo`);
    return response.data;
  },

  getQR: async (id) => {
    const response = await api.get(`/attendance/students/${id}/qr`);
    return response.data;
  },
};

export const teacherService = {
  getAll: async (params = {}) => {
    const response = await api.get("/attendance/teachers", { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/attendance/teachers/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/attendance/teachers", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/attendance/teachers/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/attendance/teachers/${id}`);
    return response.data;
  },

  getQR: async (id) => {
    const response = await api.get(`/attendance/teachers/${id}/qr`);
    return response.data;
  },

  uploadPhoto: async (id, file) => {
    const formData = new FormData();
    formData.append("foto", file);
    const response = await api.post(`/attendance/teachers/${id}/photo`, formData, {
      headers: { "Content-Type": undefined },
    });
    return response.data;
  },

  deletePhoto: async (id) => {
    const response = await api.delete(`/attendance/teachers/${id}/photo`);
    return response.data;
  },

  setAttendanceStatus: async (id, data) => {
    const response = await api.post(
      `/attendance/teachers/${id}/attendance-status`,
      data,
    );
    return response.data;
  },
};

export const settingsService = {
  getAll: async () => {
    const response = await api.get("/attendance/settings");
    return response.data;
  },

  getByLembaga: async (lembaga) => {
    const response = await api.get(`/attendance/settings/${lembaga}`);
    return response.data;
  },

  update: async (lembaga, data) => {
    const response = await api.put(`/attendance/settings/${lembaga}`, data);
    return response.data;
  },
};

export const holidayService = {
  getAll: async (params = {}) => {
    const response = await api.get("/attendance/holidays", { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/attendance/holidays/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/attendance/holidays", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/attendance/holidays/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/attendance/holidays/${id}`);
    return response.data;
  },
};
