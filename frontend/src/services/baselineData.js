/**
 * ============================================================================
 * baselineData.js - ইনস্ট্যান্ট জিরো-লেটেন্সি ডাটা স্ন্যাপশট (Instant Fast Boot)
 * ============================================================================
 * যেকোনো নতুন ডিভাইস বা ব্রাউজারে প্রথমবার সাইট ওপেন করলে কোনো নেটওয়ার্ক বিলম্ব ছাড়া
 * ০ মিলিসেকেন্ডেই পাবনা বস্ত্রালয়ের আসল পণ্য, ক্যাটাগরি ও স্টোর সেটিংস রেন্ডার করে।
 */

export const BASELINE_SETTINGS = {
  "SettingID": "SETTING-1",
  "StoreName": "Pabna Bostraloy",
  "LogoUrl": "",
  "CurrencySymbol": "৳",
  "TaxRatePercent": 0,
  "Address": "Bosila, Mohammadpur -Plot -7, Block -C, 40 Fit Main Road, Dhaka 1208",
  "Phone": "01675934919",
  "Email": "rezwanureee@gmail.com",
  "ReceiptFooter": "",
  "apiUrl": "https://script.google.com/macros/s/AKfycbycCBTqIaaQUpAPrJwF1EEEeaZD7CmYamE9AF4u_v0bJFRZaoMRmKZ8wGBGt2MLEwsg/exec"
};

export const BASELINE_PRODUCTS = [
  {
    "ProductID": "PROD-1793785056580-951",
    "Barcode": "PB-49572012",
    "ProductName": "রুবেল পপলিন",
    "Category": "Fabric",
    "SubCategory": "",
    "CostPrice": 58,
    "WholesalePrice": 60,
    "MinSellingPrice": 70,
    "SellingPrice": 80,
    "StockQuantity": 32.25,
    "GodownStock": 19,
    "MinStockAlert": 5,
    "Unit": "থান (20 গজ)",
    "YardsPerThan": 20,
    "ThanCount": 55.25,
    "TotalYards": 1105,
    "ImageUrl": "",
    "ImageCaption": "",
    "CreatedAt": "2026-11-04T09:37:36.580Z",
    "UpdatedAt": "2026-11-11T06:49:49.103Z",
    "ShortDescription": "",
    "Description": "",
    "Features": "",
    "HasVariants": true,
    "Variants": [
      {
        "VariantID": "VAR-COL-লাল",
        "Attributes": { "Color": "লাল" },
        "Barcode": "pb-49572012-লাল",
        "CostPrice": 58,
        "WholesalePrice": 60,
        "MinSellingPrice": 70,
        "SellingPrice": 80,
        "GodownStock": 5,
        "godownStock": 5,
        "StockQuantity": 15.25,
        "stockQuantity": 15.25,
        "costPrice": 58,
        "sellingPrice": 80,
        "minSellingPrice": 70,
        "TotalStock": 20.25,
        "wholesalePrice": 60,
        "ShopStock": 15.25,
        "shopStock": 15.25,
        "totalStock": 20.25,
        "Color": "লাল",
        "Size": ""
      },
      {
        "VariantID": "VAR-COL-নীল",
        "Attributes": { "Color": "নীল" },
        "Barcode": "pb-49572012-নীল",
        "CostPrice": 58,
        "WholesalePrice": 60,
        "MinSellingPrice": 70,
        "SellingPrice": 80,
        "GodownStock": 7,
        "godownStock": 7,
        "StockQuantity": 21,
        "stockQuantity": 21,
        "costPrice": 58,
        "sellingPrice": 80,
        "minSellingPrice": 70,
        "TotalStock": 28,
        "wholesalePrice": 60,
        "ShopStock": 21,
        "shopStock": 21,
        "totalStock": 28,
        "Color": "নীল",
        "Size": ""
      },
      {
        "VariantID": "VAR-COL-কালো",
        "Attributes": { "Color": "কালো" },
        "Barcode": "pb-49572012-কালো",
        "CostPrice": 58,
        "WholesalePrice": 60,
        "MinSellingPrice": 70,
        "SellingPrice": 80,
        "GodownStock": 7,
        "godownStock": 7,
        "StockQuantity": 0,
        "stockQuantity": 0,
        "costPrice": 58,
        "sellingPrice": 80,
        "minSellingPrice": 70,
        "TotalStock": 7,
        "wholesalePrice": 60,
        "ShopStock": 0,
        "shopStock": 0,
        "totalStock": 7,
        "Color": "কালো",
        "Size": ""
      }
    ],
    "VariantsJSON": "[{\"VariantID\":\"VAR-COL-লাল\",\"Attributes\":{\"Color\":\"লাল\"},\"Barcode\":\"pb-49572012-লাল\",\"CostPrice\":58,\"WholesalePrice\":60,\"MinSellingPrice\":70,\"SellingPrice\":80,\"GodownStock\":5,\"godownStock\":5,\"StockQuantity\":15.25,\"stockQuantity\":15.25,\"costPrice\":58,\"sellingPrice\":80,\"minSellingPrice\":70,\"TotalStock\":20.25,\"wholesalePrice\":60,\"ShopStock\":15.25,\"shopStock\":15.25,\"totalStock\":20.25,\"Color\":\"লাল\",\"Size\":\"\"},{\"VariantID\":\"VAR-COL-নীল\",\"Attributes\":{\"Color\":\"নীল\"},\"Barcode\":\"pb-49572012-নীল\",\"CostPrice\":58,\"WholesalePrice\":60,\"MinSellingPrice\":70,\"SellingPrice\":80,\"GodownStock\":7,\"godownStock\":7,\"StockQuantity\":21,\"stockQuantity\":21,\"costPrice\":58,\"sellingPrice\":80,\"minSellingPrice\":70,\"TotalStock\":28,\"wholesalePrice\":60,\"ShopStock\":21,\"shopStock\":21,\"totalStock\":28,\"Color\":\"নীল\",\"Size\":\"\"},{\"VariantID\":\"VAR-COL-কালো\",\"Attributes\":{\"Color\":\"কালো\"},\"Barcode\":\"pb-49572012-কালো\",\"CostPrice\":58,\"WholesalePrice\":60,\"MinSellingPrice\":70,\"SellingPrice\":80,\"GodownStock\":7,\"godownStock\":7,\"StockQuantity\":0,\"stockQuantity\":0,\"costPrice\":58,\"sellingPrice\":80,\"minSellingPrice\":70,\"TotalStock\":7,\"wholesalePrice\":60,\"ShopStock\":0,\"shopStock\":0,\"totalStock\":7,\"Color\":\"কালো\",\"Size\":\"\"}]",
    "BatchNumber": "",
    "ExpiryDate": "",
    "MfgDate": "",
    "IsBundle": false,
    "BundleItemsJSON": "",
    "_rowIndex": 2
  },
  {
    "ProductID": "PROD-1794310033733-926",
    "Barcode": "PB-57161815",
    "ProductName": "three pics",
    "Category": "Fabric",
    "SubCategory": "",
    "CostPrice": 220,
    "WholesalePrice": 260,
    "MinSellingPrice": 320,
    "SellingPrice": 450,
    "StockQuantity": 14,
    "GodownStock": 10,
    "MinStockAlert": 5,
    "Unit": "Pcs",
    "YardsPerThan": 0,
    "ThanCount": 0,
    "TotalYards": 0,
    "ImageUrl": "https://lh3.googleusercontent.com/d/1L5uugmSO59nhz4ustl6AAOMIRfbxq_KV",
    "ImageCaption": "",
    "CreatedAt": "2026-11-10T11:27:13.733Z",
    "UpdatedAt": "2026-11-10T19:57:11.765Z",
    "ShortDescription": "",
    "Description": "",
    "Features": "",
    "HasVariants": false,
    "Variants": [],
    "VariantsJSON": "[]",
    "BatchNumber": "",
    "ExpiryDate": "",
    "MfgDate": "",
    "IsBundle": false,
    "BundleItemsJSON": "[]",
    "_rowIndex": 3
  }
];

export const BASELINE_CATEGORIES = [
  {
    "CategoryID": "CAT-FABRIC-001",
    "CategoryName": "Fabric",
    "SubCategoryName": "Cotton Print Fabric",
    "Description": "সুতি প্রিন্ট ও থান কাপড়",
    "Status": "Active",
    "CreatedAt": "2026-11-04T09:37:36.000Z",
    "_rowIndex": 2
  },
  {
    "CategoryID": "CAT-WOMEN-001",
    "CategoryName": "Women",
    "SubCategoryName": "Three Piece",
    "Description": "মহিলাদের থ্রি-পিস ও পোশাক",
    "Status": "Active",
    "CreatedAt": "2026-11-10T11:27:13.000Z",
    "_rowIndex": 3
  }
];

export const BASELINE_UNITS = [
  {
    "UnitID": "UNIT-101",
    "UnitName": "Piece (পিস)",
    "ShortName": "Pcs",
    "Description": "একক পিস পণ্য",
    "Status": "Active",
    "CreatedAt": "2026-10-12T05:13:45.603Z",
    "_rowIndex": 2
  },
  {
    "UnitID": "UNIT-102",
    "UnitName": "Packet (প্যাকেট)",
    "ShortName": "Packet",
    "Description": "প্যাকেটজাত পণ্য",
    "Status": "Active",
    "CreatedAt": "2026-10-12T05:13:45.603Z",
    "_rowIndex": 3
  },
  {
    "UnitID": "UNIT-103",
    "UnitName": "Kilogram (কেজি)",
    "ShortName": "Kg",
    "Description": "ওজন পরিমাপক কেজি",
    "Status": "Active",
    "CreatedAt": "2026-10-12T05:13:45.603Z",
    "_rowIndex": 4
  },
  {
    "UnitID": "UNIT-104",
    "UnitName": "Gram (গ্রাম)",
    "ShortName": "gm",
    "Description": "ক্ষুদ্র ওজন একক",
    "Status": "Active",
    "CreatedAt": "2026-10-12T05:13:45.603Z",
    "_rowIndex": 5
  },
  {
    "UnitID": "UNIT-105",
    "UnitName": "Litre (লিটার)",
    "ShortName": "Ltr",
    "Description": "তরল পরিমাপক লিটার",
    "Status": "Active",
    "CreatedAt": "2026-10-12T05:13:45.603Z",
    "_rowIndex": 6
  },
  {
    "UnitID": "UNIT-106",
    "UnitName": "Millilitre (মিলি)",
    "ShortName": "ml",
    "Description": "ক্ষুদ্র তরল একক",
    "Status": "Active",
    "CreatedAt": "2026-10-12T05:13:45.603Z",
    "_rowIndex": 7
  },
  {
    "UnitID": "UNIT-107",
    "UnitName": "Box (বক্স/কার্টন)",
    "ShortName": "Box",
    "Description": "কার্টন বা বক্স",
    "Status": "Active",
    "CreatedAt": "2026-10-12T05:13:45.603Z",
    "_rowIndex": 8
  },
  {
    "UnitID": "UNIT-108",
    "UnitName": "Bottle (বোতল)",
    "ShortName": "Bottle",
    "Description": "বোতলজাত পণ্য",
    "Status": "Active",
    "CreatedAt": "2026-10-12T05:13:45.603Z",
    "_rowIndex": 9
  },
  {
    "UnitID": "UNIT-109",
    "UnitName": "Dozen (ডজন)",
    "ShortName": "Dozen",
    "Description": "১২ পিস বা ডজন",
    "Status": "Active",
    "CreatedAt": "2026-10-12T05:13:45.603Z",
    "_rowIndex": 10
  },
  {
    "UnitID": "UNIT-110",
    "UnitName": "Pair (জোড়া)",
    "ShortName": "Pair",
    "Description": "জোড়া আইটেম",
    "Status": "Active",
    "CreatedAt": "2026-10-12T05:13:45.603Z",
    "_rowIndex": 11
  },
  {
    "UnitID": "UNIT-111",
    "UnitName": "Meter (মিটার)",
    "ShortName": "Meter",
    "Description": "দৈর্ঘ্য বা কাপড়",
    "Status": "Active",
    "CreatedAt": "2026-10-12T05:13:45.603Z",
    "_rowIndex": 12
  },
  {
    "UnitID": "UNIT-112",
    "UnitName": "Roll (রোল)",
    "ShortName": "Roll",
    "Description": "রোল বা ফিতা জাতীয়",
    "Status": "Active",
    "CreatedAt": "2026-10-12T05:13:45.603Z",
    "_rowIndex": 13
  },
  {
    "UnitID": "UNIT-113",
    "UnitName": "থান (Than / Bolt)",
    "ShortName": "থান",
    "Description": "কাপড়ের সম্পূর্ণ থান",
    "Status": "Active",
    "CreatedAt": "2026-10-23T00:00:00.000Z",
    "_rowIndex": 14
  },
  {
    "UnitID": "UNIT-114",
    "UnitName": "গজ (Yard)",
    "ShortName": "গজ",
    "Description": "কাপড় পরিমাপক গজ",
    "Status": "Active",
    "CreatedAt": "2026-10-23T00:00:00.000Z",
    "_rowIndex": 15
  }
];

export const BASELINE_USERS = [
  {
    "UserID": "USER-ADMIN-01",
    "FullName": "Rezwanur Rahman",
    "Phone": "01675934919",
    "Email": "admin@pos.local",
    "Role": "Admin",
    "PIN": "1234",
    "Address": "Bosila, Mohammadpur, Dhaka",
    "AvatarUrl": "https://drive.google.com/thumbnail?id=1N1JKjkNQGAXsIWFZmXnnOjErJOW_QOWB&sz=w1000",
    "Status": "Active",
    "CreatedAt": "2026-10-14T05:59:16.229Z",
    "UpdatedAt": "2026-10-14T05:59:16.229Z"
  }
];

export const BASELINE_CUSTOMERS = [];
export const BASELINE_COUPONS = [];
export const BASELINE_SALES = [];
