import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { authService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { PageHeaderSkeleton, FormCardSkeleton } from "../components/Skeleton";

// TimeInput Helper
function TimeInput({ label, value, onChange, description, required = true }) {
  const displayValue = value ? value.slice(0, 5) : "";

  return (
    <div>
      <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">
        {label} {required && "*"}
      </label>
      <div className="relative">
        <input
          type="time"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3.5 py-2.5 min-h-[44px] bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-bold text-sm text-gray-900 focus:outline-none transition-all"
          required={required}
        />
      </div>
      {description && (
        <p className="text-[11px] text-gray-500 font-medium mt-1 leading-snug">
          {description}
        </p>
      )}
    </div>
  );
}

// Modal Konfirmasi Logout
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-3 border-gray-900 rounded-2xl max-w-sm w-full p-5 shadow-neo animate-bounce-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-red-100 border-2 border-gray-900 rounded-xl flex items-center justify-center text-red-600">
            <span className="material-symbols-outlined text-2xl font-bold">logout</span>
          </div>
          <div>
            <h3 className="font-black text-base text-gray-900">Konfirmasi Keluar</h3>
            <p className="text-xs text-gray-500">Sesi akun akan diakhiri</p>
          </div>
        </div>
        <p className="text-xs text-gray-700 font-medium mb-5 leading-relaxed">
          Apakah Anda yakin ingin keluar dari aplikasi Absensi Raudhatul Yatama?
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-3 border-2 border-gray-900 rounded-xl font-black text-xs text-gray-800 hover:bg-gray-100 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 px-3 bg-red-500 hover:bg-red-600 text-white font-black text-xs border-2 border-gray-900 rounded-xl shadow-neo transition-all"
          >
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal Konfirmasi Reset Data
function ClearAllAttendanceModal({ onConfirm, onCancel, isClearing }) {
  const [confirmCode, setConfirmCode] = useState("");
  const isCodeCorrect = confirmCode === "HAPUS DATA";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-3 border-gray-900 rounded-2xl max-w-md w-full p-5 shadow-neo animate-bounce-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-red-100 border-2 border-gray-900 rounded-xl flex items-center justify-center text-red-600">
            <span className="material-symbols-outlined text-2xl font-bold">delete_forever</span>
          </div>
          <div>
            <h3 className="font-black text-base text-red-600">Hapus Permanen Data Absensi</h3>
            <p className="text-xs text-gray-500">Tindakan ini tidak bisa dibatalkan</p>
          </div>
        </div>
        <p className="text-xs text-gray-700 font-medium mb-3 leading-relaxed">
          Semua catatan presensi siswa & guru di sistem akan dihapus permanen. Ketik <span className="font-mono font-bold text-red-600 bg-red-50 px-1 py-0.5 border border-red-200 rounded">HAPUS DATA</span> untuk konfirmasi.
        </p>
        <input
          type="text"
          placeholder="HAPUS DATA"
          value={confirmCode}
          onChange={(e) => setConfirmCode(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-900 rounded-xl font-mono text-xs font-bold mb-4 focus:outline-none focus:bg-white"
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={isClearing}
            className="flex-1 py-2 px-3 border-2 border-gray-900 rounded-xl font-black text-xs text-gray-800 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={!isCodeCorrect || isClearing}
            className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs border-2 border-gray-900 rounded-xl shadow-neo transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {isClearing ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined text-sm">delete</span>
            )}
            <span>Hapus Permanen</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { effectiveLembaga } = useEffectiveLembaga();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  const [activeTab, setActiveTab] = useState("jam"); // 'jam' | 'format' | 'system'
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["attendance-settings", effectiveLembaga],
    queryFn: () =>
      api
        .get("/attendance/settings", {
          params: effectiveLembaga ? { lembaga: effectiveLembaga } : {},
        })
        .then((r) => r.data),
  });

  const [formData, setFormData] = useState({
    attendance_open: "06:00:00",
    attendance_limit: "07:30:00",
    late_after: "07:30:00",
    attendance_close: "08:00:00",
    auto_alpha_time: "12:00:00",
    enable_teacher_attendance: true,
    timezone: "Asia/Makassar",
    kelas_format: "roman",
  });

  useEffect(() => {
    if (settingsData?.data) {
      const s = settingsData.data;
      setFormData({
        attendance_open: s.attendance_open || s.jam_masuk || "06:00:00",
        attendance_limit: s.attendance_limit || s.jam_batas_masuk || "07:30:00",
        late_after: s.late_after || s.jam_batas_masuk || "07:30:00",
        attendance_close: s.attendance_close || "08:00:00",
        auto_alpha_time: s.auto_alpha_time || s.jam_auto_alpha || "12:00:00",
        enable_teacher_attendance: s.enable_teacher_attendance !== undefined ? Boolean(s.enable_teacher_attendance) : true,
        timezone: s.timezone || "Asia/Makassar",
        kelas_format: s.kelas_format || "roman",
      });
    }
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: (data) =>
      api.put(
        "/attendance/settings",
        effectiveLembaga ? { ...data, lembaga: effectiveLembaga } : data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-settings"] });
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    },
    onError: (error) => {
      const resData = error.response?.data;
      let errorMsg = resData?.message || "Error";
      if (resData?.errors) {
        const errorDetails = Object.values(resData.errors).flat().join(" | ");
        errorMsg += ": " + errorDetails;
      }
      alert("Gagal menyimpan: " + errorMsg);
    },
  });

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleClearAllAttendance = async () => {
    try {
      setIsClearingAll(true);
      await api.delete("/attendance/clear-all", {
        params: effectiveLembaga ? { lembaga: effectiveLembaga } : {},
      });
      setShowClearAllModal(false);
      queryClient.invalidateQueries();
      alert("Semua data absensi berhasil dikosongkan.");
    } catch (err) {
      alert("Gagal menghapus data: " + (err.response?.data?.message || err.message));
    } finally {
      setIsClearingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full md:max-w-none max-w-5xl mx-auto space-y-4">
        <PageHeaderSkeleton />
        <FormCardSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full md:max-w-none max-w-5xl mx-auto space-y-4 pb-20 md:pb-8 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3.5 sm:p-4 shadow-neo flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 border-2 border-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl text-amber-900 font-bold">settings</span>
          </div>
          <div>
            <h1 className="font-black text-base sm:text-xl text-gray-900 tracking-tight leading-tight">
              Pengaturan Sistem
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
              Konfigurasi jam absensi, format penamaan kelas, dan opsi sesi • {effectiveLembaga ? effectiveLembaga.toUpperCase() : "MA"}
            </p>
          </div>
        </div>

        {/* Tab Selector Desktop & Mobile */}
        <div className="flex items-center bg-gray-100 p-1 border-2 border-gray-900 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("jam")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
              activeTab === "jam"
                ? "bg-primary-green text-gray-900 border border-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span>Jam</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("format")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
              activeTab === "format"
                ? "bg-primary-green text-gray-900 border border-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="material-symbols-outlined text-sm">format_list_numbered</span>
            <span>Format</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("system")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
              activeTab === "system"
                ? "bg-primary-green text-gray-900 border border-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="material-symbols-outlined text-sm">security</span>
            <span>Sistem</span>
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="bg-emerald-100 border-2 border-emerald-900 text-emerald-900 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-neo animate-fade-in">
          <span className="material-symbols-outlined text-base text-emerald-700">check_circle</span>
          <span>Pengaturan berhasil disimpan ke server.</span>
        </div>
      )}

      {/* TAB 1: Jam Operasional */}
      {activeTab === "jam" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 md:p-5 shadow-neo space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-black text-sm text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-emerald-600">schedule</span>
                Jam Operasional Presensi
              </h3>
              <span className="text-[11px] text-gray-500 font-medium">Format 24 Jam (HH:mm)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <TimeInput
                label="Jam Buka Absensi"
                value={formData.attendance_open}
                onChange={(val) => setFormData({ ...formData, attendance_open: val ? val + ":00" : "" })}
                description="Siswa & guru mulai bisa melakukan scan masuk"
              />

              <TimeInput
                label="Batas Tepat Waktu"
                value={formData.attendance_limit}
                onChange={(val) => setFormData({ ...formData, attendance_limit: val ? val + ":00" : "" })}
                description="Batas akhir status Hadir Tepat Waktu"
              />

              <TimeInput
                label="Mulai Terlambat"
                value={formData.late_after}
                onChange={(val) => setFormData({ ...formData, late_after: val ? val + ":00" : "" })}
                description="Scan setelah jam ini terhitung Terlambat"
              />

              <TimeInput
                label="Jam Tutup Absensi"
                value={formData.attendance_close}
                onChange={(val) => setFormData({ ...formData, attendance_close: val ? val + ":00" : "" })}
                description="Scan ditolak otomatis setelah jam tutup"
              />

              <TimeInput
                label="Jam Otomatis Alpha"
                value={formData.auto_alpha_time}
                onChange={(val) => setFormData({ ...formData, auto_alpha_time: val ? val + ":00" : "" })}
                description="Siswa belum absen otomatis jadi Alpha di laporan"
              />

              <div>
                <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">
                  Zona Waktu (Timezone) *
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-3 py-2 min-h-[44px] bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-bold text-xs md:text-sm text-gray-900 focus:outline-none cursor-pointer"
                  required
                >
                  <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                </select>
                <p className="text-[11px] text-gray-500 font-medium mt-1">Zona waktu lembaga</p>
              </div>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="bg-white border-2 border-gray-900 rounded-xl p-2.5 text-center shadow-neo">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Jam Buka</span>
              <div className="font-black text-base text-gray-900 mt-0.5">{formData.attendance_open?.slice(0, 5)}</div>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-xl p-2.5 text-center shadow-neo">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Batas Hadir</span>
              <div className="font-black text-base text-emerald-700 mt-0.5">{formData.attendance_limit?.slice(0, 5)}</div>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-xl p-2.5 text-center shadow-neo">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Terlambat</span>
              <div className="font-black text-base text-amber-700 mt-0.5">{formData.late_after?.slice(0, 5)}</div>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-xl p-2.5 text-center shadow-neo">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Jam Tutup</span>
              <div className="font-black text-base text-gray-900 mt-0.5">{formData.attendance_close?.slice(0, 5)}</div>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-xl p-2.5 text-center shadow-neo col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Auto Alpha</span>
              <div className="font-black text-base text-red-600 mt-0.5">{formData.auto_alpha_time?.slice(0, 5)}</div>
            </div>
          </div>

          {/* Single Save Button */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full sm:w-auto px-7 py-2.5 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black text-xs md:text-sm rounded-xl border-2 border-gray-900 shadow-neo transition-all active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending ? (
                <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span className="material-symbols-outlined text-base">save</span>
              )}
              <span>Simpan Jam Presensi</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Format Tingkat Kelas */}
      {activeTab === "format" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 md:p-5 shadow-neo space-y-4">
            <div className="border-b border-gray-100 pb-2">
              <h3 className="font-black text-sm text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-teal-600">school</span>
                Format Penulisan Tingkat Kelas
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Pilih representasi angka atau angka Romawi untuk tampilan kelas di seluruh modul
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, kelas_format: "roman" }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.kelas_format === "roman"
                    ? "bg-emerald-50 border-gray-900 shadow-neo ring-2 ring-emerald-400"
                    : "bg-gray-50 border-gray-300 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-sm text-gray-900">Format Romawi</span>
                  <span className="material-symbols-outlined text-base text-emerald-700">
                    {formData.kelas_format === "roman" ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </div>
                <div className="font-mono text-xs text-gray-600 font-bold">VII, VIII, IX, X, XI, XII</div>
                <p className="text-[11px] text-gray-500 mt-1">Standar penulisan madrasah / sekolah formal</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, kelas_format: "numeric" }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.kelas_format === "numeric"
                    ? "bg-emerald-50 border-gray-900 shadow-neo ring-2 ring-emerald-400"
                    : "bg-gray-50 border-gray-300 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-sm text-gray-900">Format Angka</span>
                  <span className="material-symbols-outlined text-base text-emerald-700">
                    {formData.kelas_format === "numeric" ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </div>
                <div className="font-mono text-xs text-gray-600 font-bold">7, 8, 9, 10, 11, 12</div>
                <p className="text-[11px] text-gray-500 mt-1">Format angka numerik sederhana</p>
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full sm:w-auto px-7 py-2.5 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black text-xs md:text-sm rounded-xl border-2 border-gray-900 shadow-neo transition-all active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">save</span>
              <span>Simpan Format Kelas</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Sistem & Keamanan */}
      {activeTab === "system" && (
        <div className="space-y-4">
          {/* Toggle On/Off Absensi Guru */}
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 md:p-5 shadow-neo">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-100 border-2 border-gray-900 rounded-xl flex items-center justify-center text-indigo-700 flex-shrink-0">
                  <span className="material-symbols-outlined text-xl font-bold">badge</span>
                </div>
                <div>
                  <h3 className="font-black text-sm md:text-base text-gray-900">
                    Modul Presensi Guru
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5 leading-relaxed">
                    Jika dinonaktifkan (OFF), menu guru, rekap absensi guru di dashboard, tab laporan guru, dan pilihan filter guru akan disembunyikan sepenuhnya sehingga sistem hanya menjalankan presensi siswa.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-md border ${formData.enable_teacher_attendance ? "bg-emerald-100 text-emerald-900 border-emerald-400" : "bg-gray-100 text-gray-600 border-gray-300"}`}>
                  {formData.enable_teacher_attendance ? "AKTIF (ON)" : "NONAKTIF (OFF)"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newVal = !formData.enable_teacher_attendance;
                    const updated = { ...formData, enable_teacher_attendance: newVal };
                    setFormData(updated);
                    updateMutation.mutate(updated);
                  }}
                  disabled={updateMutation.isPending}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-gray-900 transition-colors duration-200 ease-in-out focus:outline-none ${formData.enable_teacher_attendance ? "bg-primary-green" : "bg-gray-300"}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white border-2 border-gray-900 shadow-sm transition duration-200 ease-in-out mt-0.5 ${formData.enable_teacher_attendance ? "translate-x-6" : "translate-x-0.5"}`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Danger: Reset Data Absensi */}
            <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 md:p-5 shadow-neo flex flex-col justify-between gap-4">
              <div>
                <div className="w-10 h-10 bg-red-100 border-2 border-gray-900 rounded-xl flex items-center justify-center text-red-600 mb-3">
                  <span className="material-symbols-outlined text-xl font-bold">delete_forever</span>
                </div>
                <h3 className="font-black text-sm md:text-base text-gray-900">Hapus Semua Data Absensi</h3>
                <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
                  Kosongkan seluruh riwayat rekaman presensi siswa & guru di lembaga ini secara permanen dari basis data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowClearAllModal(true)}
                className="py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl border-2 border-gray-900 shadow-neo transition-all active:translate-y-0.5 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                <span>Kosongkan Seluruh Absensi</span>
              </button>
            </div>

            {/* Logout Sesi */}
            <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 md:p-5 shadow-neo flex flex-col justify-between gap-4">
              <div>
                <div className="w-10 h-10 bg-gray-100 border-2 border-gray-900 rounded-xl flex items-center justify-center text-gray-700 mb-3">
                  <span className="material-symbols-outlined text-xl font-bold">logout</span>
                </div>
                <h3 className="font-black text-sm md:text-base text-gray-900">Keluar Sesi Akun</h3>
                <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
                  Akhiri sesi login di perangkat ini dengan aman untuk mencegah akses tidak sah.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="py-2.5 px-4 bg-gray-800 hover:bg-gray-900 text-white font-black text-xs rounded-xl border-2 border-gray-900 shadow-neo transition-all active:translate-y-0.5 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <span>Logout Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showLogoutModal && (
        <LogoutModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogout} />
      )}
      {showClearAllModal && (
        <ClearAllAttendanceModal
          isClearing={isClearingAll}
          onCancel={() => setShowClearAllModal(false)}
          onConfirm={handleClearAllAttendance}
        />
      )}
    </div>
  );
}
