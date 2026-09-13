import React, { useState } from "react";
import DOMPurify from "dompurify";
import { useMutation } from "@tanstack/react-query";
import { whatsappTemplateService } from "../services/whatsappTemplates";
import Modal from "./Modal";

const formatWhatsAppText = (text) => {
  if (!text) return '-';
  let html = text.replace(/\\n/g, '\n');
  html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  html = html.replace(/~(.*?)~/g, '<del>$1</del>');
  html = html.replace(/\n/g, '<br />');
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
};

export default function WhatsappTemplatePreview({ template, onClose }) {
  const isGroup = (template?.target_type || "personal") === "group";
  const [sampleData, setSampleData] = useState({
    name: "Ahmad Zaki",
    kelas: "XII",
    time: "07:30:00",
    parent_phone: "083142477851",
  });
  const [preview, setPreview] = useState("");

  const previewMutation = useMutation({
    mutationFn: (data) => whatsappTemplateService.preview(data),
    onSuccess: (response) => {
      setPreview(response.data.preview);
    },
  });

  // Auto preview on mount
  React.useEffect(() => {
    handlePreview();
  }, []);

  const handlePreview = () => {
    previewMutation.mutate({
      opening: template.opening,
      closing: template.closing,
      status: template.status,
      target_type: template.target_type || "personal",
      parent_phone: isGroup ? sampleData.parent_phone : null,
      ...sampleData,
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Preview Template: ${template.status.toUpperCase()}`}
      size="lg"
    >
      <div className="space-y-3">
        {/* Target Type Badge */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600">Mode Notifikasi:</span>
            {isGroup ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="material-symbols-outlined text-sm">groups</span>
                Grup WhatsApp
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">
                <span className="material-symbols-outlined text-sm">person</span>
                Pribadi (Ortu)
              </span>
            )}
          </div>
          <span className="text-[11px] text-gray-500 font-medium">Bobot acak: {template.weight || 1}</span>
        </div>

        {/* Sample Data Inputs */}
        <div className="bg-blue-50 border-2 border-blue-600 rounded-lg p-3">
          <div className="text-[10px] font-bold text-blue-800 mb-2">
            Sample Data Uji Coba
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Nama Siswa</label>
              <input
                type="text"
                value={sampleData.name}
                onChange={(e) => setSampleData({ ...sampleData, name: e.target.value })}
                className="w-full px-2 py-1.5 border-2 border-gray-900 rounded-lg text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Kelas</label>
              <input
                type="text"
                value={sampleData.kelas}
                onChange={(e) => setSampleData({ ...sampleData, kelas: e.target.value })}
                className="w-full px-2 py-1.5 border-2 border-gray-900 rounded-lg text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Waktu</label>
              <input
                type="text"
                value={sampleData.time}
                onChange={(e) => setSampleData({ ...sampleData, time: e.target.value })}
                className="w-full px-2 py-1.5 border-2 border-gray-900 rounded-lg text-xs font-semibold"
              />
            </div>
            {isGroup && (
              <div className="col-span-2 sm:col-span-3">
                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">No. HP Ortu (Di-tag @ di Grup)</label>
                <input
                  type="text"
                  value={sampleData.parent_phone}
                  onChange={(e) => setSampleData({ ...sampleData, parent_phone: e.target.value })}
                  className="w-full px-2 py-1.5 border-2 border-gray-900 rounded-lg text-xs font-mono font-semibold"
                />
              </div>
            )}
          </div>
          <button
            onClick={handlePreview}
            disabled={previewMutation.isPending}
            className="mt-2 w-full px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {previewMutation.isPending ? "Memuat Preview..." : "Perbarui Preview"}
          </button>
        </div>

      {/* Preview Result */}
      {preview && (
        <div className="bg-green-50 border-2 border-green-600 rounded-lg p-3">
          <div className="text-[10px] font-bold text-green-800 mb-1">Preview Hasil:</div>
          <div className="bg-white rounded-lg p-3 border-2 border-gray-900 text-xs text-gray-800">
            {formatWhatsAppText(preview)}
          </div>
        </div>
      )}

      {/* Template Info */}
      <div className="bg-gray-50 border-2 border-gray-900 rounded-lg p-3">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-gray-600 font-bold mb-0.5 text-[10px]">Weight</div>
            <div className="text-lg font-black text-gray-900">{template.weight}</div>
          </div>
          <div>
            <div className="text-gray-600 font-bold mb-0.5 text-[10px]">Status</div>
            <div className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
              template.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}>
              {template.is_active ? "Aktif" : "Nonaktif"}
            </div>
          </div>
          <div>
            <div className="text-gray-600 font-bold mb-0.5 text-[10px]">ID</div>
            <div className="text-lg font-black text-gray-900">#{template.id}</div>
          </div>
        </div>
      </div>

      {/* Original Template - Compact */}
      <div>
        <div className="text-[10px] font-bold text-gray-700 mb-1">Template Original:</div>
        <div className="bg-gray-50 border-2 border-gray-900 rounded-lg p-2 space-y-2">
          <div>
            <div className="text-[10px] font-bold text-gray-600 mb-0.5">Salam:</div>
            <div className="text-xs text-gray-800 bg-white p-2 rounded border border-gray-300">
              {formatWhatsAppText(template.opening)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-600 mb-0.5">Penutup:</div>
            <div className="text-xs text-gray-800 bg-white p-2 rounded border border-gray-300">
              {formatWhatsAppText(template.closing)}
            </div>
          </div>
        </div>
      </div>
      </div>
    </Modal>
  );
}
