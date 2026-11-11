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
  const u = String(unit).trim().toLowerCase();
  return /গজ|goj|yard|yards|থান|than|bolt|মিটার|meter/i.test(u);
}

/**
 * ইউনিটটি নির্দিষ্টভাবে 'থান' বা রোল কি না
 * @param {string} unit 
 * @returns {boolean}
 */
export function isThanUnit(unit) {
  if (!unit) return false;
  const u = String(unit).trim().toLowerCase();
  return /থান|than|bolt|রোল|roll/i.test(u);
}

/**
 * পুরো পণ্য অবজেক্টটি কাপড় কি না যাচাই করে
 * @param {object} product 
 * @returns {boolean}
 */
export function isFabricProduct(product) {
  if (!product) return false;
  const cat = String(product.Category || product.category || '').trim().toLowerCase();
  if (cat === 'fabric' || cat === 'বস্ত্র' || cat === 'কাপড়' || cat === 'বস্ত্রালয়') return true;
  if (isFabricUnit(product.Unit || product.unit)) return true;
  if (Number(product.YardsPerThan || product.yardsPerThan || 0) > 0) return true;
  return false;
}

/**
 * রঙের বাংলা/ইংরেজি নাম থেকে হেক্স কালার কোড প্রদান করে
 * @param {string} colorName 
 * @returns {string|null}
 */
export function getColorHex(colorName = '') {
  if (!colorName) return null;
  const c = String(colorName).trim().toLowerCase();
  const map = {
    'লাল': '#EF4444', 'red': '#EF4444',
    'নীল': '#2563EB', 'blue': '#2563EB',
    'কালো': '#0F172A', 'black': '#0F172A',
    'সাদা': '#F8FAFC', 'white': '#F8FAFC',
    'সবুজ': '#10B981', 'green': '#10B981',
    'হলুদ': '#EAB308', 'yellow': '#EAB308',
    'গোলাপি': '#EC4899', 'pink': '#EC4899', 'গোলাপী': '#EC4899',
    'মেরুন': '#881337', 'maroon': '#881337',
    'অফ-হোয়াইট': '#FEF3C7', 'off-white': '#FEF3C7', 'offwhite': '#FEF3C7',
    'বেগুনি': '#8B5CF6', 'purple': '#8B5CF6',
    'কমলা': '#F97316', 'orange': '#F97316',
    'আকাশি': '#0284C7', 'sky': '#0284C7', 'আকাশী': '#0284C7',
    'ছাই': '#64748B', 'grey': '#64748B', 'gray': '#64748B',
    'বাদামি': '#78350F', 'brown': '#78350F', 'বাদামী': '#78350F',
    'গোল্ডেন': '#D97706', 'golden': '#D97706',
    'সিলভার': '#94A3B8', 'silver': '#94A3B8',
    'পেস্ট': '#0D9488', 'paste': '#0D9488',
    'ম্যাজেন্টা': '#C026D3', 'magenta': '#C026D3',
    'জলপাই': '#65A30D', 'olive': '#65A30D',
    'নেভি ব্লু': '#1E3A8A', 'navy': '#1E3A8A', 'navy blue': '#1E3A8A',
    'টিয়া': '#84CC16', 'lime': '#84CC16',
    'খয়েরি': '#78350F', 'খয়েরী': '#78350F'
  };
  return map[c] || '#6366F1';
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
export function calculateThanBreakdown(totalYards, yardsPerThan = 25, remnantThreshold = 0) {
  const total = Math.max(0, parseFloat(totalYards) || 0);
  const ypt = Math.max(1, parseFloat(yardsPerThan) || 25);
  const threshold = (remnantThreshold !== undefined && remnantThreshold !== null && String(remnantThreshold).trim() !== '' && !isNaN(Number(remnantThreshold)))
    ? Math.max(0, parseFloat(remnantThreshold))
    : 0;

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

  // চলমান কাটা থান যদি ছাঁট সীমার নিচে বা সমান হয় (ছাঁট সীমা ০ হলে ছাঁট অ্যালার্ট হবে না)
  const isRemnant = threshold > 0 && runningCutYards > 0 && runningCutYards <= threshold;

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
 * থান ব্রেকডাউন থেকে নিরাপদ ও পাঠযোগ্য রানিং কাটা গজ-গিরার টেক্সট প্রদান করে (কখনই [object Object] হবে না)
 * @param {object} breakdown 
 * @returns {string}
 */
export function getSafeRunningCutText(breakdown) {
  if (!breakdown) return '';
  if (typeof breakdown === 'string') return breakdown;
  if (breakdown.runningCutText && typeof breakdown.runningCutText === 'string') {
    return breakdown.runningCutText;
  }
  const rc = breakdown.runningCutGojGira;
  if (!rc) {
    return breakdown.runningCutYards > 0 ? `${breakdown.runningCutYards} গজ` : '';
  }
  if (typeof rc === 'string') return rc;
  if (rc.text && typeof rc.text === 'string') return rc.text;
  const g = Number(rc.goj) || 0;
  const gi = Number(rc.gira) || 0;
  if (g > 0 && gi > 0) return `${g} গজ ${gi} গিরা`;
  if (g > 0) return `${g} গজ`;
  if (gi > 0) return `${gi} গিরা`;
  if (breakdown.runningCutYards > 0) return `${breakdown.runningCutYards} গজ`;
  return '';
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

