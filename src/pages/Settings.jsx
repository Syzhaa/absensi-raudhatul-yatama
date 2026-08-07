import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Save, AlertCircle } from 'lucide-react';
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
  useState(() => {
    if (settings) {
      setFormData({
        attendance_open: settings.attendance_open || '06:00:00',
        attendance_limit: settings.attendance_limit || '07:30:00',
        late_after: settings.late_after || '07:30:00',
        attendance_close: settings.attendance_close || '08:00:00',
        timezone: settings.timezone || 'Asia/Makassar',
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
        <div className="text-xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon size={32} />
          <h1 className="text-3xl font-bold">Pengaturan Absensi</h1>
        </div>
        <p className="text-gray-600">
          Atur jam absensi, toleransi keterlambatan, dan pengaturan lainnya untuk setiap lembaga.
        </p>
      </div>

      <div className="card">
        <div className="mb-6">
          <label className="block font-bold mb-3">Pilih Lembaga</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleLembagaChange('MA')}
              className={`flex-1 py-3 px-6 font-bold border-3 border-black transition-all ${
                selectedLembaga === 'MA'
                  ? 'bg-neo-green shadow-neo'
                  : 'bg-white shadow-neo hover:shadow-neo-lg'
              }`}
            >
              MA (Madrasah Aliyah)
            </button>
            <button
              type="button"
              onClick={() => handleLembagaChange('MTs')}
              className={`flex-1 py-3 px-6 font-bold border-3 border-black transition-all ${
                selectedLembaga === 'MTs'
                  ? 'bg-neo-green shadow-neo'
                  : 'bg-white shadow-neo hover:shadow-neo-lg'
              }`}
            >
              MTs (Madrasah Tsanawiyah)
            </button>
          </div>
        </div>

        <div className="p-4 bg-neo-yellow border-3 border-black mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="flex-shrink-0 mt-1" />
            <div>
              <p className="font-bold mb-1">Informasi Penting</p>
              <p className="text-sm">
                Pengaturan ini akan mempengaruhi sistem absensi untuk lembaga <strong>{selectedLembaga}</strong>.
                Pastikan jam yang diatur sesuai dengan kebijakan sekolah.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-bold mb-2">
                Jam Buka Absensi *
                <span className="text-sm font-normal text-gray-600 ml-2">
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
              <p className="text-sm text-gray-600 mt-1">
                Contoh: 06:00 (Absensi dibuka jam 6 pagi)
              </p>
            </div>

            <div>
              <label className="block font-bold mb-2">
                Batas Waktu Hadir *
                <span className="text-sm font-normal text-gray-600 ml-2">
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
              <p className="text-sm text-gray-600 mt-1">
                Contoh: 07:30 (Batas hadir tepat waktu)
              </p>
            </div>

            <div>
              <label className="block font-bold mb-2">
                Mulai Terlambat *
                <span className="text-sm font-normal text-gray-600 ml-2">
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
              <p className="text-sm text-gray-600 mt-1">
                Contoh: 07:30 (Setelah jam ini dianggap terlambat)
              </p>
            </div>

            <div>
              <label className="block font-bold mb-2">
                Jam Tutup Absensi *
                <span className="text-sm font-normal text-gray-600 ml-2">
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
              <p className="text-sm text-gray-600 mt-1">
                Contoh: 08:00 (Absensi ditutup jam 8)
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold mb-2">
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
              <p className="text-sm text-gray-600 mt-1">
                Zona waktu sekolah (default: WITA untuk Sulawesi)
              </p>
            </div>

            <div className="md:col-span-2">
              <div className="card bg-neo-yellow border-2 border-black">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block font-bold mb-1">
                      🧪 Mode Testing
                    </label>
                    <p className="text-sm text-gray-700">
                      Aktifkan untuk testing sistem tanpa mempengaruhi data production. 
                      Data absensi di mode testing akan ditandai khusus.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, test_mode: !formData.test_mode })}
                    className={`relative w-14 h-8 rounded-full border-3 border-black transition-colors ${
                      formData.test_mode ? 'bg-neo-green' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-6 h-6 bg-white border-2 border-black rounded-full transition-transform ${
                        formData.test_mode ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {formData.test_mode && (
                  <div className="mt-3 p-2 bg-white border-2 border-black text-sm">
                    ⚠️ Mode testing aktif - Sistem dalam mode percobaan
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t-3 border-black pt-6">
            <h3 className="font-bold text-lg mb-3">Preview Pengaturan</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card bg-neo-bg">
                <div className="text-sm text-gray-600">Buka Absensi</div>
                <div className="text-2xl font-bold">{formData.attendance_open?.slice(0, 5)}</div>
              </div>
              <div className="card bg-neo-bg">
                <div className="text-sm text-gray-600">Batas Hadir</div>
                <div className="text-2xl font-bold">{formData.attendance_limit?.slice(0, 5)}</div>
              </div>
              <div className="card bg-neo-bg">
                <div className="text-sm text-gray-600">Mulai Terlambat</div>
                <div className="text-2xl font-bold">{formData.late_after?.slice(0, 5)}</div>
              </div>
              <div className="card bg-neo-bg">
                <div className="text-sm text-gray-600">Tutup Absensi</div>
                <div className="text-2xl font-bold">{formData.attendance_close?.slice(0, 5)}</div>
              </div>
            </div>
          </div>

          <div className="border-t-3 border-black pt-6">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={20} />
              <span>{updateMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="card bg-neo-blue">
        <h3 className="font-bold text-lg mb-2">Catatan</h3>
        <ul className="space-y-2 text-sm">
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
