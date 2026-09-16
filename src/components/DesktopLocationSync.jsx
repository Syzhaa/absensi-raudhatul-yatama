import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { QRCodeSVG } from "qrcode.react";

export default function DesktopLocationSync({ onLocationReceived, title = "Verifikasi Lokasi via HP" }) {
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("generating"); // generating, listening, success, error
  const [syncUrl, setSyncUrl] = useState("");

  useEffect(() => {
    // 1. Generate unique session ID
    const newSessionId = uuidv4();
    setSessionId(newSessionId);

    // 2. Build Sync URL for mobile device
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/sync/${newSessionId}`;
    setSyncUrl(url);

    // 3. Connect to SSE
    const apiUrl = import.meta.env.VITE_API_URL || "https://api.raudhatulyatama.sch.id/api/v1";
    const sse = new EventSource(`${apiUrl}/location-sync/stream/${newSessionId}`);

    sse.addEventListener("connected", (e) => {
      setStatus("listening");
    });

    sse.addEventListener("location_received", (e) => {
      try {
        const data = JSON.parse(e.data);
        setStatus("success");
        sse.close();
        
        // Pass data upward with a slight delay for visual confirmation
        setTimeout(() => {
          onLocationReceived({
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            isPcVerified: true, // Mark it as valid cross-synced PC
          });
        }, 1500);
      } catch (err) {
        console.error("Failed to parse SSE location data", err);
      }
    });

    sse.addEventListener("timeout", (e) => {
      setStatus("error");
      sse.close();
    });

    sse.onerror = (e) => {
      // Ignore normal disconnects or initial handshake drops
      if (sse.readyState === EventSource.CLOSED) {
        // SSE closed normally
      }
    };

    return () => {
      sse.close();
    };
  }, []);

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
      <p className="text-sm text-gray-600 font-medium mb-6">
        Komputer ini membutuhkan koordinat satelit GPS (Lokasi). 
        <strong> Scan QR Code di bawah ini </strong> menggunakan kamera HP Anda untuk menghubungkan lokasi.
      </p>

      {status === "listening" && syncUrl && (
        <div className="flex justify-center mb-4 p-4 border-2 border-gray-300 rounded-2xl bg-gray-50 inline-block">
          <QRCodeSVG 
            value={syncUrl} 
            size={200}
            bgColor={"#f9fafb"}
            fgColor={"#111827"}
            level={"Q"}
          />
        </div>
      )}

      {status === "success" && (
        <div className="p-4 bg-emerald-100 border-2 border-emerald-500 rounded-2xl mb-4">
          <span className="material-symbols-outlined text-4xl text-emerald-600 mb-2">check_circle</span>
          <p className="font-black text-emerald-900">Lokasi Berhasil Disinkronkan!</p>
          <p className="text-xs text-emerald-700 mt-1">Mengalihkan ke sistem...</p>
        </div>
      )}

      {status === "error" && (
        <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl mb-4">
          <p className="font-bold text-red-900 mb-2">Sesi Habis (Timeout)</p>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-sm"
          >
            Generate Ulang QR
          </button>
        </div>
      )}

      {status === "generating" && (
        <div className="py-8 animate-pulse text-gray-500 font-bold">
          Menyiapkan sambungan aman...
        </div>
      )}

      <p className="text-xs text-gray-500 font-mono mt-4">
        Session: {sessionId.split("-")[0]}
      </p>
    </div>
  );
}
