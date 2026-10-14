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

  // ৫. Users (ব্যবহারকারী ও স্টাফ ডাটাবেস) শিট তৈরি ও ইনিশিয়ালাইজেশন
  ensureUsersSheet(spreadsheet);

  // ৬. Units (পরিমাপক একক) শিট তৈরি ও ইনিশিয়ালাইজেশন
  ensureUnitsSheet(spreadsheet);

  // ৭. Customers (গ্রাহক ডাটাবেস) শিট তৈরি ও ইনিশিয়ালাইজেশন (কোনো ডামি গ্রাহক ছাড়া)
  ensureCustomersSheet(spreadsheet);

  // ৮. Coupons (কুপন ও অফার ব্যবস্থাপনা ডাটাবেস) শিট তৈরি ও কলাম হেডার ইনিশিয়ালাইজেশন
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


