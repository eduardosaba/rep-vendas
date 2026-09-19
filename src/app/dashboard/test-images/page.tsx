'use client';

import React, { useState } from 'react';
import { SmartImage } from '@/components/catalogo/SmartImage';

export default function TestImagesPage() {
  const [variantTestUrl, setVariantTestUrl] = useState('https://picsum.photos/400/400?1');

  // Caso 1: Troca Rápida de Variantes
  const handleSwapVariant = () => {
    setVariantTestUrl(`https://picsum.photos/400/400?${Math.random()}`);
  };

  // Mock Products
  const validCdnProduct = {
    id: 'valid-cdn',
    name: 'Imagem CDN Válida',
    // Usando uma imagem que não vai falhar e simular algo do Supabase
    // Como não sei uma real, uso o Picsum
    image_url: 'https://picsum.photos/400/400?valid', 
  };

  const brokenCdnProduct = {
    id: 'broken-cdn',
    name: 'CDN Quebrada -> Proxy',
    // URL que parece ser do supabase CDN mas vai falhar
    image_url: 'https://mrqjlltdoowztgzhvjfx.supabase.co/storage/v1/object/public/product-images/nao-existe-480w.webp', 
  };

  const brokenProxyProduct = {
    id: 'broken-proxy',
    name: 'Proxy Quebrado -> Placeholder',
    // URL que o Proxy também não vai encontrar
    image_url: 'https://mrqjlltdoowztgzhvjfx.supabase.co/storage/v1/object/public/product-images/fake-broken-proxy-image-123.jpg', 
  };

  const variantProduct = {
    id: 'variant-test',
    name: 'Teste de Variantes',
    image_url: variantTestUrl,
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-slate-800">Homologação de Imagens (SmartImage)</h1>
        <p className="text-slate-500 mt-2">
          Página de diagnóstico para validar o comportamento de fallback e resiliência das imagens.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: CDN Válida */}
        <div className="border rounded-xl p-4 bg-white shadow-sm flex flex-col items-center">
          <h2 className="font-semibold text-slate-700 mb-4 text-center h-10 flex items-center justify-center">1. CDN Válida</h2>
          <div className="w-48 h-48 border rounded-lg bg-slate-50 relative overflow-hidden mb-4">
            <SmartImage product={validCdnProduct} priority={true} />
          </div>
          <p className="text-sm text-slate-500 text-center">
            Deve carregar rapidamente sem piscar ou entrar em loop.
          </p>
        </div>

        {/* Card 2: CDN -> Proxy */}
        <div className="border rounded-xl p-4 bg-white shadow-sm flex flex-col items-center">
          <h2 className="font-semibold text-slate-700 mb-4 text-center h-10 flex items-center justify-center">2. CDN Quebrada (Proxy)</h2>
          <div className="w-48 h-48 border rounded-lg bg-slate-50 relative overflow-hidden mb-4">
            <SmartImage product={brokenCdnProduct} />
          </div>
          <p className="text-sm text-slate-500 text-center">
            A requisição CDN vai falhar (404), deve invocar <code className="bg-slate-100 px-1 rounded">/api/storage-image</code> sem quebrar a tela.
          </p>
        </div>

        {/* Card 3: Proxy -> Placeholder */}
        <div className="border rounded-xl p-4 bg-white shadow-sm flex flex-col items-center">
          <h2 className="font-semibold text-slate-700 mb-4 text-center h-10 flex items-center justify-center">3. Proxy Quebrado (Placeholder)</h2>
          <div className="w-48 h-48 border rounded-lg bg-slate-50 relative overflow-hidden mb-4">
            <SmartImage product={brokenProxyProduct} />
          </div>
          <p className="text-sm text-slate-500 text-center">
            CDN falha, Proxy não acha o arquivo original, e a imagem final é o SVG de Placeholder.
          </p>
        </div>

        {/* Card 4: Variantes */}
        <div className="border rounded-xl p-4 bg-white shadow-sm flex flex-col items-center">
          <h2 className="font-semibold text-slate-700 mb-4 text-center h-10 flex items-center justify-center">4. Troca Rápida de Variante</h2>
          <div className="w-48 h-48 border rounded-lg bg-slate-50 relative overflow-hidden mb-4">
            <SmartImage product={variantProduct} />
          </div>
          <button 
            onClick={handleSwapVariant}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors mb-2"
          >
            Trocar Imagem
          </button>
          <p className="text-sm text-slate-500 text-center">
            O <code>SmartImage</code> deve resetar o erro e exibir a nova imagem corretamente.
          </p>
        </div>

      </div>
    </div>
  );
}
