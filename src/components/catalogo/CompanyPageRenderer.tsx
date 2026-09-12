'use client';

import React, { useState } from 'react';
import type { CompanyPageContent, CompanyPageBlock } from '@/lib/company-page-content';
import type { ResolvedDynamicData, ResolvedProduct, ResolvedBrand } from '@/lib/company-page-dynamic-data';
import {
  sanitizeUrl,
  resolveVideoEmbedUrl,
  normalizeWhatsApp,
  normalizeInstagram,
} from '@/lib/company-page-content';
import {
  ChevronDown,
  ChevronUp,
  Star,
  Phone,
  MessageCircle,
  Mail,
  Instagram,
  MapPin,
  Package,
  Award,
  Sparkles,
  Flame,
} from 'lucide-react';

export interface CompanyDetailsContext {
  name?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  instagram?: string;
  address?: string;
}

interface CompanyPageRendererProps {
  content: CompanyPageContent;
  preview?: boolean;
  companyContext?: CompanyDetailsContext;
  resolvedDynamicData?: ResolvedDynamicData;
  isLoadingDynamicData?: boolean;
  className?: string;
}

export function CompanyPageRenderer({
  content,
  preview = false,
  companyContext,
  resolvedDynamicData,
  isLoadingDynamicData = false,
  className = '',
}: CompanyPageRendererProps) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const {
    heroImage,
    heroTitle,
    heroSubtitle,
    heroCtaText,
    heroCtaUrl,
    heroAlign = 'center',
    heroOverlayOpacity = 40,
    heroHeight = 360,
    heroImagePosition = 'center',
    blocks = [],
  } = content;

  const safeHeroImage = sanitizeUrl(heroImage);
  const safeHeroCtaUrl = sanitizeUrl(heroCtaUrl);

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'left') return 'text-left items-start';
    if (align === 'right') return 'text-right items-end';
    return 'text-center items-center';
  };

  const getImageObjectFitClass = (fit?: 'contain' | 'cover') => {
    return fit === 'contain' ? 'object-contain' : 'object-cover';
  };

  const getHeroObjectPositionClass = (pos?: 'center' | 'top' | 'bottom') => {
    if (pos === 'top') return 'object-top';
    if (pos === 'bottom') return 'object-bottom';
    return 'object-center';
  };

  const renderHeroSection = () => {
    if (!safeHeroImage && !preview) return null;
    if (!safeHeroImage && preview) {
      return (
        <div className="mb-8 overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-400">
          <p className="text-sm font-semibold">Capa da página (Hero) não configurada</p>
          <p className="text-xs">Adicione uma imagem de capa no painel de configurações.</p>
        </div>
      );
    }

    const overlayStyle = {
      backgroundColor: `rgba(15, 23, 42, ${(heroOverlayOpacity ?? 40) / 100})`,
    };

    return (
      <section
        className="relative mb-8 overflow-hidden rounded-2xl bg-slate-900 text-white shadow-md"
        style={{ minHeight: `${Math.max(180, heroHeight)}px` }}
      >
        {safeHeroImage && (
          <img
            src={safeHeroImage}
            alt={heroTitle || 'Capa'}
            className={`absolute inset-0 h-full w-full ${getHeroObjectPositionClass(
              heroImagePosition
            )} object-cover`}
          />
        )}
        <div className="absolute inset-0 transition-opacity" style={overlayStyle} />
        <div
          className={`relative z-10 flex min-h-[180px] flex-col justify-center p-6 md:p-12 ${getAlignClass(
            heroAlign
          )}`}
          style={{ minHeight: `${Math.max(180, heroHeight)}px` }}
        >
          {heroTitle && (
            <h1 className="max-w-3xl text-2xl font-black tracking-tight text-white drop-shadow-sm sm:text-4xl md:text-5xl">
              {heroTitle}
            </h1>
          )}
          {heroSubtitle && (
            <p className="mt-3 max-w-2xl text-sm font-medium text-slate-200 drop-shadow-sm sm:text-base md:text-lg">
              {heroSubtitle}
            </p>
          )}
          {heroCtaText && safeHeroCtaUrl && (
            <a
              href={safeHeroCtaUrl}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-500 hover:shadow-xl active:scale-95"
            >
              {heroCtaText}
            </a>
          )}
        </div>
      </section>
    );
  };

  const renderBlock = (block: CompanyPageBlock) => {
    switch (block.type) {
      case 'heading': {
        const text = block.data.text || (preview ? 'Título do Bloco' : '');
        if (!text && !preview) return null;
        const align = block.data.align || 'left';
        const level = block.data.level || 'h2';

        const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

        if (level === 'h1') {
          return (
            <h1 className={`my-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl ${alignClass}`}>
              {text}
            </h1>
          );
        }
        if (level === 'h3') {
          return (
            <h3 className={`my-3 text-lg font-extrabold tracking-tight text-slate-800 sm:text-xl ${alignClass}`}>
              {text}
            </h3>
          );
        }
        return (
          <h2 className={`my-4 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl ${alignClass}`}>
            {text}
          </h2>
        );
      }

      case 'text': {
        const text = block.data.text || (preview ? 'Digite seu texto aqui...' : '');
        if (!text && !preview) return null;
        const alignClass =
          block.data.textAlign === 'center'
            ? 'text-center'
            : block.data.textAlign === 'right'
            ? 'text-right'
            : block.data.textAlign === 'justify'
            ? 'text-justify'
            : 'text-left';

        return (
          <div
            className={`my-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 sm:text-base ${alignClass}`}
            style={{ fontSize: block.data.fontSize ? `${block.data.fontSize}px` : undefined }}
          >
            {text}
          </div>
        );
      }

      case 'image': {
        const url = sanitizeUrl(block.data.url);
        if (!url && !preview) return null;
        if (!url && preview) {
          return (
            <div className="my-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs font-semibold text-slate-400">
              Nenhuma imagem selecionada
            </div>
          );
        }

        const alignClass =
          block.data.align === 'left'
            ? 'text-left'
            : block.data.align === 'right'
            ? 'text-right'
            : 'text-center';

        return (
          <div className={`my-6 ${alignClass}`}>
            <img
              src={url}
              alt={block.data.alt || ''}
              className={`inline-block rounded-2xl shadow-sm ${getImageObjectFitClass(block.data.objectFit)}`}
              style={{
                width: block.data.widthPercent ? `${block.data.widthPercent}%` : '100%',
                maxHeight: block.data.maxHeight ? `${block.data.maxHeight}px` : '480px',
              }}
            />
          </div>
        );
      }

      case 'columns': {
        const left = block.data.leftText || (preview ? 'Coluna Esquerda' : '');
        const right = block.data.rightText || (preview ? 'Coluna Direita' : '');
        if (!left && !right && !preview) return null;

        return (
          <div className="my-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
              {left}
            </div>
            <div className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
              {right}
            </div>
          </div>
        );
      }

      case 'image_text': {
        const imageUrl = sanitizeUrl(block.data.imageUrl);
        const text = block.data.text || (preview ? 'Texto ao lado da imagem...' : '');
        const isRight = block.data.imagePosition === 'right';

        if (!imageUrl && !text && !preview) return null;

        const imageElement = imageUrl ? (
          <img
            src={imageUrl}
            alt={block.data.imageAlt || ''}
            className={`w-full rounded-2xl shadow-sm ${getImageObjectFitClass(block.data.objectFit)}`}
            style={{
              maxHeight: block.data.maxHeight ? `${block.data.maxHeight}px` : '480px',
            }}
          />
        ) : preview ? (
          <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs font-semibold text-slate-400">
            Sem Imagem
          </div>
        ) : null;

        const textElement = (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 sm:text-base">
            {text}
          </div>
        );

        return (
          <div className="my-8 grid grid-cols-1 items-center gap-6 md:grid-cols-2">
            {isRight ? (
              <>
                {textElement}
                {imageElement}
              </>
            ) : (
              <>
                {imageElement}
                {textElement}
              </>
            )}
          </div>
        );
      }

      case 'spacer': {
        const height = block.data.height || 32;
        const isLine = block.data.lineStyle === 'line';

        return (
          <div className="flex items-center" style={{ height: `${height}px` }}>
            {isLine ? <hr className="w-full border-t border-slate-200" /> : null}
          </div>
        );
      }

      case 'banner': {
        const imageUrl = sanitizeUrl(block.data.imageUrl);
        const title = block.data.title || (preview ? 'Título do Banner' : '');
        const subtitle = block.data.subtitle || (preview ? 'Subtítulo informativo' : '');
        const ctaText = block.data.ctaText;
        const ctaUrl = sanitizeUrl(block.data.ctaUrl);

        if (!title && !subtitle && !imageUrl && !preview) return null;

        return (
          <div
            className="relative my-8 overflow-hidden rounded-2xl bg-slate-900 p-6 text-white shadow-md sm:p-8"
            style={{ minHeight: `${block.data.maxHeight || 320}px` }}
          >
            {imageUrl && (
              <img
                src={imageUrl}
                alt={title || 'Banner'}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-slate-950/60" />
            <div className="relative z-10 flex h-full min-h-[220px] max-w-xl flex-col justify-center">
              {title && <h3 className="text-xl font-bold text-white sm:text-2xl md:text-3xl">{title}</h3>}
              {subtitle && <p className="mt-2 text-sm text-slate-200 sm:text-base">{subtitle}</p>}
              {ctaText && ctaUrl && (
                <a
                  href={ctaUrl}
                  className="mt-5 inline-flex w-fit items-center justify-center rounded-xl bg-white px-5 py-2.5 text-xs font-black text-slate-900 shadow transition-all hover:bg-slate-100"
                >
                  {ctaText}
                </a>
              )}
            </div>
          </div>
        );
      }

      case 'gallery': {
        const images = block.data.galleryImages || [];
        if (!images.length && !preview) return null;

        if (!images.length && preview) {
          return (
            <div className="my-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs font-semibold text-slate-400">
              Galeria vazia. Adicione fotos no painel.
            </div>
          );
        }

        const cols = block.data.galleryColumns || 3;
        const gridColsClass =
          cols === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : cols === 4
            ? 'grid-cols-2 sm:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-3';

        return (
          <div className={`my-8 grid gap-4 ${gridColsClass}`}>
            {images.map((img, i) => {
              const url = sanitizeUrl(img.url);
              if (!url) return null;
              return (
                <div key={i} className="overflow-hidden rounded-xl bg-slate-100 shadow-sm">
                  <img
                    src={url}
                    alt={img.alt || `Galeria ${i + 1}`}
                    className={`w-full ${getImageObjectFitClass(block.data.objectFit)}`}
                    style={{ height: `${block.data.maxHeight || 320}px` }}
                  />
                </div>
              );
            })}
          </div>
        );
      }

      case 'list': {
        const items = block.data.items || [];
        if (!items.length && !preview) return null;

        return (
          <ul className="my-6 space-y-2 pl-6 text-sm text-slate-700 sm:text-base">
            {items.map((item, index) => (
              <li key={index} className="list-disc font-medium">
                {item}
              </li>
            ))}
          </ul>
        );
      }

      case 'faq': {
        const items = block.data.faqItems || [];
        const faqTitle = block.data.faqTitle || 'Perguntas Frequentes';

        if (!items.length && !preview) return null;

        return (
          <div className="my-8 space-y-4">
            {faqTitle && <h3 className="text-xl font-bold tracking-tight text-slate-900">{faqTitle}</h3>}
            {items.length === 0 && preview ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400 font-semibold">
                FAQ sem perguntas. Adicione itens no painel.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const isOpen = openFaqId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                        className="flex w-full items-center justify-between p-4 text-left font-bold text-slate-800 hover:bg-slate-50/80 transition-colors"
                      >
                        <span className="text-sm sm:text-base">{item.question}</span>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-blue-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case 'stats': {
        const items = block.data.statsItems || [];
        if (!items.length && !preview) return null;

        const cols = block.data.statsColumns || 3;
        const gridColsClass =
          cols === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : cols === 4
            ? 'grid-cols-2 sm:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-3';

        return (
          <div className={`my-8 grid gap-4 ${gridColsClass}`}>
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-xs transition-transform hover:-translate-y-0.5"
              >
                <div className="text-3xl font-black tracking-tight text-blue-600 sm:text-4xl">
                  {item.number}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        );
      }

      case 'testimonials': {
        const items = block.data.testimonialItems || [];
        if (!items.length && !preview) return null;

        return (
          <div className="my-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {items.map((item) => {
              const avatar = sanitizeUrl(item.avatarUrl);
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`h-4 w-4 ${
                            idx < (item.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700 italic">"{item.content}"</p>
                  </div>

                  <div className="mt-4 flex items-center gap-3 pt-4 border-t border-slate-100">
                    {avatar ? (
                      <img src={avatar} alt={item.author} className="h-10 w-10 rounded-full object-cover shadow-2xs" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-600">
                        {item.author.charAt(0).toUpperCase() || 'C'}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-900">{item.author}</div>
                      {item.role && <div className="text-[11px] font-medium text-slate-500">{item.role}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      case 'video': {
        const embedUrl = resolveVideoEmbedUrl(block.data.videoUrl);
        if (!embedUrl && !preview) return null;

        if (!embedUrl && preview) {
          return (
            <div className="my-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs font-semibold text-slate-400">
              Insira uma URL válida de vídeo (YouTube ou Vimeo) no painel.
            </div>
          );
        }

        const aspectClass = block.data.videoAspectRatio === '4:3' ? 'aspect-[4/3]' : 'aspect-video';

        return (
          <div className="my-8 space-y-2">
            {block.data.videoTitle && (
              <h3 className="text-lg font-bold text-slate-900 mb-2">{block.data.videoTitle}</h3>
            )}
            <div className={`w-full overflow-hidden rounded-2xl bg-black shadow-md ${aspectClass}`}>
              {embedUrl && (
                <iframe
                  src={embedUrl}
                  title={block.data.videoTitle || 'Vídeo'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              )}
            </div>
          </div>
        );
      }

      case 'contact': {
        const useDefaults = block.data.useCompanyDefaults !== false;

        const phone = useDefaults ? companyContext?.phone : block.data.contactPhone;
        const whatsapp = useDefaults ? companyContext?.whatsapp : block.data.contactWhatsapp;
        const email = useDefaults ? companyContext?.email : block.data.contactEmail;
        const instagram = useDefaults ? companyContext?.instagram : block.data.contactInstagram;
        const address = useDefaults ? companyContext?.address : block.data.contactAddress;

        const waDigits = normalizeWhatsApp(whatsapp);
        const instaNormalized = normalizeInstagram(instagram);
        const safeEmail = sanitizeUrl(email ? `mailto:${email}` : '');
        const safePhone = sanitizeUrl(phone ? `tel:${phone.replace(/\D/g, '')}` : '');

        return (
          <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <h3 className="text-xl font-black text-slate-900 mb-6">Canais de Contato</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {whatsapp && (
                <a
                  href={waDigits ? `https://wa.me/${waDigits}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-emerald-200 hover:bg-emerald-50/50"
                >
                  <div className="rounded-lg bg-emerald-500 p-2.5 text-white shadow-2xs">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp</div>
                    <div className="text-sm font-bold text-slate-900">{whatsapp}</div>
                  </div>
                </a>
              )}

              {phone && (
                <a
                  href={safePhone || '#'}
                  className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <div className="rounded-lg bg-blue-600 p-2.5 text-white shadow-2xs">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone</div>
                    <div className="text-sm font-bold text-slate-900">{phone}</div>
                  </div>
                </a>
              )}

              {email && (
                <a
                  href={safeEmail || '#'}
                  className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <div className="rounded-lg bg-slate-800 p-2.5 text-white shadow-2xs">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail</div>
                    <div className="text-sm font-bold text-slate-900 truncate">{email}</div>
                  </div>
                </a>
              )}

              {instaNormalized.url && (
                <a
                  href={instaNormalized.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-pink-200 hover:bg-pink-50/50"
                >
                  <div className="rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-2.5 text-white shadow-2xs">
                    <Instagram className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instagram</div>
                    <div className="text-sm font-bold text-slate-900">@{instaNormalized.username}</div>
                  </div>
                </a>
              )}
            </div>

            {address && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <MapPin className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Endereço</div>
                  <div className="text-sm font-medium text-slate-700 mt-0.5">{address}</div>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'products': {
        const title = block.data.productsTitle || 'Produtos em Destaque';
        const productsList: ResolvedProduct[] = resolvedDynamicData?.products?.[block.id] || [];

        if (isLoadingDynamicData) {
          return (
            <div className="my-8 space-y-4">
              <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-100 p-4 h-48" />
                ))}
              </div>
            </div>
          );
        }

        if (productsList.length === 0) {
          if (!preview) return null;
          return (
            <div className="my-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs font-semibold text-slate-400">
              Nenhum produto encontrado para o filtro configurado.
            </div>
          );
        }

        return (
          <div className="my-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
              <span className="text-xs font-semibold text-blue-600">{productsList.length} produtos</span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {productsList.map((product) => {
                const img = sanitizeUrl(product.image_url);
                return (
                  <div
                    key={product.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-2xs transition-all hover:shadow-md"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-50">
                      {img ? (
                        <img
                          src={img}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <Package className="h-8 w-8" />
                        </div>
                      )}

                      {product.is_launch && (
                        <span className="absolute top-2 left-2 rounded-lg bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white shadow-2xs">
                          Lançamento
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-2">{product.name}</h4>
                      {typeof product.price === 'number' && (
                        <p className="text-sm font-black text-slate-900">
                          R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'brands': {
        const title = block.data.brandsTitle || 'Nossas Marcas';
        const brandsList: ResolvedBrand[] = resolvedDynamicData?.brands?.[block.id] || [];
        const cols = block.data.brandsColumns || 4;

        if (isLoadingDynamicData) {
          return (
            <div className="my-8 space-y-4">
              <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-100 p-4 h-24" />
                ))}
              </div>
            </div>
          );
        }

        if (brandsList.length === 0) {
          if (!preview) return null;
          return (
            <div className="my-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs font-semibold text-slate-400">
              Nenhuma marca encontrada para exibição.
            </div>
          );
        }

        const gridColsClass =
          cols === 2
            ? 'grid-cols-2'
            : cols === 3
            ? 'grid-cols-3'
            : cols === 6
            ? 'grid-cols-3 sm:grid-cols-6'
            : 'grid-cols-2 sm:grid-cols-4';

        return (
          <div className="my-8 space-y-4">
            <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
            <div className={`grid gap-4 ${gridColsClass}`}>
              {brandsList.map((brand) => {
                const logo = sanitizeUrl(brand.logo_url);
                return (
                  <div
                    key={brand.id}
                    className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-2xs transition-all hover:border-blue-200 hover:shadow-xs"
                  >
                    {logo ? (
                      <img src={logo} alt={brand.name} className="h-10 w-full object-contain" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600">
                        <Award className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                    <span className="mt-2 text-xs font-bold text-slate-700 truncate w-full">{brand.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className={`company-page-renderer w-full ${className}`}>
      {renderHeroSection()}
      <div className="space-y-4">
        {blocks.map((block) => (
          <React.Fragment key={block.id}>{renderBlock(block)}</React.Fragment>
        ))}
      </div>
    </div>
  );
}
