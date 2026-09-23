/**
 * AntiFakeGps - Engine Deteksi & Pencegahan Fake GPS / Mock Location
 * Yayasan Raudhatul Yatama
 *
 * Menganalisis karakteristik fisik sinyal GNSS satelit:
 * 1. Satellite Jitter / Micro-Drift (Satelit asli selalu memiliki deviasi mikro koordinat)
 * 2. 3D Elevation / Altitude Trilateration (Satelit akurasi tinggi mengunci ketinggian 3D)
 * 3. Artificial Accuracy Presets (Akurasi bulat konstan 5m, 10m, 15m khas Fake GPS)
 * 4. Coordinate Truncation (Koordinat manual 6 desimal Google Maps / Fake GPS pin)
 * 5. Teleportation / Hypersonic Jump (Lompatan koordinat drastis akibat konflik mock vs cell tower)
 * 6. Sticky Latch Security (Sekali terdeteksi mock, sesi terkunci permanen - anti split-second scan)
 */

let samples = [];
const MAX_SAMPLES = 6;

// Sticky Latch: Sekali terdeteksi Fake GPS / Teleportasi, sesi terkunci permanen!
let isSessionPermanentlyMocked = false;
let sessionMockReasons = [];
let sessionMaxDistanceSeen = 0;

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Reset riwayat sampel GPS (hanya jika halaman di-refresh bersih tanpa mock)
 */
export function resetGpsHistory() {
  samples = [];
}

/**
 * Reset penuh sesi (hanya dipanggil saat unmount atau refresh manual)
 */
export function resetGpsSession() {
  samples = [];
  isSessionPermanentlyMocked = false;
  sessionMockReasons = [];
  sessionMaxDistanceSeen = 0;
}

/**
 * Mencatat sampel GPS terbaru dan menganalisis indikasi pemalsuan lokasi
 * @param {GeolocationPosition} pos
 * @param {number} [schoolLat] Titik pusat madrasah
 * @param {number} [schoolLon]
 * @returns {{
 *   isMock: boolean,
 *   isVerified: boolean,
 *   mockScore: number,
 *   reasons: string[],
 *   sampleCount: number,
 *   coordVariance: number | undefined,
 *   maxDistanceSeen: number,
 *   telemetry: object
 * }}
 */
export function analyzeGpsPosition(pos, schoolLat = -3.3747649, schoolLon = 114.646542) {
  if (!pos || !pos.coords) {
    isSessionPermanentlyMocked = true;
    sessionMockReasons.push("Data koordinat GPS tidak valid.");
    return {
      isMock: true,
      isVerified: false,
      mockScore: 100,
      reasons: ["Data koordinat GPS tidak valid."],
      sampleCount: 0,
      coordVariance: undefined,
      maxDistanceSeen: sessionMaxDistanceSeen,
      telemetry: {},
    };
  }

  const {
    latitude,
    longitude,
    accuracy,
    altitude,
    altitudeAccuracy,
    speed,
    heading,
  } = pos.coords;

  const currentSample = {
    lat: latitude,
    lon: longitude,
    acc: accuracy,
    alt: altitude,
    altAcc: altitudeAccuracy,
    speed,
    heading,
    time: Date.now(),
  };

  // Hitung jarak ke madrasah
  const distToSchool = haversineMeters(latitude, longitude, schoolLat, schoolLon);
  if (distToSchool > sessionMaxDistanceSeen) {
    sessionMaxDistanceSeen = distToSchool;
  }

  // Uji Teleportasi / Lonjakan Kecepatan Mustahil antar sampel
  if (samples.length >= 1) {
    const prev = samples[samples.length - 1];
    const jumpDistance = haversineMeters(prev.lat, prev.lon, latitude, longitude);
    const deltaTimeSec = Math.max(0.2, (currentSample.time - prev.time) / 1000);
    const speedMps = jumpDistance / deltaTimeSec;

    // Kecepatan > 40 m/s (144 km/jam) atau lonjakan > 100m dalam beberapa detik
    if (jumpDistance > 100 && speedMps > 40) {
      isSessionPermanentlyMocked = true;
      const jumpMsg = `Lonjakan lokasi mustahil / Teleportasi GPS (${Math.round(jumpDistance)}m dalam ${deltaTimeSec.toFixed(1)}s, kecepatan ${Math.round(speedMps * 3.6)} km/jam). Khas konflik Fake GPS dengan lokasi riil.`;
      if (!sessionMockReasons.includes(jumpMsg)) {
        sessionMockReasons.push(jumpMsg);
      }
    }
  }

  samples.push(currentSample);
  if (samples.length > MAX_SAMPLES) {
    samples.shift();
  }

  const reasons = [...sessionMockReasons];
  let mockScore = isSessionPermanentlyMocked ? 100 : 0;

  // 1. Akurasi 0 meter atau negatif (100% Mock / Emulator)
  if (accuracy <= 0 || !Number.isFinite(accuracy)) {
    reasons.push("Akurasi lokasi tidak valid (0 meter). Khas mock location provider.");
    mockScore += 100;
  }

  // 2. Akurasi Bulat Artifisial Khas Preset Fake GPS (5m, 10m, 15m, 20m exact integer)
  if (
    accuracy > 0 &&
    Number.isInteger(accuracy) &&
    accuracy <= 50 &&
    (altitude === null || altitude === 0 || altitudeAccuracy === null)
  ) {
    reasons.push(`Akurasi lokasi berupa bilangan bulat konstan (${accuracy}m) khas preset Fake GPS.`);
    mockScore += 80;
  }

  // 3. Titik Koordinat Manual / 6 Desimal (Khas Pin Google Maps / ByteRev Fake GPS)
  const sLat = Math.abs(latitude).toString();
  const sLon = Math.abs(longitude).toString();
  const decLat = sLat.includes(".") ? sLat.split(".")[1].length : 0;
  const decLon = sLon.includes(".") ? sLon.split(".")[1].length : 0;
  if (decLat <= 6 && decLon <= 6 && (altitude === null || altitude === 0 || altitudeAccuracy === null)) {
    reasons.push(`Presisi koordinat terbatas (${decLat} desimal) khas titik manual Fake GPS.`);
    mockScore += 75;
  }

  // 4. Elevasi 3D Hilang pada Sinyal Satelit Berakurasi Tinggi (<25m)
  if (accuracy > 0 && accuracy < 25 && altitude === null && altitudeAccuracy === null) {
    reasons.push("Sinyal mengaku satelit presisi tinggi (<25m) namun tidak memiliki elevasi 3D (altitude null).");
    mockScore += 50;
  }

  // 5. Uji Derau Fluktuasi Satelit Alami (Micro-Drift / Jitter Test)
  let coordVariance = undefined;
  if (samples.length >= 2) {
    const first = samples[0];
    const isIdentical = samples.every(
      (s) => Math.abs(s.lat - first.lat) < 1e-9 && Math.abs(s.lon - first.lon) < 1e-9
    );

    if (isIdentical) {
      reasons.push("Koordinat beku statis tanpa fluktuasi satelit alami (Zero Jitter).");
      mockScore += 100;
    }

    if (samples.length >= 3) {
      const n = samples.length;
      let sumLat = 0,
        sumLon = 0;

      samples.forEach((s) => {
        sumLat += s.lat;
        sumLon += s.lon;
      });

      const avgLat = sumLat / n;
      const avgLon = sumLon / n;

      let varLat = 0,
        varLon = 0;

      samples.forEach((s) => {
        varLat += Math.pow(s.lat - avgLat, 2);
        varLon += Math.pow(s.lon - avgLon, 2);
      });

      varLat /= n;
      varLon /= n;

      coordVariance = varLat + varLon;

      if (coordVariance < 1e-18) {
        reasons.push(`Variansi koordinat terlalu rendah (${coordVariance.toExponential(2)} < 1e-18).`);
        mockScore += 100;
      }
    }
  }

  // 6. Cek Integritas Native API (Anti Ekstensi Browser & DevTools Spoofer)
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const nativeStr = Function.prototype.toString.call(
        navigator.geolocation.getCurrentPosition
      );
      if (!nativeStr.includes("[native code]")) {
        reasons.push("API Geolocation browser dimodifikasi oleh script pihak ketiga / ekstensi.");
        mockScore += 95;
      }
    } catch {
      reasons.push("Integritas Geolocation API gagal diverifikasi.");
      mockScore += 50;
    }
  }

  // 7. Cek Lingkungan Otomasi / WebDriver
  if (typeof navigator !== "undefined" && navigator.webdriver) {
    reasons.push("Browser berjalan di bawah kontrol otomasi / emulator.");
    mockScore += 90;
  }

  if (mockScore >= 70) {
    isSessionPermanentlyMocked = true;
    reasons.forEach((r) => {
      if (!sessionMockReasons.includes(r)) {
        sessionMockReasons.push(r);
      }
    });
  }

  const isVerified = samples.length >= 3;
  const isMock = isSessionPermanentlyMocked || mockScore >= 70;

  return {
    isMock,
    isVerified,
    mockScore,
    reasons: isMock ? (reasons.length ? reasons : sessionMockReasons) : [],
    sampleCount: samples.length,
    coordVariance,
    maxDistanceSeen: sessionMaxDistanceSeen,
    telemetry: {
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      coordVariance,
      maxDistanceSeen: sessionMaxDistanceSeen,
      samplesRecorded: samples.length,
    },
  };
}
