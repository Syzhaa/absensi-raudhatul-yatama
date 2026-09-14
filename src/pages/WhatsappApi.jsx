import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { PageHeaderSkeleton, FormCardSkeleton } from "../components/Skeleton";
import WhatsappChannelsManager from "../components/WhatsappChannelsManager";

export default function WhatsappApi() {
  const queryClient = useQueryClient();
  const { effectiveLembaga } = useEffectiveLembaga();
  const [activeTab, setActiveTab] = useState("settings"); // "settings" | "channels" | "simulator"

  // Settings state
  const [formData, setFormData] = useState({
    wa_api_key: "",
    teacher_whatsapp_api_key: "",
    admin_whatsapp_number: "",
    wa_target_type: "group", // "group" | "parent"
    wa_multi_group: false,
    wa_is_active: false,
  });
  const [showKey, setShowKey] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Simulator state
  const [simStatus, setSimStatus] = useState("hadir");
  const [simNamaSiswa, setSimNamaSiswa] = useState("Ahmad Zaki (Uji Coba)");
  const [simKelas, setSimKelas] = useState("X-A");
  const [simJam, setSimJam] = useState("07:15");
  const [selectedChannelId, setSelectedChannelId] = useState("auto");
  const [selectedRecipientId, setSelectedRecipientId] = useState("manual");
  const [customPhone, setCustomPhone] = useState("");
  const [saveAsNewRecipient, setSaveAsNewRecipient] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState("");
  const [simResult, setSimResult] = useState(null);

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["whatsapp_settings", effectiveLembaga],
    queryFn: async () => {
      const params = effectiveLembaga ? { lembaga: effectiveLembaga } : {};
      const response = await api.get(`/attendance/whatsapp-settings`, { params });
      return response.data;
    },
  });

  // Fetch channels list for simulator selector
  const { data: channelsData } = useQuery({
    queryKey: ["whatsapp-channels", effectiveLembaga],
    queryFn: async () => {
      const params = effectiveLembaga ? { lembaga: effectiveLembaga } : {};
      const response = await api.get(`/attendance/whatsapp-channels`, { params });
      return response.data;
    },
  });

  const channelsList = channelsData?.data?.channels || [];

  // Fetch recipients list
  const { data: recipientsData, isLoading: isRecipientsLoading } = useQuery({
    queryKey: ["whatsapp_test_recipients", effectiveLembaga],
    queryFn: async () => {
      const params = effectiveLembaga ? { lembaga: effectiveLembaga } : {};
      const response = await api.get(`/attendance/whatsapp-settings/recipients`, { params });
      return response.data;
    },
  });

  const recipients = recipientsData?.data || [];

  useEffect(() => {
    if (settingsData?.data) {
      setFormData({
        wa_api_key: settingsData.data.wa_api_key || "",
        teacher_whatsapp_api_key: settingsData.data.teacher_whatsapp_api_key || "",
        admin_whatsapp_number: settingsData.data.admin_whatsapp_number || "",
        wa_target_type: settingsData.data.wa_target_type || "group",
        wa_multi_group: Boolean(settingsData.data.wa_multi_group),
        wa_is_active: Boolean(settingsData.data.wa_is_active),
      });
    }
  }, [settingsData]);

  // Handle auto-fill when recipient dropdown changes
  useEffect(() => {
    if (selectedRecipientId && selectedRecipientId !== "manual") {
      const found = recipients.find((r) => String(r.id) === String(selectedRecipientId));
      if (found) {
        setCustomPhone(found.nomor_wa);
      }
    }
  }, [selectedRecipientId, recipients]);

  // Mutations
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
    mutationFn: async ({ wa_api_key, wa_target_type, phone_number }) => {
      const response = await api.post(`/attendance/whatsapp-settings/test`, {
        wa_api_key,
        wa_target_type,
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

  const simulateMutation = useMutation({
    mutationFn: async (payload) => {
      const params = effectiveLembaga ? { lembaga: effectiveLembaga } : {};
      const response = await api.post(`/attendance/whatsapp-settings/simulate-send`, payload, { params });
      return response.data;
    },
    onSuccess: (res) => {
      setSimResult({
        success: true,
        message: res.message || "Pesan simulasi WhatsApp berhasil terkirim!",
        preview: res.data?.preview_message,
        number: res.data?.number,
      });
      queryClient.invalidateQueries(["whatsapp_test_recipients", effectiveLembaga]);
      if (saveAsNewRecipient) {
        setSaveAsNewRecipient(false);
        setNewRecipientName("");
      }
    },
    onError: (err) => {
      setSimResult({
        success: false,
        message: err.response?.data?.message || "Gagal mengirim pesan simulasi WhatsApp.",
        preview: err.response?.data?.errors?.preview_message,
      });
    },
  });

  const deleteRecipientMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/attendance/whatsapp-settings/recipients/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["whatsapp_test_recipients", effectiveLembaga]);
      if (selectedRecipientId !== "manual") {
        setSelectedRecipientId("manual");
        setCustomPhone("");
      }
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
      wa_target_type: formData.wa_target_type,
      phone_number: testPhoneNumber.trim(),
    });
  };

  const handleSimulate = (e) => {
    e.preventDefault();
    const isGroup = formData.wa_target_type === "group";
    if (!isGroup && !customPhone.trim()) {
      alert("Masukkan atau pilih nomor WhatsApp tujuan simulasi.");
      return;
    }
    if (!isGroup && saveAsNewRecipient && !newRecipientName.trim()) {
      alert("Masukkan nama label untuk nomor tester baru.");
      return;
    }

    setSimResult(null);
    simulateMutation.mutate({
      status: simStatus,
      nama_siswa: simNamaSiswa.trim(),
      kelas: simKelas.trim(),
      jam: simJam.trim(),
      target_type: formData.wa_target_type,
      phone_number: customPhone.trim(),
      channel_id: selectedChannelId !== "auto" ? selectedChannelId : undefined,
      save_recipient: !isGroup && saveAsNewRecipient,
      recipient_name: newRecipientName.trim(),
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
      <div className="w-full max-w-xl md:max-w-none px-3 sm:px-6 py-3 sm:py-6 space-y-4">
        <PageHeaderSkeleton />
        <FormCardSkeleton />
      </div>
    );
  }

  const statusList = [
    { id: "hadir", label: "Hadir", desc: "Tepat Waktu", color: "bg-emerald-500 text-white" },
    { id: "terlambat", label: "Terlambat", desc: "Lewat Batas", color: "bg-amber-500 text-white" },
    { id: "izin", label: "Izin", desc: "Ada Surat", color: "bg-blue-500 text-white" },
    { id: "sakit", label: "Sakit", desc: "Keterangan Sakit", color: "bg-purple-500 text-white" },
    { id: "alpha", label: "Alpha", desc: "Tanpa Keterangan", color: "bg-red-500 text-white" },
    { id: "pulang", label: "Pulang", desc: "Check Out", color: "bg-teal-500 text-white" },
  ];

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
              Pengaturan Gateway & Simulator Pengiriman Pesan Presensi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 border border-gray-300 rounded-lg text-[10px] sm:text-xs font-bold text-gray-700">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>{effectiveLembaga ? effectiveLembaga.toUpperCase() : "MA"}</span>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-gray-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm border-2 transition-all ${
            activeTab === "settings"
              ? "bg-white border-gray-900 text-gray-900 shadow-neo -translate-y-0.5"
              : "bg-gray-100 border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <span className="material-symbols-outlined text-base sm:text-lg">tune</span>
          <span>1. Pengaturan WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("simulator")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm border-2 transition-all ${
            activeTab === "simulator"
              ? "bg-primary-green border-gray-900 text-gray-900 shadow-neo -translate-y-0.5"
              : "bg-gray-100 border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <span className="material-symbols-outlined text-base sm:text-lg">experiment</span>
          <span>2. Simulator & Tes WA</span>
        </button>
      </div>

      {/* TAB 1: PENGATURAN WHATSAPP */}
      {activeTab === "settings" && (
        <form onSubmit={handleSave} className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 sm:p-5 shadow-neo space-y-5">
          {/* Toggle Notifikasi Status */}
          <div className="flex items-center justify-between p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl">
            <div className="pr-2">
              <div className="flex items-center gap-2">
                <span className="font-black text-xs sm:text-sm text-gray-900">Aktifkan Notifikasi WhatsApp Otomatis</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${formData.wa_is_active ? "bg-emerald-100 border-emerald-500 text-emerald-800" : "bg-gray-200 border-gray-400 text-gray-600"}`}>
                  {formData.wa_is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">
                Otomatis kirim pesan notifikasi saat siswa / dewan guru melakukan presensi masuk atau pulang
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

          {/* Target Pengiriman Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-800">
              Tujuan Pengiriman Notifikasi *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`flex items-start gap-2.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.wa_target_type === "group"
                    ? "bg-emerald-50/70 border-emerald-600 shadow-sm"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="wa_target_type"
                  value="group"
                  checked={formData.wa_target_type === "group"}
                  onChange={() => setFormData({ ...formData, wa_target_type: "group" })}
                  className="mt-0.5 text-primary-green focus:ring-primary-green"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-black text-xs text-gray-900">
                    <span className="material-symbols-outlined text-base text-emerald-600">groups</span>
                    <span>Mode Grup WhatsApp (Rekomendasi)</span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5 leading-snug">
                    Pesan dikirim ke grup WhatsApp (bisa grup guru terpisah & grup siswa gabungan atau per kelas).
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.wa_target_type === "parent"
                    ? "bg-blue-50/70 border-blue-600 shadow-sm"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="wa_target_type"
                  value="parent"
                  checked={formData.wa_target_type === "parent"}
                  onChange={() => setFormData({ ...formData, wa_target_type: "parent" })}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-black text-xs text-gray-900">
                    <span className="material-symbols-outlined text-base text-blue-600">person</span>
                    <span>Mode Nomor Biasa (Pribadi)</span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5 leading-snug">
                    Siswa dikirim langsung ke nomor orang tua, guru dikirim ke nomor WhatsApp admin.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* KONDISI 1: JIKA MODE NOMOR BIASA (PRIBADI) */}
          {formData.wa_target_type === "parent" && (
            <div className="p-4 bg-blue-50/50 border-2 border-blue-200 rounded-xl space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-blue-700">chat</span>
                <h3 className="font-black text-xs sm:text-sm text-blue-950 uppercase tracking-wide">
                  Pengaturan Pengiriman Nomor Biasa (Pribadi)
                </h3>
              </div>

              {/* API Key WhatsApp Personal */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-gray-800">
                  API Key WhatsApp (Mode Personal) *
                </label>
                <input
                  type={showKey ? "text" : "password"}
                  value={formData.wa_api_key}
                  onChange={(e) => setFormData({ ...formData, wa_api_key: e.target.value })}
                  placeholder="Contoh: dde8bd906102751122b22d6c2930808241b55135..."
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-mono text-gray-900 focus:outline-none"
                  required={formData.wa_is_active}
                />
                <p className="text-[10px] text-gray-500">
                  API Key dari wa.tappdigital.id untuk mengirimkan pesan ke nomor pribadi langsung.
                </p>
              </div>

              {/* Nomor WhatsApp Admin untuk Notifikasi Guru */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-gray-800">
                  Nomor WhatsApp Admin (Penerima Absensi Dewan Guru)
                </label>
                <input
                  type="tel"
                  value={formData.admin_whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, admin_whatsapp_number: e.target.value })}
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-mono text-gray-900 focus:outline-none"
                />
                <p className="text-[10px] text-gray-500">
                  Saat dewan guru/staf melakukan presensi, laporannya otomatis dikirimkan ke nomor WhatsApp admin ini.
                </p>
              </div>
            </div>
          )}

          {/* KONDISI 2: JIKA MODE GRUP WHATSAPP */}
          {formData.wa_target_type === "group" && (
            <div className="space-y-4">
              {/* 2A. Pengaturan Absensi Guru ke Grup */}
              <div className="p-4 bg-purple-50/60 border-2 border-purple-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-purple-700">badge</span>
                    <h3 className="font-black text-xs sm:text-sm text-purple-950 uppercase tracking-wide">
                      A. API Key Grup Dewan Guru
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded border border-purple-300">
                    Grup Guru
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-gray-800">
                    API Key Grup WhatsApp Dewan Guru
                  </label>
                  <input
                    type={showKey ? "text" : "password"}
                    value={formData.teacher_whatsapp_api_key}
                    onChange={(e) => setFormData({ ...formData, teacher_whatsapp_api_key: e.target.value })}
                    placeholder="Paste API Key grup dewan guru di sini (misal: API Key 1)"
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-mono text-gray-900 focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-500">
                    Setiap guru/staf yang presensi, notifikasinya otomatis masuk ke grup WhatsApp dewan guru ini.
                  </p>
                </div>
              </div>

              {/* 2B. Pengaturan Absensi Siswa ke Grup (Gabung vs Multi Grup Kelas) */}
              <div className="p-4 bg-emerald-50/60 border-2 border-emerald-300 rounded-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-emerald-700">school</span>
                    <h3 className="font-black text-xs sm:text-sm text-emerald-950 uppercase tracking-wide">
                      B. Pengaturan Grup WhatsApp Siswa
                    </h3>
                  </div>
                </div>

                {/* Switch 1 Grup Gabungan vs Multi Grup */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border-2 border-emerald-200 rounded-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-gray-900">
                        Pisahkan Grup Siswa per Kelas?
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          formData.wa_multi_group
                            ? "bg-emerald-100 border-emerald-500 text-emerald-800"
                            : "bg-gray-200 border-gray-400 text-gray-700"
                        }`}
                      >
                        {formData.wa_multi_group ? "ON (Multi-Grup Per Kelas)" : "OFF (1 Grup Gabung)"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                      {formData.wa_multi_group
                        ? "Aktif: Notifikasi per kelas diarahkan ke API Key grup kelas masing-masing."
                        : "Nonaktif: Cukup 1 API Key saja untuk semua siswa semua kelas (1 grup gabungan)."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        wa_multi_group: !prev.wa_multi_group,
                      }))
                    }
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-gray-900 transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.wa_multi_group ? "bg-primary-green" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white border-2 border-gray-900 shadow-sm transition duration-200 ease-in-out mt-0.5 ${
                        formData.wa_multi_group ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* JIKA 1 GRUP GABUNGAN (OFF) */}
                {!formData.wa_multi_group && (
                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-black uppercase text-gray-800">
                      API Key Grup WhatsApp Siswa (Semua Kelas) *
                    </label>
                    <input
                      type={showKey ? "text" : "password"}
                      value={formData.wa_api_key}
                      onChange={(e) => setFormData({ ...formData, wa_api_key: e.target.value })}
                      placeholder="Contoh: dde8bd906102751122b22d6c2930808241b55135..."
                      className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-mono text-gray-900 focus:outline-none"
                      required={formData.wa_is_active}
                    />
                    <p className="text-[10px] text-gray-500">
                      Semua notifikasi presensi siswa otomatis masuk ke grup WhatsApp yang terhubung ke API Key ini.
                    </p>
                  </div>
                )}

                {/* JIKA MULTI GRUP (ON) */}
                {formData.wa_multi_group && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-gray-800">
                        API Key Cadangan / Fallback (Jika Ada Kelas Belum Diatur) *
                      </label>
                      <input
                        type={showKey ? "text" : "password"}
                        value={formData.wa_api_key}
                        onChange={(e) => setFormData({ ...formData, wa_api_key: e.target.value })}
                        placeholder="API Key grup utama sebagai cadangan"
                        className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-mono text-gray-900 focus:outline-none"
                        required={formData.wa_is_active}
                      />
                    </div>

                    <div className="pt-2 border-t border-emerald-200">
                      <WhatsappChannelsManager effectiveLembaga={effectiveLembaga} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section Uji Coba Cepat */}
          <div className="p-3.5 sm:p-4 bg-blue-50/60 border-2 border-blue-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-blue-950">
                <span className="material-symbols-outlined text-base text-blue-600">wifi_tethering</span>
                <span>Tes Ping Koneksi Gateway</span>
              </div>
              <span className="text-[10px] text-gray-500 font-medium">Bisa 08... atau 8...</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="tel"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder={formData.wa_target_type === "group" ? "No. HP Ortu untuk di-tag @ di grup (Opsional)" : "No. WA Penerima (contoh: 08123456789 atau 8123456789)"}
                className="flex-1 px-3 py-2 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-mono text-gray-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={testMutation.isPending || !formData.wa_api_key.trim()}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 font-black text-xs rounded-xl border-2 border-gray-900 shadow-neo transition-all active:translate-y-0.5 disabled:opacity-40 flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer"
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
              className="w-full sm:w-auto px-7 py-3 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black text-xs sm:text-sm rounded-xl border-2 md:border-3 border-gray-900 shadow-neo transition-all active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
      )}

      {/* TAB 2: SIMULATOR & TEST WA */}
      {activeTab === "simulator" && (
        <form onSubmit={handleSimulate} className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 sm:p-5 shadow-neo space-y-5">
          {/* Info Banner Keamanan */}
          <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-start gap-2.5">
            <span className="material-symbols-outlined text-amber-600 text-xl flex-shrink-0 mt-0.5">verified_user</span>
            <div className="text-xs text-amber-900 leading-relaxed font-medium">
              <strong className="font-black text-amber-950">Mode Sandbox Terisolasi:</strong> Pengujian di simulator ini <span className="underline font-bold">tidak akan mengotori</span> tabel data presensi maupun rekap siswa/guru. Pesan WhatsApp dikirim langsung sesuai saluran & tujuan yang dipilih.
            </div>
          </div>

          {/* Selector Saluran Pengiriman Multi API Key */}
          <div className="space-y-1.5 p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-gray-800">
                Pilih Saluran / API Key untuk Simulasi:
              </label>
              <span className="text-[10px] font-bold text-gray-500">
                Multi-Grup Routing
              </span>
            </div>
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-900 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-green"
            >
              <option value="auto">⚡ Otomatis (Sesuai Kelas Siswa / Fallback API Key Utama)</option>
              {channelsList.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name} — [{ch.target_scope === 'class' ? `Kelas ${ch.kelas}` : ch.target_scope === 'teacher' ? 'Dewan Guru' : 'Umum'}] ({ch.target_type === 'group' ? 'Grup' : 'Pribadi'})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-500 font-medium">
              Mode otomatis mencocokkan input kelas siswa tiruan dengan daftar saluran di Tab 2.
            </p>
          </div>

          {/* Skenario Status Presensi */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-800">
              Pilih Skenario Status Presensi:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {statusList.map((st) => (
                <button
                  type="button"
                  key={st.id}
                  onClick={() => setSimStatus(st.id)}
                  className={`p-2.5 rounded-xl border-2 transition-all text-left flex flex-col justify-between ${
                    simStatus === st.id
                      ? "bg-gray-900 border-gray-900 text-white shadow-neo -translate-y-0.5"
                      : "bg-gray-50 border-gray-300 hover:border-gray-900 text-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-black text-xs">{st.label}</span>
                    <span className={`w-2 h-2 rounded-full ${st.id === simStatus ? "bg-primary-green" : "bg-gray-400"}`}></span>
                  </div>
                  <span className={`text-[10px] mt-1 ${simStatus === st.id ? "text-gray-300" : "text-gray-500"}`}>
                    {st.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Variabel Simulasi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-gray-700">Nama Siswa Tiruan</label>
              <input
                type="text"
                value={simNamaSiswa}
                onChange={(e) => setSimNamaSiswa(e.target.value)}
                placeholder="Ahmad Zaki"
                className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-gray-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-gray-700">Kelas Tiruan</label>
              <input
                type="text"
                value={simKelas}
                onChange={(e) => setSimKelas(e.target.value)}
                placeholder="X-A"
                className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-gray-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-gray-700">Waktu / Jam Scan</label>
              <input
                type="text"
                value={simJam}
                onChange={(e) => setSimJam(e.target.value)}
                placeholder="07:15"
                className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>

          {/* Info Mode Pengiriman Simulasi */}
          {formData.wa_target_type === "group" ? (
            <div className="p-3.5 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600 text-2xl">groups</span>
              <div className="flex-1">
                <span className="font-black text-xs text-emerald-900 block">Mode Pengiriman Aktif: Grup WhatsApp</span>
                <span className="text-[11px] text-emerald-700 font-medium">
                  Pesan simulasi akan langsung dikirim ke grup WhatsApp. Nomor orang tua di bawah akan otomatis di-tag / mention (@) di dalam grup.
                </span>
              </div>
            </div>
          ) : null}

          {/* Nomor Tujuan Tester */}
          <div className="space-y-3 p-3.5 sm:p-4 bg-emerald-50/50 border-2 border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-emerald-600">contacts</span>
                <span>{formData.wa_target_type === "group" ? "Nomor WhatsApp Orang Tua (Di-tag @ di Grup)" : "Pilih Nomor WhatsApp Orang Tua Penerima *"}</span>
              </label>
              <span className="text-[10px] text-gray-500 font-medium">Bisa 08... atau 8...</span>
            </div>

            {/* Dropdown Nomor Tersimpan di DB */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">
                  {formData.wa_target_type === "group" ? `Daftar Contoh Nomor Ortu (${effectiveLembaga.toUpperCase()})` : `Daftar Nomor Ortu Tester (${effectiveLembaga.toUpperCase()})`}
                </label>
                <select
                  value={selectedRecipientId}
                  onChange={(e) => setSelectedRecipientId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
                >
                  <option value="manual">+ Ketik Nomor Manual Baru</option>
                  {recipients.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.nama} ({rec.nomor_wa})
                    </option>
                  ))}
                </select>
              </div>

              {/* Input Nomor HP */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">
                  {formData.wa_target_type === "group" ? "Nomor HP Ortu untuk di-tag" : "Nomor WhatsApp Target"}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="tel"
                    required={formData.wa_target_type !== "group"}
                    value={customPhone}
                    onChange={(e) => {
                      setCustomPhone(e.target.value);
                      if (selectedRecipientId !== "manual") {
                        setSelectedRecipientId("manual");
                      }
                    }}
                    placeholder={formData.wa_target_type === "group" ? "Contoh: 08123456789 (akan di-tag @ di grup)" : "Contoh: 08123456789 atau 8123456789"}
                    className="flex-1 px-3 py-2.5 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none"
                  />
                  {selectedRecipientId !== "manual" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Hapus nomor tester ini dari database?")) {
                          deleteRecipientMutation.mutate(selectedRecipientId);
                        }
                      }}
                      title="Hapus dari database"
                      className="p-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl border border-red-300 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Opsi Simpan Nomor Baru ke Database */}
            {selectedRecipientId === "manual" && (
              <div className="pt-2 border-t border-emerald-200/70 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsNewRecipient}
                    onChange={(e) => setSaveAsNewRecipient(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-gray-800">Simpan nomor ini ke database lembaga</span>
                </label>

                {saveAsNewRecipient && (
                  <input
                    type="text"
                    required
                    value={newRecipientName}
                    onChange={(e) => setNewRecipientName(e.target.value)}
                    placeholder="Label/Nama (cth: HP Admin Piket)"
                    className="px-3 py-1.5 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-lg text-xs font-bold text-gray-900 focus:outline-none flex-1"
                  />
                )}
              </div>
            )}
          </div>

          {/* Feedback Hasil Simulasi */}
          {simResult && (
            <div
              className={`p-3.5 rounded-xl border-2 text-xs space-y-2 ${
                simResult.success
                  ? "bg-emerald-50 border-emerald-500 text-emerald-950"
                  : "bg-red-50 border-red-500 text-red-950"
              }`}
            >
              <div className="flex items-center gap-2 font-black">
                <span className="material-symbols-outlined text-lg">
                  {simResult.success ? "check_circle" : "error"}
                </span>
                <span>{simResult.message}</span>
              </div>

              {simResult.preview && (
                <div className="mt-2 p-3 bg-white/80 border border-gray-300 rounded-lg font-mono text-[11px] whitespace-pre-line text-gray-800 shadow-inner">
                  {simResult.preview}
                </div>
              )}
            </div>
          )}

          {/* Tombol Eksekusi Simulasi */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={simulateMutation.isPending}
              className="w-full sm:w-auto px-6 py-3 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black text-xs sm:text-sm rounded-xl border-2 md:border-3 border-gray-900 shadow-neo transition-all active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {simulateMutation.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
                  <span>Mengirim Pesan Simulasi...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">send</span>
                  <span>Kirim Pesan Uji Coba (Status: {simStatus.toUpperCase()})</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
