'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Layout,
  Palette,
  Type,
  Download,
  QrCode,
  Frame,
  Loader2,
  Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { generateCatalogPDF } from '@/utils/generateCatalogPDF';
import { toast } from 'sonner';

export function ExportModal({
  isOpen,
  onClose,
  products,
  storeSettings,
  brandMapping,
}: any) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ p: 0, msg: '' });
  const [previewTab, setPreviewTab] = useState<'cover' | 'page'>('cover');
  const [previews, setPreviews] = useState({
    cover: null as string | null,
    page: null as string | null,
  });

  const [options, setOptions] = useState({
    title: 'Catálogo de Produtos 2026',
    itemsPerRow: 2 as 1 | 2 | 3,
    showPrices: true,
    priceType: 'sale_price' as 'price' | 'sale_price',
    showBorder: true,
    showQR: true,
    logoPosition: 'center' as 'top' | 'center',
    primaryColor: storeSettings?.primary_color || '#b9722e',
    secondaryColor: storeSettings?.secondary_color || '#0d1b2c',
  });

  const getSafePreviewUrl = (url: string) => {
    if (!url) return '/link.webp';
    if (url.includes('supabase.co/storage')) {
      const parts = url.split('/public/');
      const path = parts.length > 1 ? parts[1] : '';
      return `/api/storage-image?path=${encodeURIComponent(path)}`;
    }
    return url;
  };

  // FUNÇÃO DE ATUALIZAÇÃO FORÇADA DOS PREVIEWS
  const updatePreviews = useCallback(async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 300;
    canvas.height = 400;

    // --- 1. GERAÇÃO DA CAPA ---
    ctx.clearRect(0, 0, 300, 400);
    ctx.fillStyle = options.secondaryColor;
    ctx.fillRect(0, 0, 300, 400);
    ctx.fillStyle = options.primaryColor;
    ctx.fillRect(0, 0, 15, 400);

    const firstBrand = products?.[0]?.brand;
    const brandLogoUrl = firstBrand ? brandMapping?.[firstBrand] : null;
    const finalLogoUrl = getSafePreviewUrl(
      brandLogoUrl || storeSettings?.logo_url
    );

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `${finalLogoUrl}?v=${new Date().getTime()}`; // Cache bust para forçar reload

    img.onload = () => {
      const ratio = img.width / img.height;
      const isCenter = options.logoPosition === 'center';
      const targetW = isCenter ? 100 : 65;
      const targetH = targetW / ratio;
      const logoY = isCenter ? 160 : 50;
      const pad = 12;

      // Box Branco Arredondado
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(
        (300 - targetW) / 2 + 7 - pad,
        logoY - pad,
        targetW + pad * 2,
        targetH + pad * 2,
        10
      );
      ctx.fill();
      ctx.drawImage(img, (300 - targetW) / 2 + 7, logoY, targetW, targetH);

      // Título
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      const words = options.title.toUpperCase().split(' ');
      let lines = [];
      let curLine = words[0];
      for (let i = 1; i < words.length; i++) {
        if (ctx.measureText(curLine + ' ' + words[i]).width < 220) {
          curLine += ' ' + words[i];
        } else {
          lines.push(curLine);
          curLine = words[i];
        }
      }
      lines.push(curLine);
      const titleY = isCenter ? 80 : 200;
      lines.forEach((line, idx) => {
        ctx.fillText(line, 157, titleY + idx * 25 - (lines.length - 1) * 12);
      });

      // NOME DO REPRESENTANTE CENTRALIZADO
      const representativeName =
        storeSettings?.representative_name || storeSettings?.representativeName || 'EDUARDO SABA';
      const lastLineY = titleY + (lines.length * 12) + 20;
      ctx.font = '500 12px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(`REPRESENTANTE: ${representativeName}`, 157, lastLineY);

      const coverB64 = canvas.toDataURL();

      // --- 2. GERAÇÃO DA GRADE ---
      ctx.fillStyle = options.primaryColor;
      ctx.fillRect(0, 0, 300, 400);
      const cols = options.itemsPerRow;
      const rows = cols === 3 ? 5 : 4;
      const marginX = 20;
      const marginY = 40;
      const gap = 8;
      const cardW = (300 - marginX * 2 - gap * (cols - 1)) / cols;
      const cardH = (360 - marginY - gap * (rows - 1)) / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = '#FFFFFF';
          const x = marginX + c * (cardW + gap);
          const y = marginY + r * (cardH + gap);
          ctx.beginPath();
          ctx.roundRect(x, y, cardW, cardH, 3);
          ctx.fill();
          ctx.fillStyle = '#f8f8f8';
          ctx.fillRect(x + 2, y + 2, cardW - 4, cardH * 0.6);
          if (options.showQR) {
            ctx.fillStyle = '#333';
            ctx.fillRect(x + cardW - 8, y + cardH - 8, 6, 6);
          }
        }
      }
      const pageB64 = canvas.toDataURL();
      setPreviews({ cover: coverB64, page: pageB64 });
    };
  }, [options, products, brandMapping, storeSettings]);

  // Monitora qualquer mudança nas opções e dispara o update
  useEffect(() => {
    if (isOpen) updatePreviews();
  }, [options, isOpen, updatePreviews]);

  const handleGenerate = async () => {
    setLoading(true);
    setProgress({ p: 0, msg: 'Iniciando...' });
    try {
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : '';
      const catalogSlug =
        storeSettings?.catalog_slug || storeSettings?.slug || 'catalogo';

      // Pegamos o nome do representante/loja dinamicamente
      const representativeName = storeSettings?.name || storeSettings?.storeName || 'Representante';

      await generateCatalogPDF(products || [], {
        ...options,
        title: options.title,
        itemsPerRow: options.itemsPerRow,
        storeName: representativeName,
        storeLogo: storeSettings?.logo_url,
        imageZoom: 3,
        brandMapping: brandMapping || {},
        primaryColor: options.primaryColor,
        secondaryColor: options.secondaryColor,
        logoPosition: options.logoPosition,
        coverTemplate: 1,
        coverCount: 1,
        baseUrl,
        catalogSlug,
        showQR: options.showQR,
        onProgress: (p: number, msg: string) => {
          setProgress({ p, msg });
        },
        onLogoFallback: (info: any) => {
          // notificamos levemente para depuração, não interrompe geração
          console.debug('Logo fallback', info);
        },
      });

      toast.success('PDF gerado com sucesso!');
      onClose?.();
    } catch (err: any) {
      console.error('Erro ao gerar PDF', err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setLoading(false);
      setProgress({ p: 0, msg: '' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden my-auto animate-in zoom-in-95">
        <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
            <Download className="text-indigo-600" /> CATALOGO PREMIUM
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto max-h-[75vh]">
          <div className="space-y-6">
            <section className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 shadow-sm">
              <label className="text-[10px] font-black uppercase text-indigo-600 mb-2 block tracking-widest flex items-center gap-2">
                <Type size={14} /> Título do Catálogo
              </label>
              <textarea
                value={options.title}
                onChange={(e) =>
                  setOptions({ ...options, title: e.target.value })
                }
                className="w-full p-3 bg-white rounded-2xl text-sm font-bold border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 min-h-[70px]"
              />
            </section>

            <div className="grid grid-cols-2 gap-4">
              <section className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Posição Logo na Capa
                </span>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() =>
                      setOptions({ ...options, logoPosition: 'top' })
                    }
                    className={`flex-1 py-2 rounded-lg text-[8px] font-black transition-all ${options.logoPosition === 'top' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-indigo-400'}`}
                  >
                    TOPO
                  </button>
                  <button
                    onClick={() =>
                      setOptions({ ...options, logoPosition: 'center' })
                    }
                    className={`flex-1 py-2 rounded-lg text-[8px] font-black transition-all ${options.logoPosition === 'center' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-indigo-400'}`}
                  >
                    CENTRO
                  </button>
                </div>
              </section>
              <section className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Grade de Produtos
                </span>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        setOptions({ ...options, itemsPerRow: n as any })
                      }
                      className={`flex-1 py-2 rounded-lg text-[8px] font-black transition-all ${options.itemsPerRow === n ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}
                    >
                      {n === 1 ? 'L' : n === 2 ? '2x4' : '3x5'}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <section className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 shadow-sm">
              <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block tracking-widest flex items-center gap-2">
                <Palette size={14} /> Identidade Visual (Cores)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-500 uppercase">
                    Fundo Grade
                  </span>
                  <input
                    type="color"
                    value={options.primaryColor}
                    onChange={(e) =>
                      setOptions({ ...options, primaryColor: e.target.value })
                    }
                    className="w-full h-10 rounded-xl cursor-pointer bg-white p-1"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-500 uppercase">
                    Fundo Capa
                  </span>
                  <input
                    type="color"
                    value={options.secondaryColor}
                    onChange={(e) =>
                      setOptions({ ...options, secondaryColor: e.target.value })
                    }
                    className="w-full h-10 rounded-xl cursor-pointer bg-white p-1"
                  />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  setOptions({ ...options, showQR: !options.showQR })
                }
                className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${options.showQR ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400'}`}
              >
                <QrCode size={18} />{' '}
                <span className="text-[10px] font-bold uppercase">
                  QR Codes
                </span>
              </button>
              <button
                onClick={() =>
                  setOptions({ ...options, showBorder: !options.showBorder })
                }
                className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${options.showBorder ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400'}`}
              >
                <Frame size={18} />{' '}
                <span className="text-[10px] font-bold uppercase">Bordas</span>
              </button>
            </section>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl self-center shadow-inner">
              <button
                onClick={() => setPreviewTab('cover')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${previewTab === 'cover' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
              >
                Capa
              </button>
              <button
                onClick={() => setPreviewTab('page')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${previewTab === 'page' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
              >
                Grade
              </button>
            </div>

            <div className="bg-slate-50 rounded-[2.5rem] p-6 border-2 border-dashed flex items-center justify-center min-h-[350px]">
              {(previewTab === 'cover' ? previews.cover : previews.page) ? (
                <img
                  src={
                    previewTab === 'cover' ? previews.cover! : previews.page!
                  }
                  className="h-72 md:h-80 shadow-2xl rounded-lg animate-in fade-in"
                  alt="Preview"
                />
              ) : (
                <Loader2 className="animate-spin text-slate-300" size={32} />
              )}
            </div>
          </div>
        </div>

        {/* FOOTER COM BARRA DE PROGRESSO E BOTÃO */}
        <div className="p-6 md:p-8 border-t bg-slate-50/80 flex flex-col md:flex-row items-center justicia-between gap-6">
          <div className="w-full md:max-w-md">
            {loading && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between text-[11px] font-black text-indigo-600 uppercase tracking-widest italic">
                  <span className="flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" />
                    {progress.msg}
                  </span>
                  <span>{progress.p}%</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner p-[2px]">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(79,70,229,0.4)]"
                    style={{ width: `${progress.p}%` }}
                  />
                </div>
              </div>
            )}
            {!loading && (
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                Pronto para exportar {products.length} produtos em alta
                definição.
              </p>
            )}
          </div>

          <Button
            onClick={handleGenerate}
            isLoading={loading}
            className="w-full md:w-auto px-12 py-7 bg-slate-900 hover:bg-black text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all hover:scale-105 active:scale-95"
          >
            {loading ? 'Processando Catálogo...' : 'Baixar Catálogo Premium'}
          </Button>
        </div>
      </div>
    </div>
  );
}
