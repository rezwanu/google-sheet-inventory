import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * EmptyState - পরিচ্ছন্ন এম্পটি স্টেট কম্পোনেন্ট
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'কোনো তথ্য পাওয়া যায়নি',
  description = '',
  actionLabel = '',
  onAction = null,
  compact = false,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center bg-white border border-dashed border-neutral-200/90 rounded-lg ${
        compact ? 'py-8 px-4' : 'py-14 px-6'
      }`}
    >
      <div className="w-10 h-10 rounded-md bg-neutral-100 border border-neutral-200/80 flex items-center justify-center text-[#525252] mb-3">
        <Icon className="w-5 h-5 stroke-[1.75]" />
      </div>
      <h3 className="text-sm font-semibold font-heading tracking-tight text-[#111111]">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[#525252] mt-1 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && typeof onAction === 'function' && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 min-h-[44px] md:min-h-[36px] px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
