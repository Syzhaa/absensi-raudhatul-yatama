/**
 * Audio Feedback & Sound Synthesizer untuk Sistem Presensi Digital Yatama
 * Menggunakan Web Audio API untuk nada polifonik jernih dan SpeechSynthesis untuk notifikasi suara Indonesia.
 */

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
    }
  }
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

/**
 * Text-to-Speech Bahasa Indonesia
 */
export function speakVoice(text) {
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 1.08;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().includes("id") ||
          v.lang.toLowerCase().includes("indonesia")
      );
      if (idVoice) {
        utterance.voice = idVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  } catch (err) {
    console.warn("SpeechSynthesis error:", err);
  }
}

/**
 * 1. Suara Hadir Masuk Tepat Waktu (Ascending Bright Major Chime)
 */
export function playSuccessCheckin(personName = "") {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;

      // Note 1: E5 (659Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.7, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Note 2: G#5 (830Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(830.61, now + 0.08);
      gain2.gain.setValueAtTime(0, now + 0.08);
      gain2.gain.linearRampToValueAtTime(0.8, now + 0.095);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.22);

      // Note 3: B5 (987Hz - Ding puncak)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.type = "triangle";
      osc3.frequency.setValueAtTime(987.77, now + 0.16);
      gain3.gain.setValueAtTime(0, now + 0.16);
      gain3.gain.linearRampToValueAtTime(0.9, now + 0.175);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc3.start(now + 0.16);
      osc3.stop(now + 0.38);
    }
  } catch (err) {
    console.warn("Audio checkin error:", err);
  }

  const voiceMsg = personName
    ? `${personName}, absen masuk berhasil`
    : "Absen masuk berhasil";
  speakVoice(voiceMsg);
}

/**
 * 2. Suara Hadir Terlambat (Warning Note + Informative Voice)
 */
export function playLateCheckin(personName = "") {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;

      // Nada 1: 587Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.8, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Nada 2: 440Hz (A4 - Turun)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(440, now + 0.14);
      gain2.gain.setValueAtTime(0, now + 0.14);
      gain2.gain.linearRampToValueAtTime(0.8, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.32);
    }
  } catch (err) {
    console.warn("Audio late error:", err);
  }

  const voiceMsg = personName
    ? `${personName}, absen masuk tercatat terlambat`
    : "Absen masuk tercatat terlambat";
  speakVoice(voiceMsg);
}

/**
 * 3. Suara Absen Pulang (Double Harmonious Bell + Voice)
 */
export function playSuccessCheckout(personName = "") {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;

      // Nada 1: 1046Hz (C6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(1046.5, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.85, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc1.start(now);
      osc1.stop(now + 0.14);

      // Nada 2: 1568Hz (G6 - ceria)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(1567.98, now + 0.12);
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.9, now + 0.135);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.35);
    }
  } catch (err) {
    console.warn("Audio checkout error:", err);
  }

  const voiceMsg = personName
    ? `${personName}, absen pulang berhasil, terima kasih`
    : "Absen pulang berhasil, terima kasih";
  speakVoice(voiceMsg);
}

/**
 * 4. Suara Pengajuan Izin / Sakit / Catatan Mandiri
 */
export function playLeaveSubmitted(status = "izin") {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.8, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (err) {
    console.warn("Audio leave error:", err);
  }

  if (status === "sakit") {
    speakVoice("Keterangan sakit berhasil dicatat, lekas sembuh");
  } else if (status === "alpha") {
    speakVoice("Status alpha berhasil dicatat");
  } else {
    speakVoice("Keterangan izin berhasil dicatat");
  }
}

/**
 * 5. Suara Gagal Scan dengan Diagnostik Spesifik Sesuai Masalah
 */
export function playSpecificErrorSound(rawMessage = "") {
  // Beep Gagal (Sawtooth Low Buzz)
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;

      // Beep 1: 260Hz -> 180Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(260, now);
      osc1.frequency.linearRampToValueAtTime(180, now + 0.14);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.8, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc1.start(now);
      osc1.stop(now + 0.14);

      // Beep 2: 200Hz -> 130Hz
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(200, now + 0.16);
      osc2.frequency.linearRampToValueAtTime(130, now + 0.32);
      gain2.gain.setValueAtTime(0, now + 0.16);
      gain2.gain.linearRampToValueAtTime(0.8, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.32);
    }
  } catch (err) {
    console.warn("Audio error buzz:", err);
  }

  // Notifikasi Suara Diagnostik
  const m = String(rawMessage).toLowerCase();

  if (
    m.includes("antara") ||
    m.includes("jam operasional") ||
    m.includes("hanya dapat dilakukan antara") ||
    m.includes("belum dibuka") ||
    m.includes("sudah ditutup") ||
    m.includes("waktu")
  ) {
    speakVoice("Waktu presensi belum dibuka atau sudah berakhir");
  } else if (
    m.includes("sudah melakukan check-in") ||
    m.includes("sudah absen") ||
    m.includes("sudah masuk") ||
    m.includes("duplikat") ||
    m.includes("2x")
  ) {
    speakVoice("Sudah absen masuk. Ganti ke mode pulang jika hendak pulang");
  } else if (
    m.includes("sudah melakukan check-out") ||
    m.includes("sudah pulang") ||
    m.includes("selesai")
  ) {
    speakVoice("Sudah selesai presensi pulang hari ini");
  } else if (
    m.includes("lokasi") ||
    m.includes("radius") ||
    m.includes("jangkauan") ||
    m.includes("meter") ||
    m.includes("gps")
  ) {
    speakVoice("Lokasi Anda di luar jangkauan madrasah");
  } else if (
    m.includes("tidak valid") ||
    m.includes("tidak ditemukan") ||
    m.includes("signature") ||
    m.includes("kadaluarsa") ||
    m.includes("bukan qr")
  ) {
    speakVoice("Kode QR tidak terdaftar");
  } else if (m.includes("libur") || m.includes("holiday")) {
    speakVoice("Hari ini libur madrasah");
  } else {
    speakVoice(rawMessage ? String(rawMessage).replace(/SQLSTATE.*$/i, "").slice(0, 60) : "Absen gagal, silakan coba lagi");
  }
}

// Backward Compatibility aliases
export const playSuccessSound = playSuccessCheckin;
export const playErrorSound = playSpecificErrorSound;
export const playCheckoutSound = playSuccessCheckout;
