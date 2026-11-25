# এন্টারপ্রাইজ POS ও ইনভেন্টরি সিস্টেম — ফ্রন্টএন্ড রিডিজাইন ও আধুনিকায়ন মাস্টার রোডম্যাপ

> **সংস্করণ:** ১.০ (পূর্ণাঙ্গ সিস্টেম ফ্রন্টএন্ড আপগ্রেড ব্লুপ্রিন্ট — Pending Implementation)  
> **তারিখ:** ২৫ নভেম্বর, ২০২৬  
> **প্রজেক্ট:** পাবনা বস্ত্রালয় / Enterprise POS & Inventory System (`React 18 + Vite 6 + Tailwind CSS 3.4`)  
> **ডিজাইন দর্শন:** Utilitarian Minimalism (Linear, Stripe এবং হাই-ডেনসিটি রিটেইল সফটওয়্যার অনুপ্রাণিত)  
> **ডাটা ও ব্যাকএন্ড সুরক্ষা নীতি:** 🛡️ **১০০% ব্যাকওয়ার্ড কম্প্যাটিবল — `services/storage.js`, `services/api.js`, `backend/Code.gs` এবং পূর্বের গুগল শিট/লোকাল স্টোরেজ ডেটার কোনো কাঠামোগত পরিবর্তন করা হবে না।**

---

## ১. মূল ডিজাইন সিস্টেম ও কঠোর নিয়মাবলি (Design System & Strict Constraints)

ভবিষ্যতে যেকোনো ধাপে কোড করার আগে নিচের টোকেন ও নিয়মগুলো **অবশ্যই** মেনে চলতে হবে:

### ১.১ কালার সিস্টেম (Color Palette - Light Mode Default)
| এলিমেন্ট / ব্যবহার | হেক্স কোড / Tailwind টোকেন | প্রয়োগ ক্ষেত্র |
|---|---|---|
| **Canvas Background** | `#FAFAFA` (`bg-[#FAFAFA]`) | মূল অ্যাপের ব্যাকগ্রাউন্ড |
| **Elevated Cards / Panels** | `#FFFFFF` (`bg-white`) | সব কার্ড, টেবিল, ড্রয়ার, POS ক্যাটালগ ও কার্ট প্যানেল |
| **Subtle Surface** | `#F5F5F5` (`bg-neutral-100`) | হোভার স্টেট, প্লেসহোল্ডার ইমেজ ফ্রেম, ইনএক্টিভ ট্যাব |
| **Primary Text** | `#111111` (`text-[#111111]`) | শিরোনাম, প্রোডাক্ট নাম, মূল ভ্যালু ও মোট অঙ্ক |
| **Secondary / Muted Text** | `#525252` / `#737373` | সাবটাইটেল, ক্যাটাগরি, তারিখ, টেবিল হেডার ও লেবেল |
| **Primary Action Accent** | `#0F172A` (`bg-[#0F172A]`) | একমাত্র ব্র্যান্ড অ্যাকসেন্ট — প্রাইমারি CTA বাটন (`New Sale`, `Complete Sale & Print`, `Save`) |
| **Border & Elevation** | `border-neutral-200/80` (`1px`) | হেয়ারলাইন `1px` বর্ডার (`shadow-none`) — কোনো ড্রপ শ্যাডো ছাড়াই ফ্ল্যাট এলিভেশন |
| **Success (In Stock / Paid)** | `#15803D` (Emerald) | কেবল স্ট্যাটাস ব্যাজ ও সাকসেস এলার্ট (`bg-emerald-50 text-[#15803D] border-emerald-200`) |
| **Warning (Low Stock / Due)** | `#B45309` (Amber) | কেবল লো-স্টক সতর্কতা ও পেন্ডিং ব্যাজ (`bg-amber-50 text-[#B45309] border-amber-200`) |
| **Danger (Out of Stock / Delete)** | `#B91C1C` (Crimson) | কেবল স্টক শেষ ব্যাজ ও ডিলিট বাটন (`bg-red-50 text-[#B91C1C] border-red-200`) |

### ১.২ টাইপোগ্রাফি, রেডিয়াস ও স্পেসিং নিয়ম
- **ফন্ট (Typography):**
  - হেডিং: `Plus Jakarta Sans` অথবা `Inter` (`tracking-tight font-semibold`) + বাংলা স্ক্রিপ্টের জন্য `Noto Sans Bengali` / `Hind Siliguri` ফলব্যাক।
  - **সংখ্যা, দাম (৳), SKU, ইনভয়েস নং, তারিখ ও টোটাল:** বাধ্যতামূলকভাবে `font-mono tabular-nums` ব্যবহার করতে হবে যাতে কলাম ও টেবিলের সংখ্যা উল্লম্বভাবে (vertically) নিখুঁত অ্যালাইন থাকে।
- **বর্ডার রেডিয়াস (Border Radius):** সর্বোচ্চ `rounded-md` (`6px`) অথবা `rounded-lg` (`8px`)। কোনো কার্ড বা মডালে `rounded-2xl` / `rounded-3xl` / `rounded-full` (ট্যাব বা বাটনে) ব্যবহার করা যাবে না।
- **স্পেসিং (8pt Grid):** কার্ড এবং প্যানেল প্যাডিং `p-5` বা `p-6` (`20px`/`24px`) এবং পর্যাপ্ত হোয়াইটস্পেস বজায় রাখা।

### ১.৩ কঠোর নেগেটিভ কনস্ট্রেইন্টস (যেগুলো সম্পূর্ণ নিষিদ্ধ)
- ❌ **NO Purple, Indigo, Violet, Pink বা Neon Gradients** (`bg-gradient-*`, `indigo-*`, `purple-*`, `pink-*`, `violet-*` সম্পূর্ণ নিষিদ্ধ)।
- ❌ **NO Glassmorphism (`backdrop-blur`)** এবং **NO Heavy Drop Shadows (`shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`)**।
- ❌ **NO Emojis** (নেভিগেশন, হেডিং, বাটন, ব্যাজ বা টোস্টে কোনো ইমোজি যেমন `✨`, `👑`, `🛍️`, `🔒`, `🛒` থাকবে না; কেবল `lucide-react` ভেক্টর আইকন)।
- ❌ **NO Decorative Circular Icon-Badge Cards** এবং **NO Generic Marketing Copy**।

---

## ২. বর্তমান কোডবেস অডিট মেট্রিক্স (Baseline Telemetry)

ভবিষ্যতে রিফ্যাক্টরিংয়ের অগ্রগতি মাপার জন্য বর্তমান কোডবেসের অটোমেটেড স্ক্যানের ফলাফল নিচে সংরক্ষণ করা হলো:

| ফাইল / কম্পোনেন্ট | গ্রেডিয়েন্ট (`bg-gradient-`) | Purple / Indigo / Pink | Blur (`backdrop-blur`) | ভারী শ্যাডো (`shadow-lg/xl/2xl`) | বড় রেডিয়াস (`rounded-2xl/3xl/full`) | `tabular-nums` ব্যবহার |
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

> **লক্ষ্য:** সবগুলো ধাপ সম্পন্ন হওয়ার পর পুরো `frontend/src` ডিরেক্টরিতে `bg-gradient-`, `purple/indigo/violet/pink`, `backdrop-blur`, `shadow-lg/xl/2xl` এবং UI ইমোজি সংখ্যা **০ (শূন্য)** হতে হবে।

---

## ৩. ধাপে ধাপে বাস্তবায়ন পরিকল্পনা (৮-ধাপের মাস্টার রোডম্যাপ)

কাজ করার সুবিধার্থে পুরো সিস্টেমকে **৮টি স্বতন্ত্র ধাপে** ভাগ করা হলো। প্রতিটি ধাপ শেষ করে `npm run build` দিয়ে যাচাই করে পরবর্তী ধাপে যাওয়া উচিত।

---

### ধাপ ১: গ্লোবাল ডিজাইন ফাউন্ডেশন ও শেয়ার্ড UI প্রিমিটিভ লাইব্রেরি
**লক্ষ্য:** পুরো অ্যাপের জন্য একটি কেন্দ্রীয় UI কিট তৈরি করা যাতে পরবর্তীতে সব স্ক্রিনে একই স্ট্যান্ডার্ড বজায় থাকে এবং কোড ডুপ্লিকেশন না হয়।

**প্রয়োজনীয় ফাইলসমূহ:**
- আপডেট: `frontend/index.html`, `frontend/tailwind.config.js`, `frontend/src/index.css`
- নতুন তৈরি (`frontend/src/components/ui/`):
  - `SlideOverDrawer.jsx`
  - `StatusBadge.jsx`
  - `SkeletonLoader.jsx`
  - `EmptyState.jsx`
  - `ConfirmDialog.jsx`

**করণীয় চেকলিস্ট:**
- [ ] `frontend/index.html`: ফ্যাভিকন থেকে `🛒` ইমোজি সরিয়ে ভেক্টর SVG আইকন সেট করা; Google Fonts-এ বাংলা স্ক্রিপ্টের জন্য `Noto Sans Bengali` বা `Hind Siliguri` যুক্ত করা (যাতে বাংলা টেক্সট ও ইংরেজি `Inter` / `Plus Jakarta Sans` সমানভাবে মসৃণ দেখায়)।
- [ ] `frontend/tailwind.config.js`: `rounded-2xl`/`3xl` এর পরিবর্তে কেবল `sm/md/lg` ব্যবহার উৎসাহিত করা ও ব্র্যান্ড টোকেন `neutral-200/80`, `#FAFAFA`, `#FFFFFF`, `#0F172A` নির্ভুল রাখা।
- [ ] `frontend/src/index.css`: লাইন ২৪১-এর `.rich-text-content a { color: #4f46e5 }` (ইন্ডিগো রঙ) পরিবর্তন করে `#0F172A` করা; `shadow-none` ও ফ্ল্যাট ফোকাস রিং (`focus:border-[#0F172A]`) এবং `44px` মিনিমাম টাচ-টার্গেট ইউটিলিটি ক্লাস যোগ করা।
- [ ] `SlideOverDrawer.jsx`: ডানদিক থেকে ওপেন হওয়া ক্লিন স্লাইড-ওভার ড্রয়ার (`border-l border-neutral-200`, `bg-neutral-950/35` ব্যাকড্রপ — কোনো `backdrop-blur` ছাড়াই, `Esc` চাপে বন্ধ হবে)।
- [ ] `StatusBadge.jsx`: `In Stock / Paid` (`#15803D`), `Low Stock / Pending` (`#B45309`), `Out of Stock / Cancelled` (`#B91C1C`) স্ট্যাটাস ব্যাজ।
- [ ] `SkeletonLoader.jsx`: KPI কার্ড, টেবিল রো এবং POS প্রোডাক্ট গ্রিডের জন্য অ্যানিমেটেড স্কেলিটন প্লেসহোল্ডার (ডাটা লোডিং / গুগল শিট সিঙ্ক চলাকালীন ব্যবহারের জন্য)।
- [ ] `EmptyState.jsx`: সার্চ না মিললে, কার্ট খালি থাকলে বা ডেটা না থাকলে পরিচ্ছন্ন মিনিমাল এম্পটি স্টেট কম্পোনেন্ট।
- [ ] `ConfirmDialog.jsx`: `window.confirm`-এর পরিবর্তে পরিচ্ছন্ন ইন-অ্যাপ কনফার্মেশন ডায়ালগ (Clear Cart, Delete Product, Delete Expense ইত্যাদির জন্য)।

---

### ধাপ ২: নেভিগেশন শেল ও রেসপন্সিভ ফ্রেম (`App.jsx`, `Sidebar.jsx`, `Navbar.jsx`)
**লক্ষ্য:** গ্রেডিয়েন্ট, ইমোজি ও জটিলতা সরিয়ে Linear/Stripe-স্টাইলের পরিচ্ছন্ন কোল্যাপ্সিবল লেফট সাইডবার ও মিনিমাল টপ বার তৈরি করা।

**টার্গেট ফাইলসমূহ:**
- আপডেট: `frontend/src/components/Sidebar.jsx`, `frontend/src/components/Navbar.jsx`, `frontend/src/App.jsx`

**করণীয় চেকলিস্ট:**
- [ ] **হোয়াইট-লেবেল ব্র্যান্ড হেডার ও সাইডবার (`Sidebar.jsx`):**
  - **প্রাইমারি নেভিগেশন (Top Core Items):**
    1. `Overview` (Executive Overview Dashboard)
    2. `POS Terminal` (Split-screen Billing)
    3. `Inventory` (Unified Product & Stock Table)
    4. `Invoices / Sales` (Transactions, Orders & Returns)
    5. `Customers` (Customers & Credit Ledger)
    6. `Settings` (White-Label Settings View)
  - **সেকেন্ডারি / বিশেষায়িত অপারেশনস (Collapsible Groups — বিদ্যমান সব ফিচার অক্ষুণ্ণ রাখতে):**
    - *স্টক ও টেক্সটাইল অপারেশনস:* গোডাউন ও শপ স্টক ট্রান্সফার, টেইলারিং অর্ডার, ফেব্রিক ওয়েস্টেজ, লো-স্টক অ্যালার্ট, বারকোড প্রিন্ট।
    - *ফাইন্যান্স ও ব্যাক-অফিস:* খরচের খাতা, দৈনিক ক্যাশ ড্রয়ার (EOD), ব্যাংক হিসাব, P&L রিপোর্ট, মহাজন ও PO, কুপন/RFM, ইউজার/অডিট লগ, ডাটা ব্যাকআপ।
  - ডেকোরেটিভ `dotColor` বৃত্ত, দুই লাইনের `subTitle`, ৪-বাটনের `Quick Hot-Bar`, `backdrop-blur-2xl`, এবং সব ইমোজি (`✨`, `🔒`) অপসারণ করে এক লাইনের শর্ট ও পরিষ্কার মেনু করা।
  - ডেস্কটপে কোল্যাপ্সিবল (`w-60` expanded / `w-16` collapsed) এবং মোবাইল/ট্যাবলেটে (`375px`/`768px`) স্মুথ স্লাইড-আউট ড্রয়ার।
- [ ] **মিনিমাল টপ বার (`Navbar.jsx`):**
  - টপের রেইনবো গ্রেডিয়েন্ট বর্ডার (`before:from-indigo-500...`) এবং `backdrop-blur-xl` সম্পূর্ণ অপসারণ; পরিবর্তে `bg-white border-b border-neutral-200/80 h-14`।
  - **গ্লোবাল সার্চ ইনপুট:** মাঝে বা বামে পরিচ্ছন্ন সার্চ বার + ডানদিকে `kbd` শর্টকাট হিন্ট `/` (যাতে `/` চাপলে সার্চ ফোকাস হয় — পণ্য, ইনভয়েস নং বা কাস্টমার খোঁজার জন্য)।
  - **প্রাইমারি `"New Sale"` CTA বাটন:** `bg-[#0F172A] text-white rounded-md` (ক্লিক করলে POS Terminal ওপেন হবে এবং নতুন বিক্রয়ের জন্য প্রস্তুত থাকবে)।
  - সিঙ্ক স্ট্যাটাস ইন্ডিকেটর (কেবল ছোট ডট + টেক্সট) ও কমপ্যাক্ট ইউজার/স্টোর প্রোফাইল মেনু (ইমোজি `👑`, `🛍️`, `💼`, `🧾`, `🛡️` সম্পূর্ণ রিমুভ)।

---

### ধাপ ৩: এক্সিকিউটিভ ওভারভিউ ড্যাশবোর্ড (`OverviewDashboard.jsx`)
**লক্ষ্য:** সিস্টেমে লগইন করার পর দ্রুত সিদ্ধান্ত নেওয়ার জন্য একটি হাই-ডেনসিটি এক্সিকিউটিভ ল্যান্ডিং ড্যাশবোর্ড তৈরি করা, যা বিদ্যমান সেলস, অর্ডার, খরচ ও স্টকের রিয়েল-টাইম ডাটা থেকে হিসাব নেবে।

**টার্গেট ফাইলসমূহ:**
- নতুন তৈরি: `frontend/src/components/OverviewDashboard.jsx`
- আপডেট: `frontend/src/App.jsx` (`currentView === 'overview'` রাউট ও প্রপস সংযোগ), `frontend/src/components/AnalyticsDashboard.jsx` (ওভারভিউ থেকে পূর্ণাঙ্গ P&L ট্যাবে যাওয়ার লিংক)

**করণীয় চেকলিস্ট:**
- [ ] **৪-মেট্রিক কম্প্যাক্ট KPI স্ট্রিপ (Grid 1 -> 2 -> 4):**
  1. `Today's Sales` (আজকের মোট বিক্রয় `৳` `tabular-nums` + গতকালের সাথে `%` ডেল্টা)
  2. `Total Orders` (মোট অর্ডার ও POS বিল সংখ্যা + `%` ডেল্টা)
  3. `Net Profit` (আজকের/চলতি মাসের নিট লাভ `৳` — নন-অ্যাডমিনের জন্য বিদ্যমান RBAC পিন আনলক সুরক্ষা অক্ষুণ্ণ রেখে)
  4. `Low Stock Items` (সতর্কতা সীমার নিচে থাকা পণ্যের সংখ্যা + তাৎক্ষণিক অ্যাকশন লিংক)
  - প্রতিটি কার্ডে `bg-white border border-neutral-200/80 rounded-lg p-5 shadow-none`।
- [ ] **অ্যাসিমেট্রিক ২-কলাম লেআউট (ডেস্কটপে ৬৫% / ৩৫%):**
  - **বাম কলাম (~৬৫%): Recent Transactions টেবিল** — সর্বশেষ ১০-১৫টি POS সেল ও অর্ডার (`Invoice #` মনোস্পেস, `Customer`, `Time`, `Method`, `Status Badge`, `Total` `tabular-nums`, Quick Preview/Reprint বাটন)।
  - **ডান কলাম (~৩৫%): Low Stock Alerts প্যানেল** — কম স্টক ও স্টক শেষ হওয়া পণ্যের তালিকা (দোকান ও গোডাউন ব্যালেন্স সহ) এবং প্রতিটির পাশে সরাসরি **"Restock"** বাটন (যা দ্রুত স্টক রিস্টক ড্রয়ার বা মডাল খুলবে)।
- [ ] ডাটা সিঙ্ক চলাকালীন ৪টি KPI কার্ড ও টেবিল রো-তে `SkeletonLoader` দেখানো।

---

### ধাপ ৪: হাই-স্পিড POS বিলিং টার্মিনাল ও মোবাইল শিট (`POS Terminal`)
**লক্ষ্য:** স্প্লিট-স্ক্রিন POS কাউন্টারের গতি বাড়ানো, অপ্রয়োজনীয় ডেকোরেশন বাদ দেওয়া এবং মোবাইলে সহজ এক-হাতে ব্যবহারযোগ্য অভিজ্ঞতা নিশ্চিত করা।

**টার্গেট ফাইলসমূহ:**
- আপডেট: `frontend/src/components/ProductCatalog.jsx`, `frontend/src/components/PosCartPanel.jsx`, `frontend/src/components/CartDrawer.jsx`, `frontend/src/components/CheckoutPage.jsx`, `frontend/src/components/InvoiceModal.jsx`, `frontend/src/App.jsx`

**করণীয় চেকলিস্ট:**
- [ ] **বাম প্যানেল (`ProductCatalog.jsx`):**
  - ছবিবিহীন পণ্যের ডেকোরেটিভ ফেব্রিক গ্রেডিয়েন্ট বক্স (`getFabricPlaceholderStyle`) সরিয়ে ক্লিন `#F5F5F5` ফ্রেমে পণ্যের আদ্যক্ষর বা মিনিমাল আইকন রাখা।
  - ইনস্ট্যান্ট সার্চ ইনপুট (শর্টকাট `/` সাপোর্ট সহ) + বারকোড স্ক্যানার ইনপুট (স্ক্যান/এন্টার করলে সাথে সাথে কার্টে অ্যাড হবে)।
  - ক্লিন হরাইজন্টাল ক্যাটাগরি ফিল্টার ট্যাব (`rounded-md`, সক্রিয় ট্যাবে `bg-[#0F172A] text-white`)।
  - কম্প্যাক্ট প্রোডাক্ট গ্রিড কার্ড: পণ্যের নাম, `font-mono` SKU, স্টক ব্যাজ (`In Stock` / `Low` / `Out`), ও `font-mono tabular-nums` দাম (দোকানের `গজ-গিরা` ও ভ্যারিয়েন্ট সিলেক্টর ফ্লো অক্ষুণ্ণ রেখে)।
- [ ] **ডান প্যানেল (`PosCartPanel.jsx`):**
  - ডার্ক হেডার গ্রেডিয়েন্ট ও `#0da487` টিল গ্রেডিয়েন্ট CTA সম্পূর্ণ বাদ দিয়ে ফ্ল্যাট `bg-white border-l border-neutral-200/80` প্যানেল।
  - কোয়ান্টিটি `+/-` স্টিপারের সাইজ বাড়িয়ে মোবাইলে অন্তত `min-h-[44px] min-w-[44px]` এবং ডেস্কটপে আরামদায়ক সাইজ (`32px–36px`) করা।
  - ইনলাইন **ডিসকাউন্ট (Flat ৳ / %)**, **ভ্যাট/ট্যাক্স** ও **কুপন কোড** ইনপুট ফিল্ড (`tabular-nums`)।
  - **ইনলাইন পেমেন্ট মেথড সিলেক্টর:** `Cash` | `bKash / MFS` | `Card` (পাশে কাস্টমার বাকি বা কুরিয়ার ডেলিভারির জন্য "Advance / Due Checkout" বাটন)।
  - প্রাইমারি বাটন **"Complete Sale & Print"** (`bg-[#0F172A]`): চেকআউট সাবমিট চলাকালীন `"Processing..."` টেক্সট সহ বাটন ডিস্যাবল করা; সাবমিট সফল হলে `InvoiceModal` খোলা।
  - **"Clear Cart"** ক্লিক করলে `ConfirmDialog` দিয়ে নিশ্চিত হওয়া।
  - `হোল্ড [F4]`, `কুইক খরচ [Alt+E]` এবং `টেইলারিং` হ্যান্ডঅফ শর্টকাটগুলো মিনিমাল সেকেন্ডারি বাটন হিসেবে রাখা।
- [ ] **মোবাইল ও ট্যাবলেট রেসপন্সিভ কার্ট (`App.jsx` + `CartDrawer.jsx`):**
  - `App.jsx` লাইন ৬৪৬৬-এর `rounded-full shadow-2xl backdrop-blur-xl` ফ্লোটিং পিল বাদ দেওয়া।
  - মোবাইলে (`< lg`) স্ক্রিনের নিচে পূর্ণ-প্রস্থের **Sticky Bottom Summary Bar** (`bg-white border-t border-neutral-200`, আইটেম কাউন্ট + `৳ Total` + `"View Cart"` বাটন `44px+` হিট এরিয়া)। ট্যাপ করলে পূর্ণ উচ্চতার **Cart Sheet/Drawer** খুলবে।
- [ ] **ইনভয়েস প্রিভিউ ও প্রিন্ট (`InvoiceModal.jsx`):**
  - টুলবারের ডার্ক `bg-slate-800` ও `indigo-600` বাটন পরিবর্তন করে `#FFFFFF` হেডার, `#0F172A` "Print Invoice" CTA এবং ক্রিস্প `80mm Thermal` vs `A4 Invoice` টগল।

---

### ধাপ ৫: ইনভেন্টরি ম্যানেজমেন্ট ভিউ ও স্লাইড-ওভার ড্রয়ার (`Inventory & Product Drawer`)
**লক্ষ্য:** একটি নিবেদিত হাই-ডেনসিটি ইনভেন্টরি টেবিল ভিউ তৈরি করা এবং বিশাল `rounded-3xl` অ্যাড/এডিট মডালগুলোকে পরিচ্ছন্ন স্লাইড-ওভার ড্রয়ারে রূপান্তর করা।

**টার্গেট ফাইলসমূহ:**
- নতুন তৈরি: `frontend/src/components/InventoryView.jsx`, `frontend/src/components/ProductDrawer.jsx`
- আপডেট / একীভূত: `AddProductModal.jsx`, `EditProductModal.jsx`, `AddStockModal.jsx`, `LowStockModal.jsx`, `App.jsx`

**করণীয় চেকলিস্ট:**
- [ ] **হাই-ডেনসিটি ইনভেন্টরি ডাটা টেবিল (`InventoryView.jsx`):**
  - কলামসমূহ: `Product / SKU` (থাম্বনেইল + নাম + `font-mono` SKU/বারকোড), `Category`, `Stock Status` (`In Stock` / `Low` / `Out` ব্যাজ + Shop ও Godown আলাদা সংখ্যা), `Cost Price` (`tabular-nums`, পারমিশন অনুযায়ী), `Selling Price` (`tabular-nums`), এবং `Quick Actions` (Edit, Restock, Barcode Sticker, Delete)।
  - স্ট্যাটাস ফিল্টার ট্যাব (`All`, `In Stock`, `Low Stock`, `Out of Stock`) এবং ডানপাশে প্রাইমারি `"+ Add Product"` বাটন।
  - **মোবাইল (`375px`):** প্রশস্ত টেবিল `overflow-x-auto` কন্টেইনারে স্মুথ স্ক্রল হবে অথবা `< sm` ব্রেকপয়েন্টে কম্প্যাক্ট স্ট্যাকড ইনভেন্টরি কার্ডে রূপান্তর হবে যাতে পেজের কোথাও হরাইজন্টাল ওভারফ্লো না হয়।
- [ ] **স্লাইড-ওভার প্রোডাক্ট ড্রয়ার (`ProductDrawer.jsx`):**
  - `AddProductModal.jsx` ও `EditProductModal.jsx`-এর সব ফিল্ড ও ভ্যালিডেশন লজিক (`Basic Info`, `Pricing & Stock`, `Godown / Variants / Fabric Than-Yards`) ৩টি ক্লিন ট্যাবে সাজিয়ে ডানপাশের `SlideOverDrawer`-এ স্থানান্তর।
  - সব ইনপুট ফিল্ডের ওপরে পরিষ্কার লেবেল (`text-xs font-medium text-[#111111]`), ইনলাইন ভ্যালিডেশন এরর এবং সাবমিটে `"Processing..."` স্টেট।
  - পণ্য ডিলিট করার আগে `ConfirmDialog` কনফার্মেশন।

---

### ধাপ ৬: হোয়াইট-লেবেল সেটিংস ভিউ (`White-Label Settings Page`)
**লক্ষ্য:** পপআপ মডাল (`SettingsModal.jsx`) থেকে বের করে পরিচ্ছন্ন ২-কলাম সেটিংস পেজ তৈরি করা।

**টার্গেট ফাইলসমূহ:**
- নতুন/রূপান্তর: `frontend/src/components/SettingsView.jsx` (অথবা `SettingsModal.jsx` embedded মোড সহ রিফ্যাক্টর)
- আপডেট: `frontend/src/App.jsx` (`currentView === 'settings'`)

**করণীয় চেকলিস্ট:**
- [ ] `rounded-3xl shadow-2xl backdrop-blur-xs` পপআপ ও `indigo/violet` হেডার অপসারণ।
- [ ] **ক্লিন ২-কলাম সেটিংস লেআউট:**
  - বাম/প্রথম সেকশন: **Business Branding & Contact** (Business Name, Store Logo URL + লাইভ প্রিভিউ, Full Address, Phone, Email)।
  - ডান/দ্বিতীয় সেকশন: **Billing & Receipt Configuration** (Currency Symbol e.g. `৳ / BDT`, Tax Rate %, Receipt Footer Note + ক্রিস্প মিনিমাল থার্মাল প্রিভিউ)।
- [ ] দ্বিতীয় সাব-ট্যাব হিসেবে বিদ্যমান **Google Sheets Sync API URL & Connection Test**, **Steadfast Courier / SMS API**, এবং **Storefront Settings** অপরিবর্তিত কার্যকারিতায় ফ্ল্যাট মিনিমাল ডিজাইনে সংযুক্ত রাখা।
- [ ] প্রতিটি ইনপুট `44px` হিট-এরিয়া সম্পন্ন এবং সেভ বাটনে `"Processing..."` ও টোস্ট ফিডব্যাক।

---

### ধাপ ৭: অবশিষ্ট ৩৫+ এন্টারপ্রাইজ মডিউলের ইউনিফর্ম ডিজাইন মাইগ্রেশন
**লক্ষ্য:** পুরো সফটওয়্যারে কোনো স্ক্রিন যেন পুরোনো গ্রেডিয়েন্ট বা বেগুনি/ইন্ডিগো রঙ ধরে না রাখে — সব মডিউল ৩টি সাব-ফেজে রিফ্যাক্টর করা।

#### ফেজ ৭এ: সেলস, অর্ডার ও কাস্টমার মডিউল
- [ ] `OrdersPage.jsx`: সব ১৬টি গ্রেডিয়েন্ট, ৩০টি ভারী শ্যাডো ও ১৯৩টি purple/indigo ক্লাস অপসারণ; হাই-ডেনসিটি অর্ডার টেবিল, স্ট্যাটাস ফিল্টার ট্যাব ও ড্রয়ার/কুরিয়ার অ্যাকশন।
- [ ] `SalesHistoryModal.jsx`, `InvoiceLookupModal.jsx`, `SalesReturnModal.jsx`: ফ্ল্যাট কার্ড, `font-mono tabular-nums` ইনভয়েস ও অ্যামাউন্ট।
- [ ] `CustomersModal.jsx`, `CustomerLedgerModal.jsx`, `CustomerOrdersModal.jsx`, `CustomerOrderTrackingModal.jsx`: কাস্টমার টেবিল, বাকি/লেজার সামারি ও RFM/VIP ব্যাজ (ইমোজি ও গ্রেডিয়েন্ট ছাড়া)।
- [ ] `CouponModal.jsx`, `RFMCampaignModal.jsx`, `AbandonedCartModal.jsx`, `HeldCartsModal.jsx`, `BulkCourierDispatchModal.jsx`, `BulkSmsDispatchModal.jsx`, `SteadfastLiveTrackingModal.jsx`।

#### ফেজ ৭বি: হিসাব, খরচের খাতা ও ক্যাশ অডিট
- [ ] `ExpensesModal.jsx` ও `PosQuickExpenseModal.jsx`: পূর্বের রোজ/পিঙ্ক গ্রেডিয়েন্ট ও `backdrop-blur` সরিয়ে `#FFFFFF` + `#0F172A` টোকেনে রূপান্তর (১-লাইন কুইক বার, কাস্টম ক্যাটাগরি, স্টাফ খোরাকি ও মাসিক ফিক্সড বিল ট্যাব ১০০% অক্ষুণ্ণ থাকবে)।
- [ ] `CashRegisterModal.jsx` ও `BankManagementModal.jsx`: `tabular-nums` সহ ক্লিন ক্যাশ ড্রয়ার EOD রিকনসিলিয়েশন ও ব্যাংক লেজার।
- [ ] `AnalyticsDashboard.jsx` ও `AuditLogsModal.jsx`: P&L স্টেটমেন্ট ও অডিট ট্রেইল টেবিল থেকে অবশিষ্ট ৪১/১৫টি ইন্ডিগো ক্লাস রিমুভ।

#### ফেজ ৭সি: গোডাউন, টেক্সটাইল, মহাজন ও এডমিন টুলস
- [ ] `StockTransferModal.jsx` (`8186` লাইন), `GodownStockAlertView.jsx`, `AddStockModal.jsx`, `LowStockModal.jsx`, `ExpiryAlertModal.jsx`।
- [ ] `TailoringModal.jsx`, `FabricCutModal.jsx`, `FabricWastageModal.jsx`, `QuickCalculatorModal.jsx`।
- [ ] `SuppliersModal.jsx`, `PurchaseOrdersModal.jsx`।
- [ ] `UsersModal.jsx`, `BackupRestoreModal.jsx`, `BarcodePrintModal.jsx`, `BarcodeStickerModal.jsx`, `BarcodeScannerModal.jsx`, `KeyboardShortcutsModal.jsx`, `AuthModal.jsx`, `AdminPinModal.jsx`, `ProductDetailsModal.jsx`, `ProductVariantSelectModal.jsx`, `RichTextEditor.jsx`।

---

### ধাপ ৮: পাওয়ার-ইউজার UX, রেসপন্সিভ অডিট ও চূড়ান্ত QA ভেরিফিকেশন
**লক্ষ্য:** প্রোডাকশনে নেওয়ার আগে প্রতিটি ব্রেকপয়েন্ট, কিবোর্ড শর্টকাট এবং ডাটা ইন্টিগ্রিটি কঠোরভাবে যাচাই করা।

**যাচাইকরণ চেকলিস্ট:**
- [ ] **কিবোর্ড নেভিগেশন অডিট:**
  - `/` চাপলে গ্লোবাল সার্চ বা POS প্রোডাক্ট সার্চ ইনপুটে ফোকাস হচ্ছে (ইনপুট ফিল্ডের বাইরে থাকা অবস্থায়)।
  - `Esc` চাপলে যেকোনো খোলা ড্রয়ার, মডাল বা মোবাইল শিট বন্ধ হচ্ছে।
  - POS-এর বিদ্যমান শর্টকাট (`F1`–`F10`, `Alt+E`, `Alt+C`) নির্ভুল কাজ করছে।
- [ ] **রেসপন্সিভ ও টাচ টার্গেট টেস্ট:**
  - `375px` (Mobile): শূন্য হরাইজন্টাল ওভারফ্লো, স্লাইড-আউট সাইডবার, স্টিকি বটম কার্ট বার -> ফুল শিট, এবং সব বাটন/স্টিপার/ইনপুট ন্যূনতম `44px` উচ্চতা/প্রস্থ।
  - `768px` (Tablet): সুসামঞ্জস্যপূর্ণ গ্রিড ও টেবিল র‍্যাপার।
  - `1440px` (Desktop): কোল্যাপ্সিবল সাইডবার ও স্প্লিট-স্ক্রিন POS নির্ভুল ফিট।
- [ ] **ডিজাইন কনস্ট্রেইন্ট অটোমেটেড স্ক্যান:**
  - PowerShell রেজেক্স স্ক্যানের মাধ্যমে নিশ্চিত করা যে `bg-gradient-`, `purple/indigo/pink`, `backdrop-blur`, `shadow-lg/xl/2xl` ও UI ইমোজি `0` টি রয়েছে।
- [ ] **বিল্ড ও ডাটা রিগ্রেশন টেস্ট:**
  - `npm run build` (`vite build`) জিরো এরর-এ সম্পন্ন।
  - নতুন বিক্রয়, প্রোডাক্ট এডিট, খরচ এন্ট্রি/ডিলিট এবং গুগল শিট সিঙ্ক (`Code.gs`) পূর্বের মতোই অক্ষুণ্ণভাবে কাজ করছে।

---

## ৪. ভবিষ্যতে কাজ শুরুর পূর্বে নির্ধারণযোগ্য বিষয় (Pre-Development Decisions)

এই রোডম্যাপ অনুযায়ী **ধাপ ১** শুরু করার সময় নিচের ৩টি বিষয়ে আপনার চূড়ান্ত সিদ্ধান্ত অনুযায়ী কোড লেখা হবে:

1. **UI ভাষা মোড:** প্রম্পটের উদাহরণ অনুযায়ী সম্পূর্ণ **ইংরেজি** লেবেল (`Overview`, `POS Terminal`, `In Stock`), নাকি বর্তমান সিস্টেমের মতো সম্পূর্ণ **বাংলা**, নাকি **বাংলা + ইংরেজি হাইব্রিড** (যেমন: মেনু/লেবেল পরিচ্ছন্ন ইংরেজি বা বাংলা এবং ব্যবসাভিত্তিক টার্ম যেমন `গজ-গিরা`, `খোরাকি` বাংলায়)?
2. **অ্যাপ ওপেন হলে ডিফল্ট স্ক্রিন:** ইউজার লগইন করার পর প্রথমে `Overview Dashboard` দেখাবে নাকি সরাসরি `POS Terminal` দেখাবে?
3. **গ্রাহক স্টোরফ্রন্ট ভিউ (Customer Mode):** এডমিন/POS ইন্টারফেসের পাশাপাশি কাস্টমার-ফেসিং স্টোরফ্রন্টও একই Utilitarian Minimalism (`#FAFAFA` + `#0F172A`) থিমে আপগ্রেড করা হবে কিনা?
