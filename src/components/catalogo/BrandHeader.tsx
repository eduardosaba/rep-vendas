import React from 'react';
import { BrandWithLogo } from '@/lib/types';

export default function BrandHeader({
  brand,
}: {
  brand: BrandWithLogo | null | undefined;
}) {
  if (!brand) return null;
  const { banner_url, description, name } = brand;
  if (!banner_url && !description) return null;

  return (
    <div className="mb-8">
      {banner_url ? (
        <div className="w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-slate-800 mb-4 shadow-sm border border-gray-100">
          <div className="relative w-full h-44 md:h-56 lg:h-72">
            <img
              src={banner_url}
              alt={`${name} banner`}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute left-6 bottom-4 text-white">
              <h2 className="text-lg md:text-2xl font-extrabold drop-shadow-lg">
                {name}
              </h2>
            </div>
          </div>
        </div>
      ) : null}

      {description ? (
        <div className="prose prose-sm prose-slate dark:prose-invert max-w-4xl">
          <p className="text-base md:text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            {description}
          </p>
        </div>
      ) : null}
    </div>
  );
}
