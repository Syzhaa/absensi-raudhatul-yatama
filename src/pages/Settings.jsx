import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const settingsService = {
  getAll: async () => {
    const response = await api.get('/attendance/settings');
    return response.data;
  },
  getByLembaga: async (lembaga) => {
    const response = await api.get(`/attendance/settings/${lembaga}`);
    return response.data;
  },
  update: async (lembaga, data) => {
    const response = await api.put(`/attendance/settings/${lembaga}`, data);
    return response.data;
  },
};

export default function Settings() {
  const [selectedLembaga, setSelectedLembaga] = useState('MA');
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings', selectedLembaga],
    queryFn: () => settingsService.getByLembaga(selectedLembaga),
  });

  const settings = settingsData?.data || {};

  const [formData, setFormData] = useState({
    attendance_open: settings.attendance_open || '06:00:00',
    attendance_limit: settings.attendance_limit || '07:30:00',
    late_after: settings.late_after || '07:30:00',
    attendance_close: settings.attendance_close || '08:00:00',
    timezone: settings.timezone || 'Asia/Makassar',
    test_mode: settings.test_mode || false,
  });

  // Update form when settings data changes
  useEffect(() => {
    if (settings) {
      setFormData({
        attendance_open: settings.attendance_open || '06:00:00',
        attendance_limit: settings.attendance_limit || '07:30:00',
        late_after: settings.late_after || '07:30:00',
        attendance_close: settings.attendance_close || '08:00:00',
        timezone: settings.timezone || 'Asia/Makassar',
        test_mode: settings.test_mode || false,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data) => settingsService.update(selectedLembaga, data),
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

  const handleLembagaChange = (lembaga) => {
    setSelectedLembaga(lembaga);
  };

  if (isLoading) {
    return (
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
        Loading pengaturan...
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-40 md:pb-12">
      {/* Header Compact */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 shadow-neo">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl text-gray-800">settings</span>
          <div>
            <h1 className="font-black text-xl md:text-2xl text-gray-800 tracking-tight">Pengaturan Absensi</h1>
            <p className="font-medium text-xs md:text-sm text-gray-500 mt-0.5">
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

          {/* iOS Style Toggle Switch */}
          <button
            type="button"
            onClick={() => setFormData({ ...formData, test_mode: !formData.test_mode })}
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

        {/* Dynamic Warning Message when Test Mode is Active */}
        {formData.test_mode && (
          <div className="mt-3 p-3 bg-amber-200/80 border border-amber-400 rounded-xl text-xs md:text-sm font-bold text-amber-900 flex items-start gap-2">
            <span className="material-symbols-outlined text-base flex-shrink-0 text-amber-800">warning</span>
            <span>Semua pengaturan di bawah ini sekarang berjalan dalam simulasi.</span>
          </div>
        )}
      </div>

      {/* 3. Segmented Tabs for Lembaga Selection */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 shadow-neo space-y-3">
        <label className="block font-black text-xs md:text-sm text-gray-800 uppercase tracking-wider">
          Pilih Lembaga
        </label>
        
        <div className="grid grid-cols-2 p-1 bg-gray-100 border-2 border-gray-900 rounded-full shadow-neo">
          <button
            type="button"
            onClick={() => handleLembagaChange('MA')}
            className={`py-2.5 px-4 rounded-full text-xs md:text-sm font-black transition-all text-center select-none ${
              selectedLembaga === 'MA'
                ? 'bg-primary-green text-gray-900 shadow-sm border border-gray-900'
                : 'text-gray-600 hover:text-gray-900 font-bold'
            }`}
          >
            MA (Madrasah Aliyah)
          </button>
          <button
            type="button"
            onClick={() => handleLembagaChange('MTs')}
            className={`py-2.5 px-4 rounded-full text-xs md:text-sm font-black transition-all text-center select-none ${
              selectedLembaga === 'MTs'
                ? 'bg-primary-green text-gray-900 shadow-sm border border-gray-900'
                : 'text-gray-600 hover:text-gray-900 font-bold'
            }`}
          >
            MTs (Tsanawiyah)
          </button>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 md:p-6 shadow-neo space-y-4">
          <h3 className="font-black text-sm md:text-base text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2">
            Jam Operasional ({selectedLembaga})
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
            <li>• Berlaku khusus untuk lembaga <strong className="text-gray-900">{selectedLembaga}</strong>.</li>
            <li>• Status <strong className="text-emerald-700">Hadir</strong> otomatis saat scan sebelum jam batas hadir.</li>
            <li>• Status <strong className="text-amber-700">Terlambat</strong> otomatis saat scan setelah jam mulai terlambat.</li>
            <li>• Scan ditolak di luar jam buka dan jam tutup operasional.</li>
          </ul>
        </div>
      </form>

      {/* 5. Sticky Submit Button (Fixed above Floating Bottom Nav) */}
      <div className="fixed bottom-24 left-4 right-4 md:static z-40 md:z-auto">
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
    </div>
  );
}
