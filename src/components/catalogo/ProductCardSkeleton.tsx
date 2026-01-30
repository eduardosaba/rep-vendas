import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

export function ProductCardSkeleton() {
  return (
    <div className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300">
      <div className="relative aspect-square w-full flex items-center justify-center bg-white overflow-hidden border-b border-gray-50">
        <Skeleton className="aspect-square w-full rounded-3xl" />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex-1">
          <div className="mb-1">
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="mt-1">
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        <div className="mt-auto border-t border-gray-50 pt-3">
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-6 w-1/2 mt-2" />
            </div>
            <div className="w-10 h-10">
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductCardSkeleton;
