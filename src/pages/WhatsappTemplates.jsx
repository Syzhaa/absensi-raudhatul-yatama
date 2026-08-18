import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { whatsappTemplateService } from "../services/whatsappTemplates";
import WhatsappTemplateForm from "../components/WhatsappTemplateForm";
import WhatsappTemplatePreview from "../components/WhatsappTemplatePreview";

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "hadir", label: "Hadir", color: "bg-green-100 text-green-800" },
  { value: "terlambat", label: "Terlambat", color: "bg-yellow-100 text-yellow-800" },
  { value: "izin", label: "Izin", color: "bg-blue-100 text-blue-800" },
  { value: "sakit", label: "Sakit", color: "bg-purple-100 text-purple-800" },
  { value: "alpha", label: "Alpha", color: "bg-red-100 text-red-800" },
  { value: "libur", label: "Libur", color: "bg-gray-100 text-gray-800" },
];

export default function WhatsappTemplates() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [statusFilter, setStatusFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Fetch templates
  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-templates", page, perPage, statusFilter, activeFilter, search],
    queryFn: () =>
      whatsappTemplateService.getAll({
        page,
        per_page: perPage,
        ...(statusFilter && { status: statusFilter }),
        ...(activeFilter && { is_active: activeFilter }),
        ...(search && { search }),
      }),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["whatsapp-templates-stats"],
    queryFn: () => whatsappTemplateService.getStats(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => whatsappTemplateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates-stats"] });
    },
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: (id) => whatsappTemplateService.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates-stats"] });
    },
  });

  const handleCreate = () => {
    setSelectedTemplate(null);
    setShowForm(true);
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setShowForm(true);
  };

  const handleDelete = (template) => {
    if (confirm(`Hapus template "${template.status}"? Tindakan ini tidak dapat dibatalkan.`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const handleToggle = (template) => {
    toggleMutation.mutate(template.id);
  };

  const handlePreview = (template) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const getStatusBadge = (status) => {
    const option = STATUS_OPTIONS.find((opt) => opt.value === status);
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${option?.color || "bg-gray-100"}`}>
        {option?.label || status}
      </span>
    );
  };

  // Debug: log data structure
  console.log("API Response:", data);
  
  const templates = data?.data?.data || [];
  const pagination = data?.data || {};
  
  console.log("Templates:", templates);
  console.log("Pagination:", pagination);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl font-black text-gray-900">📱 Template WhatsApp</h1>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl border-3 border-gray-900 shadow-neo-lg hover:shadow-neo-xl transition-all"
          >
            <span className="material-symbols-outlined inline-block mr-2 align-middle">add</span>
            Tambah Template
          </button>
        </div>
      </div>

      {/* Stats Cards - Compact */}
      {stats?.data && (
        <div className="max-w-7xl mx-auto mb-4 grid grid-cols-4 md:grid-cols-7 gap-3">
          <div className="bg-white border-2 border-gray-900 rounded-xl p-3 shadow-neo">
            <div className="text-gray-500 text-xs font-bold mb-1">Total</div>
            <div className="text-2xl font-black text-gray-900">{stats.data.total}</div>
          </div>
          <div className="bg-green-50 border-2 border-gray-900 rounded-xl p-3 shadow-neo">
            <div className="text-green-600 text-xs font-bold mb-1">Aktif</div>
            <div className="text-2xl font-black text-green-700">{stats.data.active}</div>
          </div>
          <div className="bg-red-50 border-2 border-gray-900 rounded-xl p-3 shadow-neo">
            <div className="text-red-600 text-xs font-bold mb-1">Nonaktif</div>
            <div className="text-2xl font-black text-red-700">{stats.data.inactive}</div>
          </div>
          <div className="bg-blue-50 border-2 border-gray-900 rounded-xl p-3 shadow-neo">
            <div className="text-blue-600 text-xs font-bold mb-1">Hadir</div>
            <div className="text-2xl font-black text-blue-700">{stats.data.by_status?.hadir || 0}</div>
          </div>
          <div className="bg-yellow-50 border-2 border-gray-900 rounded-xl p-3 shadow-neo">
            <div className="text-yellow-600 text-xs font-bold mb-1">Telat</div>
            <div className="text-2xl font-black text-yellow-700">{stats.data.by_status?.terlambat || 0}</div>
          </div>
          <div className="bg-purple-50 border-2 border-gray-900 rounded-xl p-3 shadow-neo">
            <div className="text-purple-600 text-xs font-bold mb-1">Izin</div>
            <div className="text-2xl font-black text-purple-700">{stats.data.by_status?.izin || 0}</div>
          </div>
          <div className="bg-teal-50 border-2 border-gray-900 rounded-xl p-3 shadow-neo">
            <div className="text-teal-600 text-xs font-bold mb-1">Pulang</div>
            <div className="text-2xl font-black text-teal-700">{stats.data.by_status?.pulang || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-6 bg-white border-3 border-gray-900 rounded-2xl p-4 shadow-neo">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-900 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Aktif/Nonaktif</label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-900 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              <option value="1">Aktif</option>
              <option value="0">Nonaktif</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">Cari Template</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik kata kunci..."
              className="w-full px-4 py-2 border-2 border-gray-900 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto bg-white border-3 border-gray-900 rounded-2xl shadow-neo-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Tidak ada template ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-3 border-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-black text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-gray-700 uppercase">Salam</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-gray-700 uppercase">Penutup</th>
                  <th className="px-4 py-3 text-center text-xs font-black text-gray-700 uppercase">Aktif</th>
                  <th className="px-4 py-3 text-center text-xs font-black text-gray-700 uppercase">Weight</th>
                  <th className="px-4 py-3 text-center text-xs font-black text-gray-700 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-900">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">{getStatusBadge(template.status)}</td>
                    <td className="px-4 py-4">
                      <div className="max-w-xs truncate text-sm text-gray-700">{template.opening || '-'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-xs truncate text-sm text-gray-700">{template.closing || '-'}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleToggle(template)}
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          template.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {template.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-gray-700">{template.weight}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handlePreview(template)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <span className="material-symbols-outlined text-blue-600">visibility</span>
                        </button>
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-2 hover:bg-yellow-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-yellow-600">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(template)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <span className="material-symbols-outlined text-red-600">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="border-t-3 border-gray-900 px-4 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {pagination.from} - {pagination.to} of {pagination.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border-2 border-gray-900 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.last_page}
                className="px-4 py-2 border-2 border-gray-900 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <WhatsappTemplateForm
          template={selectedTemplate}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
            queryClient.invalidateQueries({ queryKey: ["whatsapp-templates-stats"] });
          }}
        />
      )}

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <WhatsappTemplatePreview template={selectedTemplate} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}
