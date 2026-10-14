import React, { useState, useEffect, useMemo } from 'react';
import { Store } from 'lucide-react';
import { getDriveImageCandidates } from '../services/storage';

/**
 * স্টোর লোগো রেন্ডারিং কম্পোনেন্ট
 * গুগল ড্রাইভের বিভিন্ন ফরম্যাট (thumbnail, lh3, uc) স্বয়ংক্রিয়ভাবে ট্রাই করে এবং ব্যর্থ হলে ফলব্যাক আইকন দেখায়।
 */
export default function StoreLogo({
  url,
  alt = 'স্টোর লোগো',
  className = 'w-10 h-10 object-contain rounded-xl border border-slate-200/80 p-0.5 bg-white shadow-2xs',
  fallbackIcon: FallbackIcon = Store,
  fallbackClassName = 'w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black shadow-md shadow-indigo-500/20',
  iconClassName = 'w-5 h-5',
}) {
  const candidates = useMemo(() => getDriveImageCandidates(url), [url]);
  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [url]);

  const currentSrc = candidates[candidateIdx] || '';
  const hasValidSrc = Boolean(currentSrc && candidateIdx < candidates.length);

  const handleError = () => {
    setCandidateIdx((prev) => prev + 1);
  };

  if (hasValidSrc) {
    return (
      <img
        src={currentSrc}
        alt={alt}
        className={className}
        onError={handleError}
      />
    );
  }

  if (!FallbackIcon) return null;

  return (
    <div className={fallbackClassName}>
      <FallbackIcon className={iconClassName} />
    </div>
  );
}

