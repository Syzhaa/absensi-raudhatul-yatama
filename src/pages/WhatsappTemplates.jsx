import React, { useState } from "react";
import DOMPurify from "dompurify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { whatsappTemplateService } from "../services/whatsappTemplates";
import WhatsappTemplateForm from "../components/WhatsappTemplateForm";
import WhatsappTemplatePreview from "../components/WhatsappTemplatePreview";
import { CardSkeleton } from "../components/Skeleton";

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status", dot: "bg-gray-400" },
  { value: "hadir", label: "Hadir", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { value: "terlambat", label: "Terlambat", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "izin", label: "Izin", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "sakit", label: "Sakit", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-800 border-purple-300" },
  { value: "alpha", label: "Alpha", dot: "bg-red-500", badge: "bg-red-100 text-red-800 border-red-300" },
  { value: "libur", label: "Libur", dot: "bg-gray-500", badge: "bg-gray-100 text-gray-800 border-gray-300" },
  { value: "pulang", label: "Pulang", dot: "bg-teal-500", badge: "bg-teal-100 text-teal-800 border-teal-300" },
];

const formatWhatsAppText = (text) => {
  if (!text) return "-";
  let html = text.replace(/\\n/g, "\n");
  html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/\*(.*?)\*/g, "<strong>$1</strong>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");
  html = html.replace(/~(.*?)~/g, "<del>$1</del>");
  html = html.replace(/\n/g, "<br />");
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
};

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

  const { data: stats } = useQuery({
    queryKey: ["whatsapp-templates-stats"],
    queryFn: () => whatsappTemplateService.getStats(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => whatsappTemplateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates-stats"] });
    },
  });

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

  const getStatusConfig = (status) => {
    return STATUS_OPTIONS.find((opt) => opt.value === status) || {
      badge: "bg-gray-100 text-gray-800 border-gray-300",
      dot: "bg-gray-400",
      label: status,
    };
  };

  const templates = data?.data?.data || [];
  const pagination = data?.data || {};

  return (
    <div className="w-full max-w-xl md:max-w-none px-3 sm:px-6 py-3 sm:py-6 space-y-4 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3.5 sm:p-4 shadow-neo flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-primary-green border-2 border-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl text-gray-900">chat_bubble</span>
          </div>
          <div>
            <h1 className="font-black text-base sm:text-xl text-gray-900 tracking-tight leading-tight">
              Template Notifikasi WhatsApp
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
              Kustomisasi format kalimat pembuka & penutup pesan otomatis absensi
            </p>
          </div>
        </div>

        <button
          onClick={handleCreate}
          className="hidden sm:flex items-center justify-center gap-1.5 px-4 py-2 sm:py-2.5 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all active:translate-y-0.5 text-xs sm:text-sm flex-shrink-0"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>Tambah Template</span>
        </button>
      </div>

      {/* Stats Summary Bar - Neo Minimal */}
      {stats?.data && (
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          <div className="bg-white border-2 border-gray-900 rounded-xl p-2 sm:p-2.5 shadow-neo text-center">
            <div className="text-[10px] font-black uppercase text-gray-500">Total</div>
            <div className="text-base sm:text-xl font-black text-gray-900">{stats.data.total || 0}</div>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-xl p-2 sm:p-2.5 shadow-neo text-center">
            <div className="text-[10px] font-black uppercase text-emerald-600">Aktif</div>
            <div className="text-base sm:text-xl font-black text-emerald-700">{stats.data.active || 0}</div>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-xl p-2 sm:p-2.5 shadow-neo text-center">
            <div className="text-[10px] font-black uppercase text-blue-600">Hadir</div>
            <div className="text-base sm:text-xl font-black text-blue-700">{stats.data.by_status?.hadir || 0}</div>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-xl p-2 sm:p-2.5 shadow-neo text-center">
            <div className="text-[10px] font-black uppercase text-amber-600">Telat</div>
            <div className="text-base sm:text-xl font-black text-amber-700">{stats.data.by_status?.terlambat || 0}</div>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-xl p-2 sm:p-2.5 shadow-neo text-center">
            <div className="text-[10px] font-black uppercase text-purple-600">Izin/Skt</div>
            <div className="text-base sm:text-xl font-black text-purple-700">
              {(stats.data.by_status?.izin || 0) + (stats.data.by_status?.sakit || 0)}
            </div>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-xl p-2 sm:p-2.5 shadow-neo text-center">
            <div className="text-[10px] font-black uppercase text-red-600">Alpha</div>
            <div className="text-base sm:text-xl font-black text-red-700">{stats.data.by_status?.alpha || 0}</div>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-xl p-2 sm:p-2.5 shadow-neo text-center">
            <div className="text-[10px] font-black uppercase text-teal-600">Pulang</div>
            <div className="text-base sm:text-xl font-black text-teal-700">{stats.data.by_status?.pulang || 0}</div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3 sm:p-4 shadow-neo flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kata di pembuka / penutup..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
            search
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-bold text-gray-800 focus:outline-none"
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
            className="flex-1 sm:flex-none px-3 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-bold text-gray-800 focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="1">Aktif Saja</option>
            <option value="0">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Template Grid List (Desktop 2-Col, Mobile 1-Col) */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-500 shadow-neo">
            Tidak ada template yang cocok dengan pencarian / filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((template) => {
              const cfg = getStatusConfig(template.status);
              return (
                <div
                  key={template.id}
                  className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3.5 sm:p-4 shadow-neo flex flex-col justify-between gap-3 transition-all hover:translate-x-0.5 hover:-translate-y-0.5"
                >
                  <div className="space-y-2.5">
                    {/* Header Item */}
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border ${cfg.badge}`}>
                          {cfg.label || template.status}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">
                          Weight: {template.weight || 1}
                        </span>
                      </div>

                      {/* Active Status Badge Button */}
                      <button
                        type="button"
                        onClick={() => handleToggle(template)}
                        title="Klik untuk ubah status aktif/nonaktif"
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border transition-transform active:scale-95 ${
                          template.is_active
                            ? "bg-emerald-100 text-emerald-800 border-emerald-400"
                            : "bg-gray-100 text-gray-500 border-gray-300"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${template.is_active ? "bg-emerald-600 animate-pulse" : "bg-gray-400"}`}></span>
                        <span>{template.is_active ? "Aktif" : "Nonaktif"}</span>
                      </button>
                    </div>

                    {/* Opening Content */}
                    <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-200">
                      <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-emerald-600">waving_hand</span>
                        <span>Pembuka:</span>
                      </div>
                      <div className="text-xs text-gray-800 leading-relaxed font-medium">
                        {formatWhatsAppText(template.opening)}
                      </div>
                    </div>

                    {/* Closing Content */}
                    <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-200">
                      <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-blue-600">handshake</span>
                        <span>Penutup:</span>
                      </div>
                      <div className="text-xs text-gray-800 leading-relaxed font-medium">
                        {formatWhatsAppText(template.closing)}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handlePreview(template)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-lg border border-blue-300 flex items-center gap-1 transition-colors"
                      title="Lihat Format Utuh"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => handleEdit(template)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-lg border border-amber-300 flex items-center gap-1 transition-colors"
                      title="Ubah Kalimat"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(template)}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-300 flex items-center justify-center transition-colors"
                      title="Hapus Template"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {pagination.last_page > 1 && (
        <div className="bg-white border-2 border-gray-900 rounded-2xl p-3 shadow-neo flex items-center justify-between gap-2">
          <div className="text-[11px] sm:text-xs font-bold text-gray-600">
            Halaman {pagination.current_page} dari {pagination.last_page} ({pagination.total} template)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border-2 border-gray-900 rounded-lg text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.last_page}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border-2 border-gray-900 rounded-lg text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Mobile Floating Add Button */}
      <button
        onClick={handleCreate}
        className="sm:hidden fixed bottom-24 right-4 w-12 h-12 bg-primary-green text-gray-900 rounded-full border-2 border-gray-900 shadow-neo flex items-center justify-center z-40 active:translate-y-0.5 transition-all"
        title="Tambah Template"
      >
        <span className="material-symbols-outlined text-2xl font-black">add</span>
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
