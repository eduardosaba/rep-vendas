'use client';

import React, { useEffect, useState } from 'react';
import FeaturedCarousel from '@/components/catalog/FeaturedCarousel';

export default function FeaturedSection({ userId }: { userId?: string }) {
  const [items, setItems] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!userId) return;
    fetch(`/api/public/featured?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        setItems(Array.isArray(j?.products) ? j.products : []);
      })
      .catch((e) => {
        console.warn('Failed to load featured products', e);
        if (mounted) setItems([]);
      });
    return () => {
      mounted = false;
    };
  }, [userId]);

  if (!items || items.length === 0) return null;
  return <FeaturedCarousel products={items} />;
}
