/**
 * ============================================================================
 * riskAnalysis.js - স্মার্ট ফ্রড ও রিটার্ন ঝুঁকি নির্ণয় ইঞ্জিন (AI Risk Scoring)
 * ============================================================================
 * গ্রাহকের মোবাইল নম্বর, অতীত অর্ডার ইতিহাস এবং ক্যাশ অন ডেলিভারি (COD) পরিমাণের
 * উপর ভিত্তি করে স্বয়ংক্রিয়ভাবে ঝুঁকি বিশ্লেষণ (Fraud & Return Risk) করে।
 */

/**
 * বাংলাদেশি ভ্যালিড মোবাইল নম্বর চেক করার রেজেক্স
 * ফরম্যাট: 013, 014, 015, 016, 017, 018, 019 দিয়ে শুরু এবং মোট ১১ ডিজিট (+880 সাপোর্টেড)
 */
export function isValidBdPhone(phone) {
  if (!phone) return false;
  const clean = String(phone).replace(/[\s\-\+]/g, '');
  // 01XXXXXXXXX অথবা 8801XXXXXXXXX
  return /^(?:8801|01)[3-9]\d{8}$/.test(clean);
}

/**
 * অর্ডারের সামগ্রিক রিস্ক স্কোর গণনা করা
 * @param {Object} order - বর্তমান অর্ডার অবজেক্ট
 * @param {Array} allOrders - ডাটাবেসে থাকা পূর্ববর্তী সকল অর্ডারের তালিকা
 * @returns {Object} { score: number, level: 'Low' | 'Medium' | 'High', flags: string[], recommendation: string }
 */
export function calculateOrderRisk(order, allOrders = []) {
  if (!order) {
    return { score: 0, level: 'Low', flags: [], recommendation: 'ঝুঁকিমুক্ত' };
  }

  let score = 0; // ০ থেকে ১০০ এর স্কেল
  const flags = [];

  const phone = String(order.CustomerPhone || '').trim();
  const cleanPhone = phone.replace(/[\s\-\+]/g, '');

  // ১. ফোন নম্বর যাচাই (Phone Number Validity Check)
  if (!phone) {
    score += 50;
    flags.push('কোনো মোবাইল নম্বর দেওয়া হয়নি');
  } else if (!isValidBdPhone(phone)) {
    score += 35;
    flags.push('মোবাইল নম্বরের ফরম্যাট সঠিক নয় (১১ ডিজিটের বাংলাদেশি নম্বর নয়)');
  }

  // ২. গ্রাহকের পূর্ববর্তী অর্ডার ইতিহাস বিশ্লেষণ (Customer Past Order History)
  if (phone && Array.isArray(allOrders) && allOrders.length > 0) {
    const pastCustomerOrders = allOrders.filter((o) => {
      if (o.OrderID === order.OrderID) return false; // বর্তমান অর্ডারটি বাদ দিয়ে
      const oPhone = String(o.CustomerPhone || '').replace(/[\s\-\+]/g, '');
      return oPhone && (oPhone === cleanPhone || oPhone.endsWith(cleanPhone.slice(-10)));
    });

    if (pastCustomerOrders.length > 0) {
      let returnedCount = 0;
      let cancelledCount = 0;
      let deliveredCount = 0;

      pastCustomerOrders.forEach((o) => {
        if (o.Status === 'Returned') returnedCount++;
        else if (o.Status === 'Cancelled') cancelledCount++;
        else if (o.Status === 'Delivered') deliveredCount++;
      });

      // যদি অতীতে পার্সেল রিটার্ন করার ইতিহাস থাকে
      if (returnedCount > 0) {
        const returnPenalty = Math.min(50, returnedCount * 25);
        score += returnPenalty;
        flags.push(`অতীতে এই গ্রাহকের ${returnedCount}টি পার্সেল রিটার্ন এসেছে`);
      }

      // যদি অতীতে অর্ডার বাতিল করার ইতিহাস থাকে
      if (cancelledCount > 1) {
        score += 20;
        flags.push(`অতীতে এই গ্রাহকের ${cancelledCount}টি অর্ডার বাতিল করা হয়েছিল`);
      }

      // বিশ্বস্ত কাস্টমার বোনাস: যদি ইতিপূর্বে সফলভাবে ডেলিভারি নিয়ে থাকে
      if (deliveredCount > 0) {
        score = Math.max(0, score - (deliveredCount * 15));
        if (returnedCount === 0 && cancelledCount === 0) {
          flags.push(`বিশ্বস্ত কাস্টমার: অতীতে ${deliveredCount}টি সফল ডেলিভারি রয়েছে`);
        }
      }
    }
  }

  // ৩. বড় অঙ্কের ক্যাশ অন ডেলিভারি (High COD without advance payment)
  const dueAmount = Number(order.DueAmount || 0);
  const advancePaid = Number(order.AdvancePaid || 0);
  const totalAmount = Number(order.TotalAmount || 0);

  if (dueAmount >= 3000 && advancePaid === 0) {
    score += 25;
    flags.push(`বড় অঙ্কের ক্যাশ অন ডেলিভারি (৳${dueAmount}), কোনো অগ্রিম নেওয়া হয়নি`);
  } else if (dueAmount >= 6000 && advancePaid < 500) {
    score += 35;
    flags.push(`অতি উচ্চ মূল্যের পার্সেল (৳${dueAmount}), অগ্রিম অপ্রতুল`);
  }

  // ৪. সংক্ষিপ্ত বা অস্পষ্ট ঠিকানা বিশ্লেষণ (Vague Address Check)
  const address = String(order.CustomerAddress || '').trim();
  if (!address || address.length < 8) {
    score += 20;
    flags.push('ডেলিভারি ঠিকানা অতি সংক্ষিপ্ত বা অসম্পূর্ণ');
  }

  // রিস্ক লেভেল নির্ধারণ
  let level = 'Low';
  let recommendation = 'নিরাপদ অর্ডার — সরাসরি কুরিয়ারে বুকিং দেওয়া যাবে।';

  if (score >= 50) {
    level = 'High';
    recommendation = 'উচ্চ ঝুঁকি! কুরিয়ারে পার্সেল বুকিংয়ের পূর্বে ফোনে কথা বলে ডেলিভারি চার্জ অগ্রিম নিন।';
  } else if (score >= 25) {
    level = 'Medium';
    recommendation = 'মাঝারি ঝুঁকি — পার্সেল পাঠানোর আগে গ্রাহককে কল দিয়ে ঠিকানা নিশ্চিত করুন।';
  }

  return {
    score: Math.min(100, score),
    level,
    flags,
    recommendation
  };
}

