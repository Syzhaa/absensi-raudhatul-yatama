import React from "react";

export function SkeletonBox({ className = "" }) {
  return (
    <div
      className={`bg-gray-200 border-2 border-gray-900 rounded-lg animate-pulse ${className}`}
    />
  );
}

export function SkeletonText({ className = "h-4 w-full" }) {
  return (
    <div
      className={`bg-gray-200 rounded animate-pulse ${className}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 shadow-neo space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-3 w-1/3" />
        <SkeletonBox className="w-8 h-8 rounded-xl" />
      </div>
      <SkeletonBox className="h-8 w-1/2" />
      <SkeletonBox className="h-2.5 w-3/4" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="border-b-2 border-gray-200">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-3.5">
          <SkeletonBox className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 shadow-neo space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-4 w-1/2" />
          <SkeletonBox className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonBox className="h-3 w-full" />
      <SkeletonBox className="h-3 w-4/5" />
      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
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
        <SkeletonBox className="w-11 h-11 rounded-xl flex-shrink-0" />
        <div className="space-y-2">
          <SkeletonBox className="h-5 w-40" />
          <SkeletonBox className="h-3 w-64 hidden sm:block" />
        </div>
      </div>
      <SkeletonBox className="h-9 w-28 rounded-xl" />
    </div>
  );
}

export function FormCardSkeleton() {
  return (
    <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-5 shadow-neo space-y-4">
      <SkeletonBox className="h-5 w-1/3" />
      <div className="space-y-3">
        <SkeletonBox className="h-10 w-full rounded-xl" />
        <SkeletonBox className="h-10 w-full rounded-xl" />
        <SkeletonBox className="h-24 w-full rounded-xl" />
      </div>
      <div className="flex justify-end pt-2">
        <SkeletonBox className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
}
