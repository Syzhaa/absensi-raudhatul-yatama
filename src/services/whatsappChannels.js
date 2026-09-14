import api from "./api";

export const whatsappChannelsService = {
  getAll: async (params = {}) => {
    const response = await api.get("/attendance/whatsapp-channels", { params });
    return response.data;
  },

  create: async (data, params = {}) => {
    const response = await api.post("/attendance/whatsapp-channels", data, { params });
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/attendance/whatsapp-channels/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/attendance/whatsapp-channels/${id}`);
    return response.data;
  },

  toggle: async (id) => {
    const response = await api.post(`/attendance/whatsapp-channels/${id}/toggle`);
    return response.data;
  },

  testConnection: async (id, data = {}) => {
    const response = await api.post(`/attendance/whatsapp-channels/${id}/test`, data);
    return response.data;
  },
};

export default whatsappChannelsService;
