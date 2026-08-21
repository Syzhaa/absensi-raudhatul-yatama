/**
 * Audio feedback untuk scan QR absensi
 * Generate beep sounds menggunakan Web Audio API
 */

let audioContext = null;

// Initialize AudioContext (lazy loading)
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play success beep (tone tinggi)
 */
export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Tone tinggi: 800Hz, 150ms
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    // Envelope (fade in/out smooth)
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  } catch (err) {
    console.warn('Audio not supported:', err);
  }
}

/**
 * Play error beep (tone rendah, lebih panjang)
 */
export function playErrorSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Tone rendah: 300Hz, 250ms
    oscillator.frequency.value = 300;
    oscillator.type = 'square';
    
    // Envelope
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.03);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);
  } catch (err) {
    console.warn('Audio not supported:', err);
  }
}

/**
 * Play double beep untuk check-out (pulang)
 */
export function playCheckoutSound() {
  try {
    const ctx = getAudioContext();
    
    // Beep 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 600;
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain1.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.1);
    
    // Beep 2 (delay 120ms)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 800;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.12);
    gain2.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.14);
    gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.25);
  } catch (err) {
    console.warn('Audio not supported:', err);
  }
}
