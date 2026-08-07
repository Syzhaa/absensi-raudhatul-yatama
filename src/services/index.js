import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const attendanceService = {
  getDashboard: async (lembaga = null) => {
    const params = lembaga ? { lembaga } : {};
    const response = await api.get('/attendance/dashboard', { params });
    return response.data;
  },
  
  // New: Auto-detect scan (student or teacher)
  scan: async (uuid) => {
    const response = await api.post('/attendance/scan', { uuid });
    return response.data;
  },
  
  // Legacy: specific scan endpoints
  scanStudent: async (uuid) => {
    const response = await api.post('/attendance/scan/student', { uuid });
    return response.data;
  },
  
  scanTeacher: async (uuid) => {
    const response = await api.post('/attendance/scan/teacher', { uuid });
    return response.data;
  },
};

export const studentService = {
  getAll: async (params = {}) => {
    const response = await api.get('/attendance/students', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/attendance/students/${id}`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/attendance/students', data);
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
  
  getQR: async (id) => {
    const response = await api.get(`/attendance/students/${id}/qr`);
    return response.data;
  },
};

export const teacherService = {
  getAll: async (params = {}) => {
    const response = await api.get('/attendance/teachers', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/attendance/teachers/${id}`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/attendance/teachers', data);
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
};

export const settingsService = {
  getAll: async () => {
    const response = await api.get('/attendance/settings');
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
