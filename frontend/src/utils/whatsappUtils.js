import { formatFabricQuantity } from './fabricUtils';

/**
 * ============================================================================
 * whatsappUtils.js - হোয়াটসঅ্যাপ পেপারলেস ডিজিটাল ক্যাশ মেমো ইঞ্জিন
 * ============================================================================
 * পরিবেশবান্ধব ডিজিটাল মেমো তৈরি করে ১-ক্লিকে গ্রাহকের হোয়াটসঅ্যাপে পাঠানোর ব্যবস্থা।
 */

/**
 * বাংলাদেশের মোবাইল নম্বরকে আন্তর্জাতিক হোয়াটসঅ্যাপ ফরম্যাটে রূপান্তর (যেমন: 017... -> 88017...)
 */
export function formatBdPhoneForWhatsApp(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('880')) return cleaned;
  if (cleaned.startsWith('0')) return '88' + cleaned;
  if (cleaned.length === 10) return '880' + cleaned;
  return cleaned;
}

/**
 * বিক্রয় মেমো থেকে দৃষ্টিনন্দন ও প্রফেশনাল হোয়াটসঅ্যাপ টেক্সট ভাউচার তৈরি
 */
export function generateWhatsAppInvoiceText({
  invoice,
  storeSettings = {},
  currencySymbol = '৳'
}) {
  if (!invoice) return '';

  const storeName = storeSettings.StoreName || storeSettings.storeName || 'Pabna Bostraloy';
  const storePhone = storeSettings.ContactNumber || storeSettings.contactNumber || storeSettings.Phone || '';
  const storeAddress = storeSettings.Address || storeSettings.address || '';
  const invoiceNo = invoice.InvoiceNumber || invoice.invoiceNumber || invoice.id || 'N/A';
  const dateStr = invoice.Date || invoice.date || new Date().toLocaleDateString('bn-BD');
  const customerName = invoice.CustomerName || invoice.customerName || 'সম্মানিত ক্রেতা';
  const customerPhone = invoice.CustomerPhone || invoice.customerPhone || '';

  // পণ্যসমূহের তালিকা পার্সিং
  let rawItems = invoice.Items || invoice.items || [];
  if (typeof rawItems === 'string') {
    try {
      rawItems = JSON.parse(rawItems);
    } catch {
      rawItems = [];
    }
  }

  let itemsText = '';
  (rawItems || []).forEach((it, idx) => {
    const name = it.productName || it.ProductName || it.name || 'পণ্য';
    const qty = Number(it.quantity || it.Quantity || 1);
    const unit = it.unit || it.Unit || 'টি';
    const price = Number(it.sellingPrice || it.SellingPrice || it.price || 0);
    const lineTotal = qty * price;

    const formattedQty = unit === 'গজ' ? formatFabricQuantity(qty, 'গজ') : `${qty} ${unit}`;
    itemsText += `${idx + 1}. *${name}*\n   ▫️ পরিমাণ: ${formattedQty} × ${currencySymbol}${price.toFixed(2)} = *${currencySymbol}${lineTotal.toFixed(2)}*\n`;
  });

  const subTotal = Number(invoice.SubTotal || invoice.subTotal || invoice.TotalAmount || invoice.totalAmount || 0);
  const discount = Number(invoice.Discount || invoice.discount || invoice.DiscountAmount || 0);
  const netTotal = Number(invoice.TotalAmount || invoice.totalAmount || invoice.GrandTotal || invoice.grandTotal || (subTotal - discount));
  const paid = Number(invoice.PaidAmount || invoice.paidAmount || netTotal);
  const due = Number(invoice.DueAmount || invoice.dueAmount || 0);
  const paymentMethod = invoice.PaymentMethod || invoice.paymentMethod || 'ক্যাশ';

  const text = `🧾 *ক্যাশ মেমো / ইনভয়েস*
🏬 *${storeName}*
${storeAddress ? `📍 ${storeAddress}\n` : ''}${storePhone ? `📞 হেল্পলাইন: ${storePhone}\n` : ''}
━━━━━━━━━━━━━━━━━━
🆔 *ইনভয়েস নং:* #${invoiceNo}
📅 *তারিখ:* ${dateStr}
👤 *ক্রেতা:* ${customerName} ${customerPhone ? `(${customerPhone})` : ''}
━━━━━━━━━━━━━━━━━━
*পণ্যের বিবরণ:*
${itemsText || '   (কোনো আইটেম পাওয়া যায়নি)\n'}━━━━━━━━━━━━━━━━━━
💵 *মোট মূল্য (Subtotal):* ${currencySymbol}${subTotal.toFixed(2)}
${discount > 0 ? `🎁 *ছাড় / ডিসকাউন্ট:* -${currencySymbol}${discount.toFixed(2)}\n` : ''}💰 *সর্বমোট প্রদেয় বিল:* *${currencySymbol}${netTotal.toFixed(2)}*
💳 *পরিশোধ (${paymentMethod}):* ${currencySymbol}${paid.toFixed(2)}
${due > 0 ? `⚠️ *বাকি (Due):* *${currencySymbol}${due.toFixed(2)}*\n` : '✅ *পরিশোধ স্ট্যাটাস:* পূর্ণ পরিশোধিত (PAID)\n'}━━━━━━━━━━━━━━━━━━
🌸 *আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ!*
_দয়া করে মেমোটি ডিজিটাল রেকর্ড হিসেবে সংরক্ষণ করুন।_`;

  return text;
}

/**
 * হোয়াটসঅ্যাপ উইন্ডো বা অ্যাপ ওপেন করা
 */
export function openWhatsAppInvoice(phone, invoiceText) {
  const formattedPhone = formatBdPhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(invoiceText);
  let url = '';
  if (formattedPhone) {
    url = `https://wa.me/${formattedPhone}?text=${encodedText}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodedText}`;
  }
  window.open(url, '_blank');
}

