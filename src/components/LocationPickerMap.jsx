import React, { useEffect, useRef, useState } from "react";
import DesktopLocationSync from "./DesktopLocationSync";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Hitung jarak Haversine (meter)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Marker Icon Neo-Brutalist
const schoolIcon = L.divIcon({
  className: "school-pin-marker",
  html: `
    <div style="
      background-color: #10B981;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 3px solid #111827;
      box-shadow: 3px 3px 0px #111827;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      cursor: grab;
      user-select: none;
    " title="Geser titik sekolah">
      🏫
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const userIcon = L.divIcon({
  className: "user-pin-marker",
  html: `
    <div style="
      background-color: #3B82F6;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid #111827;
      box-shadow: 2px 2px 0px #111827;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      user-select: none;
    " title="Posisi Anda Saat Ini">
      📍
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export default function LocationPickerMap({
  latitude,
  longitude,
  radius = 100,
  onChangeCoordinates,
  onChangeRadius,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const userMarkerRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingGPS, setIsGettingGPS] = useState(false);
  const [isDesktopBlocked, setIsDesktopBlocked] = useState(false);
  const [gpsStatus, setGpsStatus] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [testDistance, setTestDistance] = useState(null);

  const latNum = parseFloat(latitude) || -3.37651;
  const lonNum = parseFloat(longitude) || 114.64682;
  const radiusNum = parseInt(radius, 10) || 100;

  // Inisialisasi Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Map sudah dibuat

    const map = L.map(mapContainerRef.current, {
      center: [latNum, lonNum],
      zoom: 16,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Marker Sekolah (Draggable)
    const marker = L.marker([latNum, lonNum], {
      icon: schoolIcon,
      draggable: true,
    }).addTo(map);

    marker.bindPopup(
      `<b>Titik Sekolah / Madrasah</b><br>Geser pin ini untuk memindahkan lokasi.`
    );

    // Lingkaran Radius
    const circle = L.circle([latNum, lonNum], {
      radius: radiusNum,
      color: "#059669",
      fillColor: "#10B981",
      fillOpacity: 0.25,
      weight: 2.5,
      dashArray: "6, 6",
    }).addTo(map);

    // Event Geser Marker
    marker.on("dragend", (e) => {
      const { lat, lng } = e.target.getLatLng();
      const newLat = parseFloat(lat.toFixed(8));
      const newLng = parseFloat(lng.toFixed(8));
      circle.setLatLng([newLat, newLng]);
      onChangeCoordinates(newLat, newLng);
      setGpsStatus({
        success: true,
        message: `Titik madrasah digeser ke koordinat: ${newLat}, ${newLng}. Klik 'Simpan Pengaturan' di bawah untuk menetapkannya.`,
      });
    });

    // Event Klik Peta untuk Pindahkan Titik
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      const newLat = parseFloat(lat.toFixed(8));
      const newLng = parseFloat(lng.toFixed(8));
      marker.setLatLng([newLat, newLng]);
      circle.setLatLng([newLat, newLng]);
      onChangeCoordinates(newLat, newLng);
      setGpsStatus({
        success: true,
        message: `Titik madrasah dipasang di: ${newLat}, ${newLng}. Klik 'Simpan Pengaturan' di bawah untuk menetapkannya.`,
      });
    });

    markerRef.current = marker;
    circleRef.current = circle;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update posisi marker & circle jika props latitude/longitude/radius berubah dari luar
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (markerRef.current) {
      const cur = markerRef.current.getLatLng();
      if (Math.abs(cur.lat - latNum) > 0.000001 || Math.abs(cur.lng - lonNum) > 0.000001) {
        markerRef.current.setLatLng([latNum, lonNum]);
      }
    }
    if (circleRef.current) {
      circleRef.current.setLatLng([latNum, lonNum]);
      circleRef.current.setRadius(radiusNum);
    }
  }, [latNum, lonNum, radiusNum]);

  // Handler: Ambil GPS Saat Ini (Cepat & Kompatibel untuk Mobile & PC)
  const handleGetCurrentGPS = async () => {
    const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    
    // Jika di Desktop, cek apakah ada sesi GPS sinkronisasi 3 jam yang masih aktif
    if (isDesktop) {
      try {
        const raw = localStorage.getItem("yatama_location_sync_session");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.latitude && parsed?.longitude && parsed?.expiresAt && Date.now() < parsed.expiresAt) {
            const myLat = parseFloat(Number(parsed.latitude).toFixed(8));
            const myLon = parseFloat(Number(parsed.longitude).toFixed(8));
            onChangeCoordinates(myLat, myLon);
            if (mapInstanceRef.current && markerRef.current && circleRef.current) {
              markerRef.current.setLatLng([myLat, myLon]);
              circleRef.current.setLatLng([myLat, myLon]);
              mapInstanceRef.current.setView([myLat, myLon], 17, { animate: true });
            }
            setGpsStatus({
              success: true,
              message: `Koordinat berhasil diambil dari sesi sinkronisasi HP (${myLat}, ${myLon}). Klik 'Simpan Pengaturan' untuk memperbarui.`,
            });
            return;
          }
        }
      } catch (e) {}

      setGpsStatus({
        success: false,
        message: "Perangkat PC tidak memiliki GPS fisik. Buka menu 'Scan Presensi' dan lakukan sinkronisasi via HP terlebih dahulu, atau geser pin 🏫 di peta secara manual.",
      });
      return;
    }
    if (!navigator.geolocation) {
      setGpsStatus({
        success: false,
        message: "Browser Anda tidak mendukung deteksi lokasi GPS.",
      });
      return;
    }

    // 1. Cek Permission API terlebih dahulu
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: "geolocation" });
        if (perm.state === "denied") {
          setIsGettingGPS(false);
          setGpsStatus({
            success: false,
            blocked: true,
            message: "Izin lokasi GPS saat ini DIBLOKIR oleh browser Anda.",
          });
          return;
        }
      } catch {
        // ignore
      }
    }

    setIsGettingGPS(true);
    setGpsStatus({
      success: null,
      message: "Sedang membaca koordinat GPS perangkat...",
    });

    const onPosSuccess = (pos) => {
      const myLat = parseFloat(pos.coords.latitude.toFixed(8));
      const myLon = parseFloat(pos.coords.longitude.toFixed(8));
      const accuracy = Math.round(pos.coords.accuracy);

      setIsGettingGPS(false);
      setGpsStatus({
        success: true,
        message: `Koordinat GPS berhasil diperoleh! Akurasi: ±${accuracy}m. Klik 'Simpan Pengaturan' di bawah untuk menjadikannya standar sekolah.`,
      });

      setUserLocation({ lat: myLat, lon: myLon, accuracy });
      onChangeCoordinates(myLat, myLon);

      if (mapInstanceRef.current && markerRef.current && circleRef.current) {
        markerRef.current.setLatLng([myLat, myLon]);
        circleRef.current.setLatLng([myLat, myLon]);
        mapInstanceRef.current.setView([myLat, myLon], 18, { animate: true });
      }
    };

    const onPosError = (err) => {
      setIsGettingGPS(false);
      if (err.code === 1) {
        setGpsStatus({
          success: false,
          blocked: true,
          message: "Izin lokasi GPS ditolak oleh browser Anda.",
        });
      } else {
        setGpsStatus({
          success: false,
          message: "Perangkat ini tidak memiliki sinyal satelit GPS (komputer/laptop tanpa sensor GPS). Silakan langsung KLIK pada peta atau GESER pin 🏫 ke lokasi madrasah.",
        });
      }
    };

    // Gunakan konfigurasi standar terlebih dahulu agar cepat dan tidak freeze di PC/laptop
    navigator.geolocation.getCurrentPosition(
      onPosSuccess,
      () => {
        // Fallback coba high accuracy singkat
        navigator.geolocation.getCurrentPosition(
          onPosSuccess,
          onPosError,
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  };

  // Handler: Uji Jarak Lokasi Saya ke Titik Sekolah
  const handleTestDistance = () => {
    const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    if (isDesktop) {
      setIsDesktopBlocked(true);
      return;
    }
    if (!navigator.geolocation) {
      alert("Browser tidak mendukung GPS.");
      return;
    }

    setIsGettingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const myLat = pos.coords.latitude;
        const myLon = pos.coords.longitude;
        const dist = getDistance(myLat, myLon, latNum, lonNum);
        const distRound = Math.round(dist);

        setIsGettingGPS(false);
        setUserLocation({ lat: myLat, lon: myLon, accuracy: Math.round(pos.coords.accuracy) });
        setTestDistance({
          distance: distRound,
          isWithin: distRound <= radiusNum,
        });

        // Pasang marker posisi user di peta jika belum ada
        if (mapInstanceRef.current) {
          if (!userMarkerRef.current) {
            userMarkerRef.current = L.marker([myLat, myLon], { icon: userIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup(`<b>Lokasi Anda Saat Ini</b><br>Jarak ke sekolah: ${distRound}m`);
          } else {
            userMarkerRef.current.setLatLng([myLat, myLon]);
            userMarkerRef.current.setPopupContent(`<b>Lokasi Anda Saat Ini</b><br>Jarak ke sekolah: ${distRound}m`);
          }
          userMarkerRef.current.openPopup();
        }
      },
      (err) => {
        setIsGettingGPS(false);
        alert("Gagal membaca posisi saat ini: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Handler: Cari Alamat atau Koordinat Paste
  const handleSearchLocation = async (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // 1. Cek apakah query adalah format koordinat "lat, lon" langsung (misal dari Google Maps)
    const coordMatch = query.match(/(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)/);
    if (coordMatch) {
      const pLat = parseFloat(coordMatch[1]);
      const pLon = parseFloat(coordMatch[3]);
      if (!isNaN(pLat) && !isNaN(pLon) && Math.abs(pLat) <= 90 && Math.abs(pLon) <= 180) {
        const newLat = parseFloat(pLat.toFixed(8));
        const newLng = parseFloat(pLon.toFixed(8));
        onChangeCoordinates(newLat, newLng);
        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
          circleRef.current.setLatLng([newLat, newLng]);
          mapInstanceRef.current.setView([newLat, newLng], 18, { animate: true });
        }
        setGpsStatus({
          success: true,
          message: `Koordinat berhasil dipasang: ${newLat}, ${newLng}`,
        });
        return;
      }
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=id&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const newLat = parseFloat(parseFloat(item.lat).toFixed(8));
        const newLng = parseFloat(parseFloat(item.lon).toFixed(8));

        onChangeCoordinates(newLat, newLng);

        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
          circleRef.current.setLatLng([newLat, newLng]);
          mapInstanceRef.current.setView([newLat, newLng], 17, { animate: true });
        }
        setGpsStatus({
          success: true,
          message: `Lokasi ditemukan: ${item.display_name.slice(0, 80)}...`,
        });
      } else {
        setGpsStatus({
          success: false,
          message: "Lokasi tidak ditemukan. Coba ketik nama daerah/jalan atau paste langsung format koordinat (-3.xxxx, 114.xxxx).",
        });
      }
    } catch (err) {
      setGpsStatus({
        success: false,
        message: "Gagal mencari alamat: " + err.message,
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
        {/* Search Alamat Form */}
        <form onSubmit={handleSearchLocation} className="flex-1 flex gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama tempat, jalan, atau paste koordinat (mis: -3.3755, 114.6469)..."
              className="w-full pl-8 pr-3 py-2 bg-white border-2 border-gray-900 rounded-xl text-xs font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-green"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-base">
              search
            </span>
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 border-2 border-gray-900 rounded-xl text-xs font-black text-gray-900 shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {isSearching ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>Cari Lokasi</span>
            )}
          </button>
        </form>

        {/* Tombol Ambil GPS Saya & Uji Jarak */}
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={handleGetCurrentGPS}
            disabled={isGettingGPS}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-primary-green hover:bg-emerald-400 border-2 border-gray-900 rounded-xl text-xs font-black text-gray-900 shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Deteksi koordinat lokasi fisik Anda saat ini dan pasang sebagai titik sekolah"
          >
            {isGettingGPS ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined text-base">my_location</span>
            )}
            <span>{isGettingGPS ? "Menghubungkan..." : "Ambil GPS Saya Sekarang"}</span>
          </button>

          <button
            type="button"
            onClick={handleTestDistance}
            disabled={isGettingGPS}
            className="px-3 py-2 bg-white hover:bg-gray-100 border-2 border-gray-900 rounded-xl text-xs font-black text-gray-900 shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Cek jarak fisik perangkat Anda ke titik pin sekolah"
          >
            <span className="material-symbols-outlined text-base text-blue-600">radar</span>
            <span className="hidden sm:inline">Uji Jarak</span>
          </button>
        </div>
      </div>

      {/* Card Panduan Khusus Jika Izin Lokasi GPS Diblokir Browser */}
      {gpsStatus?.blocked && (
        <div className="p-3.5 bg-red-50 border-2 border-red-500 rounded-2xl text-xs text-red-950 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-red-900">
              <span className="material-symbols-outlined text-xl">block</span>
              <span className="text-sm">Izin Lokasi GPS Diblokir di Browser Anda</span>
            </div>
            <button
              type="button"
              onClick={() => setGpsStatus(null)}
              className="text-gray-500 hover:text-gray-900 font-bold"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-700 leading-relaxed">
            Kotak persetujuan lokasi tidak muncul karena browser Anda menyetel izin situs ini ke <strong>&quot;Diblokir&quot;</strong> sebelumnya.
          </p>
          <div className="bg-white p-3 rounded-xl border border-red-200 text-[11px] space-y-1.5 text-gray-800">
            <p className="font-black text-gray-900">Cara Mengaktifkan Izin Lokasi di Browser:</p>
            <p>1. Lihat bilah alamat atas browser Anda (tepat di sebelah kiri tulisan <code>absen.raudhatulyatama.sch.id</code>).</p>
            <p>2. Klik ikon <strong>Gembok (🔒)</strong> atau ikon <strong>Setelan Situs (tune / slider)</strong>.</p>
            <p>3. Pada bagian <strong>Lokasi (Location)</strong>, ubah dari &quot;Diblokir&quot; menjadi <strong>&quot;Izinkan&quot; (Allow)</strong>.</p>
            <p>4. Muat ulang / Refresh halaman ini (F5 / tarik layar ke bawah di HP).</p>
          </div>
          <div className="pt-1 text-[11px] text-gray-600 font-semibold">
            💡 Alternatif Tanpa GPS: Anda dapat langsung <strong>klik titik mana saja di peta</strong>, <strong>geser pin 🏫</strong>, atau <strong>paste koordinat</strong> di kolom pencarian lalu klik <strong>Simpan Pengaturan Lokasi & GPS</strong>.
          </div>
        </div>
      )}

      {/* GPS / Action Status Notification */}
      {gpsStatus && !gpsStatus.blocked && (
        <div
          className={`p-2.5 rounded-xl border-2 text-xs flex items-center justify-between ${
            gpsStatus.success === true
              ? "bg-emerald-50 border-emerald-500 text-emerald-950"
              : gpsStatus.success === false
              ? "bg-red-50 border-red-500 text-red-950"
              : "bg-amber-50 border-amber-400 text-amber-950 animate-pulse"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base flex-shrink-0">
              {gpsStatus.success === true
                ? "check_circle"
                : gpsStatus.success === false
                ? "error"
                : "progress_activity"}
            </span>
            <span className="font-bold">{gpsStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setGpsStatus(null)}
            className="text-gray-600 hover:text-gray-900 font-black ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hasil Uji Jarak (Live Distance Result) */}
      {testDistance && (
        <div
          className={`p-3 rounded-xl border-2 flex items-center justify-between text-xs ${
            testDistance.isWithin
              ? "bg-emerald-100 border-emerald-600 text-emerald-950"
              : "bg-red-100 border-red-600 text-red-950"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">
              {testDistance.isWithin ? "verified" : "location_off"}
            </span>
            <div>
              <span className="font-black">
                Jarak Anda Saat Ini: {testDistance.distance} meter dari titik sekolah.
              </span>{" "}
              <span className="font-medium">
                {testDistance.isWithin
                  ? `(Lolos Validasi • Berada di dalam radius ${radiusNum}m)`
                  : `(Di Luar Radius • Melebihi batas toleransi ${radiusNum}m)`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTestDistance(null)}
            className="font-black text-gray-600 hover:text-gray-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Map Container Viewport */}
      <div className="relative w-full h-80 sm:h-96 rounded-2xl border-2 md:border-3 border-gray-900 overflow-hidden shadow-neo">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Petunjuk Interaktif Melayang di Atas Peta */}
        <div className="absolute top-2.5 left-2.5 z-[1000] bg-white/95 backdrop-blur-sm border-2 border-gray-900 rounded-xl px-2.5 py-1.5 shadow-sm text-[11px] font-bold text-gray-800 pointer-events-none flex items-center gap-1.5">
          <span>💡</span>
          <span>Klik peta atau geser pin 🏫 untuk memindahkan lokasi madrasah</span>
        </div>

        {/* Indikator Radius Melayang */}
        <div className="absolute bottom-2.5 right-2.5 z-[1000] bg-white/95 backdrop-blur-sm border-2 border-gray-900 rounded-xl px-2.5 py-1.5 shadow-sm text-[11px] font-mono font-black text-gray-900 pointer-events-none flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-gray-900 inline-block"></span>
          <span>Radius: {radiusNum}m</span>
        </div>
      </div>

      {/* Coordinate & Radius Inputs Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-gray-700 flex items-center justify-between">
            <span>Latitude (Lintang) *</span>
            <span className="text-[10px] text-gray-400 font-mono">Format Desimal</span>
          </label>
          <input
            type="number"
            step="any"
            value={latitude ?? ""}
            onChange={(e) =>
              onChangeCoordinates(
                parseFloat(e.target.value) || 0,
                longitude
              )
            }
            placeholder="-3.37651000"
            className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl font-mono text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-green"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-gray-700 flex items-center justify-between">
            <span>Longitude (Bujur) *</span>
            <span className="text-[10px] text-gray-400 font-mono">Format Desimal</span>
          </label>
          <input
            type="number"
            step="any"
            value={longitude ?? ""}
            onChange={(e) =>
              onChangeCoordinates(
                latitude,
                parseFloat(e.target.value) || 0
              )
            }
            placeholder="114.64682000"
            className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl font-mono text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-green"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-gray-700 flex items-center justify-between">
            <span>Radius Toleransi (Meter) *</span>
            <span className="text-[10px] text-gray-400 font-mono">5 - 5000 m</span>
          </label>
          <input
            type="number"
            min="5"
            max="5000"
            value={radius ?? 100}
            onChange={(e) => onChangeRadius(parseInt(e.target.value, 10) || 100)}
            placeholder="100"
            className="w-full px-3 py-2 bg-white border-2 border-gray-900 rounded-xl font-mono text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-green"
            required
          />
        </div>
      </div>

      {/* Preset Radius Buttons & Google Maps Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-gray-500 font-bold text-[11px]">Pilihan Radius Cepat:</span>
          {[50, 100, 150, 200, 300, 500].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChangeRadius(r)}
              className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono font-bold cursor-pointer transition-all ${
                radiusNum === r
                  ? "bg-primary-green text-gray-900 border-gray-900 shadow-sm"
                  : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
              }`}
            >
              {r}m
            </button>
          ))}
        </div>

        {latitude && longitude && (
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-700 hover:text-emerald-900 font-bold underline flex items-center gap-1 text-[11px] self-end sm:self-auto"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            <span>Buka Titik di Google Maps</span>
          </a>
        )}
      </div>
    </div>
  );
}
