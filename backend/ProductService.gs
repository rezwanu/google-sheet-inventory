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
    const wholesalePrice = payload.wholesalePrice !== undefined ? Number(payload.wholesalePrice) : (payload.WholesalePrice !== undefined ? Number(payload.WholesalePrice) : 0);
    const minSellingPrice = payload.minSellingPrice !== undefined ? Number(payload.minSellingPrice) : (payload.MinSellingPrice !== undefined ? Number(payload.MinSellingPrice) : cPrice);
    const godownStock = payload.godownStock !== undefined ? Number(payload.godownStock) : (payload.GodownStock !== undefined ? Number(payload.GodownStock) : (payload.initialGodownStock !== undefined ? Number(payload.initialGodownStock) : 0));
    const yardsPerThan = payload.yardsPerThan !== undefined ? Number(payload.yardsPerThan) : (payload.YardsPerThan !== undefined ? Number(payload.YardsPerThan) : 0);
    const thanCount = payload.thanCount !== undefined ? Number(payload.thanCount) : (payload.ThanCount !== undefined ? Number(payload.ThanCount) : (payload.TotalThan !== undefined ? Number(payload.TotalThan) : 0));
    const totalYards = payload.totalYards !== undefined ? Number(payload.totalYards) : (payload.TotalYards !== undefined ? Number(payload.TotalYards) : (payload.TotalGoj !== undefined ? Number(payload.TotalGoj) : 0));
    const hasVariants = payload.hasVariants === true || payload.HasVariants === true || String(payload.hasVariants || '').toLowerCase() === 'true';
    let variantsJSON = payload.variantsJSON || payload.VariantsJSON || payload.variants || payload.Variants || '';
    if (typeof variantsJSON === 'object') {
      try { variantsJSON = JSON.stringify(variantsJSON); } catch (e) { variantsJSON = ''; }
    }

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
    setAt(findCol(headers, 'WholesalePrice', 'Wholesale', 'DealerPrice'), wholesalePrice);
    setAt(findCol(headers, 'MinSellingPrice', 'FloorPrice', 'MinPrice'), minSellingPrice);
    setAt(findCol(headers, 'SellingPrice', 'Price', 'SalePrice'), sPrice);
    setAt(findCol(headers, 'StockQuantity', 'StockQuantit', 'Stock', 'Quantity', 'Qty'), stockQty);
    setAt(findCol(headers, 'GodownStock', 'WarehouseStock', 'GodownQty'), godownStock);
    setAt(findCol(headers, 'MinStockAlert', 'MinStockAler', 'MinStock', 'Alert'), Number(minStockAlert) || 5);
    setAt(findCol(headers, 'Unit', 'UOM'), unit || 'Pcs');
    setAt(findCol(headers, 'YardsPerThan', 'GojPerThan', 'YardsThan'), yardsPerThan);
    setAt(findCol(headers, 'ThanCount', 'TotalThan', 'ThanQty'), thanCount);
    setAt(findCol(headers, 'TotalYards', 'TotalGoj', 'GojCount'), totalYards);
    setAt(findCol(headers, 'ImageUrl', 'Image', 'Photo', 'ImgUrl', 'Picture'), imageUrl || '');
    setAt(findCol(headers, 'ImageCaption', 'Caption', 'AltText', 'Alt'), imageCaption || '');
    setAt(findCol(headers, 'ShortDescription', 'ShortDesc'), shortDescription);
    setAt(findCol(headers, 'Description', 'Desc', 'Details'), description);
    setAt(findCol(headers, 'Features', 'Feature', 'KeyFeatures'), features);
    setAt(findCol(headers, 'CreatedAt', 'Created', 'Date'), timestamp);
    setAt(findCol(headers, 'UpdatedAt', 'Updated'), timestamp);
    setAt(findCol(headers, 'HasVariants', 'HasVariant'), hasVariants ? 'TRUE' : 'FALSE');
    setAt(findCol(headers, 'VariantsJSON', 'Variants'), variantsJSON || '');

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


