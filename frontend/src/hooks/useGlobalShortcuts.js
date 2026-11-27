import { useEffect } from 'react';

/**
 * গ্লোবাল কিবোর্ড শর্টকাট ও Escape হ্যান্ডলার হুক (App.jsx থেকে মডিউলারাইজড)
 * - '/' : অ্যাক্টিভ ভিউ অনুযায়ী সার্চ ইনপুট ফোকাস
 * - 'Shift + ?' : কিবোর্ড শর্টকাট সহায়িকা মডাল টগল
 * - 'Escape' : খোলা মডাল বা ড্রয়ার ক্রমানুসারে বন্ধ করা
 * - F1–F10, Alt+E, Alt+C : POS অপারেশনাল হটকি
 */
export default function useGlobalShortcuts({
  currentView,
  cart,
  modalClosers = [],
  onToggleShortcutsModal,
  onToggleQuickExpense,
  onToggleCalculator,
  onFocusPosSearch,
  onHoldCart,
  onToggleHeldCarts,
  onOpenBarcode,
  onOpenTailoring,
  onOpenCartFocusCoupon,
  onGoToCheckout,
  onEmptyCheckoutWarn,
  onOpenInvoiceLookup,
}) {
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Shift + ? => কিবোর্ড শর্টকাট সহায়িকা মডাল
      if (e.shiftKey && (e.key === '?' || e.key === '/')) {
        e.preventDefault();
        onToggleShortcutsModal?.();
        return;
      }

      // '/' => প্রোডাক্ট বা গ্লোবাল সার্চে ফোকাস (ইনপুট ফিল্ডের বাইরে থাকলে)
      if (
        e.key === '/' &&
        !e.ctrlKey && !e.metaKey && !e.altKey &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) &&
        !document.activeElement?.isContentEditable
      ) {
        e.preventDefault();
        const targetId =
          currentView === 'pos'
            ? 'pos-product-search-input'
            : currentView === 'inventory'
            ? 'inventory-search-input'
            : currentView === 'orders'
            ? 'orders-search-input'
            : 'global-top-search-input';
        const el = document.getElementById(targetId) || document.getElementById('global-top-search-input');
        if (el) {
          el.focus();
          el.select?.();
        }
        return;
      }

      // Escape => সক্রিয় মডাল বা ড্রয়ার বন্ধ করা
      if (e.key === 'Escape') {
        for (const item of modalClosers) {
          if (item?.isOpen) {
            item.close();
            return;
          }
        }
        return;
      }

      // ফাংশন কি-সমূহ (F1 - F10) ও কীবোর্ড শর্টকাট
      if ((e.altKey && (e.key === 'e' || e.key === 'E')) || e.key === 'F5') {
        e.preventDefault();
        onToggleQuickExpense?.();
      } else if ((e.altKey && (e.key === 'c' || e.key === 'C')) || e.key === 'F6') {
        e.preventDefault();
        onToggleCalculator?.();
      } else if (e.key === 'F1') {
        e.preventDefault();
        onFocusPosSearch?.();
      } else if (e.key === 'F2') {
        e.preventDefault();
        onHoldCart?.();
      } else if (e.key === 'F3') {
        e.preventDefault();
        onToggleHeldCarts?.();
      } else if (e.key === 'F4') {
        e.preventDefault();
        onOpenBarcode?.();
      } else if (e.key === 'F7') {
        e.preventDefault();
        onOpenTailoring?.();
      } else if (e.key === 'F8') {
        e.preventDefault();
        onOpenCartFocusCoupon?.();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart && cart.length > 0) {
          onGoToCheckout?.();
        } else {
          onEmptyCheckoutWarn?.();
        }
      } else if (e.key === 'F10') {
        e.preventDefault();
        onOpenInvoiceLookup?.();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  });
}
