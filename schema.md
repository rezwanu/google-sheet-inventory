# গুগল শিট ডাটাবেস স্কিমা ও সেটআপ নির্দেশিকা (Database Schema & Step-by-Step Guide)

এই ফাইলে **Dual-Delivery Enterprise POS & Inventory** সিস্টেমের জন্য গুগল শিটের ডাটাবেস ডিজাইন এবং ধাপে ধাপে সেটআপ করার সম্পূর্ণ গাইডলাইন দেওয়া হলো।

---

## ১. আর্কিটেকচার ওভারভিউ (Architecture Overview)

```
+-----------------------------------------------------------------------+
|                             Google Sheets                             |
|                               (Database)                              |
+-----------------------------------------------------------------------+
        |                                                   |
        | Apps Script REST API                              | Native Connection
        v                                                   v
+-------------------------------+                   +-------------------+
| React Web POS (GitHub Pages) |                   |  AppSheet Mobile  |
| - Zero-latency Offline Cache  |                   |  - RBAC Security  |
| - High-Density Billing Cart   |                   |  - Inventory Sync |
| - Thermal & A4 Print Invoice  |                   |  - Owner App      |
+-------------------------------+                   +-------------------+
```

---

## ২. ৫টি শিটের বিস্তারিত স্কিমা (Sheets Schema)

গুগল স্প্রেডশিটে নিচের ৫টি ট্যাব থাকবে:

### ১. `Settings` শিট (হোয়াইট-লেবেল মাস্টার কনফিগারেশন)
দোকানের মৌলিক পরিচিতি, মুদ্রা এবং ট্যাক্স কনফিগারেশন সংরক্ষণ করে।

| কলামের নাম (Column Name) | ডাটা টাইপ | বিবরণ ও উদাহরণ |
| :--- | :--- | :--- |
| **SettingID** | Text (Primary Key) | ইউনিক রেকর্ড আইডি (যেমন: `SETTING-1`) |
| **StoreName** | Text | দোকানের পূর্ণ নাম (যেমন: `Amar Super Shop`) |
| **LogoUrl** | URL / Text | দোকানের লোগোর ওয়েব লিংক |
| **CurrencySymbol** | Text | মুদ্রার প্রতীক (যেমন: `৳` অথবা `$`) |
| **TaxRatePercent** | Number (Decimal) | ভ্যাট/ট্যাক্সের হার (যেমন: `5.00` শতাংশ) |
| **Address** | Text | দোকানের সম্পূর্ণ ঠিকানা |
| **Phone** | Text | কন্টাক্ট নম্বর (যেমন: `+8801700000000`) |
| **Email** | Text | প্রাতিষ্ঠানিক ইমেইল |
| **ReceiptFooter** | Text | ইনভয়েসের নিচে প্রদর্শিত শুভেচ্ছা বার্তা |
| **UpdatedAt** | DateTime | সর্বশেষ তথ্য পরিবর্তনের সময় |

---

### ২. `Products` শিট (পণ্য ও স্টক তালিকা)
মাস্টার ইনভেন্টরি ক্যাটালগ যেখানে পণ্যের বারকোড, ক্রয়মূল্য এবং বর্তমান স্টক থাকে।

| কলামের নাম (Column Name) | ডাটা টাইপ | বিবরণ ও উদাহরণ |
| :--- | :--- | :--- |
| **ProductID** | Text (Primary Key) | ইউনিক প্রোডাক্ট আইডি (যেমন: `PROD-1001`) |
| **Barcode** | Text / Number | পণ্যের বারকোড বা SKU (যেমন: `890123456789`) |
| **ProductName** | Text | পণ্যের নাম (যেমন: `Miniket Rice 50kg`) |
| **Category** | Text | মূল ক্যাটাগরি (যেমন: `Grocery`, `Beverage`) |
| **SubCategory** | Text | সাব-ক্যাটাগরি (যেমন: `Rice & Grain`, `Tea & Coffee`) |
| **CostPrice** | Number (Decimal) | গড় ক্রয়মূল্য (Weighted Average Cost) |
| **SellingPrice** | Number (Decimal) | নির্ধারিত বিক্রয়মূল্য |
| **StockQuantity** | Number (Integer) | বর্তমান অবশিষ্ট মজুত পরিমাণ |
| **MinStockAlert** | Number (Integer) | মজুত ঘাটতি সতর্কবার্তা সীমা (যেমন: `10`) |
| **Unit** | Text | পরিমাপের একক (যেমন: `Bag`, `Pcs`, `Kg`, `Ltr`) |
| **ImageUrl** | URL / Text | পণ্যের ছবির ওয়েব লিংক |
| **CreatedAt** | DateTime | পণ্য এন্ট্রির সময় |
| **UpdatedAt** | DateTime | পণ্য সর্বশেষ আপডেটের সময় |

---

### ৩. `Categories` শিট (ক্যাটাগরি ও সাব-ক্যাটাগরি হায়ারার্কি)
মাল্টি-ক্যাটাগরি এবং সাব-ক্যাটাগরি কাঠামোর জন্য ডেডিকেটেড রিলেশনাল টেবিল।

| কলামের নাম (Column Name) | ডাটা টাইপ | বিবরণ ও উদাহরণ |
| :--- | :--- | :--- |
| **CategoryID** | Text (Primary Key) | ইউনিক ক্যাটাগরি আইডি (যেমন: `CAT-101`) |
| **CategoryName** | Text | মূল ক্যাটাগরির নাম (যেমন: `Grocery`, `Beverage`, `Dairy`) |
| **SubCategoryName** | Text | সাব-ক্যাটাগরির নাম (যেমন: `Rice & Grain`, `Edible Oil`, `Tea & Coffee`) |
| **Description** | Text | ক্যাটাগরির সংক্ষিপ্ত বিবরণ |
| **Status** | Text | স্ট্যাটাস (`Active`, `Inactive`) |
| **CreatedAt** | DateTime | তৈরির সময় |

---

### ৩. `Sales` শিট (POS সেলস মাস্টার রেকর্ড)
প্রতিটি বিক্রয়ের সামগ্রিক তথ্য, ভ্যাট, ডিসকাউন্ট ও ক্যাশিয়ারের রেকর্ড।

| কলামের নাম (Column Name) | ডাটা টাইপ | বিবরণ ও উদাহরণ |
| :--- | :--- | :--- |
| **SaleID** | Text (Primary Key) | ইউনিক সেলস আইডি (যেমন: `SALE-1712839210293-101`) |
| **InvoiceNo** | Text (Unique) | ইনভয়েস নম্বর (যেমন: `INV-20261011-0001`) |
| **Timestamp** | DateTime | অর্ডারের সঠিক তারিখ ও সময় |
| **CustomerName** | Text | ক্রেতার নাম (ডিফল্ট: `Walk-in Customer`) |
| **CustomerPhone** | Text | ক্রেতার মোবাইল নম্বর |
| **ItemsJSON** | LongText (JSON) | অর্ডারের সকল আইটেমের অ্যারে (আইটেম, রেট, পরিমাণ) |
| **ItemsSummary** | Text | সংক্ষেপে পণ্যের তালিকা (রিসিপ্টে দ্রুত দেখার জন্য) |
| **SubTotal** | Number (Decimal) | পণ্যের মোট মূল্য (ট্যাক্স/ডিসকাউন্টের আগে) |
| **TaxPercent** | Number (Decimal) | ভ্যাটের প্রযোজ্য শতকরা হার |
| **TaxAmount** | Number (Decimal) | ধার্যকৃত ভ্যাটের মোট টাকা |
| **DiscountAmount** | Number (Decimal) | প্রদত্ত ডিসকাউন্টের পরিমাণ |
| **GrandTotal** | Number (Decimal) | পরিশোধযোগ্য চূড়ান্ত মূল্য |
| **PaymentMethod** | Text | পরিশোধ মাধ্যম (`Cash`, `Card`, `bKash`, `Nagad`) |
| **CashierEmail** | Text | যে ক্যাশিয়ার সেল সম্পন্ন করেছেন |
| **Status** | Text | স্ট্যাটাস (`COMPLETED`, `CANCELLED`, `REFUNDED`) |
| **Notes** | Text | অতিরিক্ত মন্তব্য |

---

### ৪. `StockLogs` শিট (ইনভেন্টরি অডিট ও কিউমুলেটিভ ট্র্যাকিং)
মজুত বাড়া বা কমার প্রতিটি ঘটনার পুঙ্খানুপুঙ্খ অডিট ট্রেইল। লাভ-ক্ষতি হিসাবের মূল স্তম্ভ।

| কলামের নাম (Column Name) | ডাটা টাইপ | বিবরণ ও উদাহরণ |
| :--- | :--- | :--- |
| **LogID** | Text (Primary Key) | ইউনিক লগ আইডি (যেমন: `STKLOG-1712839210293-550`) |
| **Timestamp** | DateTime | স্টক পরিবর্তনের সময় |
| **ProductID** | Text (Foreign Key) | পণ্যের আইডি |
| **ProductName** | Text | পণ্যের নাম |
| **LogType** | Text | পরিবর্তনের ধরন (`STOCK_IN`, `STOCK_OUT_SALE`, `ADJUSTMENT`) |
| **PreviousStock** | Number (Integer) | আগের স্টক ব্যালেন্স |
| **QuantityChange** | Number (Integer) | পরিবর্তনের পরিমাণ (+ যোগ হলে, - বিক্রয় হলে) |
| **NewStock** | Number (Integer) | পরিবর্তিত নতুন স্টক (`PreviousStock + QuantityChange`) |
| **UnitCost** | Number (Decimal) | এই লটের প্রতি ইউনিটের ক্রয়মূল্য |
| **SupplierName** | Text | সরবরাহকারীর নাম বা প্রতিষ্ঠানের নাম |
| **HandledBy** | Text | যিনি স্টক ইনপুট দিয়েছেন বা ক্যাশিয়ার |
| **ReferenceID** | Text | সংশ্লিষ্ট ইনভয়েস নম্বর বা চালানের নম্বর |
| **Notes** | Text | স্টকের কারণ বা মন্তব্য |

---

### ৫. `Users` শিট (ব্যবহারকারী, স্টাফ ও গ্রাহক অ্যাকাউন্ট ডাটাবেস)
সাইনআপ ফরম, কাস্টমার রেজিস্ট্রেশন, এবং এডমিন প্যানেল থেকে রোল ভিত্তিক ব্যবহারকারী তৈরির মাস্টার রেকর্ড।

| কলামের নাম (Column Name) | ডাটা টাইপ | বিবরণ ও উদাহরণ |
| :--- | :--- | :--- |
| **UserID** | Text (Primary Key) | ইউনিক ইউজার আইডি (যেমন: `USER-ADMIN-01`, `USER-CUST-849201`) |
| **FullName** | Text | ব্যবহারকারীর পুরো নাম (যেমন: `মোহাম্মদ করিম`) |
| **Phone** | Text (Unique) | মোবাইল নম্বর (লগইন ও এসএমএস নোটিফিকেশনের জন্য) |
| **Email** | Text (Unique) | ইমেইল ঠিকানা (বিকল্প লগইন আইডেন্টিফায়ার) |
| **Role** | Text | ভূমিকা (`Admin`, `Manager`, `Cashier`, `Salesman`, `Customer`) |
| **PIN** | Text | ৪-৬ ডিজিটের নিরাপদ পিন বা পাসওয়ার্ড |
| **Address** | Text | গ্রাহক বা ইউজারের সম্পূর্ণ ঠিকানা |
| **AvatarUrl** | Text (URL) | ব্যবহারকারীর প্রোফাইল ছবির লিংক (গুগল ড্রাইভ বা ওয়েব ইউআরএল) |
| **Status** | Text | অ্যাকাউন্টের বর্তমান অবস্থা (`Active`, `Inactive`) |
| **CreatedAt** | DateTime | অ্যাকাউন্ট খোলার সঠিক তারিখ ও সময় |
| **UpdatedAt** | DateTime | অ্যাকাউন্ট সর্বশেষ আপডেটের সময় |

---

### ৬. `Coupons` শিট (কুপন ও অফার ডাটাবেস)
পণ্যভিত্তিক (Product-Wise) এবং সার্বজনীন (All-Products) কুপন ও ডিসকাউন্ট ভাউচারের মাস্টার রেকর্ড।

| কলামের নাম (Column Name) | ডাটা টাইপ | বিবরণ ও উদাহরণ |
| :--- | :--- | :--- |
| **CouponID** | Text (Primary Key) | ইউনিক কুপন আইডি (যেমন: `COUPON-1712839210293`) |
| **CouponCode** | Text (Unique) | কুপন কোড (যেমন: `EID10`, `SAVE50`) |
| **DiscountType** | Text | ডিসকাউন্টের ধরন (`Percentage` অথবা `Fixed`) |
| **DiscountValue** | Number (Decimal) | ছাড়ের পরিমাণ (যেমন: ১০% বা ৫০ টাকা) |
| **ApplicableType** | Text | কুপনের পরিধি (`AllProducts` অথবা `SpecificProduct`) |
| **ProductID** | Text (Foreign Key) | নির্দিষ্ট পণ্যের আইডি (যদি পণ্যভিত্তিক কুপন হয়) |
| **ProductName** | Text | নির্দিষ্ট পণ্যের নাম |
| **MinPurchaseAmount** | Number (Decimal) | কুপন পাওয়ার জন্য সর্বনিম্ন অর্ডারের অংক |
| **MaxDiscountAmount** | Number (Decimal) | সর্বোচ্চ ছাড়ের সীমা (শতাংশ ডিসকাউন্টের ক্ষেত্রে ক্যাপ) |
| **UsageLimit** | Number (Integer) | কুপন ব্যবহারের সর্বোচ্চ মোট সংখ্যা |
| **UsedCount** | Number (Integer) | ইতোমধ্যে কতবার কুপনটি ব্যবহার হয়েছে |
| **ExpiryDate** | Date / Text | কুপনের মেয়াদ শেষ হওয়ার তারিখ (YYYY-MM-DD) |
| **Status** | Text | কুপনের অবস্থা (`Active` অথবা `Inactive`) |
| **CreatedAt** | DateTime | কুপন তৈরির সময় |
| **UpdatedAt** | DateTime | কুপন সর্বশেষ আপডেটের সময় |

---

## ৩. ধাপে ধাপে বাস্তবায়ন নির্দেশিকা (Step-by-Step Implementation Guide)

### ধাপ ১: গুগল স্প্রেডশিট তৈরি
1. আপনার ব্রাউজারে [Google Sheets](https://sheets.new) ওপেন করুন।
2. শিট ফাইলের নাম দিন: **Enterprise POS Database**।

### ধাপ ২: Apps Script প্রজেক্ট সেটআপ
1. গুগল শিটটির মেনু থেকে **Extensions** > **Apps Script** এ ক্লিক করুন।
2. ডিফল্ট `Code.gs` ফাইলে থাকা কোড মুছে ফেলুন বা ফাইলটির নাম পরিবর্তন করে মডুলার ফাইলে রূপান্তর করুন।
3. Apps Script এর বাম পাশের ফাইল মেনু থেকে **+ (Add a file)** এ ক্লিক করে **Script** সিলেক্ট করুন এবং নিচের ফাইলগুলো তৈরি করুন:
   - `Config.gs`
   - `DatabaseSetup.gs`
   - `StockService.gs`
   - `SalesService.gs`
   - `ProductService.gs`
   - `Main.gs`
4. আমাদের `backend/` ফোল্ডারে থাকা সংশ্লিষ্ট কোডগুলো প্রতিটি ফাইলে কপি ও পেস্ট করে সেভ (Ctrl+S) করুন।

### ধাপ ৩: স্বয়ংক্রিয় ডাটাবেস ইনিশিয়ালাইজেশন
1. Apps Script এডিটরের উপরের ফাংশন ড্রপডাউন থেকে **`setupDatabase`** সিলেক্ট করুন।
2. **Run** বাটনে চাপ দিন।
3. প্রথমবারের মতো গুগল অ্যাকাউন্ট পারমিশন চাইবে — **Review permissions** ক্লিক করে পারমিশন দিন।
4. এক্সিকিউশন সফল হলে আপনার গুগল শিটে ফিরে গিয়ে দেখতে পাবেন সবগুলো ৫টি শিট সঠিক হেডার এবং ডামি ডাটা সহ অটোমেটিক তৈরি হয়ে গেছে।

### ধাপ ৪: ওয়েব অ্যাপ API হিসেবে ডিপ্লয় (Deploy as Web App)
1. স্ক্রিপ্ট এডিটরের উপরে ডানদিকের নীল **Deploy** > **New deployment** এ ক্লিক করুন।
2. বাঁপাশের সিলেক্ট টাইপ (গিয়ার আইকন) থেকে **Web app** নির্বাচন করুন।
3. নিচের সেটিংসগুলো দিন:
   - **Description:** `Production POS API v1`
   - **Execute as:** `Me (your Google email)`
   - **Who has access:** `Anyone` (এটি অত্যন্ত জরুরি, যাতে ফ্রন্টএন্ড কোনো সমস্যা ছাড়াই API কল করতে পারে)
4. **Deploy** বাটনে ক্লিক করুন।
5. একটি **Web app URL** জেনারেট হবে (যেমন: `https://script.google.com/macros/s/.../exec`)। এই URL-টি সেভ করে রাখুন, যা পরবর্তী ফেজে React অ্যাপ তৈরিতে লাগবে।

