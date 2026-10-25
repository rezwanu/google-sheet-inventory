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
  ORDERS: 'Orders',
  CUSTOMER_LEDGER: 'CustomerLedger',
  ABANDONED_CARTS: 'AbandonedCarts',
  SUPPLIERS: 'Suppliers',
  PURCHASE_ORDERS: 'PurchaseOrders',
  SUPPLIER_LEDGER: 'SupplierLedger',
  EXPENSES: 'Expenses',
  CASH_REGISTER: 'CashRegister',
  AUDIT_LOGS: 'AuditLogs',
  SALES_RETURNS: 'SalesReturns',
  STOCK_TRANSFERS: 'StockTransfers',
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
      if (rowObj.MinSellingPrice === undefined) {
        rowObj.MinSellingPrice = rowObj['Min Selling Price'] !== undefined ? rowObj['Min Selling Price'] : (rowObj.minSellingPrice !== undefined ? rowObj.minSellingPrice : (rowObj.FloorPrice !== undefined ? rowObj.FloorPrice : (rowObj.floorPrice !== undefined ? rowObj.floorPrice : (rowObj.MinPrice !== undefined ? rowObj.MinPrice : (rowObj.CostPrice !== undefined ? rowObj.CostPrice : 0)))));
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

      // Phase 6 ও 7 ভ্যারিয়েন্ট ও টেক্সটাইল ফিল্ড নর্মালাইজেশন
      if (!rowObj.VariantsJSON) {
        rowObj.VariantsJSON = rowObj.Variants || rowObj['Variants JSON'] || rowObj['variantsJSON'] || rowObj.variants || '';
      }
      if (rowObj.HasVariants === undefined) {
        rowObj.HasVariants = rowObj.HasVariant !== undefined ? rowObj.HasVariant : (rowObj['Has Variants'] !== undefined ? rowObj['Has Variants'] : (Boolean(rowObj.VariantsJSON) ? 'TRUE' : 'FALSE'));
      }
      if (rowObj.GodownStock === undefined) {
        rowObj.GodownStock = rowObj['Godown Stock'] !== undefined ? rowObj['Godown Stock'] : (rowObj.godownStock !== undefined ? rowObj.godownStock : (rowObj['Warehouse Stock'] !== undefined ? rowObj['Warehouse Stock'] : 0));
      }
      if (rowObj.WholesalePrice === undefined) {
        rowObj.WholesalePrice = rowObj['Wholesale Price'] !== undefined ? rowObj['Wholesale Price'] : (rowObj.wholesalePrice !== undefined ? rowObj.wholesalePrice : 0);
      }
      if (rowObj.TotalThan === undefined) {
        rowObj.TotalThan = rowObj['Total Than'] !== undefined ? rowObj['Total Than'] : (rowObj.ThanCount !== undefined ? rowObj.ThanCount : (rowObj['Than Count'] !== undefined ? rowObj['Than Count'] : 0));
      }
      if (rowObj.TotalGoj === undefined) {
        rowObj.TotalGoj = rowObj['Total Goj'] !== undefined ? rowObj['Total Goj'] : (rowObj.TotalYards !== undefined ? rowObj.TotalYards : (rowObj['Total Yards'] !== undefined ? rowObj['Total Yards'] : 0));
      }
      if (rowObj.YardsPerThan === undefined) {
        rowObj.YardsPerThan = rowObj['Yards Per Than'] !== undefined ? rowObj['Yards Per Than'] : (rowObj.yardsPerThan !== undefined ? rowObj.yardsPerThan : (rowObj.GojPerThan !== undefined ? rowObj.GojPerThan : 0));
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
    'TaxRatePercent', 'Address', 'Phone', 'Email', 'ReceiptFooter', 'ApiUrl', 'UpdatedAt',
    'SteadfastApiKey', 'SteadfastSecretKey', 'PathaoClientId', 'PathaoClientSecret', 'PathaoStoreId',
    'SmsProvider', 'SmsApiKey', 'SmsSenderId', 'SmsTemplateOrder', 'SmsTemplateCourier', 'SmsTemplateDelivered',
    'WhatsappEnabled', 'LoyaltyEnabled', 'LoyaltyPointsRate', 'LoyaltyRedeemRate', 'MinRedeemPoints',
    'StorefrontBannerText', 'StorefrontEnabled'
  ];

  if (settingsSheet.getLastRow() === 0) {
    settingsSheet.appendRow(defaultHeaders);
    return settingsSheet;
  }

  // হেডার কলাম পরীক্ষা করা এবং নতুন কলাম অনুপস্থিত থাকলে স্বয়ংক্রিয়ভাবে ডানপাশে যোগ করা
  const lastCol = settingsSheet.getLastColumn();
  if (lastCol > 0) {
    const headers = settingsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const missingHeaders = defaultHeaders.filter(h => findCol(headers, h) === -1);
    if (missingHeaders.length > 0) {
      for (let m = 0; m < missingHeaders.length; m++) {
        settingsSheet.getRange(1, lastCol + 1 + m).setValue(missingHeaders[m]);
      }
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
      'CustomerID', 'CustomerName', 'Phone', 'Email', 'Address', 'CustomerType',
      'TotalOrders', 'TotalSpent', 'CreditLimit', 'TotalPurchases', 'TotalPaid', 'CurrentDue', 'LastPaymentDate',
      'LoyaltyPoints', 'TotalPointsEarned', 'TotalPointsRedeemed', 'CustomerSegment', 'LastOrderDate',
      'Status', 'CreatedAt', 'UpdatedAt'
    ]);
  } else {
    // পূর্বে থাকা ডামি কাস্টমার ডাটা স্বয়ংক্রিয়ভাবে ক্লিন করা
    cleanDummyCustomersFromSheet(customersSheet);

    // মিসিং ক্রেডিট, বাকির এবং লয়ালটি কলাম স্বয়ংক্রিয়ভাবে ডানপাশে অ্যাপেন্ড করা (কোনো ডাটা ক্ষতিগ্রস্ত হবে না)
    const lastCol = customersSheet.getLastColumn();
    if (lastCol > 0) {
      const headers = customersSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      const requiredDueCols = [
        'CreditLimit', 'TotalPurchases', 'TotalPaid', 'CurrentDue', 'LastPaymentDate',
        'LoyaltyPoints', 'TotalPointsEarned', 'TotalPointsRedeemed', 'CustomerSegment', 'LastOrderDate'
      ];
      requiredDueCols.forEach(col => {
        if (findCol(headers, col) === -1) {
          customersSheet.getRange(1, customersSheet.getLastColumn() + 1).setValue(col);
        }
      });
    }
  }

  return customersSheet;
}

/**
 * CustomerLedger (বাকির খাতা ও পেমেন্ট ট্রানজেকশন অডিট) শিট নিশ্চিত করা
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} CustomerLedger শিট অবজেক্ট
 */
function ensureCustomerLedgerSheet(spreadsheet) {
  let ledgerSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.CUSTOMER_LEDGER);
  if (!ledgerSheet) {
    ledgerSheet = spreadsheet.insertSheet(SHEETS.CUSTOMER_LEDGER);
  }

  if (ledgerSheet.getLastRow() === 0) {
    ledgerSheet.appendRow([
      'LedgerID', 'Timestamp', 'CustomerID', 'CustomerName', 'CustomerPhone',
      'OrderID', 'InvoiceNo', 'EntryType', 'Debit', 'Credit', 'Balance',
      'PaymentMethod', 'TrxID', 'CollectedBy', 'Notes'
    ]);
  } else {
    const lastCol = ledgerSheet.getLastColumn();
    if (lastCol > 0) {
      const headers = ledgerSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      const requiredLedgerCols = [
        'LedgerID', 'Timestamp', 'CustomerID', 'CustomerName', 'CustomerPhone',
        'OrderID', 'InvoiceNo', 'EntryType', 'Debit', 'Credit', 'Balance',
        'PaymentMethod', 'TrxID', 'CollectedBy', 'Notes'
      ];
      requiredLedgerCols.forEach(col => {
        if (findCol(headers, col) === -1) {
          ledgerSheet.getRange(1, ledgerSheet.getLastColumn() + 1).setValue(col);
        }
      });
    }
  }

  return ledgerSheet;
}

/**
 * AbandonedCarts (ড্রপ-অফ ও অসম্পূর্ণ কার্ট ডাটাবেস) শিট নিশ্চিত করা
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} AbandonedCarts শিট অবজেক্ট
 */
function ensureAbandonedCartsSheet(spreadsheet) {
  let cartsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.ABANDONED_CARTS);
  if (!cartsSheet) {
    cartsSheet = spreadsheet.insertSheet(SHEETS.ABANDONED_CARTS);
  }

  if (cartsSheet.getLastRow() === 0) {
    cartsSheet.appendRow([
      'CartID', 'Timestamp', 'CustomerPhone', 'CustomerName', 'CustomerEmail', 'CustomerAddress',
      'CartItemsJSON', 'TotalAmount', 'RecoveryStatus', 'LastContactedAt', 'Notes'
    ]);
  } else {
    const lastCol = cartsSheet.getLastColumn();
    if (lastCol > 0) {
      const headers = cartsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      const requiredCartCols = [
        'CartID', 'Timestamp', 'CustomerPhone', 'CustomerName', 'CustomerEmail', 'CustomerAddress',
        'CartItemsJSON', 'TotalAmount', 'RecoveryStatus', 'LastContactedAt', 'Notes'
      ];
      requiredCartCols.forEach(col => {
        if (findCol(headers, col) === -1) {
          cartsSheet.getRange(1, cartsSheet.getLastColumn() + 1).setValue(col);
        }
      });
    }
  }

  return cartsSheet;
}

/**
 * Suppliers (সাপ্লায়ার ও ভেন্ডর ডাটাবেস) শিট নিশ্চিত করা
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} Suppliers শিট অবজেক্ট
 */
function ensureSuppliersSheet(spreadsheet) {
  let suppliersSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.SUPPLIERS);
  if (!suppliersSheet) {
    suppliersSheet = spreadsheet.insertSheet(SHEETS.SUPPLIERS);
  }

  const defaultHeaders = [
    'SupplierID', 'CompanyName', 'ContactPerson', 'Phone', 'Email',
    'Address', 'TotalPurchased', 'TotalPaid', 'CurrentPayable', 'Notes', 'CreatedAt', 'UpdatedAt'
  ];

  if (suppliersSheet.getLastRow() === 0) {
    suppliersSheet.appendRow(defaultHeaders);
  } else {
    const lastCol = suppliersSheet.getLastColumn();
    if (lastCol > 0) {
      const headers = suppliersSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      defaultHeaders.forEach(col => {
        if (findCol(headers, col) === -1) {
          suppliersSheet.getRange(1, suppliersSheet.getLastColumn() + 1).setValue(col);
        }
      });
    }
  }

  return suppliersSheet;
}

/**
 * PurchaseOrders (পারচেজ অর্ডার ও ইনবাউন্ড প্রকিউরমেন্ট ডাটাবেস) শিট নিশ্চিত করা
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} PurchaseOrders শিট অবজেক্ট
 */
function ensurePurchaseOrdersSheet(spreadsheet) {
  let poSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.PURCHASE_ORDERS);
  if (!poSheet) {
    poSheet = spreadsheet.insertSheet(SHEETS.PURCHASE_ORDERS);
  }

  const defaultHeaders = [
    'PO_ID', 'Timestamp', 'SupplierID', 'SupplierName', 'SupplierPhone',
    'ItemsJSON', 'TotalAmount', 'PaidAmount', 'DueAmount', 'PaymentMethod',
    'Status', 'ReceivedBy', 'ReceivedAt', 'Notes', 'CreatedAt', 'UpdatedAt'
  ];

  if (poSheet.getLastRow() === 0) {
    poSheet.appendRow(defaultHeaders);
  } else {
    const lastCol = poSheet.getLastColumn();
    if (lastCol > 0) {
      const headers = poSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      defaultHeaders.forEach(col => {
        if (findCol(headers, col) === -1) {
          poSheet.getRange(1, poSheet.getLastColumn() + 1).setValue(col);
        }
      });
    }
  }

  return poSheet;
}

/**
 * SupplierLedger (সাপ্লায়ার দেনার খাতা ও লেনদেন অডিট) শিট নিশ্চিত করা
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} SupplierLedger শিট অবজেক্ট
 */
function ensureSupplierLedgerSheet(spreadsheet) {
  let ledgerSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.SUPPLIER_LEDGER);
  if (!ledgerSheet) {
    ledgerSheet = spreadsheet.insertSheet(SHEETS.SUPPLIER_LEDGER);
  }

  const defaultHeaders = [
    'LedgerID', 'Timestamp', 'SupplierID', 'SupplierName', 'SupplierPhone',
    'PO_ID', 'EntryType', 'Debit', 'Credit', 'Balance', 'PaymentMethod',
    'TrxID', 'CollectedBy', 'Notes'
  ];

  if (ledgerSheet.getLastRow() === 0) {
    ledgerSheet.appendRow(defaultHeaders);
  } else {
    const lastCol = ledgerSheet.getLastColumn();
    if (lastCol > 0) {
      const headers = ledgerSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      defaultHeaders.forEach(col => {
        if (findCol(headers, col) === -1) {
          ledgerSheet.getRange(1, ledgerSheet.getLastColumn() + 1).setValue(col);
        }
      });
    }
  }

  return ledgerSheet;
}

/**
 * Expenses (দোকানের দৈনন্দিন খরচ ও ভাউচার খাতা) শিট নিশ্চিত করা
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} Expenses শিট অবজেক্ট
 */
function ensureExpensesSheet(spreadsheet) {
  let expensesSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.EXPENSES);
  if (!expensesSheet) {
    expensesSheet = spreadsheet.insertSheet(SHEETS.EXPENSES);
  }

  const defaultHeaders = [
    'ExpenseID', 'Date', 'Category', 'Amount', 'PaymentMethod',
    'Description', 'ReceiptImage', 'CreatedBy', 'Timestamp'
  ];

  if (expensesSheet.getLastRow() === 0) {
    expensesSheet.appendRow(defaultHeaders);
  } else {
    const lastCol = expensesSheet.getLastColumn();
    if (lastCol > 0) {
      const headers = expensesSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      defaultHeaders.forEach(col => {
        if (findCol(headers, col) === -1) {
          expensesSheet.getRange(1, expensesSheet.getLastColumn() + 1).setValue(col);
        }
      });
    }
  }

  return expensesSheet;
}

/**
 * CashRegister (দৈনিক ক্যাশ ড্রয়ার ও ইওডি সেশন) শিট নিশ্চিত করা
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} CashRegister শিট অবজেক্ট
 */
function ensureCashRegisterSheet(spreadsheet) {
  let registerSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.CASH_REGISTER);
  if (!registerSheet) {
    registerSheet = spreadsheet.insertSheet(SHEETS.CASH_REGISTER);
  }

  const defaultHeaders = [
    'RegisterID', 'OpeningDate', 'ClosingDate', 'OpeningBalance',
    'CashSales', 'CashIn', 'CashOut', 'ExpectedCash', 'ActualCash',
    'Difference', 'Status', 'ClosedBy', 'Notes', 'Timestamp'
  ];

  if (registerSheet.getLastRow() === 0) {
    registerSheet.appendRow(defaultHeaders);
  } else {
    const lastCol = registerSheet.getLastColumn();
    if (lastCol > 0) {
      const headers = registerSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      defaultHeaders.forEach(col => {
        if (findCol(headers, col) === -1) {
          registerSheet.getRange(1, registerSheet.getLastColumn() + 1).setValue(col);
        }
      });
    }
  }

  return registerSheet;
}

/**
 * AuditLogs (ইউজার অ্যাক্টিভিটি ও সিকিউরিটি অডিট ট্রেইল) শিট নিশ্চিত করা
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} AuditLogs শিট অবজেক্ট
 */
function ensureAuditLogsSheet(spreadsheet) {
  let auditSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.AUDIT_LOGS);
  if (!auditSheet) {
    auditSheet = spreadsheet.insertSheet(SHEETS.AUDIT_LOGS);
  }

  const defaultHeaders = [
    'LogID', 'Timestamp', 'UserID', 'UserName', 'UserRole',
    'ActionType', 'Module', 'Description', 'DetailsJson'
  ];

  if (auditSheet.getLastRow() === 0) {
    auditSheet.appendRow(defaultHeaders);
  } else {
    const lastCol = auditSheet.getLastColumn();
    if (lastCol > 0) {
      const headers = auditSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      defaultHeaders.forEach(col => {
        if (findCol(headers, col) === -1) {
          auditSheet.getRange(1, auditSheet.getLastColumn() + 1).setValue(col);
        }
      });
    }
  }

  return auditSheet;
}

/**
 * SalesReturns (সেলস রিটার্ন, পণ্য বিনিময় ও স্টোর ক্রেডিট) শিট নিশ্চিত করা
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} SalesReturns শিট অবজেক্ট
 */
function ensureSalesReturnsSheet(spreadsheet) {
  let returnsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.SALES_RETURNS);
  if (!returnsSheet) {
    returnsSheet = spreadsheet.insertSheet(SHEETS.SALES_RETURNS);
  }

  const defaultHeaders = [
    'ReturnID', 'InvoiceNo', 'ReturnDate', 'CustomerID', 'CustomerName', 'CustomerPhone',
    'ItemsJSON', 'TotalRefundAmount', 'RefundMethod', 'CreditNoteCode', 'CreditNoteExpiry',
    'CreditNoteStatus', 'Restocked', 'Reason', 'ProcessedBy', 'CreatedAt'
  ];

  if (returnsSheet.getLastRow() === 0) {
    returnsSheet.appendRow(defaultHeaders);
  } else {
    const lastCol = returnsSheet.getLastColumn();
    if (lastCol > 0) {
      const headers = returnsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      defaultHeaders.forEach(col => {
        if (findCol(headers, col) === -1) {
          returnsSheet.getRange(1, returnsSheet.getLastColumn() + 1).setValue(col);
        }
      });
    }
  }

  return returnsSheet;
}

/**
 * StockTransfers (গোডাউন ও দোকান স্টক ট্রান্সফার চালান) শিট নিশ্চিত করা
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @return {Sheet} StockTransfers শিট অবজেক্ট
 */
function ensureStockTransfersSheet(spreadsheet) {
  let transferSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.STOCK_TRANSFERS);
  if (!transferSheet) {
    transferSheet = spreadsheet.insertSheet(SHEETS.STOCK_TRANSFERS);
  }

  const defaultHeaders = [
    'TransferID', 'ChallanNo', 'TransferDate', 'FromLocation', 'ToLocation',
    'ItemsJSON', 'TotalItems', 'TotalQuantity', 'Status', 'DriverName', 'Notes',
    'CreatedBy', 'ReceivedBy', 'CreatedAt', 'UpdatedAt'
  ];

  if (transferSheet.getLastRow() === 0) {
    transferSheet.appendRow(defaultHeaders);
  } else {
    const lastCol = transferSheet.getLastColumn();
    if (lastCol > 0) {
      const headers = transferSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      defaultHeaders.forEach(col => {
        if (findCol(headers, col) === -1) {
          transferSheet.getRange(1, transferSheet.getLastColumn() + 1).setValue(col);
        }
      });
    }
  }

  return transferSheet;
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
 * Variants (ভ্যারিয়েন্ট ডাটাবেস) শিট নিশ্চিত করা (না থাকলে তৈরি এবং প্রয়োজনীয় রঙ, সাইজ ও ওজন যুক্ত করা)
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
      'CostPrice', 'WholesalePrice', 'MinSellingPrice', 'SellingPrice', 'StockQuantity', 'GodownStock', 'MinStockAlert', 
      'Unit', 'YardsPerThan', 'ThanCount', 'TotalYards', 'ImageUrl', 'ImageCaption', 'ShortDescription', 'Description', 'Features', 
      'CreatedAt', 'UpdatedAt',
      'HasVariants', 'VariantsJSON', 'BatchNumber', 'ExpiryDate', 'MfgDate', 'IsBundle', 'BundleItemsJSON'
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

  // ২.০ WholesalePrice কলাম যুক্ত করা (পাইকারি বিক্রয়মূল্য)
  if (findCol(headers, 'WholesalePrice', 'Wholesale', 'DealerPrice') === -1) {
    const costIndex = findCol(headers, 'CostPrice', 'Cost', 'BuyPrice');
    if (costIndex !== -1) {
      productsSheet.insertColumnAfter(costIndex + 1);
      productsSheet.getRange(1, costIndex + 2).setValue('WholesalePrice');
    } else {
      productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('WholesalePrice');
    }
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ২.১ MinSellingPrice কলাম যুক্ত করা (যদি না থাকে - দামাদামির ফ্লোর প্রাইস)
  if (findCol(headers, 'MinSellingPrice', 'FloorPrice', 'MinPrice') === -1) {
    const costIndex = findCol(headers, 'CostPrice', 'Cost', 'BuyPrice');
    if (costIndex !== -1) {
      productsSheet.insertColumnAfter(costIndex + 1);
      productsSheet.getRange(1, costIndex + 2).setValue('MinSellingPrice');
    } else {
      productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('MinSellingPrice');
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

  // ৪.১ GodownStock কলাম যুক্ত করা (গোডাউন মজুদ স্টক)
  if (findCol(headers, 'GodownStock', 'WarehouseStock', 'GodownQty') === -1) {
    const stockIndex = findCol(headers, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity', 'Qty');
    if (stockIndex !== -1) {
      productsSheet.insertColumnAfter(stockIndex + 1);
      productsSheet.getRange(1, stockIndex + 2).setValue('GodownStock');
    } else {
      productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('GodownStock');
    }
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ৫. MinStockAlert কলাম যুক্ত করা (যদি না থাকে)
  if (findCol(headers, 'MinStockAlert', 'MinStockAler', 'MinStock', 'Alert') === -1) {
    const stockIndex = findCol(headers, 'GodownStock', 'StockQuantity', 'Stock', 'Quantity');
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

  // ৬.১ YardsPerThan কলাম যুক্ত করা (প্রতি থানে কত গজ)
  if (findCol(headers, 'YardsPerThan', 'GojPerThan', 'YardsThan') === -1) {
    const unitIndex = findCol(headers, 'Unit', 'UOM');
    if (unitIndex !== -1) {
      productsSheet.insertColumnAfter(unitIndex + 1);
      productsSheet.getRange(1, unitIndex + 2).setValue('YardsPerThan');
    } else {
      productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('YardsPerThan');
    }
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ৬.২ ThanCount কলাম যুক্ত করা (মোট থান সংখ্যা)
  if (findCol(headers, 'ThanCount', 'TotalThan', 'ThanQty') === -1) {
    const yptIndex = findCol(headers, 'YardsPerThan', 'GojPerThan', 'YardsThan');
    if (yptIndex !== -1) {
      productsSheet.insertColumnAfter(yptIndex + 1);
      productsSheet.getRange(1, yptIndex + 2).setValue('ThanCount');
    } else {
      productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('ThanCount');
    }
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ৬.৩ TotalYards কলাম যুক্ত করা (মোট গজ)
  if (findCol(headers, 'TotalYards', 'TotalGoj', 'GojCount') === -1) {
    const thanIndex = findCol(headers, 'ThanCount', 'TotalThan', 'ThanQty');
    if (thanIndex !== -1) {
      productsSheet.insertColumnAfter(thanIndex + 1);
      productsSheet.getRange(1, thanIndex + 2).setValue('TotalYards');
    } else {
      productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('TotalYards');
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

  // ১৩. HasVariants কলাম যুক্ত করা (যদি না থাকে - ভ্যারিয়েন্ট ট্র্যাকিং)
  if (findCol(headers, 'HasVariants', 'HasVariant') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('HasVariants');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১৪. VariantsJSON কলাম যুক্ত করা (যদি না থাকে - সাইজ, রঙ, ওজন ভ্যারিয়েন্ট বিস্তারিত)
  if (findCol(headers, 'VariantsJSON', 'Variants') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('VariantsJSON');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১৫. BatchNumber কলাম যুক্ত করা (যদি না থাকে - ব্যাচ ট্র্যাকিং)
  if (findCol(headers, 'BatchNumber', 'BatchNo', 'Batch') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('BatchNumber');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১৬. ExpiryDate কলাম যুক্ত করা (যদি না থাকে - মেয়াদোত্তীর্ণ সতর্কতা)
  if (findCol(headers, 'ExpiryDate', 'ExpDate', 'Expiry') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('ExpiryDate');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১৭. MfgDate কলাম যুক্ত করা (যদি না থাকে - উৎপাদন তারিখ)
  if (findCol(headers, 'MfgDate', 'ManufactureDate', 'Mfg') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('MfgDate');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১৮. IsBundle কলাম যুক্ত করা (যদি না থাকে - কম্বো ও বান্ডেল অফার)
  if (findCol(headers, 'IsBundle', 'Bundle', 'IsCombo') === -1) {
    productsSheet.getRange(1, productsSheet.getLastColumn() + 1).setValue('IsBundle');
    headers = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
  }

  // ১৯. BundleItemsJSON কলাম যুক্ত করা (যদি না থাকে - কম্বো প্যাকেজের সাব-আইটেম তালিকা)
  if (findCol(headers, 'BundleItemsJSON', 'BundleItems', 'ComboItems') === -1) {
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

  // ২.২.১ Variants (ভ্যারিয়েন্ট ডাটাবেস) শিট নিশ্চিত করা
  ensureVariantsSheet(spreadsheet);

  // ২.৩ Users (ব্যবহারকারী ও স্টাফ ডাটাবেস) শিট নিশ্চিত করা
  ensureUsersSheet(spreadsheet);

  // ২.৪ CustomerLedger (বাকির খাতা ও লেনদেন) শিট নিশ্চিত করা
  ensureCustomerLedgerSheet(spreadsheet);

  // ২.৫ AbandonedCarts (অসম্পূর্ণ কার্ট ও ড্রপ-অফ ডাটাবেস) শিট নিশ্চিত করা
  ensureAbandonedCartsSheet(spreadsheet);

  // ২.৬ Suppliers (সাপ্লায়ার ও ভেন্ডর ডাটাবেস) শিট নিশ্চিত করা
  ensureSuppliersSheet(spreadsheet);

  // ২.৭ PurchaseOrders (পারচেজ অর্ডার ও ইনবাউন্ড প্রকিউরমেন্ট) শিট নিশ্চিত করা
  ensurePurchaseOrdersSheet(spreadsheet);

  // ২.৮ SupplierLedger (সাপ্লায়ার দেনার খাতা ও লেজার) শিট নিশ্চিত করা
  ensureSupplierLedgerSheet(spreadsheet);

  // ২.৯ Expenses (দোকানের দৈনন্দিন খরচ ও ভাউচার খাতা) শিট নিশ্চিত করা
  ensureExpensesSheet(spreadsheet);

  // ২.১০ CashRegister (দৈনিক ক্যাশ ড্রয়ার ও ইওডি সেশন) শিট নিশ্চিত করা
  ensureCashRegisterSheet(spreadsheet);

  // ২.১১ AuditLogs (অ্যাক্টিভিটি ও সিকিউরিটি অডিট ট্রেইল) শিট নিশ্চিত করা
  ensureAuditLogsSheet(spreadsheet);

  // ২.১২ SalesReturns (সেলস রিটার্ন ও স্টোর ক্রেডিট) শিট নিশ্চিত করা
  ensureSalesReturnsSheet(spreadsheet);

  // ২.১৩ StockTransfers (গোডাউন ও দোকান স্টক ট্রান্সফার চালান) শিট নিশ্চিত করা
  ensureStockTransfersSheet(spreadsheet);

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

  // ৯. Variants (ভ্যারিয়েন্ট ডাটাবেস) শিট তৈরি ও ইনিশিয়ালাইজেশন
  ensureVariantsSheet(spreadsheet);

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
    notes,
    location,
    updatedVariants,
    variants,
    isThanUnit,
    incomingThans,
    incomingYards
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

  const targetLocation = String(location || 'Godown').toLowerCase() === 'shop' ? 'Shop' : 'Godown';

  const previousShopStock = Number(product.StockQuantity) || 0;
  const previousGodownStock = Number(product.GodownStock !== undefined ? product.GodownStock : 0);
  const previousStock = targetLocation === 'Godown' ? previousGodownStock : previousShopStock;

  const incomingNumber = Number(incomingQty);
  const newStock = previousStock + incomingNumber;

  const currentCost = Number(product.CostPrice) || 0;
  const newUnitCost = (unitCost !== undefined && unitCost !== null && unitCost !== '') 
                      ? Number(unitCost) 
                      : currentCost;

  // ওয়েইটেড এভারেজ কস্ট (Weighted Average Cost) ক্যালকুলেশন:
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
  let godownColIdx = findCol(headers, 'GodownStock', 'WarehouseStock', 'GodownQty');
  let variantsColIdx = findCol(headers, 'VariantsJSON', 'Variants');
  let thanColIdx = findCol(headers, 'ThanCount', 'TotalThan', 'ThanQuantity');
  let yardsColIdx = findCol(headers, 'TotalYards', 'TotalGoj', 'YardsTotal');

  let updatedColIdx = findCol(headers, 'UpdatedAt', 'Updated');
  if (updatedColIdx === -1) {
    updatedColIdx = headers.findIndex(h => /update/i.test(String(h || '').trim()));
  }

  if (costColIdx !== -1) {
    productsSheet.getRange(rowIndex, costColIdx + 1).setValue(weightedAverageCost);
  }

  // লোকেশন অনুযায়ী স্টক আপডেট
  if (targetLocation === 'Godown') {
    if (godownColIdx !== -1) {
      productsSheet.getRange(rowIndex, godownColIdx + 1).setValue(newStock);
    }
  } else {
    if (stockColIdx !== -1) {
      productsSheet.getRange(rowIndex, stockColIdx + 1).setValue(newStock);
    }
  }

  // ভ্যারিয়েন্ট আপডেট
  const finalVariants = updatedVariants || variants;
  if (finalVariants && variantsColIdx !== -1) {
    const jsonStr = typeof finalVariants === 'string' ? finalVariants : JSON.stringify(finalVariants);
    productsSheet.getRange(rowIndex, variantsColIdx + 1).setValue(jsonStr);
    const hasVariantsColIdx = findCol(headers, 'HasVariants', 'HasVariant');
    if (hasVariantsColIdx !== -1) {
      productsSheet.getRange(rowIndex, hasVariantsColIdx + 1).setValue('TRUE');
    }
  }

  // থান ও গজ আপডেট
  if (isThanUnit || incomingThans) {
    const curThans = Number(product.ThanCount || product.TotalThan || 0);
    const addedThans = Number(incomingThans) || incomingNumber;
    if (thanColIdx !== -1) {
      productsSheet.getRange(rowIndex, thanColIdx + 1).setValue(curThans + addedThans);
    }
    if (incomingYards && yardsColIdx !== -1) {
      const curYards = Number(product.TotalYards || product.TotalGoj || 0);
      productsSheet.getRange(rowIndex, yardsColIdx + 1).setValue(curYards + Number(incomingYards));
    }
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
    `[${targetLocation === 'Godown' ? 'গোডাউন' : 'দোকান'}] ${notes || 'নতুন স্টক ইনপুট'}`
  ]);

  // অবিলম্বে গুগল শিটে সমস্ত ডাটা ফ্লাশ ও নিশ্চিত করা
  SpreadsheetApp.flush();

  return {
    success: true,
    message: `${targetLocation === 'Godown' ? 'গোডাউনে' : 'দোকানে'} নতুন স্টক সফলভাবে যোগ ও রেকর্ড করা হয়েছে।`,
    data: {
      productId: product.ProductID,
      productName: product.ProductName,
      location: targetLocation,
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
      total: itemTotal,
      variantId: item.variantId || '',
      variantName: item.variantName || '',
      isBundle: Boolean(item.isBundle || String(product.IsBundle || '').toLowerCase() === 'true')
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

    // ৪. ভ্যারিয়েন্ট স্টক কর্তন (যদি নির্দিষ্ট ভ্যারিয়েন্ট বিক্রি হয়)
    const variantsColIdx = findCol(prodHeaders, 'VariantsJSON', 'Variants');
    if (variantsColIdx !== -1 && vItem.variantId) {
      try {
        const rawVariants = productsSheet.getRange(rowIndex, variantsColIdx + 1).getValue();
        if (rawVariants) {
          const parsed = typeof rawVariants === 'string' ? JSON.parse(rawVariants) : rawVariants;
          if (Array.isArray(parsed)) {
            const vIndex = parsed.findIndex(v => String(v.VariantID || v.variantId || '').trim() === String(vItem.variantId).trim());
            if (vIndex !== -1) {
              const prevVStock = Number(parsed[vIndex].StockQuantity) || 0;
              parsed[vIndex].StockQuantity = Math.max(0, prevVStock - vItem.quantity);
              productsSheet.getRange(rowIndex, variantsColIdx + 1).setValue(JSON.stringify(parsed));
            }
          }
        }
      } catch (vErr) {
        Logger.log('Variant stock update soft error: ' + vErr.toString());
      }
    }

    // ৫. কম্বো বান্ডেল সাব-আইটেম স্টক কর্তন
    const isBundleVal = vItem.isBundle || String(vItem.productObj.IsBundle || '').toLowerCase() === 'true';
    const bundleItemsColIdx = findCol(prodHeaders, 'BundleItemsJSON', 'BundleItems', 'ComboItems');
    if (isBundleVal && bundleItemsColIdx !== -1) {
      try {
        const rawBundleItems = productsSheet.getRange(rowIndex, bundleItemsColIdx + 1).getValue();
        if (rawBundleItems) {
          const parsedBundle = typeof rawBundleItems === 'string' ? JSON.parse(rawBundleItems) : rawBundleItems;
          if (Array.isArray(parsedBundle)) {
            parsedBundle.forEach(subItem => {
              const subProd = products.find(p => p.ProductID == subItem.ProductID || p.ProductID == subItem.productId);
              if (subProd && subProd._rowIndex) {
                const subPrevStock = Number(subProd.StockQuantity) || 0;
                const subDeductQty = (Number(subItem.Quantity) || 1) * vItem.quantity;
                const subNewStock = Math.max(0, subPrevStock - subDeductQty);
                if (stockColIdx !== -1) {
                  productsSheet.getRange(subProd._rowIndex, stockColIdx + 1).setValue(subNewStock);
                }
                const bLogId = generateUniqueId('STKLOG');
                stockLogsSheet.appendRow([
                  bLogId,
                  timestamp,
                  subProd.ProductID,
                  subProd.ProductName,
                  'STOCK_OUT_BUNDLE',
                  subPrevStock,
                  -subDeductQty,
                  subNewStock,
                  Number(subProd.CostPrice) || 0,
                  `Bundle Component (${vItem.productName})`,
                  cashierEmail || 'POS Cashier',
                  invoiceNo,
                  `কম্বো প্যাকেজ বিক্রয়: ${vItem.productName}`
                ]);
              }
            });
          }
        }
      } catch (bErr) {
        Logger.log('Bundle sub-item deduction soft error: ' + bErr.toString());
      }
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
  const itemsSummaryText = validatedItems.map(i => `${i.productName}${i.variantName ? ' (' + i.variantName + ')' : ''} (x${i.quantity})`).join(', ');
  const itemsJsonString = JSON.stringify(validatedItems.map(i => ({
    productId: i.productId,
    productName: i.productName,
    quantity: i.quantity,
    sellingPrice: i.sellingPrice,
    costPrice: i.costPrice,
    total: i.total,
    variantId: i.variantId || '',
    variantName: i.variantName || '',
    isBundle: Boolean(i.isBundle)
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

      const loyaltyEarned = Number(payload.loyaltyEarned) || 0;
      const loyaltyRedeemed = Number(payload.loyaltyRedeemed) || 0;
      const ptsCol = findCol(custHeaders, 'LoyaltyPoints', 'Points');
      const earnedCol = findCol(custHeaders, 'TotalPointsEarned', 'PointsEarned');
      const redeemedCol = findCol(custHeaders, 'TotalPointsRedeemed', 'PointsRedeemed');
      const segCol = findCol(custHeaders, 'CustomerSegment', 'Segment');
      const lastOrderCol = findCol(custHeaders, 'LastOrderDate', 'LastOrder');

      if (existingCust && existingCust._rowIndex) {
        // বিদ্যমান কাস্টমার আপডেট (মোট অর্ডার ও স্পেন্ট বৃদ্ধি)
        const prevOrders = Number(existingCust.TotalOrders) || 0;
        const prevSpent = Number(existingCust.TotalSpent) || 0;
        const newOrders = prevOrders + 1;
        const newSpent = prevSpent + grandTotal;
        
        if (colMap.TotalOrders !== -1) customersSheet.getRange(existingCust._rowIndex, colMap.TotalOrders + 1).setValue(newOrders);
        if (colMap.TotalSpent !== -1) customersSheet.getRange(existingCust._rowIndex, colMap.TotalSpent + 1).setValue(newSpent);
        if (cAddress && colMap.Address !== -1 && !existingCust.Address) customersSheet.getRange(existingCust._rowIndex, colMap.Address + 1).setValue(cAddress);
        if (cEmail && colMap.Email !== -1 && !existingCust.Email) customersSheet.getRange(existingCust._rowIndex, colMap.Email + 1).setValue(cEmail);

        // লয়ালটি পয়েন্ট হিসাব ও সংরক্ষণ
        const curPoints = Number(existingCust.LoyaltyPoints || 0);
        const curEarned = Number(existingCust.TotalPointsEarned || 0);
        const curRedeemed = Number(existingCust.TotalPointsRedeemed || 0);
        const newPoints = Math.max(0, curPoints + loyaltyEarned - loyaltyRedeemed);
        const newTotalEarned = curEarned + loyaltyEarned;
        const newTotalRedeemed = curRedeemed + loyaltyRedeemed;

        if (ptsCol !== -1) customersSheet.getRange(existingCust._rowIndex, ptsCol + 1).setValue(newPoints);
        if (earnedCol !== -1) customersSheet.getRange(existingCust._rowIndex, earnedCol + 1).setValue(newTotalEarned);
        if (redeemedCol !== -1) customersSheet.getRange(existingCust._rowIndex, redeemedCol + 1).setValue(newTotalRedeemed);
        if (lastOrderCol !== -1) customersSheet.getRange(existingCust._rowIndex, lastOrderCol + 1).setValue(timestamp);

        // RFM সেগমেন্ট শ্রেণীকরণ
        let segment = 'Regular';
        if (newSpent >= 10000 || newOrders >= 5) {
          segment = 'VIP';
        } else if (newOrders <= 1) {
          segment = 'New';
        }
        if (segCol !== -1) customersSheet.getRange(existingCust._rowIndex, segCol + 1).setValue(segment);

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

        if (ptsCol !== -1) newRow[ptsCol] = Math.max(0, loyaltyEarned - loyaltyRedeemed);
        if (earnedCol !== -1) newRow[earnedCol] = loyaltyEarned;
        if (redeemedCol !== -1) newRow[redeemedCol] = loyaltyRedeemed;
        if (segCol !== -1) newRow[segCol] = 'New';
        if (lastOrderCol !== -1) newRow[lastOrderCol] = timestamp;

        customersSheet.appendRow(newRow);
      }
    } catch (custErr) {
      Logger.log('Customer sync soft error: ' + custErr.toString());
    }
  }

  // ৬. যদি কোনো অসম্পূর্ণ কার্ট (Abandoned Cart) থেকে এই সেলস কনভার্ট হয়ে থাকে, কার্টটি Recovered চিহ্নিত করা
  const cartId = String(payload.cartId || payload.CartID || '').trim();
  if (cartId) {
    try {
      handleUpdateAbandonedCartStatus(spreadsheet, {
        cartId: cartId,
        status: 'Recovered',
        notes: `অর্ডার ${invoiceNo || saleId} হিসেবে রিকভার্ড হয়েছে।`
      });
    } catch (cartErr) {
      Logger.log('Abandoned cart mark recovered error: ' + cartErr.toString());
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
    const wholesalePrice = payload.wholesalePrice !== undefined ? payload.wholesalePrice : (payload.WholesalePrice !== undefined ? payload.WholesalePrice : 0);
    const minSellingPrice = payload.minSellingPrice !== undefined ? payload.minSellingPrice : (payload.MinSellingPrice !== undefined ? payload.MinSellingPrice : (payload.FloorPrice !== undefined ? payload.FloorPrice : costPrice));
    const sellingPrice = payload.sellingPrice !== undefined ? payload.sellingPrice : (payload.SellingPrice !== undefined ? payload.SellingPrice : 0);
    const initialStock = payload.initialStock !== undefined ? payload.initialStock : (payload.stockQuantity !== undefined ? payload.stockQuantity : (payload.StockQuantity !== undefined ? payload.StockQuantity : 0));
    const godownStock = payload.godownStock !== undefined ? payload.godownStock : (payload.GodownStock !== undefined ? payload.GodownStock : (payload.initialGodownStock !== undefined ? payload.initialGodownStock : 0));
    const minStockAlert = payload.minStockAlert !== undefined ? payload.minStockAlert : (payload.MinStockAlert !== undefined ? payload.MinStockAlert : 5);
    const unit = payload.unit || payload.Unit || 'Pcs';
    const yardsPerThan = payload.yardsPerThan !== undefined ? payload.yardsPerThan : (payload.YardsPerThan !== undefined ? payload.YardsPerThan : 0);
    const thanCount = payload.thanCount !== undefined ? payload.thanCount : (payload.ThanCount !== undefined ? payload.ThanCount : (payload.initialGodownStock !== undefined ? payload.initialGodownStock : 0));
    const totalYards = payload.totalYards !== undefined ? payload.totalYards : (payload.TotalYards !== undefined ? payload.TotalYards : ((Number(thanCount) || 0) * (Number(yardsPerThan) || 0)));
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

    // Phase 6: ভ্যারিয়েন্ট, ব্যাচ, মেয়াদ ও কম্বো বান্ডেল ডাটা সংগ্রহ
    const hasVariants = payload.hasVariants === true || payload.HasVariants === true || String(payload.hasVariants || '').toLowerCase() === 'true';
    let variantsJSON = payload.variantsJSON || payload.VariantsJSON || payload.variants || payload.Variants || '';
    if (typeof variantsJSON === 'object') {
      try { variantsJSON = JSON.stringify(variantsJSON); } catch (e) { variantsJSON = ''; }
    }
    const batchNumber = String(payload.batchNumber || payload.BatchNumber || '').trim();
    const expiryDate = String(payload.expiryDate || payload.ExpiryDate || '').trim();
    const mfgDate = String(payload.mfgDate || payload.MfgDate || '').trim();
    const isBundle = payload.isBundle === true || payload.IsBundle === true || String(payload.isBundle || '').toLowerCase() === 'true';
    let bundleItemsJSON = payload.bundleItemsJSON || payload.BundleItemsJSON || payload.bundleItems || payload.BundleItems || '';
    if (typeof bundleItemsJSON === 'object') {
      try { bundleItemsJSON = JSON.stringify(bundleItemsJSON); } catch (e) { bundleItemsJSON = ''; }
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
    setAt(findCol(headers, 'WholesalePrice', 'Wholesale', 'DealerPrice'), Number(wholesalePrice) || 0);
    setAt(findCol(headers, 'MinSellingPrice', 'FloorPrice', 'MinPrice'), Number(minSellingPrice) || cPrice);
    setAt(findCol(headers, 'SellingPrice', 'Price', 'SalePrice'), sPrice);
    setAt(findCol(headers, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity', 'Qty'), stockQty);
    setAt(findCol(headers, 'GodownStock', 'WarehouseStock', 'GodownQty'), Number(godownStock) || 0);
    setAt(findCol(headers, 'MinStockAlert', 'MinStockAler', 'MinStock', 'Alert'), Number(minStockAlert) || 5);
    setAt(findCol(headers, 'Unit', 'UOM'), unit || 'Pcs');
    setAt(findCol(headers, 'YardsPerThan', 'GojPerThan', 'YardsThan'), Number(yardsPerThan) || 0);
    setAt(findCol(headers, 'ThanCount', 'TotalThan', 'ThanQty'), Number(thanCount) || 0);
    setAt(findCol(headers, 'TotalYards', 'TotalGoj', 'GojCount'), Number(totalYards) || 0);
    setAt(findCol(headers, 'ImageUrl', 'Image', 'Photo', 'ImgUrl', 'Picture'), imageUrl || '');
    setAt(findCol(headers, 'ImageCaption', 'Caption', 'AltText', 'Alt'), imageCaption || '');
    setAt(findCol(headers, 'ShortDescription', 'ShortDesc'), shortDescription);
    setAt(findCol(headers, 'Description', 'Desc', 'Details'), description);
    setAt(findCol(headers, 'Features', 'Feature', 'KeyFeatures'), features);
    setAt(findCol(headers, 'CreatedAt', 'Created', 'Date'), timestamp);
    setAt(findCol(headers, 'UpdatedAt', 'Updated'), timestamp);

    // Phase 6 নতুন কলাম সংরক্ষণ
    setAt(findCol(headers, 'HasVariants', 'HasVariant'), hasVariants ? 'TRUE' : 'FALSE');
    setAt(findCol(headers, 'VariantsJSON', 'Variants'), variantsJSON || '');
    setAt(findCol(headers, 'BatchNumber', 'BatchNo', 'Batch'), batchNumber || '');
    setAt(findCol(headers, 'ExpiryDate', 'ExpDate', 'Expiry'), expiryDate || '');
    setAt(findCol(headers, 'MfgDate', 'ManufactureDate', 'Mfg'), mfgDate || '');
    setAt(findCol(headers, 'IsBundle', 'Bundle', 'IsCombo'), isBundle ? 'TRUE' : 'FALSE');
    setAt(findCol(headers, 'BundleItemsJSON', 'BundleItems', 'ComboItems'), bundleItemsJSON || '');

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
        minSellingPrice: Number(minSellingPrice) || cPrice,
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
  const wholesalePrice = payload.wholesalePrice !== undefined ? Number(payload.wholesalePrice) : (payload.WholesalePrice !== undefined ? Number(payload.WholesalePrice) : undefined);
  const minSellingPrice = payload.minSellingPrice !== undefined ? Number(payload.minSellingPrice) : (payload.MinSellingPrice !== undefined ? Number(payload.MinSellingPrice) : (payload.FloorPrice !== undefined ? Number(payload.FloorPrice) : undefined));
  const sellingPrice = payload.sellingPrice !== undefined ? Number(payload.sellingPrice) : (payload.SellingPrice !== undefined ? Number(payload.SellingPrice) : undefined);
  const stockQuantity = payload.stockQuantity !== undefined ? Number(payload.stockQuantity) : (payload.StockQuantity !== undefined ? Number(payload.StockQuantity) : undefined);
  const godownStock = payload.godownStock !== undefined ? Number(payload.godownStock) : (payload.GodownStock !== undefined ? Number(payload.GodownStock) : (payload.initialGodownStock !== undefined ? Number(payload.initialGodownStock) : undefined));
  const minStockAlert = payload.minStockAlert !== undefined ? Number(payload.minStockAlert) : (payload.MinStockAlert !== undefined ? Number(payload.MinStockAlert) : undefined);
  const unit = payload.unit || payload.Unit;
  const yardsPerThan = payload.yardsPerThan !== undefined ? Number(payload.yardsPerThan) : (payload.YardsPerThan !== undefined ? Number(payload.YardsPerThan) : undefined);
  const thanCount = payload.thanCount !== undefined ? Number(payload.thanCount) : (payload.ThanCount !== undefined ? Number(payload.ThanCount) : undefined);
  const totalYards = payload.totalYards !== undefined ? Number(payload.totalYards) : (payload.TotalYards !== undefined ? Number(payload.TotalYards) : undefined);
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

  // Phase 6: ভ্যারিয়েন্ট, ব্যাচ, মেয়াদ ও কম্বো বান্ডেল আপডেট
  const hasVariants = payload.hasVariants !== undefined ? (payload.hasVariants === true || String(payload.hasVariants).toLowerCase() === 'true' ? 'TRUE' : 'FALSE') : (payload.HasVariants !== undefined ? (payload.HasVariants === true || String(payload.HasVariants).toLowerCase() === 'true' ? 'TRUE' : 'FALSE') : undefined);
  let variantsJSON = payload.variantsJSON !== undefined ? payload.variantsJSON : (payload.VariantsJSON !== undefined ? payload.VariantsJSON : (payload.variants !== undefined ? payload.variants : payload.Variants));
  if (variantsJSON !== undefined && typeof variantsJSON === 'object') {
    try { variantsJSON = JSON.stringify(variantsJSON); } catch (e) { variantsJSON = ''; }
  }
  const batchNumber = payload.batchNumber !== undefined ? String(payload.batchNumber).trim() : (payload.BatchNumber !== undefined ? String(payload.BatchNumber).trim() : undefined);
  const expiryDate = payload.expiryDate !== undefined ? String(payload.expiryDate).trim() : (payload.ExpiryDate !== undefined ? String(payload.ExpiryDate).trim() : undefined);
  const mfgDate = payload.mfgDate !== undefined ? String(payload.mfgDate).trim() : (payload.MfgDate !== undefined ? String(payload.MfgDate).trim() : undefined);
  const isBundle = payload.isBundle !== undefined ? (payload.isBundle === true || String(payload.isBundle).toLowerCase() === 'true' ? 'TRUE' : 'FALSE') : (payload.IsBundle !== undefined ? (payload.IsBundle === true || String(payload.IsBundle).toLowerCase() === 'true' ? 'TRUE' : 'FALSE') : undefined);
  let bundleItemsJSON = payload.bundleItemsJSON !== undefined ? payload.bundleItemsJSON : (payload.BundleItemsJSON !== undefined ? payload.BundleItemsJSON : (payload.bundleItems !== undefined ? payload.bundleItems : payload.BundleItems));
  if (bundleItemsJSON !== undefined && typeof bundleItemsJSON === 'object') {
    try { bundleItemsJSON = JSON.stringify(bundleItemsJSON); } catch (e) { bundleItemsJSON = ''; }
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
  const wholesaleColIdx = findCol(headers, 'WholesalePrice', 'Wholesale', 'DealerPrice');
  const minSellColIdx = findCol(headers, 'MinSellingPrice', 'FloorPrice', 'MinPrice');
  const sellColIdx = findCol(headers, 'SellingPrice', 'Price', 'SalePrice');
  const stockColIdx = findCol(headers, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity', 'Qty');
  const godownColIdx = findCol(headers, 'GodownStock', 'WarehouseStock', 'GodownQty');
  const alertColIdx = findCol(headers, 'MinStockAlert', 'MinStockAler', 'MinStock', 'Alert');
  const unitColIdx = findCol(headers, 'Unit', 'UOM');
  const yardsPerThanColIdx = findCol(headers, 'YardsPerThan', 'GojPerThan', 'YardsThan');
  const thanCountColIdx = findCol(headers, 'ThanCount', 'TotalThan', 'ThanQty');
  const totalYardsColIdx = findCol(headers, 'TotalYards', 'TotalGoj', 'GojCount');
  const imgColIdx = findCol(headers, 'ImageUrl', 'Image', 'Photo', 'ImgUrl');
  const captionColIdx = findCol(headers, 'ImageCaption', 'Caption', 'AltText', 'Alt');
  const shortDescColIdx = findCol(headers, 'ShortDescription', 'ShortDesc');
  const descColIdx = findCol(headers, 'Description', 'Desc', 'Details');
  const featColIdx = findCol(headers, 'Features', 'Feature', 'KeyFeatures');
  const updatedColIdx = findCol(headers, 'UpdatedAt', 'Updated');

  // Phase 6 কলাম ইনডেক্স
  const hasVariantsColIdx = findCol(headers, 'HasVariants', 'HasVariant');
  const variantsColIdx = findCol(headers, 'VariantsJSON', 'Variants');
  const batchColIdx = findCol(headers, 'BatchNumber', 'BatchNo', 'Batch');
  const expColIdx = findCol(headers, 'ExpiryDate', 'ExpDate', 'Expiry');
  const mfgColIdx = findCol(headers, 'MfgDate', 'ManufactureDate', 'Mfg');
  const isBundleColIdx = findCol(headers, 'IsBundle', 'Bundle', 'IsCombo');
  const bundleItemsColIdx = findCol(headers, 'BundleItemsJSON', 'BundleItems', 'ComboItems');

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
  updateIfDefined(wholesaleColIdx, wholesalePrice);
  updateIfDefined(minSellColIdx, minSellingPrice);
  updateIfDefined(sellColIdx, sellingPrice);
  updateIfDefined(stockColIdx, stockQuantity);
  updateIfDefined(godownColIdx, godownStock);
  updateIfDefined(alertColIdx, minStockAlert);
  updateIfDefined(unitColIdx, unit);
  updateIfDefined(yardsPerThanColIdx, yardsPerThan);
  updateIfDefined(thanCountColIdx, thanCount);
  updateIfDefined(totalYardsColIdx, totalYards);
  updateIfDefined(imgColIdx, imageUrl);
  updateIfDefined(captionColIdx, imageCaption);
  updateIfDefined(shortDescColIdx, shortDescription);
  updateIfDefined(descColIdx, description);
  updateIfDefined(featColIdx, features);
  updateIfDefined(updatedColIdx, new Date());

  // Phase 6 মান আপডেট
  updateIfDefined(hasVariantsColIdx, hasVariants);
  updateIfDefined(variantsColIdx, variantsJSON);
  updateIfDefined(batchColIdx, batchNumber);
  updateIfDefined(expColIdx, expiryDate);
  updateIfDefined(mfgColIdx, mfgDate);
  updateIfDefined(isBundleColIdx, isBundle);
  updateIfDefined(bundleItemsColIdx, bundleItemsJSON);

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
      minSellingPrice: minSellingPrice,
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
  const barcode = String(payload.barcode || payload.Barcode || '').trim();
  if (!productId && !barcode) {
    return {
      success: false,
      message: 'মুছে ফেলার জন্য পণ্যের আইডি (ProductID) বা বারকোড দেওয়া আবশ্যক।'
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
  const barcodeColIdx = findCol(headers, 'Barcode', 'BarCode', 'ItemCode');
  const nameColIdx = findCol(headers, 'ProductName', 'Name');

  let targetRow = -1;
  let deletedProductName = '';
  for (let r = 1; r < data.length; r++) {
    const rowId = idColIdx !== -1 ? String(data[r][idColIdx] || '').trim() : '';
    const rowBarcode = barcodeColIdx !== -1 ? String(data[r][barcodeColIdx] || '').trim() : '';

    const isMatch = (productId && (rowId === productId || (barcodeColIdx !== -1 && rowBarcode === productId))) ||
                    (barcode && rowBarcode === barcode);

    if (isMatch) {
      targetRow = r + 1;
      if (nameColIdx !== -1) {
        deletedProductName = data[r][nameColIdx] || '';
      }
      break;
    }
  }

  if (targetRow === -1) {
    return {
      success: false,
      message: `আইডি '${productId || barcode}' বিশিষ্ট পণ্যটি ডাটাবেসে পাওয়া যায়নি।`
    };
  }

  productsSheet.deleteRow(targetRow);
  SpreadsheetApp.flush();

  return {
    success: true,
    message: `'${deletedProductName || productId || barcode}' পণ্যটি ডাটাবেস থেকে সফলভাবে মুছে ফেলা হয়েছে।`,
    data: {
      productId: productId || barcode
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
  
  // কুরিয়ার ও এসএমএস ইন্টিগ্রেশন সেটিংস
  const steadfastApiKey = payload.SteadfastApiKey || payload.steadfastApiKey || '';
  const steadfastSecretKey = payload.SteadfastSecretKey || payload.steadfastSecretKey || '';
  const pathaoClientId = payload.PathaoClientId || payload.pathaoClientId || '';
  const pathaoClientSecret = payload.PathaoClientSecret || payload.pathaoClientSecret || '';
  const pathaoStoreId = payload.PathaoStoreId || payload.pathaoStoreId || '';
  const smsProvider = payload.SmsProvider || payload.smsProvider || 'Greenweb';
  const smsApiKey = payload.SmsApiKey || payload.smsApiKey || '';
  const smsSenderId = payload.SmsSenderId || payload.smsSenderId || '';
  const smsTemplateOrder = payload.SmsTemplateOrder || payload.smsTemplateOrder || '';
  const smsTemplateCourier = payload.SmsTemplateCourier || payload.smsTemplateCourier || '';
  const smsTemplateDelivered = payload.SmsTemplateDelivered || payload.smsTemplateDelivered || '';
  const whatsappEnabled = payload.WhatsappEnabled !== undefined ? payload.WhatsappEnabled : true;
  
  // লয়ালটি ও ডিজিটাল স্টোরফ্রন্ট সেটিংস
  const loyaltyEnabled = payload.LoyaltyEnabled !== undefined ? payload.LoyaltyEnabled : (payload.loyaltyEnabled !== undefined ? payload.loyaltyEnabled : true);
  const loyaltyPointsRate = Number(payload.LoyaltyPointsRate !== undefined ? payload.LoyaltyPointsRate : (payload.loyaltyPointsRate !== undefined ? payload.loyaltyPointsRate : 100)) || 100;
  const loyaltyRedeemRate = Number(payload.LoyaltyRedeemRate !== undefined ? payload.LoyaltyRedeemRate : (payload.loyaltyRedeemRate !== undefined ? payload.loyaltyRedeemRate : 1.0)) || 1.0;
  const minRedeemPoints = Number(payload.MinRedeemPoints !== undefined ? payload.MinRedeemPoints : (payload.minRedeemPoints !== undefined ? payload.minRedeemPoints : 10)) || 10;
  const storefrontBannerText = payload.StorefrontBannerText !== undefined ? payload.StorefrontBannerText : (payload.storefrontBannerText !== undefined ? payload.storefrontBannerText : 'আমাদের অনলাইন স্টোরে আপনাকে স্বাগতম! সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা।');
  const storefrontEnabled = payload.StorefrontEnabled !== undefined ? payload.StorefrontEnabled : (payload.storefrontEnabled !== undefined ? payload.storefrontEnabled : true);
  
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
    UpdatedAt: findCol(headers, 'UpdatedAt', 'Updated'),
    SteadfastApiKey: findCol(headers, 'SteadfastApiKey', 'SteadfastKey'),
    SteadfastSecretKey: findCol(headers, 'SteadfastSecretKey', 'SteadfastSecret'),
    PathaoClientId: findCol(headers, 'PathaoClientId'),
    PathaoClientSecret: findCol(headers, 'PathaoClientSecret'),
    PathaoStoreId: findCol(headers, 'PathaoStoreId'),
    SmsProvider: findCol(headers, 'SmsProvider'),
    SmsApiKey: findCol(headers, 'SmsApiKey', 'SmsKey'),
    SmsSenderId: findCol(headers, 'SmsSenderId', 'SenderId'),
    SmsTemplateOrder: findCol(headers, 'SmsTemplateOrder'),
    SmsTemplateCourier: findCol(headers, 'SmsTemplateCourier'),
    SmsTemplateDelivered: findCol(headers, 'SmsTemplateDelivered'),
    WhatsappEnabled: findCol(headers, 'WhatsappEnabled'),
    LoyaltyEnabled: findCol(headers, 'LoyaltyEnabled'),
    LoyaltyPointsRate: findCol(headers, 'LoyaltyPointsRate'),
    LoyaltyRedeemRate: findCol(headers, 'LoyaltyRedeemRate'),
    MinRedeemPoints: findCol(headers, 'MinRedeemPoints'),
    StorefrontBannerText: findCol(headers, 'StorefrontBannerText'),
    StorefrontEnabled: findCol(headers, 'StorefrontEnabled')
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
    if (colMap.SteadfastApiKey !== -1) newRow[colMap.SteadfastApiKey] = steadfastApiKey;
    if (colMap.SteadfastSecretKey !== -1) newRow[colMap.SteadfastSecretKey] = steadfastSecretKey;
    if (colMap.PathaoClientId !== -1) newRow[colMap.PathaoClientId] = pathaoClientId;
    if (colMap.PathaoClientSecret !== -1) newRow[colMap.PathaoClientSecret] = pathaoClientSecret;
    if (colMap.PathaoStoreId !== -1) newRow[colMap.PathaoStoreId] = pathaoStoreId;
    if (colMap.SmsProvider !== -1) newRow[colMap.SmsProvider] = smsProvider;
    if (colMap.SmsApiKey !== -1) newRow[colMap.SmsApiKey] = smsApiKey;
    if (colMap.SmsSenderId !== -1) newRow[colMap.SmsSenderId] = smsSenderId;
    if (colMap.SmsTemplateOrder !== -1) newRow[colMap.SmsTemplateOrder] = smsTemplateOrder;
    if (colMap.SmsTemplateCourier !== -1) newRow[colMap.SmsTemplateCourier] = smsTemplateCourier;
    if (colMap.SmsTemplateDelivered !== -1) newRow[colMap.SmsTemplateDelivered] = smsTemplateDelivered;
    if (colMap.WhatsappEnabled !== -1) newRow[colMap.WhatsappEnabled] = whatsappEnabled;
    if (colMap.LoyaltyEnabled !== -1) newRow[colMap.LoyaltyEnabled] = loyaltyEnabled;
    if (colMap.LoyaltyPointsRate !== -1) newRow[colMap.LoyaltyPointsRate] = loyaltyPointsRate;
    if (colMap.LoyaltyRedeemRate !== -1) newRow[colMap.LoyaltyRedeemRate] = loyaltyRedeemRate;
    if (colMap.MinRedeemPoints !== -1) newRow[colMap.MinRedeemPoints] = minRedeemPoints;
    if (colMap.StorefrontBannerText !== -1) newRow[colMap.StorefrontBannerText] = storefrontBannerText;
    if (colMap.StorefrontEnabled !== -1) newRow[colMap.StorefrontEnabled] = storefrontEnabled;
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
    if (colMap.SteadfastApiKey !== -1) settingsSheet.getRange(2, colMap.SteadfastApiKey + 1).setValue(steadfastApiKey);
    if (colMap.SteadfastSecretKey !== -1) settingsSheet.getRange(2, colMap.SteadfastSecretKey + 1).setValue(steadfastSecretKey);
    if (colMap.PathaoClientId !== -1) settingsSheet.getRange(2, colMap.PathaoClientId + 1).setValue(pathaoClientId);
    if (colMap.PathaoClientSecret !== -1) settingsSheet.getRange(2, colMap.PathaoClientSecret + 1).setValue(pathaoClientSecret);
    if (colMap.PathaoStoreId !== -1) settingsSheet.getRange(2, colMap.PathaoStoreId + 1).setValue(pathaoStoreId);
    if (colMap.SmsProvider !== -1) settingsSheet.getRange(2, colMap.SmsProvider + 1).setValue(smsProvider);
    if (colMap.SmsApiKey !== -1) settingsSheet.getRange(2, colMap.SmsApiKey + 1).setValue(smsApiKey);
    if (colMap.SmsSenderId !== -1) settingsSheet.getRange(2, colMap.SmsSenderId + 1).setValue(smsSenderId);
    if (colMap.SmsTemplateOrder !== -1) settingsSheet.getRange(2, colMap.SmsTemplateOrder + 1).setValue(smsTemplateOrder);
    if (colMap.SmsTemplateCourier !== -1) settingsSheet.getRange(2, colMap.SmsTemplateCourier + 1).setValue(smsTemplateCourier);
    if (colMap.SmsTemplateDelivered !== -1) settingsSheet.getRange(2, colMap.SmsTemplateDelivered + 1).setValue(smsTemplateDelivered);
    if (colMap.WhatsappEnabled !== -1) settingsSheet.getRange(2, colMap.WhatsappEnabled + 1).setValue(whatsappEnabled);
    if (colMap.LoyaltyEnabled !== -1) settingsSheet.getRange(2, colMap.LoyaltyEnabled + 1).setValue(loyaltyEnabled);
    if (colMap.LoyaltyPointsRate !== -1) settingsSheet.getRange(2, colMap.LoyaltyPointsRate + 1).setValue(loyaltyPointsRate);
    if (colMap.LoyaltyRedeemRate !== -1) settingsSheet.getRange(2, colMap.LoyaltyRedeemRate + 1).setValue(loyaltyRedeemRate);
    if (colMap.MinRedeemPoints !== -1) settingsSheet.getRange(2, colMap.MinRedeemPoints + 1).setValue(minRedeemPoints);
    if (colMap.StorefrontBannerText !== -1) settingsSheet.getRange(2, colMap.StorefrontBannerText + 1).setValue(storefrontBannerText);
    if (colMap.StorefrontEnabled !== -1) settingsSheet.getRange(2, colMap.StorefrontEnabled + 1).setValue(storefrontEnabled);
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
      apiUrl: apiUrl,
      SteadfastApiKey: steadfastApiKey,
      SteadfastSecretKey: steadfastSecretKey,
      PathaoClientId: pathaoClientId,
      PathaoClientSecret: pathaoClientSecret,
      PathaoStoreId: pathaoStoreId,
      SmsProvider: smsProvider,
      SmsApiKey: smsApiKey,
      SmsSenderId: smsSenderId,
      SmsTemplateOrder: smsTemplateOrder,
      SmsTemplateCourier: smsTemplateCourier,
      SmsTemplateDelivered: smsTemplateDelivered,
      WhatsappEnabled: whatsappEnabled,
      LoyaltyEnabled: loyaltyEnabled,
      LoyaltyPointsRate: loyaltyPointsRate,
      LoyaltyRedeemRate: loyaltyRedeemRate,
      MinRedeemPoints: minRedeemPoints,
      StorefrontBannerText: storefrontBannerText,
      StorefrontEnabled: storefrontEnabled
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
 * নতুন ভ্যারিয়েন্ট অপশন (Variant Attribute Option) যোগ করার হ্যান্ডলার
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - ভ্যারিয়েন্টের বিবরণ { type, name, value, description }
 * @return {Object} রেসপন্স অবজেক্ট
 */
function handleAddVariantOption(spreadsheet, payload) {
  let variantsSheet = ensureVariantsSheet(spreadsheet);

  const type = payload.type || payload.Type || 'Color';
  const name = payload.name || payload.Name || '';
  const value = payload.value || payload.Value || '';
  const description = payload.description || payload.Description || '';

  if (!name.toString().trim()) {
    return {
      success: false,
      message: 'ভ্যারিয়েন্টের নাম দেওয়া আবশ্যক।'
    };
  }

  // ইতোমধ্যে একই টাইপ ও নামের ভ্যারিয়েন্ট আছে কিনা যাচাই
  const existingVariants = getSheetRowsAsObjects(SHEETS.VARIANTS);
  const duplicate = existingVariants.find(v => 
    (v.Type && v.Type.toString().trim().toLowerCase() === type.toString().trim().toLowerCase()) &&
    (v.Name && v.Name.toString().trim().toLowerCase() === name.toString().trim().toLowerCase())
  );

  if (duplicate) {
    return {
      success: true,
      message: 'এই ভ্যারিয়েন্ট অপশনটি ইতিমধ্যে ডাটাবেসে বিদ্যমান রয়েছে।',
      data: duplicate
    };
  }

  const prefix = type.toString().toUpperCase().startsWith('COL') ? 'VAR-COL' : 'VAR-SIZ';
  const variantId = generateUniqueId(prefix);
  const timestamp = new Date();

  variantsSheet.appendRow([
    variantId,
    type,
    name.toString().trim(),
    value.toString().trim(),
    description || '',
    'Active',
    timestamp
  ]);

  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'নতুন ভ্যারিয়েন্ট ডাটাবেসে সফলভাবে যুক্ত হয়েছে।',
    data: {
      VariantID: variantId,
      Type: type,
      Name: name.toString().trim(),
      Value: value.toString().trim(),
      Description: description,
      Status: 'Active',
      CreatedAt: timestamp
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

    // ১. সম্পূর্ণ প্রাথমিক ডাটা (Master Sync) লোড করা (High-Speed Cached)
    if (action === 'getInitialData') {
      const cache = CacheService.getScriptCache();
      const isForce = (e && e.parameter && (e.parameter.nocache === 'true' || e.parameter.force === 'true'));
      
      // হাই-স্পিড গুগল মেমোরি ক্যাশ (১০০-২০০ মিলিসেকেন্ড রেসপন্স)
      if (!isForce) {
        try {
          const cached = cache.get('initialData');
          if (cached) {
            return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
          }
        } catch (cErr) {}
      }

      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      // ভারী স্কিমা চেক শুধুমাত্র সেটআপ বা ম্যানুয়াল রিকোয়েস্টে চলবে (প্রতিটি রিড কলে নয়)
      if (e && e.parameter && e.parameter.forceSchema === 'true') {
        ensureDatabaseSchema(spreadsheet);
      } else {
        // Variants শিট না থাকলে স্বয়ংক্রিয়ভাবে তৈরি ও ডিফল্ট ডাটা নিশ্চিত করা
        ensureVariantsSheet(spreadsheet);
      }

      const settings = getSheetRowsAsObjects(SHEETS.SETTINGS);
      const products = getSheetRowsAsObjects(SHEETS.PRODUCTS);
      const categories = getSheetRowsAsObjects(SHEETS.CATEGORIES);
      const units = getSheetRowsAsObjects(SHEETS.UNITS);
      const variants = getSheetRowsAsObjects(SHEETS.VARIANTS);
      const customers = getSheetRowsAsObjects(SHEETS.CUSTOMERS);
      const coupons = getSheetRowsAsObjects(SHEETS.COUPONS);
      const sales = getSheetRowsAsObjects(SHEETS.SALES);
      const orders = getSheetRowsAsObjects(SHEETS.ORDERS);
      const customerLedger = getSheetRowsAsObjects(SHEETS.CUSTOMER_LEDGER);
      const abandonedCarts = getSheetRowsAsObjects(SHEETS.ABANDONED_CARTS);
      const suppliers = getSheetRowsAsObjects(SHEETS.SUPPLIERS);
      const purchaseOrders = getSheetRowsAsObjects(SHEETS.PURCHASE_ORDERS);
      const supplierLedger = getSheetRowsAsObjects(SHEETS.SUPPLIER_LEDGER);
      const expenses = getSheetRowsAsObjects(SHEETS.EXPENSES);
      const cashRegisters = getSheetRowsAsObjects(SHEETS.CASH_REGISTER);
      const salesReturns = getSheetRowsAsObjects(SHEETS.SALES_RETURNS);
      ensureStockTransfersSheet(spreadsheet);
      const stockTransfers = getSheetRowsAsObjects(SHEETS.STOCK_TRANSFERS);
      const rawAuditLogs = getSheetRowsAsObjects(SHEETS.AUDIT_LOGS);
      // সর্বশেষ ৫০০টি অডিট লগ রিটার্ন করা যেন রেসপন্স দ্রুত থাকে
      const auditLogs = rawAuditLogs.slice(-500).reverse();

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

      const responsePayload = JSON.stringify({
        success: true,
        data: {
          settings: activeSetting,
          products: products,
          categories: categories,
          units: units,
          customers: customers,
          customerLedger: customerLedger,
          abandonedCarts: abandonedCarts,
          suppliers: suppliers,
          purchaseOrders: purchaseOrders,
          supplierLedger: supplierLedger,
          expenses: expenses,
          cashRegisters: cashRegisters,
          salesReturns: salesReturns,
          stockTransfers: stockTransfers,
          auditLogs: auditLogs,
          variants: variants,
          coupons: coupons,
          sales: sales,
          orders: orders,
          users: users
        }
      });

      // ১২০ সেকেন্ডের জন্য গুগল স্ক্রিপ্ট ক্যাশে সংরক্ষণ
      try {
        cache.put('initialData', responsePayload, 120);
      } catch (cacheErr) {}

      return ContentService.createTextOutput(responsePayload).setMimeType(ContentService.MimeType.JSON);
    }

    // ১.১ শুধুমাত্র পরিমাপক একক (Units) তালিকা আনা
    if (action === 'getUnits') {
      const units = getSheetRowsAsObjects(SHEETS.UNITS);
      return createJsonResponse({
        success: true,
        data: units
      });
    }

    // ১.১.১ শুধুমাত্র ভ্যারিয়েন্ট (Variants) তালিকা আনা
    if (action === 'getVariants') {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      ensureVariantsSheet(spreadsheet);
      const variants = getSheetRowsAsObjects(SHEETS.VARIANTS);
      return createJsonResponse({
        success: true,
        data: variants
      });
    }

    // ১.১.২ Variants শিট তাৎক্ষণিক তৈরি ও যাচাই
    if (action === 'ensureVariants' || action === 'createVariantsTab') {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      ensureVariantsSheet(spreadsheet);
      const variants = getSheetRowsAsObjects(SHEETS.VARIANTS);
      return createJsonResponse({
        success: true,
        message: 'Variants শিট সফলভাবে তৈরি ও আপডেট হয়েছে।',
        data: variants
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

    // ৭. সেলস রিটার্ন ও এক্সচেঞ্জ তালিকা আনা
    if (action === 'getSalesReturns') {
      const returns = getSheetRowsAsObjects(SHEETS.SALES_RETURNS);
      return createJsonResponse({
        success: true,
        data: returns
      });
    }

    // ৮. গোডাউন ও দোকান স্টক ট্রান্সফার চালান তালিকা আনা
    if (action === 'getStockTransfers') {
      const transfers = getSheetRowsAsObjects(SHEETS.STOCK_TRANSFERS);
      return createJsonResponse({
        success: true,
        data: transfers
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

      case 'addVariant':
      case 'addVariantOption':
        result = handleAddVariantOption(spreadsheet, payload);
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

      case 'createOrder':
        result = handleCreateOrder(spreadsheet, payload);
        break;

      case 'updateOrderStatus':
        result = handleUpdateOrderStatus(spreadsheet, payload);
        break;

      case 'bulkUpdateOrderStatus':
        result = handleBulkUpdateOrderStatus(spreadsheet, payload);
        break;

      case 'steadfastBulkDispatch':
        result = handleSteadfastBulkDispatch(spreadsheet, payload);
        break;

      case 'steadfastCheckStatus':
        result = handleSteadfastCheckStatus(spreadsheet, payload);
        break;

      case 'sendSmsNotification':
        result = handleSendSmsNotification(spreadsheet, payload);
        break;

      case 'recordCustomerPayment':
        result = handleRecordCustomerPayment(spreadsheet, payload);
        break;

      case 'updateCustomerCreditLimit':
        result = handleUpdateCustomerCreditLimit(spreadsheet, payload);
        break;

      case 'saveAbandonedCart':
        result = handleSaveAbandonedCart(spreadsheet, payload);
        break;

      case 'updateAbandonedCartStatus':
        result = handleUpdateAbandonedCartStatus(spreadsheet, payload);
        break;

      case 'updateCustomerLoyalty':
        result = handleUpdateCustomerLoyalty(spreadsheet, payload);
        break;

      case 'saveSupplier':
        result = handleSaveSupplier(spreadsheet, payload);
        break;

      case 'deleteSupplier':
        result = handleDeleteSupplier(spreadsheet, payload);
        break;

      case 'createPurchaseOrder':
        result = handleCreatePurchaseOrder(spreadsheet, payload);
        break;

      case 'updatePOStatus':
        result = handleUpdatePOStatus(spreadsheet, payload);
        break;

      case 'recordSupplierPayment':
        result = handleRecordSupplierPayment(spreadsheet, payload);
        break;

      case 'saveExpense':
        result = handleSaveExpense(spreadsheet, payload);
        break;

      case 'deleteExpense':
        result = handleDeleteExpense(spreadsheet, payload);
        break;

      case 'openCashRegister':
        result = handleOpenCashRegister(spreadsheet, payload);
        break;

      case 'closeCashRegister':
        result = handleCloseCashRegister(spreadsheet, payload);
        break;

      case 'logAuditEvent':
        result = handleLogAuditEvent(spreadsheet, payload);
        break;

      case 'createSalesReturn':
        result = handleCreateSalesReturn(spreadsheet, payload);
        break;

      case 'redeemStoreCredit':
        result = handleRedeemStoreCredit(spreadsheet, payload);
        break;

      case 'createStockTransfer':
        result = handleCreateStockTransfer(spreadsheet, payload);
        break;

      case 'updateStockTransferStatus':
        result = handleUpdateStockTransferStatus(spreadsheet, payload);
        break;

      case 'deleteStockTransfer':
        result = handleDeleteStockTransfer(spreadsheet, payload);
        break;

      case 'sendBulkTargetedSms':
        result = handleSendBulkTargetedSms(spreadsheet, payload);
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
    // যেকোনো ডাটা মিউটেশনের পর স্ক্রিপ্ট ক্যাশ স্বয়ংক্রিয়ভাবে বাতিল করা
    try {
      CacheService.getScriptCache().remove('initialData');
    } catch (cErr) {}
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
 * ============================================================================
 * Phase 2: বাকির খাতা ও কাস্টমার লেজার পেমেন্ট হ্যান্ডলারসমূহ
 * ============================================================================
 */

/**
 * কাস্টমারের বকেয়া পরিশোধ (Due Collection) রেকর্ড করার হ্যান্ডলার
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট
 * @param {Object} payload - { customerId, customerName, customerPhone, amount, paymentMethod, trxId, notes, collectedBy, orderId, invoiceNo }
 * @return {Object} ফলাফল
 */
function handleRecordCustomerPayment(spreadsheet, payload) {
  const amount = Number(payload.amount || payload.Amount || 0);
  if (isNaN(amount) || amount <= 0) {
    return { success: false, message: 'সঠিক পেমেন্টের টাকার পরিমাণ প্রদান করুন।' };
  }

  const customerId = String(payload.customerId || payload.CustomerID || '').trim();
  const phone = String(payload.customerPhone || payload.phone || payload.Phone || '').trim();
  const name = String(payload.customerName || payload.name || payload.CustomerName || '').trim();
  const orderId = String(payload.orderId || payload.OrderID || '').trim();
  const invoiceNo = String(payload.invoiceNo || payload.InvoiceNo || '').trim();
  const paymentMethod = String(payload.paymentMethod || payload.PaymentMethod || 'Cash').trim();
  const trxId = String(payload.trxId || payload.TrxID || payload.transactionId || '').trim();
  const notes = String(payload.notes || payload.Notes || '').trim();
  const collectedBy = String(payload.collectedBy || payload.CollectedBy || 'Admin').trim();

  const customersSheet = ensureCustomersSheet(spreadsheet);
  const ledgerSheet = ensureCustomerLedgerSheet(spreadsheet);
  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  // ১. গ্রাহক রেকর্ড অনুসন্ধান
  const custData = getSheetRowsAsObjects(SHEETS.CUSTOMERS);
  const targetCust = custData.find(c => 
    (customerId && String(c.CustomerID || '').trim() === customerId) ||
    (phone && String(c.Phone || '').trim() === phone) ||
    (name && String(c.CustomerName || '').trim().toLowerCase() === name.toLowerCase())
  );

  let finalCustId = customerId || (targetCust ? targetCust.CustomerID : generateUniqueId('CUST'));
  let finalCustName = name || (targetCust ? targetCust.CustomerName : 'Customer');
  let finalCustPhone = phone || (targetCust ? targetCust.Phone : '');
  let currentDue = targetCust ? (Number(targetCust.CurrentDue) || 0) : 0;
  let totalPaid = targetCust ? (Number(targetCust.TotalPaid) || 0) : 0;

  // নতুন বকেয়া ও পেইড হিসাব
  const newDue = Math.max(0, currentDue - amount);
  const newTotalPaid = totalPaid + amount;

  // গ্রাহক শিটে আপডেট
  if (targetCust && targetCust._rowIndex) {
    const custHeaders = customersSheet.getRange(1, 1, 1, customersSheet.getLastColumn()).getValues()[0];
    const dueCol = findCol(custHeaders, 'CurrentDue', 'Due');
    const paidCol = findCol(custHeaders, 'TotalPaid', 'Paid');
    const lastPayCol = findCol(custHeaders, 'LastPaymentDate');
    const updatedCol = findCol(custHeaders, 'UpdatedAt', 'Updated');

    if (dueCol !== -1) customersSheet.getRange(targetCust._rowIndex, dueCol + 1).setValue(newDue);
    if (paidCol !== -1) customersSheet.getRange(targetCust._rowIndex, paidCol + 1).setValue(newTotalPaid);
    if (lastPayCol !== -1) customersSheet.getRange(targetCust._rowIndex, lastPayCol + 1).setValue(timestampStr);
    if (updatedCol !== -1) customersSheet.getRange(targetCust._rowIndex, updatedCol + 1).setValue(timestampStr);
  }

  // ২. CustomerLedger শিটে এন্ট্রি যুক্ত করা
  const ledgerId = generateUniqueId('LEDGER');
  ledgerSheet.appendRow([
    ledgerId,
    timestampStr,
    finalCustId,
    finalCustName,
    finalCustPhone,
    orderId,
    invoiceNo,
    'Payment',
    0, // Debit (কেনাকাটা)
    amount, // Credit (পরিশোধ)
    newDue, // Balance (চলতি বাকি)
    paymentMethod,
    trxId,
    collectedBy,
    notes || 'বকেয়া পরিশোধ আদায়'
  ]);

  // ৩. যদি কোনো নির্দিষ্ট OrderID বা InvoiceNo দেওয়া থাকে, সেই অর্ডারের DueAmount ও AdvancePaid সমন্বয় করা
  if (orderId) {
    try {
      const ordersSheet = ensureOrdersSheet(spreadsheet);
      const oData = ordersSheet.getDataRange().getValues();
      if (oData.length > 1) {
        const oHeaders = oData[0];
        const ordIdCol = findCol(oHeaders, 'OrderID', 'OrderNumber');
        const dueCol = findCol(oHeaders, 'DueAmount', 'Due');
        const advCol = findCol(oHeaders, 'AdvancePaid', 'Paid');
        const payStatusCol = findCol(oHeaders, 'PaymentStatus', 'Payment');
        const updatedCol = findCol(oHeaders, 'UpdatedAt', 'Updated');

        if (ordIdCol !== -1) {
          for (let r = 1; r < oData.length; r++) {
            if (String(oData[r][ordIdCol] || '').trim() === orderId) {
              const currentOrdDue = dueCol !== -1 ? (Number(oData[r][dueCol]) || 0) : 0;
              const currentOrdAdv = advCol !== -1 ? (Number(oData[r][advCol]) || 0) : 0;
              const remainingOrdDue = Math.max(0, currentOrdDue - amount);
              const updatedOrdAdv = currentOrdAdv + amount;

              if (dueCol !== -1) ordersSheet.getRange(r + 1, dueCol + 1).setValue(remainingOrdDue);
              if (advCol !== -1) ordersSheet.getRange(r + 1, advCol + 1).setValue(updatedOrdAdv);
              if (payStatusCol !== -1 && remainingOrdDue === 0) ordersSheet.getRange(r + 1, payStatusCol + 1).setValue('Paid');
              if (updatedCol !== -1) ordersSheet.getRange(r + 1, updatedCol + 1).setValue(timestampStr);
              break;
            }
          }
        }
      }
    } catch (ordErr) {
      Logger.log('Soft error updating order due: ' + ordErr);
    }
  }

  SpreadsheetApp.flush();

  return {
    success: true,
    message: `৳${amount} বকেয়া পরিশোধ সফলভাবে এন্ট্রি হয়েছে। বর্তমান বকেয়া: ৳${newDue}`,
    data: {
      ledgerId: ledgerId,
      customerId: finalCustId,
      customerName: finalCustName,
      customerPhone: finalCustPhone,
      amount: amount,
      previousDue: currentDue,
      currentDue: newDue,
      totalPaid: newTotalPaid,
      paymentMethod: paymentMethod,
      trxId: trxId,
      timestamp: timestampStr,
      notes: notes
    }
  };
}

/**
 * কাস্টমারের ক্রেডিট লিমিট আপডেট হ্যান্ডলার
 */
function handleUpdateCustomerCreditLimit(spreadsheet, payload) {
  const customerId = String(payload.customerId || payload.CustomerID || '').trim();
  const phone = String(payload.customerPhone || payload.Phone || '').trim();
  const creditLimit = Math.max(0, Number(payload.creditLimit || payload.CreditLimit || 0));

  if (!customerId && !phone) {
    return { success: false, message: 'গ্রাহক আইডি অথবা ফোন নম্বর প্রয়োজন।' };
  }

  const customersSheet = ensureCustomersSheet(spreadsheet);
  const custData = getSheetRowsAsObjects(SHEETS.CUSTOMERS);
  const target = custData.find(c => 
    (customerId && String(c.CustomerID || '').trim() === customerId) ||
    (phone && String(c.Phone || '').trim() === phone)
  );

  if (!target || !target._rowIndex) {
    return { success: false, message: 'গ্রাহককে খুঁজে পাওয়া যায়নি।' };
  }

  const custHeaders = customersSheet.getRange(1, 1, 1, customersSheet.getLastColumn()).getValues()[0];
  const limitCol = findCol(custHeaders, 'CreditLimit', 'Limit');
  const updatedCol = findCol(custHeaders, 'UpdatedAt', 'Updated');

  if (limitCol !== -1) {
    customersSheet.getRange(target._rowIndex, limitCol + 1).setValue(creditLimit);
  }
  if (updatedCol !== -1) {
    customersSheet.getRange(target._rowIndex, updatedCol + 1).setValue(new Date());
  }

  SpreadsheetApp.flush();

  return {
    success: true,
    message: `গ্রাহকের ক্রেডিট লিমিট ৳${creditLimit} হিসেবে সফলভাবে হালনাগাদ করা হয়েছে।`,
    data: { customerId: target.CustomerID, creditLimit: creditLimit }
  };
}

/**
 * ============================================================================
 * Phase 3: ডিজিটাল স্টোরফ্রন্ট, লয়ালটি রিওয়ার্ড ও অসম্পূর্ণ কার্ট রিকভারি হ্যান্ডলারসমূহ
 * ============================================================================
 */

/**
 * ড্রপ-অফ বা অসম্পূর্ণ কার্ট সেভ বা আপডেট করা
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট
 * @param {Object} payload - { cartId, customerPhone, customerName, customerEmail, customerAddress, items, totalAmount, status, notes }
 * @return {Object} রেসপন্স
 */
function handleSaveAbandonedCart(spreadsheet, payload) {
  const cartsSheet = ensureAbandonedCartsSheet(spreadsheet);
  const phone = String(payload.customerPhone || payload.phone || '').trim();
  const name = String(payload.customerName || payload.name || '').trim();
  const email = String(payload.customerEmail || payload.email || '').trim();
  const address = String(payload.customerAddress || payload.address || '').trim();
  const totalAmount = Number(payload.totalAmount || payload.grandTotal || 0);
  const items = payload.items || [];
  const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);
  const notes = String(payload.notes || '').trim();
  const cartId = String(payload.cartId || payload.CartID || generateUniqueId('CART')).trim();
  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  if (!phone && !name && (!items || items.length === 0)) {
    return { success: false, message: 'কার্ট সংরক্ষণের জন্য ফোন নম্বর বা আইটেম প্রয়োজন।' };
  }

  const existingCarts = getSheetRowsAsObjects(SHEETS.ABANDONED_CARTS);
  const targetCart = existingCarts.find(c => 
    (cartId && String(c.CartID || '').trim() === cartId) ||
    (phone && String(c.CustomerPhone || '').trim() === phone && c.RecoveryStatus === 'Pending')
  );

  const headers = cartsSheet.getRange(1, 1, 1, cartsSheet.getLastColumn()).getValues()[0];
  const colMap = {
    CartID: findCol(headers, 'CartID', 'ID'),
    Timestamp: findCol(headers, 'Timestamp', 'Date'),
    CustomerPhone: findCol(headers, 'CustomerPhone', 'Phone', 'Mobile'),
    CustomerName: findCol(headers, 'CustomerName', 'Name'),
    CustomerEmail: findCol(headers, 'CustomerEmail', 'Email'),
    CustomerAddress: findCol(headers, 'CustomerAddress', 'Address'),
    CartItemsJSON: findCol(headers, 'CartItemsJSON', 'Items', 'CartItems'),
    TotalAmount: findCol(headers, 'TotalAmount', 'Amount'),
    RecoveryStatus: findCol(headers, 'RecoveryStatus', 'Status'),
    LastContactedAt: findCol(headers, 'LastContactedAt', 'ContactedAt'),
    Notes: findCol(headers, 'Notes')
  };

  if (targetCart && targetCart._rowIndex) {
    if (colMap.Timestamp !== -1) cartsSheet.getRange(targetCart._rowIndex, colMap.Timestamp + 1).setValue(timestampStr);
    if (name && colMap.CustomerName !== -1) cartsSheet.getRange(targetCart._rowIndex, colMap.CustomerName + 1).setValue(name);
    if (email && colMap.CustomerEmail !== -1) cartsSheet.getRange(targetCart._rowIndex, colMap.CustomerEmail + 1).setValue(email);
    if (address && colMap.CustomerAddress !== -1) cartsSheet.getRange(targetCart._rowIndex, colMap.CustomerAddress + 1).setValue(address);
    if (colMap.CartItemsJSON !== -1) cartsSheet.getRange(targetCart._rowIndex, colMap.CartItemsJSON + 1).setValue(itemsJson);
    if (colMap.TotalAmount !== -1) cartsSheet.getRange(targetCart._rowIndex, colMap.TotalAmount + 1).setValue(totalAmount);
    if (notes && colMap.Notes !== -1) cartsSheet.getRange(targetCart._rowIndex, colMap.Notes + 1).setValue(notes);
  } else {
    const newRow = new Array(headers.length).fill('');
    if (colMap.CartID !== -1) newRow[colMap.CartID] = cartId;
    if (colMap.Timestamp !== -1) newRow[colMap.Timestamp] = timestampStr;
    if (colMap.CustomerPhone !== -1) newRow[colMap.CustomerPhone] = phone;
    if (colMap.CustomerName !== -1) newRow[colMap.CustomerName] = name || 'Online Visitor';
    if (colMap.CustomerEmail !== -1) newRow[colMap.CustomerEmail] = email;
    if (colMap.CustomerAddress !== -1) newRow[colMap.CustomerAddress] = address;
    if (colMap.CartItemsJSON !== -1) newRow[colMap.CartItemsJSON] = itemsJson;
    if (colMap.TotalAmount !== -1) newRow[colMap.TotalAmount] = totalAmount;
    if (colMap.RecoveryStatus !== -1) newRow[colMap.RecoveryStatus] = 'Pending';
    if (colMap.Notes !== -1) newRow[colMap.Notes] = notes;
    cartsSheet.appendRow(newRow);
  }

  SpreadsheetApp.flush();
  return {
    success: true,
    message: 'অসম্পূর্ণ কার্ট সফলভাবে সংরক্ষিত হয়েছে।',
    data: { cartId: cartId }
  };
}

/**
 * অসম্পূর্ণ কার্টের স্ট্যাটাস আপডেট (যেমন: Contacted, Recovered, Expired)
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট
 * @param {Object} payload - { cartId, status, notes }
 * @return {Object} রেসপন্স
 */
function handleUpdateAbandonedCartStatus(spreadsheet, payload) {
  const cartId = String(payload.cartId || payload.CartID || '').trim();
  const status = String(payload.status || payload.RecoveryStatus || 'Contacted').trim();
  const notes = String(payload.notes || '').trim();

  if (!cartId) {
    return { success: false, message: 'কার্ট আইডি প্রদান করা আবশ্যক।' };
  }

  const cartsSheet = ensureAbandonedCartsSheet(spreadsheet);
  const existingCarts = getSheetRowsAsObjects(SHEETS.ABANDONED_CARTS);
  const target = existingCarts.find(c => String(c.CartID || '').trim() === cartId);

  if (!target || !target._rowIndex) {
    return { success: false, message: 'কার্ট রেকর্ড খুঁজে পাওয়া যায়নি।' };
  }

  const headers = cartsSheet.getRange(1, 1, 1, cartsSheet.getLastColumn()).getValues()[0];
  const statusCol = findCol(headers, 'RecoveryStatus', 'Status');
  const contactCol = findCol(headers, 'LastContactedAt', 'ContactedAt');
  const notesCol = findCol(headers, 'Notes');

  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  if (statusCol !== -1) cartsSheet.getRange(target._rowIndex, statusCol + 1).setValue(status);
  if (contactCol !== -1) cartsSheet.getRange(target._rowIndex, contactCol + 1).setValue(timestampStr);
  if (notes && notesCol !== -1) cartsSheet.getRange(target._rowIndex, notesCol + 1).setValue(notes);

  SpreadsheetApp.flush();
  return {
    success: true,
    message: `কার্ট স্ট্যাটাস '${status}' হিসেবে আপডেট করা হয়েছে।`,
    data: { cartId: cartId, status: status }
  };
}

/**
 * কাস্টমারের লয়ালটি পয়েন্ট আপডেট (অধিগ্রহণ বা ভাঙানো)
 * @param {Spreadsheet} spreadsheet - স্প্রেডশিট
 * @param {Object} payload - { customerId, phone, pointsDelta, isRedeem, notes }
 * @return {Object} রেসপন্স
 */
function handleUpdateCustomerLoyalty(spreadsheet, payload) {
  const customerId = String(payload.customerId || payload.CustomerID || '').trim();
  const phone = String(payload.phone || payload.customerPhone || '').trim();
  const pointsDelta = Number(payload.pointsDelta || payload.points || 0);
  const isRedeem = Boolean(payload.isRedeem);

  if (!customerId && !phone) {
    return { success: false, message: 'গ্রাহক আইডি বা ফোন নম্বর প্রদান করুন।' };
  }

  const customersSheet = ensureCustomersSheet(spreadsheet);
  const custData = getSheetRowsAsObjects(SHEETS.CUSTOMERS);
  const target = custData.find(c => 
    (customerId && String(c.CustomerID || '').trim() === customerId) ||
    (phone && String(c.Phone || '').trim() === phone)
  );

  if (!target || !target._rowIndex) {
    return { success: false, message: 'গ্রাহক খুঁজে পাওয়া যায়নি।' };
  }

  const headers = customersSheet.getRange(1, 1, 1, customersSheet.getLastColumn()).getValues()[0];
  const ptsCol = findCol(headers, 'LoyaltyPoints', 'Points');
  const earnedCol = findCol(headers, 'TotalPointsEarned', 'PointsEarned');
  const redeemedCol = findCol(headers, 'TotalPointsRedeemed', 'PointsRedeemed');
  const updatedCol = findCol(headers, 'UpdatedAt', 'Updated');

  let currentPts = Number(target.LoyaltyPoints || 0);
  let totalEarned = Number(target.TotalPointsEarned || 0);
  let totalRedeemed = Number(target.TotalPointsRedeemed || 0);

  if (isRedeem) {
    currentPts = Math.max(0, currentPts - pointsDelta);
    totalRedeemed += pointsDelta;
  } else {
    currentPts += pointsDelta;
    totalEarned += pointsDelta;
  }

  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  if (ptsCol !== -1) customersSheet.getRange(target._rowIndex, ptsCol + 1).setValue(currentPts);
  if (earnedCol !== -1) customersSheet.getRange(target._rowIndex, earnedCol + 1).setValue(totalEarned);
  if (redeemedCol !== -1) customersSheet.getRange(target._rowIndex, redeemedCol + 1).setValue(totalRedeemed);
  if (updatedCol !== -1) customersSheet.getRange(target._rowIndex, updatedCol + 1).setValue(timestampStr);

  SpreadsheetApp.flush();
  return {
    success: true,
    message: isRedeem ? `${pointsDelta} লয়ালটি পয়েন্ট সফলভাবে ছাড় হিসেবে ব্যবহার হয়েছে!` : `${pointsDelta} লয়ালটি পয়েন্ট অর্জিত হয়েছে!`,
    data: {
      customerId: target.CustomerID,
      loyaltyPoints: currentPts,
      totalPointsEarned: totalEarned,
      totalPointsRedeemed: totalRedeemed
    }
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

/**
 * ============================================================================
 * অর্ডার ম্যানেজমেন্ট সার্ভিস মেথডসমূহ (Order Management Backend Handlers)
 * ============================================================================
 */

function ensureOrdersSheet(spreadsheet) {
  let ordersSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.ORDERS);
  if (!ordersSheet) {
    ordersSheet = spreadsheet.insertSheet(SHEETS.ORDERS);
  }

  const defaultHeaders = [
    'OrderID', 'OrderNumber', 'OrderDate', 'CustomerName', 'CustomerPhone', 'AltPhone',
    'CustomerAddress', 'District', 'OrderSource', 'ItemsJSON', 'SubTotal', 'DiscountAmount',
    'DeliveryCharge', 'TotalAmount', 'AdvancePaid', 'DueAmount', 'CourierName', 'TrackingID',
    'Status', 'PaymentStatus', 'PaymentMethod', 'RiskLevel', 'Notes', 'StockReserved',
    'CreatedAt', 'UpdatedAt', 'CreatedBy', 'ConsignmentID', 'SmsStatus', 'SmsSentAt'
  ];

  if (ordersSheet.getLastRow() === 0) {
    ordersSheet.appendRow(defaultHeaders);
    return ordersSheet;
  }

  // বিদ্যমান শিটে অনুপস্থিত কলাম (ConsignmentID, SmsStatus, SmsSentAt) স্বয়ংক্রিয়ভাবে ডানপাশে যোগ করা
  const lastCol = ordersSheet.getLastColumn();
  if (lastCol > 0) {
    const headers = ordersSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const missing = ['ConsignmentID', 'SmsStatus', 'SmsSentAt'].filter(h => findCol(headers, h) === -1);
    if (missing.length > 0) {
      for (let m = 0; m < missing.length; m++) {
        ordersSheet.getRange(1, lastCol + 1 + m).setValue(missing[m]);
      }
    }
  }

  return ordersSheet;
}

function handleCreateOrder(spreadsheet, payload) {
  const ordersSheet = ensureOrdersSheet(spreadsheet);
  const now = new Date();
  const orderId = payload.OrderID || payload.orderId || `ORD-${now.getTime().toString().slice(-6)}`;
  const orderDate = payload.OrderDate || payload.orderDate || Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  const items = Array.isArray(payload.Items) ? payload.Items : (Array.isArray(payload.items) ? payload.items : []);
  const itemsJson = JSON.stringify(items);

  const subTotal = Number(payload.SubTotal || payload.subTotal || 0);
  const discountAmount = Number(payload.DiscountAmount || payload.discountAmount || 0);
  const deliveryCharge = Number(payload.DeliveryCharge || payload.deliveryCharge || 0);
  const totalAmount = Number(payload.TotalAmount || payload.totalAmount || 0);
  const advancePaid = Number(payload.AdvancePaid || payload.advancePaid || 0);
  const dueAmount = Number(payload.DueAmount || payload.dueAmount || 0);

  // স্টক কর্তন (যদি StockReserved অন থাকে)
  if (payload.StockReserved && items.length > 0) {
    try {
      const productsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.PRODUCTS);
      if (productsSheet && productsSheet.getLastRow() > 1) {
        const pData = productsSheet.getDataRange().getValues();
        const pHeaders = pData[0];
        const idCol = findCol(pHeaders, 'ProductID', 'ID');
        const stockCol = findCol(pHeaders, 'StockQuantity', 'Stock');
        if (idCol !== -1 && stockCol !== -1) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const pId = String(item.productId || item.ProductID || '').trim();
            const qty = Number(item.quantity || item.Quantity || 0);
            if (pId && qty > 0) {
              for (let r = 1; r < pData.length; r++) {
                if (String(pData[r][idCol]).trim() === pId) {
                  const currentStock = Number(pData[r][stockCol]) || 0;
                  const newStock = Math.max(0, currentStock - qty);
                  productsSheet.getRange(r + 1, stockCol + 1).setValue(newStock);
                  break;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      Logger.log('Order stock deduction error: ' + e);
    }
  }

  ordersSheet.appendRow([
    orderId,
    payload.OrderNumber || '',
    orderDate,
    payload.CustomerName || '',
    payload.CustomerPhone || '',
    payload.AltPhone || '',
    payload.CustomerAddress || '',
    payload.District || '',
    payload.OrderSource || 'Direct',
    itemsJson,
    subTotal,
    discountAmount,
    deliveryCharge,
    totalAmount,
    advancePaid,
    dueAmount,
    payload.CourierName || 'Steadfast',
    payload.TrackingID || '',
    payload.Status || 'Pending',
    payload.PaymentStatus || 'Unpaid',
    payload.PaymentMethod || 'COD',
    payload.RiskLevel || 'Low',
    payload.Notes || '',
    payload.StockReserved ? true : false,
    now,
    now,
    payload.CreatedBy || 'Admin'
  ]);

  return {
    success: true,
    message: 'অর্ডার সফলভাবে তৈরি ও সংরক্ষিত হয়েছে!',
    data: { orderId: orderId }
  };
}

function handleUpdateOrderStatus(spreadsheet, payload) {
  const ordersSheet = ensureOrdersSheet(spreadsheet);
  const targetId = String(payload.orderId || payload.OrderID || '').trim();
  const newStatus = String(payload.status || payload.Status || '').trim();
  if (!targetId || !newStatus) {
    return { success: false, message: 'অর্ডার আইডি বা স্ট্যাটাস পাওয়া যায়নি।' };
  }

  const data = ordersSheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: false, message: 'অর্ডার তালিকায় কোনো রেকর্ড নেই।' };
  }

  const headers = data[0];
  const idCol = findCol(headers, 'OrderID', 'ID');
  const statusCol = findCol(headers, 'Status');
  const trackingCol = findCol(headers, 'TrackingID', 'TrackingCode');
  const courierCol = findCol(headers, 'CourierName', 'Courier');
  const updatedCol = findCol(headers, 'UpdatedAt');
  const itemsCol = findCol(headers, 'ItemsJSON', 'Items');
  const reservedCol = findCol(headers, 'StockReserved');

  if (idCol === -1 || statusCol === -1) {
    return { success: false, message: 'প্রয়োজনীয় কলাম পাওয়া যায়নি।' };
  }

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]).trim() === targetId) {
      const prevStatus = String(data[r][statusCol]).trim();
      const isReserved = reservedCol !== -1 ? Boolean(data[r][reservedCol]) : true;

      // রিটার্ন বা ক্যান্সেল হলে অটো রিস্টক (Restock on Return)
      if ((newStatus === 'Returned' || newStatus === 'Cancelled') && prevStatus !== 'Returned' && prevStatus !== 'Cancelled' && isReserved && itemsCol !== -1) {
        try {
          const rawItems = data[r][itemsCol];
          const items = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
          if (Array.isArray(items)) {
            const productsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.PRODUCTS);
            if (productsSheet) {
              const pData = productsSheet.getDataRange().getValues();
              const pHeaders = pData[0];
              const pIdCol = findCol(pHeaders, 'ProductID', 'ID');
              const pStockCol = findCol(pHeaders, 'StockQuantity', 'Stock');
              if (pIdCol !== -1 && pStockCol !== -1) {
                for (let k = 0; k < items.length; k++) {
                  const it = items[k];
                  const pId = String(it.productId || it.ProductID || '').trim();
                  const qty = Number(it.quantity || it.Quantity || 0);
                  if (pId && qty > 0) {
                    for (let pr = 1; pr < pData.length; pr++) {
                      if (String(pData[pr][pIdCol]).trim() === pId) {
                        const curStock = Number(pData[pr][pStockCol]) || 0;
                        productsSheet.getRange(pr + 1, pStockCol + 1).setValue(curStock + qty);
                        break;
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          Logger.log('Restock error: ' + e);
        }
      }

      ordersSheet.getRange(r + 1, statusCol + 1).setValue(newStatus);
      if (payload.trackingId !== undefined && trackingCol !== -1) {
        ordersSheet.getRange(r + 1, trackingCol + 1).setValue(payload.trackingId);
      }
      if (payload.courierName !== undefined && courierCol !== -1) {
        ordersSheet.getRange(r + 1, courierCol + 1).setValue(payload.courierName);
      }
      const consignmentCol = findCol(headers, 'ConsignmentID', 'ConsignmentId', 'CID');
      if (payload.consignmentId !== undefined && consignmentCol !== -1) {
        ordersSheet.getRange(r + 1, consignmentCol + 1).setValue(payload.consignmentId);
      }
      const smsStatusCol = findCol(headers, 'SmsStatus', 'SMSStatus');
      const smsSentAtCol = findCol(headers, 'SmsSentAt', 'SMSSentAt');
      if (payload.smsStatus !== undefined && smsStatusCol !== -1) {
        ordersSheet.getRange(r + 1, smsStatusCol + 1).setValue(payload.smsStatus);
        if (smsSentAtCol !== -1) {
          ordersSheet.getRange(r + 1, smsSentAtCol + 1).setValue(new Date());
        }
      }
      if (updatedCol !== -1) {
        ordersSheet.getRange(r + 1, updatedCol + 1).setValue(new Date());
      }

      return { success: true, message: 'অর্ডার স্ট্যাটাস সফলভাবে আপডেট হয়েছে।' };
    }
  }

  return { success: false, message: 'অর্ডার পাওয়া যায়নি।' };
}

/**
 * একাধিক অর্ডারের স্ট্যাটাস, কুরিয়ার ও ট্র্যাকিং তথ্য বাল্ক আপডেট করার হ্যান্ডলার
 */
function handleBulkUpdateOrderStatus(spreadsheet, payload) {
  const ordersSheet = ensureOrdersSheet(spreadsheet);
  const orderIds = Array.isArray(payload.orderIds) ? payload.orderIds : [];
  if (orderIds.length === 0) {
    return { success: false, message: 'কোনো অর্ডার আইডি প্রদান করা হয়নি।' };
  }

  const targetStatus = payload.status ? String(payload.status).trim() : '';
  const targetCourier = payload.courierName ? String(payload.courierName).trim() : '';
  const trackingMap = payload.trackingMap || {};
  const consignmentMap = payload.consignmentMap || {};
  const smsStatusMap = payload.smsStatusMap || {};

  const data = ordersSheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: false, message: 'অর্ডার শিটে কোনো রেকর্ড নেই।' };
  }

  const headers = data[0];
  const idCol = findCol(headers, 'OrderID', 'ID');
  const statusCol = findCol(headers, 'Status');
  const trackingCol = findCol(headers, 'TrackingID', 'TrackingCode');
  const courierCol = findCol(headers, 'CourierName', 'Courier');
  const consignmentCol = findCol(headers, 'ConsignmentID', 'ConsignmentId', 'CID');
  const smsStatusCol = findCol(headers, 'SmsStatus', 'SMSStatus');
  const smsSentAtCol = findCol(headers, 'SmsSentAt', 'SMSSentAt');
  const updatedCol = findCol(headers, 'UpdatedAt');

  if (idCol === -1) {
    return { success: false, message: 'OrderID কলাম খুঁজে পাওয়া যায়নি।' };
  }

  const idSet = new Set(orderIds.map(id => String(id).trim().toLowerCase()));
  let updatedCount = 0;
  const now = new Date();

  for (let r = 1; r < data.length; r++) {
    const rowId = String(data[r][idCol]).trim();
    if (idSet.has(rowId.toLowerCase())) {
      if (targetStatus && statusCol !== -1) {
        ordersSheet.getRange(r + 1, statusCol + 1).setValue(targetStatus);
      }
      if (targetCourier && courierCol !== -1) {
        ordersSheet.getRange(r + 1, courierCol + 1).setValue(targetCourier);
      }
      if (trackingMap[rowId] && trackingCol !== -1) {
        ordersSheet.getRange(r + 1, trackingCol + 1).setValue(trackingMap[rowId]);
      }
      if (consignmentMap[rowId] && consignmentCol !== -1) {
        ordersSheet.getRange(r + 1, consignmentCol + 1).setValue(consignmentMap[rowId]);
      }
      if (smsStatusMap[rowId] && smsStatusCol !== -1) {
        ordersSheet.getRange(r + 1, smsStatusCol + 1).setValue(smsStatusMap[rowId]);
        if (smsSentAtCol !== -1) {
          ordersSheet.getRange(r + 1, smsSentAtCol + 1).setValue(now);
        }
      }
      if (updatedCol !== -1) {
        ordersSheet.getRange(r + 1, updatedCol + 1).setValue(now);
      }
      updatedCount++;
    }
  }

  SpreadsheetApp.flush();

  return {
    success: true,
    message: `${updatedCount} টি অর্ডারের তথ্য সফলভাবে বাল্ক আপডেট হয়েছে।`,
    data: { updatedCount: updatedCount }
  };
}

/**
 * Steadfast Courier API-তে এক ক্লিকে বাল্ক বুকিং হ্যান্ডলার
 */
function handleSteadfastBulkDispatch(spreadsheet, payload) {
  const settingsSheet = ensureSettingsSheet(spreadsheet);
  const sData = settingsSheet.getDataRange().getValues();
  const sHeaders = sData[0];
  const apiKeyCol = findCol(sHeaders, 'SteadfastApiKey', 'SteadfastKey');
  const secretKeyCol = findCol(sHeaders, 'SteadfastSecretKey', 'SteadfastSecret');

  let apiKey = (apiKeyCol !== -1 && sData.length > 1) ? String(sData[1][apiKeyCol] || '').trim() : '';
  let secretKey = (secretKeyCol !== -1 && sData.length > 1) ? String(sData[1][secretKeyCol] || '').trim() : '';

  if (payload.apiKey) apiKey = String(payload.apiKey).trim();
  if (payload.secretKey) secretKey = String(payload.secretKey).trim();

  if (!apiKey || !secretKey) {
    return {
      success: false,
      message: 'Steadfast API Key অথবা Secret Key কনফিগার করা নেই। অনুগ্রহ করে Settings থেকে কুরিয়ার সেটিংস পূরণ করুন।'
    };
  }

  const orders = Array.isArray(payload.orders) ? payload.orders : [];
  if (orders.length === 0) {
    return { success: false, message: 'বুকিংয়ের জন্য কোনো অর্ডার পাওয়া যায়নি।' };
  }

  const bulkData = orders.map(ord => {
    const codAmount = Number(ord.dueAmount !== undefined ? ord.dueAmount : (ord.DueAmount !== undefined ? ord.DueAmount : (ord.TotalAmount || 0)));
    return {
      invoice: String(ord.orderNumber || ord.OrderNumber || ord.orderId || ord.OrderID || '').trim(),
      recipient_name: String(ord.customerName || ord.CustomerName || 'Customer').trim(),
      recipient_phone: String(ord.customerPhone || ord.CustomerPhone || '').trim(),
      recipient_address: String(ord.customerAddress || ord.CustomerAddress || 'Bangladesh').trim(),
      cod_amount: codAmount,
      note: String(ord.notes || ord.Notes || 'Handle with care').trim()
    };
  });

  try {
    const url = 'https://portal.steadfast.com.bd/api/v1/create_order/bulk-order';
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey
      },
      payload: JSON.stringify({ data: bulkData }),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const respCode = response.getResponseCode();
    const respText = response.getContentText();
    const resultJson = JSON.parse(respText);

    if (respCode === 200 && (resultJson.status === 200 || Array.isArray(resultJson.data))) {
      const results = Array.isArray(resultJson.data) ? resultJson.data : (Array.isArray(resultJson.consignment) ? resultJson.consignment : []);
      const trackingMap = {};
      const consignmentMap = {};

      results.forEach(item => {
        const inv = String(item.invoice || '').trim();
        if (inv) {
          trackingMap[inv] = item.tracking_code || '';
          consignmentMap[inv] = item.consignment_id || '';
        }
      });

      const orderIds = orders.map(o => o.orderId || o.OrderID || o.orderNumber || o.OrderNumber);
      handleBulkUpdateOrderStatus(spreadsheet, {
        orderIds: orderIds,
        status: 'In Transit',
        courierName: 'Steadfast',
        trackingMap: trackingMap,
        consignmentMap: consignmentMap
      });

      return {
        success: true,
        message: `${results.length} টি অর্ডার সফলভাবে Steadfast-এ বুকিং সম্পন্ন হয়েছে এবং ট্র্যাকিং আইডি যুক্ত হয়েছে।`,
        data: {
          consignments: results,
          trackingMap: trackingMap,
          consignmentMap: consignmentMap
        }
      };
    } else {
      return {
        success: false,
        message: resultJson.message || `Steadfast ত্রুটি (Code ${respCode}): ${respText}`,
        rawResponse: resultJson
      };
    }
  } catch (err) {
    return {
      success: false,
      message: `Steadfast এপিআই সার্ভারে রিকোয়েস্ট পাঠাতে ব্যর্থ: ${err.message}`
    };
  }
}

/**
 * Steadfast লাইভ ট্র্যাকিং স্ট্যাটাস পাওয়ার হ্যান্ডলার
 */
function handleSteadfastCheckStatus(spreadsheet, payload) {
  const settingsSheet = ensureSettingsSheet(spreadsheet);
  const sData = settingsSheet.getDataRange().getValues();
  const sHeaders = sData[0];
  const apiKeyCol = findCol(sHeaders, 'SteadfastApiKey', 'SteadfastKey');
  const secretKeyCol = findCol(sHeaders, 'SteadfastSecretKey', 'SteadfastSecret');

  let apiKey = (apiKeyCol !== -1 && sData.length > 1) ? String(sData[1][apiKeyCol] || '').trim() : '';
  let secretKey = (secretKeyCol !== -1 && sData.length > 1) ? String(sData[1][secretKeyCol] || '').trim() : '';
  if (payload.apiKey) apiKey = String(payload.apiKey).trim();
  if (payload.secretKey) secretKey = String(payload.secretKey).trim();

  if (!apiKey || !secretKey) {
    return { success: false, message: 'Steadfast API Key কনফিগার করা নেই।' };
  }

  const cid = payload.consignmentId || payload.ConsignmentID;
  const trackingCode = payload.trackingCode || payload.TrackingCode || payload.trackingId;
  const invoice = payload.invoice || payload.InvoiceNo || payload.orderNumber;

  let url = '';
  if (cid) {
    url = `https://portal.steadfast.com.bd/api/v1/status_by_cid/${encodeURIComponent(cid)}`;
  } else if (trackingCode) {
    url = `https://portal.steadfast.com.bd/api/v1/status_by_trackingcode/${encodeURIComponent(trackingCode)}`;
  } else if (invoice) {
    url = `https://portal.steadfast.com.bd/api/v1/status_by_invoice/${encodeURIComponent(invoice)}`;
  } else {
    return { success: false, message: 'Consignment ID অথবা Tracking Code প্রদান করুন।' };
  }

  try {
    const options = {
      method: 'get',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey
      },
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    const respText = response.getContentText();
    const result = JSON.parse(respText);

    return {
      success: response.getResponseCode() === 200,
      data: result.delivery_status || result.status || result
    };
  } catch (err) {
    return { success: false, message: `ট্র্যাকিং তথ্য আনতে ব্যর্থ: ${err.message}` };
  }
}

/**
 * স্বয়ংক্রিয় SMS নোটিফিকেশন পাঠানোর হ্যান্ডলার
 */
function handleSendSmsNotification(spreadsheet, payload) {
  const settingsSheet = ensureSettingsSheet(spreadsheet);
  const sData = settingsSheet.getDataRange().getValues();
  const sHeaders = sData[0];
  const providerCol = findCol(sHeaders, 'SmsProvider');
  const apiKeyCol = findCol(sHeaders, 'SmsApiKey', 'SmsKey');
  const senderIdCol = findCol(sHeaders, 'SmsSenderId', 'SenderId');

  let provider = (providerCol !== -1 && sData.length > 1) ? String(sData[1][providerCol] || '').trim() : 'Greenweb';
  let apiKey = (apiKeyCol !== -1 && sData.length > 1) ? String(sData[1][apiKeyCol] || '').trim() : '';
  let senderId = (senderIdCol !== -1 && sData.length > 1) ? String(sData[1][senderIdCol] || '').trim() : '';

  if (payload.apiKey) apiKey = String(payload.apiKey).trim();
  if (payload.senderId) senderId = String(payload.senderId).trim();
  if (payload.provider) provider = String(payload.provider).trim();

  const phone = String(payload.phone || payload.CustomerPhone || '').replace(/[^0-9]/g, '');
  const message = String(payload.message || '').trim();
  const orderId = payload.orderId || payload.OrderID || '';

  if (!phone || !message) {
    return { success: false, message: 'ফোন নম্বর এবং মেসেজ টেক্সট আবশ্যক।' };
  }

  if (!apiKey) {
    return { success: false, message: 'SMS API Key কনফিগার করা নেই। অনুগ্রহ করে Settings থেকে SMS গেটওয়ে সেটআপ করুন।' };
  }

  try {
    let url = '';
    let options = { method: 'get', muteHttpExceptions: true };

    if (provider.toLowerCase() === 'greenweb') {
      url = `https://api.greenweb.com.bd/api.php?token=${encodeURIComponent(apiKey)}&to=${encodeURIComponent(phone)}&message=${encodeURIComponent(message)}`;
    } else if (provider.toLowerCase() === 'bulksmsbd') {
      url = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&number=${encodeURIComponent(phone)}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(message)}`;
    } else {
      url = `https://api.greenweb.com.bd/api.php?token=${encodeURIComponent(apiKey)}&to=${encodeURIComponent(phone)}&message=${encodeURIComponent(message)}`;
    }

    const response = UrlFetchApp.fetch(url, options);
    const respText = response.getContentText();

    if (orderId) {
      handleBulkUpdateOrderStatus(spreadsheet, {
        orderIds: [orderId],
        smsStatusMap: { [orderId]: 'Sent' }
      });
    }

    return {
      success: true,
      message: 'SMS সফলভাবে পাঠানো হয়েছে!',
      response: respText
    };
  } catch (err) {
    return {
      success: false,
      message: `SMS পাঠাতে ব্যর্থ: ${err.message}`
    };
  }
}

/**
 * ============================================================================
 * Phase 4: সাপ্লায়ার ও পারচেজ অর্ডার (PO) হ্যান্ডলারসমূহ
 * ============================================================================
 */

/**
 * সাপ্লায়ার তৈরি বা আপডেট করার হ্যান্ডলার
 */
function handleSaveSupplier(spreadsheet, payload) {
  const suppliersSheet = ensureSuppliersSheet(spreadsheet);
  const companyName = String(payload.companyName || payload.CompanyName || '').trim();
  const contactPerson = String(payload.contactPerson || payload.ContactPerson || '').trim();
  const phone = String(payload.phone || payload.Phone || '').trim();
  const email = String(payload.email || payload.Email || '').trim();
  const address = String(payload.address || payload.Address || '').trim();
  const notes = String(payload.notes || payload.Notes || '').trim();
  let supplierId = String(payload.supplierId || payload.SupplierID || '').trim();

  if (!companyName && !contactPerson) {
    return { success: false, message: 'প্রতিষ্ঠানের নাম অথবা যোগাযোগের ব্যক্তির নাম আবশ্যক।' };
  }

  const existingSuppliers = getSheetRowsAsObjects(SHEETS.SUPPLIERS);
  const existing = existingSuppliers.find(s => 
    (supplierId && String(s.SupplierID || '').trim() === supplierId) ||
    (phone && String(s.Phone || '').trim() === phone)
  );

  const lastCol = suppliersSheet.getLastColumn();
  const headers = suppliersSheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const colMap = {
    SupplierID: findCol(headers, 'SupplierID', 'ID'),
    CompanyName: findCol(headers, 'CompanyName', 'Company'),
    ContactPerson: findCol(headers, 'ContactPerson', 'Person', 'Name'),
    Phone: findCol(headers, 'Phone', 'Mobile'),
    Email: findCol(headers, 'Email'),
    Address: findCol(headers, 'Address'),
    TotalPurchased: findCol(headers, 'TotalPurchased'),
    TotalPaid: findCol(headers, 'TotalPaid'),
    CurrentPayable: findCol(headers, 'CurrentPayable', 'Payable', 'Due'),
    Notes: findCol(headers, 'Notes'),
    CreatedAt: findCol(headers, 'CreatedAt'),
    UpdatedAt: findCol(headers, 'UpdatedAt')
  };

  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  if (existing && existing._rowIndex) {
    if (companyName && colMap.CompanyName !== -1) suppliersSheet.getRange(existing._rowIndex, colMap.CompanyName + 1).setValue(companyName);
    if (contactPerson && colMap.ContactPerson !== -1) suppliersSheet.getRange(existing._rowIndex, colMap.ContactPerson + 1).setValue(contactPerson);
    if (phone && colMap.Phone !== -1) suppliersSheet.getRange(existing._rowIndex, colMap.Phone + 1).setValue(phone);
    if (email && colMap.Email !== -1) suppliersSheet.getRange(existing._rowIndex, colMap.Email + 1).setValue(email);
    if (address && colMap.Address !== -1) suppliersSheet.getRange(existing._rowIndex, colMap.Address + 1).setValue(address);
    if (notes && colMap.Notes !== -1) suppliersSheet.getRange(existing._rowIndex, colMap.Notes + 1).setValue(notes);
    if (colMap.UpdatedAt !== -1) suppliersSheet.getRange(existing._rowIndex, colMap.UpdatedAt + 1).setValue(timestampStr);

    SpreadsheetApp.flush();
    return {
      success: true,
      message: `'${companyName || contactPerson}' সাপ্লায়ার তথ্য সফলভাবে আপডেট হয়েছে।`,
      data: {
        ...existing,
        CompanyName: companyName || existing.CompanyName,
        ContactPerson: contactPerson || existing.ContactPerson,
        Phone: phone || existing.Phone,
        Email: email || existing.Email,
        Address: address || existing.Address,
        Notes: notes || existing.Notes,
        UpdatedAt: timestampStr
      }
    };
  }

  if (!supplierId) {
    supplierId = generateUniqueId('SUP');
  }

  const newRow = new Array(headers.length).fill('');
  if (colMap.SupplierID !== -1) newRow[colMap.SupplierID] = supplierId;
  if (colMap.CompanyName !== -1) newRow[colMap.CompanyName] = companyName;
  if (colMap.ContactPerson !== -1) newRow[colMap.ContactPerson] = contactPerson;
  if (colMap.Phone !== -1) newRow[colMap.Phone] = phone;
  if (colMap.Email !== -1) newRow[colMap.Email] = email;
  if (colMap.Address !== -1) newRow[colMap.Address] = address;
  if (colMap.TotalPurchased !== -1) newRow[colMap.TotalPurchased] = Number(payload.totalPurchased || 0);
  if (colMap.TotalPaid !== -1) newRow[colMap.TotalPaid] = Number(payload.totalPaid || 0);
  if (colMap.CurrentPayable !== -1) newRow[colMap.CurrentPayable] = Number(payload.currentPayable || 0);
  if (colMap.Notes !== -1) newRow[colMap.Notes] = notes;
  if (colMap.CreatedAt !== -1) newRow[colMap.CreatedAt] = timestampStr;
  if (colMap.UpdatedAt !== -1) newRow[colMap.UpdatedAt] = timestampStr;

  suppliersSheet.appendRow(newRow);
  SpreadsheetApp.flush();

  return {
    success: true,
    message: `'${companyName || contactPerson}' নতুন সাপ্লায়ার হিসেবে সফলভাবে নিবন্ধিত হয়েছে।`,
    data: {
      SupplierID: supplierId,
      CompanyName: companyName,
      ContactPerson: contactPerson,
      Phone: phone,
      Email: email,
      Address: address,
      TotalPurchased: Number(payload.totalPurchased || 0),
      TotalPaid: Number(payload.totalPaid || 0),
      CurrentPayable: Number(payload.currentPayable || 0),
      Notes: notes,
      CreatedAt: timestampStr,
      UpdatedAt: timestampStr
    }
  };
}

/**
 * সাপ্লায়ার মুছে ফেলার হ্যান্ডলার
 */
function handleDeleteSupplier(spreadsheet, payload) {
  const suppliersSheet = ensureSuppliersSheet(spreadsheet);
  const supplierId = String(payload.supplierId || payload.SupplierID || '').trim();

  if (!supplierId) {
    return { success: false, message: 'সাপ্লায়ার আইডি দেওয়া আবশ্যক।' };
  }

  const suppliers = getSheetRowsAsObjects(SHEETS.SUPPLIERS);
  const target = suppliers.find(s => String(s.SupplierID || '').trim() === supplierId);

  if (!target || !target._rowIndex) {
    return { success: false, message: 'সাপ্লায়ার ডাটাবেসে পাওয়া যায়নি।' };
  }

  suppliersSheet.deleteRow(target._rowIndex);
  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'সাপ্লায়ার সফলভাবে মুছে ফেলা হয়েছে।'
  };
}

/**
 * পারচেজ অর্ডার (PO) তৈরি করার হ্যান্ডলার
 * (যদি Status === 'Received' হয় তবে সাথে সাথেই Products শিটে স্টক যোগ করা এবং StockLogs এ অডিট এন্ট্রি সংরক্ষণ)
 */
function handleCreatePurchaseOrder(spreadsheet, payload) {
  const poSheet = ensurePurchaseOrdersSheet(spreadsheet);
  const suppliersSheet = ensureSuppliersSheet(spreadsheet);
  const ledgerSheet = ensureSupplierLedgerSheet(spreadsheet);
  const productsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.PRODUCTS);
  const stockLogsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.STOCK_LOGS);

  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const poId = String(payload.poId || payload.PO_ID || `PO-${now.getTime().toString().slice(-6)}`).trim();
  const supplierId = String(payload.supplierId || payload.SupplierID || '').trim();
  const supplierName = String(payload.supplierName || payload.SupplierName || '').trim();
  const supplierPhone = String(payload.supplierPhone || payload.SupplierPhone || '').trim();
  const paymentMethod = String(payload.paymentMethod || payload.PaymentMethod || 'Cash').trim();
  const status = String(payload.status || payload.Status || 'Ordered').trim();
  const receivedBy = String(payload.receivedBy || payload.ReceivedBy || 'Admin').trim();
  const notes = String(payload.notes || payload.Notes || '').trim();

  const items = Array.isArray(payload.items) ? payload.items : (Array.isArray(payload.Items) ? payload.Items : []);
  const itemsJson = JSON.stringify(items);

  const totalAmount = Number(payload.totalAmount !== undefined ? payload.totalAmount : payload.TotalAmount) || 0;
  const paidAmount = Number(payload.paidAmount !== undefined ? payload.paidAmount : payload.PaidAmount) || 0;
  const dueAmount = Number(payload.dueAmount !== undefined ? payload.dueAmount : (totalAmount - paidAmount)) || 0;

  // ১. PurchaseOrders শিটে নতুন রেকর্ড সেভ
  poSheet.appendRow([
    poId,
    timestampStr,
    supplierId,
    supplierName,
    supplierPhone,
    itemsJson,
    totalAmount,
    paidAmount,
    dueAmount,
    paymentMethod,
    status,
    status === 'Received' ? receivedBy : '',
    status === 'Received' ? timestampStr : '',
    notes,
    timestampStr,
    timestampStr
  ]);

  // ২. যদি পারচেজ অর্ডারটি রিসিভড (Received) অবস্থায় তৈরি হয়, তবে তাৎক্ষণিক পণ্য স্টক বৃদ্ধি (Auto-Restock)
  if (status === 'Received' && items.length > 0 && productsSheet) {
    try {
      const pData = productsSheet.getDataRange().getValues();
      const pHeaders = pData[0];
      const pIdCol = findCol(pHeaders, 'ProductID', 'ID');
      const pCostCol = findCol(pHeaders, 'CostPrice', 'Cost', 'BuyPrice');
      const pStockCol = findCol(pHeaders, 'StockQuantity', 'Stock', 'Quantity', 'Qty');
      const pUpdatedCol = findCol(pHeaders, 'UpdatedAt');

      items.forEach(item => {
        const prodId = String(item.productId || item.ProductID || '').trim();
        const incomingQty = Number(item.quantity || item.Quantity || 0);
        const unitCost = Number(item.costPrice !== undefined ? item.costPrice : (item.CostPrice !== undefined ? item.CostPrice : item.unitCost)) || 0;

        if (prodId && incomingQty > 0) {
          for (let r = 1; r < pData.length; r++) {
            if (String(pData[r][pIdCol]).trim() === prodId) {
              const currentStock = Number(pData[r][pStockCol]) || 0;
              const currentCost = Number(pData[r][pCostCol]) || 0;
              const newStock = currentStock + incomingQty;

              // ওয়েইটেড এভারেজ কস্ট
              let newCost = currentCost;
              if (unitCost > 0 && newStock > 0) {
                newCost = parseFloat((((currentStock * currentCost) + (incomingQty * unitCost)) / newStock).toFixed(2));
              }

              if (pStockCol !== -1) productsSheet.getRange(r + 1, pStockCol + 1).setValue(newStock);
              if (pCostCol !== -1 && unitCost > 0) productsSheet.getRange(r + 1, pCostCol + 1).setValue(newCost);
              if (pUpdatedCol !== -1) productsSheet.getRange(r + 1, pUpdatedCol + 1).setValue(now);

              // StockLogs শিটে ইনভেন্টরি ট্র্যাকিং
              if (stockLogsSheet) {
                stockLogsSheet.appendRow([
                  generateUniqueId('STKLOG'),
                  now,
                  prodId,
                  item.productName || item.ProductName || '',
                  'PO Purchase / Restock',
                  currentStock,
                  incomingQty,
                  newStock,
                  unitCost || newCost,
                  supplierName || 'Vendor',
                  receivedBy,
                  poId,
                  `PO ${poId} ক্রয়ের মাধ্যমে স্বয়ংক্রিয় স্টক বৃদ্ধি`
                ]);
              }
              break;
            }
          }
        }
      });
    } catch (restockErr) {
      Logger.log('PO auto restock warning: ' + restockErr.message);
    }
  }

  // ৩. সাপ্লায়ার ব্যালেন্স ও লেজার আপডেট (Supplier Ledger & Balance Persistence)
  if (supplierId || supplierName) {
    const suppliers = getSheetRowsAsObjects(SHEETS.SUPPLIERS);
    const targetSup = suppliers.find(s => 
      (supplierId && String(s.SupplierID || '').trim() === supplierId) ||
      (supplierName && String(s.CompanyName || s.ContactPerson || '').trim().toLowerCase() === supplierName.toLowerCase())
    );

    let currentPayable = 0;
    if (targetSup && targetSup._rowIndex) {
      const sHeaders = suppliersSheet.getRange(1, 1, 1, suppliersSheet.getLastColumn()).getValues()[0];
      const purCol = findCol(sHeaders, 'TotalPurchased');
      const paidCol = findCol(sHeaders, 'TotalPaid');
      const dueCol = findCol(sHeaders, 'CurrentPayable', 'Payable', 'Due');
      const updatedCol = findCol(sHeaders, 'UpdatedAt');

      const prevPurchased = Number(targetSup.TotalPurchased || 0);
      const prevPaid = Number(targetSup.TotalPaid || 0);
      const prevDue = Number(targetSup.CurrentPayable || 0);

      const newPurchased = prevPurchased + totalAmount;
      const newPaid = prevPaid + paidAmount;
      currentPayable = Math.max(0, prevDue + dueAmount);

      if (purCol !== -1) suppliersSheet.getRange(targetSup._rowIndex, purCol + 1).setValue(newPurchased);
      if (paidCol !== -1) suppliersSheet.getRange(targetSup._rowIndex, paidCol + 1).setValue(newPaid);
      if (dueCol !== -1) suppliersSheet.getRange(targetSup._rowIndex, dueCol + 1).setValue(currentPayable);
      if (updatedCol !== -1) suppliersSheet.getRange(targetSup._rowIndex, updatedCol + 1).setValue(timestampStr);
    }

    // ৪. SupplierLedger শিটে এন্ট্রি যুক্ত করা
    ledgerSheet.appendRow([
      generateUniqueId('SUP-LED'),
      timestampStr,
      supplierId || (targetSup ? targetSup.SupplierID : ''),
      supplierName || (targetSup ? (targetSup.CompanyName || targetSup.ContactPerson) : ''),
      supplierPhone,
      poId,
      'Purchase',
      paidAmount, // Debit: পরিশোধিত টাকা
      totalAmount, // Credit: বিলের মোট টাকা
      currentPayable, // Balance: বর্তমান নেট দেনা
      paymentMethod,
      payload.transactionRef || payload.TrxID || '',
      receivedBy,
      notes || `পারচেজ অর্ডার ${poId}`
    ]);
  }

  SpreadsheetApp.flush();

  return {
    success: true,
    message: `পারচেজ অর্ডার ${poId} সফলভাবে সম্পন্ন হয়েছে!`,
    data: {
      poId: poId,
      status: status
    }
  };
}

/**
 * পারচেজ অর্ডার স্ট্যাটাস আপডেট (যেমন: Ordered -> Received এ নেওয়া ও স্টক অটো-ইনপুট)
 */
function handleUpdatePOStatus(spreadsheet, payload) {
  const poSheet = ensurePurchaseOrdersSheet(spreadsheet);
  const productsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.PRODUCTS);
  const stockLogsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.STOCK_LOGS);

  const poId = String(payload.poId || payload.PO_ID || '').trim();
  const newStatus = String(payload.status || payload.Status || '').trim();
  const receivedBy = String(payload.receivedBy || payload.ReceivedBy || 'Admin').trim();

  if (!poId || !newStatus) {
    return { success: false, message: 'PO ID এবং নতুন স্ট্যাটাস আবশ্যক।' };
  }

  const poData = getSheetRowsAsObjects(SHEETS.PURCHASE_ORDERS);
  const targetPO = poData.find(p => String(p.PO_ID || '').trim() === poId);

  if (!targetPO || !targetPO._rowIndex) {
    return { success: false, message: 'পারচেজ অর্ডার পাওয়া যায়নি।' };
  }

  const prevStatus = String(targetPO.Status || '').trim();
  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  const headers = poSheet.getRange(1, 1, 1, poSheet.getLastColumn()).getValues()[0];
  const statusCol = findCol(headers, 'Status');
  const receivedByCol = findCol(headers, 'ReceivedBy');
  const receivedAtCol = findCol(headers, 'ReceivedAt');
  const updatedCol = findCol(headers, 'UpdatedAt');

  if (statusCol !== -1) poSheet.getRange(targetPO._rowIndex, statusCol + 1).setValue(newStatus);
  if (newStatus === 'Received') {
    if (receivedByCol !== -1) poSheet.getRange(targetPO._rowIndex, receivedByCol + 1).setValue(receivedBy);
    if (receivedAtCol !== -1) poSheet.getRange(targetPO._rowIndex, receivedAtCol + 1).setValue(timestampStr);

    // যদি পূর্বে Received না হয়ে থাকে, তবে এখন স্টক বৃদ্ধি করা (Auto-Restock)
    if (prevStatus !== 'Received' && productsSheet) {
      try {
        let items = [];
        if (typeof targetPO.ItemsJSON === 'string') {
          items = JSON.parse(targetPO.ItemsJSON);
        } else if (Array.isArray(targetPO.ItemsJSON)) {
          items = targetPO.ItemsJSON;
        }

        if (Array.isArray(items) && items.length > 0) {
          const pData = productsSheet.getDataRange().getValues();
          const pHeaders = pData[0];
          const pIdCol = findCol(pHeaders, 'ProductID', 'ID');
          const pCostCol = findCol(pHeaders, 'CostPrice', 'Cost', 'BuyPrice');
          const pStockCol = findCol(pHeaders, 'StockQuantity', 'Stock');
          const pUpdatedCol = findCol(pHeaders, 'UpdatedAt');

          items.forEach(item => {
            const prodId = String(item.productId || item.ProductID || '').trim();
            const incomingQty = Number(item.quantity || item.Quantity || 0);
            const unitCost = Number(item.costPrice !== undefined ? item.costPrice : (item.CostPrice !== undefined ? item.CostPrice : item.unitCost)) || 0;

            if (prodId && incomingQty > 0) {
              for (let r = 1; r < pData.length; r++) {
                if (String(pData[r][pIdCol]).trim() === prodId) {
                  const currentStock = Number(pData[r][pStockCol]) || 0;
                  const currentCost = Number(pData[r][pCostCol]) || 0;
                  const newStock = currentStock + incomingQty;

                  let newCost = currentCost;
                  if (unitCost > 0 && newStock > 0) {
                    newCost = parseFloat((((currentStock * currentCost) + (incomingQty * unitCost)) / newStock).toFixed(2));
                  }

                  if (pStockCol !== -1) productsSheet.getRange(r + 1, pStockCol + 1).setValue(newStock);
                  if (pCostCol !== -1 && unitCost > 0) productsSheet.getRange(r + 1, pCostCol + 1).setValue(newCost);
                  if (pUpdatedCol !== -1) productsSheet.getRange(r + 1, pUpdatedCol + 1).setValue(now);

                  if (stockLogsSheet) {
                    stockLogsSheet.appendRow([
                      generateUniqueId('STKLOG'),
                      now,
                      prodId,
                      item.productName || item.ProductName || '',
                      'PO Received',
                      currentStock,
                      incomingQty,
                      newStock,
                      unitCost || newCost,
                      targetPO.SupplierName || 'Supplier',
                      receivedBy,
                      poId,
                      `PO ${poId} রিসিভ করে স্টকে যোগ করা হয়েছে`
                    ]);
                  }
                  break;
                }
              }
            }
          });
        }
      } catch (e) {
        Logger.log('Update PO restock error: ' + e);
      }
    }
  }

  if (updatedCol !== -1) poSheet.getRange(targetPO._rowIndex, updatedCol + 1).setValue(timestampStr);
  SpreadsheetApp.flush();

  return {
    success: true,
    message: `পারচেজ অর্ডার ${poId} স্ট্যাটাস '${newStatus}' আপডেট হয়েছে।`,
    data: { poId: poId, status: newStatus }
  };
}

/**
 * সাপ্লায়ারের বকেয়া পাওনা পরিশোধ (Supplier Payment) হ্যান্ডলার
 */
function handleRecordSupplierPayment(spreadsheet, payload) {
  const suppliersSheet = ensureSuppliersSheet(spreadsheet);
  const ledgerSheet = ensureSupplierLedgerSheet(spreadsheet);

  const supplierId = String(payload.supplierId || payload.SupplierID || '').trim();
  const amount = Number(payload.amount || payload.Amount || 0);
  const paymentMethod = String(payload.paymentMethod || payload.PaymentMethod || 'Cash').trim();
  const trxId = String(payload.trxId || payload.TrxID || payload.transactionRef || '').trim();
  const collectedBy = String(payload.collectedBy || payload.CollectedBy || 'Admin').trim();
  const notes = String(payload.notes || payload.Notes || '').trim();

  if (!supplierId || amount <= 0) {
    return { success: false, message: 'সাপ্লায়ার আইডি এবং বৈধ পেমেন্ট পরিমাণ দিন।' };
  }

  const suppliers = getSheetRowsAsObjects(SHEETS.SUPPLIERS);
  const target = suppliers.find(s => String(s.SupplierID || '').trim() === supplierId);

  if (!target || !target._rowIndex) {
    return { success: false, message: 'সাপ্লায়ার ডাটাবেসে পাওয়া যায়নি।' };
  }

  const headers = suppliersSheet.getRange(1, 1, 1, suppliersSheet.getLastColumn()).getValues()[0];
  const paidCol = findCol(headers, 'TotalPaid');
  const dueCol = findCol(headers, 'CurrentPayable', 'Payable', 'Due');
  const updatedCol = findCol(headers, 'UpdatedAt');

  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  const prevPaid = Number(target.TotalPaid || 0);
  const prevDue = Number(target.CurrentPayable || 0);

  const newPaid = prevPaid + amount;
  const newDue = Math.max(0, prevDue - amount);

  if (paidCol !== -1) suppliersSheet.getRange(target._rowIndex, paidCol + 1).setValue(newPaid);
  if (dueCol !== -1) suppliersSheet.getRange(target._rowIndex, dueCol + 1).setValue(newDue);
  if (updatedCol !== -1) suppliersSheet.getRange(target._rowIndex, updatedCol + 1).setValue(timestampStr);

  // SupplierLedger এ পেমেন্ট এন্ট্রি
  ledgerSheet.appendRow([
    generateUniqueId('SUP-LED'),
    timestampStr,
    supplierId,
    target.CompanyName || target.ContactPerson || '',
    target.Phone || '',
    payload.poId || payload.PO_ID || '',
    'Payment',
    amount, // Debit: পরিশোধিত টাকা
    0,      // Credit: 0
    newDue, // Balance: অবশিষ্ট দেনা
    paymentMethod,
    trxId,
    collectedBy,
    notes || 'সাপ্লায়ারের বকেয়া পরিশোধ'
  ]);

  SpreadsheetApp.flush();

  return {
    success: true,
    message: `সাপ্লায়ারকে ৳${amount.toLocaleString('en-IN')} পরিশোধ সফলভাবে রেকর্ড হয়েছে। (অবশিষ্ট দেনা: ৳${newDue.toLocaleString('en-IN')})`,
    data: {
      supplierId: supplierId,
      amount: amount,
      totalPaid: newPaid,
      currentPayable: newDue
    }
  };
}

/**
 * ============================================================================
 * Phase 5: দৈনন্দিন খরচের খাতা (Expense Management)
 * ============================================================================
 */

/**
 * খরচের ভাউচার সংরক্ষণ বা আপডেট করা (handleSaveExpense)
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - খরচের ডাটা
 * @return {Object} ফলাফল
 */
function handleSaveExpense(spreadsheet, payload) {
  const expensesSheet = ensureExpensesSheet(spreadsheet);
  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const dateStr = payload.date || payload.Date || Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const expenseId = payload.expenseId || payload.ExpenseID || generateUniqueId('EXP');
  const category = payload.category || payload.Category || 'Other';
  const amount = Number(payload.amount !== undefined ? payload.amount : payload.Amount) || 0;
  const paymentMethod = payload.paymentMethod || payload.PaymentMethod || 'Cash';
  const description = payload.description || payload.Description || '';
  const receiptImage = payload.receiptImage || payload.ReceiptImage || '';
  const createdBy = payload.createdBy || payload.CreatedBy || 'Admin';

  const rows = getSheetRowsAsObjects(SHEETS.EXPENSES);
  const existing = rows.find(r => String(r.ExpenseID).trim() === String(expenseId).trim());

  if (existing && existing._rowIndex) {
    const headers = expensesSheet.getRange(1, 1, 1, expensesSheet.getLastColumn()).getValues()[0];
    const dateCol = findCol(headers, 'Date');
    const catCol = findCol(headers, 'Category');
    const amtCol = findCol(headers, 'Amount');
    const payCol = findCol(headers, 'PaymentMethod');
    const descCol = findCol(headers, 'Description');
    const imgCol = findCol(headers, 'ReceiptImage');
    const timeCol = findCol(headers, 'Timestamp');

    if (dateCol !== -1) expensesSheet.getRange(existing._rowIndex, dateCol + 1).setValue(dateStr);
    if (catCol !== -1) expensesSheet.getRange(existing._rowIndex, catCol + 1).setValue(category);
    if (amtCol !== -1) expensesSheet.getRange(existing._rowIndex, amtCol + 1).setValue(amount);
    if (payCol !== -1) expensesSheet.getRange(existing._rowIndex, payCol + 1).setValue(paymentMethod);
    if (descCol !== -1) expensesSheet.getRange(existing._rowIndex, descCol + 1).setValue(description);
    if (imgCol !== -1) expensesSheet.getRange(existing._rowIndex, imgCol + 1).setValue(receiptImage);
    if (timeCol !== -1) expensesSheet.getRange(existing._rowIndex, timeCol + 1).setValue(timestampStr);
  } else {
    expensesSheet.appendRow([
      expenseId,
      dateStr,
      category,
      amount,
      paymentMethod,
      description,
      receiptImage,
      createdBy,
      timestampStr
    ]);
  }

  SpreadsheetApp.flush();

  return {
    success: true,
    message: `খরচ সফলভাবে সংরক্ষিত হয়েছে: ৳${amount.toLocaleString('en-IN')}`,
    data: {
      ExpenseID: expenseId,
      Date: dateStr,
      Category: category,
      Amount: amount,
      PaymentMethod: paymentMethod,
      Description: description,
      ReceiptImage: receiptImage,
      CreatedBy: createdBy,
      Timestamp: timestampStr
    }
  };
}

/**
 * খরচের ভাউচার মুছে ফেলা (handleDeleteExpense)
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - { expenseId }
 * @return {Object} ফলাফল
 */
function handleDeleteExpense(spreadsheet, payload) {
  const expensesSheet = ensureExpensesSheet(spreadsheet);
  const expenseId = payload.expenseId || payload.ExpenseID;
  if (!expenseId) {
    return { success: false, message: 'খরচের আইডি প্রদান করা হয়নি।' };
  }

  const rows = getSheetRowsAsObjects(SHEETS.EXPENSES);
  const existing = rows.find(r => String(r.ExpenseID).trim() === String(expenseId).trim());

  if (existing && existing._rowIndex) {
    expensesSheet.deleteRow(existing._rowIndex);
    SpreadsheetApp.flush();
    return { success: true, message: 'খরচটি সফলভাবে মুছে ফেলা হয়েছে।' };
  }

  return { success: false, message: 'খরচের রেকর্ড পাওয়া যায়নি।' };
}

/**
 * ============================================================================
 * Phase 5: দৈনিক ক্যাশ রেজিস্টার ও ইওডি ক্লোজিং (Daily Cash Register & EOD)
 * ============================================================================
 */

/**
 * সকালের ক্যাশ রেজিস্টার সেশন খোলা (handleOpenCashRegister)
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - { openingBalance, openedBy, notes }
 * @return {Object} ফলাফল
 */
function handleOpenCashRegister(spreadsheet, payload) {
  const registerSheet = ensureCashRegisterSheet(spreadsheet);
  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const registerId = payload.registerId || payload.RegisterID || generateUniqueId('REG');
  const openingBalance = Number(payload.openingBalance !== undefined ? payload.openingBalance : payload.OpeningBalance) || 0;
  const openedBy = payload.openedBy || payload.OpenedBy || payload.CreatedBy || 'Admin';
  const notes = payload.notes || payload.Notes || '';

  // চেক করা যে ইতিমধ্যে কোনো ওপেন রেজিস্টার আছে কি না
  const rows = getSheetRowsAsObjects(SHEETS.CASH_REGISTER);
  const openSession = rows.find(r => String(r.Status).trim().toLowerCase() === 'open');

  if (openSession) {
    return {
      success: true,
      alreadyOpen: true,
      message: 'ইতিমধ্যে একটি সক্রিয় ক্যাশ রেজিস্টার সেশন চালু রয়েছে।',
      data: openSession
    };
  }

  registerSheet.appendRow([
    registerId,
    timestampStr, // OpeningDate
    '',           // ClosingDate
    openingBalance,
    0,            // CashSales
    0,            // CashIn
    0,            // CashOut
    openingBalance, // ExpectedCash
    0,            // ActualCash
    0,            // Difference
    'Open',       // Status
    openedBy,     // ClosedBy (or active user)
    notes,
    timestampStr
  ]);

  SpreadsheetApp.flush();

  return {
    success: true,
    message: `ক্যাশ রেজিস্টার সফলভাবে খোলা হয়েছে। ওপেনিং ব্যালেন্স: ৳${openingBalance.toLocaleString('en-IN')}`,
    data: {
      RegisterID: registerId,
      OpeningDate: timestampStr,
      ClosingDate: '',
      OpeningBalance: openingBalance,
      CashSales: 0,
      CashIn: 0,
      CashOut: 0,
      ExpectedCash: openingBalance,
      ActualCash: 0,
      Difference: 0,
      Status: 'Open',
      ClosedBy: openedBy,
      Notes: notes,
      Timestamp: timestampStr
    }
  };
}

/**
 * দিন শেষে ক্যাশ রেজিস্টার ক্লোজ ও EOD সম্পন্ন করা (handleCloseCashRegister)
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - { registerId, actualCash, cashSales, cashIn, cashOut, expectedCash, closedBy, notes }
 * @return {Object} ফলাফল
 */
function handleCloseCashRegister(spreadsheet, payload) {
  const registerSheet = ensureCashRegisterSheet(spreadsheet);
  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  const rows = getSheetRowsAsObjects(SHEETS.CASH_REGISTER);
  let target = null;

  if (payload.registerId || payload.RegisterID) {
    const regId = String(payload.registerId || payload.RegisterID).trim();
    target = rows.find(r => String(r.RegisterID).trim() === regId);
  }

  // যদি নির্দিষ্ট আইডি না মেলে তবে সর্বশেষ Open সেশনটি খোঁজা
  if (!target) {
    target = rows.reverse().find(r => String(r.Status).trim().toLowerCase() === 'open');
  }

  const actualCash = Number(payload.actualCash !== undefined ? payload.actualCash : payload.ActualCash) || 0;
  const cashSales = Number(payload.cashSales !== undefined ? payload.cashSales : payload.CashSales) || 0;
  const cashIn = Number(payload.cashIn !== undefined ? payload.cashIn : payload.CashIn) || 0;
  const cashOut = Number(payload.cashOut !== undefined ? payload.cashOut : payload.CashOut) || 0;
  const expectedCash = Number(payload.expectedCash !== undefined ? payload.expectedCash : payload.ExpectedCash) || (
    (target ? Number(target.OpeningBalance || 0) : 0) + cashSales + cashIn - cashOut
  );
  const difference = actualCash - expectedCash;
  const closedBy = payload.closedBy || payload.ClosedBy || 'Admin';
  const notes = payload.notes || payload.Notes || '';

  if (target && target._rowIndex) {
    const headers = registerSheet.getRange(1, 1, 1, registerSheet.getLastColumn()).getValues()[0];
    const closeDateCol = findCol(headers, 'ClosingDate');
    const cashSalesCol = findCol(headers, 'CashSales');
    const cashInCol = findCol(headers, 'CashIn');
    const cashOutCol = findCol(headers, 'CashOut');
    const expCashCol = findCol(headers, 'ExpectedCash');
    const actCashCol = findCol(headers, 'ActualCash');
    const diffCol = findCol(headers, 'Difference');
    const statusCol = findCol(headers, 'Status');
    const closedByCol = findCol(headers, 'ClosedBy');
    const notesCol = findCol(headers, 'Notes');
    const timeCol = findCol(headers, 'Timestamp');

    if (closeDateCol !== -1) registerSheet.getRange(target._rowIndex, closeDateCol + 1).setValue(timestampStr);
    if (cashSalesCol !== -1) registerSheet.getRange(target._rowIndex, cashSalesCol + 1).setValue(cashSales);
    if (cashInCol !== -1) registerSheet.getRange(target._rowIndex, cashInCol + 1).setValue(cashIn);
    if (cashOutCol !== -1) registerSheet.getRange(target._rowIndex, cashOutCol + 1).setValue(cashOut);
    if (expCashCol !== -1) registerSheet.getRange(target._rowIndex, expCashCol + 1).setValue(expectedCash);
    if (actCashCol !== -1) registerSheet.getRange(target._rowIndex, actCashCol + 1).setValue(actualCash);
    if (diffCol !== -1) registerSheet.getRange(target._rowIndex, diffCol + 1).setValue(difference);
    if (statusCol !== -1) registerSheet.getRange(target._rowIndex, statusCol + 1).setValue('Closed');
    if (closedByCol !== -1) registerSheet.getRange(target._rowIndex, closedByCol + 1).setValue(closedBy);
    if (notesCol !== -1) registerSheet.getRange(target._rowIndex, notesCol + 1).setValue(notes);
    if (timeCol !== -1) registerSheet.getRange(target._rowIndex, timeCol + 1).setValue(timestampStr);
  } else {
    // নতুন ক্লোজড রেকর্ড তৈরি করা
    const registerId = payload.registerId || generateUniqueId('REG');
    registerSheet.appendRow([
      registerId,
      timestampStr,
      timestampStr,
      Number(payload.openingBalance || 0),
      cashSales,
      cashIn,
      cashOut,
      expectedCash,
      actualCash,
      difference,
      'Closed',
      closedBy,
      notes,
      timestampStr
    ]);
  }

  SpreadsheetApp.flush();

  return {
    success: true,
    message: `ক্যাশ ড্রয়ার সফলভাবে ক্লোজ হয়েছে। ${difference === 0 ? 'হিসাব নিখুঁত মিলেছে।' : (difference > 0 ? `৳${difference} অতিরিক্ত জমা রয়েছে।` : `৳${Math.abs(difference)} ঘাটতি রয়েছে।`)}`,
    data: {
      ActualCash: actualCash,
      ExpectedCash: expectedCash,
      Difference: difference,
      Status: 'Closed',
      ClosedBy: closedBy,
      ClosedAt: timestampStr
    }
  };
}

/**
 * ============================================================================
 * Phase 5: ইউজার অ্যাক্টিভিটি ও সিকিউরিটি অডিট ট্রেইল (Activity Audit Trail)
 * ============================================================================
 */

/**
 * গুরুত্বপূর্ণ সিস্টেম অ্যাকশন অডিট লগে রেকর্ড করা (handleLogAuditEvent)
 * @param {Spreadsheet} spreadsheet - অ্যাক্টিভ স্প্রেডশিট
 * @param {Object} payload - { userId, userName, userRole, actionType, module, description, details }
 * @return {Object} ফলাফল
 */
function handleLogAuditEvent(spreadsheet, payload) {
  const auditSheet = ensureAuditLogsSheet(spreadsheet);
  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  const logId = generateUniqueId('LOG');
  const userId = payload.userId || payload.UserID || 'SYSTEM';
  const userName = payload.userName || payload.UserName || 'System User';
  const userRole = payload.userRole || payload.UserRole || 'Admin';
  const actionType = payload.actionType || payload.ActionType || 'GENERAL';
  const moduleName = payload.module || payload.Module || 'Core';
  const description = payload.description || payload.Description || '';
  let detailsJson = '';

  if (payload.details || payload.DetailsJson) {
    try {
      detailsJson = typeof (payload.details || payload.DetailsJson) === 'string'
        ? (payload.details || payload.DetailsJson)
        : JSON.stringify(payload.details || payload.DetailsJson);
    } catch (e) {
      detailsJson = '';
    }
  }

  auditSheet.appendRow([
    logId,
    timestampStr,
    userId,
    userName,
    userRole,
    actionType,
    moduleName,
    description,
    detailsJson
  ]);

  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'অডিট লগ সফলভাবে সংরক্ষিত হয়েছে।',
    data: { logId: logId, timestamp: timestampStr }
  };
}

/**
 * ============================================================================
 * Phase 7: সেলস রিটার্ন, পণ্য বিনিময়, স্টোর ক্রেডিট ও গোডাউন স্টক চালান
 * ============================================================================
 */

/**
 * সেলস রিটার্ন ও এক্সচেঞ্জ তৈরি করা (handleCreateSalesReturn)
 */
function handleCreateSalesReturn(spreadsheet, payload) {
  const returnsSheet = ensureSalesReturnsSheet(spreadsheet);
  const productsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.PRODUCTS);
  const stockLogsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.STOCK_LOGS);
  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  const returnId = generateUniqueId('RET');
  const invoiceNo = String(payload.invoiceNo || payload.InvoiceNo || '').trim();
  const customerId = payload.customerId || payload.CustomerID || 'GUEST';
  const customerName = payload.customerName || payload.CustomerName || 'Walk-in Customer';
  const customerPhone = payload.customerPhone || payload.CustomerPhone || '';
  const refundMethod = payload.refundMethod || payload.RefundMethod || 'Cash'; // 'Cash' | 'StoreCredit' | 'DeductDue' | 'Exchange'
  const reason = payload.reason || payload.Reason || 'Customer Return';
  const processedBy = payload.processedBy || payload.ProcessedBy || 'Cashier';
  const items = Array.isArray(payload.items) ? payload.items : [];

  let totalRefundAmount = Number(payload.totalRefundAmount || payload.refundAmount || 0);
  if (!totalRefundAmount && items.length > 0) {
    totalRefundAmount = items.reduce((sum, item) => sum + (Number(item.returnPrice || item.sellingPrice || 0) * Number(item.quantity || 1)), 0);
  }

  // স্টোর ক্রেডিট কোড তৈরি (যদি রিফান্ড মেথড StoreCredit হয়)
  let creditNoteCode = '';
  let creditNoteExpiry = '';
  let creditNoteStatus = 'None';

  if (refundMethod === 'StoreCredit' || payload.generateCreditNote) {
    creditNoteCode = 'SCN-' + Math.floor(100000 + Math.random() * 900000);
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + (Number(payload.creditValidityDays) || 60)); // ৬০ দিন মেয়াদ ডিফল্ট
    creditNoteExpiry = Utilities.formatDate(expDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    creditNoteStatus = 'Active';
  }

  // স্টক রিস্টক প্রক্রিয়া (যদি পণ্য ভালো অবস্থায় থাকে Resellable)
  let hasRestocked = false;
  if (productsSheet && items.length > 0) {
    const prodHeaders = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
    const stockColIdx = findCol(prodHeaders, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity');
    const prodIdColIdx = findCol(prodHeaders, 'ProductID', 'ID');
    const barcodeColIdx = findCol(prodHeaders, 'Barcode');
    const variantsColIdx = findCol(prodHeaders, 'VariantsJSON', 'Variants');
    const allProdData = productsSheet.getDataRange().getValues();

    for (let i = 0; i < items.length; i++) {
      const itm = items[i];
      const pid = String(itm.productId || itm.ProductID || '').trim();
      const variantId = itm.variantId || itm.VariantID || null;
      const qty = Number(itm.quantity) || 1;
      const condition = itm.condition || 'Resellable'; // 'Resellable' | 'Damaged'

      if (condition === 'Resellable') {
        hasRestocked = true;
        // প্রোডাক্ট রো খুঁজে বের করা
        for (let r = 1; r < allProdData.length; r++) {
          const rowId = String(allProdData[r][prodIdColIdx] || '').trim();
          const rowBarcode = barcodeColIdx !== -1 ? String(allProdData[r][barcodeColIdx] || '').trim() : '';

          if (rowId === pid || (rowBarcode && rowBarcode === pid)) {
            const currentStock = Number(allProdData[r][stockColIdx]) || 0;
            const newStock = currentStock + qty;
            productsSheet.getRange(r + 1, stockColIdx + 1).setValue(newStock);
            allProdData[r][stockColIdx] = newStock;

            // ভ্যারিয়েন্ট স্টক বৃদ্ধি
            if (variantsColIdx !== -1 && variantId) {
              try {
                const rawV = productsSheet.getRange(r + 1, variantsColIdx + 1).getValue();
                if (rawV) {
                  const parsedV = typeof rawV === 'string' ? JSON.parse(rawV) : rawV;
                  if (Array.isArray(parsedV)) {
                    const vIdx = parsedV.findIndex(v => String(v.VariantID || v.variantId || '').trim() === String(variantId).trim());
                    if (vIdx !== -1) {
                      parsedV[vIdx].StockQuantity = (Number(parsedV[vIdx].StockQuantity) || 0) + qty;
                      productsSheet.getRange(r + 1, variantsColIdx + 1).setValue(JSON.stringify(parsedV));
                    }
                  }
                }
              } catch (e) {}
            }

            // StockLogs এ লগ তৈরি
            if (stockLogsSheet) {
              stockLogsSheet.appendRow([
                generateUniqueId('LOG'),
                timestampStr,
                rowId,
                allProdData[r][findCol(prodHeaders, 'ProductName')] || itm.productName,
                'STOCK_IN_RETURN',
                qty,
                currentStock,
                newStock,
                `রিটার্ন মেমো #${invoiceNo} থেকে ফেরত (${condition})`
              ]);
            }
            break;
          }
        }
      } else {
        // Damaged পণ্য হলে StockLogs এ ড্যামেজ লগ
        if (stockLogsSheet) {
          stockLogsSheet.appendRow([
            generateUniqueId('LOG'),
            timestampStr,
            pid,
            itm.productName || 'Damaged Product',
            'STOCK_DAMAGED_RETURN',
            qty,
            0,
            0,
            `ত্রুটিযুক্ত পণ্য ফেরত #${invoiceNo} (বিক্রয় স্টকে যোগ হয়নি)`
          ]);
        }
      }
    }
  }

  // কাস্টমার বাকির খাতা থেকে বকেয়া সমন্বয় (যদি DeductDue হয়)
  if (refundMethod === 'DeductDue' && customerPhone) {
    try {
      const custSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.CUSTOMERS);
      if (custSheet && custSheet.getLastRow() > 1) {
        const cHeaders = custSheet.getRange(1, 1, 1, custSheet.getLastColumn()).getValues()[0];
        const phoneIdx = findCol(cHeaders, 'Phone', 'CustomerPhone');
        const dueIdx = findCol(cHeaders, 'CurrentDue', 'DueAmount', 'Due');
        if (phoneIdx !== -1 && dueIdx !== -1) {
          const cData = custSheet.getDataRange().getValues();
          for (let cr = 1; cr < cData.length; cr++) {
            if (String(cData[cr][phoneIdx]).trim() === String(customerPhone).trim()) {
              const currentDue = Number(cData[cr][dueIdx]) || 0;
              const newDue = Math.max(0, currentDue - totalRefundAmount);
              custSheet.getRange(cr + 1, dueIdx + 1).setValue(newDue);
              break;
            }
          }
        }
      }
    } catch (dueErr) {}
  }

  const itemsJsonStr = JSON.stringify(items);

  returnsSheet.appendRow([
    returnId,
    invoiceNo,
    timestampStr,
    customerId,
    customerName,
    customerPhone,
    itemsJsonStr,
    totalRefundAmount,
    refundMethod,
    creditNoteCode,
    creditNoteExpiry,
    creditNoteStatus,
    hasRestocked ? 'Yes' : 'No',
    reason,
    processedBy,
    timestampStr
  ]);

  SpreadsheetApp.flush();

  // অডিট লগ
  handleLogAuditEvent(spreadsheet, {
    userId: processedBy,
    userName: processedBy,
    userRole: 'Staff',
    actionType: 'SALES_RETURN',
    module: 'SalesReturns',
    description: `ইনভয়েস #${invoiceNo}-এর জন্য ৳${totalRefundAmount} টাকার পণ্য রিটার্ন সম্পন্ন হয়েছে। মেথড: ${refundMethod}`,
    details: { returnId, invoiceNo, totalRefundAmount, refundMethod, creditNoteCode }
  });

  return {
    success: true,
    message: refundMethod === 'StoreCredit'
      ? `রিটার্ন সফল হয়েছে! স্টোর ক্রেডিট ভাউচার: ${creditNoteCode} (৳${totalRefundAmount})`
      : `রিটার্ন সফলভাবে সম্পন্ন হয়েছে (৳${totalRefundAmount})।`,
    data: {
      ReturnID: returnId,
      InvoiceNo: invoiceNo,
      ReturnDate: timestampStr,
      CustomerID: customerId,
      CustomerName: customerName,
      CustomerPhone: customerPhone,
      Items: items,
      TotalRefundAmount: totalRefundAmount,
      RefundMethod: refundMethod,
      CreditNoteCode: creditNoteCode,
      CreditNoteExpiry: creditNoteExpiry,
      CreditNoteStatus: creditNoteStatus,
      Restocked: hasRestocked ? 'Yes' : 'No',
      Reason: reason,
      ProcessedBy: processedBy,
      CreatedAt: timestampStr
    }
  };
}

/**
 * স্টোর ক্রেডিট ভাউচার যাচাই ও রিডিম করা (handleRedeemStoreCredit)
 */
function handleRedeemStoreCredit(spreadsheet, payload) {
  const returnsSheet = ensureSalesReturnsSheet(spreadsheet);
  const targetCode = String(payload.creditNoteCode || payload.CreditNoteCode || '').trim().toUpperCase();

  if (!targetCode) {
    return { success: false, message: 'স্টোর ক্রেডিট কোড প্রদান করুন।' };
  }

  const lastRow = returnsSheet.getLastRow();
  if (lastRow <= 1) {
    return { success: false, message: 'কোনো স্টোর ক্রেডিট রেকর্ড পাওয়া যায়নি।' };
  }

  const headers = returnsSheet.getRange(1, 1, 1, returnsSheet.getLastColumn()).getValues()[0];
  const codeIdx = findCol(headers, 'CreditNoteCode');
  const statusIdx = findCol(headers, 'CreditNoteStatus');
  const amountIdx = findCol(headers, 'TotalRefundAmount');
  const expiryIdx = findCol(headers, 'CreditNoteExpiry');

  if (codeIdx === -1 || statusIdx === -1) {
    return { success: false, message: 'শিটে ক্রেডিট নোট কলাম অনুপস্থিত।' };
  }

  const data = returnsSheet.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    const rowCode = String(data[r][codeIdx] || '').trim().toUpperCase();
    if (rowCode === targetCode) {
      const currentStatus = String(data[r][statusIdx] || 'Active').trim();
      const creditAmount = Number(data[r][amountIdx]) || 0;
      const expiry = data[r][expiryIdx] ? new Date(data[r][expiryIdx]) : null;

      if (currentStatus === 'Redeemed') {
        return { success: false, message: `ভাউচার '${targetCode}' ইতিমধ্যে ব্যবহৃত হয়ে গেছে!` };
      }
      if (expiry && new Date() > expiry) {
        return { success: false, message: `ভাউচার '${targetCode}'-এর মেয়াদ উত্তীর্ণ হয়ে গেছে!` };
      }

      // স্ট্যাটাস Redeemed করা
      returnsSheet.getRange(r + 1, statusIdx + 1).setValue('Redeemed');
      SpreadsheetApp.flush();

      // অডিট লগ
      handleLogAuditEvent(spreadsheet, {
        userId: payload.cashier || 'Cashier',
        userName: payload.cashier || 'Cashier',
        userRole: 'Cashier',
        actionType: 'CREDIT_NOTE_REDEEM',
        module: 'SalesReturns',
        description: `স্টোর ক্রেডিট নোট ${targetCode} রিডিম করা হয়েছে (৳${creditAmount})`,
        details: { targetCode, creditAmount }
      });

      return {
        success: true,
        message: `স্টোর ক্রেডিট সফলভাবে ব্যবহৃত হয়েছে! (৳${creditAmount})`,
        data: {
          creditNoteCode: targetCode,
          creditAmount: creditAmount,
          customerName: data[r][findCol(headers, 'CustomerName')] || ''
        }
      };
    }
  }

  return { success: false, message: `ভাউচার কোড '${targetCode}' সঠিক নয় বা পাওয়া যায়নি।` };
}

/**
 * গোডাউন থেকে দোকানে স্টক ট্রান্সফার চালান তৈরি করা (handleCreateStockTransfer)
 */
function handleCreateStockTransfer(spreadsheet, payload) {
  const transferSheet = ensureStockTransfersSheet(spreadsheet);
  const productsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.PRODUCTS);
  const stockLogsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.STOCK_LOGS);
  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  const transferId = generateUniqueId('TRF');
  const challanNo = payload.challanNo || ('CHL-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyMM') + '-' + Math.floor(1000 + Math.random() * 9000));
  const transferDate = payload.transferDate || timestampStr;
  const fromLocation = payload.fromLocation || payload.FromLocation || 'Main Warehouse';
  const toLocation = payload.toLocation || payload.ToLocation || 'Main Shop';
  const driverName = payload.driverName || payload.DriverName || '';
  const notes = payload.notes || payload.Notes || '';
  const createdBy = payload.createdBy || payload.CreatedBy || 'Admin';
  const status = payload.status || 'In Transit'; // 'Pending' | 'In Transit' | 'Received' | 'Cancelled'
  const items = Array.isArray(payload.items) ? payload.items : [];

  let totalQty = 0;
  items.forEach(itm => { totalQty += (Number(itm.quantity) || 0); });

  // প্রেরক ও প্রাপক লোকেশন যাচাই
  const isFromWarehouse = /warehouse|godown|গোডাউন/i.test(fromLocation) || !/shop|store|counter|দোকান/i.test(fromLocation);
  const isFromShop = /shop|store|counter|দোকান/i.test(fromLocation);
  const isToShop = /shop|store|counter|দোকান/i.test(toLocation);
  const isReceived = (status === 'Received');

  // স্টক স্থানান্তর প্রসেসিং ও প্রোডাক্ট শিটে রিয়েল-টাইম আপডেট
  if (productsSheet && items.length > 0) {
    const prodHeaders = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
    const stockColIdx = findCol(prodHeaders, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity', 'Qty');
    const godownColIdx = findCol(prodHeaders, 'GodownStock', 'WarehouseStock', 'GodownQty');
    const prodIdColIdx = findCol(prodHeaders, 'ProductID', 'ID');
    const barcodeColIdx = findCol(prodHeaders, 'Barcode');
    const variantsColIdx = findCol(prodHeaders, 'VariantsJSON', 'Variants');
    const totalStockColIdx = findCol(prodHeaders, 'TotalStock');
    const updatedColIdx = findCol(prodHeaders, 'UpdatedAt');
    const allProdData = productsSheet.getDataRange().getValues();

    items.forEach(itm => {
      const pid = String(itm.productId || itm.ProductID || '').trim();
      const variantId = String(itm.variantId || itm.VariantID || '').trim();
      const qty = Number(itm.quantity) || 0;
      if (qty <= 0) return;

      for (let r = 1; r < allProdData.length; r++) {
        const rowId = String(allProdData[r][prodIdColIdx] || '').trim();
        const rowBarcode = barcodeColIdx !== -1 ? String(allProdData[r][barcodeColIdx] || '').trim() : '';
        if (rowId === pid || (rowBarcode && rowBarcode === pid)) {
          let currentShopStock = stockColIdx !== -1 ? (Number(allProdData[r][stockColIdx]) || 0) : 0;
          let currentGodownStock = godownColIdx !== -1 ? (Number(allProdData[r][godownColIdx]) || 0) : 0;
          let newShopStock = currentShopStock;
          let newGodownStock = currentGodownStock;

          // ১. প্রেরক স্থান থেকে স্টক কর্তন (উৎস গোডাউন বা দোকান)
          if (isFromWarehouse) {
            newGodownStock = Math.max(0, currentGodownStock - qty);
            if (godownColIdx !== -1) {
              productsSheet.getRange(r + 1, godownColIdx + 1).setValue(newGodownStock);
              allProdData[r][godownColIdx] = newGodownStock;
            }
            if (stockLogsSheet) {
              stockLogsSheet.appendRow([
                generateUniqueId('LOG'),
                timestampStr,
                rowId,
                allProdData[r][findCol(prodHeaders, 'ProductName')] || itm.productName,
                'TRANSFER_OUT',
                qty,
                currentGodownStock,
                newGodownStock,
                `গোডাউন থেকে চালান #${challanNo} স্থানান্তর (${fromLocation} ➔ ${toLocation})`
              ]);
            }
          } else if (isFromShop) {
            newShopStock = Math.max(0, currentShopStock - qty);
            if (stockColIdx !== -1) {
              productsSheet.getRange(r + 1, stockColIdx + 1).setValue(newShopStock);
              allProdData[r][stockColIdx] = newShopStock;
            }
            if (stockLogsSheet) {
              stockLogsSheet.appendRow([
                generateUniqueId('LOG'),
                timestampStr,
                rowId,
                allProdData[r][findCol(prodHeaders, 'ProductName')] || itm.productName,
                'TRANSFER_OUT',
                qty,
                currentShopStock,
                newShopStock,
                `দোকান থেকে চালান #${challanNo} স্থানান্তর (${fromLocation} ➔ ${toLocation})`
              ]);
            }
          }

          // ২. যদি সরাসরি দোকানে স্থানান্তর সম্পন্ন হয় (Received):
          if (isReceived && isToShop) {
            newShopStock = currentShopStock + qty;
            if (stockColIdx !== -1) {
              productsSheet.getRange(r + 1, stockColIdx + 1).setValue(newShopStock);
              allProdData[r][stockColIdx] = newShopStock;
            }
            if (stockLogsSheet) {
              stockLogsSheet.appendRow([
                generateUniqueId('LOG'),
                timestampStr,
                rowId,
                allProdData[r][findCol(prodHeaders, 'ProductName')] || itm.productName,
                'TRANSFER_IN',
                qty,
                currentShopStock,
                newShopStock,
                `দোকানে চালান #${challanNo} গ্রহণ সম্পন্ন (${fromLocation} ➔ ${toLocation})`
              ]);
            }
          }

          // ৩. মোট স্টক আপডেট
          if (totalStockColIdx !== -1) {
            productsSheet.getRange(r + 1, totalStockColIdx + 1).setValue(newShopStock + newGodownStock);
          }
          if (updatedColIdx !== -1) {
            productsSheet.getRange(r + 1, updatedColIdx + 1).setValue(timestampStr);
          }

          // ৪. ভ্যারিয়েন্ট স্টক আপডেট (GodownStock ও StockQuantity উভয়ই)
          if (variantsColIdx !== -1 && variantId) {
            try {
              const rawV = productsSheet.getRange(r + 1, variantsColIdx + 1).getValue();
              if (rawV) {
                const parsedV = typeof rawV === 'string' ? JSON.parse(rawV) : rawV;
                if (Array.isArray(parsedV)) {
                  const vIdx = parsedV.findIndex(v => String(v.VariantID || v.variantId || '').trim() === variantId);
                  if (vIdx !== -1) {
                    if (isFromWarehouse) {
                      const prevVG = Number(parsedV[vIdx].GodownStock !== undefined ? parsedV[vIdx].GodownStock : (parsedV[vIdx].godownStock || 0)) || 0;
                      parsedV[vIdx].GodownStock = Math.max(0, prevVG - qty);
                      parsedV[vIdx].godownStock = parsedV[vIdx].GodownStock;
                    } else if (isFromShop) {
                      const prevVS = Number(parsedV[vIdx].StockQuantity !== undefined ? parsedV[vIdx].StockQuantity : (parsedV[vIdx].stockQuantity || 0)) || 0;
                      parsedV[vIdx].StockQuantity = Math.max(0, prevVS - qty);
                      parsedV[vIdx].stockQuantity = parsedV[vIdx].StockQuantity;
                    }

                    if (isReceived && isToShop) {
                      const prevVS = Number(parsedV[vIdx].StockQuantity !== undefined ? parsedV[vIdx].StockQuantity : (parsedV[vIdx].stockQuantity || 0)) || 0;
                      parsedV[vIdx].StockQuantity = prevVS + qty;
                      parsedV[vIdx].stockQuantity = parsedV[vIdx].StockQuantity;
                    }
                    productsSheet.getRange(r + 1, variantsColIdx + 1).setValue(JSON.stringify(parsedV));
                  }
                }
              }
            } catch (err) {
              console.error('Variant stock update error in transfer:', err);
            }
          }
          break;
        }
      }
    });
  }

  const itemsJsonStr = JSON.stringify(items);

  transferSheet.appendRow([
    transferId,
    challanNo,
    transferDate,
    fromLocation,
    toLocation,
    itemsJsonStr,
    items.length,
    totalQty,
    status,
    driverName,
    notes,
    createdBy,
    '', // ReceivedBy
    timestampStr,
    timestampStr
  ]);

  SpreadsheetApp.flush();

  handleLogAuditEvent(spreadsheet, {
    userId: createdBy,
    userName: createdBy,
    userRole: 'Admin',
    actionType: 'STOCK_TRANSFER_CREATE',
    module: 'StockTransfers',
    description: `নতুন স্টক ট্রান্সফার চালান #${challanNo} তৈরি হয়েছে (${fromLocation} ➔ ${toLocation}, মোট: ${totalQty} পিস)`,
    details: { transferId, challanNo, fromLocation, toLocation, totalQty, status }
  });

  return {
    success: true,
    message: `স্টক ট্রান্সফার চালান #${challanNo} সফলভাবে তৈরি হয়েছে!`,
    data: {
      TransferID: transferId,
      ChallanNo: challanNo,
      TransferDate: transferDate,
      FromLocation: fromLocation,
      ToLocation: toLocation,
      Items: items,
      TotalItems: items.length,
      TotalQuantity: totalQty,
      Status: status,
      DriverName: driverName,
      Notes: notes,
      CreatedBy: createdBy,
      ReceivedBy: '',
      CreatedAt: timestampStr,
      UpdatedAt: timestampStr
    }
  };
}

/**
 * স্টক ট্রান্সফার চালানের স্ট্যাটাস আপডেট করা (handleUpdateStockTransferStatus)
 */
function handleUpdateStockTransferStatus(spreadsheet, payload) {
  const transferSheet = ensureStockTransfersSheet(spreadsheet);
  const productsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.PRODUCTS);
  const stockLogsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.STOCK_LOGS);
  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  const targetId = String(payload.transferId || payload.TransferID || payload.challanNo || '').trim();
  const newStatus = payload.status || payload.Status; // 'Received' | 'Cancelled' | 'In Transit'
  const receivedBy = payload.receivedBy || payload.ReceivedBy || 'Manager';

  if (!targetId || !newStatus) {
    return { success: false, message: 'ট্রান্সফার আইডি এবং নতুন স্ট্যাটাস প্রদান করুন।' };
  }

  const headers = transferSheet.getRange(1, 1, 1, transferSheet.getLastColumn()).getValues()[0];
  const trfIdIdx = findCol(headers, 'TransferID');
  const challanIdx = findCol(headers, 'ChallanNo');
  const statusIdx = findCol(headers, 'Status');
  const toLocIdx = findCol(headers, 'ToLocation');
  const itemsIdx = findCol(headers, 'ItemsJSON', 'Items');
  const recByIdx = findCol(headers, 'ReceivedBy');
  const updateIdx = findCol(headers, 'UpdatedAt');

  const data = transferSheet.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    const rowId = String(data[r][trfIdIdx] || '').trim();
    const rowChallan = String(data[r][challanIdx] || '').trim();

    if (rowId === targetId || rowChallan === targetId) {
      const prevStatus = String(data[r][statusIdx] || '').trim();
      const toLoc = String(data[r][toLocIdx] || '').trim();
      const rawItems = data[r][itemsIdx];
      let items = [];
      try {
        items = typeof rawItems === 'string' ? JSON.parse(rawItems) : (rawItems || []);
      } catch (e) { items = []; }

      // যদি স্ট্যাটাস Received হয় এবং প্রাপক স্থান দোকান হয়, তবে দোকানে স্টক বৃদ্ধি
      if (newStatus === 'Received' && prevStatus !== 'Received' && productsSheet && items.length > 0) {
        const prodHeaders = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
        const stockColIdx = findCol(prodHeaders, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity');
        const prodIdColIdx = findCol(prodHeaders, 'ProductID', 'ID');
        const barcodeColIdx = findCol(prodHeaders, 'Barcode');
        const variantsColIdx = findCol(prodHeaders, 'VariantsJSON', 'Variants');
        const allProdData = productsSheet.getDataRange().getValues();

        items.forEach(itm => {
          const pid = String(itm.productId || itm.ProductID || '').trim();
          const variantId = itm.variantId || itm.VariantID || null;
          const qty = Number(itm.quantity) || 0;

          for (let pr = 1; pr < allProdData.length; pr++) {
            const pIdVal = String(allProdData[pr][prodIdColIdx] || '').trim();
            const pBarcode = barcodeColIdx !== -1 ? String(allProdData[pr][barcodeColIdx] || '').trim() : '';

            if (pIdVal === pid || (pBarcode && pBarcode === pid)) {
              const currentStock = Number(allProdData[pr][stockColIdx]) || 0;
              const newStock = currentStock + qty;
              productsSheet.getRange(pr + 1, stockColIdx + 1).setValue(newStock);
              allProdData[pr][stockColIdx] = newStock;

              // ভ্যারিয়েন্ট স্টক বৃদ্ধি
              if (variantsColIdx !== -1 && variantId) {
                try {
                  const rawV = productsSheet.getRange(pr + 1, variantsColIdx + 1).getValue();
                  if (rawV) {
                    const parsedV = typeof rawV === 'string' ? JSON.parse(rawV) : rawV;
                    if (Array.isArray(parsedV)) {
                      const vIdx = parsedV.findIndex(v => String(v.VariantID || v.variantId || '').trim() === String(variantId).trim());
                      if (vIdx !== -1) {
                        parsedV[vIdx].StockQuantity = (Number(parsedV[vIdx].StockQuantity) || 0) + qty;
                        productsSheet.getRange(pr + 1, variantsColIdx + 1).setValue(JSON.stringify(parsedV));
                      }
                    }
                  }
                } catch (e) {}
              }

              if (stockLogsSheet) {
                stockLogsSheet.appendRow([
                  generateUniqueId('LOG'),
                  timestampStr,
                  pIdVal,
                  allProdData[pr][findCol(prodHeaders, 'ProductName')] || itm.productName,
                  'TRANSFER_IN',
                  qty,
                  currentStock,
                  newStock,
                  `ট্রান্সফার চালান #${rowChallan} রিসিভ সম্পন্ন (${data[r][findCol(headers, 'FromLocation')]} ➔ ${toLoc})`
                ]);
              }
              break;
            }
          }
        });
      }

      // যদি চালান বাতিল (Cancelled) হয় এবং পূর্বের অবস্থা In Transit থাকে, তবে প্রেরক স্থানে স্টক ফেরত দেওয়া
      if (newStatus === 'Cancelled' && prevStatus === 'In Transit' && productsSheet && items.length > 0) {
        const prodHeaders = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
        const stockColIdx = findCol(prodHeaders, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity');
        const godownColIdx = findCol(prodHeaders, 'GodownStock', 'WarehouseStock', 'GodownQty');
        const prodIdColIdx = findCol(prodHeaders, 'ProductID', 'ID');
        const barcodeColIdx = findCol(prodHeaders, 'Barcode');
        const variantsColIdx = findCol(prodHeaders, 'VariantsJSON', 'Variants');
        const fromLoc = String(data[r][findCol(headers, 'FromLocation')] || '').trim();
        const isFromWarehouse = /warehouse|godown|গোডাউন/i.test(fromLoc) || !/shop|store|counter|দোকান/i.test(fromLoc);
        const allProdData = productsSheet.getDataRange().getValues();

        items.forEach(itm => {
          const pid = String(itm.productId || itm.ProductID || '').trim();
          const variantId = itm.variantId || itm.VariantID || null;
          const qty = Number(itm.quantity) || 0;

          for (let pr = 1; pr < allProdData.length; pr++) {
            const pIdVal = String(allProdData[pr][prodIdColIdx] || '').trim();
            const pBarcode = barcodeColIdx !== -1 ? String(allProdData[pr][barcodeColIdx] || '').trim() : '';

            if (pIdVal === pid || (pBarcode && pBarcode === pid)) {
              if (isFromWarehouse && godownColIdx !== -1) {
                const currentStock = Number(allProdData[pr][godownColIdx]) || 0;
                const newStock = currentStock + qty;
                productsSheet.getRange(pr + 1, godownColIdx + 1).setValue(newStock);
                allProdData[pr][godownColIdx] = newStock;
              } else if (!isFromWarehouse && stockColIdx !== -1) {
                const currentStock = Number(allProdData[pr][stockColIdx]) || 0;
                const newStock = currentStock + qty;
                productsSheet.getRange(pr + 1, stockColIdx + 1).setValue(newStock);
                allProdData[pr][stockColIdx] = newStock;
              }

              if (variantsColIdx !== -1 && variantId) {
                try {
                  const rawV = productsSheet.getRange(pr + 1, variantsColIdx + 1).getValue();
                  if (rawV) {
                    const parsedV = typeof rawV === 'string' ? JSON.parse(rawV) : rawV;
                    if (Array.isArray(parsedV)) {
                      const vIdx = parsedV.findIndex(v => String(v.VariantID || v.variantId || '').trim() === String(variantId).trim());
                      if (vIdx !== -1) {
                        if (isFromWarehouse) {
                          parsedV[vIdx].GodownStock = (Number(parsedV[vIdx].GodownStock) || 0) + qty;
                        } else {
                          parsedV[vIdx].StockQuantity = (Number(parsedV[vIdx].StockQuantity) || 0) + qty;
                        }
                        productsSheet.getRange(pr + 1, variantsColIdx + 1).setValue(JSON.stringify(parsedV));
                      }
                    }
                  }
                } catch (e) {}
              }

              if (stockLogsSheet) {
                stockLogsSheet.appendRow([
                  generateUniqueId('LOG'),
                  timestampStr,
                  pIdVal,
                  allProdData[pr][findCol(prodHeaders, 'ProductName')] || itm.productName,
                  'CANCEL_RESTORE',
                  qty,
                  0,
                  0,
                  `চালান #${rowChallan} বাতিল হওয়ায় স্টক ফেরত (${fromLoc})`
                ]);
              }
              break;
            }
          }
        });
      }

      // ট্রান্সফার শিট আপডেট
      transferSheet.getRange(r + 1, statusIdx + 1).setValue(newStatus);
      if (recByIdx !== -1 && newStatus === 'Received') {
        transferSheet.getRange(r + 1, recByIdx + 1).setValue(receivedBy);
      }
      if (updateIdx !== -1) {
        transferSheet.getRange(r + 1, updateIdx + 1).setValue(timestampStr);
      }

      SpreadsheetApp.flush();

      handleLogAuditEvent(spreadsheet, {
        userId: receivedBy,
        userName: receivedBy,
        userRole: 'Staff',
        actionType: 'STOCK_TRANSFER_STATUS',
        module: 'StockTransfers',
        description: `ট্রান্সফার চালান #${rowChallan}-এর স্ট্যাটাস পরিবর্তন: ${prevStatus} ➔ ${newStatus}`,
        details: { targetId, challanNo: rowChallan, prevStatus, newStatus, receivedBy }
      });

      return {
        success: true,
        message: `চালান #${rowChallan} সফলভাবে '${newStatus}' হিসেবে আপডেট হয়েছে!`,
        data: { transferId: rowId, challanNo: rowChallan, status: newStatus, receivedBy }
      };
    }
  }

  return { success: false, message: `ট্রান্সফার রেকর্ড '${targetId}' খুঁজে পাওয়া যায়নি।` };
}

/**
 * স্টক ট্রান্সফার চালান মুছে ফেলা (handleDeleteStockTransfer)
 * যদি চালানটি এখনও In Transit বা Pending থাকে (দোকানে রিসিভ হয়নি), তবে গোডাউনে স্টক ফিরিয়ে দেওয়া হবে।
 */
function handleDeleteStockTransfer(spreadsheet, payload) {
  const transferSheet = ensureStockTransfersSheet(spreadsheet);
  const productsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.PRODUCTS);
  const stockLogsSheet = getSheetCaseInsensitive(spreadsheet, SHEETS.STOCK_LOGS);
  const now = new Date();
  const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  const targetId = String(payload.transferId || payload.TransferID || payload.challanNo || payload.ChallanNo || '').trim();
  if (!targetId) {
    return { success: false, message: 'ট্রান্সফার আইডি বা চালান নম্বর প্রদান করুন।' };
  }

  const headers = transferSheet.getRange(1, 1, 1, transferSheet.getLastColumn()).getValues()[0];
  const trfIdIdx = findCol(headers, 'TransferID');
  const challanIdx = findCol(headers, 'ChallanNo');
  const statusIdx = findCol(headers, 'Status');
  const fromLocIdx = findCol(headers, 'FromLocation');
  const itemsIdx = findCol(headers, 'ItemsJSON', 'Items');

  const data = transferSheet.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    const rowId = String(data[r][trfIdIdx] || '').trim();
    const rowChallan = String(data[r][challanIdx] || '').trim();

    if (rowId === targetId || rowChallan === targetId) {
      const currentStatus = String(data[r][statusIdx] || '').trim();
      const fromLoc = String(data[r][fromLocIdx] || '').trim();
      const isFromWarehouse = /warehouse|godown|গোডাউন/i.test(fromLoc) || !/shop|store|counter|দোকান/i.test(fromLoc);
      const rawItems = data[r][itemsIdx];
      let items = [];
      try {
        items = typeof rawItems === 'string' ? JSON.parse(rawItems) : (rawItems || []);
      } catch (e) { items = []; }

      // যদি চালানটি এখনও In Transit বা Pending থাকে (দোকানে রিসিভ হয়নি), তবে গোডাউনে স্টক ফেরত দেওয়া
      if (currentStatus === 'In Transit' || currentStatus === 'Pending') {
        if (productsSheet && items.length > 0) {
          const prodHeaders = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
          const stockColIdx = findCol(prodHeaders, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity');
          const godownColIdx = findCol(prodHeaders, 'GodownStock', 'WarehouseStock', 'GodownQty');
          const prodIdColIdx = findCol(prodHeaders, 'ProductID', 'ID');
          const barcodeColIdx = findCol(prodHeaders, 'Barcode');
          const variantsColIdx = findCol(prodHeaders, 'VariantsJSON', 'Variants');
          const totalStockColIdx = findCol(prodHeaders, 'TotalStock');
          const allProdData = productsSheet.getDataRange().getValues();

          items.forEach(itm => {
            const pid = String(itm.productId || itm.ProductID || '').trim();
            const variantId = itm.variantId || itm.VariantID || null;
            const qty = Number(itm.quantity || itm.Quantity || 0);
            if (qty <= 0) return;

            for (let pr = 1; pr < allProdData.length; pr++) {
              const pIdVal = String(allProdData[pr][prodIdColIdx] || '').trim();
              const pBarcode = barcodeColIdx !== -1 ? String(allProdData[pr][barcodeColIdx] || '').trim() : '';

              if (pIdVal === pid || (pBarcode && pBarcode === pid)) {
                let currentGodownStock = godownColIdx !== -1 ? (Number(allProdData[pr][godownColIdx]) || 0) : 0;
                let currentShopStock = stockColIdx !== -1 ? (Number(allProdData[pr][stockColIdx]) || 0) : 0;
                let newGodownStock = currentGodownStock;

                if (isFromWarehouse) {
                  newGodownStock = currentGodownStock + qty;
                  if (godownColIdx !== -1) {
                    productsSheet.getRange(pr + 1, godownColIdx + 1).setValue(newGodownStock);
                    allProdData[pr][godownColIdx] = newGodownStock;
                  }
                }

                if (totalStockColIdx !== -1) {
                  productsSheet.getRange(pr + 1, totalStockColIdx + 1).setValue(currentShopStock + newGodownStock);
                }

                if (variantsColIdx !== -1 && variantId) {
                  try {
                    const rawV = productsSheet.getRange(pr + 1, variantsColIdx + 1).getValue();
                    if (rawV) {
                      const parsedV = typeof rawV === 'string' ? JSON.parse(rawV) : rawV;
                      if (Array.isArray(parsedV)) {
                        const vIdx = parsedV.findIndex(v => String(v.VariantID || v.variantId || '').trim() === String(variantId).trim());
                        if (vIdx !== -1) {
                          if (isFromWarehouse) {
                            const prevVG = Number(parsedV[vIdx].GodownStock !== undefined ? parsedV[vIdx].GodownStock : (parsedV[vIdx].godownStock || 0)) || 0;
                            parsedV[vIdx].GodownStock = prevVG + qty;
                            parsedV[vIdx].godownStock = parsedV[vIdx].GodownStock;
                          }
                          productsSheet.getRange(pr + 1, variantsColIdx + 1).setValue(JSON.stringify(parsedV));
                        }
                      }
                    }
                  } catch (e) {}
                }

                if (stockLogsSheet) {
                  stockLogsSheet.appendRow([
                    generateUniqueId('LOG'),
                    timestampStr,
                    pIdVal,
                    allProdData[pr][findCol(prodHeaders, 'ProductName')] || itm.productName,
                    'RESTORE_ON_DELETE',
                    qty,
                    currentGodownStock,
                    newGodownStock,
                    `চালান #${rowChallan} মুছে ফেলায় গোডাউনে স্টক ফেরত`
                  ]);
                }
                break;
              }
            }
          });
        }
      }

      // ট্রান্সফার শিট থেকে নির্দিষ্ট রো মুছে ফেলা
      transferSheet.deleteRow(r + 1);
      SpreadsheetApp.flush();

      handleLogAuditEvent(spreadsheet, {
        userId: payload.deletedBy || 'Admin',
        userName: payload.deletedBy || 'Admin',
        userRole: 'Admin',
        actionType: 'STOCK_TRANSFER_DELETE',
        module: 'StockTransfers',
        description: `স্টক ট্রান্সফার চালান #${rowChallan} স্থায়ীভাবে ডাটাবেস থেকে মুছে ফেলা হয়েছে।`,
        details: { transferId: rowId, challanNo: rowChallan }
      });

      return {
        success: true,
        message: `চালান #${rowChallan} সফলভাবে ডাটাবেস থেকে মুছে ফেলা হয়েছে!`
      };
    }
  }

  return { success: false, message: `চালান '${targetId}' ডাটাবেসে খুঁজে পাওয়া যায়নি।` };
}

/**
 * ============================================================================
 * Phase 8: টার্গেটেড বাল্ক এসএমএস রি-অ্যাক্টিভেশন ক্যাম্পেইন হ্যান্ডলার
 * ============================================================================
 */
function handleSendBulkTargetedSms(spreadsheet, payload) {
  const recipients = Array.isArray(payload.recipients) ? payload.recipients : [];
  const template = String(payload.messageTemplate || payload.message || '').trim();
  const campaignTitle = payload.title || payload.Title || 'Targeted SMS Campaign';
  const segment = payload.segment || payload.Segment || 'All';
  const sentBy = payload.sentBy || 'Admin';

  if (recipients.length === 0 || !template) {
    return {
      success: false,
      message: 'প্রাপক তালিকা বা এসএমএস মেসেজ পাওয়া যায়নি।'
    };
  }

  // সেটিংস থেকে এসএমএস ক্রেডেনশিয়াল রিড
  const settingsSheet = ensureSettingsSheet(spreadsheet);
  const sData = settingsSheet.getDataRange().getValues();
  const sHeaders = sData[0];
  const providerCol = findCol(sHeaders, 'SmsProvider');
  const apiKeyCol = findCol(sHeaders, 'SmsApiKey', 'SmsKey');
  const senderIdCol = findCol(sHeaders, 'SmsSenderId', 'SenderId');

  let provider = (providerCol !== -1 && sData.length > 1) ? String(sData[1][providerCol] || '').trim() : 'Greenweb';
  let apiKey = (apiKeyCol !== -1 && sData.length > 1) ? String(sData[1][apiKeyCol] || '').trim() : '';
  let senderId = (senderIdCol !== -1 && sData.length > 1) ? String(sData[1][senderIdCol] || '').trim() : '';

  if (payload.apiKey) apiKey = payload.apiKey;
  if (payload.senderId) senderId = payload.senderId;
  if (payload.provider) provider = payload.provider;

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < recipients.length; i++) {
    const rc = recipients[i];
    const phone = String(rc.phone || rc.Phone || '').replace(/[^0-9]/g, '');
    const name = rc.name || rc.Name || rc.customerName || 'সম্মানিত ক্রেতা';
    const voucher = rc.voucherCode || rc.VoucherCode || '';

    if (phone.length >= 11) {
      let personalizedMsg = template
        .replace(/\{Name\}|\{CustomerName\}/gi, name)
        .replace(/\{StoreName\}/gi, sData.length > 1 ? (sData[1][findCol(sHeaders, 'StoreName')] || 'Pabna Bostraloy') : 'Pabna Bostraloy')
        .replace(/\{VoucherCode\}|\{CouponCode\}/gi, voucher);

      try {
        if (apiKey) {
          sendSingleSmsViaGateway(provider, apiKey, senderId, phone, personalizedMsg);
        }
        successCount++;
      } catch (e) {
        failCount++;
      }
    }
  }

  // অডিট লগ
  handleLogAuditEvent(spreadsheet, {
    userId: sentBy,
    userName: sentBy,
    userRole: 'Admin',
    actionType: 'SMS_CAMPAIGN',
    module: 'Campaigns',
    description: `টার্গেটেড বাল্ক এসএমএস ক্যাম্পেইন সম্পন্ন: '${campaignTitle}' (${segment} সেগমেন্ট, মোট প্রেরিত: ${successCount})`,
    details: { campaignTitle, segment, totalRecipients: recipients.length, successCount, failCount }
  });

  return {
    success: true,
    message: `${successCount} জন গ্রাহককে সফলভাবে এসএমএস পাঠানো হয়েছে!`,
    data: {
      campaignTitle,
      segment,
      totalRecipients: recipients.length,
      successCount,
      failCount
    }
  };
}




