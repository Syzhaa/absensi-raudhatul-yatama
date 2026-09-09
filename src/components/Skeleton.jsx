import React from "react";

export function SkeletonBox({ className = "" }) {
  return (
    <div
      className={`bg-slate-200/80 rounded-md animate-pulse ${className}`}
    />
  );
}

export function SkeletonText({ className = "h-4 w-full" }) {
  return (
    <div
      className={`bg-slate-200/80 rounded animate-pulse ${className}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 md:p-5 shadow-neo space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-3 w-1/3" />
        <SkeletonBox className="w-8 h-8 rounded-xl" />
      </div>
      <SkeletonBox className="h-8 w-1/2" />
      <SkeletonBox className="h-2.5 w-3/4" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }) {
  return (
    <tr className="border-b border-gray-200">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <SkeletonBox className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 shadow-neo space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-11 h-11 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-4 w-2/5" />
          <SkeletonBox className="h-3 w-1/4" />
        </div>
      </div>
      <div className="space-y-2 pt-1">
        <SkeletonBox className="h-3 w-full" />
        <SkeletonBox className="h-3 w-4/5" />
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <SkeletonBox className="h-3 w-20" />
        <SkeletonBox className="h-6 w-16 rounded-lg" />
      </div>
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 shadow-neo flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="space-y-1.5">
          <SkeletonBox className="h-4 w-36" />
          <SkeletonBox className="h-3 w-56 hidden sm:block" />
        </div>
      </div>
      <SkeletonBox className="h-8 w-24 rounded-xl" />
    </div>
  );
}

export function FormCardSkeleton() {
  return (
    <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-5 shadow-neo space-y-4">
      <SkeletonBox className="h-4 w-1/4" />
      <div className="space-y-3">
        <SkeletonBox className="h-10 w-full rounded-xl" />
        <SkeletonBox className="h-10 w-full rounded-xl" />
        <SkeletonBox className="h-20 w-full rounded-xl" />
      </div>
      <div className="flex justify-end pt-2">
        <SkeletonBox className="h-9 w-28 rounded-xl" />
      </div>
    </div>
  );
}
