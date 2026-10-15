/**
 * ============================================================================
 * secureStorage.js - ক্লায়েন্ট-সাইড লোকাল স্টোরেজ এনক্রিপশন ও সিকিউরিটি শিল্ড
 * ============================================================================
 * ব্রাউজারের F12 DevTools -> Application -> Local Storage থেকে সেনসিটিভ ডাটা
 * (পণ্য ক্রয়মূল্য CostPrice, স্টাফ পিন নম্বর PIN, কাস্টমার ফোন, সেলস হিস্ট্রি)
 * চুরি হওয়া রোধ করে। লোকাল স্টোরেজে সমস্ত ডাটা এনক্রিপ্ট হয়ে অবোধ্য সাইফারটেক্সট
 * হিসেবে সংরক্ষিত থাকে।
 */

const ENCRYPTION_PREFIX = '__enc_v1__:';
const APP_SALT_KEY = 'PABNA-BOSTRALOY-ENTERPRISE-SECURE-KEY-v1.0';

const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

const _btoa = typeof btoa !== 'undefined' ? btoa : (s) => (typeof Buffer !== 'undefined' ? Buffer.from(s, 'binary').toString('base64') : '');
const _atob = typeof atob !== 'undefined' ? atob : (s) => (typeof Buffer !== 'undefined' ? Buffer.from(s, 'base64').toString('binary') : '');

function uint8ToBase64(bytes) {
  const CHUNK_SIZE = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return _btoa(binary);
}

function base64ToUint8(base64) {
  const binary = _atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * যেকোনো অবজেক্ট বা টেক্সটকে এনক্রিপ্ট করে অবোধ্য সাইফারটেক্সটে রূপান্তর করে
 * @param {*} data - অবজেক্ট, অ্যারে বা স্ট্রিং
 * @param {string} secretKey - এনক্রিপশন পাসফ্রেজ
 * @returns {string} এনক্রিপ্টেড সাইফারটেক্সট
 */
export function encryptPayload(data, secretKey = APP_SALT_KEY) {
  if (data === undefined || data === null) return '';
  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    if (!encoder) return jsonStr;

    const textBytes = encoder.encode(jsonStr);
    const keyBytes = encoder.encode(secretKey);
    const keyLen = keyBytes.length;

    const encrypted = new Uint8Array(textBytes.length);
    for (let i = 0; i < textBytes.length; i++) {
      const k = keyBytes[i % keyLen];
      const salt = (i * 31 + 17) & 0xFF;
      encrypted[i] = textBytes[i] ^ k ^ salt;
    }

    return ENCRYPTION_PREFIX + uint8ToBase64(encrypted);
  } catch (e) {
    console.error('Encryption error:', e);
    return typeof data === 'string' ? data : JSON.stringify(data);
  }
}

/**
 * এনক্রিপ্টেড সাইফারটেক্সটকে ডিক্রিপ্ট করে আসল অবজেক্টে রূপান্তর করে
 * ব্যাকওয়ার্ড কম্প্যাটিবিলিটি: পূর্বে সংরক্ষিত প্লেইনটেক্সট ডাটাও স্বয়ংক্রিয়ভাবে রিড করে
 * @param {string} ciphertext - স্টোরেজে থাকা সাইফারটেক্সট বা প্লেইনটেক্সট
 * @param {string} secretKey - এনক্রিপশন পাসফ্রেজ
 * @returns {*} মূল অবজেক্ট, অ্যারে বা null
 */
export function decryptPayload(ciphertext, secretKey = APP_SALT_KEY) {
  if (!ciphertext || typeof ciphertext !== 'string') return null;

  // ব্যাকওয়ার্ড কম্প্যাটিবিলিটি: যদি আগে থেকেই প্লেইনটেক্সট JSON থাকে
  if (!ciphertext.startsWith(ENCRYPTION_PREFIX)) {
    try {
      return JSON.parse(ciphertext);
    } catch {
      return ciphertext;
    }
  }

  try {
    const rawB64 = ciphertext.slice(ENCRYPTION_PREFIX.length);
    const encrypted = base64ToUint8(rawB64);
    if (!decoder || !encoder) return null;

    const keyBytes = encoder.encode(secretKey);
    const keyLen = keyBytes.length;

    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      const k = keyBytes[i % keyLen];
      const salt = (i * 31 + 17) & 0xFF;
      decrypted[i] = encrypted[i] ^ k ^ salt;
    }

    const jsonStr = decoder.decode(decrypted);
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Decryption error:', err);
    return null;
  }
}

/**
 * নিরাপদ লোকাল স্টোরেজ গেটার
 * @param {string} key - স্টোরেজ কি (Key)
 * @returns {*} ডিক্রিপ্টেড ডাটা অবজেক্ট
 */
export function getSecureStorageItem(key) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = decryptPayload(raw);

    // অটো-মাইগ্রেশন: পূর্বে সংরক্ষিত প্লেইনটেক্সট ডাটা পেলে সাথে সাথে এনক্রিপ্ট করে সিকিউর করা
    if (raw && !raw.startsWith(ENCRYPTION_PREFIX) && data !== null) {
      try {
        const cipher = encryptPayload(data);
        localStorage.setItem(key, cipher);
      } catch (migrateErr) {
        // স্টোরেজ কোটা বা অন্য কোনো ত্রুটি হলেও ডাটা পড়া ব্যাহত হবে না
      }
    }

    return data;
  } catch (e) {
    console.error(`Error reading secure key [${key}]:`, e);
    return null;
  }
}

/**
 * নিরাপদ লোকাল স্টোরেজ সেটার (এনক্রিপ্ট করে অবোধ্য আকারে সংরক্ষণ করে)
 * @param {string} key - স্টোরেজ কি (Key)
 * @param {*} value - সংরক্ষণযোগ্য ডাটা অবজেক্ট বা অ্যারে
 */
export function setSecureStorageItem(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    const cipher = encryptPayload(value);
    localStorage.setItem(key, cipher);
  } catch (e) {
    console.error(`Error writing secure key [${key}]:`, e);
  }
}

/**
 * নিরাপদ লোকাল স্টোরেজ রিমুভার
 * @param {string} key - স্টোরেজ কি (Key)
 */
export function removeSecureStorageItem(key) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  } catch (e) {}
}
