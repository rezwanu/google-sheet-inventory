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
        // নিরাপত্তার স্বার্থে সংবেদনশীল পিন বাদ দিয়ে পাঠানো
        return {
          UserID: user.UserID,
          FullName: user.FullName,
          Email: user.Email,
          Role: user.Role,
          Status: user.Status
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


