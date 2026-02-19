'use client';

import React, { useState } from 'react';
import {
  Share2,
  Link as LinkIcon,
  Loader2,
  Info,
  RefreshCw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import WhatsAppLinkGenerator from '@/components/dashboard/WhatsAppLinkGenerator';
import SmartImageUpload from '@/components/ui/SmartImageUpload';
import SharePreview from '@/components/SharePreview';
import MyShortLinksTable from '@/components/dashboard/MyShortLinksTable';
import AnalyticsChartClient from '@/components/dashboard/AnalyticsChartClient';
import { Button } from '@/components/ui/Button';

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
  const [syncingBanner, setSyncingBanner] = useState(false);
  const [shareBannerPreview, setShareBannerPreview] = useState<string | null>(
    initialData?.share_banner_url || null
  );
  const defaultSlug = catalogSlug || formData?.slug || initialData?.slug || '';
  const defaultCatalogUrl = `https://www.repvendas.com.br/catalogo/${defaultSlug}`;

  // Recarrega banner do banco ao montar o componente
  React.useEffect(() => {
    const loadBanner = async () => {
      if (!userId) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('share_banner_url')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.share_banner_url) {
        let fullUrl = profile.share_banner_url;

        // Se não for URL completa, busca a URL pública
        if (!fullUrl.startsWith('http')) {
          const { data: pub } = supabase.storage
            .from('product-images')
            .getPublicUrl(fullUrl.replace(/^\/+/, ''));

          if (pub?.publicUrl) {
            fullUrl = `${pub.publicUrl}?v=${Date.now()}`;
          }
        }

        setShareBannerPreview(fullUrl);
      }
    };

    loadBanner();
  }, [userId, supabase]);

  const [shareMessage, setShareMessage] = useState<string>(() => {
    const name = formData?.name || initialData?.name || 'Meu Catálogo';
    return [
      'Olá! Tudo bem? 👋',
      '',
      'Estou enviando o nosso catálogo virtual atualizado com as últimas novidades! 🚀',
      '',
      `📲 Confira aqui: ${defaultCatalogUrl}`,
      '',
      '⚠️ *OBS:* Os preços estão bloqueados por segurança. Para visualizar os valores, basta me solicitar a **senha de acesso** por aqui mesmo.',
      '',
      'Qualquer dúvida, estou à disposição!'
    ].join('\n');
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

      // 2. Obter URL Pública com cache-busting para forçar atualização no WhatsApp
      const pub = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
      const baseUrl = pub?.data?.publicUrl;
      const publicUrl = `${baseUrl}?v=${Date.now()}`;

      // 3. Chamada única para a API de sincronização (Profiles, Marketing, Public Catalogs)
      try {
        const resp = await fetch('/api/marketing-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: baseUrl, use_short_link: false }),
        });

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body?.error || 'sync_failed');
        }
      } catch (e) {
        console.warn('Failed to sync banner via API:', e);
        toast.error('Banner enviado, mas falha ao sincronizar no servidor.');
        setShareUploading(false);
        return;
      }

      // 4. append-banner está temporariamente desativado — não chamar o
      // endpoint do cliente até decidirmos sobre a remoção/integração.

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

  const handleForceSyncBanner = async () => {
    if (!userId || !catalogSlug || !shareBannerPreview) {
      toast.error('Dados insuficientes para sincronizar');
      return;
    }

    setSyncingBanner(true);
    try {
      // Força sincronização com cache-busting atualizado
      const publicUrl = `${shareBannerPreview.split('?')[0]}?v=${Date.now()}`;

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
        throw new Error(`Sincronização falhou: ${msg}`);
      }

      // Atualiza preview com novo cache-busting
      setShareBannerPreview(publicUrl);
      toast.success('✅ Banner sincronizado! Cache atualizado para WhatsApp.');
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      toast.error(err instanceof Error ? err.message : 'Falha ao sincronizar');
    } finally {
      setSyncingBanner(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* SEÇÃO 1: ESTRATÉGIA DIGITAL */}
      <div className="bg-white dark:bg-slate-900 p-4 md:p-6 lg:p-10 rounded-2xl md:rounded-[2.5rem] border border-gray-200 dark:border-slate-800 shadow-sm">
        <h3 className="font-black text-xs md:text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-6 md:mb-8">
          <Share2 size={16} className="md:w-[18px] md:h-[18px]" /> Estratégia
          Digital
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
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
              <p className="text-xs text-slate-500 mb-3">
                Ideal: 1200x630px | Máximo: 5MB | Formatos: JPG, PNG, WebP
              </p>
              <SmartImageUpload
                onUploadReady={onUploadReady}
                defaultValue={shareBannerPreview}
              />
              {shareUploading && (
                <div className="flex items-center gap-2 text-sm text-primary mt-3 font-bold animate-pulse">
                  <Loader2 className="animate-spin" size={16} />
                  Otimizando e sincronizando...
                </div>
              )}

              {/* Botão de Sincronização Forçada */}
              {shareBannerPreview && catalogSlug && !shareUploading && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    onClick={handleForceSyncBanner}
                    disabled={syncingBanner}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    leftIcon={
                      syncingBanner ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <RefreshCw size={14} />
                      )
                    }
                  >
                    {syncingBanner
                      ? 'Sincronizando...'
                      : 'Forçar Sincronização (Atualizar Cache WhatsApp)'}
                  </Button>
                  <p className="text-[10px] text-slate-400 mt-2 text-center">
                    Use isso se a imagem não aparecer no WhatsApp após trocar o
                    banner
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-8">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 md:ml-4">
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
            <p className="text-[10px] text-slate-400 text-center px-4 md:px-6">
              💡 O WhatsApp pode levar alguns minutos para atualizar a imagem de
              cache após a troca. Para forçar atualização, use um link encurtado
              novo.
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: PERFORMANCE */}
      <div className="bg-white dark:bg-slate-900 p-4 md:p-6 lg:p-10 rounded-2xl md:rounded-[2.5rem] border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <h3 className="font-black text-xs md:text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-6 md:mb-8">
          <LinkIcon size={16} className="md:w-[18px] md:h-[18px]" /> Meus Links
          Curtos e Performance
        </h3>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="min-w-full inline-block align-middle">
            <MyShortLinksTable refreshSignal={shortLinksRefresh} />
          </div>
        </div>

        <div className="mt-8 md:mt-12 pt-8 md:pt-12 border-t border-slate-100 dark:border-slate-800">
          <h4 className="font-black text-xs md:text-sm text-slate-900 dark:text-white mb-4 md:mb-6 uppercase tracking-widest">
            Gráfico de Engajamento
          </h4>
          <AnalyticsChartClient />
        </div>
      </div>
    </div>
  );
}
