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
  return /^(গজ|goj|yard|yards)$/i.test(String(unit).trim());
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
