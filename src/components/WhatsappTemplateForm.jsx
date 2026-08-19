import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { whatsappTemplateService } from "../services/whatsappTemplates";
import Modal from "./Modal";

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
    opening: template?.opening ? template.opening.replace(/\\n/g, '\n') : "",
    closing: template?.closing ? template.closing.replace(/\\n/g, '\n') : "",
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
      opening: formData.opening.replace(/\n/g, '\\n'),
      closing: formData.closing.replace(/\n/g, '\\n'),
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

    const payload = {
      ...formData,
      opening: formData.opening.replace(/\n/g, '\\n'),
      closing: formData.closing.replace(/\n/g, '\\n')
    };

    mutation.mutate(payload);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={template ? "Edit Template" : "Tambah Template"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border-2 border-red-600 text-red-800 px-3 py-2 rounded-lg text-xs font-bold">
            {error}
          </div>
        )}

        {/* Status */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Status <span className="text-red-600">*</span>
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-900 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Opening (Salam) */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Salam Pembuka <span className="text-red-600">*</span>
          </label>
          <textarea
            value={formData.opening}
            onChange={(e) => handleChange("opening", e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-900 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Contoh: Assalamualaikum Ayah/Bunda..."
            required
          />
        </div>

        {/* Closing (Penutup) */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Penutup <span className="text-red-600">*</span>
          </label>
          <textarea
            value={formData.closing}
            onChange={(e) => handleChange("closing", e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-900 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Terima kasih..."
            required
          />
        </div>

        {/* Preview Button */}
        <button
          type="button"
          onClick={handlePreview}
          disabled={!formData.opening.trim() || !formData.closing.trim() || previewMutation.isPending}
          className="w-full px-3 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm inline-block mr-1 align-middle">
            visibility
          </span>
          Preview Pesan
        </button>

        {/* Preview Result */}
        {preview && (
          <div className="bg-green-50 border-2 border-green-600 rounded-lg p-3">
            <div className="text-[10px] font-bold text-green-800 mb-1">Preview:</div>
            <div className="whitespace-pre-wrap text-xs text-gray-800 font-mono bg-white p-2 rounded-lg border border-gray-300">
              {preview}
            </div>
          </div>
        )}

        {/* Weight & Active Status - inline */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Weight
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.weight}
              onChange={(e) => handleChange("weight", parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border-2 border-gray-900 rounded-lg text-sm font-bold focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="w-4 h-4 border-2 border-gray-900 rounded"
            />
            <label htmlFor="is_active" className="text-xs font-bold text-gray-700 cursor-pointer whitespace-nowrap">
              Aktif
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border-2 border-gray-900 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_#111827] transition-all disabled:opacity-50"
          >
            {mutation.isPending ? "Menyimpan..." : template ? "Update" : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
