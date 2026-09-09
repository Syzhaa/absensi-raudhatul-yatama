import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { authService } from "../services";
import { LogoutModal, ClearSuccessModal, SettingsSuccessModal, ClearAllAttendanceModal } from "../components/SettingsModals";

import { useAppStore } from "../store/useAppStore";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { PageHeaderSkeleton, FormCardSkeleton } from "../components/Skeleton";

function TimeInput({ label, value, onChange, description }) {
  const [localValue, setLocalValue] = useState(value ? value.slice(0, 5) : "");

  useEffect(() => {
    if (value && value.slice(0, 5) !== localValue) {
      setLocalValue(value.slice(0, 5));
    }
  }, [value]);

  const handleChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, "");
    if (val.length >= 3) {
      val = val.slice(0, 2) + ":" + val.slice(2, 4);
    }
    setLocalValue(val);
    if (val.length === 5 || val === "") {
      onChange(val);
    }
  };

  return (
    <div>
      <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">
        {label} *
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={localValue}
          onChange={handleChange}
          placeholder="00:00"
          maxLength="5"
          pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
          className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all pr-12"
          required
        />
        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          schedule
        </span>
      </div>
      <p className="text-[11px] text-gray-500 font-medium mt-1">
        {description}
      </p>
    </div>
  );
}

const settingsService = {
  getByLembaga: async (lembaga) => {
    const params = lembaga ? { lembaga } : {};
    const response = await api.get(`/attendance/settings/my`, { params });
    return response.data;
  },
  updateLembaga: async (lembaga, data) => {
    const params = lembaga ? { lembaga } : {};
    const response = await api.put(`/attendance/settings/my`, data, { params });
    return response.data;
  },
};

export default function Settings({ onLogout }) {
  const { effectiveLembaga, isLoading: isLembagaLoading } = useEffectiveLembaga();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showSuccessClearModal, setShowSuccessClearModal] = useState(false);
  const [showSettingsSuccessModal, setShowSettingsSuccessModal] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("auth_token");
      setShowLogoutModal(false);
      if (onLogout) onLogout();
    }
  };

  const handleClearAllAttendance = async () => {
    setIsClearingAll(true);
    try {
      await api.delete("/attendance/clear-all");
      queryClient.invalidateQueries();
      setShowClearAllModal(false);
      setShowSuccessClearModal(true);
    } catch (err) {
      console.error("Failed to clear all attendance:", err);
      alert("Gagal menghapus data absen: " + (err.response?.data?.message || "Error"));
    } finally {
      setIsClearingAll(false);
    }
  };

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["settings", effectiveLembaga],
    queryFn: () => settingsService.getByLembaga(effectiveLembaga),
    enabled: !isLembagaLoading,
  });

  const [formData, setFormData] = useState({
    attendance_open: settingsData?.data?.attendance_open || "06:00:00",
    attendance_limit: settingsData?.data?.attendance_limit || "07:30:00",
    late_after: settingsData?.data?.late_after || "07:30:00",
    attendance_close: settingsData?.data?.attendance_close || "08:00:00",
    auto_alpha_time: settingsData?.data?.auto_alpha_time || "12:00:00",
    timezone: settingsData?.data?.timezone || "Asia/Makassar",
    kelas_format: settingsData?.data?.kelas_format || "roman",
  });

  // Update form when settings data changes
  useEffect(() => {
    const currentSettings = settingsData?.data;
    if (currentSettings) {
      setFormData((prev) => ({
        ...prev,
        attendance_open: currentSettings.attendance_open || "06:00:00",
        attendance_limit: currentSettings.attendance_limit || "07:30:00",
        late_after: currentSettings.late_after || "07:30:00",
        attendance_close: currentSettings.attendance_close || "08:00:00",
        auto_alpha_time: currentSettings.auto_alpha_time || "12:00:00",
        kelas_format: currentSettings.kelas_format || "roman",
        timezone: currentSettings.timezone || "Asia/Makassar",
      }));
    }
  }, [settingsData?.data]);

  const updateMutation = useMutation({
    mutationFn: (data) => settingsService.updateLembaga(effectiveLembaga, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["students_for_kelas"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowSettingsSuccessModal(true);
    },
    onError: (error) => {
      alert("Gagal menyimpan: " + (error.response?.data?.message || "Error"));
    },
  });

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 pb-40 md:pb-12">
        <PageHeaderSkeleton />
        <FormCardSkeleton />
        <FormCardSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full md:max-w-none max-w-5xl mx-auto space-y-4 pb-32 md:pb-12 animate-fade-in">
      {/* Header Compact */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3.5 sm:p-4 shadow-neo flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 border-2 border-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl text-amber-900 font-bold">
              settings
            </span>
          </div>
          <div>
            <h1 className="font-black text-base sm:text-xl text-gray-900 tracking-tight leading-tight">
              Pengaturan Absensi
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
              Konfigurasi jam operasional sistem presensi & format kelas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-300 rounded-xl text-xs font-bold text-gray-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{effectiveLembaga ? effectiveLembaga.toUpperCase() : "MA"}</span>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 md:p-6 shadow-neo space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="font-black text-sm md:text-base text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-emerald-600">schedule</span>
              Jam Operasional Presensi
            </h3>
            <span className="text-[11px] text-gray-500 font-medium">Format 24 Jam (HH:mm)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <TimeInput
              label="Jam Buka Absensi"
              value={formData.attendance_open}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  attendance_open: val ? val + ":00" : "",
                })
              }
              description="Siswa & guru bisa mulai scan masuk"
            />

            <TimeInput
              label="Batas Tepat Waktu"
              value={formData.attendance_limit}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  attendance_limit: val ? val + ":00" : "",
                })
              }
              description="Batas akhir status Hadir Tepat Waktu"
            />

            <TimeInput
              label="Mulai Terlambat"
              value={formData.late_after}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  late_after: val ? val + ":00" : "",
                })
              }
              description="Scan setelah jam ini terhitung Terlambat"
            />

            <TimeInput
              label="Jam Tutup Absensi"
              value={formData.attendance_close}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  attendance_close: val ? val + ":00" : "",
                })
              }
              description="Scan ditolak setelah jam tutup"
            />

            <TimeInput
              label="Jam Otomatis Alpha"
              value={formData.auto_alpha_time}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  auto_alpha_time: val ? val + ":00" : "",
                })
              }
              description="Belum absen otomatis jadi Alpha di laporan"
            />

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">
                Zona Waktu (Timezone) *
              </label>
              <select
                value={formData.timezone}
                onChange={(e) =>
                  setFormData({ ...formData, timezone: e.target.value })
                }
                className="w-full px-3.5 py-2.5 min-h-[44px] bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-bold text-xs md:text-sm text-gray-900 focus:outline-none transition-all cursor-pointer"
                required
              >
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              </select>
              <p className="text-[11px] text-gray-500 font-medium mt-1">
                Zona waktu operasional sekolah
              </p>
            </div>
          </div>

          {/* Toggle Format Kelas */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">
              Format Penulisan Tingkat Kelas
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-50 border-2 border-gray-200 rounded-xl p-3">
              <span className="material-symbols-outlined text-gray-600 text-2xl hidden sm:block">school</span>
              <div className="flex-1 w-full">
                <div className="flex bg-gray-200/80 p-1 rounded-xl border-2 border-gray-900 w-full gap-1.5 max-w-md">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        kelas_format: "roman",
                      }))
                    }
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      formData.kelas_format === "roman"
                        ? "bg-primary-green text-gray-900 shadow-sm border border-gray-900"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {formData.kelas_format === "roman" ? "check_circle" : "radio_button_unchecked"}
                    </span>
                    Romawi (VII, X...)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        kelas_format: "numeric",
                      }))
                    }
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      formData.kelas_format === "numeric"
                        ? "bg-primary-green text-gray-900 shadow-sm border border-gray-900"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {formData.kelas_format === "numeric" ? "check_circle" : "radio_button_unchecked"}
                    </span>
                    Angka (7, 10...)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Jam Operasional */}
        <div className="space-y-2">
          <h3 className="font-black text-xs md:text-sm text-gray-800 uppercase tracking-wider pl-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-gray-700">preview</span>
            <span>Ringkasan Jam Aktif</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <div className="bg-white border-2 border-gray-900 rounded-xl p-3 text-center shadow-neo">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Jam Buka</span>
              <div className="font-black text-lg text-gray-900 mt-0.5">{formData.attendance_open?.slice(0, 5)}</div>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-xl p-3 text-center shadow-neo">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Batas Hadir</span>
              <div className="font-black text-lg text-emerald-700 mt-0.5">{formData.attendance_limit?.slice(0, 5)}</div>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-xl p-3 text-center shadow-neo">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Mulai Telat</span>
              <div className="font-black text-lg text-amber-700 mt-0.5">{formData.late_after?.slice(0, 5)}</div>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-xl p-3 text-center shadow-neo">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Jam Tutup</span>
              <div className="font-black text-lg text-gray-900 mt-0.5">{formData.attendance_close?.slice(0, 5)}</div>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-xl p-3 text-center shadow-neo col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Auto Alpha</span>
              <div className="font-black text-lg text-red-600 mt-0.5">{formData.auto_alpha_time?.slice(0, 5)}</div>
            </div>
          </div>
        </div>

        {/* Tombol Simpan Form */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="w-full sm:w-auto px-8 py-3 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black text-sm rounded-xl border-2 md:border-3 border-gray-900 shadow-neo transition-all active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updateMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined text-lg">save</span>
            )}
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>

      {/* Danger Zone & Logout di Bawah */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t-2 border-gray-200">
        {/* Danger Zone - Reset Data */}
        <div className="bg-red-50/50 border-2 border-red-300 rounded-2xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-red-100 border border-red-400 rounded-xl flex items-center justify-center text-red-600 flex-shrink-0">
              <span className="material-symbols-outlined text-xl">delete_forever</span>
            </div>
            <div>
              <h3 className="font-black text-sm text-red-950">Hapus Semua Data Absensi</h3>
              <p className="text-[11px] text-red-800 font-medium mt-0.5">
                Mengosongkan semua riwayat absensi siswa & guru secara permanen.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowClearAllModal(true)}
            className="w-full sm:w-auto self-end py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl border border-red-900 transition-all active:translate-y-0.5 flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            <span>Bersihkan Data</span>
          </button>
        </div>

        {/* Keluar Akun */}
        <div className="bg-gray-50 border-2 border-gray-300 rounded-2xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-gray-200 border border-gray-400 rounded-xl flex items-center justify-center text-gray-700 flex-shrink-0">
              <span className="material-symbols-outlined text-xl">logout</span>
            </div>
            <div>
              <h3 className="font-black text-sm text-gray-900">Keluar Sesi Akun</h3>
              <p className="text-[11px] text-gray-600 font-medium mt-0.5">
                Akhiri sesi login admin di perangkat ini dengan aman.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full sm:w-auto self-end py-2 px-4 bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs rounded-xl border border-gray-900 transition-all active:translate-y-0.5 flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span>Logout Akun</span>
          </button>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 md:p-6 shadow-neo space-y-4">
          <h3 className="font-black text-sm md:text-base text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2">
            Jam Operasional
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TimeInput
              label="Jam Buka Absensi"
              value={formData.attendance_open}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  attendance_open: val ? val + ":00" : "",
                })
              }
              description="Siswa bisa mulai scan (Contoh: 06:00)"
            />

            <TimeInput
              label="Batas Tepat Waktu"
              value={formData.attendance_limit}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  attendance_limit: val ? val + ":00" : "",
                })
              }
              description="Batas waktu status Hadir (Contoh: 07:30)"
            />

            <TimeInput
              label="Mulai Terlambat"
              value={formData.late_after}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  late_after: val ? val + ":00" : "",
                })
              }
              description="Status otomatis Terlambat (Contoh: 07:31)"
            />

            <TimeInput
              label="Jam Tutup Absensi"
              value={formData.attendance_close}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  attendance_close: val ? val + ":00" : "",
                })
              }
              description="Absensi tidak menerima scan (Contoh: 14:00)"
            />

            <TimeInput
              label="Jam Otomatis Alpha"
              value={formData.auto_alpha_time}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  auto_alpha_time: val ? val + ":00" : "",
                })
              }
              description="Siswa belum absen otomatis jadi Alpha di laporan (Contoh: 12:00)"
            />

            <div className="md:col-span-2 grid grid-cols-1 gap-4">
              <div>
                <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">
                  Timezone *
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) =>
                    setFormData({ ...formData, timezone: e.target.value })
                  }
                  className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all cursor-pointer"
                  required
                >
                  <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                </select>
                <p className="text-[11px] text-gray-500 font-medium mt-1">
                  Zona waktu sekolah (Default: WITA)
                </p>
              </div>

              {/* Toggle Format Kelas */}
              <div className="md:col-span-2">
                <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">
                  Format Tampilan Kelas
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-100 border-2 border-gray-200 rounded-xl p-3">
                  <span className="material-symbols-outlined text-gray-600 text-2xl hidden sm:block">school</span>
                  <div className="flex-1 w-full">
                    <p className="text-xs text-gray-500 mb-2 font-medium">
                      Pilih format penulisan tingkat kelas:
                    </p>
                    <div className="flex bg-gray-200 p-1.5 rounded-xl border-2 border-gray-900 w-full gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            kelas_format: "roman",
                          }))
                        }
                        className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                          formData.kelas_format === "roman"
                            ? "bg-primary-green text-gray-900 shadow-neo border-2 border-gray-900"
                            : "bg-white/50 text-gray-600 hover:text-gray-900 hover:bg-white border-2 border-transparent"
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {formData.kelas_format === "roman" ? "check_circle" : "radio_button_unchecked"}
                        </span>
                        Romawi (VII, VIII, IX...)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            kelas_format: "numeric",
                          }))
                        }
                        className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                          formData.kelas_format === "numeric"
                            ? "bg-primary-green text-gray-900 shadow-neo border-2 border-gray-900"
                            : "bg-white/50 text-gray-600 hover:text-gray-900 hover:bg-white border-2 border-transparent"
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {formData.kelas_format === "numeric" ? "check_circle" : "radio_button_unchecked"}
                        </span>
                        Angka Biasa (7, 8, 9...)
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 font-medium mt-1">
                  Romawi: VII, VIII, IX, X, XI, XII • Biasa: 7, 8, 9, 10, 11, 12
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Preview Pengaturan (Grid Cards 2x2) */}
        <div className="space-y-2">
          <h3 className="font-black text-xs md:text-sm text-gray-800 uppercase tracking-wider pl-1">
            Preview Pengaturan Jam
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
            <div className="bg-white border-2 border-gray-900 rounded-2xl p-3.5 text-center shadow-neo">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Jam Buka
              </span>
              <div className="font-black text-xl md:text-2xl text-gray-900 mt-1">
                {formData.attendance_open?.slice(0, 5)}
              </div>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-2xl p-3.5 text-center shadow-neo">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Batas Hadir
              </span>
              <div className="font-black text-xl md:text-2xl text-gray-900 mt-1">
                {formData.attendance_limit?.slice(0, 5)}
              </div>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-2xl p-3.5 text-center shadow-neo">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Terlambat
              </span>
              <div className="font-black text-xl md:text-2xl text-gray-900 mt-1">
                {formData.late_after?.slice(0, 5)}
              </div>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-2xl p-3.5 text-center shadow-neo">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Jam Tutup
              </span>
              <div className="font-black text-xl md:text-2xl text-gray-900 mt-1">
                {formData.attendance_close?.slice(0, 5)}
              </div>
            </div>

            <div className="bg-white border-2 border-gray-900 rounded-2xl p-3.5 text-center shadow-neo">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Auto Alpha
              </span>
              <div className="font-black text-xl md:text-2xl text-red-600 mt-1">
                {formData.auto_alpha_time?.slice(0, 5)}
              </div>
            </div>
          </div>
        </div>

        {/* Catatan Info Box */}
        <div className="bg-white border-2 border-gray-900 rounded-2xl p-4 shadow-neo space-y-2">
          <h4 className="font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-gray-700">
              info
            </span>
            Catatan Sistem
          </h4>
          <ul className="space-y-1 text-xs text-gray-600 font-medium leading-relaxed">
            <li>
              • Berlaku khusus untuk otoritas Anda (
              <strong className="text-gray-900">
                {effectiveLembaga ? effectiveLembaga.toUpperCase() : "Semua Lembaga"}
              </strong>
              ).
            </li>
            <li>
              • Status <strong className="text-emerald-700">Hadir</strong>{" "}
              otomatis saat scan sebelum jam batas hadir.
            </li>
            <li>
              • Status <strong className="text-amber-700">Terlambat</strong>{" "}
              otomatis saat scan setelah jam mulai terlambat.
            </li>
            <li>• Scan ditolak di luar jam buka dan jam tutup operasional.</li>
          </ul>
        </div>

        {/* Logout Account Section */}
        <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 shadow-neo space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-red-600 flex-shrink-0">
              <span className="material-symbols-outlined text-xl">logout</span>
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg text-gray-900 tracking-tight">
                Keluar Akun
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Akhiri sesi login admin di perangkat ini
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-black text-sm md:text-base rounded-xl border-2 border-gray-900 shadow-neo transition-all flex items-center justify-center gap-2 active:translate-y-0.5"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span>Logout / Keluar</span>
          </button>
        </div>
      </form>

      {/* 5. Sticky Submit Button (Fixed above Floating Bottom Nav) */}
      <div className="fixed portrait:bottom-24 left-4 right-4 md:static landscape:static landscape:mt-4 z-40 md:z-auto">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="w-full py-3.5 px-6 bg-primary-green text-gray-900 font-black text-base md:text-lg rounded-full border-3 border-gray-900 shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-2xl">save</span>
          <span>
            {updateMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
          </span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <LogoutModal
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={handleLogout}
        />
      )}

      {/* Clear All Attendance Confirmation Modal */}
      {showClearAllModal && (
        <ClearAllAttendanceModal
          isClearing={isClearingAll}
          onCancel={() => setShowClearAllModal(false)}
          onConfirm={handleClearAllAttendance}
        />
      )}

      {/* 4. Clear Success Modal */}
      {showSuccessClearModal && (
        <ClearSuccessModal onClose={() => setShowSuccessClearModal(false)} />
      )}

      {/* 5. Settings Save Success Modal */}
      {showSettingsSuccessModal && (
        <SettingsSuccessModal onClose={() => setShowSettingsSuccessModal(false)} />
      )}
    </div>
  );
}
