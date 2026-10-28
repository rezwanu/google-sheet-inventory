/**
 * গজ ও গিরা সম্পর্কিত হিসাব ও ফরম্যাটিং ইউটিলিটি (Fabric & Yard Measurement System)
 * ১ গজ = ১৬ গিরা = ৩৬ ইঞ্চি
 * ১ গিরা = ১/১৬ গজ = ০.০৬২৫ গজ = ২.২৫ ইঞ্চি
 */

/**
 * ইউনিটটি গজ কাপড় বা থান পরিমাপক কি না তা যাচাই করে
 * @param {string} unit 
 * @returns {boolean}
 */
export function isFabricUnit(unit) {
  if (!unit) return false;
  return /^(গজ|goj|yard|yards|থান|than|bolt)$/i.test(String(unit).trim());
}

/**
 * ইউনিটটি নির্দিষ্টভাবে 'থান' বা রোল কি না
 * @param {string} unit 
 * @returns {boolean}
 */
export function isThanUnit(unit) {
  if (!unit) return false;
  return /^(থান|than|bolt|রোল|roll)$/i.test(String(unit).trim());
}

/**
 * দশমিক গজ থেকে গজ এবং গিরা আলাদা করে
 * @param {number|string} quantity 
 * @returns {{ goj: number, gira: number, decimal: number }}
 */
export function parseGojGira(quantity) {
  const q = Math.max(0, Number(quantity) || 0);
  let goj = Math.floor(q + 0.0001);
  let gira = Math.round((q - goj) * 16);

  if (gira >= 16) {
    goj += Math.floor(gira / 16);
    gira = gira % 16;
  }

  return {
    goj,
    gira,
    decimal: Math.round(q * 10000) / 10000
  };
}

/**
 * পৃথক গজ এবং গিরা থেকে মোট দশমিক গজ হিসাব করে
 * @param {number|string} goj 
 * @param {number|string} gira 
 * @returns {number}
 */
export function calculateTotalYards(goj, gira) {
  const g = Math.max(0, parseInt(goj, 10) || 0);
  let gi = Math.max(0, parseInt(gira, 10) || 0);

  let extraGoj = 0;
  if (gi >= 16) {
    extraGoj = Math.floor(gi / 16);
    gi = gi % 16;
  }

  const total = (g + extraGoj) + (gi / 16);
  return Math.round(total * 10000) / 10000;
}

/**
 * আস্ত থান ও কাটা থানের গজ-গিরা থেকে মোট গজ হিসাব করে
 * @param {number|string} fullThans 
 * @param {number|string} cutGoj 
 * @param {number|string} cutGira 
 * @param {number|string} yardsPerThan 
 * @returns {number}
 */
export function calculateInitialShopYards(fullThans, cutGoj, cutGira, yardsPerThan = 25) {
  const thans = Math.max(0, parseInt(fullThans, 10) || 0);
  const ypt = Math.max(1, parseFloat(yardsPerThan) || 25);
  const cutYards = calculateTotalYards(cutGoj, cutGira);
  return Math.round(((thans * ypt) + cutYards) * 10000) / 10000;
}

/**
 * মোট দশমিক গজ থেকে আস্ত থান, রানিং কাটা থান ও শেষ ছাঁটের হিসাব বিশদ বিশ্লেষণ করে
 * @param {number|string} totalYards 
 * @param {number|string} yardsPerThan 
 * @param {number|string} remnantThreshold 
 * @returns {{
 *   totalYards: number,
 *   yardsPerThan: number,
 *   fullThans: number,
 *   runningCutYards: number,
 *   runningCutGojGira: { goj: number, gira: number, decimal: number },
 *   isRemnant: boolean,
 *   remnantThreshold: number,
 *   needsRestock: boolean,
 *   displayText: string
 * }}
 */
export function calculateThanBreakdown(totalYards, yardsPerThan = 25, remnantThreshold = 2) {
  const total = Math.max(0, parseFloat(totalYards) || 0);
  const ypt = Math.max(1, parseFloat(yardsPerThan) || 25);
  const threshold = Math.max(0, parseFloat(remnantThreshold) || 2);

  const fullThans = Math.floor(total / ypt);
  const runningCutYards = Math.round((total % ypt) * 10000) / 10000;
  const cutText = formatFabricQuantity(runningCutYards, 'গজ', false);
  const rawGojGira = parseGojGira(runningCutYards);
  const runningCutGojGira = {
    ...rawGojGira,
    text: cutText,
    toString() {
      return cutText;
    }
  };

  // চলমান কাটা থান যদি ছাঁট সীমার নিচে বা সমান হয়
  const isRemnant = runningCutYards > 0 && runningCutYards <= threshold;

  // দোকানে যদি কোনো আস্ত থান না থাকে এবং রানিং থান ছাঁট সীমায় নেমে যায় বা শেষ হয়ে যায়
  const needsRestock = fullThans === 0 && (runningCutYards === 0 || isRemnant);

  // পাঠযোগ্য বিবরণ তৈরি
  const parts = [];
  if (fullThans > 0) {
    parts.push(`${fullThans}টি আস্ত থান`);
  }
  if (runningCutYards > 0) {
    if (isRemnant) {
      parts.push(`১টি শেষ ছাঁট (${cutText})`);
    } else {
      parts.push(`১টি কাটা থানে ${cutText}`);
    }
  }

  const displayText = parts.length > 0 ? parts.join(' + ') : '০ গজ (মজুত শেষ)';

  return {
    totalYards: total,
    yardsPerThan: ypt,
    fullThans,
    runningCutYards,
    runningCutGojGira,
    runningCutText: cutText,
    isRemnant,
    remnantThreshold: threshold,
    needsRestock,
    displayText
  };
}

/**
 * মেমো, ইনভয়েস এবং কার্ট সামারির জন্য গজ ও গিরার সুন্দর বিবরণ তৈরি করে
 * যেমন: ২.২৫ গজ -> "২ গজ ৪ গিরা (২.২৫ গজ)"
 * @param {number|string} quantity 
 * @param {string} unit 
 * @param {boolean} showDecimalNote 
 * @returns {string}
 */
export function formatFabricQuantity(quantity, unit, showDecimalNote = true) {
  if (!isFabricUnit(unit)) {
    return `${quantity} ${unit || ''}`.trim();
  }

  const { goj, gira, decimal } = parseGojGira(quantity);

  if (goj > 0 && gira > 0) {
    return showDecimalNote 
      ? `${goj} গজ ${gira} গিরা (${decimal} গজ)` 
      : `${goj} গজ ${gira} গিরা`;
  }
  if (goj > 0 && gira === 0) {
    return `${goj} গজ`;
  }
  if (goj === 0 && gira > 0) {
    return showDecimalNote 
      ? `${gira} গিরা (${decimal} গজ)` 
      : `${gira} গিরা`;
  }
  return `${decimal} গজ`;
}

