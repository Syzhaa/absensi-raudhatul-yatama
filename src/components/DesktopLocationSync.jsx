import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { QRCodeSVG } from "qrcode.react";

export default function DesktopLocationSync({ onLocationReceived, title = "Verifikasi Lokasi via HP" }) {
  const [sessionId] = useState(() => uuidv4());
  const [status, setStatus] = useState("connecting"); // connecting, listening, success, error
  const [syncUrl, setSyncUrl] = useState("");

  useEffect(() => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/sync/${sessionId}`;
    setSyncUrl(url);

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
      // Keep listening or retry
    };

    return () => {
      sse.close();
    };
  }, [sessionId, onLocationReceived]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white border-4 border-gray-900 rounded-3xl p-6 shadow-neo text-center">
      <div className="w-16 h-16 bg-blue-100 border-2 border-gray-900 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm">
        <span className="material-symbols-outlined text-3xl text-blue-700">
          devices_linked
        </span>
      </div>

      <h3 className="text-xl font-black text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 font-medium mb-5 leading-relaxed">
        Komputer PC tidak memiliki sensor GPS fisik.
        <br />
        <strong>Scan QR Code di bawah dengan HP</strong> yang sudah login untuk memvalidasi lokasi presensi.
      </p>

      {status === "success" ? (
        <div className="p-5 bg-emerald-100 border-3 border-emerald-600 rounded-2xl mb-4">
          <span className="material-symbols-outlined text-5xl text-emerald-600 mb-2">check_circle</span>
          <p className="font-black text-emerald-900 text-base">Lokasi Berhasil Disinkronkan!</p>
          <p className="text-xs text-emerald-700 mt-1">Membuka scanner...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {syncUrl && (
            <div className="p-4 border-3 border-gray-900 rounded-2xl bg-white shadow-sm mb-3">
              <QRCodeSVG 
                value={syncUrl} 
                size={210}
                bgColor={"#ffffff"}
                fgColor={"#111827"}
                level={"M"}
              />
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            {status === "listening" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Menunggu Scan dari HP...
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
              className="mt-2 px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700"
            >
              Generate Ulang QR
            </button>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-400 font-mono mt-3">
        ID Sesi: {sessionId.slice(0, 8)}
      </p>
    </div>
  );
}
