# Enterprise React Web POS & Inventory

একটি উচ্চ-গতির ক্লাউড ও অফলাইন সাপোর্টেড Enterprise POS (Point of Sale) এবং ইনভেন্টরি ম্যানেজমেন্ট সিস্টেম। এটি গুগল শিট ও অ্যাপস স্ক্রিপ্ট ব্যাকএন্ডের সাথে সরাসরি সংযুক্ত।

---

## 📁 প্রজেক্ট স্ট্রাকচার (Project Structure)

```
frontend/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages অটো-ডিপ্লয়মেন্ট ওয়ার্কফ্লো
├── public/                     # স্ট্যাটিক অ্যাসেটস
├── src/
│   ├── components/
│   │   ├── Navbar.jsx           # ব্র্যান্ডিং, সিঙ্ক স্ট্যাটাস ও কুইক বাটন
│   │   ├── ProductCatalog.jsx   # বারকোড সার্চ ও প্রোডাক্ট গ্রিড (Emerald/Amber/Crimson)
│   │   ├── CartPage.jsx         # হাই-ডেনসিটি বিলিং কার্ট ও চেকআউট
│   │   ├── AddStockModal.jsx    # কিউমুলেটিভ স্টক ও ওয়েইটেড কস্ট ইনপুট মডাল
│   │   ├── AddProductModal.jsx  # নতুন পণ্য তৈরির মডাল
│   │   ├── SettingsModal.jsx    # Google Apps Script API URL কনফিগারেশন
│   │   └── SalesHistoryModal.jsx# বিক্রয় হিস্ট্রি দেখার মডাল
│   ├── services/
│   │   ├── api.js               # Apps Script API ক্লায়েন্ট (GET ও POST)
│   │   └── storage.js           # ক্লায়েন্ট-সাইড পারসিস্টেন্ট স্টোরেজ (localStorage)
│   ├── App.jsx                  # প্রধান অ্যাপ্লিকেশন ও সেন্ট্রাল স্টেট ম্যানেজমেন্ট
│   ├── index.css                # Tailwind CSS এবং কম্প্যাক্ট স্ক্রোলবার স্টাইল
│   └── main.jsx                 # রিঅ্যাক্ট রুট এন্ট্রি পয়েন্ট
├── index.html                   # HTML টেমপ্লেট
├── package.json                 # ডিপেন্ডেন্সি ও বিল্ড স্ক্রিপ্ট
├── tailwind.config.js           # Tailwind থিম ও কালার কনফিগ
└── vite.config.js               # GitHub Pages এর জন্য রিলেটিভ বেস পাথ কনফিগ
```

---

## 🚀 লোকাল ডেভেলপমেন্ট রান করার নিয়ম (Local Run)

প্রজেক্ট ডিরেক্টরিতে টার্মিনাল খুলে নিচের কমান্ডগুলো চালান:

```bash
cd frontend
npm install
npm run dev
```
ব্রাউজারে `http://localhost:3000` ঠিকানায় POS অ্যাপ্লিকেশনটি চালু হবে।

---

## 🌐 GitHub Pages-এ সম্পূর্ণ ফ্রিতে ডিপ্লয় করার পদ্ধতি

### পদ্ধতি ১: GitHub Actions অটো-ডিপ্লয়মেন্ট (প্রস্তাবিত ও সেরা)
আমরা ইতোমধ্যে `.github/workflows/deploy.yml` ফাইল তৈরি করে রেখেছি।

১. আপনার সম্পূর্ণ প্রজেক্টটি গিটহাবে পুশ করুন:
   ```bash
   git add .
   git commit -m "Deploy Enterprise React POS"
   git push origin main
   ```
২. আপনার GitHub রিপোজিটরিতে যান এবং **Settings** > **Pages** অপশনে যান।
3. **Build and deployment** সেকশনের **Source** ড্রপডাউন থেকে **`GitHub Actions`** নির্বাচন করুন।
4. কিছুক্ষণের মধ্যে আপনার অ্যাপটি ফ্রিতে লাইভ হয়ে যাবে! (যেমন: `https://your-username.github.io/repo-name/`)

---

### পদ্ধতি ২: `gh-pages` কমান্ড ব্যবহার করে ম্যানুয়াল ডিপ্লয়
যদি সরাসরি টার্মিনাল থেকে ডিপ্লয় করতে চান:

```bash
cd frontend
npm run deploy
```
এটি স্বয়ংক্রিয়ভাবে `dist/` ফোল্ডার বিল্ড করে GitHub-এর `gh-pages` ব্রাঞ্চে ডিপ্লয় করে দেবে।

