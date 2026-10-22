/**
 * ============================================================================
 * permissionUtils.js - রোল ভিত্তিক নিরাপত্তা ও পারমিশন কন্ট্রোল
 * ============================================================================
 * ক্যাশিয়ার ও কর্মচারীদের জন্য কেনা দাম (Cost Price), মোট লাভ-ক্ষতি (P&L),
 * এবং ডিলিট অপারেশন সুরক্ষিত রাখার জন্য কেন্দ্রীয় পারমিশন হেল্পার।
 */

/**
 * ব্যবহারকারী কি অ্যাডমিন বা মালিক কি না তা যাচাই করে
 * @param {Object} activeUser 
 * @returns {boolean}
 */
export function isAdminUser(activeUser) {
  if (!activeUser || !activeUser.Role) return false;
  const role = String(activeUser.Role).trim().toLowerCase();
  return role === 'admin' || role === 'owner' || role === 'মালিক';
}

/**
 * ব্যবহারকারী পণ্যের কেনা দাম (Cost Price) দেখার অনুমতি রাখে কি না
 * ক্যাশিয়ার বা সাধারণ স্টাফদের জন্য কেনা দাম লুকানো থাকবে
 * @param {Object} activeUser 
 * @returns {boolean}
 */
export function canViewCostPrice(activeUser) {
  return isAdminUser(activeUser);
}

/**
 * ব্যবহারকারী মোট লাভ বা প্রফিট অ্যানালিটিক্স দেখার অনুমতি রাখে কি না
 * @param {Object} activeUser 
 * @returns {boolean}
 */
export function canViewProfit(activeUser) {
  return isAdminUser(activeUser);
}

/**
 * পণ্য বা ইনভয়েস স্থায়ীভাবে মুছে ফেলার ক্ষমতা যাচাই
 * @param {Object} activeUser 
 * @returns {boolean}
 */
export function canDeleteData(activeUser) {
  return isAdminUser(activeUser);
}

/**
 * সিস্টেম সেটিংস ও ইউজার পারমিশন পরিবর্তনের ক্ষমতা যাচাই
 * @param {Object} activeUser 
 * @returns {boolean}
 */
export function canManageSystem(activeUser) {
  return isAdminUser(activeUser);
}

/**
 * ক্যাশিয়ারের জন্য কেনা দাম মাস্ক করার হেল্পার
 * যেমন: অ্যাডমিনের জন্য ৳১৫০.০০, কিন্তু ক্যাশিয়ারের জন্য 🔒 লক করা
 * @param {number|string} price 
 * @param {Object} activeUser 
 * @param {string} currencySymbol 
 * @returns {string}
 */
export function formatMaskedCostPrice(price, activeUser, currencySymbol = '৳') {
  if (canViewCostPrice(activeUser)) {
    return `${currencySymbol}${Number(price || 0).toFixed(2)}`;
  }
  return '🔒 লক করা';
}

