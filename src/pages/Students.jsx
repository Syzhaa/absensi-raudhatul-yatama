import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '../services';
import { useEffectiveLembaga } from '../hooks/useEffectiveLembaga';
import Modal from '../components/Modal';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
export default function Students() {
  const { effectiveLembaga } = useEffectiveLembaga();
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [downloadSuccessModal, setDownloadSuccessModal] = useState({ isOpen: false, count: 0 });
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [targetKelas, setTargetKelas] = useState('');
  const [formData, setFormData] = useState({
    lembaga: 'MA',
    nama: '',
    nisn: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: 'L',
    alamat: '',
    kelas: '',
    nomor_hp_orangtua: '',
    status: 'aktif',
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['students', effectiveLembaga],
    queryFn: () => studentService.getAll(),
    enabled: !!effectiveLembaga,
  });

  // Fetch kelas list for dropdown
  const { data: kelasData } = useQuery({
    queryKey: ['kelas', effectiveLembaga],
    queryFn: async () => {
      const api = await import('../services/api').then(m => m.default);
      const response = await api.get('/admin/kelas', {
        params: { lembaga: effectiveLembaga }
      });
      return response.data;
    },
    enabled: !!effectiveLembaga,
  });

  const createMutation = useMutation({
    mutationFn: studentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      resetForm();
      alert('Siswa berhasil ditambahkan');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => studentService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      resetForm();
      alert('Siswa berhasil diupdate');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: studentService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      alert('Siswa berhasil dihapus');
    },
    onError: (error) => {
      alert('Gagal menghapus siswa: ' + (error.message || 'Unknown error'));
    },
  });

  const promoteClassMutation = useMutation({
    mutationFn: async (data) => {
      const api = await import('../services/api').then(m => m.default);
      const response = await api.post('/attendance/students/promote-class', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['students']);
      setSelectedStudents([]);
      setShowPromoteModal(false);
      setTargetKelas('');
      alert(data.message || `Berhasil menaikkan ${data.data.count} siswa ke kelas ${data.data.target_kelas}`);
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Gagal menaikkan kelas siswa');
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingStudent(null);
    setFormData({
      lembaga: effectiveLembaga || 'MA',
      nama: '',
      nisn: '',
      tempat_lahir: '',
      tanggal_lahir: '',
      jenis_kelamin: 'L',
      alamat: '',
      kelas: '',
      nomor_hp_orangtua: '',
      status: 'aktif',
    });
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      lembaga: student.lembaga,
      nama: student.nama,
      nisn: student.nisn || '',
      tempat_lahir: student.tempat_lahir || '',
      tanggal_lahir: student.tanggal_lahir || '',
      jenis_kelamin: student.jenis_kelamin,
      alamat: student.alamat || '',
      kelas: student.kelas || '',
      nomor_hp_orangtua: student.nomor_hp_orangtua || '',
      status: student.status,
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Yakin ingin menghapus siswa ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const handlePromoteClass = () => {
    if (selectedStudents.length === 0) {
      alert('Pilih siswa terlebih dahulu');
      return;
    }
    setShowPromoteModal(true);
  };

  const handleSubmitPromote = () => {
    if (!targetKelas) {
      alert('Pilih kelas tujuan terlebih dahulu');
      return;
    }
    
    if (confirm(`Naikkan ${selectedStudents.length} siswa ke kelas ${targetKelas}?`)) {
      promoteClassMutation.mutate({
        student_ids: selectedStudents,
        target_kelas: targetKelas,
      });
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(students.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (id) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(selectedStudents.filter(sid => sid !== id));
    } else {
      setSelectedStudents([...selectedStudents, id]);
    }
  };

  const handleGenerateQR = async () => {
    if (selectedStudents.length === 0) {
      alert('Pilih siswa terlebih dahulu');
      return;
    }

    try {
      const selectedData = students.filter(s => selectedStudents.includes(s.id));
      const zip = new JSZip();
      
      for (const student of selectedData) {
        const qrData = student.uuid;
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, qrData, { width: 300, margin: 2 });
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        zip.file(`siswa-${student.nama.replace(/\s+/g, '-')}-${student.nisn || student.id}.png`, blob);
      }
      
      const zipContent = await zip.generateAsync({ type: 'blob' });
      saveAs(zipContent, `QR-Siswa-${new Date().getTime()}.zip`);
      
      const count = selectedStudents.length;
      setSelectedStudents([]);
      setDownloadSuccessModal({ isOpen: true, count });
    } catch (error) {
      alert('Gagal generate QR: ' + error.message);
    }
  };

  const handleDownloadSingleQR = async (student) => {
    try {
      const qrData = student.uuid;
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, qrData, { width: 300, margin: 2 });
      
      const link = document.createElement('a');
      link.download = `siswa-${student.nama.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      alert('Gagal download QR: ' + error.message);
    }
  };

  const students = data?.data || [];
  const totalPages = Math.ceil(students.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = students.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="max-w-5xl mx-auto space-y-6 landscape:space-y-3">
      {/* Header Compact */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 landscape:py-2 shadow-neo flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 landscape:mb-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl landscape:text-lg font-black text-gray-800 tracking-tight">Data Siswa</h1>
          <span className="px-2.5 py-0.5 text-xs font-bold bg-gray-100 text-gray-700 border-2 border-gray-900 rounded-full">
            Total: {students.length}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {selectedStudents.length > 0 && (
            <>
              <button
                onClick={handleGenerateQR}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-800 font-bold border-2 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md transition-all text-xs md:text-sm"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                <span className="hidden sm:inline">QR ({selectedStudents.length})</span>
                <span className="sm:hidden">({selectedStudents.length})</span>
              </button>
              <button
                onClick={handlePromoteClass}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-100 text-amber-800 font-bold border-2 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md transition-all text-xs md:text-sm"
              >
                <span className="material-symbols-outlined text-lg">school</span>
                <span className="hidden sm:inline">Naik Kelas ({selectedStudents.length})</span>
                <span className="sm:hidden">Naik ({selectedStudents.length})</span>
              </button>
            </>
          )}

          {/* Desktop Add Button */}
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="hidden md:flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-green text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Tambah Data
          </button>
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => resetForm()}
        title={editingStudent ? 'Edit Siswa' : 'Tambah Siswa'}
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
                {editingStudent ? 'save' : 'check'}
              </span>
              <span>
                {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : (editingStudent ? 'Update Siswa' : 'Simpan Siswa')}
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
        <form onSubmit={handleSubmit} id="student-form" className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </select>
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Nama Siswa *</label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                placeholder="Nama lengkap siswa"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">NISN (10 digit)</label>
              <input
                type="text"
                value={formData.nisn}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 10) {
                    setFormData({ ...formData, nisn: value });
                  }
                }}
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                placeholder="10 digit angka"
                maxLength={10}
              />
              {formData.nisn && formData.nisn.length > 0 && formData.nisn.length !== 10 && (
                <p className="text-red-600 text-xs font-semibold mt-1">NISN harus tepat 10 digit (sekarang: {formData.nisn.length})</p>
              )}
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Tempat Lahir</label>
              <input
                type="text"
                value={formData.tempat_lahir}
                onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                placeholder="Kota tempat lahir"
              />
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Tanggal Lahir</label>
              <input
                type="date"
                value={formData.tanggal_lahir}
                onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Jenis Kelamin *</label>
              <select
                value={formData.jenis_kelamin}
                onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all cursor-pointer"
                required
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Kelas</label>
              <select
                value={formData.kelas}
                onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all cursor-pointer"
              >
                <option value="">-- Pilih Kelas --</option>
                {kelasData?.data?.map((kelas) => (
                  <option key={kelas.id} value={kelas.nama}>
                    {kelas.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">No HP Orang Tua</label>
              <input
                type="text"
                value={formData.nomor_hp_orangtua}
                onChange={(e) => setFormData({ ...formData, nomor_hp_orangtua: e.target.value })}
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
                <option value="lulus">Lulus</option>
                <option value="pindah">Pindah</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Alamat Lengkap</label>
              <textarea
                value={formData.alamat}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                rows="3"
                placeholder="Alamat domisili siswa"
              ></textarea>
            </div>
          </form>
        </Modal>

      {/* Select All Action Bar */}
      {students.length > 0 && (
        <div className="flex items-center justify-between px-1 py-0.5">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedStudents.length === students.length && students.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-2 border-gray-900 text-primary-green focus:ring-0 cursor-pointer"
            />
            <span>Pilih Semua Siswa</span>
          </label>

          {selectedStudents.length > 0 && (
            <span className="text-xs font-bold text-gray-500">
              {selectedStudents.length} terpilih
            </span>
          )}
        </div>
      )}

      {/* Cards List Container */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Loading data siswa...
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Belum ada data siswa
          </div>
        ) : (
          paginatedStudents.map((student) => {
            const isSelected = selectedStudents.includes(student.id);
            return (
              <div
                key={student.id}
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
                      onChange={() => handleSelectStudent(student.id)}
                      className="mt-1 w-4 h-4 md:w-5 md:h-5 rounded border-2 border-gray-900 text-primary-green focus:ring-0 cursor-pointer flex-shrink-0"
                    />

                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Nama Siswa */}
                      <h3 className="font-bold text-base md:text-lg text-gray-900 truncate leading-snug">
                        {student.nama}
                      </h3>

                      {/* Chips / Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Kelas Badge */}
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 rounded-md">
                          {student.kelas || 'Tanpa Kelas'}
                        </span>

                        {/* Lembaga Badge */}
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300 rounded-md uppercase">
                          {student.lembaga}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${
                            student.status === 'aktif'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }`}
                        >
                          {student.status?.toUpperCase()}
                        </span>

                        {student.nisn && (
                          <span className="text-[11px] font-medium text-gray-500 hidden sm:inline">
                            NISN: {student.nisn}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="relative flex items-center gap-1.5 flex-shrink-0">
                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-1.5">
                      <button
                        onClick={() => handleDownloadSingleQR(student)}
                        className="p-1.5 md:p-2 bg-blue-100 text-blue-700 border-2 border-gray-900 rounded-lg hover:bg-blue-200 transition-colors shadow-sm"
                        title="Download QR"
                      >
                        <span className="material-symbols-outlined text-lg">qr_code_2</span>
                      </button>
                      <button
                        onClick={() => handleEdit(student)}
                        className="p-1.5 md:p-2 bg-amber-100 text-amber-900 border-2 border-gray-900 rounded-lg hover:bg-amber-200 transition-colors shadow-sm"
                        title="Edit siswa"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 md:p-2 bg-red-100 text-red-700 border-2 border-gray-900 rounded-lg hover:bg-red-200 transition-colors shadow-sm disabled:opacity-50"
                        title="Hapus siswa"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>

                    {/* Mobile Kebab Menu */}
                    <div className="md:hidden relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === student.id ? null : student.id)}
                        className="p-1.5 bg-gray-100 text-gray-700 border-2 border-gray-900 rounded-lg shadow-sm"
                      >
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                      </button>

                      {activeDropdown === student.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white border-2 border-gray-900 rounded-xl shadow-neo z-10 overflow-hidden">
                          <button
                            onClick={() => { handleDownloadSingleQR(student); setActiveDropdown(null); }}
                            className="w-full text-left px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 border-b border-gray-100 flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                            Download QR
                          </button>
                          <button
                            onClick={() => { handleEdit(student); setActiveDropdown(null); }}
                            className="w-full text-left px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-50 border-b border-gray-100 flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                            Edit
                          </button>
                          <button
                            onClick={() => { handleDelete(student.id); setActiveDropdown(null); }}
                            disabled={deleteMutation.isPending}
                            className="w-full text-left px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {students.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 pb-12">
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-gray-700">Tampilkan:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border-2 border-gray-400 rounded-lg px-2 py-1 font-bold text-xs md:text-sm text-gray-900 bg-transparent focus:outline-none focus:border-primary-green cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs md:text-sm font-bold text-gray-700">data</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 md:p-2 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-sm md:text-base">chevron_left</span>
            </button>
            <span className="text-xs md:text-sm font-bold text-gray-700">
              Halaman {currentPage} dari {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 md:p-2 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-sm md:text-base">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={() => {
          resetForm();
          setShowForm(true);
        }}
        className="md:hidden fixed right-5 z-40 w-14 h-14 bg-primary-green text-gray-900 font-black border-3 border-gray-900 rounded-full shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center group portrait:bottom-24 landscape:bottom-6"
        title="Tambah Siswa"
      >
        <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">
          add
        </span>
      </button>

      {/* Download ZIP Success Modal */}
      {downloadSuccessModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 animate-fade-in"
            onClick={() => setDownloadSuccessModal({ isOpen: false, count: 0 })}
          />
          <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-sm w-full space-y-4 z-10 animate-slide-up text-center">
            <div className="w-14 h-14 bg-emerald-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
              <span className="material-symbols-outlined text-3xl font-black">folder_zip</span>
            </div>
            <h2 className="text-xl font-black text-gray-900">Download Berhasil!</h2>
            <p className="text-sm text-gray-600 font-medium leading-relaxed">
              Berhasil mengunduh <span className="font-bold text-gray-900">{downloadSuccessModal.count} QR Code</span> siswa ke dalam berkas ZIP.
            </p>
            <button
              type="button"
              onClick={() => setDownloadSuccessModal({ isOpen: false, count: 0 })}
              className="w-full py-3 px-4 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all"
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* Promote Class Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 animate-fade-in"
            onClick={() => { setShowPromoteModal(false); setTargetKelas(''); }}
          />
          <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-md w-full space-y-4 z-10 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">Naik Kelas</h2>
              <button
                onClick={() => { setShowPromoteModal(false); setTargetKelas(''); }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-gray-600">close</span>
              </button>
            </div>

            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-3 text-sm text-blue-900">
              <p className="font-medium">✓ {selectedStudents.length} siswa dipilih untuk naik kelas</p>
              <p className="text-xs mt-1">Pilih kelas tujuan untuk memindahkan siswa terpilih</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Kelas Tujuan *</label>
              <select
                value={targetKelas}
                onChange={(e) => setTargetKelas(e.target.value)}
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all cursor-pointer"
                required
              >
                <option value="">-- Pilih Kelas Tujuan --</option>
                {kelasData?.data?.map((kelas) => (
                  <option key={kelas.id} value={kelas.nama}>
                    {kelas.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowPromoteModal(false); setTargetKelas(''); }}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold border-2 border-gray-900 rounded-xl shadow-neo transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitPromote}
                disabled={!targetKelas || promoteClassMutation.isPending}
                className="flex-1 py-3 px-4 bg-amber-100 hover:bg-amber-200 text-amber-900 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {promoteClassMutation.isPending ? 'Memproses...' : 'Naik Kelas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
