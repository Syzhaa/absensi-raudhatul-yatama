import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import api from "../services/api";
import { authService } from "../services";
import useAppStore from "../store/useAppStore";

function getDeviceId() {
  const storageKey = "yatama_device_id";
  let deviceId = localStorage.getItem(storageKey);
  if (!deviceId) {
    deviceId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "dev-" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(storageKey, deviceId);
  }
  return deviceId;
}

export default function LocationSyncMobile() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const pcUid = searchParams.get("uid");
  const pcRole = searchParams.get("role");
  const pcName = searchParams.get("name");

  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form login states (if not logged in)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Sync execution states
  const [status, setStatus] = useState("idle"); // idle, locating, sending, success, error
  const [statusMessage, setStatusMessage] = useState("");

  // 1. Check user login status on mount
  const checkAuth = async () => {
    setCheckingAuth(true);
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setCurrentUser(null);
      setCheckingAuth(false);
      return;
    }
    try {
      const res = await api.get("/auth/me");
      if (res.data?.data) {
        setCurrentUser(res.data.data);
      } else {
        setCurrentUser(null);
      }
    } catch {
      localStorage.removeItem("auth_token");
      setCurrentUser(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const adminRoles = [
    "super_admin",
    "admin_yayasan",
    "admin_ma",
    "admin_mts",
    "admin_akademik",
    "petugas_absen",
  ];

  const isHpAdmin = currentUser && adminRoles.includes(currentUser.role);
  const isMatchGuru = currentUser && currentUser.role === "guru" && pcUid && String(currentUser.id) === String(pcUid);
  const isDenied = currentUser && !isHpAdmin && currentUser.role === "guru" && pcUid && String(currentUser.id) !== String(pcUid);

  // 2. Perform Login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLoginError("Email dan password wajib diisi");
      return;
    }
    setLoginLoading(true);
    setLoginError("");

    try {
      const deviceId = getDeviceId();
      const res = await authService.login(email.trim(), password.trim(), deviceId);
      const token = res.token || res.data?.token || res.data?.access_token;
      if (token) {
        localStorage.setItem("auth_token", token);
      }
      // Re-hydrate user
      const meRes = await api.get("/auth/me");
      const user = meRes.data?.data;
      setCurrentUser(user);
    } catch (err) {
      setLoginError(
        err.response?.data?.message || "Login gagal. Cek kembali email dan password Anda."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // 3. Perform GPS Sync Push
  const executeSync = (activeUser = currentUser) => {
    if (!activeUser) return;

    if (!navigator.geolocation) {
      setStatus("error");
      setStatusMessage("Browser di HP Anda tidak mendukung sensor GPS satelit.");
      return;
    }

    setStatus("locating");
    setStatusMessage("Mengambil koordinat GPS satelit HP yang akurat...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus("sending");
        setStatusMessage("Koordinat didapat. Menyinkronkan ke layar PC...");

        try {
          const apiUrl = import.meta.env.VITE_API_URL || "https://api.raudhatulyatama.sch.id/api/v1";
          const res = await axios.post(`${apiUrl}/location-sync/${sessionId}`, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 5,
            synced_by_id: activeUser.id,
            synced_by_name: activeUser.nama || activeUser.name,
            synced_by_role: activeUser.role,
            pc_user_id: pcUid,
          });

          if (res.data?.success) {
            setStatus("success");
            setStatusMessage("Lokasi berhasil disinkronkan ke PC! Akses presensi di PC aktif selama 3 Jam.");
          } else {
            setStatus("error");
            setStatusMessage(res.data?.message || "Gagal sinkron lokasi ke PC.");
          }
        } catch (error) {
          setStatus("error");
          setStatusMessage(
            error.response?.data?.message || "Gagal mengirim lokasi ke server. Pastikan QR code di PC masih aktif."
          );
        }
      },
      (err) => {
        setStatus("error");
        if (err.code === 1) {
          setStatusMessage("Izin Lokasi Ditolak. Harap izinkan akses lokasi (GPS) pada pengaturan browser HP Anda.");
        } else {
          setStatusMessage("Gagal mendeteksi lokasi GPS satelit. Pastikan sensor lokasi/GPS di HP Anda aktif.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {}
    localStorage.removeItem("auth_token");
    setCurrentUser(null);
    setStatus("idle");
    setStatusMessage("");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center font-black text-gray-600 animate-pulse text-sm">
          Memeriksa autentikasi...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white border-3 sm:border-4 border-gray-900 rounded-3xl p-6 sm:p-7 shadow-neo-lg text-left">
        
        {/* Header Branding */}
        <div className="flex items-center gap-3 pb-5 border-b-2 border-gray-200 mb-5">
          <div className="w-12 h-12 bg-primary-green border-2 border-gray-900 rounded-2xl flex items-center justify-center shadow-xs flex-shrink-0">
            <span className="material-symbols-outlined text-2xl text-gray-900">devices_linked</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Sinkronisasi Lokasi PC</h1>
            <p className="text-xs text-gray-500 font-medium">Validasi Fisik Madrasah Raudhatul Yatama</p>
          </div>
        </div>

        {/* Target PC Info Card */}
        <div className="p-3.5 bg-slate-50 border-2 border-gray-900 rounded-2xl mb-5 space-y-1">
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Perangkat PC Tujuan</span>
          <div className="flex items-center justify-between">
            <span className="font-black text-sm text-gray-900 truncate">
              {pcName ? decodeURIComponent(pcName) : "Komputer Madrasah"}
            </span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-gray-900 bg-amber-200 text-amber-950">
              {pcRole ? pcRole.replace("_", " ") : "SESI PC"}
            </span>
          </div>
        </div>

        {/* CONDITION 1: Belum Login di HP -> Tampilkan Form Login */}
        {!currentUser ? (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 font-medium flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-amber-700 flex-shrink-0 mt-0.5">lock</span>
              <span>
                Silakan login dengan akun <strong>Admin</strong> atau <strong>Guru</strong> yang berwenang untuk menyetujui sesi ini.
              </span>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 font-bold flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-red-600 flex-shrink-0">error</span>
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-gray-800 mb-1">Email / NIP Akun</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@raudhatulyatama.sch.id"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-gray-900 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-800 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-gray-900 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 text-xs font-black"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full mt-2 bg-primary-green hover:bg-emerald-400 text-gray-900 border-2 border-gray-900 rounded-xl py-3 font-black text-sm shadow-neo transition-all active:translate-y-0.5 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">login</span>
                    <span>Masuk & Lanjutkan</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* CONDITION 2: Sudah Login di HP -> Tampilkan Info Akun & Eksekusi */
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 border-2 border-gray-900 rounded-2xl flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-black uppercase text-gray-500 block">Akun Login di HP</span>
                <div className="font-black text-sm text-gray-900 truncate">
                  {currentUser.nama || currentUser.name}
                </div>
                <div className="text-[11px] font-bold text-gray-500">
                  Role: <span className="capitalize text-gray-900 font-black">{currentUser.role.replace("_", " ")}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-black text-red-600 hover:text-red-800 underline flex-shrink-0"
              >
                Ganti Akun
              </button>
            </div>

            {/* Jika Ditolak Karena Beda Akun Guru */}
            {isDenied && (
              <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-red-700">
                  <span className="material-symbols-outlined text-xl">block</span>
                  <span className="font-black text-sm">Akses Sinkronisasi Ditolak</span>
                </div>
                <p className="text-xs text-red-900 font-medium leading-relaxed">
                  Anda login sebagai <strong>{currentUser.nama || currentUser.name}</strong> (Guru). 
                  Akun di PC adalah milik <strong>{pcName ? decodeURIComponent(pcName) : "Guru Lain"}</strong>.
                  <br /><br />
                  Sesuai aturan keamanan madrasah, <strong>Guru hanya dapat menyinkronkan akunnya sendiri</strong>. Jika ini komputer umum, harap minta <strong>Admin Absen</strong> untuk menyinkronkan.
                </p>
              </div>
            )}

            {/* Status Feedback (Locating / Sending / Success / Error) */}
            {status !== "idle" && (
              <div className={`p-4 rounded-2xl border-2 text-center space-y-2 ${
                status === "success" ? "bg-emerald-50 border-emerald-600 text-emerald-950" :
                status === "error" ? "bg-red-50 border-red-600 text-red-950" :
                "bg-amber-50 border-amber-600 text-amber-950"
              }`}>
                <span className="material-symbols-outlined text-4xl block mx-auto">
                  {status === "success" ? "check_circle" : status === "error" ? "error" : "satellite_alt"}
                </span>
                <p className="font-black text-sm">{statusMessage}</p>
              </div>
            )}

            {/* Tombol Eksekusi Sinkronisasi (Hanya jika berhak) */}
            {!isDenied && status !== "success" && (
              <button
                type="button"
                onClick={() => executeSync(currentUser)}
                disabled={status === "locating" || status === "sending"}
                className="w-full bg-primary-green hover:bg-emerald-400 text-gray-900 border-3 border-gray-900 rounded-2xl py-3.5 font-black text-sm sm:text-base shadow-neo transition-all active:translate-y-0.5 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {status === "locating" || status === "sending" ? (
                  <>
                    <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
                    <span>Menyinkronkan GPS...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">send</span>
                    <span>Kirim Lokasi ke PC (Aktif 3 Jam)</span>
                  </>
                )}
              </button>
            )}

            {status === "success" && (
              <div className="text-center pt-2">
                <p className="text-xs text-gray-500 font-medium">
                  Selesai. Anda dapat menutup halaman ini dan kembali ke komputer PC Anda.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
