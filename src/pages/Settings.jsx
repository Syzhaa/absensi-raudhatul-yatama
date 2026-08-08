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
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleLembagaChange = (lembaga) => {
    setSelectedLembaga(lembaga);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="font-bold text-xl text-gray-800">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-4xl text-primary">settings</span>
          <h1 className="font-bold text-2xl text-gray-800">Pengaturan Absensi</h1>
        </div>
        <p className="font-normal text-sm text-gray-600">
          Atur jam absensi, toleransi keterlambatan, dan pengaturan lainnya untuk setiap lembaga.
        </p>
      </div>

      <div className="card">
        <div className="mb-6">
          <label className="block font-semibold text-base text-gray-800 mb-3">Pilih Lembaga</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleLembagaChange('MA')}
              className={`flex-1 py-3 px-6 font-semibold border-3 border-gray-900 transition-all neo-btn ${
                selectedLembaga === 'MA'
                  ? 'bg-primary-green text-gray-800 shadow-neo'
                  : 'bg-white text-gray-800 shadow-neo hover:clean-shadow-md'
              }`}
            >
              MA (Madrasah Aliyah)
            </button>
            <button
              type="button"
              onClick={() => handleLembagaChange('MTs')}
              className={`flex-1 py-3 px-6 font-semibold border-3 border-gray-900 transition-all neo-btn ${
                selectedLembaga === 'MTs'
                  ? 'bg-primary-green text-gray-800 shadow-neo'
                  : 'bg-white text-gray-800 shadow-neo hover:clean-shadow-md'
              }`}
            >
              MTs (Madrasah Tsanawiyah)
            </button>
          </div>
        </div>

        <div className="p-4 bg-yellow-200 border-3 border-gray-900 mb-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-2xl flex-shrink-0 text-gray-800">info</span>
            <div>
              <p className="font-semibold text-base text-gray-800 mb-1">Informasi Penting</p>
              <p className="font-normal text-sm text-gray-800">
                Pengaturan ini akan mempengaruhi sistem absensi untuk lembaga <strong>{selectedLembaga}</strong>.
                Pastikan jam yang diatur sesuai dengan kebijakan sekolah.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-semibold text-base text-gray-800 mb-2">
                Jam Buka Absensi *
                <span className="font-normal text-sm font-normal text-gray-600 ml-2">
                  (Siswa bisa mulai absen)
                </span>
              </label>
              <input
                type="time"
                value={formData.attendance_open}
                onChange={(e) =>
                  setFormData({ ...formData, attendance_open: e.target.value + ':00' })
                }
                className="input"
                required
              />
              <p className="font-normal text-sm text-gray-600 mt-1">
                Contoh: 06:00 (Absensi dibuka jam 6 pagi)
              </p>
            </div>

            <div>
              <label className="block font-semibold text-base text-gray-800 mb-2">
                Batas Waktu Hadir *
                <span className="font-normal text-sm font-normal text-gray-600 ml-2">
                  (Batas tepat waktu)
                </span>
              </label>
              <input
                type="time"
                value={formData.attendance_limit}
                onChange={(e) =>
                  setFormData({ ...formData, attendance_limit: e.target.value + ':00' })
                }
                className="input"
                required
              />
              <p className="font-normal text-sm text-gray-600 mt-1">
                Contoh: 07:30 (Batas hadir tepat waktu)
              </p>
            </div>

            <div>
              <label className="block font-semibold text-base text-gray-800 mb-2">
                Mulai Terlambat *
                <span className="font-normal text-sm font-normal text-gray-600 ml-2">
                  (Status berubah terlambat)
                </span>
              </label>
              <input
                type="time"
                value={formData.late_after}
                onChange={(e) =>
                  setFormData({ ...formData, late_after: e.target.value + ':00' })
                }
                className="input"
                required
              />
              <p className="font-normal text-sm text-gray-600 mt-1">
                Contoh: 07:30 (Setelah jam ini dianggap terlambat)
              </p>
            </div>

            <div>
              <label className="block font-semibold text-base text-gray-800 mb-2">
                Jam Tutup Absensi *
                <span className="font-normal text-sm font-normal text-gray-600 ml-2">
                  (Absensi ditutup)
                </span>
              </label>
              <input
                type="time"
                value={formData.attendance_close}
                onChange={(e) =>
                  setFormData({ ...formData, attendance_close: e.target.value + ':00' })
                }
                className="input"
                required
              />
              <p className="font-normal text-sm text-gray-600 mt-1">
                Contoh: 08:00 (Absensi ditutup jam 8)
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-base text-gray-800 mb-2">
                Timezone *
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="input"
                required
              >
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              </select>
              <p className="font-normal text-sm text-gray-600 mt-1">
                Zona waktu sekolah (default: WITA untuk Sulawesi)
              </p>
            </div>

            <div className="md:col-span-2">
              <div className="card bg-yellow-200 border-2 border-gray-900">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block font-semibold text-base text-gray-800 mb-1">
                      🧪 Mode Testing
                    </label>
                    <p className="font-normal text-sm text-gray-800">
                      Aktifkan untuk testing sistem tanpa mempengaruhi data production. 
                      Data absensi di mode testing akan ditandai khusus.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, test_mode: !formData.test_mode })}
                    className={`relative w-14 h-8 rounded-full border-3 border-gray-900 transition-colors ${
                      formData.test_mode ? 'bg-primary-green' : 'bg-gray-50'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-6 h-6 bg-white border-2 border-gray-900 rounded-full transition-transform ${
                        formData.test_mode ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {formData.test_mode && (
                  <div className="mt-3 p-2 bg-white border-2 border-gray-900 font-normal text-sm text-gray-800">
                    ⚠️ Mode testing aktif - Sistem dalam mode percobaan
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t-3 border-gray-900 pt-6">
            <h3 className="font-bold text-xl text-gray-800 mb-3">Preview Pengaturan</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card bg-gray-50">
                <div className="font-normal text-sm text-gray-600">Buka Absensi</div>
                <div className="font-bold text-xl text-gray-800">{formData.attendance_open?.slice(0, 5)}</div>
              </div>
              <div className="card bg-gray-50">
                <div className="font-normal text-sm text-gray-600">Batas Hadir</div>
                <div className="font-bold text-xl text-gray-800">{formData.attendance_limit?.slice(0, 5)}</div>
              </div>
              <div className="card bg-gray-50">
                <div className="font-normal text-sm text-gray-600">Mulai Terlambat</div>
                <div className="font-bold text-xl text-gray-800">{formData.late_after?.slice(0, 5)}</div>
              </div>
              <div className="card bg-gray-50">
                <div className="font-normal text-sm text-gray-600">Tutup Absensi</div>
                <div className="font-bold text-xl text-gray-800">{formData.attendance_close?.slice(0, 5)}</div>
              </div>
            </div>
          </div>

          <div className="border-t-3 border-gray-900 pt-6">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full btn-primary neo-btn disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">save</span>
              <span>{updateMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="card bg-purple-100">
        <h3 className="font-bold text-xl text-white mb-2">Catatan</h3>
        <ul className="space-y-2 font-normal text-sm text-white">
          <li>• Pengaturan ini berlaku untuk lembaga <strong>{selectedLembaga}</strong> saja</li>
          <li>• Status "Hadir" akan otomatis diberikan jika scan sebelum jam batas hadir</li>
          <li>• Status "Terlambat" akan otomatis diberikan jika scan setelah jam terlambat</li>
          <li>• Siswa tidak bisa melakukan absensi di luar jam buka dan tutup</li>
          <li>• Timezone mempengaruhi perhitungan waktu sistem</li>
        </ul>
      </div>
    </div>
  );
}
