import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '../services';
import QRCode from 'qrcode';

export default function Students() {
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
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
    queryKey: ['students'],
    queryFn: () => studentService.getAll(),
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

  const resetForm = () => {
    setShowForm(false);
    setEditingStudent(null);
    setFormData({
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
      
      for (const student of selectedData) {
        const qrData = student.uuid;
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, qrData, { width: 300, margin: 2 });
        
        const link = document.createElement('a');
        link.download = `siswa-${student.nama.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      alert(`Berhasil generate ${selectedStudents.length} QR code`);
      setSelectedStudents([]);
    } catch (error) {
      alert('Gagal generate QR: ' + error.message);
    }
  };

  const students = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Siswa</h1>
          <p className="text-gray-600">Total: {students.length} siswa</p>
        </div>
        <div className="flex gap-2">
          {selectedStudents.length > 0 && (
            <button
              onClick={handleGenerateQR}
              className="btn-primary flex items-center gap-2 bg-primary-green"
            >
              <span className="material-symbols-outlined">download</span>
              Generate QR ({selectedStudents.length})
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Tambah Siswa
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-2xl font-bold mb-4">
            {editingStudent ? 'Edit Siswa' : 'Tambah Siswa'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-2">Lembaga *</label>
              <select
                value={formData.lembaga}
                onChange={(e) => setFormData({ ...formData, lembaga: e.target.value })}
                className="input"
                required
              >
                <option value="MA">MA</option>
                <option value="MTs">MTs</option>
              </select>
            </div>

            <div>
              <label className="block font-bold mb-2">Nama *</label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block font-bold mb-2">NISN (10 digit)</label>
              <input
                type="text"
                value={formData.nisn}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 10) {
                    setFormData({ ...formData, nisn: value });
                  }
                }}
                className="input"
                placeholder="10 digit angka"
                maxLength={10}
              />
              {formData.nisn && formData.nisn.length > 0 && formData.nisn.length !== 10 && (
                <p className="text-red-600 text-sm mt-1">NISN harus tepat 10 digit (sekarang: {formData.nisn.length})</p>
              )}
            </div>

            <div>
              <label className="block font-bold mb-2">Tempat Lahir</label>
              <input
                type="text"
                value={formData.tempat_lahir}
                onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block font-bold mb-2">Tanggal Lahir</label>
              <input
                type="date"
                value={formData.tanggal_lahir}
                onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block font-bold mb-2">Jenis Kelamin *</label>
              <select
                value={formData.jenis_kelamin}
                onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                className="input"
                required
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block font-bold mb-2">Kelas</label>
              <input
                type="text"
                value={formData.kelas}
                onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                className="input"
                placeholder="X IPA 1"
              />
            </div>

            <div>
              <label className="block font-bold mb-2">No HP Orang Tua</label>
              <input
                type="text"
                value={formData.nomor_hp_orangtua}
                onChange={(e) => setFormData({ ...formData, nomor_hp_orangtua: e.target.value })}
                className="input"
                placeholder="08123456789"
              />
            </div>

            <div>
              <label className="block font-bold mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input"
              >
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Non-aktif</option>
                <option value="lulus">Lulus</option>
                <option value="pindah">Pindah</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold mb-2">Alamat</label>
              <textarea
                value={formData.alamat}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                className="input"
                rows="3"
              ></textarea>
            </div>

            <div className="md:col-span-2 flex gap-4">
              <button 
                type="submit" 
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : (editingStudent ? 'Update' : 'Simpan')}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary flex-1">
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-3 border-black">
              <th className="text-left py-3 px-4 w-12">
                <input
                  type="checkbox"
                  checked={selectedStudents.length === students.length && students.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4"
                />
              </th>
              <th className="text-left py-3 px-4">Nama</th>
              <th className="text-left py-3 px-4">Kelas</th>
              <th className="text-left py-3 px-4">Lembaga</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" className="text-center py-8">Loading...</td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8">Belum ada data siswa</td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="border-b border-gray-300">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => handleSelectStudent(student.id)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="py-3 px-4 font-medium">{student.nama}</td>
                  <td className="py-3 px-4">{student.kelas || '-'}</td>
                  <td className="py-3 px-4">{student.lembaga}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs font-bold border-2 border-black ${
                      student.status === 'aktif' ? 'bg-primary-green' : 'bg-gray-300'
                    }`}>
                      {student.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(student)}
                        className="p-2 bg-blue-200 border-2 border-black hover:shadow-neo transition-shadow"
                        title="Edit siswa"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        disabled={deleteMutation.isPending}
                        className="p-2 bg-red-300 border-2 border-black hover:shadow-neo transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Hapus siswa"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
