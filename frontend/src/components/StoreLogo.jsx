import React, { useState, useEffect, useMemo } from 'react';
import { Store } from 'lucide-react';
import { getDriveImageCandidates } from '../services/storage';

/**
 * স্টোর লোগো রেন্ডারিং কম্পোনেন্ট (Utilitarian Minimalism)
 */
export default function StoreLogo({
  url,
  alt = 'স্টোর লোগো',
  className = 'w-8 h-8 object-contain rounded-md border border-neutral-200/80 p-0.5 bg-white',
  fallbackIcon: FallbackIcon = Store,
  fallbackClassName = 'w-8 h-8 rounded-md bg-[#0F172A] flex items-center justify-center text-white font-semibold',
  iconClassName = 'w-4 h-4',
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
