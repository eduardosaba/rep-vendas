"use client";

import React, { useEffect, useState } from 'react';
import { BrandWithLogo } from '@/lib/types';
import { SmartImage } from './SmartImage';

export default function BrandHeader({
  brand,
}: {
  brand: BrandWithLogo | null | undefined;
}) {
  const [clientMeta, setClientMeta] = useState<any>(null);

  useEffect(() => {
    try {
      if (brand && typeof window !== 'undefined') {
        const raw = window.localStorage.getItem(`brand_banner_meta:${(brand as any).id}`);
        if (raw) setClientMeta(JSON.parse(raw));
      }
    } catch (e) {
      // ignore
    }
  }, [brand]);

  if (!brand) return null;
  const { banner_url, description, name } = brand;
  if (!banner_url && !description) return null;

  const meta = clientMeta || (brand as any).banner_meta || null;

  let imgClassName = 'object-cover transition-transform duration-700 hover:scale-105';
  let imgStyle: React.CSSProperties = {};

  if (meta) {
    const mode = meta.mode || 'fill';
    if (mode === 'fit') {
      imgClassName = 'object-contain';
      imgStyle = { objectPosition: '50% 50%' };
    } else if (mode === 'stretch') {
      imgClassName = 'object-fill';
      imgStyle = { objectPosition: '50% 50%' };
    } else {
      imgClassName = 'object-cover transition-transform duration-700 hover:scale-105';
      imgStyle = { objectPosition: `${meta.focusX ?? 50}% ${meta.focusY ?? 50}%`, transform: `scale(${(meta.zoom ?? 100) / 100})` };
    }
  }

  return (
    <div className="mb-8">
      {banner_url ? (
        <div className="w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-slate-800 mb-4 shadow-sm border border-gray-100">
          <div className="relative w-full h-44 md:h-56 lg:h-72">
            <SmartImage
              product={{ image_url: banner_url, name }}
              className="w-full h-full"
              imgClassName={imgClassName}
              imgStyle={imgStyle}
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
