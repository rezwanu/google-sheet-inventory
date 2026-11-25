import React from 'react';

/**
 * StatusBadge - স্ট্যাটাস ব্যাজ কম্পোনেন্ট
 * শুধুমাত্র নির্ধারিত সেমান্টিক কালার: Emerald (#15803D), Amber (#B45309), Crimson (#B91C1C), Neutral (#525252)
 */
const VARIANT_CLASSES = {
  success: 'bg-emerald-50 text-[#15803D] border-emerald-200',
  warning: 'bg-amber-50 text-[#B45309] border-amber-200',
  danger: 'bg-red-50 text-[#B91C1C] border-red-200',
  neutral: 'bg-neutral-100 text-[#525252] border-neutral-200',
  accent: 'bg-[#0F172A] text-white border-[#0F172A]',
};

export default function StatusBadge({
  variant = 'neutral',
  children,
  mono = false,
  className = '',
  title = '',
}) {
  const styles = VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral;
  return (
    <span
      title={title}
      className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[11px] font-medium leading-tight whitespace-nowrap ${
        mono ? 'font-mono tabular-nums' : 'font-sans'
      } ${styles} ${className}`}
    >
      {children}
    </span>
  );
}
