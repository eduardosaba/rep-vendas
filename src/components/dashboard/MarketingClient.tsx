'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Share2, Upload, Loader2, MessageCircle } from 'lucide-react';
import SharePreview from '@/components/SharePreview';

type Props = {
  initialData: any;
  userId: string;
};

export default function MarketingClient({ initialData, userId }: Props) {
  const [bannerUrl, setBannerUrl] = useState<string | null>(
    initialData?.share_banner_url || null
  );
  const [isUploading, setIsUploading] = useState(false);

  const catalogUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://repvendas.com.br'}/catalogo/${initialData?.slug}`;

  const handleCopyLink = async () => {
    const message = `Olá! 🚀\n\nConfira as novidades do meu catálogo virtual da *${initialData?.main_brand || initialData?.name || 'nossa loja'}*.\n\nVeja os produtos aqui:\n${catalogUrl}\n\n*Aguardamos seu pedido!*`;
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Link e mensagem copiados!');
    } catch (err) {
      toast.error('Erro ao copiar link.');
    }
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(
      `Olá! 👋%0A%0AConfira as novidades do meu catálogo virtual: ${catalogUrl}`
    );
    // wa.me with text param
    const url = `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUrl(URL.createObjectURL(file));
    setIsUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('userId', String(userId));
    try {
      const res = await fetch('/api/upload/share-banner', {
        method: 'POST',
        body: form,
      });
      const json = await res.json();
      if (json?.publicUrl || json?.url) {
        const publicUrl = json.publicUrl || json.url;
        setBannerUrl(publicUrl);
        toast.success('Banner atualizado com sucesso!');
      } else {
        toast.error('Upload falhou.');
      }
    } catch (err) {
      toast.error('Falha no upload do banner.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="space-y-8 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Upload size={18} />
            </div>
            <h2 className="font-black uppercase text-xs tracking-widest text-slate-500">
              Banner de Divulgação
            </h2>
          </div>

          <div className="group relative w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center transition-all hover:border-indigo-400 overflow-hidden">
            {bannerUrl ? (
              <img
                src={bannerUrl}
                className="w-full h-full object-cover opacity-80"
              />
            ) : (
              <p className="text-xs font-bold text-slate-400">
                Arraste ou clique para subir o banner
              </p>
            )}
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              accept="image/*"
            />
            <div className="absolute bottom-4 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-lg text-xs font-bold flex gap-2 items-center">
              {isUploading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Share2 size={14} />
              )}
              {isUploading ? 'Subindo...' : 'Trocar Imagem'}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            Recomendado: 1200x630px (WebP ou JPG). Mantenha abaixo de 300KB para
            melhores resultados.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <MessageCircle size={18} />
            </div>
            <h2 className="font-black uppercase text-xs tracking-widest text-slate-500">
              Link de Compartilhamento
            </h2>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 font-mono text-xs truncate text-slate-500">
              {catalogUrl}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <Copy size={14} /> Copiar
              </button>
              <button
                onClick={handleOpenWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <Share2 size={14} /> Enviar
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="sticky top-8">
        <SharePreview
          title={initialData?.name || 'Catálogo Virtual'}
          description={
            initialData?.footer_message ||
            'Confira nossas novidades e faça seu pedido online.'
          }
          imageUrl={
            bannerUrl || (initialData?.share_banner_url ?? '/link.webp')
          }
          domain={new URL(catalogUrl).host}
        />
      </div>
    </div>
  );
}
