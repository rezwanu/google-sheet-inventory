/**
 * ============================================================================
 * Config.gs - কনফিগারেশন এবং হেল্পার ইউটিলিটি
 * ============================================================================
 * এই ফাইলে ডাটাবেস শিটগুলোর নাম, রেসপন্স ইউটিলিটি এবং হেল্পার ফাংশনগুলো রয়েছে।
 */

// শিটগুলোর নির্দিষ্ট নামসমূহ
const SHEETS = {
  SETTINGS: 'Settings',
  PRODUCTS: 'Products',
  CATEGORIES: 'Categories',
  UNITS: 'Units',
  SALES: 'Sales',
  STOCK_LOGS: 'StockLogs',
  USERS: 'Users',
  CUSTOMERS: 'Customers',
  COUPONS: 'Coupons',
  VARIANTS: 'Variants'
};

/**
 * CORS সাপোর্টেড JSON রেসপন্স তৈরি করার সহায়ক ফাংশন
 * @param {Object} data - রেসপন্স ডাটা
 * @return {TextOutput} JSON আউটপুট
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * টাইমস্ট্যাম্প এবং র‍্যান্ডম সংখ্যা দিয়ে ইউনিক আইডি তৈরি (যেমন: SALE-1712839210293-101)
 * @param {string} prefix - আইডির প্রিফিক্স
 * @return {string} ইউনিক আইডি
 */
function generateUniqueId(prefix) {
  const timestamp = new Date().getTime();
  const randomStr = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${randomStr}`;
}

/**
 * ইনভয়েস নম্বর তৈরির ফরম্যাট (যেমন: INV-20261011-0001)
 * @param {Sheet} salesSheet - Sales শিট অবজেক্ট
 * @return {string} ইনভয়েস নম্বর
 */
function generateInvoiceNumber(salesSheet) {
  const lastRow = salesSheet.getLastRow();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  const count = (lastRow <= 1) ? 1 : lastRow;
  return `INV-${today}-${count.toString().padStart(4, '0')}`;
}

/**
 * কেস-ইনসেনসিটিভ ও স্পেস-প্রুফ শিট অবজেক্ট খুঁজে বের করার সহায়ক ফাংশন
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {string} name - শিটের নাম (যেমন: 'Products')
 * @return {Sheet|null} শিট অবজেক্ট
 */
function getSheetCaseInsensitive(spreadsheet, name) {
  if (!spreadsheet) return null;
  const direct = spreadsheet.getSheetByName(name);
  if (direct) return direct;
  const target = String(name || '').trim().toLowerCase();
  const sheets = spreadsheet.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === target) {
      return sheets[i];
    }
  }
  return null;
}

/**
 * গুগল ড্রাইভ বা ড্রপবক্স শেয়ারিং লিংককে সরাসরি ইমেজ ডিসপ্লে ফরম্যাটে রূপান্তর করে
 * @param {string} url - ইনপুট ইমেজ লিংক
 * @return {string} সরাসরি রেন্ডারযোগ্য ইমেজ URL
 */
function formatGoogleDriveImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (!trimmed) return '';

  const formMatch = trimmed.match(/=IMAGE\s*\(\s*["']([^"']+)["']/i);
  if (formMatch && formMatch[1]) trimmed = formMatch[1].trim();

  if (trimmed.indexOf('drive.google.com') !== -1 || trimmed.indexOf('drive.usercontent.google.com') !== -1 || trimmed.indexOf('docs.google.com') !== -1) {
    const m = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
              trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
              trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
              trimmed.match(/open\?id=([a-zA-Z0-9_-]+)/);
    if (m && m[1]) {
      return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1000';
    }
  }
  if (trimmed.indexOf('dropbox.com') !== -1) {
    return trimmed.replace('dl=0', 'raw=1');
  }
  return trimmed;
}

/**
 * শিটের হেডার রো অনুযায়ী প্রতিটি সারির ডাটাকে জাভাস্ক্রিপ্ট অবজেক্টে রূপান্তর করার হেল্পার
 * @param {string} sheetName - শিটের নাম
 * @return {Array<Object>} অবজেক্টের অ্যারে
 */
function getSheetRowsAsObjects(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getSheetCaseInsensitive(spreadsheet, sheetName);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow <= 1 || lastColumn === 0) return [];

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const headers = values[0];
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      const headerName = String(headers[j] || '').trim();
      if (headerName) {
        rowObj[headerName] = values[i][j];
      }
    }

    // Products শিটের জন্য সাধারণ বানানের ভুল ও বিভিন্ন হেডার ভ্যারিয়েশন নর্মালাইজ করা
    if (sheetName === SHEETS.PRODUCTS) {
      if (!rowObj.ProductID) {
        rowObj.ProductID = rowObj['Product ID'] || rowObj['Product_ID'] || rowObj.ID || rowObj.id || rowObj.ItemId || rowObj['Item ID'] || '';
      }
      if (!rowObj.ProductName) {
        rowObj.ProductName = rowObj['Product Name'] || rowObj['Product_Name'] || rowObj.Name || rowObj.name || rowObj.Title || rowObj.ItemName || rowObj['Item Name'] || '';
      }
      if (!rowObj.Barcode) {
        rowObj.Barcode = rowObj['Bar Code'] || rowObj.barcode || rowObj.Code || rowObj.SKU || rowObj.ProductID || '';
      }
      if (rowObj.SellingPrice === undefined) {
        rowObj.SellingPrice = rowObj['Selling Price'] !== undefined ? rowObj['Selling Price'] : (rowObj.Price !== undefined ? rowObj.Price : (rowObj.SalePrice !== undefined ? rowObj.SalePrice : (rowObj.Rate !== undefined ? rowObj.Rate : 0)));
      }
      if (rowObj.CostPrice === undefined) {
        rowObj.CostPrice = rowObj['Cost Price'] !== undefined ? rowObj['Cost Price'] : (rowObj.Cost !== undefined ? rowObj.Cost : (rowObj.BuyPrice !== undefined ? rowObj.BuyPrice : (rowObj.PurchasePrice !== undefined ? rowObj.PurchasePrice : 0)));
      }
      if (rowObj.StockQuantity === undefined) {
        rowObj.StockQuantity = rowObj.StockQuantit !== undefined ? rowObj.StockQuantit : (rowObj.StockQty !== undefined ? rowObj.StockQty : (rowObj['Stock Quantity'] !== undefined ? rowObj['Stock Quantity'] : (rowObj.Stock !== undefined ? rowObj.Stock : (rowObj.Quantity !== undefined ? rowObj.Quantity : (rowObj.Qty !== undefined ? rowObj.Qty : 0)))));
      }
      if (rowObj.MinStockAlert === undefined) {
        rowObj.MinStockAlert = rowObj.MinStockAler !== undefined ? rowObj.MinStockAler : (rowObj['Min Stock Alert'] !== undefined ? rowObj['Min Stock Alert'] : 5);
      }
      if (!rowObj.Category) {
        rowObj.Category = rowObj['Category Name'] || rowObj.category || 'General';
      }
      if (!rowObj.SubCategory) {
        rowObj.SubCategory = rowObj['Sub Category'] || rowObj.subcategory || '';
      }
      if (!rowObj.Unit) {
        rowObj.Unit = rowObj['Unit Name'] || rowObj.unit || 'Pcs';
      }
      if (rowObj.ImageUrl === undefined) {
        rowObj.ImageUrl = rowObj.imageurl !== undefined ? rowObj.imageurl : (rowObj.Image !== undefined ? rowObj.Image : (rowObj['Image URL'] !== undefined ? rowObj['Image URL'] : (rowObj.Photo !== undefined ? rowObj.Photo : '')));
      }
      rowObj.ImageUrl = formatGoogleDriveImageUrl(rowObj.ImageUrl);
      if (rowObj.ImageCaption === undefined) {
        rowObj.ImageCaption = rowObj.imagecaption !== undefined ? rowObj.imagecaption : (rowObj.Caption !== undefined ? rowObj.Caption : (rowObj['Image Caption'] !== undefined ? rowObj['Image Caption'] : ''));
      }

      // সম্পূর্ণ খালি সারি উপেক্ষা করা
      if (!rowObj.ProductName && !rowObj.ProductID && !rowObj.Barcode) {
        continue;
      }
    }

    // Settings শিটের জন্য ফিল্ড নর্মালাইজেশন ও ডামি ডাটা ফিল্টারিং
    if (sheetName === SHEETS.SETTINGS) {
      const api = rowObj.ApiUrl || rowObj.apiUrl || rowObj.ApiURL || rowObj.URL || rowObj.WebappUrl || '';
      rowObj.ApiUrl = api;
      rowObj.apiUrl = api;

      // পরিচিত ডামি ভ্যালু ফিল্টার করা যাতে ইউজারের আসল ডাটা ক্ষতিগ্রস্ত না হয়
      if (rowObj.StoreName === 'Amar Enterprise POS' || rowObj.StoreName === 'Amar Super Shop & POS') {
        rowObj.StoreName = '';
      }
      if (rowObj.Address && (rowObj.Address.includes('Gulshan-2') || rowObj.Address.includes('গুলশান-১'))) {
        rowObj.Address = '';
      }
      if (rowObj.Email === 'contact@store.com' || rowObj.Email === 'support@amarsuper.com') {
        rowObj.Email = '';
      }
      if (rowObj.Phone === '+8801700000000' || rowObj.Phone === '+880 1700-000000') {
        rowObj.Phone = '';
      }

      // লোগো URL নর্মালাইজেশন এবং গুগল ড্রাইভ লিংক সরাসরি রেন্ডারযোগ্য ফরম্যাটে রূপান্তর
      let rawLogo = '';
      const possibleLogoKeys = [
        'LogoUrl', 'logoUrl', 'LogoURL', 'Logourl', 'logourl',
        'Logo', 'logo', 'Logo URL', 'Logo url', 'Logo Url', 'LOGO URL',
        'Logo_Url', 'Logo_URL', 'Logo Link', 'LogoLink',
        'StoreLogo', 'Store Logo', 'ShopLogo', 'Shop Logo',
        'LogoImage', 'Logo Image', 'ImageUrl', 'imageUrl',
        'Image', 'image', 'Photo', 'photo', 'Icon', 'icon', 'লোগো'
      ];
      for (let k = 0; k < possibleLogoKeys.length; k++) {
        const pk = possibleLogoKeys[k];
        if (rowObj[pk] !== undefined && rowObj[pk] !== null && String(rowObj[pk]).trim()) {
          rawLogo = String(rowObj[pk]).trim();
          break;
        }
      }
      if (!rawLogo) {
        for (const pk in rowObj) {
          const cleanK = pk.toLowerCase().replace(/[\s_\-]/g, '');
          if (cleanK.indexOf('logo') !== -1 && rowObj[pk]) {
            rawLogo = String(rowObj[pk]).trim();
            break;
          }
        }
      }
      if (typeof rawLogo === 'string') {
        rawLogo = rawLogo.trim();
        const formMatch = rawLogo.match(/=IMAGE\s*\(\s*["']([^"']+)["']/i);
        if (formMatch && formMatch[1]) rawLogo = formMatch[1].trim();

        if (rawLogo.indexOf('via.placeholder') !== -1 || rawLogo.indexOf('images.unsplash') !== -1) {
          rawLogo = '';
        } else {
          rawLogo = formatGoogleDriveImageUrl(rawLogo);
        }
      }
      rowObj.LogoUrl = rawLogo;
      rowObj.logoUrl = rawLogo;
    }

    // Customers শিটের জন্য ডামি ডাটা ফিল্টারিং (যাতে কেবল রিয়েল ডাটা ক্লায়েন্টে যায়)
    if (sheetName === SHEETS.CUSTOMERS) {
      const p = String(rowObj.Phone || '').trim();
      const n = String(rowObj.CustomerName || '').trim();
      const id = String(rowObj.CustomerID || '').trim();

      const isDummy = (
        p === '01700000000' || p === '01711000001' || p === '01811000002' || p === '01819000002' || p === '01912000003' || p === '+8801700000000' ||
        n.indexOf('Walk-in Customer') !== -1 ||
        n.indexOf('আরিফুল ইসলাম') !== -1 ||
        n.indexOf('সুমাইয়া আক্তার') !== -1 ||
        n.indexOf('সুমাইয়া আক্তার') !== -1 ||
        n.indexOf('আব্দুর রহিম') !== -1 ||
        n.indexOf('করিম উল্লাহ') !== -1 ||
        (id === 'CUST-1001' && (n.indexOf('Walk-in') !== -1 || n.indexOf('রহিম') !== -1)) ||
        (id === 'CUST-1002' && (n.indexOf('আরিফুল') !== -1 || n.indexOf('করিম') !== -1)) ||
        (id === 'CUST-1003' && n.indexOf('সুমাই') !== -1)
      );

      if (isDummy) {
        continue;
      }
    }

    // দ্রুত আপডেটের জন্য গুগল শিটের সারি নম্বর সংরক্ষণ (১-ইনডেক্সড)
    rowObj._rowIndex = i + 1;
    rows.push(rowObj);
  }
  return rows;
}

/**
 * হেডার অ্যারে থেকে কেস-ইনসেনসিটিভ ও ফাজি ম্যাচ করে কলাম ইনডেক্স খুঁজে বের করা
 * @param {Array} headers - হেডার অ্যারে
 * @param {...string} names - ম্যাচ করার মতো নামসমূহ
 * @return {number} কলাম ইনডেক্স (০-ইনডেক্সড) অথবা না পেলে -১
 */
function findCol(headers, ...names) {
  if (!headers || !Array.isArray(headers)) return -1;
  const cleanHeaders = headers.map(h => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
  const cleanNames = names.map(n => String(n || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

  // ১. সর্বাগ্রে নিখুঁত (Exact) মিল খোঁজা
  for (const n of cleanNames) {
    const idx = cleanHeaders.indexOf(n);
    if (idx !== -1) return idx;
  }

  // ২. যদি নিখুঁত মিল না পাওয়া যায়, তখন ফাজি মিল খোঁজা (কিন্তু ImageUrl যেন ImageCaption এর সাথে না মেলে)
  for (let i = 0; i < cleanHeaders.length; i++) {
    const h = cleanHeaders[i];
    if (!h) continue;
    for (const n of cleanNames) {
      if ((n === 'imageurl' || n === 'image' || n === 'imgurl') && h.includes('caption')) continue;
      if ((n === 'imagecaption' || n === 'caption') && (h === 'imageurl' || h === 'image')) continue;
      if (h === n || (n.length >= 4 && (h.startsWith(n) || n.startsWith(h)))) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Settings (দোকানের মাস্টার সেটিংস) শিট নিশ্চিত করা ও কলাম হেডার আপডেট (ApiUrl কলাম নিশ্চিতকরণ)
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} Settings শিট অবজেক্ট
 */
function ensureSettingsSheet(spreadsheet) {
  let settingsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.SETTINGS);
  if (!settingsSheet) {
    settingsSheet = spreadsheet.insertSheet(SHEETS.SETTINGS);
  }

  const defaultHeaders = [
    'SettingID', 'StoreName', 'LogoUrl', 'CurrencySymbol', 
    'TaxRatePercent', 'Address', 'Phone', 'Email', 'ReceiptFooter', 'ApiUrl', 'UpdatedAt'
  ];

  if (settingsSheet.getLastRow() === 0) {
    settingsSheet.appendRow(defaultHeaders);
    return settingsSheet;
  }

  // হেডার কলাম পরীক্ষা করা এবং ApiUrl কলাম অনুপস্থিত থাকলে স্বয়ংক্রিয়ভাবে কলামটি যোগ করা
  const lastCol = settingsSheet.getLastColumn();
  if (lastCol > 0) {
    const headers = settingsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const apiColIdx = findCol(headers, 'ApiUrl', 'apiUrl', 'ApiURL', 'URL', 'WebappUrl');
    if (apiColIdx === -1) {
      settingsSheet.getRange(1, lastCol + 1).setValue('ApiUrl');
    }
  }

  return settingsSheet;
}

/**
 * Categories শিট নিশ্চিত করা (না থাকলে স্বয়ংক্রিয়ভাবে তৈরি ও প্রাথমিক ক্যাটাগরি পপুলেট করা)
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} Categories শিট অবজেক্ট
 */
function ensureCategoriesSheet(spreadsheet) {
  let categoriesSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.CATEGORIES);
  if (!categoriesSheet) {
    categoriesSheet = spreadsheet.insertSheet(SHEETS.CATEGORIES);
  }

  if (categoriesSheet.getLastRow() === 0) {
    categoriesSheet.appendRow([
      'CategoryID', 'CategoryName', 'SubCategoryName', 'Description', 'Status', 'CreatedAt'
    ]);
    const now = new Date();
    categoriesSheet.appendRow(['CAT-101', 'Grocery', 'Rice & Grain', 'চাল ও খাদ্যশস্য', 'Active', now]);
    categoriesSheet.appendRow(['CAT-102', 'Grocery', 'Edible Oil', 'ভোজ্যতেল ও ঘি', 'Active', now]);
    categoriesSheet.appendRow(['CAT-103', 'Grocery', 'Sugar & Salt', 'চিনি ও লবণ', 'Active', now]);
    categoriesSheet.appendRow(['CAT-104', 'Beverage', 'Tea & Coffee', 'চা ও কফি সামগ্রী', 'Active', now]);
    categoriesSheet.appendRow(['CAT-105', 'Beverage', 'Juice & Drinks', 'জুস ও পানীয়', 'Active', now]);
    categoriesSheet.appendRow(['CAT-106', 'Dairy', 'Milk & Dairy', 'দুধ ও দুগ্ধজাত পণ্য', 'Active', now]);
    categoriesSheet.appendRow(['CAT-107', 'Bakery', 'Biscuits & Cookies', 'বিস্কুট ও কুকিজ', 'Active', now]);
  }

  return categoriesSheet;
}

/**
 * Units (পরিমাপক একক) শিট নিশ্চিত করা (না থাকলে তৈরি ও প্রারম্ভিক এককগুলো যোগ করা)
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} Units শিট অবজেক্ট
 */
function ensureUnitsSheet(spreadsheet) {
  let unitsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.UNITS);
  if (!unitsSheet) {
    unitsSheet = spreadsheet.insertSheet(SHEETS.UNITS);
  }

  if (unitsSheet.getLastRow() === 0) {
    unitsSheet.appendRow([
      'UnitID', 'UnitName', 'ShortName', 'Description', 'Status', 'CreatedAt'
    ]);
    const now = new Date();
    unitsSheet.appendRow(['UNIT-101', 'Piece (পিস)', 'Pcs', 'একক পিস পণ্য', 'Active', now]);
    unitsSheet.appendRow(['UNIT-102', 'Packet (প্যাকেট)', 'Packet', 'প্যাকেটজাত পণ্য', 'Active', now]);
    unitsSheet.appendRow(['UNIT-103', 'Kilogram (কেজি)', 'Kg', 'ওজন পরিমাপক কেজি', 'Active', now]);
    unitsSheet.appendRow(['UNIT-104', 'Gram (গ্রাম)', 'gm', 'ক্ষুদ্র ওজন একক', 'Active', now]);
    unitsSheet.appendRow(['UNIT-105', 'Litre (লিটার)', 'Ltr', 'তরল পরিমাপক লিটার', 'Active', now]);
    unitsSheet.appendRow(['UNIT-106', 'Millilitre (মিলি)', 'ml', 'ক্ষুদ্র তরল একক', 'Active', now]);
    unitsSheet.appendRow(['UNIT-107', 'Box (বক্স/কার্টন)', 'Box', 'কার্টন বা বক্স', 'Active', now]);
    unitsSheet.appendRow(['UNIT-108', 'Bottle (বোতল)', 'Bottle', 'বোতলজাত পণ্য', 'Active', now]);
    unitsSheet.appendRow(['UNIT-109', 'Dozen (ডজন)', 'Dozen', '১২ পিস বা ডজন', 'Active', now]);
    unitsSheet.appendRow(['UNIT-110', 'Pair (জোড়া)', 'Pair', 'জুতো বা জোড়া আইটেম', 'Active', now]);
    unitsSheet.appendRow(['UNIT-111', 'Meter (মিটার)', 'Meter', 'দৈর্ঘ্য বা কাপড়', 'Active', now]);
    unitsSheet.appendRow(['UNIT-112', 'Roll (রোল)', 'Roll', 'রোল বা ফিতা জাতীয়', 'Active', now]);
  }

  return unitsSheet;
}

/**
 * Customers (গ্রাহক ডাটাবেস) শিট নিশ্চিত করা (না থাকলে তৈরি এবং কোনো ডামি গ্রাহক ছাড়া শুধুমাত্র হেডার যুক্ত করা)
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} Customers শিট অবজেক্ট
 */
function ensureCustomersSheet(spreadsheet) {
  let customersSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.CUSTOMERS);
  if (!customersSheet) {
    customersSheet = spreadsheet.insertSheet(SHEETS.CUSTOMERS);
  }

  if (customersSheet.getLastRow() === 0) {
    customersSheet.appendRow([
      'CustomerID', 'CustomerName', 'Phone', 'Email', 'Address', 'CustomerType', 'TotalOrders', 'TotalSpent', 'Status', 'CreatedAt', 'UpdatedAt'
    ]);
  } else {
    // পূর্বে থাকা ডামি কাস্টমার ডাটা স্বয়ংক্রিয়ভাবে ক্লিন করা
    cleanDummyCustomersFromSheet(customersSheet);
  }

  return customersSheet;
}

/**
 * Coupons (কুপন ডাটাবেস) শিট নিশ্চিত করা (না থাকলে তৈরি এবং প্রয়োজনীয় কলাম হেডার যুক্ত করা)
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} Coupons শিট অবজেক্ট
 */
function ensureCouponsSheet(spreadsheet) {
  let couponsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.COUPONS);
  if (!couponsSheet) {
    couponsSheet = spreadsheet.insertSheet(SHEETS.COUPONS);
  }

  if (couponsSheet.getLastRow() === 0) {
    couponsSheet.appendRow([
      'CouponID', 'CouponCode', 'DiscountType', 'DiscountValue', 'ApplicableType', 'ProductID', 'ProductName', 'MinPurchaseAmount', 'MaxDiscountAmount', 'UsageLimit', 'UsedCount', 'ExpiryDate', 'Status', 'CreatedAt', 'UpdatedAt'
    ]);
  }

  return couponsSheet;
}

/**
 * Variants (ভ্যারিয়েন্ট ডাটাবেস) শিট নিশ্চিত করা (না থাকলে তৈরি এবং প্রারম্ভিক রঙ ও সাইজগুলো যোগ করা)
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} Variants শিট অবজেক্ট
 */
function ensureVariantsSheet(spreadsheet) {
  let variantsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.VARIANTS);
  if (!variantsSheet) {
    variantsSheet = spreadsheet.insertSheet(SHEETS.VARIANTS);
  }

  if (variantsSheet.getLastRow() === 0) {
    variantsSheet.appendRow([
      'VariantID', 'Type', 'Name', 'Value', 'Description', 'Status', 'CreatedAt'
    ]);
    const now = new Date();
    // ডিফল্ট রঙ (Color)
    const defaultColors = [
      'লাল', 'নীল', 'কালো', 'সাদা', 'সবুজ', 'হলুদ', 'গোলাপি', 'মেরুন', 
      'নেভি ব্লু', 'অফ-হোয়াইট', 'ছাই', 'বেগুনি', 'ফিরোজা', 'জলপাই', 'কমলা', 
      'ম্যাজেন্টা', 'বাসন্তী', 'লাল খয়েরি'
    ];
    defaultColors.forEach((color, idx) => {
      variantsSheet.appendRow([`VAR-COL-${100 + idx}`, 'Color', color, '', 'রঙ ভ্যারিয়েন্ট', 'Active', now]);
    });

    // ডিফল্ট সাইজ (Size)
    const defaultSizes = ['S', 'M', 'L', 'XL', 'XXL', '38', '40', '42', '44', '28', '30', '32', '34', '36'];
    defaultSizes.forEach((size, idx) => {
      variantsSheet.appendRow([`VAR-SIZ-${100 + idx}`, 'Size', size, '', 'সাইজ ভ্যারিয়েন্ট', 'Active', now]);
    });

    // ডিফল্ট ওজন (Weight)
    const defaultWeights = ['100gm', '250gm', '500gm', '1kg', '2kg', '5kg'];
    defaultWeights.forEach((w, idx) => {
      variantsSheet.appendRow([`VAR-WGT-${100 + idx}`, 'Weight', w, '', 'ওজন ভ্যারিয়েন্ট', 'Active', now]);
    });

    SpreadsheetApp.flush();
  }

  return variantsSheet;
}

/**
 * Customers শিট থেকে পূর্বে তৈরি হওয়া সমস্ত ডামি/নমুনা গ্রাহক সারি মুছে ফেলা
 * @param {Sheet} customersSheet - Customers শিট অবজেক্ট
 */
function cleanDummyCustomersFromSheet(customersSheet) {
  if (!customersSheet || customersSheet.getLastRow() <= 1) return;
  const lastRow = customersSheet.getLastRow();
  const lastCol = customersSheet.getLastColumn();
  const headers = customersSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const idCol = findCol(headers, 'CustomerID', 'ID');
  const nameCol = findCol(headers, 'CustomerName', 'Name');
  const phoneCol = findCol(headers, 'Phone', 'Mobile');

  const data = customersSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  for (let r = data.length - 1; r >= 0; r--) {
    const row = data[r];
    const cId = idCol !== -1 ? String(row[idCol] || '').trim() : '';
    const cName = nameCol !== -1 ? String(row[nameCol] || '').trim() : '';
    const cPhone = phoneCol !== -1 ? String(row[phoneCol] || '').trim() : '';

    const isDummy = (
      cId === 'CUST-1001' || cId === 'CUST-1002' || cId === 'CUST-1003' ||
      cPhone === '01700000000' || cPhone === '01711000001' || cPhone === '01811000002' || cPhone === '01819000002' || cPhone === '01912000003' ||
      cName.indexOf('Walk-in Customer') !== -1 ||
      cName.indexOf('আরিফুল ইসলাম') !== -1 ||
      cName.indexOf('সুমাইয়া আক্তার') !== -1 ||
      cName.indexOf('সুমাইয়া আক্তার') !== -1 ||
      cName.indexOf('আব্দুর রহিম') !== -1 ||
      cName.indexOf('করিম উল্লাহ') !== -1
    );

    if (isDummy) {
      customersSheet.deleteRow(r + 2);
    }
  }
}

/**
 * Products শিটের প্রতিটি কলাম যাচাই ও অনুপস্থিত থাকলে স্বয়ংক্রিয়ভাবে ইনসার্ট করা
 * (SellingPrice, CostPrice, StockQuantity, Unit, ইত্যাদি নিশ্চিতকরণ)
 * @param {Sheet} productsSheet - Products শিট অবজেক্ট
 * @return {Array<string>} বর্তমান হেডার অ্যারে
 */
function ensureProductsHeaders(productsSheet) {
  if (productsSheet.getLastRow() === 0) {
    const defaultHeaders = [
      'ProductID', 'Barcode', 'ProductName', 'Category', 'SubCategory',
      'CostPrice', 'SellingPrice', 'StockQuantity', 'MinStockAlert', 
      'Unit', 'ImageUrl', 'ImageCaption', 'ShortDescription', 'Description', 'Features', 
      'CreatedAt', 'UpdatedAt'
    ];
    productsSheet.appendRow(defaultHeaders);
    return defaultHeaders;
  }

  const lastCol = productsSheet.getLastColumn();
  let headers = productsSheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // ১. SubCategory কলাম যুক্ত করা (যদি না থাকে)
  if (findCol(headers, 'SubCategory', 'SubCat') === -1) {
    const catIndex = findCol(headers, 'Category', 'Cat');
    if (catIndex !== -1) {
      productsSheet.insertColumnAfter(catIndex + 1);
      productsSheet.getRange(1, catIndex + 2).setValue('SubCategory');
    } else {
      productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('SubCategory');
    }
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ২. CostPrice কলাম যুক্ত করা (যদি না থাকে)
  if (findCol(headers, 'CostPrice', 'Cost', 'BuyPrice') === -1) {
    const subCatIndex = findCol(headers, 'SubCategory', 'SubCat');
    const catIndex = findCol(headers, 'Category', 'Cat');
    const targetIdx = subCatIndex !== -1 ? subCatIndex : catIndex;
    if (targetIdx !== -1) {
      productsSheet.insertColumnAfter(targetIdx + 1);
      productsSheet.getRange(1, targetIdx + 2).setValue('CostPrice');
    } else {
      productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('CostPrice');
    }
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ৩. SellingPrice কলাম যুক্ত করা (যদি না থাকে - বিশেষ গুরুত্ব)
  if (findCol(headers, 'SellingPrice', 'Price', 'SalePrice', 'SellPrice') === -1) {
    const costIndex = findCol(headers, 'CostPrice', 'Cost', 'BuyPrice');
    if (costIndex !== -1) {
      productsSheet.insertColumnAfter(costIndex + 1);
      productsSheet.getRange(1, costIndex + 2).setValue('SellingPrice');
    } else {
      productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('SellingPrice');
    }
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ৪. StockQuantity কলাম যুক্ত করা (যদি না থাকে)
  if (findCol(headers, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity', 'Qty') === -1) {
    const sellIndex = findCol(headers, 'SellingPrice', 'Price', 'SalePrice', 'SellPrice');
    if (sellIndex !== -1) {
      productsSheet.insertColumnAfter(sellIndex + 1);
      productsSheet.getRange(1, sellIndex + 2).setValue('StockQuantity');
    } else {
      productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('StockQuantity');
    }
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ৫. MinStockAlert কলাম যুক্ত করা (যদি না থাকে)
  if (findCol(headers, 'MinStockAlert', 'MinStockAler', 'MinStock', 'Alert') === -1) {
    const stockIndex = findCol(headers, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity', 'Qty');
    if (stockIndex !== -1) {
      productsSheet.insertColumnAfter(stockIndex + 1);
      productsSheet.getRange(1, stockIndex + 2).setValue('MinStockAlert');
    } else {
      productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('MinStockAlert');
    }
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ৬. Unit কলাম যুক্ত করা (যদি না থাকে)
  if (findCol(headers, 'Unit', 'UOM') === -1) {
    const alertIndex = findCol(headers, 'MinStockAlert', 'MinStockAler', 'MinStock', 'Alert');
    if (alertIndex !== -1) {
      productsSheet.insertColumnAfter(alertIndex + 1);
      productsSheet.getRange(1, alertIndex + 2).setValue('Unit');
    } else {
      productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('Unit');
    }
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ৭. ImageUrl কলাম যুক্ত করা (যদি না থাকে)
  if (findCol(headers, 'ImageUrl', 'Image', 'Photo', 'ImgUrl') === -1) {
    const unitIndex = findCol(headers, 'Unit', 'UOM');
    if (unitIndex !== -1) {
      productsSheet.insertColumnAfter(unitIndex + 1);
      productsSheet.getRange(1, unitIndex + 2).setValue('ImageUrl');
    } else {
      productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('ImageUrl');
    }
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ৮. ImageCaption কলাম যুক্ত করা (যদি না থাকে - SEO অপটিমাইজেশন)
  if (findCol(headers, 'ImageCaption', 'Caption', 'AltText', 'Alt') === -1) {
    const imgColIndex = findCol(headers, 'ImageUrl', 'Image', 'Photo', 'ImgUrl');
    if (imgColIndex !== -1) {
      productsSheet.insertColumnAfter(imgColIndex + 1);
      productsSheet.getRange(1, imgColIndex + 2).setValue('ImageCaption');
    } else {
      productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('ImageCaption');
    }
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ৯. ShortDescription কলাম যুক্ত করা (যদি না থাকে)
  if (findCol(headers, 'ShortDescription', 'ShortDesc') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('ShortDescription');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ৯. Description কলাম যুক্ত করা (যদি না থাকে)
  if (findCol(headers, 'Description', 'Desc', 'Details') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('Description');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১০. Features কলাম যুক্ত করা (যদি না থাকে)
  if (findCol(headers, 'Features', 'Feature', 'KeyFeatures') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('Features');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১১. CreatedAt কলাম যুক্ত করা (যদি না থাকে)
  if (findCol(headers, 'CreatedAt', 'Created', 'Date') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('CreatedAt');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১২. UpdatedAt কলাম যুক্ত করা (যদি না থাকে)
  if (findCol(headers, 'UpdatedAt', 'Updated') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('UpdatedAt');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১৩. WholesalePrice কলাম যুক্ত করা
  if (findCol(headers, 'WholesalePrice', 'Wholesale', 'DealerPrice') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('WholesalePrice');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১৪. MinSellingPrice কলাম যুক্ত করা
  if (findCol(headers, 'MinSellingPrice', 'FloorPrice', 'MinPrice') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('MinSellingPrice');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১৫. GodownStock কলাম যুক্ত করা
  if (findCol(headers, 'GodownStock', 'WarehouseStock', 'GodownQty') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('GodownStock');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১৬. YardsPerThan, ThanCount, TotalYards কলাম যুক্ত করা
  if (findCol(headers, 'YardsPerThan', 'GojPerThan') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('YardsPerThan');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }
  if (findCol(headers, 'ThanCount', 'TotalThan') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('ThanCount');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }
  if (findCol(headers, 'TotalYards', 'TotalGoj') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('TotalYards');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১৭. HasVariants কলাম যুক্ত করা
  if (findCol(headers, 'HasVariants', 'HasVariant') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('HasVariants');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১৮. VariantsJSON কলাম যুক্ত করা
  if (findCol(headers, 'VariantsJSON', 'Variants') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('VariantsJSON');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১৯. BatchNumber, ExpiryDate, MfgDate কলাম যুক্ত করা
  if (findCol(headers, 'BatchNumber', 'BatchNo') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('BatchNumber');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }
  if (findCol(headers, 'ExpiryDate', 'ExpDate') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('ExpiryDate');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }
  if (findCol(headers, 'MfgDate', 'Mfg') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('MfgDate');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ২০. IsBundle, BundleItemsJSON কলাম যুক্ত করা
  if (findCol(headers, 'IsBundle', 'Bundle') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('IsBundle');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }
  if (findCol(headers, 'BundleItemsJSON', 'BundleItems') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('BundleItemsJSON');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১০. হেডার বানানের ভুল স্বয়ংক্রিয়ভাবে সংশোধন (StockQuantit -> StockQuantity, MinStockAler -> MinStockAlert)
  const stockTypoIdx = headers.findIndex(h => String(h).trim().toLowerCase() === 'stockquantit');
  if (stockTypoIdx !== -1) {
    productsSheet.getRange(1, stockTypoIdx + 1).setValue('StockQuantity');
  }

  const alertTypoIdx = headers.findIndex(h => String(h).trim().toLowerCase() === 'minstockaler');
  if (alertTypoIdx !== -1) {
    productsSheet.getRange(1, alertTypoIdx + 1).setValue('MinStockAlert');
  }

  SpreadsheetApp.flush();
  return productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
}

/**
 * ImageUrl কলামে ভুলবশত প্রবেশ করা টাইমস্ট্যাম্প বা তারিখ পরিষ্কার করা
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট অবজেক্ট
 */
function fixExistingImageUrlColumn(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(SHEETS.PRODUCTS);
  if (!sheet || sheet.getLastRow() <= 1) return;

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const imgColIdx = findCol(headers, 'ImageUrl', 'Image');
  const createdColIdx = findCol(headers, 'CreatedAt', 'Created');
  const updatedColIdx = findCol(headers, 'UpdatedAt', 'Updated');

  if (imgColIdx === -1) return;

  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  for (let r = 0; r < data.length; r++) {
    const val = data[r][imgColIdx];
    // যদি ImageUrl সেলে তারিখ বা টাইমস্ট্যাম্প থাকে
    if (val instanceof Date || (typeof val === 'string' && (val.includes('/202') || val.includes('-202')))) {
      if (createdColIdx !== -1 && !data[r][createdColIdx]) {
        sheet.getRange(r + 2, createdColIdx + 1).setValue(val);
      }
      if (updatedColIdx !== -1 && !data[r][updatedColIdx]) {
        sheet.getRange(r + 2, updatedColIdx + 1).setValue(val);
      }
      // ImageUrl সেল থেকে ভুল টাইমস্ট্যাম্প মুছে খালি করা
      sheet.getRange(r + 2, imgColIdx + 1).setValue('');
    }
  }
}

/**
 * পুরো ডাটাবেসের স্কিমা অটো-মাইগ্রেশন ও স্বাস্থ্য পরীক্ষা
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট অবজেক্ট
 */
function ensureDatabaseSchema(spreadsheet) {
  // ০. Settings শিট ও ApiUrl কলাম নিশ্চিত করা
  ensureSettingsSheet(spreadsheet);

  // ১. Categories শিট নিশ্চিত করা
  ensureCategoriesSheet(spreadsheet);

  // ২. Units শিট নিশ্চিত করা (স্বয়ংক্রিয় পরিমাপক একক ট্যাব তৈরি)
  ensureUnitsSheet(spreadsheet);

  // ২.১ Customers (গ্রাহক ডাটাবেস) শিট নিশ্চিত করা
  ensureCustomersSheet(spreadsheet);

  // ২.২ Coupons (কুপন ডাটাবেস) শিট নিশ্চিত করা
  ensureCouponsSheet(spreadsheet);

  // ২.৩ Variants (ভ্যারিয়েন্ট ডাটাবেস) শিট নিশ্চিত করা
  ensureVariantsSheet(spreadsheet);

  // ৩. Products শিটের সকল কলাম (SellingPrice সহ) নিশ্চিত করা
  const productsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.PRODUCTS);
  if (productsSheet) {
    ensureProductsHeaders(productsSheet);
    // ImageUrl কলামে থাকা ভুল টাইমস্ট্যাম্প ঠিক করা
    fixExistingImageUrlColumn(spreadsheet);
    // পূর্বে স্থানচ্যুত হওয়া ডাটা মেরামত করা
    repairDisplacedProductData(spreadsheet);
  }

  SpreadsheetApp.flush();
}

/**
 * পূর্বে ভুল কলাম ইনডেক্সের কারণে ক্ষতিগ্রস্ত ডাটা মেরামত করা
 * (যেমন SubCategory তে চলে যাওয়া গাণিতিক খরচ সরানো এবং StockLogs থেকে সঠিক স্টক নিশ্চিত করা)
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট অবজেক্ট
 */
function repairDisplacedProductData(spreadsheet) {
  const productsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.PRODUCTS);
  const stockLogsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.STOCK_LOGS);
  if (!productsSheet || productsSheet.getLastRow() <= 1) return;

  const lastCol = productsSheet.getLastColumn();
  const lastRow = productsSheet.getLastRow();
  const headers = productsSheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const subCatColIdx = findCol(headers, 'SubCategory', 'SubCat');
  const costColIdx = findCol(headers, 'CostPrice', 'Cost', 'BuyPrice');
  const stockColIdx = findCol(headers, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity', 'Qty');
  const prodIdColIdx = findCol(headers, 'ProductID', 'ID');

  const data = productsSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  // StockLogs থেকে প্রতিটি পণ্যের সর্বশেষ রেকর্ড
  const latestStockLogs = {};
  if (stockLogsSheet && stockLogsSheet.getLastRow() > 1) {
    const logs = getSheetRowsAsObjects(SHEETS.STOCK_LOGS);
    for (let k = 0; k < logs.length; k++) {
      const log = logs[k];
      if (log.ProductID) {
        latestStockLogs[String(log.ProductID).trim()] = log;
      }
    }
  }

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    const pId = prodIdColIdx !== -1 ? String(row[prodIdColIdx] || '').trim() : '';
    const subCatVal = subCatColIdx !== -1 ? row[subCatColIdx] : '';

    // ১. যদি SubCategory তে ভুলবশত সংখ্যা (যেমন: 111.47) বসে থাকে
    if (subCatVal !== '' && !isNaN(Number(subCatVal)) && typeof subCatVal !== 'boolean') {
      const numericVal = Number(subCatVal);
      if (costColIdx !== -1) {
        productsSheet.getRange(r + 2, costColIdx + 1).setValue(numericVal);
      }
      if (subCatColIdx !== -1) {
        productsSheet.getRange(r + 2, subCatColIdx + 1).setValue('');
      }
    }
  }
  SpreadsheetApp.flush();
}

