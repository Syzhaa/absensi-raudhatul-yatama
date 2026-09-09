import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";

export default function WhatsappApi() {
  const queryClient = useQueryClient();
  const { effectiveLembaga } = useEffectiveLembaga();
  const [formData, setFormData] = useState({
    wa_api_key: "",
    wa_is_active: false,
  });

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["whatsapp_settings", effectiveLembaga],
    queryFn: async () => {
      const params = effectiveLembaga ? { lembaga: effectiveLembaga } : {};
      const response = await api.get(`/attendance/whatsapp-settings`, { params });
      return response.data;
    },
  });

  useEffect(() => {
    if (settingsData?.data) {
      setFormData({
        wa_api_key: settingsData.data.wa_api_key || "",
        wa_is_active: settingsData.data.wa_is_active || false,
      });
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const params = effectiveLembaga ? { lembaga: effectiveLembaga } : {};
      const response = await api.put(`/attendance/whatsapp-settings`, data, { params });
      return response.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(["whatsapp_settings", effectiveLembaga]);
      alert("Pengaturan WhatsApp API berhasil disimpan.");
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Gagal menyimpan pengaturan WhatsApp.");
    },
  });

  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testResult, setTestResult] = useState(null);

  const testMutation = useMutation({
    mutationFn: async ({ wa_api_key, phone_number }) => {
      const response = await api.post(`/attendance/whatsapp-settings/test`, {
        wa_api_key,
        phone_number: phone_number || undefined,
      });
      return response.data;
    },
    onSuccess: (res) => {
      setTestResult({
        success: true,
        message: res.message || "Koneksi API WhatsApp Berhasil! Status Terhubung.",
      });
    },
    onError: (err) => {
      setTestResult({
        success: false,
        message: err.response?.data?.message || "Gagal menghubungi WhatsApp Gateway. Cek kembali API Key Anda.",
      });
    },
  });

  const handleTestConnection = (e) => {
    e.preventDefault();
    if (!formData.wa_api_key.trim()) {
      alert("Masukkan API Key terlebih dahulu untuk melakukan pengujian.");
      return;
    }
    setTestResult(null);
    testMutation.mutate({
      wa_api_key: formData.wa_api_key.trim(),
      phone_number: testPhoneNumber.trim(),
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-[#4ade80] border-3 border-gray-900 rounded-2xl flex items-center justify-center shadow-neo">
          <span className="material-symbols-outlined text-3xl text-gray-900 font-bold">
            forum
          </span>
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            WhatsApp Notifier
          </h1>
          <p className="text-gray-600 font-medium">
            Integrasi Notifikasi WhatsApp untuk Absensi
          </p>
        </div>
      </div>

      <div className="bg-white border-3 border-gray-900 rounded-3xl p-6 sm:p-8 shadow-neo-xl">
        <form onSubmit={handleSave} className="space-y-6">
          
          <div className="p-4 bg-blue-50 border-3 border-gray-900 rounded-2xl mb-6">
            <h3 className="font-bold text-gray-900 mb-2">Informasi API</h3>
            <p className="text-sm text-gray-700">
              Sistem ini menggunakan TappDigital WhatsApp API. Silakan buat API Key Anda di{" "}
              <a href="https://wa.tappdigital.id" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">
                wa.tappdigital.id
              </a>
              {" "}dan masukkan di bawah ini. Notifikasi absensi akan dikirim menggunakan format acak secara otomatis.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-200 rounded-xl">
            <div>
              <h3 className="font-bold text-gray-900">Aktifkan Notifikasi WhatsApp</h3>
              <p className="text-sm text-gray-500">
                Mengirim pesan WA ke orang tua saat siswa absen
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.wa_is_active}
                onChange={(e) =>
                  setFormData({ ...formData, wa_is_active: e.target.checked })
                }
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-900">
              API Key (X-Api-Key)
            </label>
            <input
              type="text"
              required={formData.wa_is_active}
              value={formData.wa_api_key}
              onChange={(e) =>
                setFormData({ ...formData, wa_api_key: e.target.value })
              }
              placeholder="Masukkan API Key dari TappDigital API..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-gray-900 focus:ring-0 transition-colors font-mono"
            />
          </div>

          <div className="pt-4 border-t-2 border-gray-100 flex justify-end gap-3">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-6 py-3 bg-[#4ade80] hover:bg-[#22c55e] text-gray-900 font-bold rounded-xl border-3 border-gray-900 shadow-neo transition-all active:translate-y-1 active:shadow-none disabled:opacity-50 flex items-center gap-2"
            >
              {saveMutation.isPending ? (
                <span className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span className="material-symbols-outlined text-lg">save</span>
              )}
              Simpan Pengaturan
            </button>
          </div>
        </form>

        {/* Section Uji Coba Koneksi */}
        <div className="mt-8 pt-6 border-t-3 border-gray-200">
          <div className="mb-4">
            <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">wifi_tethering</span>
              Uji Koneksi & Kirim Pesan Tes
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">
              Pastikan nomor target atau bot gateway aktif. Anda dapat menguji apakah API Key valid dan bisa terhubung ke server gateway WhatsApp.
            </p>
          </div>

          <div className="space-y-4 bg-gray-50 p-4 sm:p-5 rounded-2xl border-2 border-gray-200">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                Nomor WhatsApp Tujuan (Opsional)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-300 focus:border-gray-900 focus:ring-0 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testMutation.isPending}
                  className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm rounded-xl border-2 border-gray-900 shadow-neo transition-all active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {testMutation.isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Menguji...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">send</span>
                      <span>Uji Koneksi Sekarang</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Jika dikosongkan, sistem akan menguji autentikasi API Key ke gateway default.
              </p>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-xl border-2 flex items-start gap-3 transition-all ${
                  testResult.success
                    ? "bg-green-50 border-green-500 text-green-900"
                    : "bg-red-50 border-red-500 text-red-900"
                }`}
              >
                <span className="material-symbols-outlined text-xl flex-shrink-0 mt-0.5">
                  {testResult.success ? "check_circle" : "error"}
                </span>
                <div className="text-xs sm:text-sm font-semibold leading-relaxed">
                  {testResult.message}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
