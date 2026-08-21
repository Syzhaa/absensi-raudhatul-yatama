/**
 * Audio feedback untuk scan QR absensi
 * Menghasilkan suara beep nyaring dan jernih menggunakan Web Audio API
 */

let audioContext = null;

// Initialize AudioContext (lazy loading with auto-resume)
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
 * Play success beep (Suara scan berhasil - nyaring, punchy, mirip scanner POS kasir modern)
 */
export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Frekuensi tinggi & jernih: 1400Hz naik cepat ke 1760Hz (A6)
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.04);

    // Volume nyaring (gain 0.85) dengan decay cepat & tegas
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.85, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.start(now);
    osc.stop(now + 0.18);
  } catch (err) {
    console.warn("Audio error:", err);
  }
}

/**
 * Play error beep (Suara scan gagal - nada buzzer tegas & terdengar jelas)
 */
export function playErrorSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Beep Error 1 (rendah)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(260, now);
    osc1.frequency.linearRampToValueAtTime(200, now + 0.12);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.8, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc1.start(now);
    osc1.stop(now + 0.12);

    // Beep Error 2 (lebih rendah)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(220, now + 0.14);
    osc2.frequency.linearRampToValueAtTime(160, now + 0.28);

    gain2.gain.setValueAtTime(0, now + 0.14);
    gain2.gain.linearRampToValueAtTime(0.8, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc2.start(now + 0.14);
    osc2.stop(now + 0.28);
  } catch (err) {
    console.warn("Audio error:", err);
  }
}

/**
 * Play double chime untuk check-out / pulang (Dua nada tinggi harmonis & nyaring)
 */
export function playCheckoutSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Nada 1: 1046Hz (C6)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(1046, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.85, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc1.start(now);
    osc1.stop(now + 0.12);

    // Nada 2: 1568Hz (G6 - lebih tinggi & ceria)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1568, now + 0.1);

    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.85, now + 0.115);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc2.start(now + 0.1);
    osc2.stop(now + 0.26);
  } catch (err) {
    console.warn("Audio error:", err);
  }
}
