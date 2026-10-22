/**
 * ============================================================================
 * soundEffects.js - জিরো-ডিপেনডেন্সি পিওএস অডিও ইঞ্জিন (Web Audio API)
 * ============================================================================
 * কোনো অডিও ফাইল ডাউনলোড ছাড়া সরাসরি ব্রাউজারের অডিও সিন্থেসাইজার ব্যবহার করে
 * নিখুঁত বারকোড স্ক্যান বীপ, ক্যাশ রেজিস্টার চাইম ও অ্যালার্ট সাউন্ড বাজায়।
 * ১০০% অফলাইন উপযোগী এবং সুপারফাস্ট।
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled() {
  try {
    const val = localStorage.getItem('pos_sound_effects');
    return val !== 'false'; // ডিফল্ট অন
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem('pos_sound_effects', enabled ? 'true' : 'false');
  } catch {}
}

/**
 * কাস্টম ফ্রিকোয়েন্সিতে টোন বাজানো
 */
function playTone(freq, duration = 0.08, type = 'sine', volume = 0.15) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // অডিও পলিসি ব্লক করলে নিরব থাকবে
  }
}

/**
 * ১. বারকোড স্ক্যান বীপ (Classic Retail Barcode Scanner Beep)
 */
export function playBarcodeBeep() {
  playTone(1350, 0.07, 'sine', 0.2);
}

/**
 * ২. ক্যাশ ড্রয়ার ও পেমেন্ট সম্পন্ন চাইম (Cash Register Success Chime)
 */
export function playCashChime() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // ১ম নোট (A5 - 880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // ২য় নোট (E6 - 1318.5Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.1);
    gain2.gain.setValueAtTime(0.2, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.35);
  } catch (e) {}
}

/**
 * ৩. অর্ডার হোল্ড ও পার্কিং সাউন্ড (Order Hold Chime)
 */
export function playHoldSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    playTone(523.25, 0.1, 'sine', 0.15); // C5
    setTimeout(() => {
      playTone(659.25, 0.12, 'sine', 0.15); // E5
    }, 90);
  } catch (e) {}
}

/**
 * ৪. ওয়ার্নিং ও ফ্লোর প্রাইস সীমা লঙ্ঘন বীপ (Warning Alert)
 */
export function playWarningBeep() {
  playTone(440, 0.14, 'triangle', 0.22);
}

/**
 * ৫. এরর সাউন্ড (Error Double Buzz)
 */
export function playErrorBeep() {
  playTone(220, 0.1, 'sawtooth', 0.15);
  setTimeout(() => {
    playTone(196, 0.12, 'sawtooth', 0.15);
  }, 110);
}

