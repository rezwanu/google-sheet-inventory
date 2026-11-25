import React from 'react';

/**
 * SkeletonLoader - ইউটিলিটারিয়ান লোডিং প্লেসহোল্ডারসমূহ
 * (KPI Strip, Data Table Rows, POS Catalog Grid)
 */
export function KpiSkeletonStrip({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-neutral-200/80 rounded-lg p-5 space-y-3 animate-pulse"
        >
          <div className="h-3 w-24 bg-neutral-200 rounded-sm" />
          <div className="h-7 w-32 bg-neutral-200 rounded-sm" />
          <div className="h-3 w-20 bg-neutral-100 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeletonRows({ rows = 6, cols = 5 }) {
  return (
    <div className="divide-y divide-neutral-200/80 bg-white border border-neutral-200/80 rounded-lg overflow-hidden animate-pulse">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-3.5">
          {Array.from({ length: cols }).map((__, c) => (
            <div
              key={c}
              className={`h-3.5 bg-neutral-200 rounded-sm ${
                c === 0 ? 'w-32' : c === cols - 1 ? 'w-20 ml-auto' : 'flex-1 max-w-[120px]'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CatalogGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-neutral-200/80 rounded-lg p-3 space-y-2.5"
        >
          <div className="aspect-square w-full bg-neutral-100 rounded-md" />
          <div className="h-3.5 w-3/4 bg-neutral-200 rounded-sm" />
          <div className="h-3 w-1/2 bg-neutral-100 rounded-sm" />
          <div className="flex items-center justify-between pt-1">
            <div className="h-4 w-16 bg-neutral-200 rounded-sm" />
            <div className="h-8 w-14 bg-neutral-200 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
