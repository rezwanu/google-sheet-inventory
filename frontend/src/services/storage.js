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
  COUPONS: 'pos_coupons',
  OFFLINE_QUEUE: 'pos_offline_queue',
  ACTIVE_USER: 'pos_active_user',
  USERS: 'pos_users',
};

// প্রাথমিক ডিফল্ট সিস্টেম ইউজার ও গ্রাহক অ্যাকাউন্ট তালিকা
export const DEFAULT_USERS = [
  {
    UserID: 'USER-ADMIN-01',
    FullName: 'এডমিন মোহাম্মদ করিম',
    Email: 'admin@pos.local',
    Phone: '01700000000',
    Role: 'Admin', // 'Admin' | 'Cashier' | 'Customer'
    PIN: '1234',
    Address: 'হেড অফিস, গুলশান, ঢাকা',
    AvatarUrl: '',
    Status: 'Active',
    CreatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    UserID: 'USER-CASHIER-01',
    FullName: 'প্রধান ক্যাশিয়ার রফিক',
    Email: 'cashier@pos.local',
    Phone: '01711111111',
    Role: 'Cashier',
    PIN: '1122',
    Address: 'কাউন্টার ১, ঢাকা',
    AvatarUrl: '',
    Status: 'Active',
    CreatedAt: '2026-01-05T00:00:00.000Z',
  },
];

// প্রাথমিক ডিফল্ট কাস্টমার ডাটাবেস (কোনো ডামি গ্রাহক থাকবে না)
export const DEFAULT_CUSTOMERS = [];

// প্রাথমিক ডিফল্ট সেটিংস (কোনো ডামি বা ফেক তথ্য থাকবে না)
export const DEFAULT_SETTINGS = {
  SettingID: 'SETTING-1',
  StoreName: '',
  LogoUrl: '',
  CurrencySymbol: '৳',
  TaxRatePercent: 0,
  Address: '',
  Phone: '',
  Email: '',
  ReceiptFooter: '',
  apiUrl: '', // গুগল অ্যাপস স্ক্রিপ্ট Web App URL
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
  const api = (cleaned.apiUrl || cleaned.ApiUrl || settings.apiUrl || settings.ApiUrl || '').trim();
  cleaned.apiUrl = api;
  cleaned.ApiUrl = api;

  return cleaned;
}

// সেটিংস সংক্রান্ত মেথড
export function getLocalSettings() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(data);
    const sanitized = sanitizeSettings(parsed);
    return sanitized;
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveLocalSettings(settings) {
  const sanitized = sanitizeSettings(settings);
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(sanitized));
}

// প্রাথমিক পরিমাপক একক (Units) তালিকা
export const DEFAULT_UNITS = [
  { UnitID: 'UNIT-101', UnitName: 'Piece (পিস)', ShortName: 'Pcs', Description: 'একক পিস পণ্য', Status: 'Active' },
  { UnitID: 'UNIT-102', UnitName: 'Packet (প্যাকেট)', ShortName: 'Packet', Description: 'প্যাকেটজাত পণ্য', Status: 'Active' },
  { UnitID: 'UNIT-103', UnitName: 'Kilogram (কেজি)', ShortName: 'Kg', Description: 'ওজন পরিমাপক কেজি', Status: 'Active' },
  { UnitID: 'UNIT-104', UnitName: 'Gram (গ্রাম)', ShortName: 'gm', Description: 'ক্ষুদ্র ওজন একক', Status: 'Active' },
  { UnitID: 'UNIT-105', UnitName: 'Litre (লিটার)', ShortName: 'Ltr', Description: 'তরল পরিমাপক লিটার', Status: 'Active' },
  { UnitID: 'UNIT-106', UnitName: 'Millilitre (মিলি)', ShortName: 'ml', Description: 'ক্ষুদ্র তরল একক', Status: 'Active' },
  { UnitID: 'UNIT-107', UnitName: 'Box (বক্স/কার্টন)', ShortName: 'Box', Description: 'কার্টন বা বক্স', Status: 'Active' },
  { UnitID: 'UNIT-108', UnitName: 'Bottle (বোতল)', ShortName: 'Bottle', Description: 'বোতলজাত পণ্য', Status: 'Active' },
  { UnitID: 'UNIT-109', UnitName: 'Dozen (ডজন)', ShortName: 'Dozen', Description: '১২ পিস বা ডজন', Status: 'Active' },
  { UnitID: 'UNIT-110', UnitName: 'Pair (জোড়া)', ShortName: 'Pair', Description: 'জুতো বা জোড়া আইটেম', Status: 'Active' },
  { UnitID: 'UNIT-111', UnitName: 'Meter (মিটার)', ShortName: 'Meter', Description: 'দৈর্ঘ্য বা কাপড়', Status: 'Active' },
  { UnitID: 'UNIT-112', UnitName: 'Roll (রোল)', ShortName: 'Roll', Description: 'রোল বা ফিতা জাতীয়', Status: 'Active' },
];

// প্রাথমিক ক্যাটাগরি ও সাব-ক্যাটাগরি হায়ারার্কি
export const DEFAULT_CATEGORIES = [
  { CategoryID: 'CAT-101', CategoryName: 'Grocery', SubCategoryName: 'Rice & Grain', Status: 'Active' },
  { CategoryID: 'CAT-102', CategoryName: 'Grocery', SubCategoryName: 'Edible Oil', Status: 'Active' },
  { CategoryID: 'CAT-103', CategoryName: 'Grocery', SubCategoryName: 'Sugar & Salt', Status: 'Active' },
  { CategoryID: 'CAT-104', CategoryName: 'Beverage', SubCategoryName: 'Tea & Coffee', Status: 'Active' },
  { CategoryID: 'CAT-105', CategoryName: 'Beverage', SubCategoryName: 'Juice & Drinks', Status: 'Active' },
  { CategoryID: 'CAT-106', CategoryName: 'Dairy', SubCategoryName: 'Milk & Dairy', Status: 'Active' },
  { CategoryID: 'CAT-107', CategoryName: 'Bakery', SubCategoryName: 'Biscuits & Cookies', Status: 'Active' },
];

// প্রাথমিক নমুনা পণ্য তালিকা - ডেমো পণ্য সম্পূর্ণরূপে বাদ দিয়ে খালি অ্যারে করা হয়েছে।
// সকল পণ্য সরাসরি গুগল শিট 'Products' ডাটাবেস থেকে লোড হবে।
export const DEFAULT_PRODUCTS = [];

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


// ক্যাটাগরি সংক্রান্ত মেথড
export function getLocalCategories() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!data) {
      saveLocalCategories(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_CATEGORIES;
  }
}

export function saveLocalCategories(categories) {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
}

// পরিমাপক একক (Units) সংক্রান্ত মেথড
export function getLocalUnits() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.UNITS);
    if (!data) {
      saveLocalUnits(DEFAULT_UNITS);
      return DEFAULT_UNITS;
    }
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_UNITS;
  }
}

export function saveLocalUnits(units) {
  localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(units));
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
    SellingPrice: Number(price) || 0,
    Unit: String(unit),
    ImageUrl: formatImageUrl(String(img)),
    imageUrl: formatImageUrl(String(img)),
    ImageCaption: String(caption),
    ShortDescription: String(shortDesc),
    Description: String(desc),
    Features: features,
  };
}

// লোকাল প্রোডাক্ট সংক্রান্ত মেথড - কোনো ডেমো পণ্য থাকবে না
export function getLocalProducts() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!data) {
      saveLocalProducts([]);
      return [];
    }
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      saveLocalProducts([]);
      return [];
    }

    // পুরোনো ডেমো পণ্যগুলো চিহ্নিত করে লোকাল স্টোরেজ থেকে স্বয়ংক্রিয়ভাবে মুছে ফেলা
    const cleanList = parsed
      .filter((p) => !isDemoProduct(p))
      .map(normalizeProduct)
      .filter(Boolean);

    // যদি ডেমো পণ্য পাওয়া যায় এবং তালিকা পরিবর্তিত হয়, তবে লোকাল স্টোরেজ আপডেট করা
    if (cleanList.length !== parsed.length) {
      saveLocalProducts(cleanList);
    }
    return cleanList;
  } catch (e) {
    return [];
  }
}

export function saveLocalProducts(products) {
  const normalized = Array.isArray(products)
    ? products
        .filter((p) => !isDemoProduct(p))
        .map(normalizeProduct)
        .filter(Boolean)
    : [];
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(normalized));
}

/**
 * পূর্ববর্তী সমস্ত ডেমো পণ্য লোকাল স্টোরেজ থেকে পুরোপুরি ক্লিন করার ইউটিলিটি
 */
export function clearDemoData() {
  const current = getLocalProducts();
  const strictlyReal = current.filter((p) => !isDemoProduct(p));
  saveLocalProducts(strictlyReal);
  return strictlyReal;
}

// লোকাল প্রোডাক্ট স্টক আপডেট মেথড
export function updateProductStockLocally(productId, newStock, newCost = null) {
  const products = getLocalProducts();
  const index = products.findIndex((p) => p.ProductID === productId || p.Barcode === productId);
  if (index !== -1) {
    products[index].StockQuantity = Number(newStock);
    if (newCost !== null) {
      products[index].CostPrice = Number(newCost);
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
    const data = localStorage.getItem(STORAGE_KEYS.CART);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalCart(cart) {
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
}

// সেলস হিস্ট্রি মেথড
export function getLocalSalesHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SALES_HISTORY);
    return data ? JSON.parse(data) : [];
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
  localStorage.setItem(STORAGE_KEYS.SALES_HISTORY, JSON.stringify(history.slice(0, 1000)));
}

export function saveLocalSalesHistory(history) {
  if (!Array.isArray(history)) return;
  const normalized = history.map(normalizeSale).filter(Boolean);
  localStorage.setItem(STORAGE_KEYS.SALES_HISTORY, JSON.stringify(normalized.slice(0, 1000)));
}

// অফলাইন কিউ মেথড (নেটওয়ার্ক না থাকলে জমা রাখার জন্য)
export function getOfflineQueue() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function addToOfflineQueue(item) {
  const queue = getOfflineQueue();
  queue.push(item);
  localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
}

export function clearOfflineQueue() {
  localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
}

// ==========================================
// ইউজার ও অথেনটিকেশন মেথডসমূহ (Authentication & Users)
// ==========================================

export function getLocalUsers() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
      saveLocalUsers(DEFAULT_USERS);
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
  } catch (e) {
    return DEFAULT_USERS;
  }
}

export function saveLocalUsers(users) {
  if (!Array.isArray(users)) return;
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

// বর্তমান সক্রিয় ইউজার (লগইন করা অ্যাকাউন্ট, লগআউট থাকলে null)
export function getActiveUser() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (parsed && parsed.Role && parsed.UserID !== 'USER-GUEST') return parsed;
    return null;
  } catch (e) {
    return null;
  }
}

export function saveActiveUser(user) {
  if (!user || user.UserID === 'USER-GUEST') {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
  } else {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
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
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
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
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
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
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(cleaned));
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
 * বিক্রয় সম্পন্ন করার পর বা সরাসরি নতুন গ্রাহক তৈরি হলে কাস্টমার ডাটাবেস আপডেট করা
 */
export function saveOrUpdateCustomerLocally(customerData, saleAmount = 0) {
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

    customers[existingIndex] = {
      ...existing,
      CustomerName: name || existing.CustomerName,
      Phone: phone || existing.Phone,
      Email: customerData.Email || customerData.customerEmail || existing.Email || '',
      Address: customerData.Address || customerData.customerAddress || existing.Address || '',
      CustomerType: customerData.CustomerType || customerData.customerType || existing.CustomerType || 'Regular',
      TotalOrders: prevOrders + (saleAmount > 0 ? 1 : 0),
      TotalSpent: prevSpent + Number(saleAmount || 0),
      UpdatedAt: now,
    };
  } else {
    const newCustomer = {
      CustomerID: customerData.CustomerID || `CUST-${Date.now().toString().slice(-6)}`,
      CustomerName: name || 'নামহীন গ্রাহক',
      Phone: phone,
      Email: customerData.Email || customerData.customerEmail || '',
      Address: customerData.Address || customerData.customerAddress || '',
      CustomerType: customerData.CustomerType || customerData.customerType || 'Regular',
      TotalOrders: saleAmount > 0 ? 1 : 0,
      TotalSpent: Number(saleAmount || 0),
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
    const data = localStorage.getItem(STORAGE_KEYS.COUPONS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeCoupon).filter(Boolean);
  } catch (e) {
    return [];
  }
}

export function saveLocalCoupons(coupons) {
  if (!Array.isArray(coupons)) return;
  const normalized = coupons.map(normalizeCoupon).filter(Boolean);
  localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(normalized));
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


