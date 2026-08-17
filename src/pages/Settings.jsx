import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { authService } from "../services";
import { LogoutModal, TestModeModal, ClearDataModal, ClearSuccessModal } from "../components/SettingsModals";

import { useAppStore } from "../store/useAppStore";

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
  getByMyLembaga: async () => {
    const response = await api.get(`/attendance/settings/my`);
    return response.data;
  },
  updateMyLembaga: async (data) => {
    const response = await api.put(`/attendance/settings/my`, data);
    return response.data;
  },
};

export default function Settings({ onLogout }) {
  const userLembaga = useAppStore((state) => state.userLembaga);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showTestModeModal, setShowTestModeModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showSuccessClearModal, setShowSuccessClearModal] = useState(false);
  const [isClearingTestLogs, setIsClearingTestLogs] = useState(false);
  const queryClient = useQueryClient();
  const setTestMode = useAppStore((state) => state.setTestMode);

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

  const confirmToggleTestMode = () => {
    const nextMode = !formData.test_mode;
    setFormData((prev) => ({ ...prev, test_mode: nextMode }));
    setTestMode(nextMode);
    queryClient.invalidateQueries();
    setShowTestModeModal(false);
  };

  const handleClearTestData = async () => {
    setIsClearingTestLogs(true);
    try {
      await api.delete("/attendance/logs/test");
    } catch (err) {
      console.warn("Backend endpoint clear test response:", err);
    } finally {
      setIsClearingTestLogs(false);
      setShowClearDataModal(false);
      setShowSuccessClearModal(true);
      queryClient.invalidateQueries();
    }
  };

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["settings", "my"],
    queryFn: () => settingsService.getByMyLembaga(),
  });

  const isTestMode = useAppStore((state) => state.isTestMode);

  const [formData, setFormData] = useState({
    attendance_open: settingsData?.data?.attendance_open || "06:00:00",
    attendance_limit: settingsData?.data?.attendance_limit || "07:30:00",
    late_after: settingsData?.data?.late_after || "07:30:00",
    attendance_close: settingsData?.data?.attendance_close || "08:00:00",
    timezone: settingsData?.data?.timezone || "Asia/Makassar",
    test_mode: isTestMode,
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
        timezone: currentSettings.timezone || "Asia/Makassar",
        test_mode: isTestMode, // Pertahankan state lokal dari Zustand
      }));
    }
  }, [settingsData?.data, isTestMode]);

  const updateMutation = useMutation({
    mutationFn: (data) => settingsService.updateMyLembaga(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["settings"]);
      alert("Pengaturan berhasil disimpan!");
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
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
        Loading pengaturan...
      </div>
    );
  }

  return (
    <div className="space-y-4 landscape:space-y-2 pb-40 md:pb-12 landscape:pb-8">
      {/* Header Compact */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 landscape:py-2 shadow-neo landscape:mb-1">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl landscape:text-2xl text-gray-800">
            settings
          </span>
          <div>
            <h1 className="font-black text-xl md:text-2xl landscape:text-lg text-gray-800 tracking-tight">
              Pengaturan Absensi
            </h1>
            <p className="font-medium text-xs md:text-sm text-gray-500 mt-0.5 landscape:hidden">
              Konfigurasi jam operasional & mode testing
            </p>
          </div>
        </div>
      </div>

      {/* 1. Mode Testing Card / Banner (Top Priority) */}
      <div
        className={`border-2 md:border-3 rounded-2xl p-4 shadow-neo transition-all ${
          formData.test_mode
            ? "bg-amber-100 border-amber-500 text-amber-900"
            : "bg-white border-gray-900 text-gray-900"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`material-symbols-outlined text-3xl flex-shrink-0 ${
                formData.test_mode ? "text-amber-700" : "text-gray-700"
              }`}
            >
              science
            </span>
            <div className="min-w-0">
              <h3 className="font-black text-base md:text-lg tracking-tight">
                Mode Testing
              </h3>
              <p className="text-xs text-gray-600 font-medium">
                Simulasi absensi tanpa mengganggu data asli
              </p>
            </div>
          </div>

          {/* iOS Style Toggle Switch with Double Opt-in Popup */}
          <button
            type="button"
            onClick={() => setShowTestModeModal(true)}
            className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-gray-900 transition-colors duration-200 ease-in-out focus:outline-none ${
              formData.test_mode ? "bg-amber-400" : "bg-gray-200"
            }`}
            role="switch"
            aria-checked={formData.test_mode}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white border border-gray-900 shadow transition duration-200 ease-in-out mt-0.5 ${
                formData.test_mode ? "translate-x-6.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Dynamic Warning Message & Clear Test Data Button when Test Mode is Active */}
        {formData.test_mode && (
          <div className="mt-3 space-y-2">
            <div className="p-3 bg-amber-200/80 border border-amber-400 rounded-xl text-xs md:text-sm font-bold text-amber-900 flex items-start gap-2">
              <span className="material-symbols-outlined text-base flex-shrink-0 text-amber-800">
                warning
              </span>
              <span>
                Semua pengaturan di bawah ini sekarang berjalan dalam simulasi.
              </span>
            </div>

            {/* 3. Tombol Hapus Data Test */}
            <button
              type="button"
              onClick={() => setShowClearDataModal(true)}
              className="w-full py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-black text-xs md:text-sm rounded-xl border-2 border-gray-900 shadow-neo transition-all flex items-center justify-center gap-2 active:translate-y-0.5"
            >
              <span className="material-symbols-outlined text-base">
                delete_forever
              </span>
              <span>🗑️ Hapus Semua Data Test</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Static Lembaga Badge */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 shadow-neo">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary-green/20 border-2 border-primary-green rounded-full flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary-green">
              verified_user
            </span>
          </div>
          <div>
            <h3 className="font-black text-sm md:text-base text-gray-900 tracking-tight">
              Otorisasi Lembaga
            </h3>
            <p className="font-bold text-xs md:text-sm text-gray-600 mt-1">
              Anda sedang mengatur sistem operasional untuk lembaga:{" "}
              <span className="text-gray-900 font-black px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">
                {userLembaga ? userLembaga.toUpperCase() : "-"}
              </span>
            </p>
          </div>
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

            <div className="md:col-span-2">
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
          </div>
        </div>

        {/* 4. Preview Pengaturan (Grid Cards 2x2) */}
        <div className="space-y-2">
          <h3 className="font-black text-xs md:text-sm text-gray-800 uppercase tracking-wider pl-1">
            Preview Pengaturan Jam
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
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
                {userLembaga ? userLembaga.toUpperCase() : "Lembaga Aktif"}
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

      {/* 1. Double Opt-in Confirmation Modal for Test Mode */}
      {showTestModeModal && (
        <TestModeModal
          testMode={formData.test_mode}
          onCancel={() => setShowTestModeModal(false)}
          onConfirm={confirmToggleTestMode}
        />
      )}

      {/* 3. Clear Test Data Confirmation Modal */}
      {showClearDataModal && (
        <ClearDataModal
          isClearing={isClearingTestLogs}
          onCancel={() => setShowClearDataModal(false)}
          onConfirm={handleClearTestData}
        />
      )}

      {/* 4. Clear Test Data Success Modal */}
      {showSuccessClearModal && (
        <ClearSuccessModal onClose={() => setShowSuccessClearModal(false)} />
      )}
    </div>
  );
}
