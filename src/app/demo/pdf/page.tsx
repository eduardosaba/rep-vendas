'use client';

import React, { useEffect } from 'react';
import ProductCatalogPdfV2 from '@/components/catalogo/ProductCatalogPdfV2';

const SAMPLE_PRODUCTS = Array.from({ length: 6 }).map((_, i) => ({
  id: `demo-${i + 1}`,
  name: `Produto Demo ${i + 1}`,
  reference_code: `DEM${String(i + 1).padStart(3, '0')}`,
  price: 99.9 + i * 10,
  image_variants: [
    {
      size: 480,
      url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=480',
    },
    {
      size: 1200,
      url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1200',
    },
  ],
}));

export default function DemoPdfPage() {
  useEffect(() => {
    // nothing
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Demo: ProductCatalogPdfV2</h1>
      <p>Esta página demonstra a geração de PDF e a visualização em revista.</p>
      <div style={{ marginTop: 16 }}>
        <ProductCatalogPdfV2
          products={SAMPLE_PRODUCTS}
          title="Catálogo Demo"
          storeName="Loja Demo"
          showPrices={true}
          primaryColor="#1F6FEB"
          secondaryColor="#0D1B2C"
        />
      </div>
    </div>
  );
}
