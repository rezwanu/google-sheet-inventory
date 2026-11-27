# এন্টারপ্রাইজ POS ও ইনভেন্টরি সিস্টেম — ফ্রন্টএন্ড রিডিজাইন ও আধুনিকায়ন মাস্টার রোডম্যাপ

> **সংস্করণ:** ৩.০ (পূর্ণাঙ্গ রিডিজাইন + কোড স্প্লিটিং, ভার্চুয়ালাইজেশন, ডার্ক মোড ও PWA — **বাস্তবায়িত** ✓)  
> **সম্পন্ন তারিখ:** ২৭ নভেম্বর, ২০২৬  
> **প্রজেক্ট:** পাবনা বস্ত্রালয় / Enterprise POS & Inventory System (`React 18 + Vite 6 + Tailwind CSS 3.4`)  
> **ডিজাইন দর্শন:** Utilitarian Minimalism (Linear, Stripe এবং হাই-ডেনসিটি রিটেইল সফটওয়্যার অনুপ্রাণিত)  
> **ডাটা ও ব্যাকএন্ড সুরক্ষা নীতি:** 🛡️ **১০০% ব্যাকওয়ার্ড কম্প্যাটিবল — `services/storage.js`, `services/api.js`, `backend/Code.gs` এবং পূর্বের গুগল শিট/লোকাল স্টোরেজ ডেটার কোনো কাঠামোগত পরিবর্তন করা হয়নি।**

---

## চূড়ান্ত বিল্ড আউটপুট (২৭ নভেম্বর ২০২৬ — Code Splitting পরবর্তী)

| আউটপুট | পূর্বের সাইজ (v2.1) | বর্তমান সাইজ (v3.0) | Gzip |
|---|---|---|---|
| মেইন এন্ট্রি JS (`dist/assets/index-D4PiZ0PT.js`) | ৩,১০৪.৯৮ kB | **৪২৮.৯৮ kB** (**৮৬% হ্রাস**) | ১০২.৮৯ kB |
| `vendor-react` (`react`, `react-dom`) | — | ১৪৩.০৮ kB | ৪৫.৮৪ kB |
| `vendor-icons` (`lucide-react`) | — | ৮০.৩৯ kB | ১৬.১০ kB |
| `vendor-virtual` (`@tanstack/react-virtual`) | — | ৩৭.২৮ kB | ১১.১০ kB |
| `vendor-scanner` (Lazy — স্ক্যানার/বারকোড খুললে লোড হয়) | — | ৪০৩.১১ kB | ১১৪.৪৫ kB |
| CSS (`dist/assets/index-C9iVtmwh.css`) | ৯২.০৭ kB | ৯৬.৬১ kB | ১৫.৯৪ kB |
| **Build সময় ও সতর্কতা** | ৭.৯২s (Chunk Warning ছিল) | **১৩.১৮s** | ✓ **Zero Errors & Zero Chunk Warnings** |

**Git Commit:** `29cefd5` — `feat: Complete Frontend Redesign - Utilitarian Minimalism (Linear/Stripe)`  
**ফাইল পরিবর্তন:** ৭০ ফাইল, ১২,৭৯৯ insertions, ১১,০৭৬ deletions

---

## নতুন তৈরি ফাইলসমূহ (এই sprint-এ)

| ফাইল | ধরন | বিবরণ |
|---|---|---|
| `frontend/src/components/ui/SlideOverDrawer.jsx` | নতুন | ডানদিক থেকে slide-over drawer, Esc close |
| `frontend/src/components/ui/StatusBadge.jsx` | নতুন | flat semantic badge (success/warning/danger) |
| `frontend/src/components/ui/SkeletonLoader.jsx` | নতুন | KPI strip, table rows, catalog grid skeletons |
| `frontend/src/components/ui/EmptyState.jsx` | নতুন | clean minimal empty state component |
| `frontend/src/components/ui/ConfirmDialog.jsx` | নতুন | confirmation modal, Esc close, Processing state |
| `frontend/src/components/ui/index.js` | নতুন | barrel export |
| `frontend/src/components/OverviewDashboard.jsx` | নতুন | Executive Overview Dashboard (4 KPI + 65/35 layout) |
| `frontend/src/components/InventoryView.jsx` | নতুন | High-density inventory table + mobile cards |
| `frontend/src/components/SettingsView.jsx` | নতুন | 2-column white-label settings page |
| `frontend/src/components/ProductDrawer.jsx` | নতুন | Slide-over Add/Edit Product drawer |
| `frontend/src/components/StoreLogo.jsx` | নতুন | flat brand logo, no gradients/shadows |
| `frontend/src/hooks/useTheme.js` | নতুন (v3.0) | Light / Dark / System থিম ম্যানেজমেন্ট (`pos_ui_theme`) |
| `frontend/src/hooks/useGlobalShortcuts.js` | নতুন (v3.0) | `/` সার্চ, `Escape`, `F1`–`F10`, `Alt+E/C` শর্টকাট হুক |
| `frontend/public/manifest.webmanifest` | নতুন (v3.0) | PWA ম্যানিফেস্ট ফাইল (`base: './'` সামঞ্জস্যপূর্ণ) |
| `frontend/public/sw.js` | নতুন (v3.0) | স্ট্যাটিক অ্যাপ-শেল PWA Service Worker (API রিকোয়েস্ট বাইপাসসহ) |
| `frontend/public/icon.svg` | নতুন (v3.0) | ভেক্টর PWA অ্যাপ আইকন |
| `frontend/src/components/EditProductModal.jsx` | অপসারিত (v3.0) | অব্যবহৃত ফাইল সম্পূর্ণভাবে ডিলিট ও `App.jsx` ইমপোর্ট ক্লিন করা হয়েছে |

---

## ডিজাইন কনস্ট্রেইন্ট চূড়ান্ত স্ক্যান ফলাফল

| কনস্ট্রেইন্ট | শুরুর সংখ্যা | চূড়ান্ত সংখ্যা |
|---|---|---|
| `bg-gradient-*` | ১০০+ | **০** ✓ |
| `indigo-*/purple-*/violet-*/pink-*` (UI code) | ১৫০০+ | **০** ✓ |
| `backdrop-blur*` (UI code) | ৩০+ | **০** ✓ |
| `shadow-lg/xl/2xl` (UI code) | ৭০+ | **০** ✓ |
| `rounded-2xl/3xl` (UI code) | ৩০০+ | **০** ✓ |
| UI ইমোজি (navigation/heading/button) | ৫০+ | **০** ✓ |

> **দ্রষ্টব্য:** `Sidebar.jsx` ও `SlideOverDrawer.jsx`-এ `backdrop-blur` শব্দটি শুধুমাত্র **Bengali comment text**-এ ("শূন্য backdrop-blur") আছে — কোনো actual CSS class নয়।

---

## ১. মূল ডিজাইন সিস্টেম ও কঠোর নিয়মাবলি (Design System & Strict Constraints)

ভবিষ্যতে যেকোনো ধাপে কোড করার আগে নিচের টোকেন ও নিয়মগুলো **অবশ্যই** মেনে চলতে হবে:

### ১.১ কালার সিস্টেম (Color Palette - Light Mode Default)
| এলিমেন্ট / ব্যবহার | হেক্স কোড / Tailwind টোকেন | প্রয়োগ ক্ষেত্র |
|---|---|---|
| **Canvas Background** | `#FAFAFA` (`bg-[#FAFAFA]`) | মূল অ্যাপের ব্যাকগ্রাউন্ড |
| **Elevated Cards / Panels** | `#FFFFFF` (`bg-white`) | সব কার্ড, টেবিল, ড্রয়ার, POS ক্যাটালগ ও কার্ট প্যানেল |
| **Subtle Surface** | `#F5F5F5` (`bg-neutral-100`) | হোভার স্টেট, প্লেসহোল্ডার ইমেজ ফ্রেম, ইনএক্টিভ ট্যাব |
| **Primary Text** | `#111111` (`text-[#111111]`) | শিরোনাম, প্রোডাক্ট নাম, মূল ভ্যালু ও মোট অঙ্ক |
| **Secondary / Muted Text** | `#525252` / `#737373` | সাবটাইটেল, ক্যাটাগরি, তারিখ, টেবিল হেডার ও লেবেল |
| **Primary Action Accent** | `#0F172A` (`bg-[#0F172A]`) | একমাত্র ব্র্যান্ড অ্যাকসেন্ট — প্রাইমারি CTA বাটন (`New Sale`, `Complete Sale & Print`, `Save`) |
| **Border & Elevation** | `border-neutral-200/80` (`1px`) | হেয়ারলাইন `1px` বর্ডার (`shadow-none`) — কোনো ড্রপ শ্যাডো ছাড়াই ফ্ল্যাট এলিভেশন |
| **Success (In Stock / Paid)** | `#15803D` (Emerald) | কেবল স্ট্যাটাস ব্যাজ ও সাকসেস এলার্ট (`bg-emerald-50 text-[#15803D] border-emerald-200`) |
| **Warning (Low Stock / Due)** | `#B45309` (Amber) | কেবল লো-স্টক সতর্কতা ও পেন্ডিং ব্যাজ (`bg-amber-50 text-[#B45309] border-amber-200`) |
| **Danger (Out of Stock / Delete)** | `#B91C1C` (Crimson) | কেবল স্টক শেষ ব্যাজ ও ডিলিট বাটন (`bg-red-50 text-[#B91C1C] border-red-200`) |

### ১.২ টাইপোগ্রাফি, রেডিয়াস ও স্পেসিং নিয়ম
- **ফন্ট (Typography):**
  - হেডিং: `Plus Jakarta Sans` অথবা `Inter` (`tracking-tight font-semibold`) + বাংলা স্ক্রিপ্টের জন্য `Noto Sans Bengali` / `Hind Siliguri` ফলব্যাক।
  - **সংখ্যা, দাম (৳), SKU, ইনভয়েস নং, তারিখ ও টোটাল:** বাধ্যতামূলকভাবে `font-mono tabular-nums` ব্যবহার করতে হবে যাতে কলাম ও টেবিলের সংখ্যা উল্লম্বভাবে (vertically) নিখুঁত অ্যালাইন থাকে।
- **বর্ডার রেডিয়াস (Border Radius):** সর্বোচ্চ `rounded-md` (`6px`) অথবা `rounded-lg` (`8px`)। কোনো কার্ড বা মডালে `rounded-2xl` / `rounded-3xl` / `rounded-full` (ট্যাব বা বাটনে) ব্যবহার করা যাবে না।
- **স্পেসিং (8pt Grid):** কার্ড এবং প্যানেল প্যাডিং `p-5` বা `p-6` (`20px`/`24px`) এবং পর্যাপ্ত হোয়াইটস্পেস বজায় রাখা।

### ১.৩ কঠোর নেগেটিভ কনস্ট্রেইন্টস (যেগুলো সম্পূর্ণ নিষিদ্ধ)
- ❌ **NO Purple, Indigo, Violet, Pink বা Neon Gradients** (`bg-gradient-*`, `indigo-*`, `purple-*`, `pink-*`, `violet-*` সম্পূর্ণ নিষিদ্ধ)।
- ❌ **NO Glassmorphism (`backdrop-blur`)** এবং **NO Heavy Drop Shadows (`shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`)**।
- ❌ **NO Emojis** (নেভিগেশন, হেডিং, বাটন, ব্যাজ বা টোস্টে কোনো ইমোজি যেমন `✨`, `👑`, `🛍️`, `🔒`, `🛒` থাকবে না; কেবল `lucide-react` ভেক্টর আইকন)।
- ❌ **NO Decorative Circular Icon-Badge Cards** এবং **NO Generic Marketing Copy**।

---

## ২. বর্তমান কোডবেস অডিট মেট্রিক্স (Baseline Telemetry — শুরুর অবস্থা)

| ফাইল / কম্পোনেন্ট | গ্রেডিয়েন্ট (`bg-gradient-`) | Purple / Indigo / Pink | Blur (`backdrop-blur`) | ভারী শ্যাডো (`shadow-lg/xl/2xl`) | বড় রেডিয়াস (`rounded-2xl/3xl/full`) | `tabular-nums` ব্যবহার |
|---|---|---|---|---|---|---|
| `AddProductModal.jsx` | ১৬ | ২০৩ | ২ | ৮ | ৬৬ | ০ |
| `OrdersPage.jsx` | ১৬ | ১৯৩ | ৯ | ৩০ | ৭১ | ০ |
| `CouponModal.jsx` | ১৩ | ২৩ | ২ | ৮ | ৪৭ | ০ |
| `ExpensesModal.jsx` | ১১ | ৫৬ | ৫ | ৮ | ২০ | ০ |
| `AddStockModal.jsx` | ১১ | ৫৪ | ১ | ৪ | ৫১ | ০ |
| `UsersModal.jsx` | ১০ | ১৯২ | ৫ | ১৬ | ৩৩ | ০ |
| `CartPage.jsx` | ১০ | ৮৩ | ০ | ৮ | ২৪ | ০ |
| `CustomersModal.jsx` | ১০ | ৭৪ | ৩ | ১১ | ৩১ | ০ |
| `SettingsModal.jsx` | ৯ | ৭৬ | ১ | ৫ | ১৮ | ০ |
| `Navbar.jsx` | ৬ | ৫৭ | ১ | ৬ | ১৪ | ০ |
| `CheckoutPage.jsx` | ৫ | ৮৯ | ১ | ৬ | ৩৯ | ০ |
| `EditProductModal.jsx` | ৩ | ১২৯ | ৩ | ২ | ৩০ | ০ |
| `ProductCatalog.jsx` | ৩ | ৫১ | ৭ | ৩ | ৩৬ | ০ |
| `PosCartPanel.jsx` | ২ | ৫ | ০ | ২ | ২ | ০ |
| `Sidebar.jsx` | ০ | ২১ | ২ | ৩ | ১০ | ০ |
| `StockTransferModal.jsx` | ০ | ৯০ | ০ | ০ | ৬০ | ২১ |
| `AnalyticsDashboard.jsx` | ০ | ৪১ | ২ | ৫ | ২২ | ৪৪ |

> **চূড়ান্ত ফলাফল:** সব ফাইলে `bg-gradient-`, `purple/indigo/violet/pink`, `backdrop-blur`, `shadow-lg/xl/2xl` এবং UI ইমোজি সংখ্যা **০ (শূন্য)** অর্জিত ✓

---

## ৩. ধাপে ধাপে বাস্তবায়ন পরিকল্পনা (৮-ধাপের মাস্টার রোডম্যাপ) — সম্পূর্ণ ✓

---

### ধাপ ১: গ্লোবাল ডিজাইন ফাউন্ডেশন ও শেয়ার্ড UI প্রিমিটিভ লাইব্রেরি ✓ সম্পন্ন

**করণীয় চেকলিস্ট:**
- [x] `frontend/index.html`: SVG favicon সেট, `Noto Sans Bengali` ফন্ট যুক্ত।
- [x] `frontend/tailwind.config.js`: Bengali font fallback, semantic design tokens।
- [x] `frontend/src/index.css`: `#0F172A` link override, `.touch-target` (44px), `.font-tabular`।
- [x] `frontend/src/main.jsx`: ErrorBoundary রিফ্যাক্টর (emoji/indigo/shadow অপসারণ)।
- [x] `SlideOverDrawer.jsx`: ডানদিক থেকে ওপেন হওয়া ক্লিন স্লাইড-ওভার ড্রয়ার।
- [x] `StatusBadge.jsx`: flat semantic badge (success/warning/danger/neutral/accent)।
- [x] `SkeletonLoader.jsx`: KPI, টেবিল রো ও catalog grid skeleton।
- [x] `EmptyState.jsx`: পরিচ্ছন্ন মিনিমাল empty state কম্পোনেন্ট।
- [x] `ConfirmDialog.jsx`: ConfirmDialog (Esc close, "Processing..." state)।
- [x] `ui/index.js`: barrel export।

---

### ধাপ ২: নেভিগেশন শেল ও রেসপন্সিভ ফ্রেম ✓ সম্পন্ন

**করণীয় চেকলিস্ট:**
- [x] `Sidebar.jsx`: ৬টি কোর মডিউল pinned (Overview, POS Terminal, Inventory, Invoices/Sales, Customers, Settings) + collapsible secondary groups। কোনো emoji/blur/gradient নেই।
- [x] `StoreLogo.jsx`: flat `#FFFFFF`/`#0F172A` rounded-md, no gradients/shadows।
- [x] `Navbar.jsx`: minimal top bar (h-14, `/` global search kbd hint, `#0F172A` "New Sale" CTA, sync dot, held carts, compact user menu)। emoji/gradients/blur সম্পূর্ণ অপসারণ।
- [x] `App.jsx`: মোবাইল slide-out drawer, `currentView` routing, global `/` shortcut।

---

### ধাপ ৩: এক্সিকিউটিভ ওভারভিউ ড্যাশবোর্ড ✓ সম্পন্ন

**করণীয় চেকলিস্ট:**
- [x] `OverviewDashboard.jsx` নতুন তৈরি।
- [x] ৪-মেট্রিক KPI strip (Today's Sales, Total Orders, Net Profit, Low Stock Items) + percentage delta। `bg-white border border-neutral-200/80 rounded-lg p-5 shadow-none`।
- [x] অ্যাসিমেট্রিক ২-কলাম লেআউট: Recent Transactions টেবিল (৬৫%) + Low Stock Alerts প্যানেল "Restock" অ্যাকশন সহ (৩৫%)।
- [x] ডাটা লোডিংয়ে `SkeletonLoader` দেখানো।
- [x] Admin লগইনের পর `currentView` → `'overview'` হিসেবে set।

---

### ধাপ ৪: হাই-স্পিড POS বিলিং টার্মিনাল ও মোবাইল শিট ✓ সম্পন্ন

**করণীয় চেকলিস্ট:**
- [x] `ProductCatalog.jsx`: flat neutral frames, `/` shortcut hint, skeleton support, StatusBadge, `tabular-nums`, ConfirmDialog for delete, 44px mobile targets।
- [x] `PosCartPanel.jsx`: inline Cash|bKash|Card selector, "Complete Sale & Print" CTA (`onDirectCompleteSale` + `isProcessingSale`), ConfirmDialog for Clear Cart।
- [x] `CartDrawer.jsx`: full-height mobile sheet, inline payment selector, Esc close, 44px steppers।
- [x] `InvoiceModal.jsx`: `#FFFFFF`/`#0F172A` toolbar, tabular-nums, Esc listener, 80mm Thermal vs A4 toggle।
- [x] `App.jsx`: sticky bottom mobile cart summary bar (`lg:hidden fixed bottom-0`) — floating pill সম্পূর্ণ অপসারণ।

---

### ধাপ ৫: ইনভেন্টরি ম্যানেজমেন্ট ভিউ ও স্লাইড-ওভার ড্রয়ার ✓ সম্পন্ন

**করণীয় চেকলিস্ট:**
- [x] `InventoryView.jsx` নতুন তৈরি: high-density table (Product/SKU, Category, Stock Status, Cost Price w/RBAC, Selling Price, Quick Actions) + mobile stacked cards, integrated ProductDrawer, TableSkeletonRows, EmptyState, ConfirmDialog।
- [x] `ProductDrawer.jsx` নতুন তৈরি: slide-over Add/Edit Product (Basic Info/Pricing & Stock/Variants & Batch tabs), inline validation, "Processing..." save button।
- [x] `App.jsx`: `currentView === 'inventory'` route সংযোগ।

---

### ধাপ ৬: হোয়াইট-লেবেল সেটিংস ভিউ ✓ সম্পন্ন

**করণীয় চেকলিস্ট:**
- [x] `SettingsView.jsx` + `SettingsModal.jsx`: 2-column white-label settings (Branding/Google Sheets API/Integrations tabs)।
- [x] `rounded-3xl shadow-2xl backdrop-blur-xs` ও `indigo/violet` হেডার সম্পূর্ণ অপসারণ।
- [x] `App.jsx`: `currentView === 'settings'` route সংযোগ।

---

### ধাপ ৭: অবশিষ্ট ৩৫+ এন্টারপ্রাইজ মডিউলের ইউনিফর্ম ডিজাইন মাইগ্রেশন ✓ সম্পন্ন

#### ফেজ ৭এ: সেলস, অর্ডার ও কাস্টমার মডিউল ✓
- [x] `OrdersPage.jsx`, `SalesHistoryModal.jsx`, `InvoiceLookupModal.jsx`, `SalesReturnModal.jsx`
- [x] `CustomersModal.jsx`, `CustomerLedgerModal.jsx`, `CustomerOrdersModal.jsx`, `CustomerOrderTrackingModal.jsx`
- [x] `CouponModal.jsx`, `RFMCampaignModal.jsx`, `AbandonedCartModal.jsx`, `HeldCartsModal.jsx`, `BulkCourierDispatchModal.jsx`, `BulkSmsDispatchModal.jsx`, `SteadfastLiveTrackingModal.jsx`

#### ফেজ ৭বি: হিসাব, খরচের খাতা ও ক্যাশ অডিট ✓
- [x] `ExpensesModal.jsx`, `PosQuickExpenseModal.jsx`
- [x] `CashRegisterModal.jsx`, `BankManagementModal.jsx`
- [x] `AnalyticsDashboard.jsx`, `AuditLogsModal.jsx`

#### ফেজ ৭সি: গোডাউন, টেক্সটাইল, মহাজন ও এডমিন টুলস ✓
- [x] `StockTransferModal.jsx` (৮,১৮৬ লাইন — সম্পূর্ণ ৫৯টি indigo/purple/pink violation fix)
- [x] `GodownStockAlertView.jsx`, `AddStockModal.jsx`, `LowStockModal.jsx`, `ExpiryAlertModal.jsx`
- [x] `TailoringModal.jsx`, `FabricCutModal.jsx`, `FabricWastageModal.jsx`, `QuickCalculatorModal.jsx`
- [x] `SuppliersModal.jsx`, `PurchaseOrdersModal.jsx`
- [x] `AddProductModal.jsx`, `EditProductModal.jsx` (সম্পূর্ণ ১১৩+৭০+৩৬ violation fix)
- [x] `UsersModal.jsx`, `BackupRestoreModal.jsx`, `BarcodePrintModal.jsx`, `BarcodeStickerModal.jsx`, `BarcodeScannerModal.jsx`, `KeyboardShortcutsModal.jsx`, `AuthModal.jsx`, `AdminPinModal.jsx`, `ProductDetailsModal.jsx`, `ProductVariantSelectModal.jsx`, `RichTextEditor.jsx`

---

### ধাপ ৮: পাওয়ার-ইউজার UX, রেসপন্সিভ অডিট ও চূড়ান্ত QA ভেরিফিকেশন ✓ সম্পন্ন

**যাচাইকরণ চেকলিস্ট:**
- [x] **কিবোর্ড নেভিগেশন:** `/` → POS/Inventory/Global search focus; `Esc` → সব modal/drawer বন্ধ; POS shortcuts `F1`–`F10`, `Alt+E`, `Alt+C` অক্ষুণ্ণ।
- [x] **রেসপন্সিভ:** `375px` sticky bottom cart bar, slide-out sidebar; `1440px` collapsible sidebar + split-screen POS।
- [x] **ডিজাইন কনস্ট্রেইন্ট স্ক্যান:** PowerShell regex scan — `0` real violations সমগ্র `frontend/src` জুড়ে।
- [x] **বিল্ড:** `vite build` ✓ — built in 7.92s, Zero errors। CSS 92kB, JS 3,104kB।
- [x] **ডাটা রিগ্রেশন:** `services/storage.js`, `services/api.js`, `backend/Code.gs`, LocalStorage keys — সম্পূর্ণ অক্ষুণ্ণ।

---

## ৪. ধাপ ২ (v3.0): কোড ক্লিনআপ, পারফরম্যান্স, ডার্ক মোড ও PWA বাস্তবায়ন (২৭ নভেম্বর ২০২৬)

### ৪.১ কোড ক্লিনআপ ও কম্পোনেন্ট একীভূতকরণ (Code Cleanup & Consolidation) ✓ সম্পন্ন
- [x] **অব্যবহৃত `EditProductModal.jsx` অপসারণ:** `App.jsx`-এর অব্যবহৃত ইমপোর্ট সরিয়ে ১৪৩.৩ KB-এর `EditProductModal.jsx` ফাইলটি ডিলিট করা হয়েছে; সব এডিট অ্যাকশন `ProductDrawer.jsx`-এ চলছে।
- [x] **`AddProductModal.jsx` ও `ProductDrawer.jsx` ব্যালান্সড ইন্টিগ্রেশন:** পুরোনো ডাটা ও জটিল টেক্সটাইল ফিচার (Bundle, থান/গজ-গিরা হিসাব, অটো স্টিকার প্রিন্ট) সুরক্ষিত রাখতে `currentView === 'add_product'` ফ্লোতে `AddProductModal`-কে `React.lazy` করা হয়েছে (প্রাথমিক বান্ডেলে ০ KB লোড), এবং ইনভেন্টরি/কুইক-অ্যাড-এ `ProductDrawer` সচল রাখা হয়েছে।
- [x] **`SettingsModal.jsx` ও `SettingsView.jsx` একীভূতকরণ:** লগইনকৃত অ্যাডমিনদের জন্য `Navbar` ও `ProductCatalog`-এর সেটিংস ট্রিগার সরাসরি `SettingsView` পেজে রুট করা হয়েছে (`SettingsModal` এখন শুধু গেস্ট/অফলাইন দ্রুত কনফিগের ব্যাকআপ র‍্যাপার)।
- [x] **`App.jsx` মডিউলারাইজেশন:** গ্লোবাল কিবোর্ড শর্টকাট ইঞ্জিন (`frontend/src/hooks/useGlobalShortcuts.js`) এবং থিম ম্যানেজমেন্ট (`frontend/src/hooks/useTheme.js`) আলাদা হুকে এক্সট্রাক্ট করা হয়েছে।

### ৪.২ পারফরম্যান্স ও বান্ডেল অপটিমাইজেশন (Performance Optimization) ✓ সম্পন্ন
- [x] **JS Bundle Code Splitting (`React.lazy` & `Suspense`):** `App.jsx`-এর ৪৩+ ভারী ভিউ ও মডাল (`StockTransferModal`, `AnalyticsDashboard`, `OrdersPage`, `AddProductModal`, `UsersModal`, `ExpensesModal`, `AddStockModal` ইত্যাদি) `React.lazy()` দিয়ে আলাদা করা হয়েছে এবং শুধু খোলা অবস্থায় মাউন্ট (`conditional render`) করা হয়েছে। `vite.config.js`-এ `manualChunks` (`vendor-react`, `vendor-icons`, `vendor-scanner`, `vendor-virtual`) যোগ করে মেইন JS বান্ডেল ৩,১০৪.৯৮ kB থেকে **৪২৮.৯৮ kB** (১০২.৮৯ kB gzip)-এ নামানো হয়েছে।
- [x] **বড় ডাটার জন্য Virtualized Table (`@tanstack/react-virtual`):** `InventoryView.jsx` এবং `OrdersPage.jsx`-এর ডেস্কটপ টেবিলে `@tanstack/react-virtual` (`useVirtualizer`) ও স্টিকি `<thead>` যোগ করা হয়েছে এবং মোবাইল/কার্ড ভিউতে ইনক্রিমেন্টাল `Load More` উইন্ডোয়িং যুক্ত করা হয়েছে।

### ৪.৩ লাইভ ব্রাউজার ও রেসপন্সিভ QA ভেরিফিকেশন (Manual / Live Browser QA)
- [ ] **মাল্টি-ডিভাইস লাইভ ব্রাউজার ভিজ্যুয়াল চেক (`375px`, `768px`, `1440px`):** Chrome DevTools remote debugging (`DevToolsActivePort`) চালু না থাকায় স্বয়ংক্রিয় ব্রাউজার ইনস্পেকশন সম্পন্ন করা যায়নি; লোকাল সার্ভার (`npm run dev` বা `npm run preview`) চালিয়ে ব্যবহারকারীকে সরাসরি ব্রাউজারে নিচের বিষয়গুলো দেখে নিতে হবে:
  - লাইট/ডার্ক মোড সুইচ ও `OverviewDashboard`, `InventoryView`, `OrdersPage` স্ক্রল পারফরম্যান্স।
  - `375px` মোবাইলে সাইডবার ড্রয়ার, স্টিকি বটম কার্ট বার -> `CartDrawer`, ও `80mm Thermal / A4` প্রিন্ট প্রিভিউ।

### ৪.৪ আধুনিক ফিচার সম্প্রসারণ (Dark Mode & Offline PWA) ✓ সম্পন্ন
- [x] **ডার্ক মোড (Dark Mode Support):** `tailwind.config.js`-এ `darkMode: 'class'` চালু করা হয়েছে, `index.html`-এ ফ্ল্যাশ-মুক্ত ইনিশিয়ালাইজার স্ক্রিপ্ট যোগ করা হয়েছে, `index.css`-এ নিউট্রাল ডার্ক ওভাররাইড (`#09090B` ক্যানভাস, `#111113` কার্ড, `#27272A` বর্ডার — শূন্য গ্রেডিয়েন্ট/শূন্য ইন্ডিগো-পার্পল) ও `@media print`-এ সাদা কাগজে কালো প্রিন্ট গ্যারান্টি যুক্ত হয়েছে। `Navbar.jsx`-এ কুইক Sun/Moon টগল এবং `SettingsView.jsx`-এ `Light | Dark | System` সিলেক্টর কার্ড যোগ করা হয়েছে।
- [x] **অফলাইন PWA সাপোর্ট:** `frontend/public/manifest.webmanifest`, `icon.svg`, ও `sw.js` তৈরি করে `frontend/src/main.jsx`-এ শুধু প্রোডাকশন বিল্ডে রেজিস্টার করা হয়েছে। `sw.js` শুধুমাত্র স্ট্যাটিক অ্যাপ-শেল ক্যাশ করে এবং `script.google.com` বা POST রিকোয়েস্ট সম্পূর্ণ বাইপাস করে যাতে গুগল শিট ডাটা সিঙ্কে কোনো প্রভাব না পড়ে।

### ৪.৫ পরবর্তীতে ঐচ্ছিক কারিগরি কাজ
- [ ] লাইভ ব্রাউজারে ৪.৩ চেকলিস্ট যাচাই করা।
- [ ] ভবিষ্যতে প্রয়োজন হলে `App.jsx`-এর কার্ট ও সিঙ্ক স্টেটগুলো আলাদা React Context / কাস্টম হুকে স্থানান্তর করা।
