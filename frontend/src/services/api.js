/**
 * ============================================================================
 * api.js - গুগল অ্যাপস স্ক্রিপ্ট ব্যাকএন্ড API ক্লায়েন্ট
 * ============================================================================
 * React ফ্রন্টএন্ড এবং Apps Script ওয়েব অ্যাপের মধ্যে যোগাযোগ তৈরি করে।
 */

// ইন-মেমোরি স্মার্ট ক্যাশ ও ইন-ফ্লাইট প্রমিজ ডিডুপ্লিকেশন (Zero-Redundancy Network Calls)
let cachedInitialData = null;
let lastInitialDataFetchTime = 0;
let inFlightInitialDataPromise = null;
const INITIAL_DATA_CACHE_TTL_MS = 60 * 1000; // ৬০ সেকেন্ড মেমোরি ক্যাশ

/**
 * এপিআই ক্যাশ বাতিল করার ফাংশন (যেকোনো মিউটেশন বা সেলস সম্পন্ন হলে স্বয়ংক্রিয়ভাবে ক্যাশ ক্লিয়ার হয়)
 */
export function invalidateApiCache() {
  cachedInitialData = null;
  lastInitialDataFetchTime = 0;
  inFlightInitialDataPromise = null;
}

/**
 * প্রাথমিক ডাটা (Settings, Products, Users) সিঙ্ক করার মেথড
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {boolean} force - ক্যাশ উপেক্ষা করে জোরপূর্বক লাইভ কল (ম্যানুয়াল সিঙ্ক)
 */
export async function fetchInitialData(apiUrl, force = false) {
  if (!apiUrl || !apiUrl.trim()) {
    throw new Error('API URL প্রদান করা হয়নি। অনুগ্রহ করে Settings এ গিয়ে URL দিন।');
  }

  const cleanUrl = apiUrl.trim();

  // ১. মেমোরি ক্যাশ চেক (যদি ৬০ সেকেন্ডের মধ্যে ডাটা আনা হয়ে থাকে এবং force=false হয়)
  if (!force && cachedInitialData && (Date.now() - lastInitialDataFetchTime < INITIAL_DATA_CACHE_TTL_MS)) {
    return cachedInitialData;
  }

  // ২. চলমান নেটওয়ার্ক রিকোয়েস্ট ডিডুপ্লিকেশন (একই সাথে একাধিক কল হলে একই প্রমিজ শেয়ার করবে)
  if (!force && inFlightInitialDataPromise) {
    return inFlightInitialDataPromise;
  }

  const endpoint = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=getInitialData`;

  inFlightInitialDataPromise = (async () => {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`সার্ভার এরর: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'ডাটা ফেচ ব্যর্থ হয়েছে।');
      }

      cachedInitialData = result.data;
      lastInitialDataFetchTime = Date.now();
      return result.data;
    } finally {
      inFlightInitialDataPromise = null;
    }
  })();

  return inFlightInitialDataPromise;
}

/**
 * নতুন স্টক যোগ করার API কল (action: 'addStock')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} stockData - স্টকের বিবরণ
 */
export async function postAddStock(apiUrl, stockData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: স্টক শুধুমাত্র লোকাল স্টোরেজে আপডেট হয়েছে।',
    };
  }

  const payload = {
    action: 'addStock',
    ...stockData,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    // Google Apps Script CORS হ্যান্ডলিংয়ের জন্য text/plain ব্যবহার করলে প্রাক-ফ্লাইট এরর এড়ানো যায়
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  const result = await response.json();
  return result;
}

/**
 * POS সেলস অর্ডার প্রসেস করার API কল (action: 'createSale')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} saleData - বিক্রয় অর্ডারের বিবরণ
 */
export async function postCreateSale(apiUrl, saleData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: অর্ডার শুধুমাত্র লোকাল ক্যাশে সফল হয়েছে।',
    };
  }

  const payload = {
    action: 'createSale',
    ...saleData,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  const result = await response.json();
  return result;
}

/**
 * নতুন পণ্য তৈরি করার API কল (action: 'addProduct')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} productData - পণ্যের তথ্য
 */
export async function postAddProduct(apiUrl, productData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: পণ্য শুধুমাত্র লোকাল স্টোরেজে যুক্ত হয়েছে।',
    };
  }

  const payload = {
    action: 'addProduct',
    ...productData,
    barcode: productData.barcode || productData.Barcode || '',
    Barcode: productData.barcode || productData.Barcode || '',
    productName: productData.productName || productData.ProductName || '',
    ProductName: productData.productName || productData.ProductName || '',
    category: productData.category || productData.Category || 'General',
    Category: productData.category || productData.Category || 'General',
    subCategory: productData.subCategory || productData.SubCategory || '',
    SubCategory: productData.subCategory || productData.SubCategory || '',
    imageUrl: productData.imageUrl || productData.ImageUrl || '',
    ImageUrl: productData.imageUrl || productData.ImageUrl || '',
    imageCaption: productData.imageCaption || productData.ImageCaption || '',
    ImageCaption: productData.imageCaption || productData.ImageCaption || '',
    imageBase64: productData.imageBase64 || productData.ImageBase64 || '',
    imageMimeType: productData.imageMimeType || productData.ImageMimeType || '',
    imageFileName: productData.imageFileName || productData.ImageFileName || '',
    costPrice: Number(productData.costPrice !== undefined ? productData.costPrice : productData.CostPrice) || 0,
    CostPrice: Number(productData.costPrice !== undefined ? productData.costPrice : productData.CostPrice) || 0,
    sellingPrice: Number(productData.sellingPrice !== undefined ? productData.sellingPrice : productData.SellingPrice) || 0,
    SellingPrice: Number(productData.sellingPrice !== undefined ? productData.sellingPrice : productData.SellingPrice) || 0,
    initialStock: Number(productData.initialStock !== undefined ? productData.initialStock : (productData.stockQuantity !== undefined ? productData.stockQuantity : productData.StockQuantity)) || 0,
    stockQuantity: Number(productData.initialStock !== undefined ? productData.initialStock : (productData.stockQuantity !== undefined ? productData.stockQuantity : productData.StockQuantity)) || 0,
    minStockAlert: Number(productData.minStockAlert !== undefined ? productData.minStockAlert : productData.MinStockAlert) || 5,
    unit: productData.unit || productData.Unit || 'Pcs',
    Unit: productData.unit || productData.Unit || 'Pcs',
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  const result = await response.json();
  return result;
}

/**
 * বিদ্যমান পণ্য আপডেট করার API কল (action: 'updateProduct')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} productData - পণ্যের হালনাগাদ তথ্য
 */
export async function postUpdateProduct(apiUrl, productData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: পণ্য শুধুমাত্র লোকাল স্টোরেজে আপডেট হয়েছে।',
    };
  }

  const payload = {
    action: 'updateProduct',
    ...productData,
    productId: productData.productId || productData.ProductID || '',
    ProductID: productData.productId || productData.ProductID || '',
    barcode: productData.barcode || productData.Barcode || '',
    Barcode: productData.barcode || productData.Barcode || '',
    productName: productData.productName || productData.ProductName || '',
    ProductName: productData.productName || productData.ProductName || '',
    category: productData.category || productData.Category || 'General',
    Category: productData.category || productData.Category || 'General',
    subCategory: productData.subCategory !== undefined ? productData.subCategory : (productData.SubCategory || ''),
    SubCategory: productData.subCategory !== undefined ? productData.subCategory : (productData.SubCategory || ''),
    imageUrl: productData.imageUrl !== undefined ? productData.imageUrl : (productData.ImageUrl || ''),
    ImageUrl: productData.imageUrl !== undefined ? productData.imageUrl : (productData.ImageUrl || ''),
    imageCaption: productData.imageCaption !== undefined ? productData.imageCaption : (productData.ImageCaption || ''),
    ImageCaption: productData.imageCaption !== undefined ? productData.imageCaption : (productData.ImageCaption || ''),
    imageBase64: productData.imageBase64 || productData.ImageBase64 || '',
    imageMimeType: productData.imageMimeType || productData.ImageMimeType || '',
    imageFileName: productData.imageFileName || productData.ImageFileName || '',
    costPrice: Number(productData.costPrice !== undefined ? productData.costPrice : productData.CostPrice) || 0,
    CostPrice: Number(productData.costPrice !== undefined ? productData.costPrice : productData.CostPrice) || 0,
    sellingPrice: Number(productData.sellingPrice !== undefined ? productData.sellingPrice : productData.SellingPrice) || 0,
    SellingPrice: Number(productData.sellingPrice !== undefined ? productData.sellingPrice : productData.SellingPrice) || 0,
    stockQuantity: Number(productData.stockQuantity !== undefined ? productData.stockQuantity : productData.StockQuantity) || 0,
    StockQuantity: Number(productData.stockQuantity !== undefined ? productData.stockQuantity : productData.StockQuantity) || 0,
    minStockAlert: Number(productData.minStockAlert !== undefined ? productData.minStockAlert : productData.MinStockAlert) || 5,
    unit: productData.unit || productData.Unit || 'Pcs',
    Unit: productData.unit || productData.Unit || 'Pcs',
    shortDescription: productData.shortDescription !== undefined ? productData.shortDescription : (productData.ShortDescription || ''),
    description: productData.description !== undefined ? productData.description : (productData.Description || ''),
    features: productData.features !== undefined ? productData.features : (productData.Features || ''),
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  const result = await response.json();
  return result;
}

/**
 * বিদ্যমান পণ্য মুছে ফেলার API কল (action: 'deleteProduct')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {string} productId - পণ্যের আইডি
 */
export async function postDeleteProduct(apiUrl, productId) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: পণ্য শুধুমাত্র লোকাল স্টোরেজ থেকে মুছে ফেলা হয়েছে।',
    };
  }

  const payload = {
    action: 'deleteProduct',
    productId: productId,
    ProductID: productId,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  const result = await response.json();
  return result;
}

/**
 * স্টোর সেটিংস আপডেট করার API কল (action: 'updateSettings')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} settingsData - সেটিংস ডাটা
 */
export async function postUpdateSettings(apiUrl, settingsData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: সেটিংস লোকাল স্টোরেজে আপডেট হয়েছে।',
    };
  }

  const payload = {
    action: 'updateSettings',
    ...settingsData,
    // PascalCase এবং camelCase উভয় সাপোর্ট নিশ্চিত করা
    StoreName: settingsData.StoreName || settingsData.storeName || '',
    storeName: settingsData.StoreName || settingsData.storeName || '',
    LogoUrl: settingsData.LogoUrl || settingsData.logoUrl || '',
    logoUrl: settingsData.LogoUrl || settingsData.logoUrl || '',
    CurrencySymbol: settingsData.CurrencySymbol || settingsData.currencySymbol || '৳',
    currencySymbol: settingsData.CurrencySymbol || settingsData.currencySymbol || '৳',
    TaxRatePercent: Number(settingsData.TaxRatePercent !== undefined ? settingsData.TaxRatePercent : settingsData.taxRatePercent) || 0,
    taxRatePercent: Number(settingsData.TaxRatePercent !== undefined ? settingsData.TaxRatePercent : settingsData.taxRatePercent) || 0,
    Address: settingsData.Address || settingsData.address || '',
    address: settingsData.Address || settingsData.address || '',
    Phone: settingsData.Phone || settingsData.phone || '',
    phone: settingsData.Phone || settingsData.phone || '',
    Email: settingsData.Email || settingsData.email || '',
    email: settingsData.Email || settingsData.email || '',
    ReceiptFooter: settingsData.ReceiptFooter || settingsData.receiptFooter || '',
    receiptFooter: settingsData.ReceiptFooter || settingsData.receiptFooter || '',
    ApiUrl: apiUrl.trim() || settingsData.apiUrl || settingsData.ApiUrl || '',
    apiUrl: apiUrl.trim() || settingsData.apiUrl || settingsData.ApiUrl || '',
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  const result = await response.json();
  return result;
}

/**
 * নতুন ক্যাটাগরি তৈরি করার API কল (action: 'addCategory')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} categoryData - ক্যাটাগরি ডাটা
 */
export async function postAddCategory(apiUrl, categoryData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: ক্যাটাগরি শুধুমাত্র লোকাল স্টোরেজে যুক্ত হয়েছে।',
    };
  }

  const payload = {
    action: 'addCategory',
    ...categoryData,
    categoryName: categoryData.categoryName || categoryData.CategoryName || '',
    CategoryName: categoryData.categoryName || categoryData.CategoryName || '',
    subCategoryName: categoryData.subCategoryName || categoryData.SubCategoryName || '',
    SubCategoryName: categoryData.subCategoryName || categoryData.SubCategoryName || '',
    description: categoryData.description || categoryData.Description || '',
    Description: categoryData.description || categoryData.Description || '',
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  const result = await response.json();
  return result;
}

/**
 * নতুন পরিমাপক একক তৈরি করার API কল (action: 'addUnit')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} unitData - এককের ডাটা
 */
export async function postAddUnit(apiUrl, unitData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: পরিমাপক একক শুধুমাত্র লোকাল স্টোরেজে যুক্ত হয়েছে।',
    };
  }

  const payload = {
    action: 'addUnit',
    ...unitData,
    unitName: unitData.unitName || unitData.UnitName || '',
    UnitName: unitData.unitName || unitData.UnitName || '',
    shortName: unitData.shortName || unitData.ShortName || unitData.unitName || '',
    ShortName: unitData.shortName || unitData.ShortName || unitData.unitName || '',
    description: unitData.description || unitData.Description || '',
    Description: unitData.description || unitData.Description || '',
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  const result = await response.json();
  return result;
}

/**
 * গুগল শিট থেকে সম্পূর্ণ বিক্রয় হিস্ট্রি লোড করার API কল (action: 'getSales')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {number} limit - কতটি রেকর্ড লোড হবে (ডিফল্ট ১০০০)
 */
export async function fetchSalesHistory(apiUrl, limit = 1000) {
  if (!apiUrl || !apiUrl.trim()) return [];

  const endpoint = `${apiUrl.trim()}${apiUrl.includes('?') ? '&' : '?'}action=getSales&limit=${limit}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`সার্ভার এরর: ${response.status}`);
  }

  const result = await response.json();
  if (result.success && Array.isArray(result.data)) {
    return result.data;
  }
  return [];
}

/**
 * গুগল শিট থেকে সম্পূর্ণ কাস্টমার তালিকা ফেচ করার API কল (action: 'getCustomers')
 * @param {string} apiUrl - Apps Script Web App URL
 */
export async function fetchCustomers(apiUrl) {
  if (!apiUrl || !apiUrl.trim()) return [];

  const endpoint = `${apiUrl.trim()}${apiUrl.includes('?') ? '&' : '?'}action=getCustomers`;
  const response = await fetch(endpoint, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`সার্ভার এরর: ${response.status}`);
  }

  const result = await response.json();
  if (result.success && Array.isArray(result.data)) {
    return result.data;
  }
  return [];
}

/**
 * গুগল শিটে নতুন কাস্টমার যোগ করার API কল (action: 'addCustomer')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} customerData - গ্রাহকের তথ্য
 */
export async function postAddCustomer(apiUrl, customerData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: কাস্টমার তথ্য লোকাল স্টোরেজে সেভ হয়েছে।',
    };
  }

  const payload = {
    action: 'addCustomer',
    ...customerData,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  const result = await response.json();
  return result;
}

/**
 * গুগল শিটে কাস্টমার তথ্য আপডেট করার API কল (action: 'updateCustomer')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} customerData - গ্রাহকের তথ্য
 */
export async function postUpdateCustomer(apiUrl, customerData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: গ্রাহকের তথ্য লোকাল স্টোরেজে আপডেট হয়েছে।',
    };
  }

  const payload = {
    action: 'updateCustomer',
    ...customerData,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  return await response.json();
}

/**
 * গুগল শিট থেকে কাস্টমার মুছে ফেলার API কল (action: 'deleteCustomer')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {string} customerId - কাস্টমার আইডি
 * @param {string} phone - ফোন নম্বর
 */
export async function postDeleteCustomer(apiUrl, customerId, phone) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: গ্রাহক লোকাল ডাটাবেস থেকে মুছে ফেলা হয়েছে।',
    };
  }

  const payload = {
    action: 'deleteCustomer',
    customerId: customerId,
    phone: phone,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  return await response.json();
}

/**
 * ইনভয়েস নম্বর দিয়ে গুগল শিট থেকে বিক্রয়ের তথ্য ফেচ করার API কল (action: 'getSaleByInvoice')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {string} invoiceNo - ইনভয়েস নম্বর বা রেফারেন্স আইডি
 */
export async function fetchSaleByInvoice(apiUrl, invoiceNo) {
  if (!apiUrl || !apiUrl.trim() || !invoiceNo || !invoiceNo.trim()) return null;

  const endpoint = `${apiUrl.trim()}${apiUrl.includes('?') ? '&' : '?'}action=getSaleByInvoice&invoiceNo=${encodeURIComponent(invoiceNo.trim())}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`সার্ভার এরর: ${response.status}`);
  }

  const result = await response.json();
  if (result.success && result.data) {
    return result.data;
  }
  return null;
}

/**
 * গুগল শিট থেকে কুপনের তালিকা ফেচ করার API কল (action: 'getCoupons')
 * @param {string} apiUrl - Apps Script Web App URL
 */
export async function fetchCoupons(apiUrl) {
  if (!apiUrl || !apiUrl.trim()) return [];

  const endpoint = `${apiUrl.trim()}${apiUrl.includes('?') ? '&' : '?'}action=getCoupons`;
  const response = await fetch(endpoint, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`সার্ভার এরর: ${response.status}`);
  }

  const result = await response.json();
  if (result.success && Array.isArray(result.data)) {
    return result.data;
  }
  return [];
}

/**
 * গুগল শিটে নতুন কুপন যোগ করার API কল (action: 'addCoupon')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} couponData - কুপনের তথ্য
 */
export async function postAddCoupon(apiUrl, couponData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: কুপন শুধুমাত্র লোকাল স্টোরেজে তৈরি হয়েছে।',
    };
  }

  const payload = {
    action: 'addCoupon',
    ...couponData,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  return await response.json();
}

/**
 * গুগল শিটে বিদ্যমান কুপন আপডেট করার API কল (action: 'updateCoupon')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} couponData - কুপনের তথ্য
 */
export async function postUpdateCoupon(apiUrl, couponData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: কুপন শুধুমাত্র লোকাল স্টোরেজে আপডেট হয়েছে।',
    };
  }

  const payload = {
    action: 'updateCoupon',
    ...couponData,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  return await response.json();
}

/**
 * গুগল শিট থেকে কুপন মুছে ফেলার API কল (action: 'deleteCoupon')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {string} couponId - কুপন আইডি
 * @param {string} couponCode - কুপন কোড
 */
export async function postDeleteCoupon(apiUrl, couponId, couponCode) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: কুপন লোকাল ডাটাবেস থেকে মুছে ফেলা হয়েছে।',
    };
  }

  const payload = {
    action: 'deleteCoupon',
    couponId: couponId,
    couponCode: couponCode,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  return await response.json();
}

/**
 * ============================================================================
 * ব্যবহারকারী ও স্টাফ অ্যাকাউন্ট API মেথডসমূহ
 * ============================================================================
 */

/**
 * গুগল শিট থেকে সকল ব্যবহারকারী তালিকা আনার API কল (action: 'getUsers')
 * @param {string} apiUrl - Apps Script Web App URL
 */
export async function fetchUsers(apiUrl) {
  if (!apiUrl || !apiUrl.trim()) return [];

  const endpoint = `${apiUrl.trim()}${apiUrl.includes('?') ? '&' : '?'}action=getUsers`;
  const response = await fetch(endpoint, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`সার্ভার এরর: ${response.status}`);
  }

  const result = await response.json();
  if (result.success && Array.isArray(result.data)) {
    return result.data;
  }
  return [];
}

/**
 * গুগল শিটে নতুন ব্যবহারকারী তৈরি (এডমিন কর্তৃক রোল নির্বাচন সহ) API কল (action: 'addUser')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} userData - ব্যবহারকারীর তথ্য
 */
export async function postAddUser(apiUrl, userData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: ব্যবহারকারী লোকাল স্টোরেজে তৈরি হয়েছে।',
      data: userData,
    };
  }

  const payload = {
    action: 'addUser',
    ...userData,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  return await response.json();
}

/**
 * সাধারণ গ্রাহক সাইনআপ API কল (action: 'registerUser')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} userData - রেজিস্ট্রেশন ফর্ম ডাটা
 */
export async function postRegisterUser(apiUrl, userData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: অ্যাকাউন্ট শুধুমাত্র লোকাল ব্রাউজারে সংরক্ষিত হয়েছে।',
      data: { ...userData, Role: 'Customer' },
    };
  }

  const payload = {
    action: 'registerUser',
    ...userData,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  return await response.json();
}

/**
 * ব্যবহারকারীর প্রোফাইল ও ভূমিকা আপডেট API কল (action: 'updateUser')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} userData - ব্যবহারকারীর আপডেট তথ্য
 */
export async function postUpdateUser(apiUrl, userData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: তথ্য লোকাল স্টোরেজে আপডেট হয়েছে।',
      data: userData,
    };
  }

  const payload = {
    action: 'updateUser',
    ...userData,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  return await response.json();
}

/**
 * ব্যবহারকারী মুছে ফেলার API কল (action: 'deleteUser')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {string} userId - ইউজার আইডি
 * @param {string} [phone] - ফোন নম্বর
 * @param {string} [email] - ইমেইল
 */
export async function postDeleteUser(apiUrl, userId, phone = '', email = '') {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: ব্যবহারকারী লোকাল স্টোরেজ থেকে মুছে ফেলা হয়েছে।',
    };
  }

  const payload = {
    action: 'deleteUser',
    userId,
    phone,
    email,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  return await response.json();
}

/**
 * ব্যবহারকারী লাইভ লগইন ভেরিফিকেশন API কল (action: 'loginUser')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} credentials - { identifier, pin, role }
 */
export async function postLoginUser(apiUrl, credentials) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: false,
      message: 'API URL কনফিগার করা নেই।',
    };
  }

  const payload = {
    action: 'loginUser',
    ...credentials,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  return await response.json();
}

/**
 * ব্যবহারকারীর প্রোফাইল ছবি গুগল ড্রাইভে আপলোড API কল (action: 'uploadUserAvatar')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} uploadData - { userId, userName, imageBase64, imageMimeType, avatarUrl }
 */
export async function postUploadUserAvatar(apiUrl, uploadData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: ছবি লোকাল প্রিভিউ হিসেবে সংরক্ষিত হয়েছে।',
      url: uploadData.avatarUrl || uploadData.imageBase64 || '',
      avatarUrl: uploadData.avatarUrl || uploadData.imageBase64 || '',
    };
  }

  const payload = {
    action: 'uploadUserAvatar',
    ...uploadData,
  };

  const response = await fetch(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  return await response.json();
}

/**
 * নতুন অর্ডার তৈরি করার API কল (action: 'createOrder')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} orderData - অর্ডারের বিস্তারিত তথ্য
 */
export async function postCreateOrder(apiUrl, orderData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: অর্ডার সফলভাবে লোকাল স্টোরেজে তৈরি হয়েছে।',
      data: orderData,
    };
  }

  const payload = {
    action: 'createOrder',
    ...orderData,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: true,
      offline: true,
      message: 'নেটওয়ার্ক সমস্যা: অর্ডার লোকাল স্টোরেজে সংরক্ষিত হয়েছে (অফলাইন)।',
      data: orderData,
    };
  }
}

/**
 * অর্ডারের স্ট্যাটাস বা ট্র্যাকিং কোড আপডেট করার API কল (action: 'updateOrderStatus')
 * @param {string} apiUrl - Apps Script Web App URL
 * @param {Object} updateData - { orderId, status, trackingId, courierName, notes }
 */
export async function postUpdateOrderStatus(apiUrl, updateData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: অর্ডারের স্ট্যাটাস লোকাল স্টোরেজে আপডেট হয়েছে।',
    };
  }

  const payload = {
    action: 'updateOrderStatus',
    ...updateData,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: true,
      offline: true,
      message: 'নেটওয়ার্ক সমস্যা: স্ট্যাটাস লোকালভাবে আপডেট হয়েছে।',
    };
  }
}

/**
 * একাধিক অর্ডারের স্ট্যাটাস বাল্ক আপডেট করার API কল (action: 'bulkUpdateOrderStatus')
 */
export async function postBulkUpdateOrderStatus(apiUrl, payloadData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: বাল্ক স্ট্যাটাস লোকালভাবে আপডেট হয়েছে।',
    };
  }

  const payload = {
    action: 'bulkUpdateOrderStatus',
    ...payloadData,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: `নেটওয়ার্ক সংযোগ ব্যর্থ: ${err.message}`,
    };
  }
}

/**
 * Steadfast Courier API-তে এক ক্লিকে বাল্ক পার্সেল বুকিং (action: 'steadfastBulkDispatch')
 */
export async function postSteadfastBulkDispatch(apiUrl, payloadData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: false,
      message: 'গুগল শিট API URL পাওয়া যায়নি। Settings চেক করুন।',
    };
  }

  const payload = {
    action: 'steadfastBulkDispatch',
    ...payloadData,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: `Steadfast সার্ভার সংযোগ ব্যর্থ: ${err.message}`,
    };
  }
}

/**
 * Steadfast লাইভ ডেলিভারি ট্র্যাকিং স্ট্যাটাস চেক (action: 'steadfastCheckStatus')
 */
export async function postSteadfastCheckStatus(apiUrl, payloadData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: false,
      message: 'গুগল শিট API URL পাওয়া যায়নি।',
    };
  }

  const payload = {
    action: 'steadfastCheckStatus',
    ...payloadData,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: `ট্র্যাকিং তথ্য আনতে সমস্যা: ${err.message}`,
    };
  }
}

/**
 * কাস্টমারকে স্বয়ংক্রিয় SMS নোটিফিকেশন প্রেরণ (action: 'sendSmsNotification')
 */
export async function postSendSmsNotification(apiUrl, payloadData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: false,
      message: 'গুগল শিট API URL পাওয়া যায়নি।',
    };
  }

  const payload = {
    action: 'sendSmsNotification',
    ...payloadData,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: `SMS পাঠাতে সমস্যা হয়েছে: ${err.message}`,
    };
  }
}

/**
 * ============================================================================
 * Phase 2: কাস্টমার বকেয়া পরিশোধ (Due Collection) ও ক্রেডিট লিমিট API
 * ============================================================================
 */

/**
 * কাস্টমারের বকেয়া পরিশোধ রেকর্ড করা (action: 'recordCustomerPayment')
 */
export async function postRecordCustomerPayment(apiUrl, paymentData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: false,
      message: 'গুগল শিট API URL পাওয়া যায়নি।',
    };
  }

  const payload = {
    action: 'recordCustomerPayment',
    ...paymentData,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: `বকেয়া পরিশোধ সার্ভারে পাঠাতে সমস্যা হয়েছে: ${err.message}`,
    };
  }
}

/**
 * কাস্টমারের ক্রেডিট লিমিট আপডেট করা (action: 'updateCustomerCreditLimit')
 */
export async function postUpdateCustomerCreditLimit(apiUrl, customerId, creditLimit, customerPhone = '') {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: false,
      message: 'গুগল শিট API URL পাওয়া যায়নি।',
    };
  }

  const payload = {
    action: 'updateCustomerCreditLimit',
    customerId: customerId,
    customerPhone: customerPhone,
    creditLimit: creditLimit,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: `ক্রেডিট লিমিট আপডেট করতে সমস্যা হয়েছে: ${err.message}`,
    };
  }
}

/**
 * ============================================================================
 * Phase 3: ডিজিটাল স্টোরফ্রন্ট, লয়ালটি ও ড্রপ-অফ কার্ট রিকভারি API
 * ============================================================================
 */

/**
 * ড্রপ-অফ বা অসম্পূর্ণ কার্ট সার্ভারে সংরক্ষণ করা (action: 'saveAbandonedCart')
 */
export async function postSaveAbandonedCart(apiUrl, cartData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'লোকাল মোড: কার্ট ব্রাউজারে সংরক্ষিত হয়েছে।',
    };
  }

  const payload = {
    action: 'saveAbandonedCart',
    ...cartData,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: `কার্ট ডাটাবেসে সেভ করতে সমস্যা: ${err.message}`,
    };
  }
}

/**
 * অসম্পূর্ণ কার্টের স্ট্যাটাস আপডেট করা (action: 'updateAbandonedCartStatus')
 */
export async function postUpdateAbandonedCartStatus(apiUrl, cartId, status = 'Contacted', notes = '') {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'লোকাল মোড: কার্ট স্ট্যাটাস আপডেট হয়েছে।',
    };
  }

  const payload = {
    action: 'updateAbandonedCartStatus',
    cartId: cartId,
    status: status,
    notes: notes,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: `কার্ট স্ট্যাটাস আপডেট করতে সমস্যা: ${err.message}`,
    };
  }
}

/**
 * গ্রাহকের লয়ালটি পয়েন্ট আপডেট করা (action: 'updateCustomerLoyalty')
 */
export async function postUpdateCustomerLoyalty(apiUrl, { customerId, phone, pointsDelta, isRedeem = false, notes = '' }) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'লোকাল মোড: লয়ালটি পয়েন্ট আপডেট হয়েছে।',
    };
  }

  const payload = {
    action: 'updateCustomerLoyalty',
    customerId: customerId,
    phone: phone,
    pointsDelta: pointsDelta,
    isRedeem: isRedeem,
    notes: notes,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: `লয়ালটি পয়েন্ট আপডেট করতে সমস্যা: ${err.message}`,
    };
  }
}

/**
 * ============================================================================
 * Phase 4: সাপ্লায়ার ও পারচেজ অর্ডার API কলসমূহ
 * ============================================================================
 */

/**
 * গুগল শিটে সাপ্লায়ার তথ্য সংরক্ষণ বা আপডেট (action: 'saveSupplier')
 */
export async function postSaveSupplier(apiUrl, supplierData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: সাপ্লায়ার তথ্য লোকাল স্টোরেজে সেভ হয়েছে।',
    };
  }

  const payload = {
    action: 'saveSupplier',
    ...supplierData,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: `সাপ্লায়ার সিঙ্ক ব্যর্থ: ${err.message}`,
    };
  }
}

/**
 * গুগল শিট থেকে সাপ্লায়ার মুছে ফেলা (action: 'deleteSupplier')
 */
export async function postDeleteSupplier(apiUrl, supplierId) {
  if (!apiUrl || !apiUrl.trim()) {
    return { success: true, offline: true };
  }

  const payload = {
    action: 'deleteSupplier',
    supplierId: supplierId,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: `সাপ্লায়ার মুছতে সমস্যা: ${err.message}`,
    };
  }
}

/**
 * নতুন পারচেজ অর্ডার (PO) তৈরি করা (action: 'createPurchaseOrder')
 */
export async function postCreatePurchaseOrder(apiUrl, poData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: পারচেজ অর্ডার লোকাল ক্যাশে তৈরি হয়েছে।',
    };
  }

  const payload = {
    action: 'createPurchaseOrder',
    ...poData,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: `পারচেজ অর্ডার তৈরি ব্যর্থ: ${err.message}`,
    };
  }
}

/**
 * পারচেজ অর্ডার স্ট্যাটাস আপডেট ও স্টক রিসিভ (action: 'updatePOStatus')
 */
export async function postUpdatePOStatus(apiUrl, { poId, status, receivedBy = 'Admin' }) {
  if (!apiUrl || !apiUrl.trim()) {
    return { success: true, offline: true };
  }

  const payload = {
    action: 'updatePOStatus',
    poId: poId,
    status: status,
    receivedBy: receivedBy,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: `PO স্ট্যাটাস আপডেট ব্যর্থ: ${err.message}`,
    };
  }
}

/**
 * সাপ্লায়ারের বকেয়া পাওনা পরিশোধ রেকর্ড (action: 'recordSupplierPayment')
 */
export async function postRecordSupplierPayment(apiUrl, paymentData) {
  if (!apiUrl || !apiUrl.trim()) {
    return {
      success: true,
      offline: true,
      message: 'অফলাইন মোড: সাপ্লায়ার পেমেন্ট রেকর্ড হয়েছে।',
    };
  }

  const payload = {
    action: 'recordSupplierPayment',
    ...paymentData,
  };

  try {
    const response = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: `সাপ্লায়ার পেমেন্ট সিঙ্ক ব্যর্থ: ${err.message}`,
    };
  }
}
