'use client';

import React, { useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, MessageCircle, Share2, ImageIcon, RefreshCw } from 'lucide-react';
import { toast } from "sonner";

interface MarketingClientProps {
  initialData: any;
  userId: string;
  catalogSlug: string | null;
}

export default function MarketingClient({ initialData, userId, catalogSlug }: MarketingClientProps) {
  const [copied, setCopied] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const [shareBannerPreview, setShareBannerPreview] = useState<string | null>(
    initialData?.share_banner_url || null
  );
  const [shareUploading, setShareUploading] = useState(false);
  const [forcingRefresh, setForcingRefresh] = useState(false);
  
  // URL oficial do seu catálogo
  const fullUrl = `https://www.repvendas.com.br/catalogo/${catalogSlug || ''}`;

  // Estado da mensagem (já vem preenchida e é editável)
  const [message, setMessage] = useState(
      `Olá! Tudo bem? 👋\n\nEstou enviando o nosso catálogo virtual atualizado com as últimas novidades! 🚀 📚\n\nConfira aqui:\n${fullUrl}\n\n⚠️ *OBS:* Os preços estão bloqueados por segurança. Para visualizar os valores, basta me solicitar a **senha de acesso** por aqui mesmo. Qualquer dúvida, estou à disposição!`
  );

  const syncCatalogOg = async (imageUrlWithVersion: string) => {
    if (!userId || !catalogSlug) return;
    await fetch('/api/marketing-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrlWithVersion,
      }),
    });
    await fetch(`/api/revalidate?slug=${encodeURIComponent(catalogSlug)}`, {
      method: 'POST',
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success("Link copiado com sucesso!");
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handleUploadBanner = async (file: File) => {
    if (!file) return;
    setShareUploading(true);
    const localPreview = URL.createObjectURL(file);
    setShareBannerPreview(localPreview);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', userId || 'anon');
      fd.append('brandSlug', catalogSlug || 'catalogo');

      const uploadResp = await fetch('/api/upload/share-banner', {
        method: 'POST',
        body: fd,
      });
      const uploadJson = await uploadResp.json().catch(() => ({}));
      if (!uploadResp.ok || !uploadJson?.publicUrl) {
        throw new Error(uploadJson?.error || 'Falha ao enviar banner');
      }

      const cleanUrl = String(uploadJson.publicUrl).split('?')[0];
      const versionedImageUrl = `${cleanUrl}?v=${Date.now()}`;
      const syncResp = await fetch('/api/marketing-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: cleanUrl }),
      });
      if (!syncResp.ok) {
        const syncJson = await syncResp.json().catch(() => ({}));
        throw new Error(syncJson?.error || 'Falha ao sincronizar banner');
      }

      setShareBannerPreview(versionedImageUrl);
      await syncCatalogOg(versionedImageUrl);
      toast.success('Banner de compartilhamento atualizado!');
    } catch (err: any) {
      setShareBannerPreview(initialData?.share_banner_url || null);
      toast.error(err?.message || 'Erro ao atualizar banner');
    } finally {
      URL.revokeObjectURL(localPreview);
      setShareUploading(false);
    }
  };

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    void handleUploadBanner(f);
    e.currentTarget.value = '';
  };

  const handleForceRefresh = async () => {
    if (!catalogSlug) {
      toast.error('Slug do catálogo não encontrado para forçar atualização.');
      return;
    }
    setForcingRefresh(true);
    try {
      const currentBanner = String(shareBannerPreview || '').split('?')[0];
      if (currentBanner && !currentBanner.startsWith('blob:')) {
        await syncCatalogOg(`${currentBanner}?v=${Date.now()}`);
      }

      toast.success('Atualização forçada aplicada. O link oficial do catálogo foi mantido.');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao forçar atualização.');
    } finally {
      setForcingRefresh(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      
      <div className="space-y-8">
        {/* CARD VERDE - COMPARTILHAMENTO RÁPIDO */}
        <Card
          className="!text-white border-none shadow-2xl rounded-[2rem] overflow-hidden"
          style={{ backgroundColor: '#10b981', color: '#ffffff' }}
        >
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-black uppercase tracking-tight text-sm text-white">Compartilhamento Rápido</h2>
                <p className="text-[10px] opacity-80 font-bold uppercase text-white">Mensagem (Editável)</p>
              </div>
            </div>

            {/* Área da Mensagem - Onde o texto verde é editado */}
            <Textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-[#059669] dark:!bg-[#059669] !text-white dark:!text-white border-none placeholder:text-white/50 min-h-[280px] resize-none focus-visible:ring-1 focus-visible:ring-white/30 rounded-xl leading-relaxed text-sm shadow-inner"
              style={{ backgroundColor: '#059669', color: '#ffffff' }}
            />

            <div className="space-y-4">
              <h3 className="text-2xl font-black leading-none text-white">Envie seu catálogo pelo WhatsApp</h3>
              <p className="text-xs opacity-90 font-medium text-white">Use o link direto para converter mais vendas.</p>
            </div>

            {/* Botões de Ação Principais */}
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={openWhatsApp}
                className="bg-white text-[#10b981] hover:bg-slate-100 font-bold py-6 rounded-xl gap-2 border-none"
              >
                <MessageCircle className="w-5 h-5" />
                ABRIR WHATS
              </Button>
              <Button 
                onClick={copyLink}
                className="bg-[#047857] text-white hover:bg-[#065f46] font-bold py-6 rounded-xl gap-2 border border-white/10"
              >
                {copied ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Copy className="w-5 h-5" />}
                {copied ? "COPIADO!" : "COPIAR LINK"}
              </Button>
            </div>

            {/* Rodapé do card com o link atual */}
            <div className="bg-[#065f46]/50 p-3 rounded-lg truncate text-[10px] font-mono opacity-80 text-center border border-white/5">
              {fullUrl}
            </div>
          </CardContent>
        </Card>

        {/* Banner Informativo (Abaixo do card de compartilhamento rápido) */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Banner de Compartilhamento</div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => bannerInputRef.current?.click()}
                disabled={shareUploading}
              >
                {shareUploading ? 'Trocando...' : 'Trocar imagem'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleForceRefresh}
                disabled={forcingRefresh || shareUploading}
              >
                {forcingRefresh ? 'Forçando...' : 'Forçar atualização'}
              </Button>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-700 aspect-[1.91/1] relative group">
             {shareBannerPreview ? (
               <img src={shareBannerPreview} className="w-full h-full object-cover" alt="Banner" />
             ) : (
               <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                 <ImageIcon className="opacity-20" size={48} />
                 <span className="text-xs">Nenhum banner configurado</span>
               </div>
             )}
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBannerFileChange}
          />
          {shareUploading && (
            <div className="mt-3 text-xs text-primary font-bold animate-pulse">
              Enviando e sincronizando banner...
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-4 italic text-center">
            Ideal: 1200x630px | Formatos: JPG, PNG, WebP
          </p>
        </div>
      </div>

      {/* LADO DIREITO - PREVIEW E BANNER */}
      <div className="space-y-8">
        
        {/* Preview estilo WhatsApp */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
            <Share2 className="w-4 h-4" /> Preview no WhatsApp
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 max-w-[380px]">
             <div className="aspect-video bg-slate-100 relative overflow-hidden">
                {shareBannerPreview ? (
                  <img src={shareBannerPreview} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-300"><ImageIcon size={40} /></div>
                )}
             </div>
             <div className="p-4 border-l-4 border-[#10b981] bg-slate-50 dark:bg-slate-800/50">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">REPVENDAS.COM.BR</p>
                <h4 className="font-bold text-sm text-slate-800 dark:text-white mt-1">Meu Catálogo</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed whitespace-pre-line max-h-32 overflow-auto">
                  {message}
                </p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}