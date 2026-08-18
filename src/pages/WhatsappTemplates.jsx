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

  // Debug: log data structure removed
  
  const templates = data?.data?.data || [];
  const pagination = data?.data || {};

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header - Desktop Only Button */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="flex items-center justify-end">
          <button
            onClick={handleCreate}
            className="hidden md:flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-green text-gray-900 font-black border-2 md:border-3 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Tambah Template
          </button>
        </div>
      </div>

      {/* Stats Cards - Compact */}
      {stats?.data && (
        <div className="max-w-7xl mx-auto mb-4 grid grid-cols-4 md:grid-cols-7 gap-2">
          <div className="border-2 border-gray-900 rounded-lg p-2 shadow-[2px_2px_0px_#111827]">
            <div className="text-gray-500 text-[10px] font-bold mb-0.5">Total</div>
            <div className="text-xl font-black text-gray-900">{stats.data.total}</div>
          </div>
          <div className="border-2 border-gray-900 rounded-lg p-2 shadow-[2px_2px_0px_#111827]">
            <div className="text-green-600 text-[10px] font-bold mb-0.5">Aktif</div>
            <div className="text-xl font-black text-green-700">{stats.data.active}</div>
          </div>
          <div className="border-2 border-gray-900 rounded-lg p-2 shadow-[2px_2px_0px_#111827]">
            <div className="text-red-600 text-[10px] font-bold mb-0.5">Nonaktif</div>
            <div className="text-xl font-black text-red-700">{stats.data.inactive}</div>
          </div>
          <div className="border-2 border-gray-900 rounded-lg p-2 shadow-[2px_2px_0px_#111827]">
            <div className="text-blue-600 text-[10px] font-bold mb-0.5">Hadir</div>
            <div className="text-xl font-black text-blue-700">{stats.data.by_status?.hadir || 0}</div>
          </div>
          <div className="border-2 border-gray-900 rounded-lg p-2 shadow-[2px_2px_0px_#111827]">
            <div className="text-yellow-600 text-[10px] font-bold mb-0.5">Telat</div>
            <div className="text-xl font-black text-yellow-700">{stats.data.by_status?.terlambat || 0}</div>
          </div>
          <div className="border-2 border-gray-900 rounded-lg p-2 shadow-[2px_2px_0px_#111827]">
            <div className="text-purple-600 text-[10px] font-bold mb-0.5">Izin</div>
            <div className="text-xl font-black text-purple-700">{stats.data.by_status?.izin || 0}</div>
          </div>
          <div className="border-2 border-gray-900 rounded-lg p-2 shadow-[2px_2px_0px_#111827]">
            <div className="text-teal-600 text-[10px] font-bold mb-0.5">Pulang</div>
            <div className="text-xl font-black text-teal-700">{stats.data.by_status?.pulang || 0}</div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="relative mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari template..."
            className="w-full pl-9 pr-3 py-2 border-2 md:border-3 border-gray-900 rounded-xl text-xs md:text-sm font-bold shadow-neo focus:ring-0 focus:outline-none"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
            search
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border-2 border-gray-900 rounded-lg text-xs font-bold shadow-[2px_2px_0px_#111827] focus:outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 border-2 border-gray-900 rounded-lg text-xs font-bold shadow-[2px_2px_0px_#111827] focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="1">Aktif</option>
            <option value="0">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Templates List */}
      <div className="max-w-7xl mx-auto space-y-3">
        {isLoading ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Loading...
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Tidak ada template ditemukan.
          </div>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="border-2 md:border-3 border-gray-900 rounded-xl shadow-[2px_2px_0px_#111827] hover:shadow-[4px_4px_0px_#111827] transition-all p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Status Badge & Active Status in one line */}
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(template.status)}
                    <button
                      onClick={() => handleToggle(template)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        template.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {template.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                    <span className="text-[10px] font-bold text-gray-500">
                      W:{template.weight}
                    </span>
                  </div>

                  {/* Opening Preview */}
                  <div className="mb-2">
                    <div className="text-[10px] font-bold text-gray-500 mb-0.5">Salam:</div>
                    <div className="text-xs text-gray-700 line-clamp-2">
                      {template.opening || '-'}
                    </div>
                  </div>

                  {/* Closing Preview */}
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 mb-0.5">Penutup:</div>
                    <div className="text-xs text-gray-700 line-clamp-2">
                      {template.closing || '-'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => handlePreview(template)}
                    className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Preview"
                  >
                    <span className="material-symbols-outlined text-blue-600 text-lg">visibility</span>
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-1.5 hover:bg-yellow-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-yellow-600 text-lg">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                    title="Hapus"
                  >
                    <span className="material-symbols-outlined text-red-600 text-lg">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="max-w-7xl mx-auto mt-4 flex items-center justify-between px-1">
          <div className="text-[10px] md:text-xs font-bold text-gray-600">
            {pagination.from}-{pagination.to} dari {pagination.total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1.5 border-2 border-gray-900 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_#111827]"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.last_page}
              className="px-3 py-1.5 border-2 border-gray-900 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_#111827]"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      <button
        onClick={handleCreate}
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-primary-green text-gray-900 rounded-full border-3 border-gray-900 shadow-[2px_2px_0px_#111827] flex items-center justify-center z-40 active:translate-y-1 transition-transform"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
      </button>

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
