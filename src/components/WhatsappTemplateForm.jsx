import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { whatsappTemplateService } from "../services/whatsappTemplates";

const STATUS_OPTIONS = [
  { value: "hadir", label: "Hadir" },
  { value: "terlambat", label: "Terlambat" },
  { value: "izin", label: "Izin" },
  { value: "sakit", label: "Sakit" },
  { value: "alpha", label: "Alpha" },
  { value: "libur", label: "Libur" },
  { value: "pulang", label: "Pulang" },
];

export default function WhatsappTemplateForm({ template, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    status: template?.status || "hadir",
    opening: template?.opening || "",
    closing: template?.closing || "",
    weight: template?.weight || 1,
    is_active: template?.is_active ?? true,
  });
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (data) => {
      if (template?.id) {
        return whatsappTemplateService.update(template.id, data);
      }
      return whatsappTemplateService.create(data);
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => {
      setError(err.response?.data?.message || "Terjadi kesalahan");
    },
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (data) => whatsappTemplateService.preview(data),
    onSuccess: (response) => {
      setPreview(response.data.preview);
    },
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePreview = () => {
    previewMutation.mutate({
      opening: formData.opening,
      closing: formData.closing,
      status: formData.status,
      name: "Ahmad Zaki",
      kelas: "XII",
      time: "07:30:00",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!formData.opening.trim()) {
      setError("Salam pembuka tidak boleh kosong");
      return;
    }

    if (!formData.closing.trim()) {
      setError("Penutup tidak boleh kosong");
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white border-3 border-gray-900 rounded-2xl shadow-neo-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gray-50 border-b-3 border-gray-900 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">
            {template ? "Edit Template" : "Tambah Template"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-2 border-red-600 text-red-800 px-4 py-3 rounded-xl font-bold">
              {error}
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Status <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-900 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-1">
              Status kehadiran untuk template ini
            </p>
          </div>

          {/* Opening (Salam) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Salam Pembuka <span className="text-red-600">*</span>
            </label>
            <textarea
              value={formData.opening}
              onChange={(e) => handleChange("opening", e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-900 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Contoh: Assalamualaikum Ayah/Bunda, kami informasikan kehadiran putra-putri Anda hari ini:"
              required
            />
            <p className="text-xs text-gray-600 mt-1">
              Salam pembuka pesan WhatsApp
            </p>
          </div>

          {/* Closing (Penutup) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Penutup <span className="text-red-600">*</span>
            </label>
            <textarea
              value={formData.closing}
              onChange={(e) => handleChange("closing", e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-900 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Contoh: Terima kasih atas perhatiannya.\n\nHormat kami,\nMA Raudhatul Yatama"
              required
            />
            <p className="text-xs text-gray-600 mt-1">
              Penutup pesan WhatsApp
            </p>
          </div>

          {/* Preview Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!formData.opening.trim() || !formData.closing.trim() || previewMutation.isPending}
              className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm inline-block mr-1 align-middle">
                visibility
              </span>
              Preview Pesan
            </button>
          </div>

          {/* Preview Result */}
          {preview && (
            <div className="bg-green-50 border-2 border-green-600 rounded-xl p-4">
              <div className="text-sm font-bold text-green-800 mb-2">Preview:</div>
              <div className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-white p-3 rounded-lg border-2 border-gray-900">
                {preview}
              </div>
            </div>
          )}

          {/* Weight */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Weight (Prioritas)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.weight}
              onChange={(e) => handleChange("weight", parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 border-2 border-gray-900 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-600 mt-1">
              Semakin besar weight, semakin sering template ini dipilih (1-100)
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="w-5 h-5 border-2 border-gray-900 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-bold text-gray-700 cursor-pointer">
              Aktifkan template ini
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t-2 border-gray-900">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl border-2 border-gray-900 shadow-neo hover:shadow-neo-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? "Menyimpan..." : template ? "Update" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
