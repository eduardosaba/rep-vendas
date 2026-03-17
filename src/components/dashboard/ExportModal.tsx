'use client';

import React, { useState, useEffect, useCallback } from 'react';
// ADICIONADO FileText no import abaixo
import { X, Download, Eye, Loader2, FileText, Palette, Type, QrCode, User, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateCatalogPDF } from '@/utils/generateCatalogPDF';
import { toast } from 'sonner';

export function ExportModal({ isOpen, onClose, products = [], storeSettings, brandMapping }: any) {
  const [loading, setLoading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [progress, setProgress] = useState({ p: 0, msg: '' });
  const [previewTab, setPreviewTab] = useState<'cover' | 'page'>('cover');
  const [livePreview, setLivePreview] = useState<{cover: string|null, page: string|null}>({ cover: null, page: null });

  // Fallback para logo do sistema
  const SYSTEM_LOGO_DEFAULT = "https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/logos/logos/repvendas.svg"; 

  const [options, setOptions] = useState({
    title: 'Catálogo de Produtos 2026',
    itemsPerRow: 2 as 1 | 2 | 3,
    variantLayout: 'grid' as 'grouped' | 'grid',
    showPrices: true,
    priceType: 'sale_price' as 'price' | 'sale_price',
    showQR: true,
    logoPosition: 'center' as 'top' | 'center',
    primaryColor: '#b9722e',
    secondaryColor: '#0d1b2c',
    repName: '',
    repPhone: '',
  });

  // Limpa recursos ao fechar
  useEffect(() => {
    return () => { if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl); };
  }, [pdfBlobUrl]);

  // Sincroniza dados da loja
  useEffect(() => {
    if (isOpen && storeSettings) {
      setOptions(prev => ({
        ...prev,
        primaryColor: storeSettings.primary_color || prev.primaryColor,
        secondaryColor: storeSettings.secondary_color || prev.secondaryColor,
        repName: storeSettings.rep_name || '',
        repPhone: storeSettings.rep_phone || '',
        title: storeSettings.name ? `Catálogo ${storeSettings.name}` : prev.title
      }));
    }
  }, [storeSettings, isOpen]);

  const generateLivePreview = useCallback(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 300; canvas.height = 420;

    // Simulação da Capa
    ctx.fillStyle = options.secondaryColor;
    ctx.fillRect(0, 0, 300, 420);
    ctx.fillStyle = options.primaryColor;
    ctx.fillRect(0, 0, 15, 420);
    ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.font = 'bold 16px Arial';
    ctx.fillText(options.title.toUpperCase(), 157, options.logoPosition === 'center' ? 100 : 180);
    
    if (options.repName) {
      ctx.font = '10px Arial';
      ctx.fillText(options.repName.toUpperCase(), 157, 380);
      ctx.fillText(options.repPhone, 157, 395);
    }
    const coverData = canvas.toDataURL();

    // Simulação da Página
    ctx.fillStyle = options.primaryColor;
    ctx.fillRect(0, 0, 300, 420);
    ctx.fillStyle = 'white';
    const cols = options.variantLayout === 'grid' ? options.itemsPerRow : 2;
    for(let i=0; i<cols; i++) {
        for(let j=0; j<3; j++) {
            ctx.roundRect(25 + i*(240/cols + 5), 50 + j*100, 240/cols, 85, 4);
            ctx.fill();
        }
    }
    const pageData = canvas.toDataURL();

    setLivePreview({ cover: coverData, page: pageData });
  }, [options]);

  useEffect(() => { if (isOpen) generateLivePreview(); }, [generateLivePreview, isOpen]);

  const handleAction = async (type: 'save' | 'blob') => {
    if (!products || products.length === 0) {
      toast.error("Nenhum produto selecionado na tabela.");
      return;
    }
    setLoading(true);
    try {
      const result = await generateCatalogPDF(products, {
        ...options,
        baseUrl: window.location.origin,
        catalogSlug: storeSettings?.catalog_slug || 'catalogo',
        storeLogo: storeSettings?.logo_url || SYSTEM_LOGO_DEFAULT,
        brandMapping,
        onProgress: (p: number, msg: string) => setProgress({ p, msg }),
      }, type);

      if (type === 'blob') {
        setPdfBlobUrl(URL.createObjectURL(result as Blob));
        toast.success('Visualização pronta!');
      } else {
        toast.success('Download iniciado!');
        onClose();
      }
    } catch (e) { toast.error('Erro ao gerar catálogo.'); }
    finally { setLoading(false); }
  };

  const handleDownloadFinal = async () => {
    if (!pdfBlobUrl) return;
    setLoading(true);
    try {
      const resp = await fetch(pdfBlobUrl);
      const blob = await resp.blob();
      const filename = `${options.title.replace(/\s+/g, '_')}.pdf`;
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      toast.success('Download iniciado!');
      onClose();
    } catch (e) {
      toast.error('Erro ao baixar PDF');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white w-full max-w-6xl h-[92vh] rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter text-slate-800">
            <FileText className="text-indigo-600" /> CATÁLOGO PREMIUM
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="w-full md:w-[380px] p-6 border-r overflow-y-auto space-y-5 bg-white">
            
            <section className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-2"><Type size={14}/> Título da Capa</label>
              <input type="text" value={options.title} onChange={e => setOptions({...options, title: e.target.value})} className="w-full p-2.5 rounded-xl border-none ring-1 ring-slate-200 font-bold focus:ring-2 focus:ring-indigo-500" />
            </section>

            <div className="grid grid-cols-2 gap-3">
              <section className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Variantes</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button disabled title="Modo agrupado temporariamente desativado" className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all opacity-50 cursor-not-allowed`}>AGRUPAR</button>
                  <button onClick={() => setOptions({...options, variantLayout: 'grid'})} className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${options.variantLayout === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>SEPARAR</button>
                </div>
              </section>

              {options.variantLayout === 'grid' && (
                <section className="space-y-2 animate-in fade-in">
                  <label className="text-[10px] font-black uppercase text-slate-400">Grade</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    {[1, 2, 3].map(n => (
                      <button key={n} onClick={() => setOptions({...options, itemsPerRow: n as any})} className={`flex-1 py-2 rounded-lg text-[9px] font-black ${options.itemsPerRow === n ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>
                        {n === 1 ? '1x' : n === 2 ? '2x4' : '3x5'}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <section className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Palette size={14}/> Cores do Catálogo</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-gray-400">PÁGINAS</span>
                  <input type="color" value={options.primaryColor} onChange={e => setOptions({...options, primaryColor: e.target.value})} className="w-full h-10 rounded-lg cursor-pointer bg-white p-1 ring-1 ring-slate-200" />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-gray-400">CAPA</span>
                  <input type="color" value={options.secondaryColor} onChange={e => setOptions({...options, secondaryColor: e.target.value})} className="w-full h-10 rounded-lg cursor-pointer bg-white p-1 ring-1 ring-slate-200" />
                </div>
              </div>
            </section>

            <section className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><User size={14}/> Dados do Representante</label>
              <input type="text" placeholder="Nome" value={options.repName} onChange={e => setOptions({...options, repName: e.target.value})} className="w-full p-2 text-xs rounded-lg border-slate-200" />
              <input type="text" placeholder="Telefone" value={options.repPhone} onChange={e => setOptions({...options, repPhone: e.target.value})} className="w-full p-2 text-xs rounded-lg border-slate-200" />
            </section>

            <section className="space-y-3">
               <div className="flex gap-2">
                 <button onClick={() => setOptions({...options, showPrices: !options.showPrices})} className={`flex-1 p-3 rounded-xl border-2 text-[9px] font-black flex items-center justify-center gap-2 transition-all ${options.showPrices ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}>
                   <DollarSign size={14}/> PREÇOS
                 </button>
                 <button onClick={() => setOptions({...options, showQR: !options.showQR})} className={`flex-1 p-3 rounded-xl border-2 text-[9px] font-black flex items-center justify-center gap-2 transition-all ${options.showQR ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}>
                   <QrCode size={14}/> QR CODE
                 </button>
               </div>
               
               {options.showPrices && (
                 <div className="flex bg-slate-100 p-1 rounded-xl animate-in slide-in-from-top-1">
                    <button onClick={() => setOptions({...options, priceType: 'price'})} className={`flex-1 py-2 rounded-lg text-[9px] font-black ${options.priceType === 'price' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>CUSTO</button>
                    <button onClick={() => setOptions({...options, priceType: 'sale_price'})} className={`flex-1 py-2 rounded-lg text-[9px] font-black ${options.priceType === 'sale_price' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>SUGERIDO</button>
                 </div>
               )}
            </section>

            <section className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Logo Capa</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setOptions({...options, logoPosition: 'top'})} className={`flex-1 py-2 rounded-lg text-[8px] font-black ${options.logoPosition === 'top' ? 'bg-white shadow text-indigo-600' : ''}`}>TOPO</button>
                <button onClick={() => setOptions({...options, logoPosition: 'center'})} className={`flex-1 py-2 rounded-lg text-[8px] font-black ${options.logoPosition === 'center' ? 'bg-white shadow text-indigo-600' : ''}`}>MEIO</button>
              </div>
            </section>

            <Button onClick={() => handleAction('blob')} isLoading={loading} className="w-full py-7 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-lg shadow-indigo-100">
              Gerar Preview Real
            </Button>
          </div>

          <div className="flex-1 bg-slate-200/50 relative flex flex-col items-center justify-center p-8 gap-4">
             <div className="flex bg-white p-1 rounded-full shadow-sm">
                <button onClick={() => setPreviewTab('cover')} className={`px-6 py-1 rounded-full text-[10px] font-bold ${previewTab === 'cover' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>CAPA</button>
                <button onClick={() => setPreviewTab('page')} className={`px-6 py-1 rounded-full text-[10px] font-bold ${previewTab === 'page' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>PÁGINAS</button>
            </div>
            <div className={`w-full max-w-[360px] bg-white shadow-2xl rounded-xl overflow-hidden relative border-4 border-white ${previewOpen ? 'h-[50vh] md:h-auto' : 'h-24 md:h-auto'} md:aspect-[1/1.41]`}>
              <button onClick={() => setPreviewOpen(v => !v)} className="absolute right-3 top-3 z-20 bg-white/80 dark:bg-slate-900/80 p-1 rounded-full border shadow-sm">
                {previewOpen ? <X size={14} /> : <Eye size={14} />}
              </button>
              {pdfBlobUrl ? (
                <iframe src={pdfBlobUrl} className="w-full h-full border-none" key={pdfBlobUrl} style={{ pointerEvents: previewOpen ? 'auto' : 'none' }} />
              ) : (
                (previewTab === 'cover' ? livePreview.cover : livePreview.page) ? (
                  <img src={(previewTab === 'cover' ? livePreview.cover : livePreview.page) || ''} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                    <Loader2 className="animate-spin" />
                    <span className="text-[10px] font-bold uppercase">Carregando...</span>
                  </div>
                )
              )}
              {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                  <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
                  <span className="text-[10px] font-black text-indigo-600 uppercase italic">{progress.msg}</span>
                  <span className="text-[10px] font-bold text-slate-400">{progress.p}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 border-t bg-white flex justify-end gap-3 px-10">
          <Button variant="outline" onClick={onClose} className="px-8 rounded-xl font-bold uppercase text-xs">Sair</Button>
          <Button onClick={handleDownloadFinal} disabled={!pdfBlobUrl || loading} className="px-12 py-6 rounded-xl bg-slate-900 text-white font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95">
            Baixar PDF Final
          </Button>
        </div>
      </div>
    </div>
  );
}