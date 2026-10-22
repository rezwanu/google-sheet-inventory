/**
 * ============================================================================
 * storage.js - ক্লায়েন্ট-সাইড পারসিস্টেন্ট স্টোরেজ (localStorage) সার্ভিস
 * ============================================================================
 * জিরো-লেটেন্সি নিশ্চিত করার জন্য সমস্ত ডেটা প্রথমে ব্রাউজারের লোকাল স্টোরেজে
 * সংরক্ষিত থাকে এবং অফলাইনেও ক্যাশ থেকে নির্বিঘ্নে কাজ সম্পন্ন করা যায়।
 */

const STORAGE_KEYS = {
  SETTINGS: 'pos_settings',
  PRODUCTS: 'pos_products',
  CATEGORIES: 'pos_categories',
  UNITS: 'pos_units',
  CART: 'pos_cart',
  SALES_HISTORY: 'pos_sales_history',
  CUSTOMERS: 'pos_customers',
  CUSTOMER_LEDGER: 'pos_customer_ledger',
  COUPONS: 'pos_coupons',
  OFFLINE_QUEUE: 'pos_offline_queue',
  ACTIVE_USER: 'pos_active_user',
  USERS: 'pos_users',
  ORDERS: 'pos_orders',
  ABANDONED_CARTS: 'pos_abandoned_carts',
  SUPPLIERS: 'pos_suppliers',
  PURCHASE_ORDERS: 'pos_purchase_orders',
  SUPPLIER_LEDGER: 'pos_supplier_ledger',
  EXPENSES: 'pos_expenses',
  CASH_REGISTERS: 'pos_cash_registers',
  ACTIVE_REGISTER: 'pos_active_register',
  AUDIT_LOGS: 'pos_audit_logs',
  SALES_RETURNS: 'pos_sales_returns',
  STOCK_TRANSFERS: 'pos_stock_transfers',
  CAMPAIGNS: 'pos_campaigns',
  HELD_CARTS: 'pos_held_carts',
  TAILORING_ORDERS: 'pos_tailoring_orders',
  TAILORS: 'pos_tailor_masters',
  FABRIC_WASTAGE: 'pos_fabric_wastage',
};

import {
  BASELINE_SETTINGS,
  BASELINE_PRODUCTS,
  BASELINE_CATEGORIES,
  BASELINE_UNITS,
  BASELINE_USERS,
  BASELINE_CUSTOMERS
} from './baselineData';

import {
  getSecureStorageItem,
  setSecureStorageItem,
  removeSecureStorageItem
} from './secureStorage';

// প্রাথমিক ডিফল্ট সিস্টেম ইউজার ও অ্যাকাউন্ট তালিকা (লাইভ বেসলাইন থেকে ইনস্ট্যান্ট লোড)
export const DEFAULT_USERS = BASELINE_USERS && BASELINE_USERS.length > 0 ? BASELINE_USERS : [
  {
    UserID: 'USER-ADMIN-01',
    FullName: 'Rezwanur Rahman',
    Email: 'admin@pos.local',
    Phone: '01675934919',
    Role: 'Admin',
    PIN: '1234',
    Address: 'Bosila, Mohammadpur, Dhaka',
    AvatarUrl: '',
    Status: 'Active',
    CreatedAt: '2026-01-01T00:00:00.000Z',
  }
];

// প্রাথমিক ডিফল্ট কাস্টমার ডাটাবেস
export const DEFAULT_CUSTOMERS = BASELINE_CUSTOMERS || [];

// গুগল অ্যাপস স্ক্রিপ্ট ব্যাকএন্ড Web App URL (ডিফল্ট ক্লাউড ডাটাবেস)
export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbycCBTqIaaQUpAPrJwF1EEEeaZD7CmYamE9AF4u_v0bJFRZaoMRmKZ8wGBGt2MLEwsg/exec';

// পরিবেশ ভেরিয়েবল বা বিল্ট-ইন কনফিগারেশন থেকে ডিফল্ট API URL (Vercel বা .env)
const ENV_API_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.VITE_APPS_SCRIPT_URL)) ||
  BASELINE_SETTINGS?.apiUrl ||
  DEFAULT_APPS_SCRIPT_URL
).trim();

// প্রাথমিক ডিফল্ট সেটিংস (জিরো-লেটেন্সি পাবনা বস্ত্রালয় প্রোফাইল)
export const DEFAULT_SETTINGS = {
  SettingID: BASELINE_SETTINGS?.SettingID || 'SETTING-1',
  StoreName: BASELINE_SETTINGS?.StoreName || 'Pabna Bostraloy',
  LogoUrl: BASELINE_SETTINGS?.LogoUrl || '',
  CurrencySymbol: BASELINE_SETTINGS?.CurrencySymbol || '৳',
  TaxRatePercent: Number(BASELINE_SETTINGS?.TaxRatePercent) || 0,
  Address: BASELINE_SETTINGS?.Address || 'Bosila, Mohammadpur -Plot -7, Block -C, 40 Fit Main Road, Dhaka 1208',
  Phone: String(BASELINE_SETTINGS?.Phone || '01675934919'),
  Email: BASELINE_SETTINGS?.Email || 'rezwanureee@gmail.com',
  ReceiptFooter: BASELINE_SETTINGS?.ReceiptFooter || '',
  apiUrl: ENV_API_URL || DEFAULT_APPS_SCRIPT_URL,
  LoyaltyEnabled: BASELINE_SETTINGS?.LoyaltyEnabled !== undefined ? BASELINE_SETTINGS.LoyaltyEnabled : true,
  LoyaltyPointsRate: Number(BASELINE_SETTINGS?.LoyaltyPointsRate) || 100,
  LoyaltyRedeemRate: Number(BASELINE_SETTINGS?.LoyaltyRedeemRate) || 1.0,
  MinRedeemPoints: Number(BASELINE_SETTINGS?.MinRedeemPoints) || 10,
  StorefrontBannerText: BASELINE_SETTINGS?.StorefrontBannerText || 'আমাদের অনলাইন স্টোরে আপনাকে স্বাগতম! সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা।',
  StorefrontEnabled: BASELINE_SETTINGS?.StorefrontEnabled !== undefined ? BASELINE_SETTINGS.StorefrontEnabled : true,
};

// পরিচিত ডামি সেটিংসের মানসমূহ (লোকাল ক্যাশ বা শিট থেকে পরিচ্ছন্ন করার জন্য)
const DUMMY_SETTING_STRINGS = new Set([
  'Amar Super Shop & POS',
  'Amar Super Shop',
  'Amar Enterprise POS',
  'বাড়ি # ১২, রোড # ৪, গুলশান-১, ঢাকা',
  'Gulshan-2, Dhaka, Bangladesh',
  '+880 1700-000000',
  '+8801700000000',
  'support@amarsuper.com',
  'contact@store.com',
  'https://via.placeholder.com/150x50?text=Store+Logo',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&auto=format&fit=crop&q=60'
]);

/**
 * গুগল ড্রাইভ লিংক থেকে ফাইল আইডি বের করার নিরাপদ হেল্পার
 * @param {string} url - গুগল ড্রাইভ ইউআরএল
 * @returns {string|null} ফাইল আইডি অথবা null
 */
export function extractDriveFileId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // ১. /file/d/FILE_ID
  let m = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];

  // ২. id=FILE_ID
  m = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];

  // ৩. /d/FILE_ID
  m = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];

  // ৪. open?id=FILE_ID
  m = trimmed.match(/open\?id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];

  return null;
}

/**
 * গুগল ড্রাইভ ইমেজের জন্য মাল্টি-টায়ার ফলব্যাক ইউআরএল তালিকা তৈরি করে
 * @param {string} url - ইনপুট ইউআরএল
 * @returns {string[]} সম্ভাব্য ইউআরএল অ্যারে
 */
export function getDriveImageCandidates(url) {
  if (!url || typeof url !== 'string') return [];
  const driveId = extractDriveFileId(url);
  if (driveId) {
    return [
      `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`,
      `https://lh3.googleusercontent.com/d/${driveId}`,
      `https://drive.google.com/uc?export=view&id=${driveId}`
    ];
  }
  const formatted = formatImageUrl(url);
  return formatted ? [formatted] : [];
}

/**
 * গুগল ড্রাইভ বা অন্য ক্লাউড স্টোরেজের শেয়ারিং লিংক সরাসরি ইমেজ ট্যাগ এ প্রদর্শনের জন্য ফরম্যাট করে
 * @param {string} url - যেকোনো ইমেজ বা গুগল ড্রাইভ শেয়ার লিংক
 * @returns {string} সরাসরি রেন্ডারযোগ্য ইমেজ URL
 */
export function formatImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (!trimmed) return '';

  // যদি =IMAGE("...") ফর্মুলা থাকে
  const imgFormula = trimmed.match(/=IMAGE\s*\(\s*["']([^"']+)["']/i);
  if (imgFormula && imgFormula[1]) {
    trimmed = imgFormula[1].trim();
  }

  // গুগল ড্রাইভ লিঙ্ক হ্যান্ডলিং
  if (trimmed.includes('drive.google.com') || trimmed.includes('drive.usercontent.google.com') || trimmed.includes('docs.google.com')) {
    const fileId = extractDriveFileId(trimmed);
    if (fileId) {
      // গুগল থাম্বনেইল ইউআরএল সবচেয়ে নির্ভরযোগ্য এবং ব্রাউজার CORS ছাড়া সরাসরি রেন্ডার করে
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
  }

  // ড্রপবক্স লিঙ্ক হ্যান্ডলিং
  if (trimmed.includes('dropbox.com')) {
    return trimmed.replace('dl=0', 'raw=1');
  }

  return trimmed;
}

/**
 * যেকোনো অবজেক্ট বা শিট রেকর্ড থেকে লোগো ইউআরএল খুঁজে বের করার বুদ্ধিমান হেল্পার
 * @param {Object} obj - ডাটাবেস বা সেটিংস অবজেক্ট
 * @returns {string} খুঁজে পাওয়া লোগো লিংক
 */
export function extractLogoFromObject(obj) {
  if (!obj || typeof obj !== 'object') return '';

  const candidateKeys = [
    'LogoUrl', 'logoUrl', 'LogoURL', 'Logourl', 'logourl',
    'Logo', 'logo', 'Logo URL', 'Logo url', 'Logo Url', 'LOGO URL',
    'Logo_Url', 'Logo_URL', 'Logo_url', 'logo_url',
    'LogoLink', 'logoLink', 'Logo Link', 'logo link',
    'StoreLogo', 'storeLogo', 'Store Logo', 'store logo',
    'ShopLogo', 'shopLogo', 'Shop Logo', 'shop logo',
    'LogoImage', 'logoImage', 'Logo Image', 'logo image',
    'ImageUrl', 'imageUrl', 'Image URL', 'image url',
    'Image', 'image', 'Photo', 'photo', 'Icon', 'icon', 'লোগো'
  ];

  for (const k of candidateKeys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim()) {
      let val = String(obj[k]).trim();
      const m = val.match(/=IMAGE\s*\(\s*["']([^"']+)["']/i);
      if (m && m[1]) val = m[1].trim();
      if (!isDummySettingValue(val)) {
        return val;
      }
    }
  }

  // অবজেক্টের যেকোনো কলামে 'logo' বা 'storeimg' শব্দটি খুঁজুন
  for (const [k, v] of Object.entries(obj)) {
    if (!v) continue;
    const normKey = k.toLowerCase().replace(/[\s_\-]/g, '');
    if (normKey.includes('logo') || normKey.includes('storeimg') || normKey.includes('shopimg')) {
      let val = String(v).trim();
      const m = val.match(/=IMAGE\s*\(\s*["']([^"']+)["']/i);
      if (m && m[1]) val = m[1].trim();
      if (val && !isDummySettingValue(val)) {
        return val;
      }
    }
  }

  return '';
}

export function isDummySettingValue(val) {
  if (!val) return false;
  return DUMMY_SETTING_STRINGS.has(String(val).trim());
}

export function sanitizeSettings(settings) {
  if (!settings) return { ...DEFAULT_SETTINGS };
  const cleaned = { ...DEFAULT_SETTINGS, ...settings };

  // ১. স্টোর নাম নর্মালাইজেশন
  const storeName = settings.StoreName || settings.storeName || settings['Store Name'] || settings['Shop Name'] || settings.ShopName || cleaned.StoreName || '';
  cleaned.StoreName = isDummySettingValue(storeName) ? '' : String(storeName).trim();

  // ২. ঠিকানা নর্মালাইজেশন
  const address = settings.Address || settings.address || settings['Shop Address'] || settings.ShopAddress || settings['Store Address'] || cleaned.Address || '';
  cleaned.Address = isDummySettingValue(address) ? '' : String(address).trim();

  // ৩. মোবাইল/ফোন নর্মালাইজেশন
  const phone = settings.Phone || settings.phone || settings.Mobile || settings.mobile || settings['Phone Number'] || settings['Mobile Number'] || cleaned.Phone || '';
  cleaned.Phone = isDummySettingValue(phone) ? '' : String(phone).trim();

  // ৪. ইমেইল নর্মালাইজেশন
  const email = settings.Email || settings.email || settings.Mail || settings.mail || settings['Email Address'] || cleaned.Email || '';
  cleaned.Email = isDummySettingValue(email) ? '' : String(email).trim();

  // ৫. রিসিপ্ট ফুটার
  const receiptFooter = settings.ReceiptFooter || settings.receiptFooter || settings['Receipt Footer'] || settings.Footer || cleaned.ReceiptFooter || '';
  cleaned.ReceiptFooter = isDummySettingValue(receiptFooter) ? '' : String(receiptFooter).trim();

  // ৬. মুদ্রা ও ভ্যাট
  if (settings.CurrencySymbol || settings.currencySymbol || settings['Currency Symbol'] || settings.Currency) {
    cleaned.CurrencySymbol = settings.CurrencySymbol || settings.currencySymbol || settings['Currency Symbol'] || settings.Currency || '৳';
  }
  if (settings.TaxRatePercent !== undefined || settings.taxRatePercent !== undefined || settings['Tax Rate Percent'] !== undefined || settings.TaxRate !== undefined || settings.VAT !== undefined) {
    cleaned.TaxRatePercent = Number(settings.TaxRatePercent !== undefined ? settings.TaxRatePercent : (settings.taxRatePercent !== undefined ? settings.taxRatePercent : (settings['Tax Rate Percent'] !== undefined ? settings['Tax Rate Percent'] : (settings.TaxRate !== undefined ? settings.TaxRate : settings.VAT)))) || 0;
  }

  // ৭. লোগো URL নর্মালাইজেশন ও ড্রাইভ লিঙ্ক ফরম্যাটিং
  const rawLogo = extractLogoFromObject(settings) || extractLogoFromObject(cleaned) || '';
  const formattedLogo = formatImageUrl(rawLogo);
  cleaned.LogoUrl = formattedLogo;
  cleaned.logoUrl = formattedLogo;

  // ৮. API URL
  const candidateApi = String(cleaned.apiUrl || cleaned.ApiUrl || settings.apiUrl || settings.ApiUrl || '').trim();
  const api = candidateApi || ENV_API_URL || DEFAULT_APPS_SCRIPT_URL;
  cleaned.apiUrl = api;
  cleaned.ApiUrl = api;

  // ৯. লয়ালটি ও ডিজিটাল স্টোরফ্রন্ট সেটিংস
  if (settings.LoyaltyEnabled !== undefined) cleaned.LoyaltyEnabled = Boolean(settings.LoyaltyEnabled);
  if (settings.loyaltyEnabled !== undefined) cleaned.LoyaltyEnabled = Boolean(settings.loyaltyEnabled);
  if (settings.LoyaltyPointsRate !== undefined || settings.loyaltyPointsRate !== undefined) {
    cleaned.LoyaltyPointsRate = Number(settings.LoyaltyPointsRate !== undefined ? settings.LoyaltyPointsRate : settings.loyaltyPointsRate) || 100;
  }
  if (settings.LoyaltyRedeemRate !== undefined || settings.loyaltyRedeemRate !== undefined) {
    cleaned.LoyaltyRedeemRate = Number(settings.LoyaltyRedeemRate !== undefined ? settings.LoyaltyRedeemRate : settings.loyaltyRedeemRate) || 1.0;
  }
  if (settings.MinRedeemPoints !== undefined || settings.minRedeemPoints !== undefined) {
    cleaned.MinRedeemPoints = Number(settings.MinRedeemPoints !== undefined ? settings.MinRedeemPoints : settings.minRedeemPoints) || 10;
  }
  if (settings.StorefrontBannerText !== undefined || settings.storefrontBannerText !== undefined) {
    cleaned.StorefrontBannerText = String(settings.StorefrontBannerText !== undefined ? settings.StorefrontBannerText : settings.storefrontBannerText);
  }
  if (settings.StorefrontEnabled !== undefined) cleaned.StorefrontEnabled = Boolean(settings.StorefrontEnabled);
  if (settings.storefrontEnabled !== undefined) cleaned.StorefrontEnabled = Boolean(settings.storefrontEnabled);

  return cleaned;
}

// সেটিংস সংক্রান্ত মেথড (এনক্রিপ্টেড)
export function getLocalSettings() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.SETTINGS);
    if (!data) return { ...DEFAULT_SETTINGS, apiUrl: ENV_API_URL || DEFAULT_APPS_SCRIPT_URL };
    const sanitized = sanitizeSettings(data);

    // বেসলাইন ডিফল্ট দিয়ে স্টোর প্রোফাইল ফিল্ড স্বয়ংক্রিয় পুনরুদ্ধার (ইনস্ট্যান্ট ফার্স্ট পেইন্ট)
    if (!sanitized.StoreName && DEFAULT_SETTINGS.StoreName) {
      sanitized.StoreName = DEFAULT_SETTINGS.StoreName;
    }
    if (!sanitized.Address && DEFAULT_SETTINGS.Address) {
      sanitized.Address = DEFAULT_SETTINGS.Address;
    }
    if (!sanitized.Phone && DEFAULT_SETTINGS.Phone) {
      sanitized.Phone = DEFAULT_SETTINGS.Phone;
    }
    if (!sanitized.Email && DEFAULT_SETTINGS.Email) {
      sanitized.Email = DEFAULT_SETTINGS.Email;
    }
    if (!sanitized.apiUrl || !sanitized.apiUrl.trim()) {
      sanitized.apiUrl = ENV_API_URL || DEFAULT_APPS_SCRIPT_URL;
      sanitized.ApiUrl = ENV_API_URL || DEFAULT_APPS_SCRIPT_URL;
    }
    saveLocalSettings(sanitized);
    return sanitized;
  } catch (e) {
    return { ...DEFAULT_SETTINGS, apiUrl: ENV_API_URL || DEFAULT_APPS_SCRIPT_URL };
  }
}

export function saveLocalSettings(settings) {
  const sanitized = sanitizeSettings(settings);
  setSecureStorageItem(STORAGE_KEYS.SETTINGS, sanitized);
}

// প্রাথমিক পরিমাপক একক (Units) তালিকা (লাইভ বেসলাইন থেকে লোড)
export const DEFAULT_UNITS = BASELINE_UNITS && BASELINE_UNITS.length > 0 ? BASELINE_UNITS : [
  { UnitID: 'UNIT-101', UnitName: 'Piece (পিস)', ShortName: 'Pcs', Description: 'একক পিস পণ্য', Status: 'Active' },
  { UnitID: 'UNIT-102', UnitName: 'Packet (প্যাকেট)', ShortName: 'Packet', Description: 'প্যাকেটজাত পণ্য', Status: 'Active' },
  { UnitID: 'UNIT-107', UnitName: 'Box (বক্স/কার্টন)', ShortName: 'Box', Description: 'কার্টন বা বক্স', Status: 'Active' },
];

// প্রাথমিক ক্যাটাগরি ও সাব-ক্যাটাগরি হায়ারার্কি (লাইভ বেসলাইন থেকে লোড)
export const DEFAULT_CATEGORIES = BASELINE_CATEGORIES && BASELINE_CATEGORIES.length > 0 ? BASELINE_CATEGORIES : [
  { CategoryID: 'CAT-1791746174333-636', CategoryName: 'Men', SubCategoryName: 'shoe', Description: 'জুতা ও স্যান্ডেল', Status: 'Active' },
  { CategoryID: 'CAT-1791746232496-853', CategoryName: 'Women', SubCategoryName: 'Shoe', Description: 'নারী জুতা', Status: 'Active' },
  { CategoryID: 'CAT-1791780868138-384', CategoryName: 'Home & Kitchen', SubCategoryName: 'Kitchen & Dining', Description: 'হোমওয়্যার', Status: 'Active' },
];

// প্রাথমিক পণ্য তালিকা (লাইভ গুগল শিট থেকে ইনস্ট্যান্ট জিরো-ডিলে বেসলাইন)
export const DEFAULT_PRODUCTS = BASELINE_PRODUCTS || [];

// পরিচিত ডেমো/নমুনা পণ্যের আইডি ও নামসমূহ (লোকাল ক্যাশ বা পূর্ববর্তী টেস্ট থেকে মুছে ফেলার জন্য)
export const DEMO_PRODUCT_IDS = new Set([
  'PROD-1001',
  'PROD-1002',
  'PROD-1003',
  'PROD-1004',
  'PROD-1005',
  'PROD-1006'
]);

export const DEMO_PRODUCT_NAMES = new Set([
  'Basmati Rice Premium 5kg',
  'Basmati Rice 5kg',
  'Pure Soyabean Oil 5L',
  'Soyabean Oil 5L',
  'Premium CTC Black Tea 400g',
  'Refined White Sugar 1kg',
  'Dairy Fresh Full Cream Milk 1L',
  'Crunchy Chocolate Biscuit 300g'
]);

/**
 * কোনো পণ্য ডেমো বা টেস্ট পণ্য কিনা তা শনাক্ত করা
 */
export function isDemoProduct(product) {
  if (!product) return false;
  const id = String(product.ProductID || product.productId || product['Product ID'] || '').trim();
  const name = String(product.ProductName || product.productName || product['Product Name'] || '').trim();
  return DEMO_PRODUCT_IDS.has(id) || DEMO_PRODUCT_NAMES.has(name);
}


// ক্যাটাগরি সংক্রান্ত মেথড (এনক্রিপ্টেড)
export function getLocalCategories() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.CATEGORIES);
    if (!data || !Array.isArray(data) || data.length === 0) {
      saveLocalCategories(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    return data;
  } catch (e) {
    return DEFAULT_CATEGORIES;
  }
}

export function saveLocalCategories(categories) {
  setSecureStorageItem(STORAGE_KEYS.CATEGORIES, categories);
}

// পরিমাপক একক (Units) সংক্রান্ত মেথড (এনক্রিপ্টেড)
export function getLocalUnits() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.UNITS);
    if (!data || !Array.isArray(data) || data.length === 0) {
      saveLocalUnits(DEFAULT_UNITS);
      return DEFAULT_UNITS;
    }
    return data;
  } catch (e) {
    return DEFAULT_UNITS;
  }
}

export function saveLocalUnits(units) {
  setSecureStorageItem(STORAGE_KEYS.UNITS, units);
}

// প্রোডাক্ট অবজেক্টের বিভিন্ন ফিল্ড ভ্যারিয়েশন (যেমন: StockQuantit vs StockQuantity) নর্মালাইজ করা
// প্রোডাক্ট অবজেক্টের বিভিন্ন ফিল্ড ভ্যারিয়েশন ও হেডার কেসিং নর্মালাইজ করা
export function normalizeProduct(p) {
  if (!p) return null;

  // প্রোডাক্ট আইডি (বিভিন্ন শিট ফরম্যাট হ্যান্ডেল করা)
  const id = p.ProductID !== undefined && p.ProductID !== null && String(p.ProductID).trim() !== ''
    ? String(p.ProductID).trim()
    : (p.productId !== undefined && p.productId !== null && String(p.productId).trim() !== ''
        ? String(p.productId).trim()
        : (p['Product ID'] || p['Product id'] || p['product_id'] || p.ID || p.id || p.ItemId || p['Item ID'] || ''));

  // পণ্যের নাম (Product Name, Name, Title ইত্যাদি)
  const name = p.ProductName !== undefined && p.ProductName !== null && String(p.ProductName).trim() !== ''
    ? String(p.ProductName).trim()
    : (p.productName !== undefined && p.productName !== null && String(p.productName).trim() !== ''
        ? String(p.productName).trim()
        : (p['Product Name'] || p['Product name'] || p['product_name'] || p.Name || p.name || p.Title || p.title || p.ItemName || p['Item Name'] || ''));

  // বারকোড
  const barcode = p.Barcode !== undefined && p.Barcode !== null && String(p.Barcode).trim() !== ''
    ? String(p.Barcode).trim()
    : (p.barcode || p['Bar Code'] || p['bar_code'] || p.Code || p.code || p.SKU || p.sku || id);

  // ক্যাটাগরি ও সাব-ক্যাটাগরি
  const category = p.Category || p.category || p['Category'] || p['Category Name'] || p['category_name'] || 'General';
  const subCat = p.SubCategory || p.subCategory || p['Sub Category'] || p.subcategory || p['sub_category'] || '';

  // স্টক পরিমাণ
  const stock = p.StockQuantity !== undefined && p.StockQuantity !== null && p.StockQuantity !== ''
    ? p.StockQuantity
    : (p.StockQuantit !== undefined && p.StockQuantit !== null && p.StockQuantit !== ''
        ? p.StockQuantit
        : (p.StockQty !== undefined && p.StockQty !== null && p.StockQty !== ''
            ? p.StockQty
            : (p['Stock Quantity'] !== undefined && p['Stock Quantity'] !== null && p['Stock Quantity'] !== ''
                ? p['Stock Quantity']
                : (p.Stock !== undefined && p.Stock !== null && p.Stock !== ''
                    ? p.Stock
                    : (p.stock !== undefined && p.stock !== null && p.stock !== ''
                        ? p.stock
                        : (p.Quantity !== undefined && p.Quantity !== null && p.Quantity !== ''
                            ? p.Quantity
                            : (p.Qty !== undefined && p.Qty !== null && p.Qty !== '' ? p.Qty : 0)))))));

  // মিনিমাম স্টক সতর্কতা
  const minAlert = p.MinStockAlert !== undefined && p.MinStockAlert !== null && p.MinStockAlert !== ''
    ? p.MinStockAlert
    : (p.MinStockAler !== undefined && p.MinStockAler !== null && p.MinStockAler !== ''
        ? p.MinStockAler
        : (p['Min Stock Alert'] !== undefined && p['Min Stock Alert'] !== null && p['Min Stock Alert'] !== ''
            ? p['Min Stock Alert']
            : (p.MinStock !== undefined && p.MinStock !== null && p.MinStock !== '' ? p.MinStock : 5)));

  // ক্রয়মূল্য (Cost Price)
  const cost = p.CostPrice !== undefined && p.CostPrice !== null && p.CostPrice !== ''
    ? p.CostPrice
    : (p.costPrice !== undefined && p.costPrice !== null && p.costPrice !== ''
        ? p.costPrice
        : (p['Cost Price'] !== undefined && p['Cost Price'] !== null && p['Cost Price'] !== ''
            ? p['Cost Price']
            : (p.Cost !== undefined && p.Cost !== null && p.Cost !== ''
                ? p.Cost
                : (p.cost !== undefined && p.cost !== null && p.cost !== ''
                    ? p.cost
                    : (p.BuyPrice !== undefined && p.BuyPrice !== null && p.BuyPrice !== ''
                        ? p.BuyPrice
                        : (p.PurchasePrice !== undefined && p.PurchasePrice !== null && p.PurchasePrice !== '' ? p.PurchasePrice : 0))))));

  // বিক্রয়মূল্য (Selling Price)
  const price = p.SellingPrice !== undefined && p.SellingPrice !== null && p.SellingPrice !== ''
    ? p.SellingPrice
    : (p.sellingPrice !== undefined && p.sellingPrice !== null && p.sellingPrice !== ''
        ? p.sellingPrice
        : (p['Selling Price'] !== undefined && p['Selling Price'] !== null && p['Selling Price'] !== ''
            ? p['Selling Price']
            : (p.Price !== undefined && p.Price !== null && p.Price !== ''
                ? p.Price
                : (p.price !== undefined && p.price !== null && p.price !== ''
                    ? p.price
                    : (p.SalePrice !== undefined && p.SalePrice !== null && p.SalePrice !== ''
                        ? p.SalePrice
                        : (p.Rate !== undefined && p.Rate !== null && p.Rate !== '' ? p.Rate : 0))))));

  // নূন্যতম বিক্রয়মূল্য / ফ্লোর প্রাইস (Min Selling Price / Floor Price / Margin Price)
  const minSellingPrice = p.MinSellingPrice !== undefined && p.MinSellingPrice !== null && p.MinSellingPrice !== ''
    ? p.MinSellingPrice
    : (p.minSellingPrice !== undefined && p.minSellingPrice !== null && p.minSellingPrice !== ''
        ? p.minSellingPrice
        : (p.FloorPrice !== undefined && p.FloorPrice !== null && p.FloorPrice !== ''
            ? p.FloorPrice
            : (p.floorPrice !== undefined && p.floorPrice !== null && p.floorPrice !== ''
                ? p.floorPrice
                : (p.MinPrice !== undefined && p.MinPrice !== null && p.MinPrice !== ''
                    ? p.MinPrice
                    : (p['Min Selling Price'] || p['Min Price'] || cost)))));

  // একক (Unit)
  const unit = p.Unit || p.unit || p['Unit'] || p['Unit Name'] || p.UOM || 'Pcs';

  // ছবি ও ক্যাপশন
  const img = p.ImageUrl || p.imageUrl || p.imageurl || p['Image Url'] || p['Image URL'] || p.Image || p.image || p.Photo || p.photo || '';
  const caption = p.ImageCaption || p.imageCaption || p.imagecaption || p['Image Caption'] || p.Caption || p.caption || '';

  // বিবরণী
  const shortDesc = p.ShortDescription || p.shortDescription || p['Short Description'] || p.ShortDesc || '';
  const desc = p.Description || p.description || p['Description'] || p.Desc || '';

  let features = p.Features || p.features || [];
  if (typeof features === 'string') {
    features = features.split('|').map(f => f.trim()).filter(Boolean);
  } else if (!Array.isArray(features)) {
    features = [];
  }

  // Phase 6: ভ্যারিয়েন্ট, ব্যাচ, মেয়াদ ও কম্বো বান্ডেল ডাটা পার্সিং
  const hasVariants = Boolean(
    p.HasVariants === true || 
    p.HasVariants === 'TRUE' || 
    p.hasVariants === true || 
    p.hasVariants === 'true'
  );

  let variants = [];
  const rawVariants = p.Variants !== undefined ? p.Variants : (p.VariantsJSON !== undefined ? p.VariantsJSON : (p.variants || p.variantsJSON));
  if (Array.isArray(rawVariants)) {
    variants = rawVariants;
  } else if (typeof rawVariants === 'string' && rawVariants.trim()) {
    try {
      const parsed = JSON.parse(rawVariants);
      if (Array.isArray(parsed)) variants = parsed;
    } catch (e) {
      variants = [];
    }
  }

  // প্রতিটি ভ্যারিয়েন্টের প্রোপার্টি স্ট্যান্ডার্ডাইজেশন
  variants = variants.map((v, idx) => ({
    VariantID: String(v.VariantID || v.variantId || `VAR-${idx + 1}`),
    Attributes: v.Attributes || v.attributes || (v.Size || v.Color ? { Size: v.Size, Color: v.Color } : {}),
    Barcode: String(v.Barcode || v.barcode || ''),
    CostPrice: Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice || cost)),
    MinSellingPrice: Number(v.MinSellingPrice !== undefined ? v.MinSellingPrice : (v.minSellingPrice || v.CostPrice || cost)),
    SellingPrice: Number(v.SellingPrice !== undefined ? v.SellingPrice : (v.sellingPrice || price)),
    StockQuantity: Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)),
  }));

  const batchNumber = String(p.BatchNumber || p.batchNumber || p.Batch || p.batch || '').trim();
  const expiryDate = String(p.ExpiryDate || p.expiryDate || p.ExpDate || p.expDate || '').trim();
  const mfgDate = String(p.MfgDate || p.mfgDate || p.ManufactureDate || p.mfgDate || '').trim();
  const isBundle = Boolean(
    p.IsBundle === true || 
    p.IsBundle === 'TRUE' || 
    p.isBundle === true || 
    p.isBundle === 'true'
  );

  let bundleItems = [];
  const rawBundle = p.BundleItems !== undefined ? p.BundleItems : (p.BundleItemsJSON !== undefined ? p.BundleItemsJSON : (p.bundleItems || p.bundleItemsJSON));
  if (Array.isArray(rawBundle)) {
    bundleItems = rawBundle;
  } else if (typeof rawBundle === 'string' && rawBundle.trim()) {
    try {
      const parsed = JSON.parse(rawBundle);
      if (Array.isArray(parsed)) bundleItems = parsed;
    } catch (e) {
      bundleItems = [];
    }
  }

  bundleItems = bundleItems.map((bi) => ({
    ProductID: String(bi.ProductID || bi.productId || ''),
    ProductName: String(bi.ProductName || bi.productName || ''),
    Quantity: Number(bi.Quantity || bi.quantity || 1),
    SellingPrice: Number(bi.SellingPrice || bi.sellingPrice || 0),
  }));

  // সম্পূর্ণ খালি সারি বর্জন
  if (!name && !id && !barcode) {
    return null;
  }

  return {
    ...p,
    ProductID: String(id || name || Date.now()),
    ProductName: String(name || 'নামহীন পণ্য'),
    Barcode: String(barcode || id || ''),
    Category: String(category),
    SubCategory: String(subCat),
    StockQuantity: Number(stock) || 0,
    StockQuantit: Number(stock) || 0,
    MinStockAlert: Number(minAlert) || 5,
    CostPrice: Number(cost) || 0,
    MinSellingPrice: Math.max(0, Number(minSellingPrice) >= 0 ? Number(minSellingPrice) : (Number(cost) || 0)),
    minSellingPrice: Math.max(0, Number(minSellingPrice) >= 0 ? Number(minSellingPrice) : (Number(cost) || 0)),
    SellingPrice: Number(price) || 0,
    Unit: String(unit),
    ImageUrl: formatImageUrl(String(img)),
    imageUrl: formatImageUrl(String(img)),
    ImageCaption: String(caption),
    ShortDescription: String(shortDesc),
    Description: String(desc),
    Features: features,
    HasVariants: hasVariants,
    Variants: variants,
    BatchNumber: batchNumber,
    ExpiryDate: expiryDate,
    MfgDate: mfgDate,
    IsBundle: isBundle,
    BundleItems: bundleItems,
  };
}

/**
 * পণ্যের মেয়াদোত্তীর্ণের অবস্থা এবং অবশিষ্ট দিন হিসাব করে
 * @param {string} expiryDate - YYYY-MM-DD ফরম্যাটের তারিখ
 * @returns {Object} { status, daysLeft, label, colorClass }
 */
export function calculateExpiryStatus(expiryDate) {
  if (!expiryDate || typeof expiryDate !== 'string' || !expiryDate.trim()) {
    return {
      status: 'NO_EXPIRY',
      daysLeft: null,
      label: 'মেয়াদ প্রযোজ্য নয়',
      colorClass: 'text-slate-400 bg-slate-50 border-slate-200',
    };
  }

  const expTime = new Date(expiryDate).setHours(0, 0, 0, 0);
  if (isNaN(expTime)) {
    return {
      status: 'INVALID',
      daysLeft: null,
      label: 'অকার্যকর তারিখ',
      colorClass: 'text-slate-400 bg-slate-50 border-slate-200',
    };
  }

  const todayTime = new Date().setHours(0, 0, 0, 0);
  const diffTime = expTime - todayTime;
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      status: 'EXPIRED',
      daysLeft,
      label: `মেয়াদ শেষ (${Math.abs(daysLeft)} দিন আগে)`,
      badgeText: 'মেয়াদ শেষ!',
      colorClass: 'text-rose-700 bg-rose-50 border-rose-200',
      pillClass: 'bg-rose-600 text-white',
    };
  }

  if (daysLeft <= 7) {
    return {
      status: 'CRITICAL',
      daysLeft,
      label: `${daysLeft} দিন বাকি (জরুরি)`,
      badgeText: `${daysLeft} দিন বাকি`,
      colorClass: 'text-red-700 bg-red-50 border-red-200',
      pillClass: 'bg-red-500 text-white',
    };
  }

  if (daysLeft <= 15) {
    return {
      status: 'WARNING',
      daysLeft,
      label: `${daysLeft} দিন বাকি`,
      badgeText: `${daysLeft} দিন বাকি`,
      colorClass: 'text-amber-800 bg-amber-50 border-amber-200',
      pillClass: 'bg-amber-500 text-white',
    };
  }

  if (daysLeft <= 30) {
    return {
      status: 'UPCOMING',
      daysLeft,
      label: `${daysLeft} দিন বাকি`,
      badgeText: `${daysLeft} দিন বাকি`,
      colorClass: 'text-yellow-800 bg-yellow-50 border-yellow-200',
      pillClass: 'bg-yellow-500 text-slate-900',
    };
  }

  return {
    status: 'GOOD',
    daysLeft,
    label: `${daysLeft} দিন অবশিষ্ট`,
    badgeText: `${daysLeft} দিন`,
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    pillClass: 'bg-emerald-600 text-white',
  };
}

/**
 * সকল পণ্যের মধ্যে মেয়াদোত্তীর্ণ ও আসন্ন মেয়াদ শেষের তালিকা ও সামারি তৈরি করে
 * @param {Array} products - পণ্য তালিকা
 * @param {number} thresholdDays - সতর্কতার দিনসীমা (ডিফল্ট ৩০ দিন)
 * @returns {Object}
 */
export function getExpiringProductsSummary(products = [], thresholdDays = 30) {
  const safeList = Array.isArray(products) ? products : [];
  const expired = [];
  const expiringSoon = [];
  let potentialLoss = 0;

  safeList.forEach((p) => {
    if (!p.ExpiryDate) return;
    const info = calculateExpiryStatus(p.ExpiryDate);
    const stock = Number(p.StockQuantity) || 0;
    const cost = Number(p.CostPrice) || 0;

    if (info.status === 'EXPIRED') {
      expired.push({ ...p, expiryInfo: info });
      if (stock > 0) {
        potentialLoss += stock * cost;
      }
    } else if (info.daysLeft !== null && info.daysLeft >= 0 && info.daysLeft <= thresholdDays) {
      expiringSoon.push({ ...p, expiryInfo: info });
    }
  });

  return {
    expired,
    expiringSoon,
    totalAlerts: expired.length + expiringSoon.length,
    potentialLoss,
  };
}

// লোকাল প্রোডাক্ট সংক্রান্ত মেথড - কোনো ডেমো পণ্য থাকবে না
export function getLocalProducts() {
  try {
    const parsed = getSecureStorageItem(STORAGE_KEYS.PRODUCTS);
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
      const initial = (DEFAULT_PRODUCTS || []).map(normalizeProduct).filter(Boolean);
      if (initial.length > 0) {
        saveLocalProducts(initial);
      }
      return initial;
    }

    // পুরোনো ডেমো পণ্যগুলো চিহ্নিত করে লোকাল স্টোরেজ থেকে স্বয়ংক্রিয়ভাবে মুছে ফেলা
    const cleanList = parsed
      .filter((p) => !isDemoProduct(p))
      .map(normalizeProduct)
      .filter(Boolean);

    // যদি ক্লিন করার পর তালিকা ফাঁকা হয়ে যায়, তবে আসল বেসলাইন পণ্য দিয়ে রিকভার করুন
    if (cleanList.length === 0 && DEFAULT_PRODUCTS && DEFAULT_PRODUCTS.length > 0) {
      const fallback = DEFAULT_PRODUCTS.map(normalizeProduct).filter(Boolean);
      saveLocalProducts(fallback);
      return fallback;
    }

    if (cleanList.length !== parsed.length) {
      saveLocalProducts(cleanList);
    }
    return cleanList;
  } catch (e) {
    return (DEFAULT_PRODUCTS || []).map(normalizeProduct).filter(Boolean);
  }
}

export function saveLocalProducts(products) {
  const normalized = Array.isArray(products)
    ? products
        .filter((p) => !isDemoProduct(p))
        .map(normalizeProduct)
        .filter(Boolean)
    : [];
  setSecureStorageItem(STORAGE_KEYS.PRODUCTS, normalized);
}

/**
 * পূর্ববর্তী সমস্ত ডেমো পণ্য লোকাল স্টোরেজ থেকে পুরোপুরি ক্লিন করার ইউটিলিটি
 */
export function clearDemoData() {
  const current = getLocalProducts();
  const strictlyReal = current.filter((p) => !isDemoProduct(p));
  if (strictlyReal.length === 0 && DEFAULT_PRODUCTS && DEFAULT_PRODUCTS.length > 0) {
    const fallback = DEFAULT_PRODUCTS.map(normalizeProduct).filter(Boolean);
    saveLocalProducts(fallback);
    return fallback;
  }
  saveLocalProducts(strictlyReal);
  return strictlyReal;
}

// লোকাল প্রোডাক্ট স্টক আপডেট মেথড
export function updateProductStockLocally(productId, newStock, newCost = null, variantId = null) {
  const products = getLocalProducts();
  const index = products.findIndex((p) => p.ProductID === productId || p.Barcode === productId);
  if (index !== -1) {
    products[index].StockQuantity = Number(newStock);
    if (newCost !== null) {
      products[index].CostPrice = Number(newCost);
    }
    if (variantId && Array.isArray(products[index].Variants)) {
      products[index].Variants = products[index].Variants.map((v) => {
        if (v.VariantID === variantId) {
          return { ...v, StockQuantity: Number(newStock) };
        }
        return v;
      });
    }
    products[index].UpdatedAt = new Date().toISOString();
    saveLocalProducts(products);
    return products;
  }
  return products;
}

// কার্ট মেথড
export function getLocalCart() {
  try {
    const parsed = getSecureStorageItem(STORAGE_KEYS.CART);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalCart(cart) {
  setSecureStorageItem(STORAGE_KEYS.CART, Array.isArray(cart) ? cart : []);
}

// ============================================================================
// কাউন্টার হোল্ড কার্ট সার্ভিস (POS Order Hold & Multi-Customer Queue Management)
// ============================================================================

export function getLocalHeldCarts() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.HELD_CARTS);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalHeldCarts(heldCarts) {
  setSecureStorageItem(STORAGE_KEYS.HELD_CARTS, Array.isArray(heldCarts) ? heldCarts : []);
}

export function addHeldCartLocally(heldCartData) {
  if (!heldCartData) return getLocalHeldCarts();
  const list = getLocalHeldCarts();
  list.unshift(heldCartData);
  saveLocalHeldCarts(list);
  return list;
}

export function deleteHeldCartLocally(heldCartId) {
  if (!heldCartId) return getLocalHeldCarts();
  const list = getLocalHeldCarts();
  const filtered = list.filter((c) => String(c.id || '').trim() !== String(heldCartId).trim());
  saveLocalHeldCarts(filtered);
  return filtered;
}

// সেলস হিস্ট্রি মেথড
export function getLocalSalesHistory() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.SALES_HISTORY);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

// বিক্রয় অবজেক্ট থেকে পণ্যের তালিকা নিখুঁতভাবে পার্স ও নর্মালাইজ করা
export function extractAndNormalizeItems(sale) {
  if (!sale) return [];

  let items = [];

  // ১. সরাসরি যদি অ্যারে থাকে এবং তাতে অন্তত একটি উপাদান থাকে
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    items = sale.items;
  } else if (Array.isArray(sale.Items) && sale.Items.length > 0) {
    items = sale.Items;
  }

  // ২. যদি অ্যারে না পাওয়া যায় বা অ্যারে খালি থাকে, তবে স্ট্রিং/জেসন ফিল্ডসমূহ খোঁজা
  if (!items || items.length === 0) {
    // সম্ভাব্য সকল প্রোপার্টি নেম
    const rawCandidates = [
      sale.ItemsJSON,
      sale.itemsJSON,
      sale.ItemsJson,
      sale.itemsJson,
      sale.Items_JSON,
      sale.items_json,
      sale.items,
      sale.Items,
      sale.ItemDetails,
      sale.itemDetails,
      sale.Products,
      sale.products,
      sale.cartItems,
      sale.CartItems
    ];

    let foundRaw = rawCandidates.find(
      (c) => c && (typeof c === 'string' || (Array.isArray(c) && c.length > 0))
    );

    // কেস-ইনসেনসিটিভ সার্চ যদি এখনও না পাওয়া যায়
    if (!foundRaw) {
      for (const key of Object.keys(sale)) {
        if (/^(items?(_?json)?|products?|cart(_?items)?)$/i.test(key)) {
          const val = sale[key];
          if (val && (typeof val === 'string' || (Array.isArray(val) && val.length > 0))) {
            foundRaw = val;
            break;
          }
        }
      }
    }

    if (Array.isArray(foundRaw) && foundRaw.length > 0) {
      items = foundRaw;
    } else if (typeof foundRaw === 'string' && foundRaw.trim()) {
      try {
        let parsed = JSON.parse(foundRaw);
        // ডাবল স্ট্রিংগিফাই হ্যান্ডেল করা
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch (e) {}
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          items = parsed;
        }
      } catch (e) {
        try {
          const unescaped = foundRaw.replace(/\\"/g, '"').replace(/^["']|["']$/g, '');
          const parsed = JSON.parse(unescaped);
          if (Array.isArray(parsed) && parsed.length > 0) items = parsed;
        } catch (err) {}
      }
    }
  }

  // ৩. যদি তখনও items খালি থাকে, তবে ItemsSummary টেক্সট থেকে উদ্ধার করা
  // যেমন: "Crunchy Chocolate Biscuit 300g (x2), Dairy Fresh Full Cream Milk 1L (x1)"
  if (!items || items.length === 0) {
    let summaryText =
      sale.ItemsSummary ||
      sale.itemsSummary ||
      sale.itemsSummaryText ||
      sale.Summary ||
      sale.summary ||
      '';

    if (!summaryText) {
      for (const key of Object.keys(sale)) {
        if (/summary/i.test(key)) {
          summaryText = String(sale[key] || '');
          break;
        }
      }
    }

    if (summaryText && typeof summaryText === 'string') {
      const parts = summaryText.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        items = parts.map((part, index) => {
          // e.g. "Product Name (x2)" or "Product Name x 2"
          const match =
            part.match(/^(.*?)\s*\([xX]?(\d+)\)$/) ||
            part.match(/^(.*?)\s*[xX]\s*(\d+)$/);
          if (match) {
            return {
              productId: `ITEM-${index + 1}`,
              productName: match[1].trim(),
              quantity: Number(match[2]) || 1,
              sellingPrice: 0,
              total: 0,
            };
          }
          return {
            productId: `ITEM-${index + 1}`,
            productName: part,
            quantity: 1,
            sellingPrice: 0,
            total: 0,
          };
        });
      }
    }
  }

  // ৪. প্রতিটি আইটেমকে সম্পূর্ণ নিরাপদ অবজেক্টে রূপান্তর
  return (items || []).map((item, idx) => {
    if (!item || typeof item !== 'object') {
      return {
        productId: `ITEM-${idx + 1}`,
        ProductID: `ITEM-${idx + 1}`,
        productName: String(item || 'আইটেম'),
        ProductName: String(item || 'আইটেম'),
        quantity: 1,
        Quantity: 1,
        sellingPrice: 0,
        SellingPrice: 0,
        costPrice: 0,
        CostPrice: 0,
        total: 0,
        Total: 0,
        barcode: '',
        Barcode: '',
      };
    }

    const pName = String(
      item.productName ||
        item.ProductName ||
        item.name ||
        item.Name ||
        item.title ||
        item.Title ||
        'আইটেম'
    );
    const pId = String(
      item.productId ||
        item.ProductID ||
        item.id ||
        item.ID ||
        `ITEM-${idx + 1}`
    );
    const pBarcode = String(
      item.barcode !== undefined && item.barcode !== null
        ? item.barcode
        : (item.Barcode || '')
    );
    const pQty =
      Number(
        item.quantity !== undefined
          ? item.quantity
          : (item.Quantity !== undefined
          ? item.Quantity
          : (item.qty || item.Qty || 1))
      ) || 1;
    const pPrice =
      Number(
        item.sellingPrice !== undefined
          ? item.sellingPrice
          : (item.SellingPrice !== undefined
          ? item.SellingPrice
          : (item.price || item.Price || 0))
      ) || 0;
    const pCost =
      Number(
        item.costPrice !== undefined
          ? item.costPrice
          : (item.CostPrice !== undefined
          ? item.CostPrice
          : (item.cost || 0))
      ) || 0;
    const pTotal =
      Number(
        item.total !== undefined
          ? item.total
          : (item.Total !== undefined
          ? item.Total
          : (pPrice * pQty))
      ) || (pPrice * pQty);

    return {
      productId: pId,
      ProductID: pId,
      productName: pName,
      ProductName: pName,
      barcode: pBarcode,
      Barcode: pBarcode,
      quantity: pQty,
      Quantity: pQty,
      sellingPrice: pPrice,
      SellingPrice: pPrice,
      costPrice: pCost,
      CostPrice: pCost,
      total: pTotal,
      Total: pTotal,
    };
  });
}

// সেলস অবজেক্টের ফিল্ড নর্মালাইজ করা (গুগল শিট ও লোকাল ডাটার সামঞ্জস্য)
export function normalizeSale(sale) {
  if (!sale) return null;

  // পণ্যের তালিকা পার্স করা
  const items = extractAndNormalizeItems(sale);

  const invoiceNo = String(sale.InvoiceNo || sale.invoiceNo || sale.ReferenceID || sale.saleId || sale.SaleID || '').trim();
  const saleId = String(sale.SaleID || sale.saleId || invoiceNo);
  const timestamp = sale.Timestamp || sale.timestamp || sale.Date || sale.date || sale.CreatedAt || new Date().toISOString();
  const customerName = String(sale.CustomerName || sale.customerName || 'Walk-in Customer');
  const customerPhone = String(sale.CustomerPhone !== undefined && sale.CustomerPhone !== null ? sale.CustomerPhone : (sale.customerPhone || ''));
  const customerEmail = String(sale.CustomerEmail || sale.customerEmail || '');
  const customerAddress = String(sale.CustomerAddress || sale.customerAddress || '');
  const customerType = String(sale.CustomerType || sale.customerType || 'Regular');
  const cashierEmail = String(sale.CashierEmail || sale.cashierEmail || 'POS Cashier');
  const paymentMethod = String(sale.PaymentMethod || sale.paymentMethod || 'Cash');
  const status = String(sale.Status || sale.status || 'COMPLETED');
  const notes = String(sale.Notes || sale.notes || '');

  const subTotal = Number(sale.SubTotal !== undefined ? sale.SubTotal : (sale.subTotal !== undefined ? sale.subTotal : 0));
  const taxPercent = Number(sale.TaxPercent !== undefined ? sale.TaxPercent : (sale.taxPercent !== undefined ? sale.taxPercent : 0));
  const taxAmount = Number(sale.TaxAmount !== undefined ? sale.TaxAmount : (sale.taxAmount !== undefined ? sale.taxAmount : 0));
  const discountAmount = Number(sale.Discount !== undefined ? sale.Discount : (sale.discountAmount !== undefined ? sale.discountAmount : (sale.discount || 0)));
  const grandTotal = Number(sale.GrandTotal !== undefined ? sale.GrandTotal : (sale.grandTotal !== undefined ? sale.grandTotal : (subTotal - discountAmount + taxAmount)));
  const receivedCash = Number(sale.ReceivedCash !== undefined ? sale.ReceivedCash : (sale.receivedCash !== undefined ? sale.receivedCash : grandTotal));
  const changeDue = Number(sale.ChangeDue !== undefined ? sale.ChangeDue : (sale.changeDue !== undefined ? sale.changeDue : 0));
  const transactionRef = sale.TransactionRef || sale.transactionRef || '';

  return {
    saleId,
    SaleID: saleId,
    invoiceNo,
    InvoiceNo: invoiceNo,
    timestamp,
    Timestamp: timestamp,
    date: timestamp,
    customerName,
    CustomerName: customerName,
    customerPhone,
    CustomerPhone: customerPhone,
    customerEmail,
    customerAddress,
    customerType,
    cashierEmail,
    CashierEmail: cashierEmail,
    paymentMethod,
    PaymentMethod: paymentMethod,
    status,
    notes,
    items,
    Items: items,
    itemsSummary: sale.ItemsSummary || sale.itemsSummary || '',
    subTotal,
    SubTotal: subTotal,
    taxPercent,
    TaxPercent: taxPercent,
    taxAmount,
    TaxAmount: taxAmount,
    discountAmount,
    discount: discountAmount,
    Discount: discountAmount,
    grandTotal,
    GrandTotal: grandTotal,
    receivedCash,
    changeDue,
    transactionRef,
  };
}

export function saveSaleLocally(sale) {
  const history = getLocalSalesHistory();
  const normalized = normalizeSale(sale);
  history.unshift(normalized); // সাম্প্রতিক বিক্রয় সবার উপরে রাখা
  // সর্বোচ্চ ১০০০টি সাম্প্রতিক সেলস হিস্ট্রি সংরক্ষণ
  setSecureStorageItem(STORAGE_KEYS.SALES_HISTORY, history.slice(0, 1000));
}

export function saveLocalSalesHistory(history) {
  if (!Array.isArray(history)) return;
  const normalized = history.map(normalizeSale).filter(Boolean);
  setSecureStorageItem(STORAGE_KEYS.SALES_HISTORY, normalized.slice(0, 1000));
}

// অফলাইন কিউ মেথড (নেটওয়ার্ক না থাকলে জমা রাখার জন্য)
export function getOfflineQueue() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function addToOfflineQueue(item) {
  const queue = getOfflineQueue();
  queue.push(item);
  setSecureStorageItem(STORAGE_KEYS.OFFLINE_QUEUE, queue);
}

export function clearOfflineQueue() {
  removeSecureStorageItem(STORAGE_KEYS.OFFLINE_QUEUE);
}

// ==========================================
// ইউজার ও অথেনটিকেশন মেথডসমূহ (Authentication & Users)
// ==========================================

export function getLocalUsers() {
  try {
    const parsed = getSecureStorageItem(STORAGE_KEYS.USERS);
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
      saveLocalUsers(DEFAULT_USERS);
      return DEFAULT_USERS;
    }
    return parsed;
  } catch (e) {
    return DEFAULT_USERS;
  }
}

export function saveLocalUsers(users) {
  if (!Array.isArray(users)) return;
  setSecureStorageItem(STORAGE_KEYS.USERS, users);
}

// বর্তমান সক্রিয় ইউজার (লগইন করা অ্যাকাউন্ট, লগআউট থাকলে null)
export function getActiveUser() {
  try {
    const parsed = getSecureStorageItem(STORAGE_KEYS.ACTIVE_USER);
    if (!parsed) return null;
    if (parsed && parsed.Role && parsed.UserID !== 'USER-GUEST') return parsed;
    return null;
  } catch (e) {
    return null;
  }
}

export function saveActiveUser(user) {
  if (!user || user.UserID === 'USER-GUEST') {
    removeSecureStorageItem(STORAGE_KEYS.ACTIVE_USER);
  } else {
    setSecureStorageItem(STORAGE_KEYS.ACTIVE_USER, user);
  }
}

/**
 * নতুন গ্রাহক রেজিস্ট্রেশন / সাইন-আপ
 */
export function registerCustomerLocally({ FullName, Phone, Email, PIN, Address, AvatarUrl }) {
  const cleanPhone = String(Phone || '').trim();
  const cleanEmail = String(Email || '').trim().toLowerCase();
  const cleanName = String(FullName || '').trim();
  const cleanPin = String(PIN || '').trim();
  const cleanAddress = String(Address || '').trim();
  const cleanAvatarUrl = String(AvatarUrl || '').trim();

  if (!cleanName) {
    throw new Error('অনুগ্রহ করে আপনার পুরো নাম প্রদান করুন।');
  }
  if (!cleanPhone && !cleanEmail) {
    throw new Error('অনুগ্রহ করে মোবাইল নম্বর বা ইমেইল ঠিকানা প্রদান করুন।');
  }
  if (!cleanPin || cleanPin.length < 4) {
    throw new Error('পাসওয়ার্ড বা পিন কোড কমপক্ষে ৪ ডিজিটের হতে হবে।');
  }

  const users = getLocalUsers();

  // পূর্বে নিবন্ধিত কিনা পরীক্ষা
  const exists = users.find((u) => {
    if (cleanPhone && u.Phone && String(u.Phone).trim() === cleanPhone) return true;
    if (cleanEmail && u.Email && String(u.Email).trim().toLowerCase() === cleanEmail) return true;
    return false;
  });

  if (exists) {
    throw new Error('এই ফোন নম্বর বা ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে। সরাসরি লগইন করুন।');
  }

  const now = new Date().toISOString();
  const newUser = {
    UserID: `USER-CUST-${Date.now().toString().slice(-6)}`,
    FullName: cleanName,
    Email: cleanEmail || '',
    Phone: cleanPhone,
    Role: 'Customer', // সাধারণ গ্রাহক
    PIN: cleanPin,
    Address: cleanAddress,
    AvatarUrl: cleanAvatarUrl,
    Status: 'Active',
    CreatedAt: now,
  };

  users.push(newUser);
  saveLocalUsers(users);

  // কাস্টমার ডাটাবেসেও এন্ট্রি নিশ্চিত করা
  saveOrUpdateCustomerLocally({
    CustomerID: `CUST-${newUser.UserID.slice(-6)}`,
    CustomerName: cleanName,
    Phone: cleanPhone,
    Email: cleanEmail,
    Address: cleanAddress,
    CustomerType: 'Regular',
  }, 0);

  // সাথে সাথে এই ইউজারকে সক্রিয় করে লগইন করানো
  saveActiveUser(newUser);
  return newUser;
}

/**
 * লগইন ভেরিফিকেশন (ফোন/ইমেইল এবং পিন/পাসওয়ার্ড)
 */
export function authenticateUser({ identifier, pin, requestedRole = null }) {
  const cleanIdent = String(identifier || '').trim().toLowerCase();
  const cleanPin = String(pin || '').trim();

  if (!cleanIdent) {
    throw new Error('ফোন নম্বর বা ইমেইল ঠিকানা লিখুন।');
  }
  if (!cleanPin) {
    throw new Error('পাসওয়ার্ড বা পিন কোড লিখুন।');
  }

  const users = getLocalUsers();

  const user = users.find((u) => {
    const matchEmail = u.Email && String(u.Email).trim().toLowerCase() === cleanIdent;
    const matchPhone = u.Phone && String(u.Phone).trim() === cleanIdent;
    return (matchEmail || matchPhone);
  });

  if (!user) {
    throw new Error('এই তথ্য দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। সঠিক ফোন/ইমেইল লিখুন অথবা সাইন-আপ করুন।');
  }

  if (String(user.PIN || '').trim() !== cleanPin) {
    throw new Error('ভুল পিন বা পাসওয়ার্ড! অনুগ্রহ করে আবার চেষ্টা করুন।');
  }

  if (user.Status && String(user.Status).trim().toLowerCase() === 'inactive') {
    throw new Error('আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা আছে। এডমিনের সাথে যোগাযোগ করুন।');
  }

  // রোল অনুযায়ী যাচাই (যদি স্পেসিফিক রোল দাবি করা হয়ে থাকে)
  if (requestedRole && requestedRole !== 'All') {
    if (requestedRole === 'Admin' && user.Role !== 'Admin' && user.Role !== 'Cashier' && user.Role !== 'Manager' && user.Role !== 'Salesman' && user.Role !== 'Staff') {
      throw new Error('এই অ্যাকাউন্টটির এডমিন বা স্টাফ প্যানেলে প্রবেশের অনুমতি নেই।');
    }
  }

  saveActiveUser(user);
  return user;
}

/**
 * এডমিন কর্তৃক নতুন ব্যবহারকারী তৈরি বা বিদ্যমান ব্যবহারকারী আপডেট করা
 * @param {Object} userData - ব্যবহারকারীর বিবরণ
 * @returns {Object} সংরক্ষিত ব্যবহারকারী
 */
export function saveOrUpdateUserLocally(userData) {
  if (!userData) return null;
  const users = getLocalUsers();
  const userId = String(userData.UserID || userData.userId || '').trim();
  const phone = String(userData.Phone || userData.phone || '').trim();
  const email = String(userData.Email || userData.email || '').trim().toLowerCase();
  const now = new Date().toISOString();

  const existingIndex = users.findIndex((u) => {
    if (userId && String(u.UserID || '').trim() === userId) return true;
    if (phone && u.Phone && String(u.Phone).trim() === phone) return true;
    if (email && u.Email && String(u.Email).trim().toLowerCase() === email) return true;
    return false;
  });

  const updatedRecord = {
    UserID: userId || `USER-${(userData.Role || 'CUST').toUpperCase().slice(0, 4)}-${Date.now().toString().slice(-6)}`,
    FullName: String(userData.FullName || userData.fullName || '').trim(),
    Phone: phone,
    Email: email,
    Role: String(userData.Role || userData.role || 'Customer').trim(),
    PIN: String(userData.PIN || userData.pin || '1234').trim(),
    Address: String(userData.Address || userData.address || '').trim(),
    AvatarUrl: String(userData.AvatarUrl !== undefined ? userData.AvatarUrl : (userData.avatarUrl !== undefined ? userData.avatarUrl : (existingIndex >= 0 ? users[existingIndex].AvatarUrl : '')) || '').trim(),
    Status: String(userData.Status || userData.status || 'Active').trim(),
    CreatedAt: userData.CreatedAt || (existingIndex >= 0 ? users[existingIndex].CreatedAt : now),
    UpdatedAt: now,
  };

  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...updatedRecord };
  } else {
    users.push(updatedRecord);
  }

  saveLocalUsers(users);

  // যদি আপডেট হওয়া ব্যবহারকারী বর্তমান সক্রিয় ইউজার হন, সক্রিয় প্রোফাইলও আপডেট রাখা
  const active = getActiveUser();
  if (active && (active.UserID === updatedRecord.UserID || (phone && active.Phone === phone))) {
    saveActiveUser({ ...active, ...updatedRecord });
  }

  // যদি গ্রাহক রোল হয়, কাস্টমার ডাটাবেসেও রিফ্লেক্ট করা
  if (updatedRecord.Role === 'Customer') {
    try {
      saveOrUpdateCustomerLocally({
        CustomerID: `CUST-${updatedRecord.UserID.slice(-6)}`,
        CustomerName: updatedRecord.FullName,
        Phone: updatedRecord.Phone,
        Email: updatedRecord.Email,
        Address: updatedRecord.Address,
        CustomerType: 'Regular',
      }, 0);
    } catch (e) {
      console.warn('Customer local sync ignored:', e);
    }
  }

  return updatedRecord;
}

/**
 * লোকাল স্টোরেজ থেকে ব্যবহারকারী মুছে ফেলা
 * @param {string} userId - ইউজার আইডি
 */
export function deleteUserLocally(userId) {
  if (!userId) return;
  const users = getLocalUsers();
  const filtered = users.filter((u) => String(u.UserID || '').trim() !== String(userId).trim());
  saveLocalUsers(filtered);
}

/**
 * লগআউট - সক্রিয় সেশন সম্পূর্ণ মুছে ফেলা
 */
export function logoutUser() {
  removeSecureStorageItem(STORAGE_KEYS.ACTIVE_USER);
  return null;
}

/**
 * নির্দিষ্ট গ্রাহকের পূর্ববর্তী অর্ডার তালিকা বের করা
 */
export function getCustomerOrders(identifier) {
  if (!identifier) return [];
  const cleanId = String(identifier).trim().toLowerCase();
  const history = getLocalSalesHistory();

  return history.filter((sale) => {
    const matchPhone = sale.CustomerPhone && String(sale.CustomerPhone).trim().toLowerCase() === cleanId;
    const matchEmail = sale.CustomerEmail && String(sale.CustomerEmail).trim().toLowerCase() === cleanId;
    const matchName = sale.CustomerName && String(sale.CustomerName).trim().toLowerCase() === cleanId;
    return matchPhone || matchEmail || matchName;
  });
}

// ==========================================
// কাস্টমার ডাটাবেস মেথডসমূহ (Customer Database)
// ==========================================

const DUMMY_CUSTOMER_PHONES = new Set([
  '01700000000',
  '01711000001',
  '01811000002',
  '01819000002',
  '01912000003',
  '+8801700000000',
]);

const DUMMY_CUSTOMER_NAMES = new Set([
  'Walk-in Customer (সাধারণ গ্রাহক)',
  'Walk-in Customer (কাউন্টার কাস্টমার)',
  'মো. আরিফুল ইসলাম',
  'সুমাইয়া আক্তার',
  'সুমাইয়া আক্তার',
  'আব্দুর রহিম',
  'করিম উল্লাহ',
]);

/**
 * কোনো গ্রাহক রেকর্ড ডামি কিনা তা নির্ণয় করা
 */
export function isDummyCustomer(c) {
  if (!c) return false;
  const id = String(c.CustomerID || '').trim();
  const phone = String(c.Phone || '').trim();
  const name = String(c.CustomerName || '').trim();
  if (DUMMY_CUSTOMER_PHONES.has(phone)) return true;
  if (DUMMY_CUSTOMER_NAMES.has(name)) return true;
  if (id === 'CUST-1001' && (name.includes('Walk-in') || name.includes('রহিম'))) return true;
  if (id === 'CUST-1002' && (name.includes('আরিফুল') || name.includes('করিম'))) return true;
  if (id === 'CUST-1003' && name.includes('সুমাই')) return true;
  return false;
}

export function getLocalCustomers() {
  try {
    const parsed = getSecureStorageItem(STORAGE_KEYS.CUSTOMERS);
    if (!parsed || !Array.isArray(parsed)) return [];
    const cleaned = parsed.filter(c => !isDummyCustomer(c));
    if (cleaned.length !== parsed.length) {
      saveLocalCustomers(cleaned);
    }
    return cleaned;
  } catch (e) {
    return [];
  }
}

export function saveLocalCustomers(customers) {
  if (!Array.isArray(customers)) return;
  const cleaned = customers.filter(c => !isDummyCustomer(c));
  setSecureStorageItem(STORAGE_KEYS.CUSTOMERS, cleaned);
}

/**
 * ব্রাউজার ক্যাশ থেকে পুরনো ডামি কাস্টমার সম্পূর্ণরূপে মুছে ফেলা
 */
export function clearDemoCustomers() {
  const cleaned = getLocalCustomers();
  saveLocalCustomers(cleaned);
  return cleaned;
}

/**
 * কাস্টমারকে RFM (Recency, Frequency, Monetary) এর ভিত্তিতে সেগমেন্ট শ্রেণীকরণ করা
 * @param {Object} customer 
 * @return {'VIP' | 'Regular' | 'At-Risk' | 'New'}
 */
export function classifyCustomerSegment(customer) {
  if (!customer) return 'New';
  const orders = Number(customer.TotalOrders || 0);
  const spent = Number(customer.TotalSpent || 0);
  const lastOrder = customer.LastOrderDate || customer.UpdatedAt || customer.CreatedAt;

  if (lastOrder && orders > 0) {
    try {
      const orderDate = new Date(lastOrder).getTime();
      if (!isNaN(orderDate)) {
        const diffDays = (Date.now() - orderDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 45) {
          return 'At-Risk';
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (spent >= 10000 || orders >= 5) {
    return 'VIP';
  }
  if (orders >= 2) {
    return 'Regular';
  }
  return 'New';
}

/**
 * বিক্রয় সম্পন্ন করার পর বা সরাসরি নতুন গ্রাহক তৈরি হলে কাস্টমার ডাটাবেস আপডেট করা
 */
export function saveOrUpdateCustomerLocally(customerData, saleAmount = 0, dueAmount = 0, paidAmount = 0, loyaltyEarned = 0, loyaltyRedeemed = 0) {
  if (!customerData) return getLocalCustomers();
  const phone = String(customerData.Phone || customerData.customerPhone || '').trim();
  const name = String(customerData.CustomerName || customerData.customerName || '').trim();

  // যদি নাম বা ফোন কোনোটাই না থাকে অথবা শুধু সাধারণ ওয়াক-ইন হয় তবে স্কিপ
  if (!name && !phone) return getLocalCustomers();
  if (name.toLowerCase() === 'walk-in customer' && !phone) return getLocalCustomers();

  const customers = getLocalCustomers();
  const existingIndex = customers.findIndex(c => {
    if (phone && c.Phone && String(c.Phone).trim() === phone) return true;
    if (customerData.CustomerID && c.CustomerID && String(c.CustomerID).trim() === String(customerData.CustomerID).trim()) return true;
    if (name && c.CustomerName && String(c.CustomerName).trim().toLowerCase() === name.toLowerCase()) return true;
    return false;
  });

  const now = new Date().toISOString();

  if (existingIndex !== -1) {
    const existing = customers[existingIndex];
    const prevOrders = Number(existing.TotalOrders) || 0;
    const prevSpent = Number(existing.TotalSpent) || 0;
    const prevDue = Number(existing.CurrentDue) || 0;
    const prevPaid = Number(existing.TotalPaid) || 0;

    const curPoints = Number(existing.LoyaltyPoints || 0);
    const curEarned = Number(existing.TotalPointsEarned || 0);
    const curRedeemed = Number(existing.TotalPointsRedeemed || 0);

    const newPoints = Math.max(0, curPoints + Number(loyaltyEarned || 0) - Number(loyaltyRedeemed || 0));
    const newEarned = curEarned + Number(loyaltyEarned || 0);
    const newRedeemed = curRedeemed + Number(loyaltyRedeemed || 0);

    const updatedCustomer = {
      ...existing,
      CustomerName: name || existing.CustomerName,
      Phone: phone || existing.Phone,
      Email: customerData.Email || customerData.customerEmail || existing.Email || '',
      Address: customerData.Address || customerData.customerAddress || existing.Address || '',
      CustomerType: customerData.CustomerType || customerData.customerType || existing.CustomerType || 'Regular',
      CreditLimit: customerData.CreditLimit !== undefined ? Number(customerData.CreditLimit) : (Number(existing.CreditLimit) || 0),
      TotalOrders: prevOrders + (saleAmount > 0 ? 1 : 0),
      TotalSpent: prevSpent + Number(saleAmount || 0),
      TotalPurchases: (Number(existing.TotalPurchases) || prevSpent) + Number(saleAmount || 0),
      TotalPaid: prevPaid + Number(paidAmount || (saleAmount - dueAmount) || 0),
      CurrentDue: Math.max(0, prevDue + Number(dueAmount || 0) - (paidAmount > 0 && saleAmount === 0 ? paidAmount : 0)),
      LastPaymentDate: paidAmount > 0 ? now : (existing.LastPaymentDate || ''),
      LoyaltyPoints: newPoints,
      TotalPointsEarned: newEarned,
      TotalPointsRedeemed: newRedeemed,
      LastOrderDate: saleAmount > 0 ? now : (existing.LastOrderDate || ''),
      UpdatedAt: now,
    };

    updatedCustomer.CustomerSegment = classifyCustomerSegment(updatedCustomer);
    customers[existingIndex] = updatedCustomer;
  } else {
    const newPoints = Math.max(0, Number(loyaltyEarned || 0) - Number(loyaltyRedeemed || 0));
    const newCustomer = {
      CustomerID: customerData.CustomerID || `CUST-${Date.now().toString().slice(-6)}`,
      CustomerName: name || 'নামহীন গ্রাহক',
      Phone: phone,
      Email: customerData.Email || customerData.customerEmail || '',
      Address: customerData.Address || customerData.customerAddress || '',
      CustomerType: customerData.CustomerType || customerData.customerType || 'Regular',
      CreditLimit: Number(customerData.CreditLimit) || 0,
      TotalOrders: saleAmount > 0 ? 1 : 0,
      TotalSpent: Number(saleAmount || 0),
      TotalPurchases: Number(saleAmount || 0),
      TotalPaid: Number(paidAmount || (saleAmount - dueAmount) || 0),
      CurrentDue: Math.max(0, Number(dueAmount || 0)),
      LastPaymentDate: paidAmount > 0 ? now : '',
      LoyaltyPoints: newPoints,
      TotalPointsEarned: Number(loyaltyEarned || 0),
      TotalPointsRedeemed: Number(loyaltyRedeemed || 0),
      LastOrderDate: saleAmount > 0 ? now : '',
      CustomerSegment: 'New',
      Status: 'Active',
      CreatedAt: now,
      UpdatedAt: now,
    };
    customers.unshift(newCustomer);
  }

  saveLocalCustomers(customers);
  return customers;
}

/**
 * লোকাল স্টোরেজ থেকে নির্দিষ্ট গ্রাহক মুছে ফেলা
 */
export function deleteCustomerLocally(customerId, phone) {
  const customers = getLocalCustomers();
  const filtered = customers.filter(c => {
    if (customerId && String(c.CustomerID || '').trim() === String(customerId).trim()) return false;
    if (phone && String(c.Phone || '').trim() === String(phone).trim()) return false;
    return true;
  });
  saveLocalCustomers(filtered);
  return filtered;
}

// ==========================================
// Phase 2: বাকির খাতা ও কাস্টমার লেজার স্টোরেজ
// ==========================================

export function getLocalCustomerLedger() {
  try {
    const parsed = getSecureStorageItem(STORAGE_KEYS.CUSTOMER_LEDGER);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalCustomerLedger(ledger) {
  if (!Array.isArray(ledger)) return;
  setSecureStorageItem(STORAGE_KEYS.CUSTOMER_LEDGER, ledger);
}

/**
 * লেজারে নতুন এন্ট্রি সংরক্ষণ (বিক্রয় বা পেমেন্ট)
 */
export function recordCustomerLedgerEntryLocally(entry) {
  if (!entry) return getLocalCustomerLedger();
  const ledger = getLocalCustomerLedger();
  const newEntry = {
    LedgerID: entry.LedgerID || `LEDGER-${Date.now()}`,
    Timestamp: entry.Timestamp || new Date().toISOString(),
    CustomerID: entry.CustomerID || '',
    CustomerName: entry.CustomerName || '',
    CustomerPhone: entry.CustomerPhone || '',
    OrderID: entry.OrderID || '',
    InvoiceNo: entry.InvoiceNo || '',
    EntryType: entry.EntryType || 'Payment', // 'Sale' | 'Payment' | 'Adjustment'
    Debit: Number(entry.Debit || 0), // ক্রয়/বিল
    Credit: Number(entry.Credit || 0), // পরিশোধ
    Balance: Number(entry.Balance || 0),
    PaymentMethod: entry.PaymentMethod || 'Cash',
    TrxID: entry.TrxID || '',
    CollectedBy: entry.CollectedBy || 'Admin',
    Notes: entry.Notes || ''
  };
  ledger.unshift(newEntry);
  saveLocalCustomerLedger(ledger);
  return ledger;
}

/**
 * কাস্টমারের বকেয়া পরিশোধ লোকাল স্টোরেজে এন্ট্রি
 */
export function recordCustomerPaymentLocally(paymentData) {
  const amount = Number(paymentData.amount || paymentData.Amount || 0);
  if (amount <= 0) return { success: false, message: 'সঠিক টাকার পরিমাণ দিন।' };

  const customerId = paymentData.customerId || paymentData.CustomerID;
  const phone = paymentData.customerPhone || paymentData.phone;
  const name = paymentData.customerName || paymentData.name;

  const customers = getLocalCustomers();
  const custIndex = customers.findIndex(c => 
    (customerId && c.CustomerID === customerId) ||
    (phone && c.Phone === phone) ||
    (name && c.CustomerName?.toLowerCase() === name?.toLowerCase())
  );

  let newDue = 0;
  let targetCust = null;

  if (custIndex !== -1) {
    targetCust = customers[custIndex];
    const currentDue = Number(targetCust.CurrentDue || 0);
    const totalPaid = Number(targetCust.TotalPaid || 0);
    newDue = Math.max(0, currentDue - amount);

    customers[custIndex] = {
      ...targetCust,
      CurrentDue: newDue,
      TotalPaid: totalPaid + amount,
      LastPaymentDate: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };
    saveLocalCustomers(customers);
  }

  // লেজারে এন্ট্রি যুক্ত করা
  const ledgerEntry = {
    LedgerID: `LEDGER-${Date.now()}`,
    Timestamp: new Date().toISOString(),
    CustomerID: targetCust?.CustomerID || customerId || '',
    CustomerName: targetCust?.CustomerName || name || 'Customer',
    CustomerPhone: targetCust?.Phone || phone || '',
    OrderID: paymentData.orderId || '',
    InvoiceNo: paymentData.invoiceNo || '',
    EntryType: 'Payment',
    Debit: 0,
    Credit: amount,
    Balance: newDue,
    PaymentMethod: paymentData.paymentMethod || 'Cash',
    TrxID: paymentData.trxId || '',
    CollectedBy: paymentData.collectedBy || 'Admin',
    Notes: paymentData.notes || 'বকেয়া পরিশোধ আদায়'
  };

  recordCustomerLedgerEntryLocally(ledgerEntry);

  return {
    success: true,
    data: {
      ...ledgerEntry,
      previousDue: targetCust ? Number(targetCust.CurrentDue || 0) : 0,
      currentDue: newDue
    }
  };
}

/**
 * গ্রাহকের ক্রেডিট লিমিট লোকাল স্টোরেজে আপডেট করা
 */
export function updateCustomerCreditLimitLocally(customerId, limit) {
  const customers = getLocalCustomers();
  const custIndex = customers.findIndex(c => c.CustomerID === customerId);
  if (custIndex !== -1) {
    customers[custIndex].CreditLimit = Math.max(0, Number(limit) || 0);
    customers[custIndex].UpdatedAt = new Date().toISOString();
    saveLocalCustomers(customers);
    return customers[custIndex];
  }
  return null;
}

// ==========================================
// কুপন ডাটাবেস মেথডসমূহ (Coupons Database)
// ==========================================

export function normalizeCoupon(coupon) {
  if (!coupon) return null;
  return {
    CouponID: String(coupon.CouponID || coupon.couponId || '').trim(),
    CouponCode: String(coupon.CouponCode || coupon.couponCode || '').trim().toUpperCase(),
    DiscountType: String(coupon.DiscountType || coupon.discountType || 'Percentage').trim(),
    DiscountValue: Number(coupon.DiscountValue !== undefined ? coupon.DiscountValue : coupon.discountValue) || 0,
    ApplicableType: String(coupon.ApplicableType || coupon.applicableType || 'AllProducts').trim(),
    ProductID: String(coupon.ProductID || coupon.productId || '').trim(),
    ProductName: String(coupon.ProductName || coupon.productName || (coupon.ApplicableType === 'AllProducts' || coupon.applicableType === 'AllProducts' ? 'সকল পণ্য' : '')).trim(),
    MinPurchaseAmount: Number(coupon.MinPurchaseAmount !== undefined ? coupon.MinPurchaseAmount : coupon.minPurchaseAmount) || 0,
    MaxDiscountAmount: Number(coupon.MaxDiscountAmount !== undefined ? coupon.MaxDiscountAmount : coupon.maxDiscountAmount) || 0,
    UsageLimit: Number(coupon.UsageLimit !== undefined ? coupon.UsageLimit : coupon.usageLimit) || 0,
    UsedCount: Number(coupon.UsedCount !== undefined ? coupon.UsedCount : coupon.usedCount) || 0,
    ExpiryDate: String(coupon.ExpiryDate || coupon.expiryDate || '').trim(),
    Status: String(coupon.Status || coupon.status || 'Active').trim(),
    CreatedAt: coupon.CreatedAt || coupon.createdAt || new Date().toISOString(),
    UpdatedAt: coupon.UpdatedAt || coupon.updatedAt || new Date().toISOString(),
  };
}

export function getLocalCoupons() {
  try {
    const parsed = getSecureStorageItem(STORAGE_KEYS.COUPONS);
    if (!parsed || !Array.isArray(parsed)) return [];
    return parsed.map(normalizeCoupon).filter(Boolean);
  } catch (e) {
    return [];
  }
}

export function saveLocalCoupons(coupons) {
  if (!Array.isArray(coupons)) return;
  const normalized = coupons.map(normalizeCoupon).filter(Boolean);
  setSecureStorageItem(STORAGE_KEYS.COUPONS, normalized);
}

export function saveOrUpdateCouponLocally(couponData) {
  if (!couponData) return getLocalCoupons();
  const normalized = normalizeCoupon(couponData);
  if (!normalized || !normalized.CouponCode) return getLocalCoupons();

  const coupons = getLocalCoupons();
  const existingIndex = coupons.findIndex(c =>
    (normalized.CouponID && c.CouponID === normalized.CouponID) ||
    (c.CouponCode.toUpperCase() === normalized.CouponCode.toUpperCase())
  );

  const now = new Date().toISOString();

  if (existingIndex !== -1) {
    coupons[existingIndex] = {
      ...coupons[existingIndex],
      ...normalized,
      CouponID: coupons[existingIndex].CouponID || normalized.CouponID,
      UpdatedAt: now,
    };
  } else {
    normalized.CouponID = normalized.CouponID || `COUPON-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    normalized.CreatedAt = now;
    normalized.UpdatedAt = now;
    coupons.unshift(normalized);
  }

  saveLocalCoupons(coupons);
  return coupons;
}

export function deleteCouponLocally(couponId, couponCode) {
  const coupons = getLocalCoupons();
  const filtered = coupons.filter(c => {
    if (couponId && c.CouponID === String(couponId).trim()) return false;
    if (couponCode && c.CouponCode.toUpperCase() === String(couponCode).trim().toUpperCase()) return false;
    return true;
  });
  saveLocalCoupons(filtered);
  return filtered;
}

// ==========================================
// অর্ডার ম্যানেজমেন্ট মেথডসমূহ (Order Management)
// ==========================================

export function normalizeOrder(order) {
  if (!order) return null;
  const now = new Date().toISOString();

  let items = [];
  if (Array.isArray(order.Items)) {
    items = order.Items;
  } else if (Array.isArray(order.items)) {
    items = order.items;
  } else if (typeof order.ItemsJSON === 'string' && order.ItemsJSON.trim()) {
    try { items = JSON.parse(order.ItemsJSON); } catch {}
  } else if (typeof order.itemsJSON === 'string' && order.itemsJSON.trim()) {
    try { items = JSON.parse(order.itemsJSON); } catch {}
  }

  const subTotal = Number(order.SubTotal ?? order.subTotal ?? order.subtotal) ||
    items.reduce((sum, item) => sum + (Number(item.sellingPrice || item.SellingPrice || item.price || 0) * Number(item.quantity || item.Quantity || 1)), 0);
  const discountAmount = Number(order.DiscountAmount ?? order.discountAmount) || 0;
  const deliveryCharge = Number(order.DeliveryCharge ?? order.deliveryCharge) || 0;
  const totalAmount = Number(order.TotalAmount ?? order.totalAmount) || Math.max(0, subTotal - discountAmount + deliveryCharge);
  const advancePaid = Number(order.AdvancePaid ?? order.advancePaid) || 0;
  const dueAmount = Number(order.DueAmount ?? order.dueAmount ?? order.CodAmount ?? order.codAmount) || Math.max(0, totalAmount - advancePaid);

  return {
    OrderID: String(order.OrderID || order.orderId || order.id || `ORD-${Date.now()}`).trim(),
    OrderNumber: String(order.OrderNumber || order.orderNumber || '').trim(),
    OrderDate: String(order.OrderDate || order.orderDate || order.CreatedAt || order.createdAt || now).trim(),
    CustomerName: String(order.CustomerName || order.customerName || 'নামহীন গ্রাহক').trim(),
    CustomerPhone: String(order.CustomerPhone || order.customerPhone || order.phone || '').trim(),
    AltPhone: String(order.AltPhone || order.altPhone || '').trim(),
    CustomerAddress: String(order.CustomerAddress || order.customerAddress || order.address || '').trim(),
    Division: String(order.Division || order.division || '').trim(),
    District: String(order.District || order.district || '').trim(),
    Thana: String(order.Thana || order.thana || '').trim(),
    OrderSource: String(order.OrderSource || order.orderSource || 'Phone').trim(),
    Items: items,
    SubTotal: subTotal,
    DiscountAmount: discountAmount,
    DeliveryCharge: deliveryCharge,
    TotalAmount: totalAmount,
    AdvancePaid: advancePaid,
    DueAmount: dueAmount,
    CourierName: String(order.CourierName || order.courierName || 'Steadfast').trim(),
    TrackingID: String(order.TrackingID || order.trackingId || order.trackingCode || '').trim(),
    Status: String(order.Status || order.status || 'Pending').trim(),
    PaymentStatus: String(order.PaymentStatus || order.paymentStatus || (advancePaid >= totalAmount ? 'Paid' : advancePaid > 0 ? 'Partial' : 'Unpaid')).trim(),
    PaymentMethod: String(order.PaymentMethod || order.paymentMethod || 'COD').trim(),
    RiskLevel: String(order.RiskLevel || order.riskLevel || 'Low').trim(),
    Notes: String(order.Notes || order.notes || '').trim(),
    StockReserved: Boolean(order.StockReserved !== undefined ? order.StockReserved : true),
    IsPreOrder: Boolean(order.IsPreOrder ?? order.isPreOrder ?? false),
    ActivityLog: Array.isArray(order.ActivityLog)
      ? order.ActivityLog
      : (Array.isArray(order.activityLog)
          ? order.activityLog
          : [{ timestamp: order.CreatedAt || now, action: 'অর্ডার সিস্টেমে তৈরি হয়েছে', actor: String(order.CreatedBy || order.createdBy || 'Admin') }]),
    RmaRequest: order.RmaRequest || order.rmaRequest || null,
    CreatedAt: order.CreatedAt || order.createdAt || now,
    UpdatedAt: order.UpdatedAt || order.updatedAt || now,
    CreatedBy: String(order.CreatedBy || order.createdBy || 'Admin').trim(),
  };
}

export function getLocalOrders() {
  try {
    const parsed = getSecureStorageItem(STORAGE_KEYS.ORDERS);
    if (!parsed || !Array.isArray(parsed)) return [];
    return parsed.map(normalizeOrder).filter(Boolean);
  } catch (e) {
    return [];
  }
}

export function saveLocalOrders(orders) {
  if (!Array.isArray(orders)) return;
  const normalized = orders.map(normalizeOrder).filter(Boolean);
  setSecureStorageItem(STORAGE_KEYS.ORDERS, normalized);
}

export function saveOrUpdateOrderLocally(orderData) {
  if (!orderData) return getLocalOrders();
  const normalized = normalizeOrder(orderData);
  if (!normalized || !normalized.OrderID) return getLocalOrders();

  const orders = getLocalOrders();
  const existingIndex = orders.findIndex(o => o.OrderID === normalized.OrderID);

  const now = new Date().toISOString();

  if (existingIndex !== -1) {
    orders[existingIndex] = {
      ...orders[existingIndex],
      ...normalized,
      UpdatedAt: now,
    };
  } else {
    normalized.CreatedAt = normalized.CreatedAt || now;
    normalized.UpdatedAt = now;
    orders.unshift(normalized);
  }

  saveLocalOrders(orders);
  return orders;
}

export function updateOrderStatusLocally(orderId, newStatus, trackingId = null, courierName = null, actor = 'Admin', consignmentId = null, smsStatus = null) {
  if (!orderId || !newStatus) return getLocalOrders();
  const orders = getLocalOrders();
  const index = orders.findIndex(o => o.OrderID === orderId);

  if (index !== -1) {
    const prevStatus = orders[index].Status;
    orders[index].Status = newStatus;
    if (trackingId !== null) {
      orders[index].TrackingID = trackingId;
    }
    if (courierName !== null) {
      orders[index].CourierName = courierName;
    }
    if (consignmentId !== null) {
      orders[index].ConsignmentID = consignmentId;
    }
    if (smsStatus !== null) {
      orders[index].SmsStatus = smsStatus;
      orders[index].SmsSentAt = new Date().toISOString();
    }
    orders[index].UpdatedAt = new Date().toISOString();

    // অ্যাক্টিভিটি টাইমলাইনে যুক্ত করা
    if (!Array.isArray(orders[index].ActivityLog)) {
      orders[index].ActivityLog = [];
    }
    orders[index].ActivityLog.push({
      timestamp: new Date().toISOString(),
      action: `স্ট্যাটাস পরিবর্তন: ${prevStatus} ➔ ${newStatus}${trackingId ? ` (ট্র্যাকিং: ${trackingId})` : ''}${consignmentId ? ` (CID: ${consignmentId})` : ''}`,
      actor: actor
    });

    saveLocalOrders(orders);
  }

  return orders;
}

/**
 * গ্রাহকের রিটার্ন বা এক্সচেঞ্জ আবেদন (RMA Request) সাবমিট করা
 */
export function submitOrderRmaLocally(orderId, { type = 'Return', reason = '', details = '' }) {
  if (!orderId) return null;
  const orders = getLocalOrders();
  const index = orders.findIndex(o => o.OrderID === orderId);

  if (index !== -1) {
    const now = new Date().toISOString();
    orders[index].RmaRequest = {
      type: type || 'Return',
      reason: reason || 'পছন্দ হয়নি বা সাইজ মিলছে না',
      details: details || '',
      status: 'Pending',
      requestedAt: now
    };

    if (!Array.isArray(orders[index].ActivityLog)) {
      orders[index].ActivityLog = [];
    }
    orders[index].ActivityLog.push({
      timestamp: now,
      action: `গ্রাহক ${type === 'Exchange' ? 'এক্সচেঞ্জ' : 'রিটার্ন'} আবেদন জমা দিয়েছেন (কারণ: ${reason})`,
      actor: 'Customer'
    });

    orders[index].UpdatedAt = now;
    saveLocalOrders(orders);
    return orders[index];
  }
  return null;
}

/**
 * এডমিন কর্তৃক রিটার্ন/এক্সচেঞ্জ আবেদন নিষ্পত্তি করা (Approve / Reject)
 */
export function resolveOrderRmaLocally(orderId, resolution = 'Approved', notes = '', actor = 'Admin') {
  if (!orderId) return getLocalOrders();
  const orders = getLocalOrders();
  const index = orders.findIndex(o => o.OrderID === orderId);

  if (index !== -1 && orders[index].RmaRequest) {
    const now = new Date().toISOString();
    orders[index].RmaRequest.status = resolution;
    orders[index].RmaRequest.resolvedAt = now;
    orders[index].RmaRequest.resolutionNotes = notes;

    if (resolution === 'Approved') {
      orders[index].Status = 'Returned';
    }

    if (!Array.isArray(orders[index].ActivityLog)) {
      orders[index].ActivityLog = [];
    }
    orders[index].ActivityLog.push({
      timestamp: now,
      action: `রিটার্ন আবেদন ${resolution === 'Approved' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'} হয়েছে${notes ? ` (নোট: ${notes})` : ''}`,
      actor: actor
    });

    orders[index].UpdatedAt = now;
    saveLocalOrders(orders);
  }
  return orders;
}

export function deleteOrderLocally(orderId) {
  if (!orderId) return getLocalOrders();
  const orders = getLocalOrders();
  const filtered = orders.filter(o => o.OrderID !== orderId);
  saveLocalOrders(filtered);
  return filtered;
}

/**
 * কাস্টমারের লয়ালটি পয়েন্ট সরাসরি লোকাল স্টোরেজে হালনাগাদ করা
 */
export function updateCustomerLoyaltyLocally(customerId, phone, pointsDelta, isRedeem = false) {
  const customers = getLocalCustomers();
  const targetIdx = customers.findIndex(c => 
    (customerId && String(c.CustomerID || '').trim() === String(customerId).trim()) ||
    (phone && String(c.Phone || '').trim() === String(phone).trim())
  );

  if (targetIdx !== -1) {
    const cust = customers[targetIdx];
    const curPts = Number(cust.LoyaltyPoints || 0);
    const curEarned = Number(cust.TotalPointsEarned || 0);
    const curRedeemed = Number(cust.TotalPointsRedeemed || 0);
    const delta = Number(pointsDelta || 0);

    let newPts = curPts;
    let newEarned = curEarned;
    let newRedeemed = curRedeemed;

    if (isRedeem) {
      newPts = Math.max(0, curPts - delta);
      newRedeemed += delta;
    } else {
      newPts += delta;
      newEarned += delta;
    }

    customers[targetIdx] = {
      ...cust,
      LoyaltyPoints: newPts,
      TotalPointsEarned: newEarned,
      TotalPointsRedeemed: newRedeemed,
      UpdatedAt: new Date().toISOString()
    };
    saveLocalCustomers(customers);
    return customers[targetIdx];
  }
  return null;
}

/**
 * ============================================================================
 * Phase 3: ড্রপ-অফ ও অসম্পূর্ণ কার্ট (Abandoned Carts) লোকাল স্টোরেজ সার্ভিস
 * ============================================================================
 */

export function getLocalAbandonedCarts() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.ABANDONED_CARTS);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalAbandonedCarts(carts) {
  setSecureStorageItem(STORAGE_KEYS.ABANDONED_CARTS, Array.isArray(carts) ? carts : []);
}

export function saveOrUpdateAbandonedCartLocally(cartData) {
  if (!cartData) return getLocalAbandonedCarts();
  const carts = getLocalAbandonedCarts();
  const phone = String(cartData.CustomerPhone || cartData.customerPhone || cartData.phone || '').trim();
  const cartId = String(cartData.CartID || cartData.cartId || '').trim();

  const now = new Date().toISOString();
  const existingIdx = carts.findIndex(c => {
    if (cartId && c.CartID && String(c.CartID).trim() === cartId) return true;
    if (phone && c.CustomerPhone && String(c.CustomerPhone).trim() === phone && c.RecoveryStatus === 'Pending') return true;
    return false;
  });

  const rawItems = cartData.items || cartData.CartItemsJSON || [];
  const itemsJson = typeof rawItems === 'string' ? rawItems : JSON.stringify(rawItems);

  if (existingIdx !== -1) {
    carts[existingIdx] = {
      ...carts[existingIdx],
      CustomerPhone: phone || carts[existingIdx].CustomerPhone,
      CustomerName: cartData.CustomerName || cartData.customerName || carts[existingIdx].CustomerName || 'Online Visitor',
      CustomerEmail: cartData.CustomerEmail || cartData.customerEmail || carts[existingIdx].CustomerEmail || '',
      CustomerAddress: cartData.CustomerAddress || cartData.customerAddress || carts[existingIdx].CustomerAddress || '',
      CartItemsJSON: itemsJson,
      TotalAmount: Number(cartData.TotalAmount !== undefined ? cartData.TotalAmount : (cartData.totalAmount !== undefined ? cartData.totalAmount : (cartData.grandTotal !== undefined ? cartData.grandTotal : carts[existingIdx].TotalAmount))) || 0,
      RecoveryStatus: cartData.RecoveryStatus || cartData.status || carts[existingIdx].RecoveryStatus || 'Pending',
      Notes: cartData.Notes !== undefined ? cartData.Notes : carts[existingIdx].Notes,
      Timestamp: now
    };
  } else {
    const newCart = {
      CartID: cartId || `CART-${Date.now().toString().slice(-6)}`,
      Timestamp: now,
      CustomerPhone: phone,
      CustomerName: cartData.CustomerName || cartData.customerName || 'Online Visitor',
      CustomerEmail: cartData.CustomerEmail || cartData.customerEmail || '',
      CustomerAddress: cartData.CustomerAddress || cartData.customerAddress || '',
      CartItemsJSON: itemsJson,
      TotalAmount: Number(cartData.TotalAmount !== undefined ? cartData.TotalAmount : (cartData.totalAmount !== undefined ? cartData.totalAmount : cartData.grandTotal)) || 0,
      RecoveryStatus: cartData.RecoveryStatus || cartData.status || 'Pending',
      LastContactedAt: '',
      Notes: cartData.Notes || ''
    };
    carts.unshift(newCart);
  }

  saveLocalAbandonedCarts(carts);
  return carts;
}

export function updateAbandonedCartStatusLocally(cartId, status = 'Contacted', notes = '') {
  if (!cartId) return getLocalAbandonedCarts();
  const carts = getLocalAbandonedCarts();
  const idx = carts.findIndex(c => String(c.CartID || '').trim() === String(cartId).trim());
  if (idx !== -1) {
    const now = new Date().toISOString();
    carts[idx].RecoveryStatus = status;
    carts[idx].LastContactedAt = now;
    if (notes) carts[idx].Notes = notes;
    saveLocalAbandonedCarts(carts);
  }
  return carts;
}

export function deleteAbandonedCartLocally(cartId) {
  if (!cartId) return getLocalAbandonedCarts();
  const carts = getLocalAbandonedCarts();
  const filtered = carts.filter(c => String(c.CartID || '').trim() !== String(cartId).trim());
  saveLocalAbandonedCarts(filtered);
  return filtered;
}

// ============================================================================
// Phase 4: সাপ্লায়ার, পারচেজ অর্ডার ও সাপ্লায়ার লেজার পারসিস্টেন্স
// ============================================================================

export function getLocalSuppliers() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.SUPPLIERS);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalSuppliers(suppliers) {
  setSecureStorageItem(STORAGE_KEYS.SUPPLIERS, Array.isArray(suppliers) ? suppliers : []);
}

export function saveOrUpdateSupplierLocally(supplierData) {
  if (!supplierData) return getLocalSuppliers();
  const list = getLocalSuppliers();
  const id = String(supplierData.SupplierID || supplierData.supplierId || '').trim();
  const phone = String(supplierData.Phone || supplierData.phone || '').trim();
  const company = String(supplierData.CompanyName || supplierData.companyName || '').trim();

  const now = new Date().toISOString();
  const existingIdx = list.findIndex(s => {
    if (id && s.SupplierID && String(s.SupplierID).trim() === id) return true;
    if (phone && s.Phone && String(s.Phone).trim() === phone) return true;
    return false;
  });

  if (existingIdx !== -1) {
    list[existingIdx] = {
      ...list[existingIdx],
      CompanyName: company || list[existingIdx].CompanyName,
      ContactPerson: supplierData.ContactPerson || supplierData.contactPerson || list[existingIdx].ContactPerson || '',
      Phone: phone || list[existingIdx].Phone,
      Email: supplierData.Email || supplierData.email || list[existingIdx].Email || '',
      Address: supplierData.Address || supplierData.address || list[existingIdx].Address || '',
      Notes: supplierData.Notes !== undefined ? supplierData.Notes : list[existingIdx].Notes,
      UpdatedAt: now
    };
  } else {
    const newSupplier = {
      SupplierID: id || `SUP-${Date.now().toString().slice(-6)}`,
      CompanyName: company || supplierData.ContactPerson || 'সাপ্লায়ার',
      ContactPerson: supplierData.ContactPerson || supplierData.contactPerson || '',
      Phone: phone,
      Email: supplierData.Email || supplierData.email || '',
      Address: supplierData.Address || supplierData.address || '',
      TotalPurchased: Number(supplierData.TotalPurchased || supplierData.totalPurchased || 0),
      TotalPaid: Number(supplierData.TotalPaid || supplierData.totalPaid || 0),
      CurrentPayable: Number(supplierData.CurrentPayable || supplierData.currentPayable || 0),
      Notes: supplierData.Notes || supplierData.notes || '',
      CreatedAt: now,
      UpdatedAt: now
    };
    list.unshift(newSupplier);
  }

  saveLocalSuppliers(list);
  return list;
}

export function deleteSupplierLocally(supplierId) {
  if (!supplierId) return getLocalSuppliers();
  const list = getLocalSuppliers();
  const filtered = list.filter(s => String(s.SupplierID || '').trim() !== String(supplierId).trim());
  saveLocalSuppliers(filtered);
  return filtered;
}

export function recordSupplierPaymentLocally(paymentData) {
  const list = getLocalSuppliers();
  const targetId = String(paymentData.supplierId || paymentData.SupplierID || '').trim();
  const amount = Number(paymentData.amount || paymentData.Amount || 0);

  const idx = list.findIndex(s => String(s.SupplierID || '').trim() === targetId);
  let newDue = 0;
  if (idx !== -1) {
    const prevPaid = Number(list[idx].TotalPaid || 0);
    const prevDue = Number(list[idx].CurrentPayable || 0);
    list[idx].TotalPaid = prevPaid + amount;
    list[idx].CurrentPayable = Math.max(0, prevDue - amount);
    list[idx].UpdatedAt = new Date().toISOString();
    newDue = list[idx].CurrentPayable;
    saveLocalSuppliers(list);
  }

  // লেজার এন্ট্রি
  recordSupplierLedgerEntryLocally({
    SupplierID: targetId,
    SupplierName: idx !== -1 ? (list[idx].CompanyName || list[idx].ContactPerson) : '',
    SupplierPhone: idx !== -1 ? list[idx].Phone : '',
    PO_ID: paymentData.poId || '',
    EntryType: 'Payment',
    Debit: amount,
    Credit: 0,
    Balance: newDue,
    PaymentMethod: paymentMethodNorm(paymentData.paymentMethod),
    TrxID: paymentData.trxId || paymentData.transactionRef || '',
    CollectedBy: paymentData.collectedBy || 'Admin',
    Notes: paymentData.notes || 'সাপ্লায়ারের বকেয়া পরিশোধ'
  });

  return list;
}

function paymentMethodNorm(method) {
  return method || 'Cash';
}

export function getLocalPurchaseOrders() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.PURCHASE_ORDERS);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalPurchaseOrders(orders) {
  setSecureStorageItem(STORAGE_KEYS.PURCHASE_ORDERS, Array.isArray(orders) ? orders : []);
}

export function saveOrUpdatePurchaseOrderLocally(poData) {
  if (!poData) return getLocalPurchaseOrders();
  const list = getLocalPurchaseOrders();
  const poId = String(poData.PO_ID || poData.poId || '').trim();
  const now = new Date().toISOString();

  const rawItems = poData.Items || poData.items || poData.ItemsJSON || [];
  const itemsList = Array.isArray(rawItems) ? rawItems : (typeof rawItems === 'string' ? JSON.parse(rawItems || '[]') : []);

  const totalAmount = Number(poData.TotalAmount !== undefined ? poData.TotalAmount : (poData.totalAmount !== undefined ? poData.totalAmount : 0));
  const paidAmount = Number(poData.PaidAmount !== undefined ? poData.PaidAmount : (poData.paidAmount !== undefined ? poData.paidAmount : 0));
  const dueAmount = Number(poData.DueAmount !== undefined ? poData.DueAmount : (totalAmount - paidAmount));
  const status = poData.Status || poData.status || 'Ordered';

  const existingIdx = list.findIndex(p => String(p.PO_ID || '').trim() === poId);

  const poRecord = {
    PO_ID: poId || `PO-${Date.now().toString().slice(-6)}`,
    Timestamp: poData.Timestamp || poData.timestamp || now,
    SupplierID: poData.SupplierID || poData.supplierId || '',
    SupplierName: poData.SupplierName || poData.supplierName || 'সাপ্লায়ার',
    SupplierPhone: poData.SupplierPhone || poData.supplierPhone || '',
    ItemsJSON: JSON.stringify(itemsList),
    Items: itemsList,
    TotalAmount: totalAmount,
    PaidAmount: paidAmount,
    DueAmount: dueAmount,
    PaymentMethod: poData.PaymentMethod || poData.paymentMethod || 'Cash',
    Status: status,
    ReceivedBy: status === 'Received' ? (poData.ReceivedBy || poData.receivedBy || 'Admin') : '',
    ReceivedAt: status === 'Received' ? (poData.ReceivedAt || now) : '',
    Notes: poData.Notes || poData.notes || '',
    CreatedAt: poData.CreatedAt || now,
    UpdatedAt: now
  };

  if (existingIdx !== -1) {
    list[existingIdx] = { ...list[existingIdx], ...poRecord };
  } else {
    list.unshift(poRecord);
  }

  saveLocalPurchaseOrders(list);

  // সাপ্লায়ার ব্যালেন্স আপডেট
  if (poRecord.SupplierID || poRecord.SupplierName) {
    const suppliers = getLocalSuppliers();
    const supIdx = suppliers.findIndex(s => 
      (poRecord.SupplierID && String(s.SupplierID).trim() === poRecord.SupplierID) ||
      (poRecord.SupplierName && String(s.CompanyName || s.ContactPerson).trim().toLowerCase() === poRecord.SupplierName.toLowerCase())
    );

    let currentDue = 0;
    if (supIdx !== -1) {
      suppliers[supIdx].TotalPurchased = (Number(suppliers[supIdx].TotalPurchased) || 0) + totalAmount;
      suppliers[supIdx].TotalPaid = (Number(suppliers[supIdx].TotalPaid) || 0) + paidAmount;
      suppliers[supIdx].CurrentPayable = Math.max(0, (Number(suppliers[supIdx].CurrentPayable) || 0) + dueAmount);
      suppliers[supIdx].UpdatedAt = now;
      currentDue = suppliers[supIdx].CurrentPayable;
      saveLocalSuppliers(suppliers);
    }

    // লেজার এন্ট্রি
    recordSupplierLedgerEntryLocally({
      SupplierID: poRecord.SupplierID || (supIdx !== -1 ? suppliers[supIdx].SupplierID : ''),
      SupplierName: poRecord.SupplierName,
      SupplierPhone: poRecord.SupplierPhone,
      PO_ID: poRecord.PO_ID,
      EntryType: 'Purchase',
      Debit: paidAmount,
      Credit: totalAmount,
      Balance: currentDue,
      PaymentMethod: poRecord.PaymentMethod,
      TrxID: poData.transactionRef || '',
      CollectedBy: poRecord.ReceivedBy || 'Admin',
      Notes: poRecord.Notes || `পারচেজ অর্ডার ${poRecord.PO_ID}`
    });
  }

  return list;
}

export function updatePurchaseOrderStatusLocally(poId, newStatus = 'Received', receivedBy = 'Admin') {
  if (!poId) return getLocalPurchaseOrders();
  const list = getLocalPurchaseOrders();
  const idx = list.findIndex(p => String(p.PO_ID || '').trim() === String(poId).trim());
  if (idx !== -1) {
    const now = new Date().toISOString();
    list[idx].Status = newStatus;
    list[idx].UpdatedAt = now;
    if (newStatus === 'Received') {
      list[idx].ReceivedBy = receivedBy;
      list[idx].ReceivedAt = now;
    }
    saveLocalPurchaseOrders(list);
  }
  return list;
}

export function getLocalSupplierLedger() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.SUPPLIER_LEDGER);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalSupplierLedger(entries) {
  setSecureStorageItem(STORAGE_KEYS.SUPPLIER_LEDGER, Array.isArray(entries) ? entries : []);
}

export function recordSupplierLedgerEntryLocally(entryData) {
  if (!entryData) return getLocalSupplierLedger();
  const ledger = getLocalSupplierLedger();
  const now = new Date().toISOString();

  const newEntry = {
    LedgerID: entryData.LedgerID || `SUP-LED-${Date.now().toString().slice(-6)}`,
    Timestamp: entryData.Timestamp || now,
    SupplierID: entryData.SupplierID || '',
    SupplierName: entryData.SupplierName || '',
    SupplierPhone: entryData.SupplierPhone || '',
    PO_ID: entryData.PO_ID || '',
    EntryType: entryData.EntryType || 'Purchase',
    Debit: Number(entryData.Debit) || 0,
    Credit: Number(entryData.Credit) || 0,
    Balance: Number(entryData.Balance) || 0,
    PaymentMethod: entryData.PaymentMethod || 'Cash',
    TrxID: entryData.TrxID || '',
    CollectedBy: entryData.CollectedBy || 'Admin',
    Notes: entryData.Notes || ''
  };

  ledger.unshift(newEntry);
  saveLocalSupplierLedger(ledger);
  return ledger;
}

/**
 * ============================================================================
 * Phase 5: দৈনন্দিন খরচের খাতা (Expense Management)
 * ============================================================================
 */

export const EXPENSE_CATEGORIES = [
  { id: 'Rent', name: 'দোকান ভাড়া (Rent)', icon: 'Building2', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'Utility', name: 'বিদ্যুৎ ও ইন্টারনেট বিল (Utility)', icon: 'Zap', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'Salary', name: 'স্টাফ বেতন ও বোনাস (Salary)', icon: 'Users', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'Refreshments', name: 'আপ্যায়ন ও চা-নাস্তা (Refreshments)', icon: 'Coffee', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 'Transport', name: 'যাতায়াত ও কুরিয়ার খরচ (Transport)', icon: 'Truck', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'Packaging', name: 'প্যাকেজিং সামগ্রী ও ব্যাগ (Packaging)', icon: 'Package', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'Maintenance', name: 'মেরামত ও পরিচ্ছন্নতা (Maintenance)', icon: 'Wrench', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { id: 'Marketing', name: 'বিজ্ঞাপন ও প্রচারণা (Marketing)', icon: 'Megaphone', color: 'text-pink-600 bg-pink-50 border-pink-200' },
  { id: 'Other', name: 'অন্যান্য সাধারণ ব্যয় (Other)', icon: 'FileText', color: 'text-slate-600 bg-slate-50 border-slate-200' }
];

export function getLocalExpenses() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.EXPENSES);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalExpenses(expenses) {
  setSecureStorageItem(STORAGE_KEYS.EXPENSES, Array.isArray(expenses) ? expenses : []);
}

export function saveOrUpdateExpenseLocally(expenseData) {
  if (!expenseData) return getLocalExpenses();
  const expenses = getLocalExpenses();
  const now = new Date().toISOString();
  const dateStr = expenseData.Date || expenseData.date || now.split('T')[0];

  const expenseId = expenseData.ExpenseID || expenseData.expenseId || `EXP-${Date.now().toString().slice(-6)}`;

  const record = {
    ExpenseID: expenseId,
    Date: dateStr,
    Category: expenseData.Category || expenseData.category || 'Other',
    Amount: Number(expenseData.Amount !== undefined ? expenseData.Amount : expenseData.amount) || 0,
    PaymentMethod: expenseData.PaymentMethod || expenseData.paymentMethod || 'Cash',
    Description: expenseData.Description || expenseData.description || '',
    ReceiptImage: expenseData.ReceiptImage || expenseData.receiptImage || '',
    CreatedBy: expenseData.CreatedBy || expenseData.createdBy || 'Admin',
    Timestamp: expenseData.Timestamp || now
  };

  const existingIdx = expenses.findIndex(e => String(e.ExpenseID).trim() === String(expenseId).trim());
  if (existingIdx !== -1) {
    expenses[existingIdx] = { ...expenses[existingIdx], ...record };
  } else {
    expenses.unshift(record);
  }

  saveLocalExpenses(expenses);
  return expenses;
}

export function deleteExpenseLocally(expenseId) {
  if (!expenseId) return getLocalExpenses();
  const expenses = getLocalExpenses();
  const filtered = expenses.filter(e => String(e.ExpenseID).trim() !== String(expenseId).trim());
  saveLocalExpenses(filtered);
  return filtered;
}

/**
 * ============================================================================
 * Phase 5: দৈনিক ক্যাশ ড্রয়ার ও EOD ক্লোজিং (Daily Cash Register & EOD)
 * ============================================================================
 */

export function getLocalCashRegisters() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.CASH_REGISTERS);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalCashRegisters(registers) {
  setSecureStorageItem(STORAGE_KEYS.CASH_REGISTERS, Array.isArray(registers) ? registers : []);
}

export function getActiveCashRegister() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.ACTIVE_REGISTER);
    if (data && data.Status === 'Open') return data;
    // ব্যাকআপ চেক: registers তালিকা থেকে Open সেশন খোঁজা
    const registers = getLocalCashRegisters();
    const openSession = registers.find(r => r.Status === 'Open');
    return openSession || null;
  } catch (e) {
    return null;
  }
}

export function saveActiveCashRegister(registerSession) {
  if (!registerSession || registerSession.Status !== 'Open') {
    removeSecureStorageItem(STORAGE_KEYS.ACTIVE_REGISTER);
  } else {
    setSecureStorageItem(STORAGE_KEYS.ACTIVE_REGISTER, registerSession);
  }
}

export function openCashRegisterLocally({ openingBalance = 0, openedBy = 'Admin', notes = '' }) {
  const registers = getLocalCashRegisters();
  const now = new Date().toISOString();
  const registerId = `REG-${Date.now().toString().slice(-6)}`;

  const newSession = {
    RegisterID: registerId,
    OpeningDate: now,
    ClosingDate: '',
    OpeningBalance: Number(openingBalance) || 0,
    CashSales: 0,
    CashIn: 0,
    CashOut: 0,
    ExpectedCash: Number(openingBalance) || 0,
    ActualCash: 0,
    Difference: 0,
    Status: 'Open',
    ClosedBy: openedBy,
    Notes: notes,
    Timestamp: now
  };

  registers.unshift(newSession);
  saveLocalCashRegisters(registers);
  saveActiveCashRegister(newSession);
  return newSession;
}

export function closeCashRegisterLocally({
  registerId,
  actualCash = 0,
  cashSales = 0,
  cashIn = 0,
  cashOut = 0,
  expectedCash = 0,
  closedBy = 'Admin',
  notes = ''
}) {
  const registers = getLocalCashRegisters();
  const now = new Date().toISOString();
  const numActual = Number(actualCash) || 0;
  const numExpected = Number(expectedCash) || 0;
  const diff = numActual - numExpected;

  let targetIdx = -1;
  if (registerId) {
    targetIdx = registers.findIndex(r => String(r.RegisterID).trim() === String(registerId).trim());
  }
  if (targetIdx === -1) {
    targetIdx = registers.findIndex(r => r.Status === 'Open');
  }

  let closedRecord = null;
  if (targetIdx !== -1) {
    registers[targetIdx] = {
      ...registers[targetIdx],
      ClosingDate: now,
      CashSales: Number(cashSales) || 0,
      CashIn: Number(cashIn) || 0,
      CashOut: Number(cashOut) || 0,
      ExpectedCash: numExpected,
      ActualCash: numActual,
      Difference: diff,
      Status: 'Closed',
      ClosedBy: closedBy,
      Notes: notes,
      Timestamp: now
    };
    closedRecord = registers[targetIdx];
  } else {
    closedRecord = {
      RegisterID: registerId || `REG-${Date.now().toString().slice(-6)}`,
      OpeningDate: now,
      ClosingDate: now,
      OpeningBalance: 0,
      CashSales: Number(cashSales) || 0,
      CashIn: Number(cashIn) || 0,
      CashOut: Number(cashOut) || 0,
      ExpectedCash: numExpected,
      ActualCash: numActual,
      Difference: diff,
      Status: 'Closed',
      ClosedBy: closedBy,
      Notes: notes,
      Timestamp: now
    };
    registers.unshift(closedRecord);
  }

  saveLocalCashRegisters(registers);
  saveActiveCashRegister(null);
  return closedRecord;
}

/**
 * ============================================================================
 * Phase 5: সিকিউরিটি ও অ্যাক্টিভিটি অডিট ট্রেইল (Activity Audit Trail)
 * ============================================================================
 */

export function getLocalAuditLogs() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.AUDIT_LOGS);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalAuditLogs(logs) {
  setSecureStorageItem(STORAGE_KEYS.AUDIT_LOGS, Array.isArray(logs) ? logs.slice(0, 500) : []);
}

export function logAuditEventLocally({
  userId = 'USER-ADMIN-01',
  userName = 'Admin',
  userRole = 'Admin',
  actionType = 'GENERAL',
  module = 'Core',
  description = '',
  details = null
}) {
  const logs = getLocalAuditLogs();
  const now = new Date().toISOString();

  const newLog = {
    LogID: `LOG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
    Timestamp: now,
    UserID: userId,
    UserName: userName,
    UserRole: userRole,
    ActionType: actionType,
    Module: module,
    Description: description,
    DetailsJson: typeof details === 'string' ? details : (details ? JSON.stringify(details) : '')
  };

  logs.unshift(newLog);
  // সর্বোচ্চ ৫০০টি লগ সংরক্ষণ যেন মেমোরি হালকা থাকে
  saveLocalAuditLogs(logs.slice(0, 500));
  return newLog;
}

/**
 * ============================================================================
 * Phase 7: পণ্য বিক্রয় রিটার্ন ও রিফান্ড (Sales Returns & Refunds)
 * ============================================================================
 */
export function getLocalSalesReturns() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.SALES_RETURNS);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalSalesReturns(returns) {
  setSecureStorageItem(STORAGE_KEYS.SALES_RETURNS, Array.isArray(returns) ? returns : []);
}

export function saveSalesReturnLocally(returnData) {
  if (!returnData) return { record: null, returns: getLocalSalesReturns() };
  const returns = getLocalSalesReturns();
  const now = new Date().toISOString();
  const returnId = returnData.ReturnID || returnData.returnId || `RET-${Date.now().toString().slice(-6)}`;

  const rawItems = returnData.Items || returnData.items || [];
  let parsedItems = rawItems;
  if (typeof rawItems === 'string') {
    try {
      parsedItems = JSON.parse(rawItems);
    } catch {
      parsedItems = [];
    }
  }

  const record = {
    ReturnID: returnId,
    InvoiceNo: returnData.InvoiceNo || returnData.invoiceNo || '',
    ReturnDate: returnData.ReturnDate || returnData.returnDate || now,
    CustomerID: returnData.CustomerID || returnData.customerId || 'GUEST',
    CustomerName: returnData.CustomerName || returnData.customerName || 'Walk-in Customer',
    CustomerPhone: returnData.CustomerPhone || returnData.customerPhone || '',
    Items: Array.isArray(parsedItems) ? parsedItems : [],
    TotalItems: returnData.TotalItems !== undefined ? returnData.TotalItems : (Array.isArray(parsedItems) ? parsedItems.length : 0),
    TotalRefundAmount: Number(returnData.TotalRefundAmount !== undefined ? returnData.TotalRefundAmount : returnData.totalRefundAmount) || 0,
    RefundMethod: returnData.RefundMethod || returnData.refundMethod || 'Cash', // 'Cash' | 'StoreCredit' | 'DeductDue' | 'Exchange'
    CreditNoteCode: returnData.CreditNoteCode || returnData.creditNoteCode || '',
    CreditNoteExpiry: returnData.CreditNoteExpiry || returnData.creditNoteExpiry || '',
    CreditNoteStatus: returnData.CreditNoteStatus || returnData.creditNoteStatus || (returnData.CreditNoteCode ? 'Active' : 'None'),
    Reason: returnData.Reason || returnData.reason || 'Customer Return',
    ProcessedBy: returnData.ProcessedBy || returnData.processedBy || 'Cashier',
    Timestamp: returnData.Timestamp || now
  };

  const existingIdx = returns.findIndex(r => String(r.ReturnID).trim() === String(returnId).trim());
  if (existingIdx !== -1) {
    returns[existingIdx] = { ...returns[existingIdx], ...record };
  } else {
    returns.unshift(record);
  }

  saveLocalSalesReturns(returns);
  return { record, returns };
}

export function redeemStoreCreditLocally(creditNoteCode, cashier = 'Cashier') {
  if (!creditNoteCode) return { success: false, message: 'ভাউচার কোড দিন।' };
  const target = String(creditNoteCode).trim().toUpperCase();
  const returns = getLocalSalesReturns();

  const idx = returns.findIndex(r => String(r.CreditNoteCode || '').trim().toUpperCase() === target);
  if (idx === -1) {
    return { success: false, message: `স্টোর ক্রেডিট ভাউচার '${target}' পাওয়া যায়নি।` };
  }

  const record = returns[idx];
  if (record.CreditNoteStatus === 'Redeemed') {
    return { success: false, message: `ভাউচার '${target}' ইতিমধ্যে ব্যবহার করা হয়েছে!` };
  }

  if (record.CreditNoteExpiry && new Date() > new Date(record.CreditNoteExpiry)) {
    return { success: false, message: `ভাউচার '${target}'-এর মেয়াদ উত্তীর্ণ হয়ে গেছে!` };
  }

  returns[idx] = {
    ...record,
    CreditNoteStatus: 'Redeemed',
    RedeemedAt: new Date().toISOString(),
    RedeemedBy: cashier
  };

  saveLocalSalesReturns(returns);
  return {
    success: true,
    message: `স্টোর ক্রেডিট সফলভাবে ব্যবহৃত হয়েছে! (৳${record.TotalRefundAmount})`,
    creditAmount: Number(record.TotalRefundAmount) || 0,
    record: returns[idx]
  };
}

/**
 * ============================================================================
 * Phase 7: গোডাউন ও দোকান স্টক ট্রান্সফার চালান (Stock Transfers)
 * ============================================================================
 */
export function getLocalStockTransfers() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.STOCK_TRANSFERS);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalStockTransfers(transfers) {
  setSecureStorageItem(STORAGE_KEYS.STOCK_TRANSFERS, Array.isArray(transfers) ? transfers : []);
}

export function saveStockTransferLocally(transferData) {
  if (!transferData) return { record: null, transfers: getLocalStockTransfers() };
  const transfers = getLocalStockTransfers();
  const now = new Date().toISOString();
  const transferId = transferData.TransferID || transferData.transferId || `TRF-${Date.now().toString().slice(-6)}`;
  const challanNo = transferData.ChallanNo || transferData.challanNo || `CHL-${Date.now().toString().slice(-6)}`;

  const rawItems = transferData.Items || transferData.items || [];
  let parsedItems = rawItems;
  if (typeof rawItems === 'string') {
    try {
      parsedItems = JSON.parse(rawItems);
    } catch {
      parsedItems = [];
    }
  }

  const items = Array.isArray(parsedItems) ? parsedItems : [];
  const totalQty = items.reduce((sum, itm) => sum + (Number(itm.quantity || itm.Quantity || 0)), 0);

  const record = {
    TransferID: transferId,
    ChallanNo: challanNo,
    TransferDate: transferData.TransferDate || transferData.transferDate || now,
    FromLocation: transferData.FromLocation || transferData.fromLocation || 'Main Warehouse',
    ToLocation: transferData.ToLocation || transferData.toLocation || 'Main Shop',
    Items: items,
    TotalItems: items.length,
    TotalQuantity: totalQty,
    Status: transferData.Status || transferData.status || 'In Transit', // 'Pending' | 'In Transit' | 'Received' | 'Cancelled'
    DriverName: transferData.DriverName || transferData.driverName || '',
    Notes: transferData.Notes || transferData.notes || '',
    CreatedBy: transferData.CreatedBy || transferData.createdBy || 'Admin',
    ReceivedBy: transferData.ReceivedBy || transferData.receivedBy || '',
    CreatedAt: transferData.CreatedAt || transferData.createdAt || now,
    UpdatedAt: now
  };

  const existingIdx = transfers.findIndex(t => String(t.TransferID).trim() === String(transferId).trim());
  if (existingIdx !== -1) {
    transfers[existingIdx] = { ...transfers[existingIdx], ...record };
  } else {
    transfers.unshift(record);
  }

  saveLocalStockTransfers(transfers);
  return { record, transfers };
}

export function updateStockTransferStatusLocally(transferId, newStatus, receivedBy = 'Manager') {
  if (!transferId || !newStatus) return { record: null, transfers: getLocalStockTransfers() };
  const transfers = getLocalStockTransfers();
  const now = new Date().toISOString();

  const idx = transfers.findIndex(t => 
    String(t.TransferID).trim() === String(transferId).trim() ||
    String(t.ChallanNo).trim() === String(transferId).trim()
  );

  if (idx !== -1) {
    transfers[idx] = {
      ...transfers[idx],
      Status: newStatus,
      ReceivedBy: newStatus === 'Received' ? receivedBy : (transfers[idx].ReceivedBy || ''),
      UpdatedAt: now
    };
    saveLocalStockTransfers(transfers);
    return { record: transfers[idx], transfers };
  }

  return { record: null, transfers };
}

/**
 * ============================================================================
 * Phase 8: উন্নত বিজনেস অ্যানালিটিক্স, আরএফএম কাস্টমার সেগমেন্টেশন ও সিএসভি এক্সপোর্ট
 * ============================================================================
 */

/**
 * গ্রাহকদের কেনাকাটার হিসেব অনুযায়ী RFM সেগমেন্টেশন বিশ্লেষণ
 * @param {Array} customers - নিবন্ধিত গ্রাহক তালিকা
 * @param {Array} salesHistory - অফলাইন পিওএস বিক্রয় ইতিহাস
 * @param {Array} orders - ওমনিচ্যানেল অর্ডার তালিকা
 * @returns {Object} সেগমেন্ট বিশ্লেষণ ফলাফল ও গ্রাহক তালিকা
 */
export function calculateRFMSegmentation(customers = [], salesHistory = [], orders = []) {
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeSales = Array.isArray(salesHistory) ? salesHistory : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const now = new Date();

  // গ্রাহক ফোন এবং নাম ভিত্তিক লেনদেন মানচিত্র (Map) তৈরি
  const customerMap = new Map();

  // ১. প্রাথমিক গ্রাহক রেজিস্ট্রি লোড
  safeCustomers.forEach((c) => {
    const phone = String(c.Phone || c.phone || '').trim();
    const id = String(c.CustomerID || c.id || phone).trim();
    const name = c.FullName || c.Name || c.name || 'সম্মানিত ক্রেতা';

    if (phone || id) {
      const key = phone || id;
      customerMap.set(key, {
        customerId: id,
        name: name,
        phone: phone,
        email: c.Email || c.email || '',
        currentDue: Number(c.CurrentDue || 0),
        loyaltyPoints: Number(c.LoyaltyPoints || 0),
        totalOrders: 0,
        totalSpent: 0,
        lastPurchaseDate: null,
        daysSinceLastPurchase: 999,
        purchasedItems: [],
        firstPurchaseDate: null
      });
    }
  });

  // ২. সেলস হিস্ট্রি থেকে ট্রানজেকশন প্রসেসিং
  safeSales.forEach((sale) => {
    const phone = String(sale.customerPhone || sale.CustomerPhone || '').trim();
    const name = String(sale.customerName || sale.CustomerName || '').trim();
    const key = phone || name;

    if (!key || key.toLowerCase() === 'walk-in' || key.toLowerCase() === 'walk-in customer') return;

    let cust = customerMap.get(phone) || customerMap.get(key);
    if (!cust) {
      cust = {
        customerId: sale.customerId || `CUST-${phone.slice(-4) || 'GUEST'}`,
        name: name || 'কাউন্টার ক্রেতা',
        phone: phone,
        email: '',
        currentDue: 0,
        loyaltyPoints: 0,
        totalOrders: 0,
        totalSpent: 0,
        lastPurchaseDate: null,
        daysSinceLastPurchase: 999,
        purchasedItems: [],
        firstPurchaseDate: null
      };
      customerMap.set(key, cust);
    }

    const saleAmount = Number(sale.grandTotal || sale.GrandTotal || sale.totalAmount || 0);
    const dateStr = sale.timestamp || sale.date || sale.Timestamp || sale.Date;
    const saleDate = dateStr ? new Date(dateStr) : null;

    cust.totalOrders += 1;
    cust.totalSpent += saleAmount;

    if (saleDate && !isNaN(saleDate.getTime())) {
      if (!cust.lastPurchaseDate || saleDate > cust.lastPurchaseDate) {
        cust.lastPurchaseDate = saleDate;
      }
      if (!cust.firstPurchaseDate || saleDate < cust.firstPurchaseDate) {
        cust.firstPurchaseDate = saleDate;
      }
    }
  });

  // ৩. অনলাইন ও ওমনিচ্যানেল অর্ডার থেকে প্রসেসিং
  safeOrders.forEach((ord) => {
    const phone = String(ord.CustomerPhone || ord.customerPhone || '').trim();
    const name = String(ord.CustomerName || ord.customerName || '').trim();
    const key = phone || name;

    if (!key) return;

    let cust = customerMap.get(phone) || customerMap.get(key);
    if (!cust) {
      cust = {
        customerId: ord.CustomerID || `CUST-${phone.slice(-4) || 'GUEST'}`,
        name: name || 'অনলাইন ক্রেতা',
        phone: phone,
        email: ord.CustomerEmail || '',
        currentDue: 0,
        loyaltyPoints: 0,
        totalOrders: 0,
        totalSpent: 0,
        lastPurchaseDate: null,
        daysSinceLastPurchase: 999,
        purchasedItems: [],
        firstPurchaseDate: null
      };
      customerMap.set(key, cust);
    }

    const ordAmount = Number(ord.TotalAmount || ord.totalAmount || 0);
    const ordDateStr = ord.OrderDate || ord.CreatedAt || ord.orderDate;
    const ordDate = ordDateStr ? new Date(ordDateStr) : null;

    cust.totalOrders += 1;
    cust.totalSpent += ordAmount;

    if (ordDate && !isNaN(ordDate.getTime())) {
      if (!cust.lastPurchaseDate || ordDate > cust.lastPurchaseDate) {
        cust.lastPurchaseDate = ordDate;
      }
      if (!cust.firstPurchaseDate || ordDate < cust.firstPurchaseDate) {
        cust.firstPurchaseDate = ordDate;
      }
    }
  });

  // ৪. RFM মেট্রিক্স ও সেগমেন্ট নির্ধারণ
  const customerList = Array.from(customerMap.values());
  const totalRevenue = customerList.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgSpend = customerList.length > 0 ? totalRevenue / customerList.length : 1;

  const segments = {
    champions: [],     // ভিআইপি ক্রেতা: সম্প্রতি এসেছে, ঘনঘন ও বেশি কেনাকাটা
    loyal: [],         // বিশ্বস্ত নিয়মিত ক্রেতা
    new_customers: [], // নতুন গ্রাহক (৩০ দিনের মধ্যে প্রথম কেনাকাটা)
    at_risk: [],       // হারিয়ে যাওয়ার ঝুঁকিতে (৬০-১৮০ দিন কোনো ক্রয় নেই)
    lost: [],          // নিষ্ক্রিয় গ্রাহক (১৮০+ দিন কোনো ক্রয় নেই)
    regular: []        // সাধারণ ক্রেতা
  };

  customerList.forEach((cust) => {
    if (cust.lastPurchaseDate) {
      const diffTime = Math.abs(now - cust.lastPurchaseDate);
      cust.daysSinceLastPurchase = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } else {
      cust.daysSinceLastPurchase = 999;
    }

    const r = cust.daysSinceLastPurchase;
    const f = cust.totalOrders;
    const m = cust.totalSpent;

    let segmentTag = 'regular';
    let segmentLabel = 'সাধারণ গ্রাহক';
    let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';

    if (r <= 35 && f >= 3 && m >= avgSpend * 1.2) {
      segmentTag = 'champions';
      segmentLabel = '👑 চ্যাম্পিয়ন (VIP)';
      badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
      segments.champions.push(cust);
    } else if (r <= 60 && f >= 2) {
      segmentTag = 'loyal';
      segmentLabel = '💎 বিশ্বস্ত ক্রেতা (Loyal)';
      badgeColor = 'bg-indigo-100 text-indigo-900 border-indigo-300';
      segments.loyal.push(cust);
    } else if (r <= 35 && f === 1) {
      segmentTag = 'new_customers';
      segmentLabel = '🌱 নতুন গ্রাহক (New)';
      badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
      segments.new_customers.push(cust);
    } else if (r > 60 && r <= 180 && f >= 1) {
      segmentTag = 'at_risk';
      segmentLabel = '⚠️ ঝুঁকিপূর্ণ (At-Risk)';
      badgeColor = 'bg-rose-100 text-rose-900 border-rose-300';
      segments.at_risk.push(cust);
    } else if (r > 180) {
      segmentTag = 'lost';
      segmentLabel = '💤 নিষ্ক্রিয় (Lost)';
      badgeColor = 'bg-slate-200 text-slate-700 border-slate-300';
      segments.lost.push(cust);
    } else {
      segments.regular.push(cust);
    }

    cust.segmentTag = segmentTag;
    cust.segmentLabel = segmentLabel;
    cust.badgeColor = badgeColor;
  });

  return {
    totalCustomers: customerList.length,
    totalRevenue,
    avgSpend,
    segments,
    allCustomers: customerList.sort((a, b) => b.totalSpent - a.totalSpent)
  };
}

/**
 * স্লো-মুভিং ও ডেড স্টক (অচল পণ্য) বিশ্লেষণ
 * @param {Array} products - পণ্য ডাটাবেস
 * @param {Array} salesHistory - বিক্রয় ইতিহাস
 * @param {Array} orders - ওমনিচ্যানেল অর্ডার
 * @param {number} daysThreshold - অচলাবস্থা গণ্য করার দিন (ডিফল্ট ৬০ দিন)
 */
export function calculateDeadStockAnalysis(products = [], salesHistory = [], orders = [], daysThreshold = 60) {
  const safeProducts = Array.isArray(products) ? products : [];
  const safeSales = Array.isArray(salesHistory) ? salesHistory : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const now = new Date();

  // প্রতিটি পণ্যের শেষ বিক্রয় তারিখ বের করা
  const lastSoldMap = new Map();

  safeSales.forEach((s) => {
    const sDate = s.timestamp || s.date ? new Date(s.timestamp || s.date) : null;
    if (!sDate || isNaN(sDate.getTime())) return;

    (s.items || []).forEach((itm) => {
      const pid = String(itm.productId || itm.id || '').trim();
      const existing = lastSoldMap.get(pid);
      if (!existing || sDate > existing) {
        lastSoldMap.set(pid, sDate);
      }
    });
  });

  safeOrders.forEach((o) => {
    const oDate = o.OrderDate || o.CreatedAt ? new Date(o.OrderDate || o.CreatedAt) : null;
    if (!oDate || isNaN(oDate.getTime())) return;

    (o.Items || []).forEach((itm) => {
      const pid = String(itm.productId || itm.ProductID || '').trim();
      const existing = lastSoldMap.get(pid);
      if (!existing || oDate > existing) {
        lastSoldMap.set(pid, oDate);
      }
    });
  });

  const deadStockItems = [];
  let totalBlockedCapital = 0;
  let totalStagnantUnits = 0;

  safeProducts.forEach((p) => {
    const pid = String(p.ProductID || p.id || '').trim();
    const stock = Number(p.StockQuantity || p.stock || 0);
    const cost = Number(p.CostPrice || p.costPrice || 0);
    const price = Number(p.SellingPrice || p.sellingPrice || 0);

    // শুধুমাত্র যেসব পণ্যের বর্তমানে স্টক আছে
    if (stock > 0) {
      const lastSold = lastSoldMap.get(pid);
      let daysStagnant = 999;
      let hasSoldBefore = false;

      if (lastSold) {
        hasSoldBefore = true;
        const diff = Math.abs(now - lastSold);
        daysStagnant = Math.floor(diff / (1000 * 60 * 60 * 24));
      }

      if (daysStagnant >= daysThreshold) {
        const blockedMoney = stock * cost;
        totalBlockedCapital += blockedMoney;
        totalStagnantUnits += stock;

        deadStockItems.push({
          productId: pid,
          productName: p.ProductName || p.productName || 'অজ্ঞাত পণ্য',
          barcode: p.Barcode || p.barcode || 'N/A',
          category: p.Category || p.category || 'General',
          stockQuantity: stock,
          costPrice: cost,
          sellingPrice: price,
          blockedCapital: blockedMoney,
          daysStagnant: daysStagnant,
          hasSoldBefore: hasSoldBefore,
          lastSoldDate: lastSold ? lastSold.toLocaleDateString('bn-BD') : 'কখনও বিক্রি হয়নি',
          suggestedDiscount: daysStagnant >= 120 ? 30 : (daysStagnant >= 90 ? 20 : 15)
        });
      }
    }
  });

  return {
    thresholdDays: daysThreshold,
    totalStagnantItems: deadStockItems.length,
    totalStagnantUnits,
    totalBlockedCapital,
    items: deadStockItems.sort((a, b) => b.blockedCapital - a.blockedCapital)
  };
}

/**
 * বাংলা ও ইংরেজি সমর্থিত UTF-8 BOM সহ প্রফেশনাল CSV এক্সপোর্ট ইঞ্জিন
 * @param {string} filename - ফাইলের নাম (যেমন: sales_report.csv)
 * @param {Array<string>} headers - কলামের হেডার অ্যারে
 * @param {Array<Array>} rows - ডাটার সারি অ্যারে
 */
export function exportToCSV(filename, headers = [], rows = []) {
  try {
    const csvContent = [
      headers.map(h => `"${String(h || '').replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => 
        row.map(cell => {
          if (cell === null || cell === undefined) return '""';
          const str = String(cell).replace(/"/g, '""');
          return `"${str}"`;
        }).join(',')
      )
    ].join('\r\n');

    // UTF-8 BOM (\uFEFF) যাতে এক্সেল সরাসরি বাংলা ফন্ট ও বিশেষ ক্যারেক্টার সঠিক দেখাতে পারে
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('CSV Export Error:', err);
    return false;
  }
}

/**
 * এসএমএস ক্যাম্পেইন হিস্ট্রি লোকাল স্টোরেজ হেল্পার
 */
export function getLocalCampaigns() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.CAMPAIGNS);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalCampaigns(campaigns) {
  setSecureStorageItem(STORAGE_KEYS.CAMPAIGNS, Array.isArray(campaigns) ? campaigns.slice(0, 100) : []);
}

export function saveCampaignLocally(campaignData) {
  if (!campaignData) return getLocalCampaigns();
  const campaigns = getLocalCampaigns();
  const now = new Date().toISOString();

  const record = {
    CampaignID: campaignData.CampaignID || `CAMP-${Date.now().toString().slice(-6)}`,
    Title: campaignData.Title || campaignData.title || 'SMS Campaign',
    TargetSegment: campaignData.TargetSegment || campaignData.targetSegment || 'All',
    MessageTemplate: campaignData.MessageTemplate || campaignData.message || '',
    RecipientCount: Number(campaignData.RecipientCount || campaignData.recipientCount || 0),
    SuccessCount: Number(campaignData.SuccessCount || campaignData.successCount || 0),
    Status: campaignData.Status || campaignData.status || 'Sent',
    SentBy: campaignData.SentBy || campaignData.sentBy || 'Admin',
    SentAt: now
  };

  campaigns.unshift(record);
  saveLocalCampaigns(campaigns);
  return record;
}

// ============================================================================
// টেইলারিং ও সেলাই অর্ডার ব্যবস্থাপনা (Phase 2: Tailoring & Custom Stitching)
// ============================================================================

export const DEFAULT_TAILOR_MASTERS = [
  {
    TailorID: 'TLR-01',
    Name: 'মাস্টার বশির আহমেদ',
    Phone: '01710000001',
    Speciality: 'পাঞ্জাবি ও শেরওয়ানি',
    Experience: '১২ বছর',
    Status: 'Active'
  },
  {
    TailorID: 'TLR-02',
    Name: 'আকরাম আলী',
    Phone: '01820000002',
    Speciality: 'ফরমাল শার্ট ও প্যান্ট',
    Experience: '৮ বছর',
    Status: 'Active'
  },
  {
    TailorID: 'TLR-03',
    Name: 'রাবেয়া খাতুন',
    Phone: '01930000003',
    Speciality: 'মহিলাদের কামিজ, বোরকা ও ব্লাউজ',
    Experience: '১০ বছর',
    Status: 'Active'
  }
];

export const DEFAULT_TAILORING_ORDERS = [
  {
    OrderID: 'TL-20261020-001',
    TokenNo: '101',
    CustomerName: 'মো: রফিকুল ইসলাম',
    CustomerPhone: '01711223344',
    CustomerAddress: 'বসতি হাউজিং, মোহাম্মদপুর',
    GarmentType: 'পাঞ্জাবি',
    Quantity: 1,
    FabricSource: 'store',
    FabricName: 'প্রিমিয়াম সুতি থান কাপড় (সাদা)',
    FabricYards: 2.5,
    TailorMaster: 'মাস্টার বশির আহমেদ',
    Measurements: {
      length: '40',
      chest: '38',
      waist: '36',
      shoulder: '17',
      sleeve: '24',
      collar: '15.5',
      armhole: '18',
      cuff: '9.5',
      flair: '26',
      pocket: 'দুই পাশে কাট পকেট'
    },
    DesignDetails: 'ব্যান্ড কলার, মেটাল রিভেট বোতাম, ডাবল সেলাই ফিনিশিং',
    StitchingCharge: 450,
    AccessoriesCharge: 100,
    TotalAmount: 550,
    AdvancePaid: 300,
    DueAmount: 250,
    PaymentMethod: 'Cash',
    Status: 'Stitching', // Pending -> Cutting -> Stitching -> Ready -> Delivered
    OrderDate: '2026-10-20T10:30:00.000Z',
    DeliveryDate: '2026-10-24T18:00:00.000Z',
    Notes: 'ব্যান্ড কলারে হালকা সুতার এমব্রয়ডারি ডিজাইন হবে',
    StatusHistory: [
      { status: 'Pending', timestamp: '2026-10-20T10:30:00.000Z', note: 'অর্ডার গৃহীত হয়েছে ও ৩০০ টাকা অগ্রিম জমা' },
      { status: 'Cutting', timestamp: '2026-10-21T11:00:00.000Z', note: 'মাস্টার বশির কাটিং সম্পন্ন করেছেন' },
      { status: 'Stitching', timestamp: '2026-10-22T09:00:00.000Z', note: 'সেলাই চলছে' }
    ]
  },
  {
    OrderID: 'TL-20261021-002',
    TokenNo: '102',
    CustomerName: 'তানভীর আহমেদ',
    CustomerPhone: '01822334455',
    CustomerAddress: 'ধানমন্ডি ২৭, ঢাকা',
    GarmentType: 'শার্ট',
    Quantity: 2,
    FabricSource: 'store',
    FabricName: 'রেমি কটন প্রিন্ট থান',
    FabricYards: 4.5,
    TailorMaster: 'আকরাম আলী',
    Measurements: {
      length: '29',
      chest: '39',
      waist: '36',
      shoulder: '18',
      sleeve: '24',
      collar: '15.5',
      armhole: '18.5',
      cuff: '9.5',
      pocket: '১টি বুক পকেট'
    },
    DesignDetails: 'স্মার্ট সেমি-স্প্রেড কলার, রেগুলার ফিট, মার্বেল বোতাম',
    StitchingCharge: 700,
    AccessoriesCharge: 100,
    TotalAmount: 800,
    AdvancePaid: 500,
    DueAmount: 300,
    PaymentMethod: 'bKash',
    Status: 'Cutting',
    OrderDate: '2026-10-21T14:15:00.000Z',
    DeliveryDate: '2026-10-25T17:00:00.000Z',
    Notes: 'একটি ফুল হাতা এবং একটি হাফ হাতা শার্ট',
    StatusHistory: [
      { status: 'Pending', timestamp: '2026-10-21T14:15:00.000Z', note: 'বিকাশে ৫০০ টাকা অগ্রিম গৃহীত' },
      { status: 'Cutting', timestamp: '2026-10-22T10:30:00.000Z', note: 'কাটিং টেবিল এ দেওয়া হয়েছে' }
    ]
  },
  {
    OrderID: 'TL-20261019-003',
    TokenNo: '103',
    CustomerName: 'নাসরিন আক্তার',
    CustomerPhone: '01933445566',
    CustomerAddress: 'বসিলা গার্ডেন সিটি, ঢাকা',
    GarmentType: 'কামিজ ও সালোয়ার',
    Quantity: 1,
    FabricSource: 'customer',
    FabricName: 'গ্রাহকের নিজস্ব জর্জেট থান কাপড়',
    FabricYards: 3.5,
    TailorMaster: 'রাবেয়া খাতুন',
    Measurements: {
      length: '42',
      chest: '36',
      waist: '32',
      hip: '38',
      shoulder: '14.5',
      sleeve: '19',
      armhole: '16',
      frontNeck: '6',
      backNeck: '5',
      slit: '20'
    },
    DesignDetails: 'পান গলা, বেল হাতা, সুতি আস্তরণ দেওয়া হবে',
    StitchingCharge: 450,
    AccessoriesCharge: 50,
    TotalAmount: 500,
    AdvancePaid: 500,
    DueAmount: 0,
    PaymentMethod: 'Cash',
    Status: 'Ready',
    OrderDate: '2026-10-19T16:00:00.000Z',
    DeliveryDate: '2026-10-22T20:00:00.000Z',
    Notes: 'কাজ সম্পূর্ণ শেষ, কাস্টমারকে এসএমএস পাঠানো হয়েছে',
    StatusHistory: [
      { status: 'Pending', timestamp: '2026-10-19T16:00:00.000Z', note: 'অর্ডার গৃহীত ও ফুল পেমেন্ট কমপ্লিট' },
      { status: 'Cutting', timestamp: '2026-10-20T11:00:00.000Z', note: 'কাটিং সম্পন্ন' },
      { status: 'Stitching', timestamp: '2026-10-21T15:30:00.000Z', note: 'সেলাই সম্পন্ন' },
      { status: 'Ready', timestamp: '2026-10-22T11:00:00.000Z', note: 'প্যাকিং ও আয়রন শেষ, ডেলিভারির জন্য প্রস্তুত' }
    ]
  }
];

export function getLocalTailoringOrders() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.TAILORING_ORDERS);
    return Array.isArray(data) && data.length > 0 ? data : DEFAULT_TAILORING_ORDERS;
  } catch (e) {
    return DEFAULT_TAILORING_ORDERS;
  }
}

export function saveLocalTailoringOrders(orders) {
  setSecureStorageItem(STORAGE_KEYS.TAILORING_ORDERS, Array.isArray(orders) ? orders : []);
}

export function addTailoringOrderLocally(orderData) {
  if (!orderData) return getLocalTailoringOrders();
  const orders = getLocalTailoringOrders();
  const now = new Date().toISOString();
  const orderCount = orders.length + 1;
  const tokenNo = String(100 + (orderCount % 900));
  const orderId = orderData.OrderID || `TL-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(orderCount).padStart(3, '0')}`;

  const record = {
    OrderID: orderId,
    TokenNo: orderData.TokenNo || tokenNo,
    CustomerName: orderData.CustomerName || orderData.customerName || 'সম্মানিত ক্রেতা',
    CustomerPhone: orderData.CustomerPhone || orderData.customerPhone || '',
    CustomerAddress: orderData.CustomerAddress || orderData.customerAddress || '',
    GarmentType: orderData.GarmentType || orderData.garmentType || 'পাঞ্জাবি',
    Quantity: Math.max(1, Number(orderData.Quantity || orderData.quantity || 1)),
    FabricSource: orderData.FabricSource || orderData.fabricSource || 'store',
    FabricName: orderData.FabricName || orderData.fabricName || 'দোকানের কাপড়',
    FabricYards: Number(orderData.FabricYards || orderData.fabricYards || 0),
    TailorMaster: orderData.TailorMaster || orderData.tailorMaster || 'মাস্টার বশির আহমেদ',
    Measurements: orderData.Measurements || orderData.measurements || {},
    DesignDetails: orderData.DesignDetails || orderData.designDetails || '',
    StitchingCharge: Number(orderData.StitchingCharge || orderData.stitchingCharge || 0),
    AccessoriesCharge: Number(orderData.AccessoriesCharge || orderData.accessoriesCharge || 0),
    TotalAmount: Number(orderData.TotalAmount || orderData.totalAmount || 0),
    AdvancePaid: Number(orderData.AdvancePaid || orderData.advancePaid || 0),
    DueAmount: Math.max(0, (Number(orderData.TotalAmount || orderData.totalAmount || 0) - Number(orderData.AdvancePaid || orderData.advancePaid || 0))),
    PaymentMethod: orderData.PaymentMethod || orderData.paymentMethod || 'Cash',
    Status: orderData.Status || orderData.status || 'Pending',
    OrderDate: orderData.OrderDate || orderData.orderDate || now,
    DeliveryDate: orderData.DeliveryDate || orderData.deliveryDate || now,
    Notes: orderData.Notes || orderData.notes || '',
    StatusHistory: Array.isArray(orderData.StatusHistory) ? orderData.StatusHistory : [
      {
        status: orderData.Status || 'Pending',
        timestamp: now,
        note: `অর্ডার গৃহীত হয়েছে। অগ্রিম: ৳${orderData.AdvancePaid || 0}`
      }
    ]
  };

  orders.unshift(record);
  saveLocalTailoringOrders(orders);
  return record;
}

export function updateTailoringOrderStatusLocally(orderId, newStatus, historyNote = '', updatedBy = 'Admin') {
  if (!orderId || !newStatus) return null;
  const orders = getLocalTailoringOrders();
  const idx = orders.findIndex(o => (o.OrderID || o.orderId) === orderId);
  if (idx === -1) return null;

  const current = orders[idx];
  const now = new Date().toISOString();
  const history = Array.isArray(current.StatusHistory) ? [...current.StatusHistory] : [];
  history.push({
    status: newStatus,
    timestamp: now,
    note: historyNote || `স্ট্যাটাস পরিবর্তন: ${newStatus}`,
    updatedBy: updatedBy
  });

  const updatedOrder = {
    ...current,
    Status: newStatus,
    StatusHistory: history
  };

  orders[idx] = updatedOrder;
  saveLocalTailoringOrders(orders);
  return updatedOrder;
}

export function updateTailoringOrderLocally(orderId, updatedFields = {}) {
  if (!orderId) return null;
  const orders = getLocalTailoringOrders();
  const idx = orders.findIndex(o => (o.OrderID || o.orderId) === orderId);
  if (idx === -1) return null;

  const current = orders[idx];
  const merged = { ...current, ...updatedFields };

  // বকেয়া পুনর্গণনা
  if ('TotalAmount' in updatedFields || 'AdvancePaid' in updatedFields) {
    const tot = Number(merged.TotalAmount || 0);
    const adv = Number(merged.AdvancePaid || 0);
    merged.DueAmount = Math.max(0, tot - adv);
  }

  orders[idx] = merged;
  saveLocalTailoringOrders(orders);
  return merged;
}

export function deleteTailoringOrderLocally(orderId) {
  if (!orderId) return false;
  const orders = getLocalTailoringOrders();
  const filtered = orders.filter(o => (o.OrderID || o.orderId) !== orderId);
  saveLocalTailoringOrders(filtered);
  return true;
}

export function getLocalTailorMasters() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.TAILORS);
    return Array.isArray(data) && data.length > 0 ? data : DEFAULT_TAILOR_MASTERS;
  } catch (e) {
    return DEFAULT_TAILOR_MASTERS;
  }
}

export function saveLocalTailorMasters(masters) {
  setSecureStorageItem(STORAGE_KEYS.TAILORS, Array.isArray(masters) ? masters : []);
}

export function addTailorMasterLocally(masterData) {
  if (!masterData) return getLocalTailorMasters();
  const list = getLocalTailorMasters();
  const newId = masterData.TailorID || `TLR-${String(list.length + 1).padStart(2, '0')}`;
  const record = {
    TailorID: newId,
    Name: masterData.Name || masterData.name || 'নতুন কারিগর',
    Phone: masterData.Phone || masterData.phone || '',
    Speciality: masterData.Speciality || masterData.speciality || 'সাধারণ সেলাই',
    Experience: masterData.Experience || masterData.experience || '১ বছর',
    Status: 'Active'
  };
  list.push(record);
  saveLocalTailorMasters(list);
  return record;
}

// ============================================================================
// থান কাপড়ের ছাঁট ও ড্যামেজ ট্র্যাকার (Phase 2: Fabric Wastage & Remnant Tracker)
// ============================================================================

export const DEFAULT_FABRIC_WASTAGE = [
  {
    WastageID: 'WST-20261020-001',
    ProductID: 'PAB-FAB-001',
    ProductName: 'প্রিমিয়াম সুতি থান কাপড় (সাদা)',
    Category: 'থান কাপড়',
    Type: 'Remnant', // 'Remnant' (ছাঁট কাপড়) | 'Damaged' (নষ্ট কাপড়)
    Goj: 1,
    Gira: 8,
    TotalYards: 1.5,
    CostPricePerYard: 150,
    LossAmount: 225,
    Reason: 'থানের শেষ ছাঁট (End-of-bolt Remnant)',
    ActionTaken: 'ClearanceBundle', // 'WrittenOff' | 'ClearanceBundle'
    LoggedBy: 'Admin',
    CreatedAt: '2026-10-20T12:00:00.000Z',
    Notes: 'থান শেষ হওয়ার পর অবশিষ্ট ১.৫ গজ ছোট টুকরা ছাঁট হিসেবে আলাদা রাখা হয়েছে'
  },
  {
    WastageID: 'WST-20261021-002',
    ProductID: 'PAB-FAB-002',
    ProductName: 'জাপানি জর্জেট থান কাপড় (নেভি ব্লু)',
    Category: 'থান কাপড়',
    Type: 'Damaged',
    Goj: 0,
    Gira: 12,
    TotalYards: 0.75,
    CostPricePerYard: 220,
    LossAmount: 165,
    Reason: 'মিল কালার ফল্ট ও ছেঁড়া (Mill Defect)',
    ActionTaken: 'WrittenOff',
    LoggedBy: 'Admin',
    CreatedAt: '2026-10-21T16:45:00.000Z',
    Notes: 'থানের মাঝখানে সুতা কাটা ও রঙের ছোপ দাগ থাকায় বাদ দেওয়া হলো'
  }
];

export function getLocalFabricWastage() {
  try {
    const data = getSecureStorageItem(STORAGE_KEYS.FABRIC_WASTAGE);
    return Array.isArray(data) && data.length > 0 ? data : DEFAULT_FABRIC_WASTAGE;
  } catch (e) {
    return DEFAULT_FABRIC_WASTAGE;
  }
}

export function saveLocalFabricWastage(records) {
  setSecureStorageItem(STORAGE_KEYS.FABRIC_WASTAGE, Array.isArray(records) ? records : []);
}

export function addFabricWastageLocally(wastageData) {
  if (!wastageData) return getLocalFabricWastage();
  const list = getLocalFabricWastage();
  const now = new Date().toISOString();
  const newId = wastageData.WastageID || `WST-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(list.length + 1).padStart(3, '0')}`;

  const record = {
    WastageID: newId,
    ProductID: wastageData.ProductID || wastageData.productId || '',
    ProductName: wastageData.ProductName || wastageData.productName || 'থান কাপড়',
    Category: wastageData.Category || wastageData.category || 'থান কাপড়',
    Type: wastageData.Type || wastageData.type || 'Remnant', // Remnant or Damaged
    Goj: Number(wastageData.Goj || wastageData.goj || 0),
    Gira: Number(wastageData.Gira || wastageData.gira || 0),
    TotalYards: Number(wastageData.TotalYards || wastageData.totalYards || 0),
    CostPricePerYard: Number(wastageData.CostPricePerYard || wastageData.costPricePerYard || 0),
    LossAmount: Number(wastageData.LossAmount || wastageData.lossAmount || 0),
    Reason: wastageData.Reason || wastageData.reason || 'থানের শেষ ছাঁট',
    ActionTaken: wastageData.ActionTaken || wastageData.actionTaken || 'WrittenOff',
    LoggedBy: wastageData.LoggedBy || wastageData.loggedBy || 'Cashier',
    CreatedAt: wastageData.CreatedAt || now,
    Notes: wastageData.Notes || wastageData.notes || ''
  };

  list.unshift(record);
  saveLocalFabricWastage(list);
  return record;
}

export function deleteFabricWastageLocally(recordId) {
  if (!recordId) return false;
  const list = getLocalFabricWastage();
  const filtered = list.filter(r => (r.WastageID || r.wastageId) !== recordId);
  saveLocalFabricWastage(filtered);
  return true;
}

