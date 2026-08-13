import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { authService } from "../services";
import { useAppStore } from "../store/useAppStore";
import { useState, useEffect } from "react";

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUserRole = useAppStore((state) => state.setUserRole);
  const setUserLembaga = useAppStore((state) => state.setUserLembaga);
  
  const [formData, setFormData] = useState({ email: '', current_password: '', password: '' });
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
  });

  const user = data?.data;

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.put("/auth/profile", data);
      return res.data;
    },
    onSuccess: () => {
      setMessage('Profil berhasil diperbarui!');
      setErrorMsg('');
      setFormData(prev => ({ ...prev, current_password: '', password: '' }));
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

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem("auth_token");
      setUserRole(null);
      setUserLembaga(null);
      navigate("/login");
      window.location.reload();
    }
  };

  if (isLoading) return <div className="font-bold">Memuat profil...</div>;

  return (
    <div className="max-w-xl mx-auto bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-5 space-y-5">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full border-3 border-gray-900 bg-primary-green flex items-center justify-center text-xl font-black">
          {user?.name?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">{user?.name}</h1>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-100 rounded-xl p-3 border-2 border-gray-200">
          <p className="text-xs text-gray-500 font-bold">ROLE</p>
          <p className="font-black">{user?.role_label}</p>
        </div>
        <div className="bg-gray-100 rounded-xl p-3 border-2 border-gray-200">
          <p className="text-xs text-gray-500 font-bold">LEMBAGA</p>
          <p className="font-black uppercase">{user?.lembaga}</p>
        </div>
      </div>

      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 space-y-4">
        <h2 className="font-black text-gray-900 text-sm">Ubah Data Login</h2>
        
        {message && <div className="bg-green-100 text-green-800 p-2 rounded-lg text-sm font-bold border-2 border-green-200">{message}</div>}
        {errorMsg && <div className="bg-red-100 text-red-800 p-2 rounded-lg text-sm font-bold border-2 border-red-200">{errorMsg}</div>}

        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1">EMAIL BARU</label>
          <input 
            type="email" 
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg focus:border-primary-green focus:outline-none text-sm font-bold"
            required
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1">PASSWORD LAMA</label>
          <input 
            type="password" 
            value={formData.current_password}
            onChange={(e) => setFormData(prev => ({ ...prev, current_password: e.target.value }))}
            placeholder="Diperlukan jika ingin ubah password"
            className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg focus:border-primary-green focus:outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1">PASSWORD BARU (Opsional)</label>
          <input 
            type="password" 
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Biarkan kosong jika tidak ingin diubah"
            className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg focus:border-primary-green focus:outline-none text-sm"
            minLength={6}
          />
        </div>
        <button 
          type="button" 
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="w-full py-2.5 bg-primary-green text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-sm hover:shadow-neo transition-all disabled:opacity-50 text-sm"
        >
          {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>

    </div>
  );
}
