import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherService } from '../services';
import Modal from '../components/Modal';
import QRCode from 'qrcode';

export default function Teachers() {
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [formData, setFormData] = useState({
    lembaga: 'MA',
    nama: '',
    nip: '',
    mata_pelajaran: '',
    nomor_hp: '',
    status: 'aktif',
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teacherService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: teacherService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers']);
      resetForm();
      alert('Guru berhasil ditambahkan');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => teacherService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers']);
      resetForm();
      alert('Guru berhasil diupdate');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: teacherService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers']);
      alert('Guru berhasil dihapus');
    },
    onError: (error) => {
      alert('Gagal menghapus guru: ' + (error.message || 'Unknown error'));
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingTeacher(null);
    setFormData({
      lembaga: 'MA',
      nama: '',
      nip: '',
      mata_pelajaran: '',
      nomor_hp: '',
      status: 'aktif',
    });
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      lembaga: teacher.lembaga,
      nama: teacher.nama,
      nip: teacher.nip || '',
      mata_pelajaran: teacher.mata_pelajaran || '',
      nomor_hp: teacher.nomor_hp || '',
      status: teacher.status,
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTeacher) {
      updateMutation.mutate({ id: editingTeacher.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Yakin ingin menghapus guru ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTeachers(teachers.map(t => t.id));
    } else {
      setSelectedTeachers([]);
    }
  };

  const handleSelectTeacher = (id) => {
    if (selectedTeachers.includes(id)) {
      setSelectedTeachers(selectedTeachers.filter(tid => tid !== id));
    } else {
      setSelectedTeachers([...selectedTeachers, id]);
    }
  };

  const handleGenerateQR = async () => {
    if (selectedTeachers.length === 0) {
      alert('Pilih guru terlebih dahulu');
      return;
    }

    try {
      const selectedData = teachers.filter(t => selectedTeachers.includes(t.id));
      
      for (const teacher of selectedData) {
        const qrData = teacher.uuid;
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, qrData, { width: 300, margin: 2 });
        
        const link = document.createElement('a');
        link.download = `guru-${teacher.nama.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      alert(`Berhasil generate ${selectedTeachers.length} QR code`);
      setSelectedTeachers([]);
    } catch (error) {
      alert('Gagal generate QR: ' + error.message);
    }
  };

  const teachers = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header Compact */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 shadow-neo flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Data Guru</h1>
          <span className="px-2.5 py-0.5 text-xs font-bold bg-gray-100 text-gray-700 border-2 border-gray-900 rounded-full">
            Total: {teachers.length}
          </span>
        </div>

        {selectedTeachers.length > 0 && (
          <button
            onClick={handleGenerateQR}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-green text-gray-800 font-bold border-2 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md transition-all text-xs md:text-sm"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            QR ({selectedTeachers.length})
          </button>
        )}
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => resetForm()}
        title={editingTeacher ? 'Edit Guru' : 'Tambah Guru'}
        size="lg"
        footer={
          <div className="space-y-2">
            <button 
              type="button"
              onClick={handleSubmit}
              className="w-full py-3.5 px-6 bg-primary-green text-gray-900 font-bold text-base md:text-lg rounded-full border-2 border-gray-900 shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <span className="material-symbols-outlined text-xl">
                {editingTeacher ? 'save' : 'check'}
              </span>
              <span>
                {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : (editingTeacher ? 'Update Guru' : 'Simpan Guru')}
              </span>
            </button>
            <button 
              type="button" 
              onClick={resetForm} 
              className="w-full py-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors text-center"
            >
              Batal
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} id="teacher-form" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Lembaga *</label>
              <select
                value={formData.lembaga}
                onChange={(e) => setFormData({ ...formData, lembaga: e.target.value })}
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all cursor-pointer"
                required
              >
                <option value="MA">MA</option>
                <option value="MTs">MTs</option>
                <option value="Yayasan">Yayasan</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Nama Guru *</label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                placeholder="Nama lengkap guru & gelar"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">NIP / NIDN</label>
              <input
                type="text"
                value={formData.nip}
                onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                placeholder="Nomor Induk Pegawai"
              />
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Mata Pelajaran</label>
              <input
                type="text"
                value={formData.mata_pelajaran}
                onChange={(e) => setFormData({ ...formData, mata_pelajaran: e.target.value })}
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                placeholder="Misal: Matematika, Bahasa Indonesia"
              />
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">No HP / WhatsApp</label>
              <input
                type="text"
                value={formData.nomor_hp}
                onChange={(e) => setFormData({ ...formData, nomor_hp: e.target.value })}
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                placeholder="08123456789"
              />
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all cursor-pointer"
              >
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Non-aktif</option>
              </select>
            </div>
          </form>
        </Modal>

      {/* Select All Action Bar */}
      {teachers.length > 0 && (
        <div className="flex items-center justify-between px-1 py-0.5">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedTeachers.length === teachers.length && teachers.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-2 border-gray-900 text-primary-green focus:ring-0 cursor-pointer"
            />
            <span>Pilih Semua Guru</span>
          </label>

          {selectedTeachers.length > 0 && (
            <span className="text-xs font-bold text-gray-500">
              {selectedTeachers.length} terpilih
            </span>
          )}
        </div>
      )}

      {/* Cards List Container with Extra Large Bottom Padding (144px/pb-40) */}
      <div className="space-y-3 pb-40 md:pb-12">
        {isLoading ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Loading data guru...
          </div>
        ) : teachers.length === 0 ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Belum ada data guru
          </div>
        ) : (
          teachers.map((teacher) => {
            const isSelected = selectedTeachers.includes(teacher.id);
            return (
              <div
                key={teacher.id}
                className={`bg-white border-2 md:border-3 border-gray-900 rounded-xl md:rounded-2xl p-3.5 md:p-4 shadow-neo transition-all ${
                  isSelected ? 'bg-emerald-50/70 border-primary-green' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Checkbox & Main Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectTeacher(teacher.id)}
                      className="mt-1 w-4 h-4 md:w-5 md:h-5 rounded border-2 border-gray-900 text-primary-green focus:ring-0 cursor-pointer flex-shrink-0"
                    />

                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Nama Guru */}
                      <h3 className="font-bold text-base md:text-lg text-gray-900 truncate leading-snug">
                        {teacher.nama}
                      </h3>

                      {/* Chips / Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Mata Pelajaran Badge */}
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 rounded-md">
                          {teacher.mata_pelajaran || 'Umum'}
                        </span>

                        {/* Lembaga Badge */}
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300 rounded-md uppercase">
                          {teacher.lembaga}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${
                            teacher.status === 'aktif'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }`}
                        >
                          {teacher.status?.toUpperCase()}
                        </span>

                        {teacher.nip && (
                          <span className="text-[11px] font-medium text-gray-500 hidden sm:inline">
                            NIP: {teacher.nip}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(teacher)}
                      className="p-1.5 md:p-2 bg-amber-100 text-amber-900 border-2 border-gray-900 rounded-lg hover:bg-amber-200 transition-colors shadow-sm"
                      title="Edit guru"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(teacher.id)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 md:p-2 bg-red-100 text-red-700 border-2 border-gray-900 rounded-lg hover:bg-red-200 transition-colors shadow-sm disabled:opacity-50"
                      title="Hapus guru"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => {
          resetForm();
          setShowForm(true);
        }}
        className="fixed bottom-24 right-5 md:bottom-8 md:right-8 z-40 w-14 h-14 md:w-16 md:h-16 bg-primary-green text-gray-900 font-black border-3 border-gray-900 rounded-full shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center group"
        title="Tambah Guru"
      >
        <span className="material-symbols-outlined text-3xl md:text-4xl group-hover:scale-110 transition-transform">
          add
        </span>
      </button>
    </div>
  );
}
