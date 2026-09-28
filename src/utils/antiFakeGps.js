/**
 * AntiFakeGps - Engine Deteksi & Pencegahan Fake GPS / Mock Location
 * Yayasan Raudhatul Yatama
 *
 * Mencegah false-positive pada perangkat fisik sah:
 * 1. Tidak memblokir elevasi null (altitude null wajar pada mobile browser)
 * 2. Tidak memblokir akurasi integer (Android sering memberikan akurasi bulat)
 * 3. Tidak memblokir koordinat identik antar-sampel cepat (kamera/browser caching wajar saat berdiri diam)
 * 4. Tidak memblokir lonjakan transisi network -> satellite saat pertama lock
 * 5. Hanya memblokir indikator asli:
 *    - Akurasi <= 0 atau tidak berhingga (mock provider ekstrem/emulator)
 *    - navigator.webdriver (otomasi headless/bot)
 *    - Geolocation API dimanipulasi (tampered native code)
 */

let samples = [];
const MAX_SAMPLES = 5;

/**
 * Reset riwayat sampel GPS
 */
export function resetGpsHistory() {
  samples = [];
}

/**
 * Reset penuh sesi (dipanggil saat klik Cek GPS / Coba Lagi)
 */
export function resetGpsSession() {
  samples = [];
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
    return {
      isMock: false,
      isVerified: false,
      mockScore: 0,
      reasons: ["Data koordinat GPS tidak terbaca."],
      sampleCount: 0,
      coordVariance: undefined,
      maxDistanceSeen: 0,
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
    time: Date.now(),
  };

  samples.push(currentSample);
  if (samples.length > MAX_SAMPLES) {
    samples.shift();
  }

  const reasons = [];
  let mockScore = 0;

  // 1. Akurasi 0 meter atau negatif atau NaN (Mock / Emulator tidak valid)
  if (accuracy <= 0 || !Number.isFinite(accuracy)) {
    reasons.push("Akurasi lokasi tidak valid (<= 0m). Khas emulator atau mock provider.");
    mockScore += 100;
  }

  // 2. Cek Lingkungan Otomasi / WebDriver
  if (typeof navigator !== "undefined" && navigator.webdriver) {
    reasons.push("Browser berjalan di bawah kontrol otomasi / bot emulator.");
    mockScore += 100;
  }

  // 3. Cek Integritas Native API (Anti Ekstensi DevTools Mock)
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const nativeStr = Function.prototype.toString.call(
        navigator.geolocation.getCurrentPosition
      );
      if (!nativeStr.includes("[native code]")) {
        reasons.push("API Geolocation browser dimodifikasi oleh script pihak ketiga.");
        mockScore += 100;
      }
    } catch {
      // Ignore if strict browser prevents toString
    }
  }

  const isMock = mockScore >= 100;
  const isVerified = !isMock && Number.isFinite(latitude) && Number.isFinite(longitude) && accuracy > 0;

  return {
    isMock,
    isVerified,
    mockScore,
    reasons,
    sampleCount: samples.length,
    coordVariance: undefined,
    maxDistanceSeen: 0,
    telemetry: {
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      speed,
      heading,
    },
  };
}
