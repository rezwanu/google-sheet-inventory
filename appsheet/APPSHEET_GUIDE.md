# AppSheet মোবাইল অ্যাপ সেটআপ এবং Role-Based Access Control (RBAC) গাইড

এই নথিতে আমাদের Google Sheets ডাটাবেসকে AppSheet মোবাইল অ্যাপের সাথে যুক্ত করার পদ্ধতি, ভূমিকাভিত্তিক অ্যাক্সেস নিয়ন্ত্রণ (RBAC: Admin, Manager, Cashier) এবং `Settings` শিট থেকে ডাইনামিক ব্র্যান্ডিং প্রদর্শনের সম্পূর্ণ গাইডলাইন তুলে ধরা হলো।

---

## ১. গুগল শিট ডাটাবেস AppSheet-এ ইমপোর্ট করার পদ্ধতি

### ধাপ ১: AppSheet প্রজেক্ট শুরু করা
1. আপনার ব্রাউজারে গুগল শিটটি খুলুন (যেখানে ৫টি ট্যাব তৈরি করা আছে)।
2. মেনুবার থেকে **Extensions** > **AppSheet** > **Create an app** এ ক্লিক করুন।
   *(অথবা সরাসরি [appsheet.com](https://www.appsheet.com) এ লগইন করে **Create** > **App** > **Start with existing data** নির্বাচন করুন এবং আপনার স্প্রেডশিটটি সিলেক্ট করুন)*।
3. AppSheet স্বয়ংক্রিয়ভাবে প্রথম টেবিলটি (`Settings` অথবা `Products`) যুক্ত করবে।

### ধাপ ২: বাকি টেবিলগুলো যুক্ত করা
1. AppSheet এর বাম পাশের মেনু থেকে **Data** ট্যাবে যান।
2. উপরে **+ (Add Table)** বাটনে ক্লিক করুন।
3. আপনার স্প্রেডশিটের বাকি টেবিলগুলো একে একে যুক্ত করুন:
   - `Products`
   - `Sales`
   - `StockLogs`
   - `Settings`
   - `Users` (এটি RBAC সিকিউরিটির জন্য অত্যন্ত গুরুত্বপূর্ণ!)

---

## ২. টেবিল ও কলাম টাইপ কনফিগারেশন (Column Configuration)

প্রতিটি টেবিলের কলামগুলোর সঠিক ডাটা টাইপ নির্ধারণ করা অত্যন্ত জরুরি:

### ১. `Users` টেবিল (ব্যবহারকারী ডাটা)
* **Email:** Type = `Email` | ✅ **Key: True** | **Searchable: True**
* **FullName:** Type = `Text` | ✅ **Label: True**
* **Role:** Type = `Enum` | Values = `Admin`, `Manager`, `Cashier`
* **PIN:** Type = `Text` (বা `Number`) | Scannable: False
* **Status:** Type = `Enum` | Values = `Active`, `Inactive`

### ২. `Settings` টেবিল (মাস্টার কনফিগারেশন)
* **SettingID:** Type = `Text` | ✅ **Key: True**
* **StoreName:** Type = `Text` | ✅ **Label: True**
* **LogoUrl:** Type = `Image` (বা `Thumbnail`)
* **CurrencySymbol:** Type = `Text`
* **TaxRatePercent:** Type = `Decimal`
* **Address:** Type = `Address` (বা `Text`)
* **Phone:** Type = `Phone`

### ৩. `Products` টেবিল (ইনভেন্টরি ক্যাটালগ)
* **ProductID:** Type = `Text` | ✅ **Key: True**
* **Barcode:** Type = `Text` | **Searchable: True** | ✅ **Scannable: True** (ক্যামেরা স্ক্যানারের জন্য)
* **ProductName:** Type = `Text` | ✅ **Label: True**
* **Category:** Type = `Enum` (বা `Text`)
* **CostPrice:** Type = `Price` | Currency Symbol = `৳` (গোপনীয় কলাম)
* **SellingPrice:** Type = `Price` | Currency Symbol = `৳`
* **StockQuantity:** Type = `Number`
* **MinStockAlert:** Type = `Number`

### ৪. `Sales` টেবিল (বিক্রয় রেকর্ড)
* **SaleID:** Type = `Text` | ✅ **Key: True**
* **InvoiceNo:** Type = `Text` | ✅ **Label: True**
* **Timestamp:** Type = `DateTime` | Initial Value = `NOW()`
* **GrandTotal:** Type = `Price`
* **PaymentMethod:** Type = `Enum` | Values = `Cash`, `Card`, `bKash`, `Nagad`
* **CashierEmail:** Type = `Email` | Initial Value = `USEREMAIL()`

### ৫. `StockLogs` টেবিল (অডিট লগ)
* **LogID:** Type = `Text` | ✅ **Key: True**
* **ProductID:** Type = `Ref` (Source Table = `Products`)
* **LogType:** Type = `Enum` | Values = `STOCK_IN`, `STOCK_OUT_SALE`, `ADJUSTMENT`
* **UnitCost:** Type = `Price` (গোপনীয় কলাম)

---

## ৩. Role-Based Access Control (RBAC) বাস্তবায়ন

AppSheet অ্যাপে যে ব্যবহারকারী লগইন করেছেন, তার ইমেইল `USEREMAIL()` দিয়ে স্বয়ংক্রিয়ভাবে চেনা যায়। আমরা `Users` টেবিল থেকে ব্যবহারকারীর ভূমিকা (`Role`) যাচাই করে এক্সেস ফিল্টার করব।

### মৌলিক হেল্পার এক্সপ্রেশন (Current User Role):
```excel
// বর্তমান ব্যবহারকারীর ভূমিকা (Admin, Manager, Cashier) খুঁজে বের করার এক্সপ্রেশন
LOOKUP(USEREMAIL(), "Users", "Email", "Role")
```

---

### ক. টেবিল-লেভেল পারমিশন (Table-Level Permissions)
প্রতিটি টেবিলের **Table settings** > **Are updates allowed?** এ গিয়ে নিচের এক্সপ্রেশনগুলো ব্যবহার করুন:

#### ১. `Settings` টেবিল (শুধুমাত্র Admin এডিট করতে পারবে):
```excel
// শুধুমাত্র Admin পরিবর্তন করতে পারবে, বাকিরা কেবল দেখতে পারবে
IF(
  LOOKUP(USEREMAIL(), "Users", "Email", "Role") = "Admin",
  "ALL_CHANGES",
  "READ_ONLY"
)
```

#### ২. `Products` টেবিল (Admin এবং Manager পণ্য বা স্টক আপডেট করতে পারবে):
```excel
// Admin ও Manager পূর্ণ অ্যাক্সেস পাবে, Cashier কেবল দেখতে পাবে
IF(
  IN(LOOKUP(USEREMAIL(), "Users", "Email", "Role"), LIST("Admin", "Manager")),
  "ALL_CHANGES",
  "READ_ONLY"
)
```

#### ৩. `StockLogs` টেবিল (Admin ও Manager নতুন স্টক লগ করতে পারবে):
```excel
// Admin ও Manager নতুন স্টক এন্ট্রি দিতে পারবে
IF(
  IN(LOOKUP(USEREMAIL(), "Users", "Email", "Role"), LIST("Admin", "Manager")),
  "ADDS_AND_UPDATES",
  "READ_ONLY"
)
```

#### ৪. `Sales` টেবিল (সকল ইউজার সেলস এন্ট্রি দিতে পারবে):
```excel
// Cashier, Manager এবং Admin সবাই বিক্রয় এন্ট্রি করতে পারবে
"ALL_CHANGES"
```

---

### খ. কলাম-লেভেল সিকিউরিটি: কেনা দাম ও মুনাফা গোপন রাখা (Show_If)
ক্যাশিয়ার যেন ব্যবসার ক্রয়মূল্য (`CostPrice`) বা প্রফিট মার্জিন দেখতে না পারে, সেজন্য AppSheet এর **Show_If** কন্ডিশন ব্যবহার করতে হবে:

#### ১. `Products` টেবিলের `CostPrice` কলামের গোপনীয়তা:
1. **Data** > **Products** > কলাম তালিকায় যান।
2. **`CostPrice`** কলামের এডিট (পেন্সিল) আইকনে ক্লিক করুন।
3. **Show?** অপশনের পাশে ফর্মুলা (Flask) আইকনে ক্লিক করে নিচের এক্সপ্রেশনটি লিখুন:

```excel
// শুধুমাত্র Admin ইউজার পণ্যের কেনা দাম (CostPrice) দেখতে পাবেন
LOOKUP(USEREMAIL(), "Users", "Email", "Role") = "Admin"
```
> **ফলাফল:** ক্যাশিয়ার বা ম্যানেজার যখন প্রোডাক্ট লিস্ট বা ডিটেইলস দেখবেন, তাদের স্ক্রিন থেকে `CostPrice` সম্পূর্ণ অদৃশ্য থাকবে!

#### ২. `StockLogs` টেবিলের `UnitCost` কলামের গোপনীয়তা:
একইভাবে **`StockLogs`** টেবিলের **`UnitCost`** কলামের **Show?** ফর্মুলায় লিখুন:

```excel
// শুধুমাত্র Admin ইউজার স্টক ইনপুটের কেনা দাম দেখতে পাবেন
LOOKUP(USEREMAIL(), "Users", "Email", "Role") = "Admin"
```

---

### গ. সিকিউরিটি ফিল্টার (Security Filters / Row-Level Security)
যদি চান ক্যাশিয়ার কেবল তার নিজের তৈরি করা সেলস ইনভয়েস দেখতে পারবে, তবে **Sales** টেবিলের **Security Filter** এ লিখুন:

```excel
// Admin সব সেলস দেখতে পাবে, কিন্তু Cashier কেবল তার নিজের সেলস দেখতে পাবে
OR(
  LOOKUP(USEREMAIL(), "Users", "Email", "Role") = "Admin",
  [CashierEmail] = USEREMAIL()
)
```

---

## ৪. `Settings` শিট থেকে ডাইনামিক শপ নেম ও লোগো প্রদর্শন

মোবাইল অ্যাপে হার্ডকোড করা নামের পরিবর্তে `Settings` শিট থেকে স্বয়ংক্রিয়ভাবে ব্র্যান্ডিং আনার পদ্ধতি:

### ১. অ্যাপের হেডারে ডাইনামিক লোগো ও টাইটেল কনফিগারেশন:
1. AppSheet এর মেনু থেকে **Settings** (গিয়ার আইকন) > **Theme & Brand** এ যান।
2. **App name:** এর জায়গায় ফর্মুলা নির্বাচন করে লিখুন:
   ```excel
   // Settings টেবিলের প্রথম সারির স্টোর নেম লোড করা
   INDEX(Settings[StoreName], 1)
   ```
3. **App logo:** এর জন্য কাস্টম ইমেজ URL বা ফর্মুলা ব্যবহার করুন:
   ```excel
   // Settings টেবিল থেকে লোগো ইমেজ লোড করা
   INDEX(Settings[LogoUrl], 1)
   ```

### ২. মোবাইল অ্যাপ ভিউয়ের শীর্ষে ডাইনামিক ব্র্যান্ডিং কার্ড (Dashboard View):
1. **UX** > **Views** এ গিয়ে একটি নতুন **Detail View** তৈরি করুন যার নাম দিন `Store Header`।
2. For this data: সিলেক্ট করুন `Settings`।
3. View type: নির্বাচন করুন `Card` (বা `Detail`)।
4. এতে মোবাইল অ্যাপের হোমপেজে স্বয়ংক্রিয়ভাবে আপনার গুগল শিটে থাকা নাম, ঠিকানা ও লোগো ডাইনামিকভাবে রেন্ডার হবে। আপনি গুগল শিটে নাম বা লোগো পরিবর্তন করলে অ্যাপ রিফ্রেশ হওয়ামাত্রই তা মোবাইল অ্যাপে সাথে সাথে পরিবর্তন হয়ে যাবে!

---

## ৫. মোবাইল ভিউ ও ইউজার এক্সপেরিয়েন্স (UX Recommendations)

AppSheet-এ চমৎকার মোবাইল অভিজ্ঞতার জন্য নিচের ভিউগুলো সাজিয়ে নিন:

1. **পণ্য ক্যাটালগ (Products View):**
   - View Type: `Card` বা `Deck`।
   - Primary Header: `ProductName`।
   - Secondary Header: `SellingPrice` (মুদ্রাসহ)।
   - Summary Column: `StockQuantity` (বর্তমান স্টক)।
   - Action: ক্যামেরা বারকোড স্ক্যানার দিয়ে ঝটপট পণ্য খোঁজার জন্য বারকোড সার্চ চালু রাখুন।

2. **ইনভেন্টরি আপডেট (Add Stock Form):**
   - শুধুমাত্র ম্যানেজার ও অ্যাডমিনের মেনুতে দৃশ্যমান থাকবে।
   - ফর্ম টাইপ: `Form View` on `StockLogs`।

3. **বিক্রয় হিস্ট্রি (Sales View):**
   - View Type: `Table`।
   - গ্রুপ করুন: `Timestamp` (তারিখ অনুযায়ী)।

