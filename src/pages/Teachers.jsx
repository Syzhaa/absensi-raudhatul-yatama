import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherService } from '../services';
import { Plus, Edit, Trash, QrCode } from 'lucide-react';

export default function Teachers() {
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
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

  const teachers = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Guru</h1>
          <p className="text-gray-600">Total: {teachers.length} guru</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Tambah Guru
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-2xl font-bold mb-4">
            {editingTeacher ? 'Edit Guru' : 'Tambah Guru'}
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
              <label className="block font-bold mb-2">NIP</label>
              <input
                type="text"
                value={formData.nip}
                onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block font-bold mb-2">Mata Pelajaran</label>
              <input
                type="text"
                value={formData.mata_pelajaran}
                onChange={(e) => setFormData({ ...formData, mata_pelajaran: e.target.value })}
                className="input"
                placeholder="Matematika"
              />
            </div>

            <div>
              <label className="block font-bold mb-2">No HP</label>
              <input
                type="text"
                value={formData.nomor_hp}
                onChange={(e) => setFormData({ ...formData, nomor_hp: e.target.value })}
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
              </select>
            </div>

            <div className="md:col-span-2 flex gap-4">
              <button type="submit" className="btn-primary flex-1">
                {editingTeacher ? 'Update' : 'Simpan'}
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
              <th className="text-left py-3 px-4">Nama</th>
              <th className="text-left py-3 px-4">NIP</th>
              <th className="text-left py-3 px-4">Mata Pelajaran</th>
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
            ) : teachers.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8">Belum ada data guru</td>
              </tr>
            ) : (
              teachers.map((teacher) => (
                <tr key={teacher.id} className="border-b border-gray-300">
                  <td className="py-3 px-4 font-medium">{teacher.nama}</td>
                  <td className="py-3 px-4">{teacher.nip || '-'}</td>
                  <td className="py-3 px-4">{teacher.mata_pelajaran || '-'}</td>
                  <td className="py-3 px-4">{teacher.lembaga}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs font-bold border-2 border-black ${
                      teacher.status === 'aktif' ? 'bg-neo-green' : 'bg-gray-300'
                    }`}>
                      {teacher.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(teacher)}
                        className="p-2 bg-neo-blue border-2 border-black hover:shadow-neo"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.id)}
                        className="p-2 bg-red-300 border-2 border-black hover:shadow-neo"
                      >
                        <Trash size={16} />
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
