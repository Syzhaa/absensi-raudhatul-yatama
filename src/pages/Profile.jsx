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

  // Form data for non-guru (simple email & password)
  const [simpleFormData, setSimpleFormData] = useState({ email: '', current_password: '', password: '' });

  // Form data for guru (menyesuaikan card: Foto, Nama, NIP/NPK, Mata Pelajaran, Nomor HP, Email, Password)
  const [teacherFormData, setTeacherFormData] = useState({
    nama: '',
    nip: '',
    mata_pelajaran: '',
    nomor_hp: '',
    email: '',
    current_password: '',
    password: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
  });

  const user = data?.data;
  const isGuru = user?.role === 'guru' || !!user?.teacher;

  // Load teacher profile if guru
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
        mata_pelajaran: teacher.mata_pelajaran || '',
        nomor_hp: teacher.nomor_hp || '',
        email: teacher.email || user?.email || '',
        current_password: '',
        password: '',
      });
    }
  }, [user, teacher]);

  // General user update mutation
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
      setTimeout(() => setMessage(''), 3000);
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

  // Teacher profile update mutation (sesuai card data & no hp)
  const updateTeacherMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put("/teacher/profile", payload);
      return res.data;
    },
    onSuccess: () => {
      setMessage('Data profil guru berhasil disimpan!');
      setErrorMsg('');
      setTeacherFormData(prev => ({ ...prev, current_password: '', password: '' }));
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-profile"] });
      setTimeout(() => setMessage(''), 3000);
    },
    onError: (err) => {
      let msg = err.response?.data?.message || 'Gagal menyimpan profil guru';
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const firstKey = Object.keys(err.response.data.errors)[0];
        msg = err.response.data.errors[firstKey][0];
      }
      setErrorMsg(msg);
      setMessage('');
    }
  });

  // Upload Foto Profil Guru
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran foto maksimal 5 MB.");
      return;
    }

    const fd = new FormData();
    fd.append("foto", file);

    setPhotoUploading(true);
    setErrorMsg("");
    setMessage("");

    try {
      await api.post("/teacher/profile/photo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("Foto profil guru berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-profile"] });
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Gagal mengunggah foto profil.");
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      <div className="max-w-xl mx-auto">
        <FormCardSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Top Identity Card */}
      <div className="bg-white border-2 sm:border-3 border-gray-900 rounded-2xl shadow-neo p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-4">
          {/* Avatar / Photo */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl border-2 sm:border-3 border-gray-900 bg-emerald-100 overflow-hidden shadow-neo flex items-center justify-center">
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
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-green hover:bg-emerald-400 text-gray-900 border-2 border-gray-900 rounded-lg shadow-xs flex items-center justify-center cursor-pointer active:translate-y-0.5 transition-all"
                  title="Ganti foto profil"
                >
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                </button>
              </>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-gray-900 leading-tight truncate">
                {isGuru ? teacher?.nama || user?.name : user?.name}
              </h1>
            </div>
            <p className="text-xs text-gray-600 font-bold mt-0.5 truncate">
              {user?.email}
            </p>

            {/* Chips sesuai Card */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-100 text-emerald-950 border border-emerald-400 rounded-md">
                {user?.role_label || user?.role}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-300 rounded-md">
                {user?.lembaga || "MA"}
              </span>
              {isGuru && teacher?.nip && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-gray-100 text-gray-700 border border-gray-300 rounded-md">
                  NPK: {teacher.nip}
                </span>
              )}
              {isGuru && teacher?.nomor_hp && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-md flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-xs">call</span>
                  {teacher.nomor_hp}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Notifikasi feedback */}
        {message && (
          <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-3 text-xs sm:text-sm font-bold text-emerald-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-emerald-700">check_circle</span>
            <span>{message}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-3 text-xs sm:text-sm font-bold text-rose-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-rose-700">error</span>
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Form Identitas Guru (Menyesuaikan Data Card: Nama, NIP, Mapel, No HP, Email, Password) */}
      {isGuru ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white border-2 sm:border-3 border-gray-900 rounded-2xl shadow-neo p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b-2 border-gray-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-emerald-600">id_card</span>
                <h2 className="font-black text-xs sm:text-sm uppercase text-gray-900">
                  Data Kartu Guru & Kontak
                </h2>
              </div>
              <span className="text-[10px] font-bold text-gray-400">
                Lengkapnya di Portal
              </span>
            </div>

            {/* Nama Guru */}
            <div>
              <label className="block text-[11px] font-black uppercase text-gray-700 mb-1">
                Nama Lengkap & Gelar *
              </label>
              <input
                type="text"
                value={teacherFormData.nama}
                onChange={(e) => setTeacherFormData(prev => ({ ...prev, nama: e.target.value }))}
                placeholder="Contoh: Tania, S. Ak"
                className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl font-bold text-xs sm:text-sm focus:outline-none shadow-xs"
                required
              />
            </div>

            {/* NIP / NPK & No HP WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase text-gray-700 mb-1">
                  NIP / NUPTK / NPK
                </label>
                <input
                  type="text"
                  value={teacherFormData.nip}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, nip: e.target.value }))}
                  placeholder="Contoh: 198501012010011001"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl font-mono font-bold text-xs sm:text-sm focus:outline-none shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-gray-700 mb-1">
                  Nomor WhatsApp / HP *
                </label>
                <input
                  type="text"
                  value={teacherFormData.nomor_hp}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, nomor_hp: e.target.value }))}
                  placeholder="Contoh: 083159328655"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl font-bold text-xs sm:text-sm focus:outline-none shadow-xs"
                />
              </div>
            </div>

            {/* Mata Pelajaran */}
            <div>
              <label className="block text-[11px] font-black uppercase text-gray-700 mb-1">
                Mata Pelajaran (Pada Kartu)
              </label>
              <input
                type="text"
                value={teacherFormData.mata_pelajaran}
                onChange={(e) => setTeacherFormData(prev => ({ ...prev, mata_pelajaran: e.target.value }))}
                placeholder="Contoh: Akidah Akhlak, Sosiologi, Biologi"
                className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl font-bold text-xs sm:text-sm focus:outline-none shadow-xs"
              />
            </div>

            {/* Email Login */}
            <div>
              <label className="block text-[11px] font-black uppercase text-gray-700 mb-1">
                Email Login Akun *
              </label>
              <input
                type="email"
                value={teacherFormData.email}
                onChange={(e) => setTeacherFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="tania@raudhatulyatama.sch.id"
                className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl font-bold text-xs sm:text-sm focus:outline-none shadow-xs"
                required
              />
            </div>

            {/* Ubah Password (Opsional) */}
            <div className="pt-2 border-t border-gray-200 space-y-2">
              <span className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">lock</span>
                Ganti Kata Sandi (Opsional)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="password"
                  value={teacherFormData.current_password}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, current_password: e.target.value }))}
                  placeholder="Password Lama"
                  className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl text-xs font-medium focus:outline-none shadow-xs"
                />
                <input
                  type="password"
                  value={teacherFormData.password}
                  onChange={(e) => setTeacherFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Password Baru (min. 6)"
                  className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl text-xs font-medium focus:outline-none shadow-xs"
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updateTeacherMutation.isPending}
              className="w-full mt-2 py-2.5 sm:py-3 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo active:translate-y-0.5 transition-all text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {updateTeacherMutation.isPending ? (
                <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span className="material-symbols-outlined text-base">save</span>
              )}
              <span>Simpan Data Profil Guru</span>
            </button>
          </div>
        </form>
      ) : (
        /* Form Non-Guru (Admin / Petugas) */
        <form onSubmit={handleSubmit} className="bg-white border-2 sm:border-3 border-gray-900 rounded-2xl shadow-neo p-4 sm:p-5 space-y-3.5">
          <h2 className="font-black text-gray-900 text-xs sm:text-sm uppercase">Ubah Data Login</h2>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Email Baru</label>
            <input
              type="email"
              value={simpleFormData.email}
              onChange={(e) => setSimpleFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-xs sm:text-sm font-bold shadow-xs"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Password Lama</label>
            <input
              type="password"
              value={simpleFormData.current_password}
              onChange={(e) => setSimpleFormData(prev => ({ ...prev, current_password: e.target.value }))}
              placeholder="Diperlukan jika ingin ubah password"
              className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-xs sm:text-sm shadow-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Password Baru (Opsional)</label>
            <input
              type="password"
              value={simpleFormData.password}
              onChange={(e) => setSimpleFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Biarkan kosong jika tidak ingin diubah"
              className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl focus:outline-none text-xs sm:text-sm shadow-xs"
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={updateGeneralMutation.isPending}
            className="w-full py-2.5 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo active:translate-y-0.5 transition-all disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
          >
            {updateGeneralMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      )}
    </div>
  );
}
