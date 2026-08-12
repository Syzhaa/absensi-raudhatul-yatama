import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { authService } from "../services";
import { useAppStore } from "../store/useAppStore";

export default function Profile() {
  const navigate = useNavigate();
  const setUserRole = useAppStore((state) => state.setUserRole);
  const setUserLembaga = useAppStore((state) => state.setUserLembaga);
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
  });

  const user = data?.data;
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
      <button onClick={logout} className="w-full py-3 bg-red-500 text-white font-black border-2 border-gray-900 rounded-xl shadow-neo">
        Keluar
      </button>
    </div>
  );
}
