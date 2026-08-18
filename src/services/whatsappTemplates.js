import api from "./api";

export const whatsappTemplateService = {
  // Get all templates with filters
  getAll: async (params = {}) => {
    const response = await api.get("/attendance/whatsapp-templates", { params });
    return response.data;
  },

  // Get single template
  getById: async (id) => {
    const response = await api.get(`/attendance/whatsapp-templates/${id}`);
    return response.data;
  },

  // Create new template
  create: async (data) => {
    const response = await api.post("/attendance/whatsapp-templates", data);
    return response.data;
  },

  // Update template
  update: async (id, data) => {
    const response = await api.put(`/attendance/whatsapp-templates/${id}`, data);
    return response.data;
  },

  // Delete template
  delete: async (id) => {
    const response = await api.delete(`/attendance/whatsapp-templates/${id}`);
    return response.data;
  },

  // Toggle active status
  toggle: async (id) => {
    const response = await api.post(`/attendance/whatsapp-templates/${id}/toggle`);
    return response.data;
  },

  // Get statistics
  getStats: async () => {
    const response = await api.get("/attendance/whatsapp-templates/stats");
    return response.data;
  },

  // Preview template
  preview: async (data) => {
    const response = await api.post("/attendance/whatsapp-templates/preview", data);
    return response.data;
  },
};
