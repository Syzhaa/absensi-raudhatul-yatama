/**
 * AntiFakeGps - Engine Deteksi & Pencegahan Fake GPS / Mock Location
 * Yayasan Raudhatul Yatama
 *
 * Menganalisis karakteristik fisik sinyal GNSS satelit:
 * 1. Satellite Jitter / Micro-Drift (Satelit asli selalu memiliki deviasi mikro koordinat)
 * 2. 3D Elevation / Altitude Trilateration (Satelit akurasi tinggi mengunci ketinggian 3D)
 * 3. Artificial Accuracy Presets (Akurasi bulat konstan 0, 1, 5 khas Fake GPS)
 * 4. Browser API Hooking & Emulation (Anti-ekstensi & DevTools spoofer)
 */

let samples = [];
const MAX_SAMPLES = 6;

/**
 * Reset riwayat sampel GPS (misal saat switch tab / refresh manual)
 */
export function resetGpsHistory() {
  samples = [];
}

/**
 * Mencatat sampel GPS terbaru dan menganalisis indikasi pemalsuan lokasi
 * @param {GeolocationPosition} pos
 * @returns {{
 *   isMock: boolean,
 *   mockScore: number,
 *   reasons: string[],
 *   sampleCount: number,
 *   telemetry: object
 * }}
 */
export function analyzeGpsPosition(pos) {
  if (!pos || !pos.coords) {
    return {
      isMock: true,
      mockScore: 100,
      reasons: ["Data koordinat GPS tidak valid."],
      sampleCount: 0,
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
  const timestamp = pos.timestamp || Date.now();

  const currentSample = {
    lat: latitude,
    lon: longitude,
    acc: accuracy,
    alt: altitude,
    altAcc: altitudeAccuracy,
    speed,
    heading,
    time: timestamp,
  };

  // Tambahkan sampel jika bukan duplikat timestamp yang sama persis
  const isDuplicate = samples.some(
    (s) => s.time === timestamp && s.lat === latitude && s.lon === longitude
  );
  if (!isDuplicate) {
    samples.push(currentSample);
    if (samples.length > MAX_SAMPLES) {
      samples.shift();
    }
  }

  const reasons = [];
  let mockScore = 0; // Skala 0 - 100

  // 1. Akurasi 0 meter atau negatif (100% Mock / Emulator)
  if (accuracy <= 0 || !Number.isFinite(accuracy)) {
    reasons.push("Akurasi lokasi tidak valid (0 meter). Khas mock location provider.");
    mockScore += 95;
  }

  // 2. Akurasi Bulat Artifisial Khas Preset Fake GPS (1.0m, 5.0m, 10.0m exact integer)
  // Satelit GNSS asli menghasilkan angka desimal pecahan berbasis HDOP (misal 14.82m)
  if (
    accuracy > 0 &&
    Number.isInteger(accuracy) &&
    [1, 5, 10].includes(accuracy) &&
    altitude === null
  ) {
    reasons.push("Akurasi lokasi berupa bilangan bulat konstan (preset Fake GPS) tanpa elevasi satelit.");
    mockScore += 45;
  }

  // 3. Elevasi 3D Hilang pada Sinyal Satelit Berakurasi Tinggi (<25m)
  // Pada GNSS satelit riil, penguncian horizontal < 25m mewajibkan 4+ satelit yang otomatis mengunci altitude.
  // Aplikasi Fake GPS di Android hampir selalu mengabaikan altitude (bernilai null).
  if (accuracy > 0 && accuracy < 25 && altitude === null && altitudeAccuracy === null) {
    reasons.push("Sinyal mengaku satelit presisi tinggi (<25m) namun tidak memiliki elevasi 3D (altitude null).");
    mockScore += 40;
  }

  // 4. Uji Derau Fluktuasi Satelit Alami (Micro-Drift / Jitter Test)
  // Satelit GPS di orbit bergerak dengan kecepatan ~3.9 km/s. Bahkan jika HP ditaruh diam di meja,
  // ionosfer & derau frekuensi radio selalu menghasilkan variasi mikro pada desimal ke-6 hingga ke-8.
  // Fake GPS menyuntikkan koordinat yang 100% matematis beku.
  let coordVariance = null;
  if (samples.length >= 3) {
    const timeSpan = samples[samples.length - 1].time - samples[0].time;
    if (timeSpan >= 800) {
      const n = samples.length;
      let sumLat = 0,
        sumLon = 0,
        sumAcc = 0;

      samples.forEach((s) => {
        sumLat += s.lat;
        sumLon += s.lon;
        sumAcc += s.acc;
      });

      const avgLat = sumLat / n;
      const avgLon = sumLon / n;
      const avgAcc = sumAcc / n;

      let varLat = 0,
        varLon = 0,
        varAcc = 0;

      samples.forEach((s) => {
        varLat += Math.pow(s.lat - avgLat, 2);
        varLon += Math.pow(s.lon - avgLon, 2);
        varAcc += Math.pow(s.acc - avgAcc, 2);
      });

      varLat /= n;
      varLon /= n;
      varAcc /= n;

      coordVariance = varLat + varLon;

      // Jika dalam 3+ sampel berjarak waktu, koordinat sama persis hingga bit terakhir (variance == 0)
      if (coordVariance === 0 && varAcc === 0) {
        reasons.push("Koordinat dan akurasi GPS beku 100% tanpa fluktuasi satelit alami (Zero Jitter).");
        mockScore += 75;
      }
    }
  }

  // 5. Cek Integritas Native API (Anti Ekstensi Browser & DevTools Spoofer)
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

  // 6. Cek Lingkungan Otomasi / WebDriver
  if (navigator.webdriver) {
    reasons.push("Browser berjalan di bawah kontrol otomasi / emulator.");
    mockScore += 90;
  }

  const isMock = mockScore >= 70;

  return {
    isMock,
    mockScore,
    reasons,
    sampleCount: samples.length,
    telemetry: {
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      coordVariance: coordVariance !== null ? coordVariance : undefined,
      samplesRecorded: samples.length,
    },
  };
}
