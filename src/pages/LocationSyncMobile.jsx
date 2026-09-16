import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function LocationSyncMobile() {
  const { sessionId } = useParams();
  const [status, setStatus] = useState("idle"); // idle, locating, sending, success, error
  const [message, setMessage] = useState("Ketuk tombol di bawah untuk mengirim koordinat satelit (GPS) Anda ke sistem.");
  
  const handleSync = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setMessage("Browser di HP Anda tidak mendukung fitur GPS.");
      return;
    }

    setStatus("locating");
    setMessage("Mendeteksi koordinat satelit...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus("sending");
        setMessage("Koordinat didapat. Mengirim ke sistem...");
        
        try {
          const apiUrl = import.meta.env.VITE_API_URL || "https://api.raudhatulyatama.sch.id/api/v1";
          await axios.post(`${apiUrl}/location-sync/${sessionId}`, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          
          setStatus("success");
          setMessage("Lokasi berhasil dikirim! Anda bisa menutup halaman ini dan kembali melihat layar PC/Laptop Anda.");
        } catch (error) {
          setStatus("error");
          setMessage("Gagal mengirim lokasi ke server. Pastikan koneksi internet stabil atau QR belum kadaluarsa.");
        }
      },
      (err) => {
        setStatus("error");
        if (err.code === 1) {
          setMessage("Izin Lokasi Ditolak. Harap izinkan akses lokasi (GPS) pada browser HP Anda.");
        } else {
          setMessage("Gagal mendapatkan lokasi. Pastikan GPS HP Anda aktif.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white border-4 border-gray-900 rounded-3xl p-6 shadow-neo text-center">
        
        <div className={`w-20 h-20 mx-auto rounded-2xl border-4 border-gray-900 flex items-center justify-center mb-6 shadow-sm ${
          status === "success" ? "bg-emerald-200" :
          status === "error" ? "bg-red-200" :
          status === "locating" || status === "sending" ? "bg-amber-200 animate-pulse" :
          "bg-blue-200"
        }`}>
          <span className="material-symbols-outlined text-4xl text-gray-900">
            {status === "success" ? "task_alt" :
             status === "error" ? "error" :
             status === "locating" ? "satellite_alt" :
             status === "sending" ? "cloud_sync" :
             "share_location"}
          </span>
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-2">Sinkronisasi Lokasi</h1>
        <p className="text-sm font-medium text-gray-600 mb-8 leading-relaxed">
          {message}
        </p>

        {status === "idle" || status === "error" ? (
          <button
            onClick={handleSync}
            className="w-full bg-primary-green hover:bg-emerald-400 text-gray-900 border-3 border-gray-900 rounded-2xl py-4 font-black text-lg shadow-neo transition-all active:translate-y-1 active:shadow-none flex justify-center items-center gap-2"
          >
            <span className="material-symbols-outlined font-bold">send</span>
            Kirim Lokasi ke PC
          </button>
        ) : null}

        {status === "success" && (
          <div className="mt-4 px-4 py-3 bg-gray-100 rounded-xl border-2 border-gray-900 text-gray-800 font-bold text-sm">
            ✅ Proses Selesai. Lanjutkan di layar PC.
          </div>
        )}

      </div>
    </div>
  );
}
