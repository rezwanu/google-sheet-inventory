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

