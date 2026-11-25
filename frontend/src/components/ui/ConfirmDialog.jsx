import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmDialog - Forgiving UX নিশ্চিতকরণ ডায়ালগ
 * কার্ট ক্লিয়ার বা পণ্য/ভাউচার ডিলিটের আগে ব্যবহৃত হয়
 */
export default function ConfirmDialog({
  isOpen = false,
  onClose,
  onConfirm,
  title = 'নিশ্চিত করুন',
  message = 'আপনি কি নিশ্চিতভাবে এই কাজটি করতে চান?',
  confirmLabel = 'নিশ্চিত করুন',
  cancelLabel = 'বাতিল',
  isDestructive = false,
  isProcessing = false,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        e.stopPropagation();
        if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-neutral-950/40"
        onClick={() => !isProcessing && onClose && onClose()}
      />
      <div className="relative z-10 w-full max-w-md bg-white border border-neutral-200/80 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-md border flex items-center justify-center shrink-0 ${
                isDestructive
                  ? 'bg-red-50 border-red-200 text-[#B91C1C]'
                  : 'bg-amber-50 border-amber-200 text-[#B45309]'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold font-heading tracking-tight text-[#111111]">
              {title}
            </h3>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-[#525252] hover:text-[#111111] hover:bg-neutral-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs sm:text-sm text-[#525252] leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        <div className="px-5 py-3.5 bg-[#FAFAFA] border-t border-neutral-200/80 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="min-h-[44px] md:min-h-[36px] px-4 py-1.5 text-xs font-medium text-[#111111] bg-white border border-neutral-200/80 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onConfirm}
            className={`min-h-[44px] md:min-h-[36px] px-4 py-1.5 text-xs font-medium text-white rounded-md transition-colors cursor-pointer disabled:opacity-50 ${
              isDestructive
                ? 'bg-[#B91C1C] hover:bg-red-800'
                : 'bg-[#0F172A] hover:bg-slate-800'
            }`}
          >
            {isProcessing ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
