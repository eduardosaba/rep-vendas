"use client"

import React from 'react'
import Link from 'next/link'
import HeaderDistribuidora from './HeaderDistribuidora'
import FooterDistribuidora from './FooterDistribuidora'
import BrandFilterBar from './BrandFilterBar'
import { Storefront } from '@/components/catalogo/Storefront'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function CatalogRichLayout({ company, rep, representative: representativeProp, products, brandsList, activeBrand, pageSections }: any) {
  const representative = rep || representativeProp || null;
  const isInstitutional = !representative;
  const repName = representative
    ? representative.display_name || representative.full_name || representative.email
    : null;

  const productsWithImages = (products || []).map((p: any) => {
    const gallery = p.product_images || [];
    const primary = gallery.find((i: any) => i.is_primary);
    const displayUrl = primary ? primary.url : gallery[0]?.url;
    return displayUrl ? { ...p, image_url: displayUrl } : p;
  });

  const coverFit = (company && company.cover_image_fit) === 'contain' ? 'contain' : 'cover';
  const coverHeight = Math.max(180, Math.min(900, Number(company?.cover_image_height || 360)));
  const galleryFit = (company && company.gallery_image_fit) === 'contain' ? 'contain' : 'cover';
  const galleryUrls = Array.isArray(company?.gallery_urls)
    ? company.gallery_urls
        .map((g: any) => (typeof g === 'string' ? g : g?.url))
        .filter((u: any) => typeof u === 'string' && u.length > 0)
    : [];

  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const selectedImage = selectedIndex !== null && galleryUrls[selectedIndex] ? galleryUrls[selectedIndex] : null;

  const openLightbox = (index: number) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);
  const prevImage = () => {
    if (selectedIndex === null) return;
    const prev = (selectedIndex - 1 + galleryUrls.length) % galleryUrls.length;
    setSelectedIndex(prev);
  };
  const nextImage = () => {
    if (selectedIndex === null) return;
    const next = (selectedIndex + 1) % galleryUrls.length;
    setSelectedIndex(next);
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIndex, galleryUrls.length]);

  return (
    <div className="min-h-screen bg-gray-50 pt-15 md:pt-20">
      <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-6 md:py-7 mt-2 md:mt-3 space-y-8">
        {Array.isArray(brandsList) && brandsList.length > 0 && (
          <BrandFilterBar brands={brandsList} activeBrand={activeBrand} />
        )}
      </div>

      {company?.cover_image && (
        <div className="w-full relative">
          <img
            src={company.cover_image}
            alt={`${company.name} cover`}
            className="w-full object-cover h-[360px] md:h-[420px] lg:h-[560px]"
            style={{
              objectFit: coverFit,
              objectPosition:
                typeof company?.cover_image_offset_x === 'number' || company?.cover_image_offset_x || company?.cover_image_offset_x === 0
                  ? `${Number(company?.cover_image_offset_x || 0)}px ${Number(company?.cover_image_offset_y || 0)}px`
                  : company.cover_image_position || 'center',
            }}
          />

          {company.show_headline_overlay ? (
            <div className={`absolute inset-0 flex ${company.cover_headline_position === 'top' ? 'items-start' : company.cover_headline_position === 'bottom' ? 'items-end' : 'items-center'} justify-center pointer-events-none`}>
              <div className="max-w-3xl mx-auto px-4 text-center" style={{ transform: `translate(${Number(company?.cover_headline_offset_x || 0)}px, ${Number(company?.cover_headline_offset_y || 0)}px)`, zIndex: Number(company?.cover_headline_z_index || 100), whiteSpace: company?.cover_headline_wrap ? 'normal' : 'nowrap', maxWidth: company?.cover_headline_force_two_lines ? '48ch' : undefined }}>
                {company.headline && (
                  <h2 className="font-black italic drop-shadow-lg" style={{ color: company.headline_text_color || company.header_text_color || '#ffffff', fontSize: company?.cover_headline_font_size ? `${Number(company.cover_headline_font_size)}px` : undefined, lineHeight: 1.05 }}>
                    {company.headline}
                  </h2>
                )}
                {company.welcome_text && (
                  <p className="mt-2 drop-shadow-sm" style={{ color: company.headline_text_color || company.header_text_color || '#ffffff', fontSize: company?.cover_headline_font_size ? `${Math.max(12, Number(company.cover_headline_font_size) * 0.45)}px` : undefined }} dangerouslySetInnerHTML={{ __html: company.welcome_text }} />
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="max-w-[1920px] mx-auto px-4 lg:px-8 mt-4 space-y-6">
        {company.about_text && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 max-w-4xl mx-auto">
            <div className="prose prose-lg prose-slate max-w-none text-left" style={{ ['--primary-color' as any]: company.primary_color || undefined } as React.CSSProperties} dangerouslySetInnerHTML={{ __html: company.about_text }} />
          </div>
        )}

        {/* Política de Vendas e Envio removida do render público */}
      </div>

      <div className="w-full mt-8">
        <div className="max-w-[1920px] mx-auto px-4 lg:px-8">
          <Storefront
            catalog={{
              ...company,
              show_cost_price: (company as any).show_cost_price,
              show_sale_price: (company as any).show_sale_price,
              price_unlock_mode: (company as any).price_unlock_mode || 'modal',
              price_password_hash: (company as any).price_password_hash || null,
            }}
            topSlot={(
              <HeaderDistribuidora
                slug={company.slug}
                repSlug={representative?.slug}
                repName={repName}
                primaryColor={company.primary_color}
                headerBackgroundColor={company.header_background_color}
                headerTextColor={company.header_text_color}
                headerIconBgColor={company.header_icon_bg_color}
                headerIconColor={company.header_icon_color}
                showCostPrice={company.show_cost_price}
                showSalePrice={company.show_sale_price}
                priceUnlockMode={company.price_unlock_mode}
                pricePasswordHash={company.price_password_hash}
                store={company}
                companyLogo={company.logo_url || company.catalog?.logo_url || company.single_brand_logo_url || company.store_logo || null}
                companyName={company.name}
                institutional={isInstitutional}
                companyPages={company.company_pages || []}
                topBenefitConfig={{
                  show_top_benefit_bar: company.show_top_benefit_bar ?? false,
                  top_benefit_mode: company.top_benefit_mode === 'marquee' ? 'marquee' : 'static',
                  top_benefit_speed: company.top_benefit_speed === 'slow' ? 'slow' : company.top_benefit_speed === 'fast' ? 'fast' : 'medium',
                  top_benefit_animation: company.top_benefit_animation === 'scroll_right' ? 'scroll_right' : company.top_benefit_animation === 'alternate' ? 'alternate' : 'scroll_left',
                  top_benefit_bg_color: company.top_benefit_bg_color || null,
                  top_benefit_text_color: company.top_benefit_text_color || null,
                  top_benefit_height: company.top_benefit_height || null,
                  top_benefit_text_size: company.top_benefit_text_size || null,
                  top_benefit_image_url: company.top_benefit_image_url || null,
                  top_benefit_image_fit: company.top_benefit_image_fit || null,
                  top_benefit_image_scale: company.top_benefit_image_scale || null,
                  top_benefit_image_align: company.top_benefit_image_align || null,
                  top_benefit_text_align: company.top_benefit_text_align || null,
                  top_benefit_text: company.top_benefit_text || null,
                }}
              />
            )}
            initialProducts={productsWithImages || []}
            showStoreFooter={false}
          />
        </div>
      </div>

      {galleryUrls.length > 0 && (
        <section className="mt-10 md:mt-14 space-y-6 border-t border-slate-200 pt-8 md:pt-15">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-[0.2em]" style={{ color: company.gallery_title_color || company.primary_color || '#1b1b1b' }}>
              {company.gallery_title || 'Coleção em Foco'}
            </h2>
            <p className="text-slate-500 text-xs md:text-sm font-medium uppercase tracking-widest" style={{ color: company.gallery_subtitle_color || undefined }}>
              {company.gallery_subtitle || 'Inspirado por Design e Estilo'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {galleryUrls.slice(0, 12).map((src: string, i: number) => (
              <div key={`${src}-${i}`} className="aspect-square overflow-hidden rounded-2xl bg-slate-100 group cursor-zoom-in" onClick={() => openLightbox(i)} role="button" tabIndex={0}>
                <img src={src} alt={`${company.name} lifestyle ${i + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" style={{ objectFit: galleryFit }} loading="lazy" />
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={closeLightbox} aria-modal="true" role="dialog">
          <button className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors" onClick={closeLightbox} aria-label="Fechar visualização">
            <X size={32} />
          </button>

          <button className="absolute left-4 md:left-8 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-black/40 text-white hover:bg-black/60" onClick={(e) => { e.stopPropagation(); prevImage(); }} aria-label="Imagem anterior">
            <ChevronLeft size={22} />
          </button>

          <button className="absolute right-4 md:right-8 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-black/40 text-white hover:bg-black/60" onClick={(e) => { e.stopPropagation(); nextImage(); }} aria-label="Próxima imagem">
            <ChevronRight size={22} />
          </button>

          <div className="relative max-w-5xl w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300" alt="Visualização ampliada" />
          </div>
        </div>
      )}

      <FooterDistribuidora company={company} primaryColor={company.primary_color} />
    </div>
  )
}
