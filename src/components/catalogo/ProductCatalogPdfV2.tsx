import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import HTMLFlipBook from 'react-pageflip';
import { createClient } from '@/lib/supabase/client';

// react-pageflip prop types are strict; alias to any to avoid prop mismatch errors in TS
const FlipBook: any = HTMLFlipBook as any;

// Interfaces
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
  primaryColor?: string;
  secondaryColor?: string;
  onProgress?: (p: number, msg?: string) => void;
}

const defaultPrimary = '#1A1A1A'; // Mais elegante (preto luxo)
const defaultSecondary = '#757575';

// --- HELPERS ---
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
  } catch (e) {
    return null;
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

// --- COMPONENTE PRINCIPAL ---
export const ProductCatalogPdfV2: React.FC<Props> = ({
  products,
  title,
  storeName = 'RepVendas',
  showPrices = true,
  priceType = 'price',
  primaryColor = defaultPrimary,
  secondaryColor = defaultSecondary,
  onProgress,
}) => {
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cart, setCart] = useState<any[]>([]);
  const [rep, setRep] = useState<Representative | null>(null);

  // Busca perfil do representante automaticamente
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
          .single();
        if (data) setRep(data);
      }
    };
    fetchProfile();
  }, []);

  const cartSummary = () => ({
    items: cart.reduce((acc, curr) => acc + curr.quantity, 0),
    total: cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0),
  });

  const updateCart = (product: Product, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0)
          return prev.filter((item) => item.productId !== product.id);
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: newQty } : item
        );
      }
      if (delta <= 0) return prev;
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          reference: product.reference_code,
          price:
            (priceType === 'sale_price' ? product.sale_price : product.price) ||
            product.price,
          quantity: 1,
        },
      ];
    });
  };

  // --- GERAÇÃO DO PDF ---
  const handleGeneratePDF = async () => {
    setGenerating(true);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const rgbPrimary = hexToRgb(primaryColor);

    // 1. CAPA ESTILIZADA
    onProgress?.(5, 'Criando capa...');
    doc.setFillColor(...rgbPrimary);
    doc.rect(0, 0, pageW, pageH * 0.4, 'F'); // Bloco superior

    if (rep?.avatar_url) {
      const logoData = await fetchImageAsDataUrl(rep.avatar_url);
      if (logoData)
        doc.addImage(logoData, 'PNG', pageW / 2 - 25, 20, 50, 25, '', 'FAST');
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text(title.toUpperCase(), pageW / 2, pageH * 0.35, { align: 'center' });

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.text(storeName, pageW / 2, pageH * 0.5, { align: 'center' });

    if (rep) {
      doc.setFontSize(10);
      doc.text(`Consultor: ${rep.full_name || ''}`, pageW / 2, pageH * 0.85, {
        align: 'center',
      });
      doc.text(
        `WhatsApp: ${rep.whatsapp_number || ''}`,
        pageW / 2,
        pageH * 0.9,
        { align: 'center' }
      );
    }

    // 2. GRID DE PRODUTOS
    const cols = 2;
    const rows = 2;
    const margin = 15;
    const cellW = (pageW - margin * 2) / cols;
    const cellH = (pageH - margin * 2 - 20) / rows;

    for (let i = 0; i < products.length; i++) {
      if (i % 4 === 0) doc.addPage();

      const p = products[i];
      const col = i % 2;
      const row = Math.floor((i % 4) / 2);
      const x = margin + col * cellW;
      const y = margin + 20 + row * cellH;

      // Moldura leve
      doc.setDrawColor(230, 230, 230);
      doc.rect(x + 2, y + 2, cellW - 4, cellH - 4);

      // Imagem
      const variant =
        p.image_variants?.find((v) => v.size === 480)?.url || p.image_url;
      const imgData = variant ? await fetchImageAsDataUrl(variant) : null;

      if (imgData) {
        doc.addImage(
          imgData,
          'JPEG',
          x + 5,
          y + 5,
          cellW - 10,
          cellH * 0.6,
          '',
          'MEDIUM'
        );
      } else {
        doc.setFillColor(250, 250, 250);
        doc.rect(x + 5, y + 5, cellW - 10, cellH * 0.6, 'F');
        doc.setTextColor(200, 200, 200);
        doc.text('SEM FOTO', x + cellW / 2, y + cellH * 0.3, {
          align: 'center',
        });
      }

      // Detalhes
      doc.setTextColor(...rgbPrimary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(p.name.substring(0, 25), x + 6, y + cellH * 0.7);

      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(`Ref: ${p.reference_code || '---'}`, x + 6, y + cellH * 0.75);

      if (showPrices) {
        doc.setTextColor(0, 100, 0);
        doc.setFont('helvetica', 'bold');
        const price =
          (priceType === 'sale_price' ? p.sale_price : p.price) || p.price;
        doc.text(`R$ ${price.toFixed(2)}`, x + cellW - 6, y + cellH * 0.75, {
          align: 'right',
        });
      }

      // Rodapé da página
      const pageNum = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${pageNum} | ${storeName}`, pageW / 2, pageH - 10, {
        align: 'center',
      });

      onProgress?.(Math.round((i / products.length) * 100));
    }

    doc.save(`${title}.pdf`);
    setGenerating(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          onClick={handleGeneratePDF}
          disabled={generating}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {generating ? '🚀 Gerando...' : 'Gerar PDF Premium'}
        </button>
        <button
          onClick={() => setPreviewOpen(true)}
          className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition"
        >
          📖 Abrir Revista Interativa
        </button>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl overflow-hidden flex flex-col relative">
            {/* Header Flipbook */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-800">{title}</h2>
              <div className="flex items-center gap-4">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                  🛒 {cartSummary().items} itens no pedido
                </span>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="text-gray-500 hover:text-black"
                >
                  ✖
                </button>
              </div>
            </div>

            {/* Flipbook Content */}
            <div className="flex-1 overflow-hidden flex items-center justify-center bg-gray-200">
              <FlipBook
                width={500}
                height={700}
                size="stretch"
                minWidth={315}
                maxWidth={1000}
                minHeight={400}
                maxHeight={1533}
                showCover={true}
                className="shadow-2xl"
              >
                {/* Capa Flipbook */}
                <div className="bg-white p-12 flex flex-col items-center justify-center text-center shadow-inner">
                  <div className="w-24 h-1 bg-black mb-6"></div>
                  <h1 className="text-4xl font-black mb-2">{title}</h1>
                  <p className="text-gray-500 tracking-[0.2em] uppercase text-sm mb-12">
                    Coleção 2026
                  </p>
                  {rep?.avatar_url && (
                    <img src={rep.avatar_url} className="w-32 mb-8" />
                  )}
                  <p className="text-gray-400 text-xs">
                    Exclusivo para parceiros comerciais
                  </p>
                </div>

                {/* Páginas de Produtos */}
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white p-8 border-l shadow-sm flex flex-col h-full"
                  >
                    <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-xl mb-6">
                      <img
                        src={
                          p.image_variants?.find((v) => v.size === 480)?.url ||
                          p.image_url ||
                          '/placeholder.png'
                        }
                        className="max-h-[300px] object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold uppercase tracking-tight">
                        {p.name}
                      </h3>
                      <p className="text-gray-400 font-mono text-sm">
                        REF: {p.reference_code}
                      </p>

                      <div className="flex justify-between items-end pt-4">
                        {showPrices && (
                          <div>
                            <p className="text-xs text-gray-400">
                              Preço Sugerido
                            </p>
                            <p className="text-2xl font-black text-green-700">
                              R${' '}
                              {(
                                (priceType === 'sale_price'
                                  ? p.sale_price
                                  : p.price) || p.price
                              ).toFixed(2)}
                            </p>
                          </div>
                        )}

                        {/* CONTROLES DE QUANTIDADE */}
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => updateCart(p, -1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition"
                          >
                            -
                          </button>
                          <span className="w-10 text-center font-bold">
                            {cart.find((i) => i.productId === p.id)?.quantity ||
                              0}
                          </span>
                          <button
                            onClick={() => updateCart(p, 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Página Final / Checkout */}
                <div className="bg-gray-50 p-12 flex flex-col items-center justify-center text-center">
                  <h2 className="text-3xl font-black mb-6">Finalizar Pedido</h2>
                  <div className="w-full bg-white rounded-2xl p-6 shadow-sm mb-8">
                    <p className="text-gray-500 mb-2">
                      Total de Itens:{' '}
                      <span className="text-black font-bold">
                        {cartSummary().items}
                      </span>
                    </p>
                    <p className="text-gray-500">
                      Valor Estimado:{' '}
                      <span className="text-green-700 font-bold">
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
                      const msg = `Olá ${rep?.full_name}, gostaria de solicitar o seguinte pedido via catálogo:%0A%0A${itemsTxt}%0A%0A*Total: R$ ${cartSummary().total.toFixed(2)}*`;
                      window.open(
                        `https://wa.me/${rep?.whatsapp_number?.replace(/\D/g, '')}?text=${msg}`
                      );
                    }}
                    className="bg-green-600 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-green-700 transition disabled:bg-gray-300"
                  >
                    🚀 Enviar via WhatsApp
                  </button>
                </div>
              </FlipBook>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalogPdfV2;
