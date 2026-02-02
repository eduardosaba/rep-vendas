'use client';

import React, { useState } from 'react';
import { Share2, Link as LinkIcon, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import WhatsAppLinkGenerator from '@/components/dashboard/WhatsAppLinkGenerator';
import SmartImageUpload from '@/components/ui/SmartImageUpload';
import SharePreview from '@/components/SharePreview';
import MyShortLinksTable from '@/components/dashboard/MyShortLinksTable';
import AnalyticsChartClient from '@/components/dashboard/AnalyticsChartClient';

interface MarketingClientProps {
  initialData: any | null;
  userId: string | null;
  catalogSlug?: string | null;
}

export default function MarketingClient({
  initialData,
  userId,
  catalogSlug,
}: MarketingClientProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState<any>(initialData || {});
  const [shareUploading, setShareUploading] = useState(false);
  const [shareBannerPreview, setShareBannerPreview] = useState<string | null>(
    initialData?.share_banner_url || null
  );
  const defaultSlug = catalogSlug || formData?.slug || initialData?.slug || '';
  const defaultCatalogUrl = `https://www.repvendas.com.br/catalogo/${defaultSlug}`;

  const [shareMessage, setShareMessage] = useState<string>(() => {
    const name = formData?.name || initialData?.name || 'Meu Catálogo';
    return `Olá! Tudo bem? 👋\n\nEstou enviando o nosso catálogo atualizado da *${name}*.\n\nConfira as novidades aqui: ${defaultCatalogUrl}\n\nQualquer dúvida, estou à disposição!`;
  });

  const [shareHref, setShareHref] = useState<string>(() => defaultCatalogUrl);
  const [shortLinksRefresh, setShortLinksRefresh] = useState<number>(0);

  const handleUploadBanner = async (file: File) => {
    if (!userId) {
      toast.error('Usuário não autenticado');
      return;
    }
    setShareUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/marketing/share-banner-${Date.now()}.${fileExt}`;

      // 1. Upload para o Storage
      const uploadResult = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { upsert: true });

      if (uploadResult.error) throw uploadResult.error;

      // 2. Obter URL Pública
      const pub = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
      const publicUrl = pub?.data?.publicUrl;

      // 3. Atualizar o Perfil no Banco de Dados
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ share_banner_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 4. Se houver um catalogSlug, sincronizar também em public_catalogs
      try {
        if (catalogSlug) {
          // append to banners array (prefer desktop banners) to make it visible
          try {
            const resp2 = await fetch('/api/public_catalogs/append-banner', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug: catalogSlug, publicUrl }),
            });
            if (!resp2.ok) {
              const b = await resp2.json().catch(() => ({}));
              toast.error(
                `Não foi possível anexar banner ao catálogo: ${b?.error || b?.message || 'erro'}`
              );
            }
          } catch (e) {
            console.warn('append-banner failed', e);
          }

          // also update share_banner_url via sync so previews use it
          const resp = await fetch('/api/public_catalogs/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              slug: catalogSlug,
              share_banner_url: publicUrl,
            }),
          });

          if (!resp.ok) {
            const body = await resp.json().catch(() => ({}));
            const msg = body?.error || body?.message || 'Erro desconhecido';
            toast.error(`Sincronização pública falhou: ${msg}`);
          } else {
            toast.success('Banner sincronizado no catálogo público');
          }
        }
      } catch (syncErr) {
        console.warn('Falha ao sincronizar public_catalogs:', syncErr);
        toast.error('Falha ao sincronizar banner no catálogo público');
      }

      setShareBannerPreview(publicUrl);
      toast.success('Banner de compartilhamento atualizado!');
    } catch (err: unknown) {
      let message = 'Falha ao enviar imagem.';
      try {
        if (err instanceof Error) message = err.message;
        else if (typeof err === 'object') message = JSON.stringify(err);
        else message = String(err);
      } catch {
        message = String(err);
      }
      console.error('Erro no upload:', err);
      toast.error(message);
    } finally {
      setShareUploading(false);
    }
  };

  const onUploadReady = (f: File | Blob) => {
    void handleUploadBanner(f as File);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* SEÇÃO 1: ESTRATÉGIA DIGITAL */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] border border-gray-200 dark:border-slate-800 shadow-sm">
        <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-8">
          <Share2 size={18} /> Estratégia Digital
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-8">
            <WhatsAppLinkGenerator
              catalogUrl={defaultCatalogUrl}
              catalogName={formData.name}
              imageUrl={shareBannerPreview || '/link.webp'}
              message={shareMessage}
              onMessageChange={(m: string) => setShareMessage(m)}
              onCreated={(shortUrl?: string) => {
                setShortLinksRefresh((s) => s + 1);
                if (shortUrl) {
                  // update preview href and message to use the short url
                  setShareHref(shortUrl);
                  setShareMessage((prev) =>
                    prev.replace(
                      `https://www.repvendas.com.br/catalogo/${formData.slug || initialData?.slug || ''}`,
                      shortUrl
                    )
                  );
                }
              }}
            />

            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-xs font-black uppercase text-slate-400 mb-4">
                Banner de Compartilhamento (WhatsApp/Social)
              </p>
              <SmartImageUpload
                onUploadReady={handleUploadBanner}
                defaultValue={shareBannerPreview}
              />
              {shareUploading && (
                <div className="flex items-center gap-2 text-sm text-primary mt-3 font-bold animate-pulse">
                  <Loader2 className="animate-spin" size={16} />
                  Sincronizando banner...
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-8">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">
              Preview no WhatsApp
            </label>
            <SharePreview
              title={formData.name || 'Meu Catálogo'}
              description={`Confira as novidades da ${formData.name || 'nossa loja'}`}
              imageUrl={shareBannerPreview || '/link.webp'}
              domain="repvendas.com.br"
              href={shareHref}
              message={shareMessage}
            />
            <p className="text-[10px] text-slate-400 text-center px-6">
              * O WhatsApp pode levar alguns minutos para atualizar a imagem de
              cache após a troca.
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: PERFORMANCE */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-8">
          <LinkIcon size={18} /> Meus Links Curtos e Performance
        </h3>
        <MyShortLinksTable refreshSignal={shortLinksRefresh} />

        <div className="mt-12 pt-12 border-t border-slate-100 dark:border-slate-800">
          <h4 className="font-black text-sm text-slate-900 dark:text-white mb-6 uppercase tracking-widest">
            Gráfico de Engajamento
          </h4>
          <AnalyticsChartClient />
        </div>
      </div>
    </div>
  );
}
