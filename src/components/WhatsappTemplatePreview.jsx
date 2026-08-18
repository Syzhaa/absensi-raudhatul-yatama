import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { whatsappTemplateService } from "../services/whatsappTemplates";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white border-3 border-gray-900 rounded-2xl shadow-neo-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gray-50 border-b-3 border-gray-900 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900">Preview Template</h2>
            <p className="text-sm text-gray-600 mt-1">
              Status: <span className="font-bold capitalize">{template.status}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Sample Data Inputs */}
          <div className="bg-blue-50 border-2 border-blue-600 rounded-xl p-4">
            <div className="text-sm font-bold text-blue-800 mb-3">
              Sample Data (untuk preview)
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama</label>
                <input
                  type="text"
                  value={sampleData.name}
                  onChange={(e) => setSampleData({ ...sampleData, name: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-900 rounded-lg text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Kelas</label>
                <input
                  type="text"
                  value={sampleData.kelas}
                  onChange={(e) => setSampleData({ ...sampleData, kelas: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-900 rounded-lg text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Waktu</label>
                <input
                  type="text"
                  value={sampleData.time}
                  onChange={(e) => setSampleData({ ...sampleData, time: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-900 rounded-lg text-sm font-semibold"
                />
              </div>
            </div>
            <button
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="mt-3 w-full px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {previewMutation.isPending ? "Loading..." : "Generate Preview"}
            </button>
          </div>

          {/* Original Template */}
          <div>
            <div className="text-sm font-bold text-gray-700 mb-2">Template Original:</div>
            <div className="bg-gray-50 border-2 border-gray-900 rounded-xl p-4 space-y-3">
              <div>
                <div className="text-xs font-bold text-gray-600 mb-1">Salam Pembuka:</div>
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-white p-3 rounded-lg border border-gray-300">
{template.opening}
                </pre>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 mb-1">Penutup:</div>
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-white p-3 rounded-lg border border-gray-300">
{template.closing}
                </pre>
              </div>
            </div>
          </div>

          {/* Preview Result */}
          {preview && (
            <div>
              <div className="text-sm font-bold text-gray-700 mb-2">Preview Hasil:</div>
              <div className="bg-green-50 border-2 border-green-600 rounded-xl p-4">
                <div className="bg-white rounded-lg p-4 border-2 border-gray-900 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                      <span className="material-symbols-outlined">chat</span>
                    </div>
                    <div className="flex-1">
                      <div className="bg-white border-2 border-gray-900 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                        <pre className="whitespace-pre-wrap text-sm text-gray-800">
{preview}
                        </pre>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 px-2">
                        WhatsApp Preview
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Template Info */}
          <div className="bg-gray-50 border-2 border-gray-900 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-600 font-bold mb-1">Weight</div>
                <div className="text-xl font-black text-gray-900">{template.weight}</div>
              </div>
              <div>
                <div className="text-gray-600 font-bold mb-1">Status</div>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  template.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}>
                  {template.is_active ? "Aktif" : "Nonaktif"}
                </div>
              </div>
              <div>
                <div className="text-gray-600 font-bold mb-1">ID</div>
                <div className="text-xl font-black text-gray-900">#{template.id}</div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
