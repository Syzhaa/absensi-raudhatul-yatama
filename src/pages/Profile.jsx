import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { authService } from "../services";
import { FormCardSkeleton } from "../components/Skeleton";
import { useAppStore } from "../store/useAppStore";
import { useState, useEffect, useRef } from "react";

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUserRole = useAppStore((state) => state.setUserRole);
  const setUserLembaga = useAppStore((state) => state.setUserLembaga);
  const fileInputRef = useRef(null);

  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  // Form state for non-guru users (simple email & password)
  const [simpleFormData, setSimpleFormData] = useState({ email: '', current_password: '', password: '' });

  // Comprehensive Form state for Teachers
  const [teacherFormData, setTeacherFormData] = useState({
    nama: '',
    nip: '',
    jenis_kelamin: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    alamat: '',
    pendidikan_terakhir: '',
    email: '',
    nomor_hp: '',
    jabatan: '',
    mata_pelajaran: '',
    current_password: '',
    password: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
  });

  const user = data?.data;
  const isGuru = user?.role === 'guru' || !!user?.teacher;

  // Load teacher profile details when user is guru
  const { data: teacherProfileData, isLoading: isTeacherLoading } = useQuery({
    queryKey: ["teacher-profile"],
    queryFn: async () => (await api.get("/teacher/profile")).data,
    enabled: isGuru,
  });

  const teacher = teacherProfileData?.data || user?.teacher;

  useEffect(() => {
    if (user?.email) {
      setSimpleFormData(prev => ({ ...prev, email: user.email }));
    }

    if (teacher) {
      setTeacherFormData({
        nama: teacher.nama || user?.name || '',
        nip: teacher.nip || '',
        jenis_kelamin: teacher.jenis_kelamin || '',
        tempat_lahir: teacher.tempat_lahir || '',
        tanggal_lahir: teacher.tanggal_lahir ? teacher.tanggal_lahir.substring(0, 10) : '',
        alamat: teacher.alamat || '',
        pendidikan_terakhir: teacher.pendidikan_terakhir || '',
        email: teacher.email || user?.email || '',
        nomor_hp: teacher.nomor_hp || '',
        jabatan: teacher.jabatan || '',
        mata_pelajaran: teacher.mata_pelajaran || '',
        current_password: '',
        password: '',
      });
    }
  }, [user, teacher]);

  // Mutation for general user profile update (admin / staff)
  const updateGeneralMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put("/auth/profile", payload);
      return res.data;
    },
    onSuccess: () => {
      setMessage('Profil berhasil diperbarui!');
      setErrorMsg('');
      setSimpleFormData(prev => ({ ...prev, current_password: '', password: '' }));
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setTimeout(() => setMessage(''), 3500);
    },
    onError: (err) => {
      let msg = err.response?.data?.message || 'Gagal memperbarui profil';
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const firstKey = Object.keys(err.response.data.errors)[0];
        msg = err.response.data.errors[firstKey][0];
      }
      setErrorMsg(msg);
      setMessage('');
    }
  });

  // Mutation for teacher identity update
  const updateTeacherMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put("/teacher/profile", payload);
      return res.data;
    },
    onSuccess: () => {
      setMessage('Seluruh identitas profil guru berhasil diperbarui!');
      setErrorMsg('');
      setTeacherFormData(prev => ({ ...prev, current_password: '', password: '' }));
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-profile"] });
      setTimeout(() => setMessage(''), 3500);
    },
    onError: (err) => {
      let msg = err.response?.data?.message || 'Gagal memperbarui identitas profil';
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const firstKey = Object.keys(err.response.data.errors)[0];
        msg = err.response.data.errors[firstKey][0];
      }
      setErrorMsg(msg);
      setMessage('');
    }
  });

  // Handle Photo Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran foto maksimal 5 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("foto", file);

    setPhotoUploading(true);
    setErrorMsg("");
    setMessage("");

    try {
      const res = await api.post("/teacher/profile/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("Foto profil guru berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-profile"] });
      setTimeout(() => setMessage(""), 3500);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Gagal mengunggah foto profil.");
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isGuru) {
      updateTeacherMutation.mutate(teacherFormData);
    } else {
      updateGeneralMutation.mutate(simpleFormData);
    }
  };

  if (isLoading || (isGuru && isTeacherLoading)) {
    return (
      <div className="max-w-2xl mx-auto">
        <FormCardSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Top Profile Banner Card */}
      <div className="bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          {/* Avatar / Photo with upload button */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl border-3 border-gray-900 bg-emerald-100 overflow-hidden shadow-neo flex items-center justify-center flex-shrink-0">
              {teacher?.foto ? (
                <img
                  src={teacher.foto}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-black text-gray-900">
                  {user?.name?.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {isGuru && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  className="mt-2 text-[11px] font-black px-2.5 py-1 bg-primary-green hover:bg-emerald-400 text-gray-900 border-2 border-gray-900 rounded-lg shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center gap-1 mx-auto sm:mx-0 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                  <span>{photoUploading ? "Upload..." : "Ganti Foto"}</span>
                </button>
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                {isGuru ? teacher?.nama || user?.name : user?.name}
              </h1>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-950 border-2 border-gray-900 rounded-lg text-xs font-black uppercase shadow-xs">
                {user?.role_label || user?.role}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-bold mt-1">
              Email: <span className="text-gray-900">{user?.email}</span>
            </p>
            {isGuru && teacher?.nip && (
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                NIP/NUPTK: <strong>{teacher.nip}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Info Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t-2 border-gray-200">
          <div className="bg-gray-50 rounded-xl p-2.5 border-2 border-gray-200">
            <p className="text-[10px] text-gray-500 font-bold uppercase">Lembaga</p>
            <p className="font-black text-xs sm:text-sm uppercase text-gray-900">
              {user?.lembaga || "-"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5 border-2 border-gray-200">
            <p className="text-[10px] text-gray-500 font-bold uppercase">Status Akun</p>
            <p className="font-black text-xs sm:text-sm text-emerald-600 uppercase">
              {teacher?.status || "Aktif"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5 border-2 border-gray-200 col-span-2 sm:col-span-1">
            <p className="text-[10px] text-gray-500 font-bold uppercase">Akses Presensi</p>
            <p className="font-black text-xs sm:text-sm text-gray-900">
              {isGuru ? "Mandiri & Barcode" : "Petugas"}
            </p>
          </div>
        </div>
      </div>

      {/* Notifications Alert */}
      {message && (
        <div className="bg-emerald-100 text-emerald-950 p-3.5 rounded-2xl text-xs sm:text-sm font-black border-2 border-emerald-500 shadow-neo flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-emerald-700">check_circle</span>
          <span>{message}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-100 text-rose-950 p-3.5 rounded-2xl text-xs sm:text-sm font-black border-2 border-rose-500 shadow-neo flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-rose-700">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* FORM: TEACHER IDENTITY EDIT (JIKA USER ADALAH GURU) */}
      {isGuru ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-5 space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-gray-200 pb-2.5">
              <span className="material-symbols-outlined text-xl text-primary-green">badge</span>
              <h2 className="font-black text-gray-900 text-sm sm:text-base">
                Edit Identitas Lengkap Guru
              </h2>
            </div>

            {/* Nama & NIP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  value={teacherFormData.nama}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, nama: e.target.value }))}
                  placeholder="Contoh: Tania, S. Ak"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm font-bold shadow-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                  NIP / NUPTK / NPK
                </label>
                <input
                  type="text"
                  value={teacherFormData.nip}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, nip: e.target.value }))}
                  placeholder="Contoh: 198501012010011001"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm font-mono font-bold shadow-xs"
                />
              </div>
            </div>

            {/* Jenis Kelamin & Pendidikan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                  Jenis Kelamin
                </label>
                <select
                  value={teacherFormData.jenis_kelamin}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, jenis_kelamin: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm font-bold shadow-xs"
                >
                  <option value="">Pilih Jenis Kelamin</option>
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                  Pendidikan Terakhir
                </label>
                <input
                  type="text"
                  value={teacherFormData.pendidikan_terakhir}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, pendidikan_terakhir: e.target.value }))}
                  placeholder="Contoh: S1 Akuntansi / S1 Pend. Matematika"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm font-bold shadow-xs"
                />
              </div>
            </div>

            {/* Tempat & Tanggal Lahir */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                  Tempat Lahir
                </label>
                <input
                  type="text"
                  value={teacherFormData.tempat_lahir}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, tempat_lahir: e.target.value }))}
                  placeholder="Contoh: Banjarmasin"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm font-bold shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  value={teacherFormData.tanggal_lahir}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, tanggal_lahir: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm font-bold shadow-xs"
                />
              </div>
            </div>

            {/* Nomor HP WhatsApp & Email Akun */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                  Nomor WhatsApp / HP
                </label>
                <input
                  type="text"
                  value={teacherFormData.nomor_hp}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, nomor_hp: e.target.value }))}
                  placeholder="Contoh: 083159328655"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm font-bold shadow-xs"
                />
                <span className="text-[10px] text-gray-500 font-medium">
                  Digunakan untuk notifikasi presensi via WhatsApp.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                  Email Akun & Notifikasi
                </label>
                <input
                  type="email"
                  value={teacherFormData.email}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="nama@raudhatulyatama.sch.id"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm font-bold shadow-xs"
                  required
                />
              </div>
            </div>

            {/* Jabatan & Mata Pelajaran */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                  Jabatan / Tugas Tambahan
                </label>
                <input
                  type="text"
                  value={teacherFormData.jabatan}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, jabatan: e.target.value }))}
                  placeholder="Contoh: Wali Kelas X / Guru Mapel"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm font-bold shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                  Mata Pelajaran yang Diampu
                </label>
                <input
                  type="text"
                  value={teacherFormData.mata_pelajaran}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, mata_pelajaran: e.target.value }))}
                  placeholder="Contoh: Akidah Akhlak, Sosiologi, Biologi"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm font-bold shadow-xs"
                />
              </div>
            </div>

            {/* Alamat Lengkap */}
            <div>
              <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                Alamat Lengkap
              </label>
              <textarea
                rows={2}
                value={teacherFormData.alamat}
                onChange={(e) => setTeacherFormData(prev => ({ ...prev, alamat: e.target.value }))}
                placeholder="Jl. Raya Kertak Hanyar Km 10..."
                className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm font-medium shadow-xs"
              />
            </div>
          </div>

          {/* Ganti Password (Opsional) */}
          <div className="bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-5 space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-gray-200 pb-2.5">
              <span className="material-symbols-outlined text-xl text-amber-500">lock</span>
              <h2 className="font-black text-gray-900 text-sm sm:text-base">
                Keamanan & Ganti Password (Opsional)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                  Password Lama
                </label>
                <input
                  type="password"
                  value={teacherFormData.current_password}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, current_password: e.target.value }))}
                  placeholder="Diperlukan jika ganti password"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                  Password Baru
                </label>
                <input
                  type="password"
                  value={teacherFormData.password}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm shadow-xs"
                  minLength={6}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={updateTeacherMutation.isPending}
            className="w-full py-3 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black border-2 sm:border-3 border-gray-900 rounded-xl shadow-neo active:translate-y-0.5 transition-all disabled:opacity-50 text-sm sm:text-base cursor-pointer flex items-center justify-center gap-2"
          >
            {updateTeacherMutation.isPending ? (
              <span className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined text-xl">save</span>
            )}
            <span>Simpan Seluruh Perubahan Identitas</span>
          </button>
        </form>
      ) : (
        /* FORM: ADMIN / STAFF SIMPLE LOGIN PROFILE */
        <div className="bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-5 space-y-4">
          <h2 className="font-black text-gray-900 text-sm">Ubah Data Login</h2>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">EMAIL BARU</label>
            <input
              type="email"
              value={simpleFormData.email}
              onChange={(e) => setSimpleFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm font-bold shadow-xs"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">PASSWORD LAMA</label>
            <input
              type="password"
              value={simpleFormData.current_password}
              onChange={(e) => setSimpleFormData(prev => ({ ...prev, current_password: e.target.value }))}
              placeholder="Diperlukan jika ingin ubah password"
              className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm shadow-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">PASSWORD BARU (Opsional)</label>
            <input
              type="password"
              value={simpleFormData.password}
              onChange={(e) => setSimpleFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Biarkan kosong jika tidak ingin diubah"
              className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-sm shadow-xs"
              minLength={6}
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={updateGeneralMutation.isPending}
            className="w-full py-2.5 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo active:translate-y-0.5 transition-all disabled:opacity-50 text-sm cursor-pointer"
          >
            {updateGeneralMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      )}
    </div>
  );
}
