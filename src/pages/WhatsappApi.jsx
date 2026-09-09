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
  const [showKey, setShowKey] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);

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
    onSuccess: () => {
      queryClient.invalidateQueries(["whatsapp_settings", effectiveLembaga]);
      alert("Pengaturan WhatsApp API berhasil disimpan.");
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Gagal menyimpan pengaturan WhatsApp.");
    },
  });

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
        message: res.message || "Koneksi Berhasil! API Key aktif dan terhubung.",
      });
    },
    onError: (err) => {
      setTestResult({
        success: false,
        message: err.response?.data?.message || "Gagal terhubung. Pastikan API Key benar dan akun aktif di wa.tappdigital.id",
      });
    },
  });

  const handleTest = (e) => {
    e.preventDefault();
    if (!formData.wa_api_key.trim()) {
      alert("Masukkan API Key terlebih dahulu.");
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

  const handleCopy = () => {
    if (!formData.wa_api_key) return;
    navigator.clipboard.writeText(formData.wa_api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="w-10 h-10 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl md:max-w-none px-3 sm:px-6 py-3 sm:py-6 space-y-4 animate-fade-in">
      {/* Header Compact */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3.5 sm:p-4 shadow-neo flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-primary-green border-2 border-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl text-gray-900">forum</span>
          </div>
          <div>
            <h1 className="font-black text-base sm:text-xl text-gray-900 tracking-tight leading-tight">
              WhatsApp Notifier
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
              Notifikasi otomatis presensi siswa via gateway TappDigital
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 border border-gray-300 rounded-lg text-[10px] sm:text-xs font-bold text-gray-700">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>{effectiveLembaga ? effectiveLembaga.toUpperCase() : "MA"}</span>
        </div>
      </div>

      {/* Main Settings Card */}
      <form onSubmit={handleSave} className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 sm:p-5 shadow-neo space-y-4">
        
        {/* Toggle Notifikasi Status */}
        <div className="flex items-center justify-between p-3 sm:p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl">
          <div className="pr-2">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs sm:text-sm text-gray-900">Aktifkan Notifikasi WhatsApp</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${formData.wa_is_active ? "bg-emerald-100 border-emerald-500 text-emerald-800" : "bg-gray-200 border-gray-400 text-gray-600"}`}>
                {formData.wa_is_active ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">
              Otomatis kirim pesan WA ke no. ortu saat siswa scan masuk / pulang
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={formData.wa_is_active}
              onChange={(e) => setFormData({ ...formData, wa_is_active: e.target.checked })}
            />
            <div className="w-12 h-6.5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-green"></div>
          </label>
        </div>

        {/* Input API Key */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-800">
              API Key (X-Api-Key) *
            </label>
            <a
              href="https://wa.tappdigital.id"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
            >
              <span>Dapatkan Key di wa.tappdigital.id</span>
              <span className="material-symbols-outlined text-xs">open_in_new</span>
            </a>
          </div>

          <div className="relative flex items-center">
            <input
              type={showKey ? "text" : "password"}
              required={formData.wa_is_active}
              value={formData.wa_api_key}
              onChange={(e) => setFormData({ ...formData, wa_api_key: e.target.value })}
              placeholder="Contoh: bacd84814bf8e3aec1eae755f65e675f..."
              className="w-full pl-3.5 pr-20 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl text-xs sm:text-sm font-mono text-gray-900 transition-all focus:outline-none"
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? "Sembunyikan" : "Tampilkan"}
                className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <span className="material-symbols-outlined text-base">
                  {showKey ? "visibility_off" : "visibility"}
                </span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                title="Salin Key"
                disabled={!formData.wa_api_key}
                className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-base">
                  {copied ? "check" : "content_copy"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Section Uji Coba Terpadu */}
        <div className="p-3.5 sm:p-4 bg-blue-50/60 border-2 border-blue-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-blue-950">
              <span className="material-symbols-outlined text-base text-blue-600">wifi_tethering</span>
              <span>Uji Koneksi & Kirim Tes</span>
            </div>
            <span className="text-[10px] text-gray-500 font-medium">Opsional sebelum simpan</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="tel"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
              placeholder="No. WA Penerima (cth: 081234567890)"
              className="flex-1 px-3 py-2 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-mono text-gray-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleTest}
              disabled={testMutation.isPending || !formData.wa_api_key.trim()}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 font-black text-xs rounded-xl border-2 border-gray-900 shadow-neo transition-all active:translate-y-0.5 disabled:opacity-40 flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              {testMutation.isPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
                  <span>Menguji...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm text-blue-600">send</span>
                  <span>Tes Koneksi</span>
                </>
              )}
            </button>
          </div>

          {testResult && (
            <div
              className={`p-2.5 rounded-lg border text-xs font-medium flex items-start gap-2 ${
                testResult.success
                  ? "bg-emerald-50 border-emerald-400 text-emerald-900"
                  : "bg-red-50 border-red-400 text-red-900"
              }`}
            >
              <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">
                {testResult.success ? "check_circle" : "error"}
              </span>
              <span className="leading-snug">{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Action Button Simpan */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black text-xs sm:text-sm rounded-xl border-2 md:border-3 border-gray-900 shadow-neo transition-all active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saveMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined text-lg">save</span>
            )}
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
}
