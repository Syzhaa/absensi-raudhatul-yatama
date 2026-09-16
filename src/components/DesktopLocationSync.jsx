import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { QRCodeSVG } from "qrcode.react";
import api from "../services/api";
import { useAppStore } from "../store/useAppStore";

export default function DesktopLocationSync({ onLocationReceived, title = "Verifikasi Lokasi via HP" }) {
  const [sessionId] = useState(() => uuidv4());
  const [status, setStatus] = useState("connecting"); // connecting, listening, success, error
  const [syncUrl, setSyncUrl] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const userRoleStore = useAppStore((state) => state.userRole);
  const userLembagaStore = useAppStore((state) => state.userLembaga);

  // 1. Fetch current logged-in user on this PC
  useEffect(() => {
    let isMounted = true;
    api.get("/auth/me")
      .then((res) => {
        if (isMounted && res.data?.data) {
          setCurrentUser(res.data.data);
        }
      })
      .catch(() => {
        // Fallback to store if offline or error
        if (isMounted) {
          setCurrentUser({
            role: userRoleStore || "guru",
            lembaga: userLembagaStore || "MA",
          });
        }
      })
      .finally(() => {
        if (isMounted) setLoadingUser(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userRoleStore, userLembagaStore]);

  // 2. Generate Sync URL with PC user metadata
  useEffect(() => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    if (currentUser?.id) params.set("uid", currentUser.id);
    if (currentUser?.role) params.set("role", currentUser.role);
    if (currentUser?.nama || currentUser?.name) {
      params.set("name", currentUser.nama || currentUser.name);
    }
    const url = `${baseUrl}/sync/${sessionId}?${params.toString()}`;
    setSyncUrl(url);
  }, [sessionId, currentUser]);

  // 3. Listen to SSE Stream
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "https://api.raudhatulyatama.sch.id/api/v1";
    const sse = new EventSource(`${apiUrl}/location-sync/stream/${sessionId}`);

    sse.addEventListener("connected", () => {
      setStatus("listening");
    });

    sse.addEventListener("location_received", (e) => {
      try {
        const data = JSON.parse(e.data);
        setStatus("success");
        sse.close();

        setTimeout(() => {
          onLocationReceived({
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            accuracy: Number(data.accuracy || 5),
            isPcVerified: true,
            syncedByName: data.synced_by_name || "Petugas",
            syncedByRole: data.synced_by_role || "Admin",
          });
        }, 1200);
      } catch (err) {
        console.error("Failed to parse SSE location data", err);
      }
    });

    sse.addEventListener("timeout", () => {
      setStatus("error");
      sse.close();
    });

    sse.onerror = () => {
      // Retrying automatically
    };

    return () => {
      sse.close();
    };
  }, [sessionId, onLocationReceived]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const isAdmin = [
    "super_admin",
    "admin_yayasan",
    "admin_ma",
    "admin_mts",
    "admin_akademik",
    "petugas_absen",
  ].includes(currentUser?.role);

  return (
    <div className="w-full max-w-3xl mx-auto bg-white border-3 sm:border-4 border-gray-900 rounded-3xl p-6 sm:p-8 shadow-neo-lg animate-fade-in">
      {status === "success" ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-emerald-100 border-3 border-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm animate-bounce">
            <span className="material-symbols-outlined text-5xl text-emerald-700">check_circle</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 mb-2">
            Lokasi Berhasil Terverifikasi!
          </h2>
          <p className="text-sm sm:text-base font-semibold text-emerald-800 mb-1">
            Masa aktif izin lokasi di PC ini berlaku selama <strong>3 Jam ke depan</strong>.
          </p>
          <p className="text-xs text-gray-500 font-medium">
            Membuka jendela scanner presensi...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Kolom Kiri: Informasi & Petunjuk RBAC */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border-2 border-gray-900 rounded-full text-xs font-black text-amber-950 mb-3 shadow-xs">
                <span className="material-symbols-outlined text-sm">satellite_alt</span>
                SINKRONISASI GPS PC (3 JAM)
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-snug mb-2">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                Perangkat PC/Laptop tidak memiliki sensor GPS fisik. Scan QR Code di samping menggunakan HP untuk membagikan lokasi GPS sekolah yang sah.
              </p>
            </div>

            {/* Identitas Akun Login PC */}
            <div className="p-4 bg-slate-50 border-2 border-gray-900 rounded-2xl shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-gray-500 tracking-wider">
                  Akun Terhubung di PC
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border border-gray-900 ${
                  isAdmin ? "bg-amber-300 text-amber-950" : "bg-blue-300 text-blue-950"
                }`}>
                  {currentUser?.role ? currentUser.role.replace("_", " ") : "MEMUAT..."}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white border-2 border-gray-900 flex items-center justify-center font-black text-sm text-gray-800 shadow-xs">
                  {currentUser?.nama ? currentUser.nama.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-sm text-gray-900 truncate">
                    {currentUser?.nama || currentUser?.name || "Pengguna PC"}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono truncate">
                    {currentUser?.email || (loadingUser ? "Memuat data user..." : "-")}
                  </div>
                </div>
              </div>
            </div>

            {/* Aturan Keamanan / RBAC Note */}
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-medium flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-emerald-700 flex-shrink-0 mt-0.5">
                verified_user
              </span>
              <div className="space-y-1">
                <p className="font-bold text-emerald-900">Ketentuan Validasi:</p>
                <p className="text-[11px] text-emerald-800 leading-normal">
                  {isAdmin ? (
                    <>Akun <strong>Admin</strong> dapat disinkronkan oleh HP admin madrasah mana pun.</>
                  ) : (
                    <>Akun <strong>Guru</strong> hanya dapat disinkronkan oleh HP dengan akun guru yang sama (atau akun Admin).</>
                  )}
                </p>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-gray-400">schedule</span>
              Setelah terhubung, PC dapat melakukan scan bebas GPS selama <strong>3 Jam</strong>.
            </div>
          </div>

          {/* Kolom Kanan: QR Code & Status */}
          <div className="md:col-span-5 flex flex-col items-center justify-center bg-gray-50 p-5 rounded-2xl border-2 border-gray-300">
            {syncUrl ? (
              <div className="p-3 bg-white border-3 border-gray-900 rounded-2xl shadow-neo mb-3 flex items-center justify-center">
                <QRCodeSVG 
                  value={syncUrl} 
                  size={200}
                  bgColor={"#ffffff"}
                  fgColor={"#111827"}
                  level={"M"}
                />
              </div>
            ) : (
              <div className="w-[200px] h-[200px] bg-gray-200 border-2 border-gray-400 rounded-2xl animate-pulse flex items-center justify-center mb-3">
                <span className="text-xs font-bold text-gray-500">Membuat QR...</span>
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              {status === "listening" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border-2 border-emerald-500 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Menunggu Scan HP...
                </span>
              ) : status === "error" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-400">
                  Sesi Habis
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-400">
                  Menghubungkan server...
                </span>
              )}
            </div>

            {status === "error" && (
              <button 
                onClick={handleRefresh}
                className="mt-2 px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 shadow-sm cursor-pointer"
              >
                Generate Ulang QR
              </button>
            )}

            <p className="text-[10px] text-gray-400 font-mono mt-1">
              Sesi: {sessionId.slice(0, 8)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
