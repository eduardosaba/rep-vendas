import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import HTMLFlipBook from 'react-pageflip';
import { createClient } from '@/lib/supabase/client';

interface Representative {
  full_name?: string | null;
  whatsapp_number?: string | null;
  instagram_handle?: string | null;
  avatar_url?: string | null;
}

interface Product {
  id: string;
  name: string;
  reference_code?: string | null;
  price: number;
  sale_price?: number | null;
  brand?: string | null;
  image_variants?: Array<{ size: number; url?: string; path?: string }> | null;
  image_url?: string | null;
}

interface Props {
  products: Product[];
  title: string;
  storeName?: string;
  showPrices?: boolean;
  priceType?: 'price' | 'sale_price';
  primaryColor?: string; // Escolhida pelo usuário
  secondaryColor?: string; // Escolhida pelo usuário
  onProgress?: (p: number, msg?: string) => void;
}

// --- HELPERS AUXILIARES ---
const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
};

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export const ProductCatalogPdfV2: React.FC<Props> = ({
  products,
  title,
  storeName,
  showPrices = true,
  priceType = 'price',
  primaryColor = '#1A1A1A',
  secondaryColor = '#F5F5F5',
  onProgress,
}) => {
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cart, setCart] = useState<any[]>([]);
  const [rep, setRep] = useState<Representative | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (data) setRep(data);
      }
    };
    fetchProfile();
  }, []);

  const cartSummary = () => ({
    items: cart.reduce((acc, curr) => acc + curr.quantity, 0),
    total: cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0),
  });

  // --- GERAÇÃO DO PDF ESTILO REVISTA ---
  const handleGeneratePDF = async () => {
    setGenerating(true);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const rgbPrimary = hexToRgb(primaryColor);
    const rgbSecondary = hexToRgb(secondaryColor);

    // 1. CAPA ESTILO EDITORIAL
    onProgress?.(10, 'Desenhando capa...');
    doc.setFillColor(...rgbPrimary);
    doc.rect(0, 0, 70, pageH, 'F'); // Faixa lateral moderna

    if (rep?.avatar_url) {
      const logo = await fetchImageAsDataUrl(rep.avatar_url);
      if (logo) doc.addImage(logo, 'PNG', 15, 20, 40, 40, '', 'FAST');
    }

    doc.setTextColor(...rgbPrimary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(45);
    doc.text('CATÁLOGO', 80, 80);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'normal');
    doc.text(title.toUpperCase(), 80, 95);

    // Info do Representante na Capa
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`REPRESENTANTE: ${rep?.full_name || '---'}`, 80, 260);
    doc.text(`WHATSAPP: ${rep?.whatsapp_number || '---'}`, 80, 266);

    // 2. PÁGINAS DE PRODUTOS (GRID 2x2)
    const cols = 2;
    const rows = 2;
    const margin = 15;
    const cellW = (pageW - margin * 2.5) / cols;
    const cellH = (pageH - margin * 3) / rows;

    for (let i = 0; i < products.length; i++) {
      if (i % 4 === 0) doc.addPage();

      const p = products[i];
      const col = i % 2;
      const row = Math.floor((i % 4) / 2);
      const x = margin + col * (cellW + 5);
      const y = margin + 15 + row * (cellH + 5);

      // Imagem Otimizada (480w)
      const variant =
        p.image_variants?.find((v) => v.size === 480)?.url || p.image_url;
      const img = variant ? await fetchImageAsDataUrl(variant) : null;

      if (img) {
        doc.addImage(img, 'JPEG', x, y, cellW, cellH * 0.7, '', 'MEDIUM');
      }

      // Tipografia de Grife
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(p.name.toUpperCase(), x, y + cellH * 0.75);

      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text(`REF: ${p.reference_code || '---'}`, x, y + cellH * 0.81);

      if (showPrices) {
        doc.setTextColor(...rgbPrimary);
        doc.setFont('helvetica', 'bold');
        const price =
          (priceType === 'sale_price' ? p.sale_price : p.price) || p.price;
        doc.text(`R$ ${price.toFixed(2)}`, x, y + cellH * 0.88);
      }

      // Rodapé discreto
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(
        `${storeName} | Página ${doc.getNumberOfPages()}`,
        pageW / 2,
        pageH - 8,
        { align: 'center' }
      );

      onProgress?.(Math.round((i / products.length) * 100));
    }

    doc.save(`${title}.pdf`);
    setGenerating(false);
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleGeneratePDF}
          disabled={generating}
          className="flex-1 min-w-[200px] h-12 rounded-lg font-bold text-white transition-all active:scale-95 shadow-lg"
          style={{ backgroundColor: primaryColor }}
        >
          {generating ? '⌛ GERANDO...' : '📥 BAIXAR PDF REVISTA'}
        </button>
        <button
          onClick={() => setPreviewOpen(true)}
          className="flex-1 min-w-[200px] h-12 rounded-lg font-bold border-2 transition-all hover:bg-gray-50 active:scale-95"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          📖 REVISTA DIGITAL (FLIP)
        </button>
      </div>

      {/* MODAL FLIPBOOK INTERATIVO */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-6xl h-[95vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-10 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                ></div>
                <h2 className="font-black text-xl uppercase tracking-widest">
                  {title}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 rounded-full font-bold text-sm bg-green-100 text-green-700 border border-green-200">
                  🛒 {cartSummary().items} itens selecionados
                </div>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 bg-zinc-200 overflow-hidden flex items-center justify-center p-10">
              <HTMLFlipBook
                width={500}
                height={700}
                size="fixed"
                minWidth={300}
                minHeight={400}
                maxWidth={1000}
                maxHeight={1400}
                drawShadow={true}
                flippingTime={1000}
                usePortrait={false}
                startPage={0}
                autoSize={true}
                maxShadowOpacity={0.5}
                showCover={true}
                mobileScrollSupport={true}
                clickEventForward={true}
                useMouseEvents={true}
                swipeDistance={30}
                showPageCorners={true}
                disableFlipByClick={false}
                className="shadow-2xl"
              >
                {/* Capa Flipbook */}
                <div
                  className="bg-white p-12 flex flex-col items-center justify-center text-center border-r-8"
                  style={{ borderRightColor: primaryColor }}
                >
                  <h1
                    className="text-5xl font-black mb-4 leading-none"
                    style={{ color: primaryColor }}
                  >
                    {title}
                  </h1>
                  <div className="w-20 h-2 bg-black mb-10"></div>
                  {rep?.avatar_url && (
                    <img
                      src={rep.avatar_url}
                      className="w-40 grayscale hover:grayscale-0 transition-all mb-10"
                    />
                  )}
                  <p className="uppercase tracking-[0.3em] text-gray-400 text-xs">
                    Coleção Oficial 2026
                  </p>
                </div>

                {/* Páginas Internas */}
                {products.map((p) => {
                  const itemQty =
                    cart.find((i) => i.productId === p.id)?.quantity || 0;
                  return (
                    <div
                      key={p.id}
                      className="bg-white p-10 flex flex-col h-full border-l border-gray-100"
                    >
                      <div className="flex-1 flex items-center justify-center bg-zinc-50 rounded-2xl mb-8 group relative">
                        <img
                          src={
                            p.image_variants?.find((v) => v.size === 480)
                              ?.url ||
                            p.image_url ||
                            ''
                          }
                          className="max-h-[350px] object-contain transition-transform group-hover:scale-110"
                        />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-2xl font-black text-gray-900 leading-tight">
                          {p.name}
                        </h3>
                        <p className="text-gray-400 font-medium tracking-widest">
                          REF: {p.reference_code}
                        </p>

                        <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                          {showPrices && (
                            <p
                              className="text-3xl font-black"
                              style={{ color: primaryColor }}
                            >
                              R$ {p.price.toFixed(2)}
                            </p>
                          )}

                          {/* SELETOR DE QUANTIDADE */}
                          <div className="flex items-center bg-gray-100 rounded-full p-1 border border-gray-200">
                            <button
                              onClick={() => {
                                const q = Math.max(0, itemQty - 1);
                                setCart((prev) =>
                                  q === 0
                                    ? prev.filter((i) => i.productId !== p.id)
                                    : prev.map((i) =>
                                        i.productId === p.id
                                          ? { ...i, quantity: q }
                                          : i
                                      )
                                );
                              }}
                              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white"
                            >
                              -
                            </button>
                            <span className="w-12 text-center font-bold text-lg">
                              {itemQty}
                            </span>
                            <button
                              onClick={() => {
                                setCart((prev) =>
                                  itemQty === 0
                                    ? [
                                        ...prev,
                                        {
                                          productId: p.id,
                                          name: p.name,
                                          reference: p.reference_code,
                                          price: p.price,
                                          quantity: 1,
                                        },
                                      ]
                                    : prev.map((i) =>
                                        i.productId === p.id
                                          ? { ...i, quantity: itemQty + 1 }
                                          : i
                                      )
                                );
                              }}
                              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Checkout / Pedido Final */}
                <div className="bg-zinc-50 p-12 flex flex-col items-center justify-center">
                  <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl text-center">
                    <h2 className="text-3xl font-black mb-8">
                      RESUMO DO PEDIDO
                    </h2>
                    <div className="space-y-4 mb-10 text-left border-b pb-8">
                      <p className="flex justify-between text-gray-500">
                        Total de itens:{' '}
                        <span className="text-black font-bold">
                          {cartSummary().items}
                        </span>
                      </p>
                      <p className="flex justify-between text-gray-500 text-xl">
                        Total:{' '}
                        <span
                          className="font-black"
                          style={{ color: primaryColor }}
                        >
                          R$ {cartSummary().total.toFixed(2)}
                        </span>
                      </p>
                    </div>

                    <button
                      disabled={cart.length === 0}
                      onClick={() => {
                        const itemsTxt = cart
                          .map(
                            (i) =>
                              `• ${i.quantity}x ${i.name} (REF: ${i.reference})`
                          )
                          .join('%0A');
                        const msg = `Olá ${rep?.full_name}, gostaria de enviar este pedido através do catálogo interativo:%0A%0A${itemsTxt}%0A%0A*TOTAL: R$ ${cartSummary().total.toFixed(2)}*`;
                        window.open(
                          `https://wa.me/${rep?.whatsapp_number?.replace(/\D/g, '')}?text=${msg}`
                        );
                      }}
                      className="w-full py-5 rounded-2xl font-black text-lg bg-green-500 text-white shadow-xl shadow-green-200 hover:bg-green-600 transition-all disabled:bg-gray-300"
                    >
                      🚀 ENVIAR VIA WHATSAPP
                    </button>
                  </div>
                </div>
              </HTMLFlipBook>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalogPdfV2;
