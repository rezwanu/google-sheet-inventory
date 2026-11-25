import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * SlideOverDrawer - Utilitarian Minimalism ডানপাশের স্লাইড-ওভার ড্রয়ার
 * - Esc চাপলে বন্ধ হয়
 * - শূন্য backdrop-blur ও শূন্য ভারী ড্রপ শ্যাডো (১ পিক্সেল হেয়ারলাইন বর্ডার)
 * - মোবাইলে (375px) পূর্ণ প্রস্থ এবং ৪৪ পিক্সেল মিনিমাম ক্লোজ বাটন
 */
export default function SlideOverDrawer({
  isOpen = false,
  onClose,
  title = '',
  subtitle = '',
  maxWidthClass = 'max-w-2xl',
  headerExtra = null,
  footer = null,
  children,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Flat dark scrim (No backdrop-blur) */}
      <div
        className="fixed inset-0 bg-neutral-950/35 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className={`relative z-10 w-full ${maxWidthClass} bg-white border-l border-neutral-200/80 h-full flex flex-col`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200/80 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold font-heading tracking-tight text-[#111111] truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[#525252] mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerExtra}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              title="Close (Esc)"
              className="min-w-[44px] min-h-[44px] md:min-w-[34px] md:min-h-[34px] flex items-center justify-center rounded-md border border-neutral-200/80 bg-white text-[#525252] hover:text-[#111111] hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#FAFAFA]">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-neutral-200/80 bg-white shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
