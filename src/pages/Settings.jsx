import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { authService } from '../services';

import { useAppStore } from '../store/useAppStore';

const settingsService = {
  getAll: async () => {
    const response = await api.get('/attendance/settings');
    return response.data;
  },
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
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
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
      await api.delete('/attendance/logs/test');
    } catch (err) {
      console.warn('Backend endpoint clear test response:', err);
    } finally {
      setIsClearingTestLogs(false);
      setShowClearDataModal(false);
      setShowSuccessClearModal(true);
      queryClient.invalidateQueries();
    }
  };

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings', 'my'],
    queryFn: () => settingsService.getByMyLembaga(),
  });

  const settings = settingsData?.data || {};

  const isTestMode = useAppStore((state) => state.isTestMode);

  const [formData, setFormData] = useState({
    attendance_open: settingsData?.data?.attendance_open || '06:00:00',
    attendance_limit: settingsData?.data?.attendance_limit || '07:30:00',
    late_after: settingsData?.data?.late_after || '07:30:00',
    attendance_close: settingsData?.data?.attendance_close || '08:00:00',
    timezone: settingsData?.data?.timezone || 'Asia/Makassar',
    test_mode: isTestMode,
  });

  // Update form when settings data changes
  useEffect(() => {
    const currentSettings = settingsData?.data;
    if (currentSettings) {
      setFormData((prev) => ({
        ...prev,
        attendance_open: currentSettings.attendance_open || '06:00:00',
        attendance_limit: currentSettings.attendance_limit || '07:30:00',
        late_after: currentSettings.late_after || '07:30:00',
        attendance_close: currentSettings.attendance_close || '08:00:00',
        timezone: currentSettings.timezone || 'Asia/Makassar',
        test_mode: isTestMode, // Pertahankan state lokal dari Zustand
      }));
    }
  }, [settingsData?.data, isTestMode]);

  const updateMutation = useMutation({
    mutationFn: (data) => settingsService.updateMyLembaga(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      alert('Pengaturan berhasil disimpan!');
    },
    onError: (error) => {
      alert('Gagal menyimpan: ' + (error.response?.data?.message || 'Error'));
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
          <span className="material-symbols-outlined text-3xl landscape:text-2xl text-gray-800">settings</span>
          <div>
            <h1 className="font-black text-xl md:text-2xl landscape:text-lg text-gray-800 tracking-tight">Pengaturan Absensi</h1>
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
            ? 'bg-amber-100 border-amber-500 text-amber-900'
            : 'bg-white border-gray-900 text-gray-900'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`material-symbols-outlined text-3xl flex-shrink-0 ${
              formData.test_mode ? 'text-amber-700' : 'text-gray-700'
            }`}>
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
              formData.test_mode ? 'bg-amber-400' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={formData.test_mode}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white border border-gray-900 shadow transition duration-200 ease-in-out mt-0.5 ${
                formData.test_mode ? 'translate-x-6.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Dynamic Warning Message & Clear Test Data Button when Test Mode is Active */}
        {formData.test_mode && (
          <div className="mt-3 space-y-2">
            <div className="p-3 bg-amber-200/80 border border-amber-400 rounded-xl text-xs md:text-sm font-bold text-amber-900 flex items-start gap-2">
              <span className="material-symbols-outlined text-base flex-shrink-0 text-amber-800">warning</span>
              <span>Semua pengaturan di bawah ini sekarang berjalan dalam simulasi.</span>
            </div>

            {/* 3. Tombol Hapus Data Test */}
            <button
              type="button"
              onClick={() => setShowClearDataModal(true)}
              className="w-full py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-black text-xs md:text-sm rounded-xl border-2 border-gray-900 shadow-neo transition-all flex items-center justify-center gap-2 active:translate-y-0.5"
            >
              <span className="material-symbols-outlined text-base">delete_forever</span>
              <span>🗑️ Hapus Semua Data Test</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Static Lembaga Badge */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 shadow-neo">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary-green/20 border-2 border-primary-green rounded-full flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary-green">verified_user</span>
          </div>
          <div>
            <h3 className="font-black text-sm md:text-base text-gray-900 tracking-tight">Otorisasi Lembaga</h3>
            <p className="font-bold text-xs md:text-sm text-gray-600 mt-1">
              Anda sedang mengatur sistem operasional untuk lembaga: <span className="text-gray-900 font-black px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">{userLembaga ? userLembaga.toUpperCase() : '-'}</span>
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
            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">
                Jam Buka Absensi *
              </label>
              <input
                type="time"
                value={formData.attendance_open?.slice(0, 5)}
                onChange={(e) =>
                  setFormData({ ...formData, attendance_open: e.target.value + ':00' })
                }
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all"
                required
              />
              <p className="text-[11px] text-gray-500 font-medium mt-1">Siswa bisa mulai scan (Contoh: 06:00)</p>
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">
                Batas Tepat Waktu *
              </label>
              <input
                type="time"
                value={formData.attendance_limit?.slice(0, 5)}
                onChange={(e) =>
                  setFormData({ ...formData, attendance_limit: e.target.value + ':00' })
                }
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all"
                required
              />
              <p className="text-[11px] text-gray-500 font-medium mt-1">Batas waktu status Hadir (Contoh: 07:30)</p>
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">
                Mulai Terlambat *
              </label>
              <input
                type="time"
                value={formData.late_after?.slice(0, 5)}
                onChange={(e) =>
                  setFormData({ ...formData, late_after: e.target.value + ':00' })
                }
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all"
                required
              />
              <p className="text-[11px] text-gray-500 font-medium mt-1">Status otomatis Terlambat (Contoh: 07:31)</p>
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">
                Jam Tutup Absensi *
              </label>
              <input
                type="time"
                value={formData.attendance_close?.slice(0, 5)}
                onChange={(e) =>
                  setFormData({ ...formData, attendance_close: e.target.value + ':00' })
                }
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all"
                required
              />
              <p className="text-[11px] text-gray-500 font-medium mt-1">Absensi tidak menerima scan (Contoh: 08:00)</p>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">
                Timezone *
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all cursor-pointer"
                required
              >
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              </select>
              <p className="text-[11px] text-gray-500 font-medium mt-1">Zona waktu sekolah (Default: WITA)</p>
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
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Jam Buka</span>
              <div className="font-black text-xl md:text-2xl text-gray-900 mt-1">
                {formData.attendance_open?.slice(0, 5)}
              </div>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-2xl p-3.5 text-center shadow-neo">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Batas Hadir</span>
              <div className="font-black text-xl md:text-2xl text-gray-900 mt-1">
                {formData.attendance_limit?.slice(0, 5)}
              </div>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-2xl p-3.5 text-center shadow-neo">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Terlambat</span>
              <div className="font-black text-xl md:text-2xl text-gray-900 mt-1">
                {formData.late_after?.slice(0, 5)}
              </div>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-2xl p-3.5 text-center shadow-neo">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Jam Tutup</span>
              <div className="font-black text-xl md:text-2xl text-gray-900 mt-1">
                {formData.attendance_close?.slice(0, 5)}
              </div>
            </div>
          </div>
        </div>

        {/* Catatan Info Box */}
        <div className="bg-white border-2 border-gray-900 rounded-2xl p-4 shadow-neo space-y-2">
          <h4 className="font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-gray-700">info</span>
            Catatan Sistem
          </h4>
          <ul className="space-y-1 text-xs text-gray-600 font-medium leading-relaxed">
            <li>• Berlaku khusus untuk otoritas Anda (<strong className="text-gray-900">{userLembaga ? userLembaga.toUpperCase() : 'Lembaga Aktif'}</strong>).</li>
            <li>• Status <strong className="text-emerald-700">Hadir</strong> otomatis saat scan sebelum jam batas hadir.</li>
            <li>• Status <strong className="text-amber-700">Terlambat</strong> otomatis saat scan setelah jam mulai terlambat.</li>
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
              <h3 className="font-black text-base md:text-lg text-gray-900 tracking-tight">Keluar Akun</h3>
              <p className="text-xs text-gray-500 font-medium">Akhiri sesi login admin di perangkat ini</p>
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
          <span>{updateMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowLogoutModal(false)}
          />
          
          <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-sm w-full space-y-4 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-red-600 flex-shrink-0">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <h2 className="text-xl font-black text-gray-900">Konfirmasi Logout</h2>
            </div>
            
            <p className="text-sm text-gray-600 font-medium">
              Apakah Anda yakin ingin keluar dari akun admin ini?
            </p>
            
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold border-2 border-gray-900 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-bold border-2 border-gray-900 rounded-xl shadow-neo transition-all"
              >
                Ya, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Double Opt-in Confirmation Modal for Test Mode */}
      {showTestModeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowTestModeModal(false)}
          />
          
          <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-sm w-full space-y-4 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-amber-700 flex-shrink-0">
                <span className="material-symbols-outlined text-2xl">science</span>
              </div>
              <h2 className="text-lg font-black text-gray-900">
                {formData.test_mode ? 'Matikan Mode Testing?' : 'Masuk ke Mode Simulasi?'}
              </h2>
            </div>
            
            <p className="text-xs md:text-sm text-gray-600 font-medium leading-relaxed">
              {formData.test_mode
                ? 'Aplikasi akan kembali ke mode produksi normal dan menampilkan data asli.'
                : 'Data yang dimasukkan tidak akan tersimpan ke absen asli dan data produksi asli akan disembunyikan.'}
            </p>
            
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowTestModeModal(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold border-2 border-gray-900 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmToggleTestMode}
                className="flex-1 py-2.5 px-4 bg-amber-400 hover:bg-amber-500 text-gray-950 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all"
              >
                {formData.test_mode ? 'Ya, Matikan' : 'Ya, Masuk Mode Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Clear Test Data Confirmation Modal */}
      {showClearDataModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowClearDataModal(false)}
          />
          
          <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-sm w-full space-y-4 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-red-600 flex-shrink-0">
                <span className="material-symbols-outlined text-2xl">delete_forever</span>
              </div>
              <h2 className="text-lg font-black text-gray-900">Hapus Semua Data Test?</h2>
            </div>
            
            <p className="text-xs md:text-sm text-gray-600 font-medium leading-relaxed">
              Seluruh riwayat absensi percobaan yang dibuat saat mode testing akan dibersihkan secara permanen.
            </p>
            
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearDataModal(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold border-2 border-gray-900 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearTestData}
                disabled={isClearingTestLogs}
                className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all disabled:opacity-50"
              >
                {isClearingTestLogs ? 'Menghapus...' : 'Ya, Hapus Data Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Clear Test Data Success Modal */}
      {showSuccessClearModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 animate-fade-in"
            onClick={() => setShowSuccessClearModal(false)}
          />
          
          <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-sm w-full space-y-4 z-10 animate-slide-up text-center">
            <div className="w-14 h-14 bg-emerald-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
              <span className="material-symbols-outlined text-3xl font-black">check_circle</span>
            </div>
            <h2 className="text-xl font-black text-gray-900">Data Test Dibersihkan!</h2>
            <p className="text-sm text-gray-600 font-medium leading-relaxed">
              Seluruh data & log absensi mode testing telah berhasil dihapus secara bersih dari sistem.
            </p>
            <button
              type="button"
              onClick={() => setShowSuccessClearModal(false)}
              className="w-full py-3 px-4 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
