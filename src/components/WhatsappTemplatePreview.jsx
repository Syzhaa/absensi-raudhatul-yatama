import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { whatsappTemplateService } from "../services/whatsappTemplates";
import Modal from "./Modal";

export default function WhatsappTemplatePreview({ template, onClose }) {
  const [sampleData, setSampleData] = useState({
    name: "Ahmad Zaki",
    kelas: "XII",
    time: "07:30:00",
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
      ...sampleData,
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Preview Template: ${template.status}`}
      size="lg"
    >
      {/* Sample Data Inputs */}
      <div className="bg-blue-50 border-2 border-blue-600 rounded-lg p-3">
        <div className="text-[10px] font-bold text-blue-800 mb-2">
          Sample Data
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Nama</label>
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
        </div>
        <button
          onClick={handlePreview}
          disabled={previewMutation.isPending}
          className="mt-2 w-full px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {previewMutation.isPending ? "Loading..." : "Generate Preview"}
        </button>
      </div>

      {/* Preview Result */}
      {preview && (
        <div className="bg-green-50 border-2 border-green-600 rounded-lg p-3">
          <div className="text-[10px] font-bold text-green-800 mb-1">Preview Hasil:</div>
          <div className="bg-white rounded-lg p-3 border-2 border-gray-900">
            <pre className="whitespace-pre-wrap text-xs text-gray-800">
{preview}
            </pre>
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
            <pre className="whitespace-pre-wrap text-xs text-gray-800 bg-white p-2 rounded border border-gray-300">
{template.opening}
            </pre>
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-600 mb-0.5">Penutup:</div>
            <pre className="whitespace-pre-wrap text-xs text-gray-800 bg-white p-2 rounded border border-gray-300">
{template.closing}
            </pre>
          </div>
        </div>
      </div>
    </Modal>
  );
}
