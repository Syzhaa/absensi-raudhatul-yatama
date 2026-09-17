import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { QRCodeSVG } from "qrcode.react";
import api from "../services/api";
import { useAppStore } from "../store/useAppStore";

export default function DesktopLocationSync({ onLocationReceived, title = "Verifikasi Lokasi via HP", lembaga = "MA" }) {
  const [sessionId] = useState(() => uuidv4());
  const [status, setStatus] = useState("connecting"); // connecting, listening, success, error
  const [syncUrl, setSyncUrl] = useState("");

  const userIdStore = useAppStore((state) => state.userId);
  const userNameStore = useAppStore((state) => state.userName);
  const userRoleStore = useAppStore((state) => state.userRole);
  const userEmailStore = useAppStore((state) => state.userEmail);

  const [currentUser, setCurrentUser] = useState({
    id: userIdStore,
    name: userNameStore,
    role: userRoleStore,
    email: userEmailStore,
  });

  // Background fetch fresh user data if store is missing id
  useEffect(() => {
    let isMounted = true;
    if (!currentUser.id) {
      api.get("/auth/me")
        .then((res) => {
          if (isMounted && res.data?.data) {
            setCurrentUser(res.data.data);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser.id]);

  // Generate Sync URL with PC user metadata immediately
  useEffect(() => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    const activeUid = currentUser.id || userIdStore;
    const activeRole = currentUser.role || userRoleStore;
    const activeName = currentUser.name || currentUser.nama || userNameStore;
    const activeLembaga = lembaga || "MA";

    if (activeUid) params.set("uid", activeUid);
    if (activeRole) params.set("role", activeRole);
    if (activeName) params.set("name", activeName);
    if (activeLembaga) params.set("lembaga", activeLembaga);

    const url = `${baseUrl}/sync/${sessionId}?${params.toString()}`;
    setSyncUrl(url);
  }, [sessionId, currentUser, userIdStore, userRoleStore, userNameStore, lembaga]);

  // Listen to SSE Stream + Polling Fallback
  useEffect(() => {
    let isDone = false;
    const apiUrl = import.meta.env.VITE_API_URL || "https://api.raudhatulyatama.sch.id/api/v1";
    const sse = new EventSource(`${apiUrl}/location-sync/stream/${sessionId}`);

    const handleSuccessData = (data) => {
      if (isDone) return;
      isDone = true;
      setStatus("success");
      try { sse.close(); } catch (e) {}

      setTimeout(() => {
        onLocationReceived({
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          accuracy: Number(data.accuracy || 5),
          isPcVerified: true,
          syncedByName: data.synced_by_name || "Petugas",
          syncedByRole: data.synced_by_role || "Admin",
        });
      }, 1000);
    };

    sse.addEventListener("connected", () => {
      if (!isDone) setStatus("listening");
    });

    sse.addEventListener("location_received", (e) => {
      try {
        const data = JSON.parse(e.data);
        handleSuccessData(data);
      } catch (err) {
        console.error("Failed to parse SSE location data", err);
      }
    });

    sse.addEventListener("timeout", () => {
      if (!isDone) setStatus("error");
      try { sse.close(); } catch (e) {}
    });

    // Fallback polling every 2.5 seconds in case SSE stream is blocked by client/proxy
    const pollInterval = setInterval(async () => {
      if (isDone) return;
      try {
        const checkRes = await fetch(`${apiUrl}/location-sync/check/${sessionId}`);
        const checkData = await checkRes.json();
        if (checkData.synced && checkData.data) {
          handleSuccessData(checkData.data);
        }
      } catch (err) {
        // ignore poll errors
      }
    }, 2500);

    return () => {
      isDone = true;
      clearInterval(pollInterval);
      try { sse.close(); } catch (e) {}
    };
  }, [sessionId, onLocationReceived]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const activeRole = currentUser.role || userRoleStore;
  const activeName = currentUser.name || currentUser.nama || userNameStore || "Pengguna PC";
  const activeEmail = currentUser.email || userEmailStore || "-";

  const isAdmin = [
    "super_admin",
    "admin_yayasan",
    "admin_ma",
    "admin_mts",
    "admin_akademik",
    "petugas_absen",
  ].includes(activeRole);

  return (
    <div className="w-full max-w-none bg-white border-2 border-gray-900 rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs sm:shadow-sm animate-fade-in">
      {status === "success" ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-emerald-100 border-2 border-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-xs animate-bounce">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Kolom Kiri: Informasi & Petunjuk RBAC */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border border-amber-400 rounded-full text-xs font-black text-amber-950 mb-3 shadow-xs">
                <span className="material-symbols-outlined text-sm">satellite_alt</span>
                SINKRONISASI GPS PC - {(lembaga || "MA").toUpperCase()} (3 JAM)
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight leading-snug mb-2">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed max-w-3xl">
                Perangkat PC/Laptop tidak memiliki sensor GPS fisik. Scan QR Code di samping menggunakan HP untuk membagikan lokasi GPS lingkungan madrasah <strong>{(lembaga || "MA").toUpperCase()}</strong> yang sah.
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
                  {activeRole ? activeRole.replace("_", " ") : "MEMUAT..."}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white border-2 border-gray-900 flex items-center justify-center font-black text-sm text-gray-800 shadow-xs">
                  {activeName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-sm text-gray-900 truncate">
                    {activeName}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono truncate">
                    {activeEmail}
                  </div>
                </div>
              </div>
            </div>

            {/* Aturan Keamanan / RBAC Note */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-medium flex items-start gap-2">
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
          <div className="lg:col-span-4 flex flex-col items-center justify-center bg-gray-50 p-6 rounded-2xl border-2 border-gray-300 shadow-xs">
            {syncUrl ? (
              <div className="p-3.5 bg-white border-2 border-gray-900 rounded-2xl shadow-xs mb-3 flex items-center justify-center">
                <QRCodeSVG 
                  value={syncUrl} 
                  size={210}
                  bgColor={"#ffffff"}
                  fgColor={"#111827"}
                  level={"M"}
                />
              </div>
            ) : (
              <div className="w-[210px] h-[210px] bg-gray-200 border-2 border-gray-400 rounded-2xl animate-pulse flex items-center justify-center mb-3">
                <span className="text-xs font-bold text-gray-500">Membuat QR...</span>
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              {status === "listening" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-500 shadow-xs">
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
                className="mt-2 px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 shadow-xs cursor-pointer"
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
