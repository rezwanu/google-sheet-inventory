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
  COUPONS: 'Coupons'
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
 * Users (ব্যবহারকারী ও স্টাফ ডাটাবেস) শিট নিশ্চিত করা
 * (না থাকলে তৈরি এবং সাইনআপ ও ইউজার ম্যানেজমেন্টের জন্য প্রয়োজনীয় সকল কলাম হেডার নিশ্চিত করা)
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} Users শিট অবজেক্ট
 */
function ensureUsersSheet(spreadsheet) {
  let usersSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.USERS);
  if (!usersSheet) {
    usersSheet = spreadsheet.insertSheet(SHEETS.USERS);
  }

  const expectedHeaders = [
    'UserID', 'FullName', 'Phone', 'Email', 'Role', 'PIN', 'Address', 'AvatarUrl', 'Status', 'CreatedAt', 'UpdatedAt'
  ];

  if (usersSheet.getLastRow() === 0) {
    usersSheet.appendRow(expectedHeaders);
    const now = new Date();
    usersSheet.appendRow([
      'USER-ADMIN-01', 'এডমিন মোহাম্মদ করিম', '01700000000', 'admin@pos.local', 'Admin', '1234', 'হেড অফিস, গুলশান, ঢাকা', 'Active', now, now
    ]);
    usersSheet.appendRow([
      'USER-CASHIER-01', 'প্রধান ক্যাশিয়ার রফিক', '01711111111', 'cashier@pos.local', 'Cashier', '1122', 'কাউন্টার ১, ঢাকা', 'Active', now, now
    ]);
    return usersSheet;
  }

  // যদি শিটটিতে পূর্বে কিছু কলাম (যেমন Phone, Address, UpdatedAt) অনুপস্থিত থাকে, ডাটা অক্ষত রেখে হেডার যুক্ত করা
  const lastCol = usersSheet.getLastColumn();
  if (lastCol > 0) {
    const existingHeaders = usersSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    for (let h = 0; h < expectedHeaders.length; h++) {
      const headerName = expectedHeaders[h];
      const foundIdx = findCol(existingHeaders, headerName);
      if (foundIdx === -1) {
        usersSheet.getRange(1, usersSheet.getLastColumn() + 1).setValue(headerName);
        existingHeaders.push(headerName);
      }
    }
  }

  return usersSheet;
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

  // ২.৩ Users (ব্যবহারকারী ও স্টাফ ডাটাবেস) শিট নিশ্চিত করা
  ensureUsersSheet(spreadsheet);


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



/**
 * ============================================================================
 * DatabaseSetup.gs - ডাটাবেস স্বয়ংক্রিয় ইনিশিয়ালাইজেশন
 * ============================================================================
 * এই ফাইলটির setupDatabase() ফাংশন রান করলে Google Sheets-এ স্বয়ংক্রিয়ভাবে
 * ৫টি ট্যাব এবং তাদের প্রমিত হেডার কলাম ও নমুনা ডাটা তৈরি হয়ে যাবে।
 */

function setupDatabase() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // ১. Settings শিট তৈরি ও ইনিশিয়ালাইজেশন
  let settingsSheet = spreadsheet.getSheetByName(SHEETS.SETTINGS);
  if (!settingsSheet) {
    settingsSheet = spreadsheet.insertSheet(SHEETS.SETTINGS);
  }
  if (settingsSheet.getLastRow() === 0) {
    settingsSheet.appendRow([
      'SettingID', 'StoreName', 'LogoUrl', 'CurrencySymbol', 
      'TaxRatePercent', 'Address', 'Phone', 'Email', 'ReceiptFooter', 'ApiUrl', 'UpdatedAt'
    ]);
  }

  // ২. Products শিট তৈরি ও ইনিশিয়ালাইজেশন
  let productsSheet = spreadsheet.getSheetByName(SHEETS.PRODUCTS);
  if (!productsSheet) {
    productsSheet = spreadsheet.insertSheet(SHEETS.PRODUCTS);
  }
  if (productsSheet.getLastRow() === 0) {
    productsSheet.appendRow([
      'ProductID', 'Barcode', 'ProductName', 'Category', 'SubCategory',
      'CostPrice', 'SellingPrice', 'StockQuantity', 'MinStockAlert', 
      'Unit', 'ImageUrl', 'CreatedAt', 'UpdatedAt'
    ]);
    // শুধুমাত্র প্রমিত হেডার কলাম যোগ করা (কোনো ডামি বা ডেমো পণ্য যুক্ত হবে না)
  }


  // ৩. Categories শিট তৈরি ও ইনিশিয়ালাইজেশন (মাল্টি ও সাব-ক্যাটাগরি হায়ারার্কি)
  let categoriesSheet = spreadsheet.getSheetByName(SHEETS.CATEGORIES);
  if (!categoriesSheet) {
    categoriesSheet = spreadsheet.insertSheet(SHEETS.CATEGORIES);
  }
  if (categoriesSheet.getLastRow() === 0) {
    categoriesSheet.appendRow([
      'CategoryID', 'CategoryName', 'SubCategoryName', 'Description', 'Status', 'CreatedAt'
    ]);
    categoriesSheet.appendRow(['CAT-101', 'Grocery', 'Rice & Grain', 'চাল ও খাদ্যশস্য', 'Active', new Date()]);
    categoriesSheet.appendRow(['CAT-102', 'Grocery', 'Edible Oil', 'ভোজ্যতেল ও ঘি', 'Active', new Date()]);
    categoriesSheet.appendRow(['CAT-103', 'Grocery', 'Sugar & Salt', 'চিনি ও লবণ', 'Active', new Date()]);
    categoriesSheet.appendRow(['CAT-104', 'Beverage', 'Tea & Coffee', 'চা ও কফি সামগ্রী', 'Active', new Date()]);
    categoriesSheet.appendRow(['CAT-105', 'Beverage', 'Juice & Drinks', 'জুস ও পানীয়', 'Active', new Date()]);
    categoriesSheet.appendRow(['CAT-106', 'Dairy', 'Milk & Dairy', 'দুধ ও দুগ্ধজাত পণ্য', 'Active', new Date()]);
    categoriesSheet.appendRow(['CAT-107', 'Bakery', 'Biscuits & Cookies', 'বিস্কুট ও কুকিজ', 'Active', new Date()]);
  }

  // ৩. Sales শিট তৈরি ও ইনিশিয়ালাইজেশন
  let salesSheet = spreadsheet.getSheetByName(SHEETS.SALES);
  if (!salesSheet) {
    salesSheet = spreadsheet.insertSheet(SHEETS.SALES);
  }
  if (salesSheet.getLastRow() === 0) {
    salesSheet.appendRow([
      'SaleID', 'InvoiceNo', 'Timestamp', 'CustomerName', 'CustomerPhone',
      'ItemsJSON', 'ItemsSummary', 'SubTotal', 'TaxPercent', 'TaxAmount', 
      'DiscountAmount', 'GrandTotal', 'PaymentMethod', 'CashierEmail', 'Status', 'Notes'
    ]);
  }

  // ৪. StockLogs শিট তৈরি ও ইনিশিয়ালাইজেশন
  let stockLogsSheet = spreadsheet.getSheetByName(SHEETS.STOCK_LOGS);
  if (!stockLogsSheet) {
    stockLogsSheet = spreadsheet.insertSheet(SHEETS.STOCK_LOGS);
  }
  if (stockLogsSheet.getLastRow() === 0) {
    stockLogsSheet.appendRow([
      'LogID', 'Timestamp', 'ProductID', 'ProductName', 'LogType', 
      'PreviousStock', 'QuantityChange', 'NewStock', 'UnitCost', 
      'SupplierName', 'HandledBy', 'ReferenceID', 'Notes'
    ]);
  }

  // ৫. Users শিট তৈরি ও ইনিশিয়ালাইজেশন
  let usersSheet = spreadsheet.getSheetByName(SHEETS.USERS);
  if (!usersSheet) {
    usersSheet = spreadsheet.insertSheet(SHEETS.USERS);
  }
  if (usersSheet.getLastRow() === 0) {
    usersSheet.appendRow([
      'UserID', 'FullName', 'Email', 'Role', 'PIN', 'Status', 'CreatedAt'
    ]);
    usersSheet.appendRow([
      'USER-1', 'Super Admin', 'admin@pos.local', 'Admin', '1234', 'Active', new Date()
    ]);
    usersSheet.appendRow([
      'USER-2', 'Main Cashier', 'cashier@pos.local', 'Cashier', '1122', 'Active', new Date()
    ]);
  }

  // ৬. Units (পরিমাপক একক) শিট তৈরি ও ইনিশিয়ালাইজেশন
  ensureUnitsSheet(spreadsheet);

  // ৭. Customers (গ্রাহক ডাটাবেস) শিট তৈরি ও ইনিশিয়ালাইজেশন (কোনো ডামি গ্রাহক ছাড়া)
  ensureCustomersSheet(spreadsheet);

  // ৮. Coupons (কুপন ও অফার ডাটাবেস) শিট তৈরি ও কলাম হেডার ইনিশিয়ালাইজেশন
  ensureCouponsSheet(spreadsheet);

  return 'সবগুলো শিট এবং হেডার সফলভাবে তৈরি করা হয়েছে!';
}

/**
 * বিদ্যমান ডাটাবেস স্কিমা আপডেট/মাইগ্রেট করার ফাংশন
 * এটি কোনো পূর্ববর্তী ডাটা মুছে না ফেলে স্বয়ংক্রিয়ভাবে Categories শিট এবং
 * Products শিটে SubCategory ও ImageUrl কলাম নিশ্চিত করে এবং ডাটা মেরামত করে।
 */
function upgradeDatabaseSchema() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  ensureDatabaseSchema(spreadsheet);
  repairProductsSheetData();
  return 'ডাটাবেস স্কিমা সফলভাবে আপগ্রেড ও প্রোডাক্ট ডাটা মেরামত করা হয়েছে!';
}

/**
 * পূর্বে কলাম শিফটিং বা ভুল ইনডেক্সের কারণে ক্ষতিগ্রস্ত ডাটা স্বয়ংক্রিয়ভাবে মেরামত করার ফাংশন
 * এটি SubCategory তে চলে যাওয়া সংখ্যাকে CostPrice এ ফিরিয়ে আনে এবং StockLogs থেকে সঠিক মজুত সেট করে।
 */
function repairProductsSheetData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const productsSheet = spreadsheet.getSheetByName(SHEETS.PRODUCTS);
  const stockLogsSheet = spreadsheet.getSheetByName(SHEETS.STOCK_LOGS);
  if (!productsSheet || productsSheet.getLastRow() <= 1) return 'কোনো ডাটা পাওয়া যায়নি।';

  const lastCol = productsSheet.getLastColumn();
  const lastRow = productsSheet.getLastRow();
  const headers = productsSheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const subCatColIdx = findCol(headers, 'SubCategory', 'SubCat');
  const costColIdx = findCol(headers, 'CostPrice', 'Cost', 'BuyPrice');
  const priceColIdx = findCol(headers, 'SellingPrice', 'Price', 'SalePrice');
  const stockColIdx = findCol(headers, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity', 'Qty');
  const prodIdColIdx = findCol(headers, 'ProductID', 'ID');
  const barcodeColIdx = findCol(headers, 'Barcode', 'Code');

  const data = productsSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  // StockLogs থেকে প্রতিটি পণ্যের সর্বশেষ সঠিক NewStock সংগ্রহ করা
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

    // ১. যদি SubCategory তে ভুলবশত গড় খরচের সংখ্যা (যেমন: 111.47) বসে থাকে
    if (subCatVal !== '' && !isNaN(Number(subCatVal)) && typeof subCatVal !== 'boolean') {
      const numericVal = Number(subCatVal);
      if (costColIdx !== -1) {
        productsSheet.getRange(r + 2, costColIdx + 1).setValue(numericVal);
      }
      if (subCatColIdx !== -1) {
        productsSheet.getRange(r + 2, subCatColIdx + 1).setValue('');
      }
    }

    // ২. StockLogs থেকে সর্বশেষ প্রকৃত NewStock দিয়ে StockQuantity ঠিক করা
    if (pId && latestStockLogs[pId]) {
      const lastLog = latestStockLogs[pId];
      const correctStock = Number(lastLog.NewStock);
      if (!isNaN(correctStock) && stockColIdx !== -1) {
        productsSheet.getRange(r + 2, stockColIdx + 1).setValue(correctStock);
      }
    }
  }

  return 'Products শিটের ডাটা সফলভাবে মেরামত করা হয়েছে!';
}




/**
 * ============================================================================
 * StockService.gs - ইনভেন্টরি ও কিউমুলেটিভ স্টক ট্র্যাকিং সার্ভিস
 * ============================================================================
 * নতুন স্টক ইনপুট, কিউমুলেটিভ গণনা (previous_stock + incoming_qty),
 * ওয়েইটেড এভারেজ কস্ট নির্ণয় এবং StockLogs-এ অডিট রেকর্ড লিপিবদ্ধ করে।
 */

/**
 * নতুন স্টক যোগ করার মূল হ্যান্ডলার
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - ক্লায়েন্ট থেকে পাঠানো রিকোয়েস্ট বডি
 * @return {Object} রেসপন্স অবজেক্ট
 */
function handleAddStock(spreadsheet, payload) {
  const {
    productId,
    incomingQty,
    unitCost,
    supplierName,
    handledBy,
    notes
  } = payload;

  // ইনপুট ভ্যালিডেশন
  if (!productId || incomingQty === undefined || incomingQty <= 0) {
    return {
      success: false,
      message: 'সঠিক ProductID এবং পজিটিভ Incoming Quantity প্রদান করুন।'
    };
  }

  const productsSheet = spreadsheet.getSheetByName(SHEETS.PRODUCTS);
  const stockLogsSheet = spreadsheet.getSheetByName(SHEETS.STOCK_LOGS);
  const products = getSheetRowsAsObjects(SHEETS.PRODUCTS);

  // নির্দিষ্ট প্রোডাক্টটি আইডি বা বারকোড দিয়ে খুঁজে বের করা
  const product = products.find(p => p.ProductID == productId || p.Barcode == productId);
  if (!product) {
    return {
      success: false,
      message: `ProductID বা বারকোড '${productId}' বিশিষ্ট কোনো পণ্য পাওয়া যায়নি।`
    };
  }

  const previousStock = Number(product.StockQuantity) || 0;
  const incomingNumber = Number(incomingQty);
  
  // কিউমুলেটিভ স্টক ট্র্যাকিং লজিক: পূর্বের স্টক + নতুন আসা স্টক
  const newStock = previousStock + incomingNumber;

  const currentCost = Number(product.CostPrice) || 0;
  const newUnitCost = (unitCost !== undefined && unitCost !== null && unitCost !== '') 
                      ? Number(unitCost) 
                      : currentCost;

  // ওয়েইটেড এভারেজ কস্ট (Weighted Average Cost) ক্যালকুলেশন:
  // ফর্মুলা: ((পূর্বের স্টক * পূর্বের কেনা দাম) + (নতুন স্টক * নতুন কেনা দাম)) / নতুন মোট স্টক
  let weightedAverageCost = newUnitCost;
  if (newStock > 0) {
    const totalPreviousValue = previousStock * currentCost;
    const totalIncomingValue = incomingNumber * newUnitCost;
    weightedAverageCost = parseFloat(((totalPreviousValue + totalIncomingValue) / newStock).toFixed(2));
  }

  const timestamp = new Date();
  const rowIndex = product._rowIndex;

  // Products শিটে নতুন এভারেজ কেনা দাম ও নতুন স্টক সংখ্যা ডাইনামিকভাবে আপডেট করা
  const headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  let costColIdx = findCol(headers, 'CostPrice', 'Cost', 'BuyPrice');
  if (costColIdx === -1) {
    costColIdx = headers.findIndex(h => /cost|buy/i.test(String(h || '').trim()));
  }
  let stockColIdx = findCol(headers, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity', 'Qty');
  if (stockColIdx === -1) {
    stockColIdx = headers.findIndex(h => /stock|qty|quant/i.test(String(h || '').trim()));
  }
  let updatedColIdx = findCol(headers, 'UpdatedAt', 'Updated');
  if (updatedColIdx === -1) {
    updatedColIdx = headers.findIndex(h => /update/i.test(String(h || '').trim()));
  }

  if (costColIdx !== -1) {
    productsSheet.getRange(rowIndex, costColIdx + 1).setValue(weightedAverageCost);
  }
  if (stockColIdx !== -1) {
    productsSheet.getRange(rowIndex, stockColIdx + 1).setValue(newStock);
  }
  if (updatedColIdx !== -1) {
    productsSheet.getRange(rowIndex, updatedColIdx + 1).setValue(timestamp);
  }

  // StockLogs শিটে ইনভেন্টরি অডিট ট্রেইল হিসেবে রেকর্ড যোগ করা
  const logId = generateUniqueId('STKLOG');
  stockLogsSheet.appendRow([
    logId,
    timestamp,
    product.ProductID,
    product.ProductName,
    'STOCK_IN',             // LogType
    previousStock,          // PreviousStock
    incomingNumber,         // QuantityChange
    newStock,               // NewStock
    newUnitCost,            // UnitCost (এই লটের কেনা দাম)
    supplierName || 'General Supplier',
    handledBy || 'Admin',
    'MANUAL_ENTRY',
    notes || 'নতুন স্টক ইনপুট'
  ]);

  // অবিলম্বে গুগল শিটে সমস্ত ডাটা ফ্লাশ ও নিশ্চিত করা
  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'নতুন স্টক সফলভাবে যোগ ও রেকর্ড করা হয়েছে।',
    data: {
      productId: product.ProductID,
      productName: product.ProductName,
      previousStock: previousStock,
      incomingQty: incomingNumber,
      newStock: newStock,
      unitCost: newUnitCost,
      weightedAverageCost: weightedAverageCost
    }
  };
}



/**
 * ============================================================================
 * SalesService.gs - POS সেলস প্রসেসিং এবং স্টক কর্তন সার্ভিস
 * ============================================================================
 * নতুন বিক্রয় প্রসেস করা, স্টক ভ্যালিডেশন, ইনভেন্টরি কর্তন, ইনভয়েস জেনারেশন
 * এবং Sales ও StockLogs শিটে ট্রানজেকশন সংরক্ষণ করে।
 */

/**
 * POS অর্ডার প্রসেস করার মূল হ্যান্ডলার
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - ক্লায়েন্ট থেকে পাঠানো অর্ডারের বিবরণ
 * @return {Object} রেসপন্স অবজেক্ট
 */
function handleCreateSale(spreadsheet, payload) {
  const {
    items,               // [{ productId, quantity, sellingPrice, costPrice }]
    customerName,
    customerPhone,
    discountAmount,
    paymentMethod,
    cashierEmail,
    notes
  } = payload;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return {
      success: false,
      message: 'অর্ডারে অন্তত একটি আইটেম থাকা আবশ্যক।'
    };
  }

  const productsSheet = spreadsheet.getSheetByName(SHEETS.PRODUCTS);
  const salesSheet = spreadsheet.getSheetByName(SHEETS.SALES);
  const stockLogsSheet = spreadsheet.getSheetByName(SHEETS.STOCK_LOGS);

  const products = getSheetRowsAsObjects(SHEETS.PRODUCTS);
  const settingsList = getSheetRowsAsObjects(SHEETS.SETTINGS);
  const storeSettings = settingsList.length > 0 ? settingsList[0] : {};
  const taxRatePercent = Number(storeSettings.TaxRatePercent) || 0;

  // ১. পণ্যের প্রাপ্যতা এবং স্টক পর্যাপ্ততা যাচাই
  const validatedItems = [];
  let subTotal = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const product = products.find(p => p.ProductID == item.productId || p.Barcode == item.productId);

    if (!product) {
      return {
        success: false,
        message: `পণ্য আইডি '${item.productId}' ডাটাবেসে পাওয়া যায়নি।`
      };
    }

    const currentStock = Number(product.StockQuantity) || 0;
    const requestedQty = Number(item.quantity) || 0;

    if (requestedQty <= 0) {
      return {
        success: false,
        message: `'${product.ProductName}' এর জন্য সঠিক পরিমাণ প্রদান করুন।`
      };
    }

    // স্টক ঘাটতি রোধ: যদি কার্টের পরিমাণ বিদ্যমান স্টকের চেয়ে বেশি হয়
    if (currentStock < requestedQty) {
      return {
        success: false,
        message: `'${product.ProductName}' এর পর্যাপ্ত স্টক নেই! বর্তমান স্টক: ${currentStock}, আপনার রিকোয়েস্ট: ${requestedQty}`
      };
    }

    const itemSellingPrice = (item.sellingPrice !== undefined) ? Number(item.sellingPrice) : Number(product.SellingPrice);
    const itemCostPrice = Number(product.CostPrice) || 0;
    const itemTotal = itemSellingPrice * requestedQty;
    subTotal += itemTotal;

    validatedItems.push({
      productObj: product,
      productId: product.ProductID,
      barcode: product.Barcode,
      productName: product.ProductName,
      quantity: requestedQty,
      sellingPrice: itemSellingPrice,
      costPrice: itemCostPrice,
      total: itemTotal
    });
  }

  // ২. ট্যাক্স, ডিসকাউন্ট এবং গ্র্যান্ড টোটাল হিসাব
  const discount = Number(discountAmount) || 0;
  const taxableAmount = Math.max(0, subTotal - discount);
  const taxAmount = parseFloat(((taxableAmount * taxRatePercent) / 100).toFixed(2));
  const grandTotal = parseFloat((taxableAmount + taxAmount).toFixed(2));

  const saleId = generateUniqueId('SALE');
  const invoiceNo = generateInvoiceNumber(salesSheet);
  const timestamp = new Date();

  // ৩. ইনভেন্টরি থেকে স্টক কর্তন এবং StockLogs-এ লগ সংরক্ষণ
  const updatedProductsSummary = [];
  const prodHeaders = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  let stockColIdx = findCol(prodHeaders, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity', 'Qty');
  if (stockColIdx === -1) {
    stockColIdx = prodHeaders.findIndex(h => /stock|qty|quant/i.test(String(h || '').trim()));
  }
  let updatedColIdx = findCol(prodHeaders, 'UpdatedAt', 'Updated');
  if (updatedColIdx === -1) {
    updatedColIdx = prodHeaders.findIndex(h => /update/i.test(String(h || '').trim()));
  }

  for (let j = 0; j < validatedItems.length; j++) {
    const vItem = validatedItems[j];
    const prevStock = Number(vItem.productObj.StockQuantity) || 0;
    const newStock = Math.max(0, prevStock - vItem.quantity);
    const rowIndex = vItem.productObj._rowIndex;

    // প্রোডাক্ট শিটে স্টক হালনাগাদ (ডাইনামিক কলাম ম্যাচিং)
    if (stockColIdx !== -1) {
      productsSheet.getRange(rowIndex, stockColIdx + 1).setValue(newStock);
    }
    if (updatedColIdx !== -1) {
      productsSheet.getRange(rowIndex, updatedColIdx + 1).setValue(timestamp);
    }

    // StockLogs শিটে স্টক আউট ট্রানজেকশন যোগ করা
    const logId = generateUniqueId('STKLOG');
    stockLogsSheet.appendRow([
      logId,
      timestamp,
      vItem.productId,
      vItem.productName,
      'STOCK_OUT_SALE',      // LogType
      prevStock,             // PreviousStock
      -vItem.quantity,       // QuantityChange (নেগেটিভ মান)
      newStock,              // NewStock
      vItem.costPrice,       // UnitCost (কেনা দাম, লাভ-ক্ষতি হিসাবের জন্য)
      'Customer Sale',
      cashierEmail || 'POS Cashier',
      invoiceNo,             // ReferenceID (ইনভয়েস নম্বর)
      `POS ইনভয়েস: ${invoiceNo}`
    ]);

    updatedProductsSummary.push({
      productId: vItem.productId,
      productName: vItem.productName,
      previousStock: prevStock,
      deductedQty: vItem.quantity,
      remainingStock: newStock
    });
  }

  // ৪. Sales শিটে অর্ডারের মাস্টার রেকর্ড এন্ট্রি
  const itemsSummaryText = validatedItems.map(i => `${i.productName} (x${i.quantity})`).join(', ');
  const itemsJsonString = JSON.stringify(validatedItems.map(i => ({
    productId: i.productId,
    productName: i.productName,
    quantity: i.quantity,
    sellingPrice: i.sellingPrice,
    costPrice: i.costPrice,
    total: i.total
  })));

  salesSheet.appendRow([
    saleId,
    invoiceNo,
    timestamp,
    customerName || 'Walk-in Customer',
    customerPhone || '',
    itemsJsonString,
    itemsSummaryText,
    subTotal,
    taxRatePercent,
    taxAmount,
    discount,
    grandTotal,
    paymentMethod || 'Cash',
    cashierEmail || 'POS Cashier',
    'COMPLETED',
    notes || ''
  ]);

  // ৫. কাস্টমার ডাটাবেসে তথ্য স্বয়ংক্রিয় সংরক্ষণ ও হালনাগাদ
  const cName = String(customerName || '').trim();
  const cPhone = String(customerPhone || '').trim();
  const cEmail = String(payload.customerEmail || '').trim();
  const cAddress = String(payload.customerAddress || '').trim();
  const cType = String(payload.customerType || 'Regular').trim();

  if (cName && cName !== 'Walk-in Customer') {
    try {
      const customersSheet = ensureCustomersSheet(spreadsheet);
      const custData = getSheetRowsAsObjects(SHEETS.CUSTOMERS);
      
      // ফোন অথবা নাম দিয়ে কাস্টমার মেলানো
      const existingCust = custData.find(c => 
        (cPhone && String(c.Phone || '').trim() === cPhone) ||
        (cName && String(c.CustomerName || '').trim().toLowerCase() === cName.toLowerCase())
      );

      const custHeaders = customersSheet.getRange(1, 1, 1, customersSheet.getLastColumn()).getValues()[0];
      const colMap = {
        CustomerID: findCol(custHeaders, 'CustomerID', 'ID'),
        CustomerName: findCol(custHeaders, 'CustomerName', 'Name'),
        Phone: findCol(custHeaders, 'Phone', 'Mobile'),
        Email: findCol(custHeaders, 'Email', 'Mail'),
        Address: findCol(custHeaders, 'Address'),
        CustomerType: findCol(custHeaders, 'CustomerType', 'Type'),
        TotalOrders: findCol(custHeaders, 'TotalOrders', 'Orders'),
        TotalSpent: findCol(custHeaders, 'TotalSpent', 'Spent'),
        Status: findCol(custHeaders, 'Status'),
        CreatedAt: findCol(custHeaders, 'CreatedAt', 'Created'),
        UpdatedAt: findCol(custHeaders, 'UpdatedAt', 'Updated')
      };

      if (existingCust && existingCust._rowIndex) {
        // বিদ্যমান কাস্টমার আপডেট (মোট অর্ডার ও স্পেন্ট বৃদ্ধি)
        const prevOrders = Number(existingCust.TotalOrders) || 0;
        const prevSpent = Number(existingCust.TotalSpent) || 0;
        
        if (colMap.TotalOrders !== -1) customersSheet.getRange(existingCust._rowIndex, colMap.TotalOrders + 1).setValue(prevOrders + 1);
        if (colMap.TotalSpent !== -1) customersSheet.getRange(existingCust._rowIndex, colMap.TotalSpent + 1).setValue(prevSpent + grandTotal);
        if (cAddress && colMap.Address !== -1 && !existingCust.Address) customersSheet.getRange(existingCust._rowIndex, colMap.Address + 1).setValue(cAddress);
        if (cEmail && colMap.Email !== -1 && !existingCust.Email) customersSheet.getRange(existingCust._rowIndex, colMap.Email + 1).setValue(cEmail);
        if (colMap.UpdatedAt !== -1) customersSheet.getRange(existingCust._rowIndex, colMap.UpdatedAt + 1).setValue(timestamp);
      } else {
        // নতুন কাস্টমার এন্ট্রি তৈরি (ডায়নামিক কলাম ম্যাপিং দ্বারা)
        const custId = generateUniqueId('CUST');
        const newRow = new Array(custHeaders.length).fill('');
        if (colMap.CustomerID !== -1) newRow[colMap.CustomerID] = custId;
        if (colMap.CustomerName !== -1) newRow[colMap.CustomerName] = cName;
        if (colMap.Phone !== -1) newRow[colMap.Phone] = cPhone;
        if (colMap.Email !== -1) newRow[colMap.Email] = cEmail;
        if (colMap.Address !== -1) newRow[colMap.Address] = cAddress;
        if (colMap.CustomerType !== -1) newRow[colMap.CustomerType] = cType;
        if (colMap.TotalOrders !== -1) newRow[colMap.TotalOrders] = 1;
        if (colMap.TotalSpent !== -1) newRow[colMap.TotalSpent] = grandTotal;
        if (colMap.Status !== -1) newRow[colMap.Status] = 'Active';
        if (colMap.CreatedAt !== -1) newRow[colMap.CreatedAt] = timestamp;
        if (colMap.UpdatedAt !== -1) newRow[colMap.UpdatedAt] = timestamp;
        customersSheet.appendRow(newRow);
      }
    } catch (custErr) {
      Logger.log('Customer sync soft error: ' + custErr.toString());
    }
  }

  // গুগল শিটে অবিলম্বে সমস্ত পরিবর্তন স্থায়ী করা
  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'অর্ডার সফলভাবে সম্পন্ন হয়েছে এবং স্টক কর্তন করা হয়েছে।',
    data: {
      saleId: saleId,
      invoiceNo: invoiceNo,
      timestamp: timestamp,
      subTotal: subTotal,
      taxPercent: taxRatePercent,
      taxAmount: taxAmount,
      discountAmount: discount,
      grandTotal: grandTotal,
      paymentMethod: paymentMethod || 'Cash',
      customerName: customerName || 'Walk-in Customer',
      items: validatedItems,
      updatedProducts: updatedProductsSummary
    }
  };
}



/**
 * ============================================================================
 * ProductService.gs - প্রোডাক্ট ও সেটিংস ম্যানেজমেন্ট সার্ভিস
 * ============================================================================
 * নতুন পণ্য সংযোজন এবং দোকানের হোয়াইট-লেবেল সেটিংস হালনাগাদ করার কাজ পরিচালনা করে।
 */

/**
 * পণ্যের ছবি গুগল ড্রাইভে নির্দিষ্ট ফোল্ডারে সেভ করার হেল্পার ফাংশন
 * ফোল্ডার কাঠামো: [গুগল শিটের ফোল্ডার] -> "products image" -> [ProductID] -> [ProductID]_[ProductName].[ext]
 * @param {Spreadsheet} spreadsheet - মূল স্প্রেডশিট অবজেক্ট
 * @param {string} productId - পণ্যের আইডি (যেমন: PROD-1001)
 * @param {string} productName - পণ্যের নাম
 * @param {string} base64Data - Base64 এনকোডেড ইমেজ ডাটা
 * @param {string} mimeType - ছবির MIME Type (যেমন: image/jpeg)
 * @return {string} গুগল ড্রাইভ থেকে তৈরি হওয়া সরাসরি ভিউযোগ্য ইমেজ লিঙ্ক
 */
function saveProductImageToDrive(spreadsheet, productId, productName, base64Data, mimeType) {
  if (!base64Data || typeof base64Data !== 'string') {
    return { success: false, url: '', error: 'ইমেজ ডাটা পাওয়া যায়নি।' };
  }

  try {
    // ১. মূল স্প্রেডশিট যে ফোল্ডারে অবস্থান করছে তা বের করা
    const spreadsheetFile = DriveApp.getFileById(spreadsheet.getId());
    const parents = spreadsheetFile.getParents();
    let parentFolder = null;
    while (parents.hasNext()) {
      const p = parents.next();
      if (!p.isTrashed()) {
        parentFolder = p;
        break;
      }
    }
    if (!parentFolder) {
      parentFolder = DriveApp.getRootFolder();
    }

    // ২. স্প্রেডশিটের ফোল্ডারে "products image" নামের ফোল্ডার তৈরি বা সিলেক্ট করা
    let productsImageFolder = null;
    const folderIter = parentFolder.getFoldersByName('products image');
    while (folderIter.hasNext()) {
      const f = folderIter.next();
      if (!f.isTrashed()) {
        productsImageFolder = f;
        break;
      }
    }
    if (!productsImageFolder) {
      productsImageFolder = parentFolder.createFolder('products image');
    }

    // ৩. "products image" ফোল্ডারের ভেতরে Product ID অনুযায়ী সাব-ফোল্ডার তৈরি বা সিলেক্ট করা
    let productSubFolder = null;
    const subFolderIter = productsImageFolder.getFoldersByName(productId);
    while (subFolderIter.hasNext()) {
      const sf = subFolderIter.next();
      if (!sf.isTrashed()) {
        productSubFolder = sf;
        break;
      }
    }
    if (!productSubFolder) {
      productSubFolder = productsImageFolder.createFolder(productId);
    }

    // ৪. ফাইলের নাম নির্ধারণ: Product ID এবং Product Name দিয়ে রিনেম করা
    let ext = 'jpg';
    if (mimeType) {
      const lowerMime = mimeType.toLowerCase();
      if (lowerMime.includes('png')) ext = 'png';
      else if (lowerMime.includes('webp')) ext = 'webp';
      else if (lowerMime.includes('jpeg') || lowerMime.includes('jpg')) ext = 'jpg';
      else if (lowerMime.includes('gif')) ext = 'gif';
    }

    const safeProductName = (productName || 'product')
      .toString()
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, '_')
      .trim();

    const fileName = `${productId}_${safeProductName}.${ext}`;

    // ৫. Base64 থেকে বাইনারি ডাটা ডিকোড করা
    let cleanBase64 = String(base64Data || '');
    if (cleanBase64.indexOf(',') !== -1) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    // অপ্রয়োজনীয় হোয়াইটস্পেস ও লাইনব্রেক পরিষ্কার করা
    cleanBase64 = cleanBase64.replace(/\s+/g, '');
    while (cleanBase64.length % 4 !== 0) {
      cleanBase64 += '=';
    }

    const decodedBytes = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(decodedBytes, mimeType || 'image/jpeg', fileName);

    // ৬. ফাইলে রূপান্তর ও সংরক্ষণ
    const newFile = productSubFolder.createFile(blob);

    // ৭. লিংক শেয়ারিং পাবলিক ভিউ দেওয়া যাতে ওয়েব পেজে ছবি প্রদর্শিত হতে পারে
    try {
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      Logger.log('Sharing error: ' + shareErr.toString());
    }

    const fileId = newFile.getId();
    // সরাসরি হাই-স্পিড ও ব্রাউজারে রেন্ডারযোগ্য লিংক
    const publicUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
    return { success: true, url: publicUrl, fileId: fileId };

  } catch (err) {
    Logger.log('Drive Image Upload Error: ' + err.toString());
    return { success: false, url: '', error: err.toString() };
  }
}

/**
 * নতুন প্রোডাক্ট তৈরি করার হ্যান্ডলার
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - ক্লায়েন্ট থেকে পাঠানো প্রোডাক্ট ডাটা
 * @return {Object} রেসপন্স অবজেক্ট
 */
function handleAddProduct(spreadsheet, payload) {
  try {
    const barcode = payload.barcode || payload.Barcode || '';
    const productName = payload.productName || payload.ProductName || '';
    const category = payload.category || payload.Category || 'General';
    const subCategory = payload.subCategory || payload.SubCategory || '';
    const costPrice = payload.costPrice !== undefined ? payload.costPrice : (payload.CostPrice !== undefined ? payload.CostPrice : 0);
    const sellingPrice = payload.sellingPrice !== undefined ? payload.sellingPrice : (payload.SellingPrice !== undefined ? payload.SellingPrice : 0);
    const initialStock = payload.initialStock !== undefined ? payload.initialStock : (payload.stockQuantity !== undefined ? payload.stockQuantity : (payload.StockQuantity !== undefined ? payload.StockQuantity : 0));
    const minStockAlert = payload.minStockAlert !== undefined ? payload.minStockAlert : (payload.MinStockAlert !== undefined ? payload.MinStockAlert : 5);
    const unit = payload.unit || payload.Unit || 'Pcs';
    let imageUrl = payload.imageUrl || payload.ImageUrl || '';
    const imageCaption = payload.imageCaption || payload.ImageCaption || '';
    const imageBase64 = payload.imageBase64 || payload.ImageBase64 || '';
    const imageMimeType = payload.imageMimeType || payload.ImageMimeType || 'image/jpeg';
    const shortDescription = payload.shortDescription || payload.ShortDescription || '';
    const description = payload.description || payload.Description || '';
    let features = payload.features || payload.Features || '';
    if (Array.isArray(features)) {
      features = features.filter(f => f && String(f).trim()).join(' | ');
    } else {
      features = String(features || '');
    }

    if (!productName || sellingPrice === undefined) {
      return {
        success: false,
        message: 'পণ্যের নাম এবং বিক্রয়মূল্য দেওয়া আবশ্যক।'
      };
    }

    let productsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.PRODUCTS);
    if (!productsSheet) {
      productsSheet = spreadsheet.insertSheet(SHEETS.PRODUCTS);
    }

    // নিশ্চিত করা যে Products শিটে SubCategory, ImageUrl, ImageCaption ইত্যাদি কলাম সঠিকভাবে রয়েছে
    const headers = ensureProductsHeaders(productsSheet);

    const stockLogsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.STOCK_LOGS);
    const products = getSheetRowsAsObjects(SHEETS.PRODUCTS);

    // বারকোড ইতিমধ্যে ব্যবহৃত হয়েছে কি না যাচাই
    if (barcode) {
      const existing = products.find(p => p.Barcode && String(p.Barcode).trim() === String(barcode).trim());
      if (existing) {
        return {
          success: false,
          message: `এই বারকোডটি (${barcode}) ইতিমধ্যে '${existing.ProductName}' পণ্যে যুক্ত আছে।`
        };
      }
    }

    const productId = generateUniqueId('PROD');
    const timestamp = new Date();
    const stockQty = Number(initialStock) || 0;
    const cPrice = Number(costPrice) || 0;
    const sPrice = Number(sellingPrice) || 0;

    let imageUploadError = null;

    // যদি লোকাল ডিভাইস থেকে ছবি আপলোড করা হয় (Base64 পাঠানো হয়)
    if (imageBase64) {
      try {
        const driveResult = saveProductImageToDrive(spreadsheet, productId, productName, imageBase64, imageMimeType);
        if (driveResult && driveResult.success && driveResult.url) {
          imageUrl = driveResult.url;
        } else if (driveResult && !driveResult.success) {
          imageUploadError = driveResult.error || 'ড্রাইভ আপলোড ব্যর্থ';
          Logger.log('Drive upload failed: ' + imageUploadError);
        }
      } catch (driveErr) {
        imageUploadError = driveErr.toString();
        Logger.log('Drive upload soft error: ' + driveErr.toString());
      }
    }

    if (typeof imageUrl !== 'string') {
      imageUrl = '';
    }

    // হেডার অনুযায়ী সঠিক কলামে মান সাজানো (Fuzzy Header Mapping)
    const newRow = new Array(headers.length).fill('');

    const setAt = (colIdx, val) => {
      if (colIdx >= 0 && colIdx < newRow.length) {
        newRow[colIdx] = val;
      }
    };

    setAt(findCol(headers, 'ProductID', 'ProdID', 'ID'), productId);
    setAt(findCol(headers, 'Barcode', 'Code', 'SKU'), barcode || '');
    setAt(findCol(headers, 'ProductName', 'Name', 'Title'), productName);
    setAt(findCol(headers, 'Category', 'Cat'), category || 'General');
    setAt(findCol(headers, 'SubCategory', 'SubCat'), subCategory || '');
    setAt(findCol(headers, 'CostPrice', 'Cost', 'BuyPrice'), cPrice);
    setAt(findCol(headers, 'SellingPrice', 'Price', 'SalePrice'), sPrice);
    setAt(findCol(headers, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity', 'Qty'), stockQty);
    setAt(findCol(headers, 'MinStockAlert', 'MinStockAler', 'MinStock', 'Alert'), Number(minStockAlert) || 5);
    setAt(findCol(headers, 'Unit', 'UOM'), unit || 'Pcs');
    setAt(findCol(headers, 'ImageUrl', 'Image', 'Photo', 'ImgUrl', 'Picture'), imageUrl || '');
    setAt(findCol(headers, 'ImageCaption', 'Caption', 'AltText', 'Alt'), imageCaption || '');
    setAt(findCol(headers, 'ShortDescription', 'ShortDesc'), shortDescription);
    setAt(findCol(headers, 'Description', 'Desc', 'Details'), description);
    setAt(findCol(headers, 'Features', 'Feature', 'KeyFeatures'), features);
    setAt(findCol(headers, 'CreatedAt', 'Created', 'Date'), timestamp);
    setAt(findCol(headers, 'UpdatedAt', 'Updated'), timestamp);

    productsSheet.appendRow(newRow);

    // ক্যাটাগরি শিটে স্বয়ংক্রিয়ভাবে ক্যাটাগরি ও সাব-ক্যাটাগরি যুক্ত করা (যদি না থাকে)
    if (category) {
      try {
        handleAddCategory(spreadsheet, {
          categoryName: category,
          subCategoryName: subCategory || '',
          description: 'পণ্য থেকে স্বয়ংক্রিয় যুক্ত'
        });
      } catch (e) {
        // ক্যাটাগরি সংরক্ষণে ত্রুটি হলেও মূল পণ্য রিটার্ন অক্ষুণ্ণ রাখা
      }
    }

    // যদি প্রারম্ভিক স্টক ০ এর বেশি হয়, তবে অডিট লগে ওপেনিং স্টক রেকর্ড রাখা
    if (stockQty > 0 && stockLogsSheet) {
      try {
        const logId = generateUniqueId('STKLOG');
        stockLogsSheet.appendRow([
          logId,
          timestamp,
          productId,
          productName,
          'INITIAL_STOCK',
          0,
          stockQty,
          stockQty,
          cPrice,
          'Opening Inventory',
          'Admin',
          productId,
          'প্রাথমিক স্টক ওপেনিং ব্যালেন্স'
        ]);
      } catch (logErr) {
        Logger.log('StockLog append soft error: ' + logErr.toString());
      }
    }

    let successMessage = 'নতুন প্রোডাক্ট সফলভাবে ডাটাবেসে যুক্ত হয়েছে।';
    if (imageUploadError) {
      successMessage = `পণ্য ডাটাবেসে সেভ হয়েছে, কিন্তু ছবি ড্রাইভে আপলোড হয়নি (${imageUploadError})। Apps Script এডিটরে গিয়ে testPermissionsAndInit রান করে পারমিশন দিন।`;
    }

    return {
      success: true,
      message: successMessage,
      imageUploadError: imageUploadError,
      data: {
        productId: productId,
        barcode: barcode,
        productName: productName,
        category: category,
        subCategory: subCategory,
        imageUrl: imageUrl,
        imageCaption: imageCaption,
        stockQuantity: stockQty,
        sellingPrice: sPrice,
        costPrice: cPrice
      }
    };
  } catch (err) {
    Logger.log('handleAddProduct Exception: ' + err.toString());
    return {
      success: false,
      message: 'পণ্য সংরক্ষণে ডাটাবেস ত্রুটি: ' + err.toString()
    };
  }
}

/**
 * বিদ্যমান প্রোডাক্ট আপডেট করার হ্যান্ডলার
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - ক্লায়েন্ট থেকে পাঠানো প্রোডাক্ট ডাটা
 * @return {Object} রেসপন্স অবজেক্ট
 */
function handleUpdateProduct(spreadsheet, payload) {
  const productId = String(payload.productId || payload.ProductID || '').trim();
  if (!productId) {
    return {
      success: false,
      message: 'পণ্যের আইডি (ProductID) পাওয়া যায়নি।'
    };
  }

  const barcode = payload.barcode !== undefined ? String(payload.barcode || '').trim() : (payload.Barcode !== undefined ? String(payload.Barcode || '').trim() : undefined);
  const productName = payload.productName || payload.ProductName;
  const category = payload.category || payload.Category;
  const subCategory = payload.subCategory !== undefined ? payload.subCategory : payload.SubCategory;
  const costPrice = payload.costPrice !== undefined ? Number(payload.costPrice) : (payload.CostPrice !== undefined ? Number(payload.CostPrice) : undefined);
  const sellingPrice = payload.sellingPrice !== undefined ? Number(payload.sellingPrice) : (payload.SellingPrice !== undefined ? Number(payload.SellingPrice) : undefined);
  const stockQuantity = payload.stockQuantity !== undefined ? Number(payload.stockQuantity) : (payload.StockQuantity !== undefined ? Number(payload.StockQuantity) : undefined);
  const minStockAlert = payload.minStockAlert !== undefined ? Number(payload.minStockAlert) : (payload.MinStockAlert !== undefined ? Number(payload.MinStockAlert) : undefined);
  const unit = payload.unit || payload.Unit;
  let imageUrl = payload.imageUrl !== undefined ? payload.imageUrl : payload.ImageUrl;
  const imageCaption = payload.imageCaption !== undefined ? payload.imageCaption : payload.ImageCaption;
  const imageBase64 = payload.imageBase64 || payload.ImageBase64 || '';
  const imageMimeType = payload.imageMimeType || payload.ImageMimeType || 'image/jpeg';
  const shortDescription = payload.shortDescription !== undefined ? payload.shortDescription : payload.ShortDescription;
  const description = payload.description !== undefined ? payload.description : payload.Description;
  let features = payload.features !== undefined ? payload.features : payload.Features;
  if (Array.isArray(features)) {
    features = features.filter(f => f && String(f).trim()).join(' | ');
  } else if (features !== undefined) {
    features = String(features || '');
  }

  let imageUploadError = null;

  // যদি এডিটের সময় নতুন ছবি আপলোড করা হয় (Base64 পাঠানো হয়)
  if (imageBase64) {
    try {
      const driveResult = saveProductImageToDrive(spreadsheet, productId, productName || '', imageBase64, imageMimeType);
      if (driveResult && driveResult.success && driveResult.url) {
        imageUrl = driveResult.url;
      } else if (driveResult && !driveResult.success) {
        imageUploadError = driveResult.error || 'ড্রাইভ আপলোড ব্যর্থ';
        Logger.log('Drive update upload failed: ' + imageUploadError);
      }
    } catch (driveErr) {
      imageUploadError = driveErr.toString();
      Logger.log('Drive update soft error: ' + driveErr.toString());
    }
  }

  if (typeof imageUrl !== 'string' && imageUrl !== undefined) {
    imageUrl = '';
  }

  const productsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.PRODUCTS);
  if (!productsSheet || productsSheet.getLastRow() <= 1) {
    return {
      success: false,
      message: 'Products শিটে কোনো পণ্য খুঁজে পাওয়া যায়নি।'
    };
  }

  const headers = ensureProductsHeaders(productsSheet);
  const lastRow = productsSheet.getLastRow();
  const lastCol = productsSheet.getLastColumn();
  const data = productsSheet.getRange(1, 1, lastRow, lastCol).getValues();

  const idColIdx = findCol(headers, 'ProductID', 'ProdID', 'ID');
  const barcodeColIdx = findCol(headers, 'Barcode', 'Code', 'SKU');
  const nameColIdx = findCol(headers, 'ProductName', 'Name', 'Title');
  const catColIdx = findCol(headers, 'Category', 'Cat');
  const subCatColIdx = findCol(headers, 'SubCategory', 'SubCat');
  const costColIdx = findCol(headers, 'CostPrice', 'Cost', 'BuyPrice');
  const sellColIdx = findCol(headers, 'SellingPrice', 'Price', 'SalePrice');
  const stockColIdx = findCol(headers, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity', 'Qty');
  const alertColIdx = findCol(headers, 'MinStockAlert', 'MinStockAler', 'MinStock', 'Alert');
  const unitColIdx = findCol(headers, 'Unit', 'UOM');
  const imgColIdx = findCol(headers, 'ImageUrl', 'Image', 'Photo', 'ImgUrl');
  const captionColIdx = findCol(headers, 'ImageCaption', 'Caption', 'AltText', 'Alt');
  const shortDescColIdx = findCol(headers, 'ShortDescription', 'ShortDesc');
  const descColIdx = findCol(headers, 'Description', 'Desc', 'Details');
  const featColIdx = findCol(headers, 'Features', 'Feature', 'KeyFeatures');
  const updatedColIdx = findCol(headers, 'UpdatedAt', 'Updated');

  if (idColIdx === -1) {
    return {
      success: false,
      message: 'ProductID কলাম খুঁজে পাওয়া যায়নি।'
    };
  }

  let targetRow = -1;
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idColIdx] || '').trim() === productId) {
      targetRow = r + 1; // 1-indexed for SpreadsheetApp
      break;
    }
  }

  if (targetRow === -1) {
    return {
      success: false,
      message: `আইডি '${productId}' বিশিষ্ট পণ্যটি ডাটাবেসে পাওয়া যায়নি।`
    };
  }

  // বারকোড চেক: যদি বারকোড পরিবর্তন করা হয় এবং তা অন্য পণ্যে আগে থেকেই থাকে
  if (barcode && barcodeColIdx !== -1) {
    for (let r = 1; r < data.length; r++) {
      if ((r + 1) !== targetRow && String(data[r][barcodeColIdx] || '').trim() === barcode) {
        return {
          success: false,
          message: `এই বারকোডটি (${barcode}) ইতিমধ্যে অন্য পণ্যে ব্যবহৃত হচ্ছে।`
        };
      }
    }
  }

  // মান আপডেট
  const updateIfDefined = (colIdx, val) => {
    if (colIdx >= 0 && val !== undefined) {
      productsSheet.getRange(targetRow, colIdx + 1).setValue(val);
    }
  };

  updateIfDefined(nameColIdx, productName);
  updateIfDefined(barcodeColIdx, barcode);
  updateIfDefined(catColIdx, category);
  updateIfDefined(subCatColIdx, subCategory);
  updateIfDefined(costColIdx, costPrice);
  updateIfDefined(sellColIdx, sellingPrice);
  updateIfDefined(stockColIdx, stockQuantity);
  updateIfDefined(alertColIdx, minStockAlert);
  updateIfDefined(unitColIdx, unit);
  updateIfDefined(imgColIdx, imageUrl);
  updateIfDefined(captionColIdx, imageCaption);
  updateIfDefined(shortDescColIdx, shortDescription);
  updateIfDefined(descColIdx, description);
  updateIfDefined(featColIdx, features);
  updateIfDefined(updatedColIdx, new Date());

  SpreadsheetApp.flush();

  // ক্যাটাগরি শিটে যোগ করা (যদি নতুন হয়)
  if (category) {
    try {
      handleAddCategory(spreadsheet, {
        categoryName: category,
        subCategoryName: subCategory || '',
        description: 'পণ্য থেকে স্বয়ংক্রিয় যুক্ত'
      });
    } catch (e) {}
  }

  let returnMessage = `'${productName || productId}' পণ্যটি সফলভাবে আপডেট করা হয়েছে।`;
  if (imageUploadError) {
    returnMessage = `পণ্য আপডেট হয়েছে, কিন্তু ছবি ড্রাইভে আপলোড হয়নি (${imageUploadError})। Apps Script এডিটরে testPermissionsAndInit রান করে পারমিশন দিন।`;
  }

  return {
    success: true,
    message: returnMessage,
    imageUploadError: imageUploadError,
    data: {
      productId: productId,
      productName: productName,
      barcode: barcode,
      category: category,
      subCategory: subCategory,
      costPrice: costPrice,
      sellingPrice: sellingPrice,
      stockQuantity: stockQuantity,
      unit: unit,
      imageUrl: imageUrl,
      imageCaption: imageCaption,
      shortDescription: shortDescription,
      description: description,
      features: features
    }
  };
}

/**
 * বিদ্যমান প্রোডাক্ট মুছে ফেলার হ্যান্ডলার
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - ক্লায়েন্ট থেকে পাঠানো প্রোডাক্ট ডাটা (productId)
 * @return {Object} রেসপন্স অবজেক্ট
 */
function handleDeleteProduct(spreadsheet, payload) {
  const productId = String(payload.productId || payload.ProductID || '').trim();
  if (!productId) {
    return {
      success: false,
      message: 'মুছে ফেলার জন্য পণ্যের আইডি (ProductID) দেওয়া আবশ্যক।'
    };
  }

  const productsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.PRODUCTS);
  if (!productsSheet || productsSheet.getLastRow() <= 1) {
    return {
      success: false,
      message: 'Products শিটে কোনো পণ্য খুঁজে পাওয়া যায়নি।'
    };
  }

  const headers = ensureProductsHeaders(productsSheet);
  const lastRow = productsSheet.getLastRow();
  const lastCol = productsSheet.getLastColumn();
  const data = productsSheet.getRange(1, 1, lastRow, lastCol).getValues();

  const idColIdx = findCol(headers, 'ProductID', 'ProdID', 'ID');
  if (idColIdx === -1) {
    return {
      success: false,
      message: 'ProductID কলাম খুঁজে পাওয়া যায়নি।'
    };
  }

  let targetRow = -1;
  let deletedProductName = '';
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idColIdx] || '').trim() === productId) {
      targetRow = r + 1;
      const nameColIdx = findCol(headers, 'ProductName', 'Name');
      if (nameColIdx !== -1) {
        deletedProductName = data[r][nameColIdx] || '';
      }
      break;
    }
  }

  if (targetRow === -1) {
    return {
      success: false,
      message: `আইডি '${productId}' বিশিষ্ট পণ্যটি ডাটাবেসে পাওয়া যায়নি।`
    };
  }

  productsSheet.deleteRow(targetRow);
  SpreadsheetApp.flush();

  return {
    success: true,
    message: `'${deletedProductName || productId}' পণ্যটি সফলভাবে মুছে ফেলা হয়েছে।`,
    data: {
      productId: productId
    }
  };
}

/**
 * দোকানের মাস্টার সেটিংস আপডেট করার হ্যান্ডলার
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - সেটিংস অবজেক্ট
 * @return {Object} রেসপন্স অবজেক্ট
 */
function handleUpdateSettings(spreadsheet, payload) {
  const settingsSheet = ensureSettingsSheet(spreadsheet);
  
  // ক্লায়েন্ট থেকে পাঠানো PascalCase অথবা camelCase উভয় ফিল্ড নাম সাপোর্ট করা
  const storeName = payload.StoreName || payload.storeName || '';
  const rawLogo = (payload.LogoUrl || payload.logoUrl || '').trim();
  const logoUrl = typeof formatGoogleDriveImageUrl === 'function' ? formatGoogleDriveImageUrl(rawLogo) : rawLogo;
  const currencySymbol = payload.CurrencySymbol || payload.currencySymbol || '৳';
  const taxRatePercent = Number(payload.TaxRatePercent !== undefined ? payload.TaxRatePercent : payload.taxRatePercent) || 0;
  const address = payload.Address || payload.address || '';
  const phone = payload.Phone || payload.phone || '';
  const email = payload.Email || payload.email || '';
  const receiptFooter = payload.ReceiptFooter || payload.receiptFooter || '';
  const apiUrl = (payload.apiUrl || payload.ApiUrl || payload.api_url || '').trim();
  const timestamp = new Date();

  const lastCol = settingsSheet.getLastColumn();
  const headers = settingsSheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const colMap = {
    SettingID: findCol(headers, 'SettingID', 'ID'),
    StoreName: findCol(headers, 'StoreName', 'Store Name', 'ShopName'),
    LogoUrl: findCol(headers, 'LogoUrl', 'Logo', 'LogoImage'),
    CurrencySymbol: findCol(headers, 'CurrencySymbol', 'Currency', 'Symbol'),
    TaxRatePercent: findCol(headers, 'TaxRatePercent', 'TaxRate', 'TaxPercent', 'VAT'),
    Address: findCol(headers, 'Address', 'ShopAddress'),
    Phone: findCol(headers, 'Phone', 'Mobile', 'Contact'),
    Email: findCol(headers, 'Email', 'Mail'),
    ReceiptFooter: findCol(headers, 'ReceiptFooter', 'Footer', 'FooterText'),
    ApiUrl: findCol(headers, 'ApiUrl', 'apiUrl', 'ApiURL', 'URL', 'WebappUrl'),
    UpdatedAt: findCol(headers, 'UpdatedAt', 'Updated')
  };

  // যদি ২য় সারি না থাকে, নতুন রেকর্ড তৈরি করা
  if (settingsSheet.getLastRow() < 2) {
    const newRow = new Array(headers.length).fill('');
    if (colMap.SettingID !== -1) newRow[colMap.SettingID] = 'SETTING-1';
    if (colMap.StoreName !== -1) newRow[colMap.StoreName] = storeName;
    if (colMap.LogoUrl !== -1) newRow[colMap.LogoUrl] = logoUrl;
    if (colMap.CurrencySymbol !== -1) newRow[colMap.CurrencySymbol] = currencySymbol;
    if (colMap.TaxRatePercent !== -1) newRow[colMap.TaxRatePercent] = taxRatePercent;
    if (colMap.Address !== -1) newRow[colMap.Address] = address;
    if (colMap.Phone !== -1) newRow[colMap.Phone] = phone;
    if (colMap.Email !== -1) newRow[colMap.Email] = email;
    if (colMap.ReceiptFooter !== -1) newRow[colMap.ReceiptFooter] = receiptFooter;
    if (colMap.ApiUrl !== -1) newRow[colMap.ApiUrl] = apiUrl;
    if (colMap.UpdatedAt !== -1) newRow[colMap.UpdatedAt] = timestamp;
    settingsSheet.appendRow(newRow);
  } else {
    // বিদ্যমান ২য় সারির সংশ্লিষ্ট কলামগুলো ডাইনামিক্যালি আপডেট করা
    if (colMap.SettingID !== -1 && !settingsSheet.getRange(2, colMap.SettingID + 1).getValue()) {
      settingsSheet.getRange(2, colMap.SettingID + 1).setValue('SETTING-1');
    }
    if (colMap.StoreName !== -1) settingsSheet.getRange(2, colMap.StoreName + 1).setValue(storeName);
    if (colMap.LogoUrl !== -1) settingsSheet.getRange(2, colMap.LogoUrl + 1).setValue(logoUrl);
    if (colMap.CurrencySymbol !== -1) settingsSheet.getRange(2, colMap.CurrencySymbol + 1).setValue(currencySymbol);
    if (colMap.TaxRatePercent !== -1) settingsSheet.getRange(2, colMap.TaxRatePercent + 1).setValue(taxRatePercent);
    if (colMap.Address !== -1) settingsSheet.getRange(2, colMap.Address + 1).setValue(address);
    if (colMap.Phone !== -1) settingsSheet.getRange(2, colMap.Phone + 1).setValue(phone);
    if (colMap.Email !== -1) settingsSheet.getRange(2, colMap.Email + 1).setValue(email);
    if (colMap.ReceiptFooter !== -1) settingsSheet.getRange(2, colMap.ReceiptFooter + 1).setValue(receiptFooter);
    if (colMap.ApiUrl !== -1) settingsSheet.getRange(2, colMap.ApiUrl + 1).setValue(apiUrl);
    if (colMap.UpdatedAt !== -1) settingsSheet.getRange(2, colMap.UpdatedAt + 1).setValue(timestamp);
  }

  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'দোকানের মাস্টার সেটিংস সফলভাবে আপডেট হয়েছে।',
    data: {
      StoreName: storeName,
      LogoUrl: logoUrl,
      CurrencySymbol: currencySymbol,
      TaxRatePercent: taxRatePercent,
      Address: address,
      Phone: phone,
      Email: email,
      ReceiptFooter: receiptFooter,
      ApiUrl: apiUrl,
      apiUrl: apiUrl
    }
  };
}

/**
 * নতুন ক্যাটাগরি ও সাব-ক্যাটাগরি যুক্ত করার হ্যান্ডলার
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - ক্যাটাগরি ডাটা
 * @return {Object} রেসপন্স অবজেক্ট
 */
function handleAddCategory(spreadsheet, payload) {
  const categoriesSheet = ensureCategoriesSheet(spreadsheet);
  const categoryName = payload.categoryName || payload.CategoryName || '';
  const subCategoryName = payload.subCategoryName || payload.SubCategoryName || '';
  const description = payload.description || payload.Description || '';

  if (!categoryName) {
    return {
      success: false,
      message: 'ক্যাটাগরির নাম দেওয়া আবশ্যক।'
    };
  }

  // ইতোমধ্যে একই ক্যাটাগরি ও সাব-ক্যাটাগরি আছে কিনা যাচাই
  const existingCats = getSheetRowsAsObjects(SHEETS.CATEGORIES);
  const duplicate = existingCats.find(c => 
    c.CategoryName && c.CategoryName.toString().trim().toLowerCase() === categoryName.toString().trim().toLowerCase() &&
    ((c.SubCategoryName || '').toString().trim().toLowerCase() === subCategoryName.toString().trim().toLowerCase())
  );

  if (duplicate) {
    return {
      success: true,
      message: 'এই ক্যাটাগরি ও সাব-ক্যাটাগরি ইতিমধ্যে বিদ্যমান রয়েছে।',
      data: duplicate
    };
  }

  const categoryId = generateUniqueId('CAT');
  const timestamp = new Date();

  categoriesSheet.appendRow([
    categoryId,
    categoryName,
    subCategoryName || '',
    description || '',
    'Active',
    timestamp
  ]);

  return {
    success: true,
    message: 'নতুন ক্যাটাগরি সফলভাবে যুক্ত হয়েছে।',
    data: {
      CategoryID: categoryId,
      CategoryName: categoryName,
      SubCategoryName: subCategoryName || '',
      Status: 'Active'
    }
  };
}

/**
 * নতুন পরিমাপক একক (Unit) যোগ করার হ্যান্ডলার
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - এককের বিবরণ
 * @return {Object} রেসপন্স অবজেক্ট
 */
function handleAddUnit(spreadsheet, payload) {
  let unitsSheet = ensureUnitsSheet(spreadsheet);

  const unitName = payload.unitName || payload.UnitName || '';
  const shortName = payload.shortName || payload.ShortName || unitName;
  const description = payload.description || payload.Description || '';

  if (!unitName) {
    return {
      success: false,
      message: 'এককের নাম দেওয়া আবশ্যক।'
    };
  }

  // ইতোমধ্যে একই একক আছে কিনা যাচাই
  const existingUnits = getSheetRowsAsObjects(SHEETS.UNITS);
  const duplicate = existingUnits.find(u => 
    (u.UnitName && u.UnitName.toString().trim().toLowerCase() === unitName.toString().trim().toLowerCase()) ||
    (u.ShortName && u.ShortName.toString().trim().toLowerCase() === shortName.toString().trim().toLowerCase())
  );

  if (duplicate) {
    return {
      success: true,
      message: 'এই পরিমাপক একক ইতিমধ্যে বিদ্যমান রয়েছে।',
      data: duplicate
    };
  }

  const unitId = generateUniqueId('UNIT');
  const timestamp = new Date();

  unitsSheet.appendRow([
    unitId,
    unitName,
    shortName,
    description || '',
    'Active',
    timestamp
  ]);

  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'নতুন পরিমাপক একক সফলভাবে যুক্ত হয়েছে।',
    data: {
      UnitID: unitId,
      UnitName: unitName,
      ShortName: shortName,
      Description: description,
      Status: 'Active'
    }
  };
}




/**
 * ============================================================================
 * Main.gs - প্রধান API রাউটার এবং কন্ট্রোলার (doGet & doPost)
 * ============================================================================
 * এটি বহিরাগত সকল HTTP রিকোয়েস্ট (React Frontend / AppSheet Webhook) গ্রহণ করে
 * এবং উপযুক্ত সার্ভিস মডিউলে রাউট করে রেসপন্স প্রদান করে।
 */

/**
 * GET রিকোয়েস্ট হ্যান্ডলার (ডাটা ফেচিং API)
 * @param {Object} e - ইভেন্ট প্যারামিটার
 * @return {TextOutput} JSON আউটপুট
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getInitialData';

    // ১. সম্পূর্ণ প্রাথমিক ডাটা (Master Sync) লোড করা
    if (action === 'getInitialData') {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      // স্বয়ংক্রিয় স্কিমা পরীক্ষা ও মাইগ্রেশন (Categories, Units শিট ও Products কলাম নিশ্চিতকরণ)
      ensureDatabaseSchema(spreadsheet);

      const settings = getSheetRowsAsObjects(SHEETS.SETTINGS);
      const products = getSheetRowsAsObjects(SHEETS.PRODUCTS);
      const categories = getSheetRowsAsObjects(SHEETS.CATEGORIES);
      const units = getSheetRowsAsObjects(SHEETS.UNITS);
      const customers = getSheetRowsAsObjects(SHEETS.CUSTOMERS);
      const coupons = getSheetRowsAsObjects(SHEETS.COUPONS);
      const sales = getSheetRowsAsObjects(SHEETS.SALES);
      const users = getSheetRowsAsObjects(SHEETS.USERS).map(user => {
        return {
          UserID: user.UserID,
          FullName: user.FullName,
          Phone: user.Phone || '',
          Email: user.Email || '',
          Role: user.Role || 'Customer',
          PIN: user.PIN || '',
          Address: user.Address || '',
          AvatarUrl: formatGoogleDriveImageUrl(user.AvatarUrl || user.Avatar || user.Photo || user.ProfilePicture || ''),
          Status: user.Status || 'Active',
          CreatedAt: user.CreatedAt || '',
          UpdatedAt: user.UpdatedAt || ''
        };
      });

      let activeSetting = null;
      for (let s = 0; s < settings.length; s++) {
        if (settings[s] && (settings[s].StoreName || settings[s].LogoUrl || settings[s].Logo || settings[s]['Logo URL'] || settings[s].Address || settings[s].Phone || settings[s].Email || settings[s].ApiUrl)) {
          activeSetting = settings[s];
          break;
        }
      }
      if (!activeSetting && settings.length > 0) activeSetting = settings[0];

      return createJsonResponse({
        success: true,
        data: {
          settings: activeSetting,
          products: products,
          categories: categories,
          units: units,
          customers: customers,
          coupons: coupons,
          sales: sales,
          users: users
        }
      });
    }

    // ১.১ শুধুমাত্র পরিমাপক একক (Units) তালিকা আনা
    if (action === 'getUnits') {
      const units = getSheetRowsAsObjects(SHEETS.UNITS);
      return createJsonResponse({
        success: true,
        data: units
      });
    }

    // ১.২ শুধুমাত্র গ্রাহক (Customers) তালিকা আনা
    if (action === 'getCustomers') {
      const customers = getSheetRowsAsObjects(SHEETS.CUSTOMERS);
      return createJsonResponse({
        success: true,
        data: customers
      });
    }

    // ১.৩ শুধুমাত্র কুপন (Coupons) তালিকা আনা
    if (action === 'getCoupons') {
      const coupons = getSheetRowsAsObjects(SHEETS.COUPONS);
      return createJsonResponse({
        success: true,
        data: coupons
      });
    }

    // ২. শুধুমাত্র মাস্টার সেটিংস তথ্য আনা
    if (action === 'getSettings') {
      const settings = getSheetRowsAsObjects(SHEETS.SETTINGS);
      return createJsonResponse({
        success: true,
        data: settings.length > 0 ? settings[0] : null
      });
    }

    // ৩. সকল পণ্যের তালিকা আনা
    if (action === 'getProducts') {
      const products = getSheetRowsAsObjects(SHEETS.PRODUCTS);
      return createJsonResponse({
        success: true,
        data: products
      });
    }

    // ৪. সাম্প্রতিক বিক্রয় হিস্ট্রি আনা
    if (action === 'getSales') {
      const limit = (e.parameter && e.parameter.limit) ? parseInt(e.parameter.limit) : 50;
      const sales = getSheetRowsAsObjects(SHEETS.SALES);
      const recentSales = sales.reverse().slice(0, limit);
      return createJsonResponse({
        success: true,
        data: recentSales
      });
    }

    // ৪.১ নির্দিষ্ট ইনভয়েস নম্বর দিয়ে বিক্রয় বিবরণ আনা (getSaleByInvoice)
    if (action === 'getSaleByInvoice') {
      const invoiceNo = (e.parameter && e.parameter.invoiceNo) ? String(e.parameter.invoiceNo).trim().toLowerCase() : '';
      if (!invoiceNo) {
        return createJsonResponse({
          success: false,
          message: 'অনুগ্রহ করে ইনভয়েস নম্বর প্রদান করুন।'
        });
      }
      const sales = getSheetRowsAsObjects(SHEETS.SALES);
      const foundSale = sales.find(s => {
        const inv = String(s.InvoiceNo || s.invoiceNo || '').trim().toLowerCase();
        const saleId = String(s.SaleID || s.saleId || '').trim().toLowerCase();
        return inv === invoiceNo || saleId === invoiceNo || inv.endsWith(invoiceNo);
      });

      if (!foundSale) {
        return createJsonResponse({
          success: false,
          message: `ইনভয়েস নম্বর '${e.parameter.invoiceNo}' দিয়ে কোনো বিক্রয় পাওয়া যায়নি।`
        });
      }

      return createJsonResponse({
        success: true,
        data: foundSale
      });
    }

    // ৫. স্টক মুভমেন্ট লগ হিস্ট্রি আনা
    if (action === 'getStockLogs') {
      const limit = (e.parameter && e.parameter.limit) ? parseInt(e.parameter.limit) : 50;
      const logs = getSheetRowsAsObjects(SHEETS.STOCK_LOGS);
      const recentLogs = logs.reverse().slice(0, limit);
      return createJsonResponse({
        success: true,
        data: recentLogs
      });
    }

    // ৬. ব্যবহারকারী ও স্টাফ তালিকা আনা
    if (action === 'getUsers') {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      ensureUsersSheet(spreadsheet);
      const users = getSheetRowsAsObjects(SHEETS.USERS).map(user => ({
        UserID: user.UserID,
        FullName: user.FullName,
        Phone: user.Phone || '',
        Email: user.Email || '',
        Role: user.Role || 'Customer',
        PIN: user.PIN || '',
        Address: user.Address || '',
        AvatarUrl: formatGoogleDriveImageUrl(user.AvatarUrl || user.Avatar || user.Photo || user.ProfilePicture || ''),
        Status: user.Status || 'Active',
        CreatedAt: user.CreatedAt || '',
        UpdatedAt: user.UpdatedAt || ''
      }));
      return createJsonResponse({
        success: true,
        data: users
      });
    }

    return createJsonResponse({
      success: false,
      message: `Invalid action: ${action}`
    });

  } catch (error) {
    return createJsonResponse({
      success: false,
      message: error.toString()
    });
  }
}

/**
 * POST রিকোয়েস্ট হ্যান্ডলার (ডাটা তৈরি ও আপডেট API)
 * @param {Object} e - ইভেন্ট প্যারামিটার (পোস্ট ডাটা বডিসহ)
 * @return {TextOutput} JSON আউটপুট
 */
function doPost(e) {
  // একাধিক ক্লায়েন্ট থেকে একই সময়ে রিকোয়েস্ট আসলে স্টক ওভারল্যাপিং রোধ করার জন্য স্ক্রিপ্ট লক
  const lock = LockService.getScriptLock();

  try {
    // লক পাওয়ার জন্য সর্বোচ্চ ৩০ সেকেন্ড অপেক্ষা
    const hasLock = lock.tryLock(30000);
    if (!hasLock) {
      return createJsonResponse({
        success: false,
        message: 'সার্ভার ব্যস্ত রয়েছে। অনুগ্রহ করে কয়েক সেকেন্ড পর পুনরায় চেষ্টা করুন।'
      });
    }

    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        success: false,
        message: 'পোস্ট ডাটা পাওয়া যায়নি।'
      });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      return createJsonResponse({
        success: false,
        message: 'অ্যাক্টিভ গুগল শিট পাওয়া যায়নি। নিশ্চিত করুন Apps Script টি আপনার ডাটাবেস শিটের Extensions > Apps Script থেকে খোলা হয়েছে।'
      });
    }

    let result = null;

    // অ্যাকশন অনুযায়ী নির্দিষ্ট সার্ভিসে পাঠানো
    switch (action) {
      case 'addStock':
        result = handleAddStock(spreadsheet, payload);
        break;

      case 'createSale':
        result = handleCreateSale(spreadsheet, payload);
        break;

      case 'addProduct':
        result = handleAddProduct(spreadsheet, payload);
        break;

      case 'updateProduct':
        result = handleUpdateProduct(spreadsheet, payload);
        break;

      case 'deleteProduct':
        result = handleDeleteProduct(spreadsheet, payload);
        break;

      case 'uploadProductImage':
        const uProdId = payload.productId || payload.ProductID || generateUniqueId('PROD');
        const uProdName = payload.productName || payload.ProductName || 'product';
        const driveUrl = saveProductImageToDrive(spreadsheet, uProdId, uProdName, payload.imageBase64, payload.imageMimeType);
        result = {
          success: !!driveUrl,
          message: driveUrl ? 'ছবি সফলভাবে গুগল ড্রাইভে আপলোড হয়েছে।' : 'ছবি আপলোড করতে সমস্যা হয়েছে।',
          data: { imageUrl: driveUrl, productId: uProdId }
        };
        break;

      case 'updateSettings':
        result = handleUpdateSettings(spreadsheet, payload);
        break;

      case 'addCategory':
        result = handleAddCategory(spreadsheet, payload);
        break;

      case 'addUnit':
        result = handleAddUnit(spreadsheet, payload);
        break;

      case 'addCustomer':
      case 'updateCustomer':
        result = handleAddCustomer(spreadsheet, payload);
        break;

      case 'deleteCustomer':
        result = handleDeleteCustomer(spreadsheet, payload);
        break;

      case 'addCoupon':
      case 'updateCoupon':
        result = handleSaveCoupon(spreadsheet, payload);
        break;

      case 'deleteCoupon':
        result = handleDeleteCoupon(spreadsheet, payload);
        break;

      case 'registerUser':
        result = handleRegisterUser(spreadsheet, payload);
        break;

      case 'addUser':
        result = handleAddUser(spreadsheet, payload);
        break;

      case 'updateUser':
        result = handleUpdateUser(spreadsheet, payload);
        break;

      case 'deleteUser':
        result = handleDeleteUser(spreadsheet, payload);
        break;

      case 'loginUser':
        result = handleLoginUser(spreadsheet, payload);
        break;

      case 'uploadUserAvatar':
        const uId = payload.userId || payload.UserID || generateUniqueId('USER');
        const uName = payload.userName || payload.FullName || 'user';
        const avatarRes = saveUserAvatarToDrive(spreadsheet, uId, uName, payload.imageBase64, payload.imageMimeType);
        result = {
          success: avatarRes.success,
          message: avatarRes.success ? 'প্রোফাইল ছবি সফলভাবে গুগল ড্রাইভে আপলোড হয়েছে।' : (avatarRes.error || 'ছবি আপলোড করতে সমস্যা হয়েছে।'),
          data: { avatarUrl: avatarRes.url, userId: uId }
        };
        break;

      default:
        result = {
          success: false,
          message: `অজানা অ্যাকশন: ${action}`
        };
    }

    return createJsonResponse(result);

  } catch (err) {
    return createJsonResponse({
      success: false,
      message: err.toString()
    });
  } finally {
    // যেকোনো পরিস্থিতিতে কাজ শেষে লক মুক্ত করে দেওয়া
    lock.releaseLock();
  }
}

/**
 * গুগল ড্রাইভের সম্পূর্ণ রিড ও রাইট (Folder & File Create) পারমিশন সক্রিয় করার সরাসরি ফাংশন
 * এটি রান করলে গুগল স্বয়ংক্রিয়ভাবে ড্রাইভের ফুল রাইট পারমিশন (create/edit) উইন্ডো নিয়ে আসবে।
 */
function authorizeDriveAccess() {
  const root = DriveApp.getRootFolder();
  // একটি সাময়িক টেস্ট ফোল্ডার তৈরি ও ট্র্যাশে পাঠানো যাতে গুগল পূর্ণ রাইট (write) পারমিশন চায়
  const testFolder = root.createFolder('_temp_drive_auth_check_');
  testFolder.setTrashed(true);
  Logger.log('অভিনন্দন! গুগল ড্রাইভের সম্পূর্ণ রিড ও রাইট (Create/Write) পারমিশন সফলভাবে অনুমোদিত হয়েছে।');
}

/**
 * গুগল অ্যাপস স্ক্রিপ্ট পারমিশন টেস্ট ও ডাটাবেস ইনিশিয়ালাইজেশন
 * (Apps Script এডিটরে এই ফাংশনটি সিলেক্ট করে 'Run' বাটনে ক্লিক করলে ড্রাইভ ও শিট পারমিশন এক্সেস নেওয়া যাবে)
 */
function testPermissionsAndInit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('ত্রুটি: অ্যাক্টিভ স্প্রেডশিট পাওয়া যায়নি!');
    return;
  }
  Logger.log('স্প্রেডশিটের নাম: ' + ss.getName());

  // ড্রাইভ পূর্ণ এক্সেস ও ফোল্ডার তৈরি টেস্ট
  try {
    const file = DriveApp.getFileById(ss.getId());
    const parent = file.getParents().hasNext() ? file.getParents().next() : DriveApp.getRootFolder();
    const testFolder = parent.createFolder('_temp_auth_test_');
    testFolder.setTrashed(true);
    Logger.log('ড্রাইভ পূর্ণ এক্সেস (Read & Write) সফল! মূল ফোল্ডার: ' + parent.getName());
  } catch (err) {
    Logger.log('ড্রাইভ এক্সেস সতর্কতা: ' + err.toString());
  }

  // ডাটাবেস স্কিমা ও টেবিল নিশ্চিত করা
  setupDatabase();
  Logger.log('ডাটাবেস সফলভাবে প্রস্তুত হয়েছে!');
}

/**
 * নতুন কাস্টমার যোগ বা আপডেট করার হ্যান্ডলার
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট
 * @param {Object} payload - কাস্টমার ডাটা
 * @return {Object} রেসপন্স অবজেক্ট
 */
function handleAddCustomer(spreadsheet, payload) {
  const customersSheet = ensureCustomersSheet(spreadsheet);
  const name = String(payload.customerName || payload.CustomerName || '').trim();
  const phone = String(payload.phone || payload.Phone || '').trim();
  const email = String(payload.email || payload.Email || '').trim();
  const address = String(payload.address || payload.Address || '').trim();
  const type = String(payload.customerType || payload.CustomerType || 'Regular').trim();
  const customerId = String(payload.customerId || payload.CustomerID || '').trim();

  if (!name && !phone) {
    return { success: false, message: 'গ্রাহকের নাম অথবা ফোন নম্বর দেওয়া আবশ্যক।' };
  }

  const custData = getSheetRowsAsObjects(SHEETS.CUSTOMERS);
  const existing = custData.find(c => 
    (customerId && String(c.CustomerID || '').trim() === customerId) ||
    (phone && String(c.Phone || '').trim() === phone) ||
    (name && String(c.CustomerName || '').trim().toLowerCase() === name.toLowerCase())
  );

  const lastCol = customersSheet.getLastColumn();
  const headers = customersSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const colMap = {
    CustomerID: findCol(headers, 'CustomerID', 'ID'),
    CustomerName: findCol(headers, 'CustomerName', 'Name'),
    Phone: findCol(headers, 'Phone', 'Mobile'),
    Email: findCol(headers, 'Email', 'Mail'),
    Address: findCol(headers, 'Address'),
    CustomerType: findCol(headers, 'CustomerType', 'Type', 'Category'),
    TotalOrders: findCol(headers, 'TotalOrders', 'Orders'),
    TotalSpent: findCol(headers, 'TotalSpent', 'Spent'),
    Status: findCol(headers, 'Status'),
    CreatedAt: findCol(headers, 'CreatedAt', 'Created'),
    UpdatedAt: findCol(headers, 'UpdatedAt', 'Updated')
  };

  const timestamp = new Date();

  if (existing && existing._rowIndex) {
    // বিদ্যমান গ্রাহকের তথ্য আপডেট করা
    if (name && colMap.CustomerName !== -1) customersSheet.getRange(existing._rowIndex, colMap.CustomerName + 1).setValue(name);
    if (phone && colMap.Phone !== -1) customersSheet.getRange(existing._rowIndex, colMap.Phone + 1).setValue(phone);
    if (email && colMap.Email !== -1) customersSheet.getRange(existing._rowIndex, colMap.Email + 1).setValue(email);
    if (address && colMap.Address !== -1) customersSheet.getRange(existing._rowIndex, colMap.Address + 1).setValue(address);
    if (type && colMap.CustomerType !== -1) customersSheet.getRange(existing._rowIndex, colMap.CustomerType + 1).setValue(type);
    if (colMap.UpdatedAt !== -1) customersSheet.getRange(existing._rowIndex, colMap.UpdatedAt + 1).setValue(timestamp);
    SpreadsheetApp.flush();

    return {
      success: true,
      message: 'গ্রাহকের তথ্য সফলভাবে আপডেট হয়েছে।',
      data: {
        ...existing,
        CustomerName: name || existing.CustomerName,
        Phone: phone || existing.Phone,
        Email: email || existing.Email,
        Address: address || existing.Address,
        CustomerType: type || existing.CustomerType,
        UpdatedAt: timestamp
      }
    };
  }

  const custId = customerId || generateUniqueId('CUST');
  const newRow = new Array(headers.length).fill('');
  if (colMap.CustomerID !== -1) newRow[colMap.CustomerID] = custId;
  if (colMap.CustomerName !== -1) newRow[colMap.CustomerName] = name;
  if (colMap.Phone !== -1) newRow[colMap.Phone] = phone;
  if (colMap.Email !== -1) newRow[colMap.Email] = email;
  if (colMap.Address !== -1) newRow[colMap.Address] = address;
  if (colMap.CustomerType !== -1) newRow[colMap.CustomerType] = type;
  if (colMap.TotalOrders !== -1) newRow[colMap.TotalOrders] = 0;
  if (colMap.TotalSpent !== -1) newRow[colMap.TotalSpent] = 0;
  if (colMap.Status !== -1) newRow[colMap.Status] = 'Active';
  if (colMap.CreatedAt !== -1) newRow[colMap.CreatedAt] = timestamp;
  if (colMap.UpdatedAt !== -1) newRow[colMap.UpdatedAt] = timestamp;

  customersSheet.appendRow(newRow);
  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'নতুন গ্রাহক সফলভাবে ডাটাবেসে যুক্ত হয়েছে।',
    data: {
      CustomerID: custId,
      CustomerName: name,
      Phone: phone,
      Email: email,
      Address: address,
      CustomerType: type,
      TotalOrders: 0,
      TotalSpent: 0,
      Status: 'Active',
      CreatedAt: timestamp,
      UpdatedAt: timestamp
    }
  };
}

/**
 * গ্রাহক মুছে ফেলার হ্যান্ডলার
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট
 * @param {Object} payload - রিকোয়েস্ট পে-লোড
 * @return {Object} রেসপন্স অবজেক্ট
 */
function handleDeleteCustomer(spreadsheet, payload) {
  const customersSheet = ensureCustomersSheet(spreadsheet);
  const customerId = String(payload.customerId || payload.CustomerID || '').trim();
  const phone = String(payload.phone || payload.Phone || '').trim();

  if (!customerId && !phone) {
    return { success: false, message: 'সঠিক CustomerID অথবা ফোন নম্বর দেওয়া আবশ্যক।' };
  }

  const custData = getSheetRowsAsObjects(SHEETS.CUSTOMERS);
  const target = custData.find(c => 
    (customerId && String(c.CustomerID || '').trim() === customerId) ||
    (phone && String(c.Phone || '').trim() === phone)
  );

  if (!target || !target._rowIndex) {
    return { success: false, message: 'গ্রাহক ডাটাবেসে খুঁজে পাওয়া যায়নি।' };
  }

  customersSheet.deleteRow(target._rowIndex);
  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'গ্রাহক সফলভাবে ডাটাবেস থেকে মুছে ফেলা হয়েছে।'
  };
}

/**
 * কুপন তৈরি বা আপডেট করার হ্যান্ডলার (পণ্যভিত্তিক বা সার্বজনীন কুপন)
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট
 * @param {Object} payload - রিকোয়েস্ট পে-লোড
 * @return {Object} রেসপন্স অবজেক্ট
 */
function handleSaveCoupon(spreadsheet, payload) {
  const couponsSheet = ensureCouponsSheet(spreadsheet);
  const code = String(payload.couponCode || payload.CouponCode || '').trim().toUpperCase();

  if (!code) {
    return { success: false, message: 'কুপন কোড প্রদান করা আবশ্যক।' };
  }

  const couponId = String(payload.couponId || payload.CouponID || '').trim();
  const discountType = payload.discountType || payload.DiscountType || 'Percentage';
  const discountValue = Number(payload.discountValue !== undefined ? payload.discountValue : payload.DiscountValue) || 0;
  const applicableType = payload.applicableType || payload.ApplicableType || 'AllProducts';
  const productId = String(payload.productId || payload.ProductID || '').trim();
  const productName = String(payload.productName || payload.ProductName || (applicableType === 'AllProducts' ? 'সকল পণ্য' : '')).trim();
  const minPurchaseAmount = Number(payload.minPurchaseAmount !== undefined ? payload.minPurchaseAmount : payload.MinPurchaseAmount) || 0;
  const maxDiscountAmount = Number(payload.maxDiscountAmount !== undefined ? payload.maxDiscountAmount : payload.MaxDiscountAmount) || 0;
  const usageLimit = Number(payload.usageLimit !== undefined ? payload.usageLimit : payload.UsageLimit) || 0;
  const usedCount = Number(payload.usedCount !== undefined ? payload.usedCount : payload.UsedCount) || 0;
  const expiryDate = String(payload.expiryDate || payload.ExpiryDate || '').trim();
  const status = payload.status || payload.Status || 'Active';

  const lastCol = couponsSheet.getLastColumn();
  const headers = couponsSheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const colMap = {
    CouponID: findCol(headers, 'CouponID', 'ID'),
    CouponCode: findCol(headers, 'CouponCode', 'Code'),
    DiscountType: findCol(headers, 'DiscountType', 'Type'),
    DiscountValue: findCol(headers, 'DiscountValue', 'Value', 'Discount'),
    ApplicableType: findCol(headers, 'ApplicableType', 'Scope'),
    ProductID: findCol(headers, 'ProductID'),
    ProductName: findCol(headers, 'ProductName'),
    MinPurchaseAmount: findCol(headers, 'MinPurchaseAmount', 'MinPurchase', 'MinAmount'),
    MaxDiscountAmount: findCol(headers, 'MaxDiscountAmount', 'MaxDiscount'),
    UsageLimit: findCol(headers, 'UsageLimit', 'Limit'),
    UsedCount: findCol(headers, 'UsedCount', 'Used'),
    ExpiryDate: findCol(headers, 'ExpiryDate', 'Expiry'),
    Status: findCol(headers, 'Status'),
    CreatedAt: findCol(headers, 'CreatedAt', 'Created'),
    UpdatedAt: findCol(headers, 'UpdatedAt', 'Updated')
  };

  const existingCoupons = getSheetRowsAsObjects(SHEETS.COUPONS);
  const existing = existingCoupons.find(c => 
    (couponId && String(c.CouponID || '').trim() === couponId) ||
    (String(c.CouponCode || '').trim().toUpperCase() === code)
  );

  const timestamp = new Date();

  if (existing && existing._rowIndex) {
    if (code && colMap.CouponCode !== -1) couponsSheet.getRange(existing._rowIndex, colMap.CouponCode + 1).setValue(code);
    if (colMap.DiscountType !== -1) couponsSheet.getRange(existing._rowIndex, colMap.DiscountType + 1).setValue(discountType);
    if (colMap.DiscountValue !== -1) couponsSheet.getRange(existing._rowIndex, colMap.DiscountValue + 1).setValue(discountValue);
    if (colMap.ApplicableType !== -1) couponsSheet.getRange(existing._rowIndex, colMap.ApplicableType + 1).setValue(applicableType);
    if (colMap.ProductID !== -1) couponsSheet.getRange(existing._rowIndex, colMap.ProductID + 1).setValue(productId);
    if (colMap.ProductName !== -1) couponsSheet.getRange(existing._rowIndex, colMap.ProductName + 1).setValue(productName);
    if (colMap.MinPurchaseAmount !== -1) couponsSheet.getRange(existing._rowIndex, colMap.MinPurchaseAmount + 1).setValue(minPurchaseAmount);
    if (colMap.MaxDiscountAmount !== -1) couponsSheet.getRange(existing._rowIndex, colMap.MaxDiscountAmount + 1).setValue(maxDiscountAmount);
    if (colMap.UsageLimit !== -1) couponsSheet.getRange(existing._rowIndex, colMap.UsageLimit + 1).setValue(usageLimit);
    if (colMap.UsedCount !== -1) couponsSheet.getRange(existing._rowIndex, colMap.UsedCount + 1).setValue(usedCount);
    if (colMap.ExpiryDate !== -1) couponsSheet.getRange(existing._rowIndex, colMap.ExpiryDate + 1).setValue(expiryDate);
    if (colMap.Status !== -1) couponsSheet.getRange(existing._rowIndex, colMap.Status + 1).setValue(status);
    if (colMap.UpdatedAt !== -1) couponsSheet.getRange(existing._rowIndex, colMap.UpdatedAt + 1).setValue(timestamp);
    SpreadsheetApp.flush();

    return {
      success: true,
      message: `'${code}' কুপনের তথ্য সফলভাবে আপডেট হয়েছে।`,
      data: {
        ...existing,
        CouponCode: code,
        DiscountType: discountType,
        DiscountValue: discountValue,
        ApplicableType: applicableType,
        ProductID: productId,
        ProductName: productName,
        MinPurchaseAmount: minPurchaseAmount,
        MaxDiscountAmount: maxDiscountAmount,
        UsageLimit: usageLimit,
        UsedCount: usedCount,
        ExpiryDate: expiryDate,
        Status: status,
        UpdatedAt: timestamp
      }
    };
  }

  const cId = couponId || generateUniqueId('COUPON');
  const newRow = new Array(headers.length).fill('');
  if (colMap.CouponID !== -1) newRow[colMap.CouponID] = cId;
  if (colMap.CouponCode !== -1) newRow[colMap.CouponCode] = code;
  if (colMap.DiscountType !== -1) newRow[colMap.DiscountType] = discountType;
  if (colMap.DiscountValue !== -1) newRow[colMap.DiscountValue] = discountValue;
  if (colMap.ApplicableType !== -1) newRow[colMap.ApplicableType] = applicableType;
  if (colMap.ProductID !== -1) newRow[colMap.ProductID] = productId;
  if (colMap.ProductName !== -1) newRow[colMap.ProductName] = productName;
  if (colMap.MinPurchaseAmount !== -1) newRow[colMap.MinPurchaseAmount] = minPurchaseAmount;
  if (colMap.MaxDiscountAmount !== -1) newRow[colMap.MaxDiscountAmount] = maxDiscountAmount;
  if (colMap.UsageLimit !== -1) newRow[colMap.UsageLimit] = usageLimit;
  if (colMap.UsedCount !== -1) newRow[colMap.UsedCount] = usedCount;
  if (colMap.ExpiryDate !== -1) newRow[colMap.ExpiryDate] = expiryDate;
  if (colMap.Status !== -1) newRow[colMap.Status] = status;
  if (colMap.CreatedAt !== -1) newRow[colMap.CreatedAt] = timestamp;
  if (colMap.UpdatedAt !== -1) newRow[colMap.UpdatedAt] = timestamp;

  couponsSheet.appendRow(newRow);
  SpreadsheetApp.flush();

  return {
    success: true,
    message: `'${code}' কুপন সফলভাবে ডাটাবেসে তৈরি হয়েছে।`,
    data: {
      CouponID: cId,
      CouponCode: code,
      DiscountType: discountType,
      DiscountValue: discountValue,
      ApplicableType: applicableType,
      ProductID: productId,
      ProductName: productName,
      MinPurchaseAmount: minPurchaseAmount,
      MaxDiscountAmount: maxDiscountAmount,
      UsageLimit: usageLimit,
      UsedCount: usedCount,
      ExpiryDate: expiryDate,
      Status: status,
      CreatedAt: timestamp,
      UpdatedAt: timestamp
    }
  };
}

/**
 * কুপন মুছে ফেলার হ্যান্ডলার
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট
 * @param {Object} payload - রিকোয়েস্ট পে-লোড
 * @return {Object} রেসপন্স অবজেক্ট
 */
function handleDeleteCoupon(spreadsheet, payload) {
  const couponsSheet = ensureCouponsSheet(spreadsheet);
  const couponId = String(payload.couponId || payload.CouponID || '').trim();
  const couponCode = String(payload.couponCode || payload.CouponCode || '').trim().toUpperCase();

  if (!couponId && !couponCode) {
    return { success: false, message: 'সঠিক CouponID অথবা CouponCode দেওয়া আবশ্যক।' };
  }

  const couponData = getSheetRowsAsObjects(SHEETS.COUPONS);
  const target = couponData.find(c => 
    (couponId && String(c.CouponID || '').trim() === couponId) ||
    (couponCode && String(c.CouponCode || '').trim().toUpperCase() === couponCode)
  );

  if (!target || !target._rowIndex) {
    return { success: false, message: 'কুপন ডাটাবেসে খুঁজে পাওয়া যায়নি।' };
  }

  couponsSheet.deleteRow(target._rowIndex);
  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'কুপন সফলভাবে ডাটাবেস থেকে মুছে ফেলা হয়েছে।'
  };
}

/**
 * ============================================================================
 * ইউজার ও গ্রাহক অথেনটিকেশন ও অ্যাকাউন্ট ম্যানেজমেন্ট হ্যান্ডলারসমূহ
 * ============================================================================
 */

/**
 * গুগল ড্রাইভে ইউজারের প্রোফাইল ছবি সেভ করা
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট
 * @param {string} userId - ইউজার আইডি
 * @param {string} userName - ইউজারের নাম
 * @param {string} base64Data - ছবির বেইজ৬৪ ডাটা
 * @param {string} mimeType - ছবির মাইম টাইপ
 * @return {Object} ফলাফল ও থাম্বনেইল লিংক
 */
function saveUserAvatarToDrive(spreadsheet, userId, userName, base64Data, mimeType) {
  if (!base64Data || typeof base64Data !== 'string') {
    return { success: false, url: '', error: 'ছবি ডাটা পাওয়া যায়নি।' };
  }

  try {
    const spreadsheetFile = DriveApp.getFileById(spreadsheet.getId());
    const parents = spreadsheetFile.getParents();
    let parentFolder = null;
    while (parents.hasNext()) {
      const p = parents.next();
      if (!p.isTrashed()) {
        parentFolder = p;
        break;
      }
    }
    if (!parentFolder) {
      parentFolder = DriveApp.getRootFolder();
    }

    // "users image" ফোল্ডার তৈরি বা সিলেক্ট করা
    let usersImageFolder = null;
    const folderIter = parentFolder.getFoldersByName('users image');
    while (folderIter.hasNext()) {
      const f = folderIter.next();
      if (!f.isTrashed()) {
        usersImageFolder = f;
        break;
      }
    }
    if (!usersImageFolder) {
      usersImageFolder = parentFolder.createFolder('users image');
    }

    let ext = 'jpg';
    if (mimeType) {
      const lowerMime = mimeType.toLowerCase();
      if (lowerMime.includes('png')) ext = 'png';
      else if (lowerMime.includes('webp')) ext = 'webp';
      else if (lowerMime.includes('jpeg') || lowerMime.includes('jpg')) ext = 'jpg';
      else if (lowerMime.includes('gif')) ext = 'gif';
    }

    let cleanBase64 = base64Data.trim();
    if (cleanBase64.includes('base64,')) {
      cleanBase64 = cleanBase64.split('base64,')[1];
    }
    const decodedBytes = Utilities.base64Decode(cleanBase64);
    const contentType = mimeType || 'image/jpeg';
    const safeName = String(userName || 'user').replace(/[^a-zA-Z0-9_\-\u0980-\u09FF]/g, '_').substring(0, 30);
    const fileName = `${userId}_${safeName}_avatar.${ext}`;
    const blob = Utilities.newBlob(decodedBytes, contentType, fileName);

    const file = usersImageFolder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      Logger.log('Set public access soft error: ' + e.message);
    }

    const driveUrl = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1000';
    return {
      success: true,
      url: driveUrl,
      fileId: file.getId(),
      error: ''
    };
  } catch (err) {
    Logger.log('User avatar drive upload failed: ' + err.toString());
    return {
      success: false,
      url: '',
      error: err.toString()
    };
  }
}

/**
 * নতুন ব্যবহারকারী তৈরি (এডমিন দ্বারা রোল নির্ধারণ অথবা স্বয়ংক্রিয় তৈরি)
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - ব্যবহারকারীর তথ্য
 * @return {Object} ফলাফল অবজেক্ট
 */
function handleAddUser(spreadsheet, payload) {
  const usersSheet = ensureUsersSheet(spreadsheet);
  const fullName = String(payload.fullName || payload.FullName || payload.name || '').trim();
  const phone = String(payload.phone || payload.Phone || payload.mobile || '').trim();
  const email = String(payload.email || payload.Email || '').trim().toLowerCase();
  const role = String(payload.role || payload.Role || 'Customer').trim();
  const pin = String(payload.pin || payload.PIN || payload.password || '').trim();
  const address = String(payload.address || payload.Address || '').trim();
  const status = String(payload.status || payload.Status || 'Active').trim();
  let userId = String(payload.userId || payload.UserID || '').trim();
  let avatarUrl = String(payload.avatarUrl || payload.AvatarUrl || payload.photoUrl || '').trim();

  if (!fullName) {
    return { success: false, message: 'ব্যবহারকারীর পুরো নাম প্রদান করা আবশ্যক।' };
  }
  if (!phone && !email) {
    return { success: false, message: 'কমপক্ষে একটি মোবাইল নম্বর বা ইমেইল ঠিকানা আবশ্যক।' };
  }
  if (!pin || pin.length < 4) {
    return { success: false, message: 'কমপক্ষে ৪ ডিজিটের পিন বা পাসওয়ার্ড আবশ্যক।' };
  }

  // ডুপ্লিকেট ইউজার যাচাই (মোবাইল বা ইমেইল)
  const usersData = getSheetRowsAsObjects(SHEETS.USERS);
  const existingUser = usersData.find(u => {
    const matchPhone = phone && u.Phone && String(u.Phone).trim() === phone;
    const matchEmail = email && u.Email && String(u.Email).trim().toLowerCase() === email;
    return matchPhone || matchEmail;
  });

  if (existingUser) {
    return {
      success: false,
      message: 'এই মোবাইল নম্বর বা ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট নিবন্ধিত রয়েছে।'
    };
  }

  if (!userId) {
    const prefix = role === 'Admin' ? 'USER-ADM' : (role === 'Cashier' ? 'USER-CSH' : (role === 'Salesman' ? 'USER-SLS' : (role === 'Manager' ? 'USER-MGR' : 'USER-CUST')));
    userId = generateUniqueId(prefix);
  }

  // ছবি গুগল ড্রাইভে আপলোড হ্যান্ডলিং (যদি ইমেজ বেস৬৪ ডাটা পাঠানো হয়)
  const imageBase64 = payload.imageBase64 || payload.avatarBase64;
  if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 50) {
    try {
      const driveRes = saveUserAvatarToDrive(spreadsheet, userId, fullName, imageBase64, payload.imageMimeType || payload.avatarMimeType);
      if (driveRes && driveRes.success && driveRes.url) {
        avatarUrl = driveRes.url;
      }
    } catch (e) {
      Logger.log('Avatar upload error: ' + e.message);
    }
  }

  const lastCol = usersSheet.getLastColumn();
  const headers = usersSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const colMap = {
    UserID: findCol(headers, 'UserID', 'ID'),
    FullName: findCol(headers, 'FullName', 'Name'),
    Phone: findCol(headers, 'Phone', 'Mobile'),
    Email: findCol(headers, 'Email', 'Mail'),
    Role: findCol(headers, 'Role'),
    PIN: findCol(headers, 'PIN', 'Password'),
    Address: findCol(headers, 'Address'),
    AvatarUrl: findCol(headers, 'AvatarUrl', 'Avatar', 'Photo', 'ProfilePicture', 'ImageUrl', 'Image'),
    Status: findCol(headers, 'Status'),
    CreatedAt: findCol(headers, 'CreatedAt', 'Created'),
    UpdatedAt: findCol(headers, 'UpdatedAt', 'Updated')
  };

  const now = new Date();
  const newRow = new Array(lastCol).fill('');

  if (colMap.UserID !== -1) newRow[colMap.UserID] = userId;
  if (colMap.FullName !== -1) newRow[colMap.FullName] = fullName;
  if (colMap.Phone !== -1) newRow[colMap.Phone] = phone;
  if (colMap.Email !== -1) newRow[colMap.Email] = email;
  if (colMap.Role !== -1) newRow[colMap.Role] = role;
  if (colMap.PIN !== -1) newRow[colMap.PIN] = pin;
  if (colMap.Address !== -1) newRow[colMap.Address] = address;
  if (colMap.AvatarUrl !== -1) newRow[colMap.AvatarUrl] = avatarUrl;
  if (colMap.Status !== -1) newRow[colMap.Status] = status;
  if (colMap.CreatedAt !== -1) newRow[colMap.CreatedAt] = now;
  if (colMap.UpdatedAt !== -1) newRow[colMap.UpdatedAt] = now;

  usersSheet.appendRow(newRow);
  SpreadsheetApp.flush();

  // যদি গ্রাহক (Customer) রোল হয়, তবে গ্রাহক ডাটাবেসেও (Customers) নিশ্চিত করা
  if (role === 'Customer') {
    try {
      handleAddCustomer(spreadsheet, {
        customerName: fullName,
        phone: phone,
        email: email,
        address: address,
        customerType: 'Regular'
      });
    } catch (e) {
      Logger.log('Customer sync skipped: ' + e.message);
    }
  }

  const createdUser = {
    UserID: userId,
    FullName: fullName,
    Phone: phone,
    Email: email,
    Role: role,
    PIN: pin,
    Address: address,
    AvatarUrl: formatGoogleDriveImageUrl(avatarUrl),
    Status: status,
    CreatedAt: now.toISOString(),
    UpdatedAt: now.toISOString()
  };

  return {
    success: true,
    message: role === 'Customer' ? 'গ্রাহক নিবন্ধন সফলভাবে সম্পন্ন হয়েছে।' : 'নতুন ব্যবহারকারী সফলভাবে তৈরি করা হয়েছে।',
    data: createdUser
  };
}

/**
 * গ্রাহক সাইনআপ হ্যান্ডলার (স্বয়ংক্রিয়ভাবে Role: Customer নির্ধারণ করে)
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - সাইনআপ ফরম ডাটা
 * @return {Object} রেসপন্স অবজেক্ট
 */
function handleRegisterUser(spreadsheet, payload) {
  payload.role = 'Customer';
  payload.Role = 'Customer';
  return handleAddUser(spreadsheet, payload);
}

/**
 * বিদ্যমান ব্যবহারকারীর তথ্য আপডেট করা
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট
 * @param {Object} payload - ব্যবহারকারীর আপডেট ডাটা
 * @return {Object} ফলাফল
 */
function handleUpdateUser(spreadsheet, payload) {
  const usersSheet = ensureUsersSheet(spreadsheet);
  const userId = String(payload.userId || payload.UserID || '').trim();
  const phone = String(payload.phone || payload.Phone || '').trim();
  const email = String(payload.email || payload.Email || '').trim().toLowerCase();

  if (!userId && !phone && !email) {
    return { success: false, message: 'ব্যবহারকারীর UserID, মোবাইল বা ইমেইল আবশ্যক।' };
  }

  const usersData = getSheetRowsAsObjects(SHEETS.USERS);
  const target = usersData.find(u =>
    (userId && String(u.UserID || '').trim() === userId) ||
    (phone && String(u.Phone || '').trim() === phone) ||
    (email && String(u.Email || '').trim().toLowerCase() === email)
  );

  if (!target || !target._rowIndex) {
    return { success: false, message: 'ব্যবহারকারী ডাটাবেসে খুঁজে পাওয়া যায়নি।' };
  }

  const lastCol = usersSheet.getLastColumn();
  const headers = usersSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const colMap = {
    FullName: findCol(headers, 'FullName', 'Name'),
    Phone: findCol(headers, 'Phone', 'Mobile'),
    Email: findCol(headers, 'Email', 'Mail'),
    Role: findCol(headers, 'Role'),
    PIN: findCol(headers, 'PIN', 'Password'),
    Address: findCol(headers, 'Address'),
    AvatarUrl: findCol(headers, 'AvatarUrl', 'Avatar', 'Photo', 'ProfilePicture', 'ImageUrl', 'Image'),
    Status: findCol(headers, 'Status'),
    UpdatedAt: findCol(headers, 'UpdatedAt', 'Updated')
  };

  const fullName = payload.fullName || payload.FullName;
  const newPhone = payload.phone || payload.Phone;
  const newEmail = payload.email || payload.Email;
  const role = payload.role || payload.Role;
  const pin = payload.pin || payload.PIN || payload.password;
  const address = payload.address || payload.Address;
  let avatarUrl = payload.avatarUrl || payload.AvatarUrl || payload.photoUrl;
  const status = payload.status || payload.Status;
  const now = new Date();

  // যদি নতুন ইমেজ বেইজ৬৪ পাঠানো হয় তবে গুগল ড্রাইভে আপলোড
  const imageBase64 = payload.imageBase64 || payload.avatarBase64;
  if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 50) {
    try {
      const driveRes = saveUserAvatarToDrive(spreadsheet, target.UserID || userId, fullName || target.FullName, imageBase64, payload.imageMimeType || payload.avatarMimeType);
      if (driveRes && driveRes.success && driveRes.url) {
        avatarUrl = driveRes.url;
      }
    } catch (e) {
      Logger.log('Avatar update upload error: ' + e.message);
    }
  }

  if (fullName !== undefined && colMap.FullName !== -1) usersSheet.getRange(target._rowIndex, colMap.FullName + 1).setValue(String(fullName).trim());
  if (newPhone !== undefined && colMap.Phone !== -1) usersSheet.getRange(target._rowIndex, colMap.Phone + 1).setValue(String(newPhone).trim());
  if (newEmail !== undefined && colMap.Email !== -1) usersSheet.getRange(target._rowIndex, colMap.Email + 1).setValue(String(newEmail).trim().toLowerCase());
  if (role !== undefined && colMap.Role !== -1) usersSheet.getRange(target._rowIndex, colMap.Role + 1).setValue(String(role).trim());
  if (pin !== undefined && String(pin).trim() && colMap.PIN !== -1) usersSheet.getRange(target._rowIndex, colMap.PIN + 1).setValue(String(pin).trim());
  if (address !== undefined && colMap.Address !== -1) usersSheet.getRange(target._rowIndex, colMap.Address + 1).setValue(String(address).trim());
  if (avatarUrl !== undefined && colMap.AvatarUrl !== -1) usersSheet.getRange(target._rowIndex, colMap.AvatarUrl + 1).setValue(String(avatarUrl).trim());
  if (status !== undefined && colMap.Status !== -1) usersSheet.getRange(target._rowIndex, colMap.Status + 1).setValue(String(status).trim());
  if (colMap.UpdatedAt !== -1) usersSheet.getRange(target._rowIndex, colMap.UpdatedAt + 1).setValue(now);

  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'ব্যবহারকারীর তথ্য সফলভাবে আপডেট করা হয়েছে।',
    data: {
      UserID: target.UserID || userId,
      FullName: fullName || target.FullName,
      Phone: newPhone || target.Phone,
      Email: newEmail || target.Email,
      Role: role || target.Role,
      Address: address !== undefined ? address : target.Address,
      AvatarUrl: formatGoogleDriveImageUrl(avatarUrl !== undefined ? avatarUrl : target.AvatarUrl),
      Status: status || target.Status,
      UpdatedAt: now.toISOString()
    }
  };
}

/**
 * ব্যবহারকারী মুছে ফেলা
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট
 * @param {Object} payload - ইউজার তথ্য
 * @return {Object} রেসপন্স
 */
function handleDeleteUser(spreadsheet, payload) {
  const usersSheet = ensureUsersSheet(spreadsheet);
  const userId = String(payload.userId || payload.UserID || '').trim();
  const phone = String(payload.phone || payload.Phone || '').trim();
  const email = String(payload.email || payload.Email || '').trim().toLowerCase();

  if (!userId && !phone && !email) {
    return { success: false, message: 'মুছে ফেলার জন্য UserID, মোবাইল বা ইমেইল দিন।' };
  }

  const usersData = getSheetRowsAsObjects(SHEETS.USERS);
  const target = usersData.find(u =>
    (userId && String(u.UserID || '').trim() === userId) ||
    (phone && String(u.Phone || '').trim() === phone) ||
    (email && String(u.Email || '').trim().toLowerCase() === email)
  );

  if (!target || !target._rowIndex) {
    return { success: false, message: 'ব্যবহারকারী ডাটাবেসে খুঁজে পাওয়া যায়নি।' };
  }

  usersSheet.deleteRow(target._rowIndex);
  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'ব্যবহারকারীকে সফলভাবে মুছে ফেলা হয়েছে।'
  };
}

/**
 * ব্যবহারকারী লগইন ভেরিফিকেশন হ্যান্ডলার
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট
 * @param {Object} payload - ক্রেডেনশিয়াল { identifier, pin, role }
 * @return {Object} রেসপন্স ও ইউজার অবজেক্ট
 */
function handleLoginUser(spreadsheet, payload) {
  ensureUsersSheet(spreadsheet);
  const identifier = String(payload.identifier || payload.Phone || payload.Email || '').trim().toLowerCase();
  const pin = String(payload.pin || payload.PIN || payload.password || '').trim();
  const requestedRole = payload.role || payload.Role;

  if (!identifier) {
    return { success: false, message: 'অনুগ্রহ করে মোবাইল নম্বর বা ইমেইল ঠিকানা দিন।' };
  }
  if (!pin) {
    return { success: false, message: 'অনুগ্রহ করে আপনার পিন বা পাসওয়ার্ড দিন।' };
  }

  const usersData = getSheetRowsAsObjects(SHEETS.USERS);
  const user = usersData.find(u => {
    const p = String(u.Phone || '').trim().toLowerCase();
    const e = String(u.Email || '').trim().toLowerCase();
    return p === identifier || e === identifier;
  });

  if (!user) {
    return {
      success: false,
      message: 'এই মোবাইল নম্বর বা ইমেইল দিয়ে কোনো ব্যবহারকারী পাওয়া যায়নি।'
    };
  }

  if (String(user.PIN || '').trim() !== pin) {
    return {
      success: false,
      message: 'ভুল পিন কোড বা পাসওয়ার্ড! অনুগ্রহ করে সঠিক তথ্য দিন।'
    };
  }

  if (user.Status && String(user.Status).trim().toLowerCase() === 'inactive') {
    return {
      success: false,
      message: 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় (Inactive) রয়েছে। এডমিনের সাথে যোগাযোগ করুন।'
    };
  }

  if (requestedRole && requestedRole !== 'All') {
    if (requestedRole === 'Admin' && user.Role !== 'Admin' && user.Role !== 'Cashier' && user.Role !== 'Manager' && user.Role !== 'Salesman' && user.Role !== 'Staff') {
      return {
        success: false,
        message: 'এই অ্যাকাউন্টে এডমিন বা স্টাফ প্যানেলে প্রবেশের অনুমতি নেই।'
      };
    }
  }

  return {
    success: true,
    message: `স্বাগতম, ${user.FullName || 'ইউজার'}! লগইন সফল হয়েছে।`,
    data: {
      UserID: user.UserID,
      FullName: user.FullName,
      Phone: user.Phone || '',
      Email: user.Email || '',
      Role: user.Role || 'Customer',
      PIN: user.PIN || '',
      Address: user.Address || '',
      AvatarUrl: formatGoogleDriveImageUrl(user.AvatarUrl || user.Avatar || user.Photo || user.ProfilePicture || ''),
      Status: user.Status || 'Active',
      CreatedAt: user.CreatedAt || '',
      UpdatedAt: user.UpdatedAt || ''
    }
  };
}


