# Profit & Loss (P&L) Analytics & Weighted Average Cost (WAC) গাইড

এই নথিতে ওয়েব অ্যাপ এবং AppSheet উভয় প্ল্যাটফর্মের জন্য মাল্টি-রেঞ্জ লাভ-ক্ষতি অ্যানালিটিক্স, কিউমুলেটিভ স্টক ও ওয়েইটেড এভারেজ কস্ট (Weighted Average Cost - WAC) গণনার সম্পূর্ণ লজিক এবং AppSheet সমতুল্য এক্সপ্রেশন প্রদান করা হলো।

---

## ১. ওয়েইটেড এভারেজ কস্ট (WAC) গাণিতিক লজিক

ইনভেন্টরি সিস্টেমে সঠিক লাভ-ক্ষতি বের করার জন্য সাধারণ ক্রয়মূল্যের পরিবর্তে **Weighted Average Cost (WAC)** ব্যবহার করা সবচেয়ে নির্ভরযোগ্য ও প্রমিত উপায়।

### গাণিতিক সূত্র (Formula):

$$\text{New WAC} = \frac{(\text{Previous Stock} \times \text{Previous Cost}) + (\text{Incoming Qty} \times \text{New Unit Cost})}{\text{Previous Stock} + \text{Incoming Qty}}$$

### ব্যবহারিক উদাহরণ:
* আপনার দোকানে চালের আগের স্টক ছিল **৫০ কেজি**, যার কেনা দাম ছিল **৫০ টাকা/কেজি**।  
  $\rightarrow$ আগের মোট মূল্য = $৫০ \times ৫০ = ২৫০০$ টাকা।
* নতুন করে সাপ্লায়ার থেকে **৫০ কেজি** চাল আসলো **৬০ টাকা/কেজি** দরে।  
  $\rightarrow$ নতুন আসা লটের মূল্য = $৫০ \times ৬০ = ৩০০০$ টাকা।
* মোট মজুত হলো = $৫০ + ৫০ = ১০০$ কেজি।
* **নতুন ওয়েইটেড গড় কেনা দাম (WAC)** = $\frac{২৫০০ + ৩০০০}{১০০} = \frac{৫৫০০}{১০০} = \mathbf{৫৫.০০}$ **টাকা/কেজি**।

> যখনই POS সিস্টেমে কোনো চাল বিক্রি হবে, বিক্রয়মূল্য থেকে এই **৫৫.০০ টাকা** কস্ট হিসেবে বাদ দিয়ে সঠিক নিট লাভ (Profit) বের করা হয়।

---

## ২. React Web POS ড্যাশবোর্ড KPI স্ট্রিপস হিসাব

রিঅ্যাক্ট ওয়েব অ্যাপে [`frontend/src/components/AnalyticsDashboard.jsx`](file:///D:/VS_test%20program/google%20sheet%20inventory/frontend/src/components/AnalyticsDashboard.jsx) কম্পোনেন্টের মধ্যে নিচের ফর্মুলাগুলো ব্যবহৃত হয়েছে:

| KPI সূচক (KPI Indicator) | গণনার সূত্র (Calculation Formula) | বিবরণ |
| :--- | :--- | :--- |
| **১. মোট রাজস্ব (Total Revenue)** | $\sum \text{GrandTotal}$ | নির্দিষ্ট সময়সীমার মধ্যে সকল অর্ডারের মোট বিল |
| **২. বিক্রিত মালের খরচ (COGS)** | $\sum (\text{Item Quantity} \times \text{Item CostPrice})$ | বিক্রিত পণ্যগুলোর তৎকালীন কেনা দামের মোট খরচ |
| **৩. নিট মুনাফা (Net Profit)** | $\text{Revenue (Tax বাদ দিয়ে)} - \text{COGS}$ | রাজস্ব থেকে ক্রয়মূল্য বাদ দিয়ে অর্জিত প্রকৃত লাভ |
| **৪. মুনাফার হার (Profit Margin %)**| $(\frac{\text{Net Profit}}{\text{Net Revenue}}) \times 100\%$ | বিক্রয়ের তুলনায় লাভের শতকরা হার |
| **৫. বিক্রিত ইউনিট (Units Sold)** | $\sum \text{Item Quantity}$ | মোট বিক্রিত আইটেম বা ইউনিটের সংখ্যা |

---

## ৩. AppSheet-এ Admin Report ভিউ তৈরির সমতুল্য এক্সপ্রেশন

AppSheet-এ শুধুমাত্র **Admin** রোলধারীদের জন্য একটি অ্যানালিটিক্স ড্যাশবোর্ড রিপোর্ট ভিউ তৈরি করার ধাপসমূহ:

### ধাপ ১: ফিল্টার স্লাইস (Slices) তৈরি করা
**Data** > **Slices** এ গিয়ে ৩টি স্লাইস তৈরি করুন:

1. **`Sales_Today` (আজকের বিক্রয়):**
   ```excel
   // আজকের তারিখের সেলস ফিল্টার করার এক্সপ্রেশন
   DATE([Timestamp]) = TODAY()
   ```

2. **`Sales_ThisMonth` (চলতি মাসের বিক্রয়):**
   ```excel
   // চলতি মাসের সেলস ফিল্টার করার এক্সপ্রেশন
   AND(
     MONTH([Timestamp]) = MONTH(TODAY()),
     YEAR([Timestamp]) = YEAR(TODAY())
   )
   ```

3. **`Sales_ThisYear` (চলতি বছরের বিক্রয়):**
   ```excel
   // চলতি বছরের সেলস ফিল্টার করার এক্সপ্রেশন
   YEAR([Timestamp]) = YEAR(TODAY())
   ```

---

### ধাপ ২: AppSheet KPI মেজারস এক্সপ্রেশন (Admin Report View)

Admin রিপোর্ট ভিউতে ভার্চুয়াল কলাম বা চার্ট তৈরিতে নিচের এক্সপ্রেশনগুলো ব্যবহার করুন:

#### ১. চলতি মাসের মোট রাজস্ব (Total Revenue - This Month):
```excel
// চলতি মাসের সকল অর্ডারের মোট বিল যোগ করা
SUM(Sales_ThisMonth[GrandTotal])
```

#### ২. চলতি মাসের বিক্রিত পণ্যের খরচ (COGS - Cost of Goods Sold):
```excel
// StockLogs থেকে চলতি মাসে বিক্রয় হওয়া আইটেমের মোট কেনা দাম হিসাব
SUM(
  SELECT(
    StockLogs[QuantityChange] * StockLogs[UnitCost],
    AND(
      [LogType] = "STOCK_OUT_SALE",
      MONTH([Timestamp]) = MONTH(TODAY()),
      YEAR([Timestamp]) = YEAR(TODAY())
    )
  )
) * -1
```
*(নোট: বিক্রয়ের ক্ষেত্রে QuantityChange নেগেটিভ মান থাকায় শেষে -১ দিয়ে গুণ করে পজিটিভ করা হয়েছে)*

#### ৩. চলতি মাসের নিট মুনাফা (Net Profit - This Month):
```excel
// মোট রাজস্ব থেকে কেনা খরচ বাদ দেওয়া
SUM(Sales_ThisMonth[GrandTotal]) - 
(
  SUM(
    SELECT(
      StockLogs[QuantityChange] * StockLogs[UnitCost],
      AND(
        [LogType] = "STOCK_OUT_SALE",
        MONTH([Timestamp]) = MONTH(TODAY()),
        YEAR([Timestamp]) = YEAR(TODAY())
      )
    )
  ) * -1
)
```

#### ৪. মুনাফার শতকরা হার (Profit Margin %):
```excel
// নিট মুনাফাকে রাজস্ব দিয়ে ভাগ করে শতকরা বের করা
IF(
  SUM(Sales_ThisMonth[GrandTotal]) > 0,
  ROUND(
    (
      (
        SUM(Sales_ThisMonth[GrandTotal]) - 
        (
          SUM(
            SELECT(
              StockLogs[QuantityChange] * StockLogs[UnitCost],
              AND(
                [LogType] = "STOCK_OUT_SALE",
                MONTH([Timestamp]) = MONTH(TODAY()),
                YEAR([Timestamp]) = YEAR(TODAY())
              )
            )
          ) * -1
        )
      ) / SUM(Sales_ThisMonth[GrandTotal])
    ) * 100, 
    2
  ),
  0
)
```

#### ৫. চলতি মাসে মোট বিক্রিত ইউনিট (Units Sold - This Month):
```excel
// মোট ডেলিভারি হওয়া পণ্যের ইউনিট সংখ্যা
SUM(
  SELECT(
    StockLogs[QuantityChange],
    AND(
      [LogType] = "STOCK_OUT_SALE",
      MONTH([Timestamp]) = MONTH(TODAY()),
      YEAR([Timestamp]) = YEAR(TODAY())
    )
  )
) * -1
```

---

### ধাপ ৩: শুধুমাত্র Admin-দের জন্য ভিউ দেখানো (Show_If)
এই P&L রিপোর্ট ভিউটি যেন ক্যাশিয়ার বা ম্যানেজার দেখতে না পারে, সেজন্য ভিউটির **Show_If** কন্ডিশনে লিখুন:

```excel
// শুধুমাত্র Admin ইউজার এই রিপোর্ট ভিউটি দেখতে পারবে
LOOKUP(USEREMAIL(), "Users", "Email", "Role") = "Admin"
```

