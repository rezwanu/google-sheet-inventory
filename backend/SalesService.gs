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

