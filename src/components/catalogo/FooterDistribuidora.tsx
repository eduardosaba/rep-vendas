"use client"

import React from 'react'
import Link from 'next/link'
import { Instagram, Facebook, Linkedin, MessageCircle, Mail, Phone, MapPin, Globe, FileText } from 'lucide-react'

function isValidUrl(u: any) {
  return typeof u === 'string' && /^https?:\/\//i.test(u);
}

export default function FooterDistribuidora({ company, primaryColor }: any) {
  const currentYear = new Date().getFullYear();
  const dynamicPages = Array.isArray(company.company_pages) ? company.company_pages : [];
  
  function hexToRgb(hex: string) {
    if (!hex) return null;
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  }

  function getContrastColor(hex: string) {
    const rgb = hexToRgb(hex || '#ffffff');
    if (!rgb) return '#111827';
    // YIQ formula
    const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return yiq >= 128 ? '#111827' : '#ffffff';
  }

  const footerBg = company.footer_background_color || company.header_background_color || '#0d1b2c';
  const computedTextColor = getContrastColor(footerBg);
  const textColor = company.footer_text_color || company.header_text_color || computedTextColor;

  return (
    <footer
      className="mt-20 border-t w-full"
      style={{
        backgroundColor: footerBg,
        color: textColor,
        ['--primary' as any]: company.primary_color || '#2563eb',
      } as any}
    >
      <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-12 object-contain" />
            ) : (
              <div className="h-12" />
            )}
            <p className="text-slate-500 text-sm leading-relaxed">
              {company.headline || `Distribuidor oficial de soluções ópticas de alta qualidade.`}
            </p>
          </div>

          <div className="space-y-6">
            <h4 className="font-black text-[10px] uppercase tracking-[0.2em]" style={{ color: textColor }}>Institucional</h4>
            <ul className="space-y-4">
              <li>
                <Link href={`/catalogo/${company.slug}/empresa`} className="text-sm font-bold hover:text-[var(--primary)] transition-colors" style={{ color: textColor }}>
                  Início
                </Link>
              </li>
              {dynamicPages.map((page: any) => (
                <li key={page.slug}>
                  <Link href={`/catalogo/${company.slug}/empresa/p/${page.slug}`} className="text-sm font-bold hover:text-[var(--primary)] transition-colors" style={{ color: textColor }}>
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="font-black text-[10px] uppercase tracking-[0.2em]" style={{ color: textColor }}>Contato</h4>
            <ul className="space-y-4">
              {company.phone && (
                <li className="flex items-center gap-3 text-sm" style={{ color: textColor }}>
                  <Phone size={16} style={{ color: primaryColor }} />
                  {isValidUrl(company.whatsapp_url) ? (
                    <a href={company.whatsapp_url} target="_blank" rel="noreferrer" className="font-bold hover:underline">
                      {company.phone}
                      <span className="ml-2 inline-flex items-center">
                        <MessageCircle size={14} style={{ color: '#25D366' }} />
                      </span>
                    </a>
                  ) : (
                    <a href={`tel:${company.phone}`} className="font-bold">
                      {company.phone}
                    </a>
                  )}
                </li>
              )}
              {company.email && (
                <li className="flex items-center gap-3 text-sm" style={{ color: textColor }}>
                  <Mail size={16} style={{ color: primaryColor }} />
                  {company.email}
                </li>
              )}
              <li className="flex items-start gap-3 text-sm" style={{ color: textColor }}>
                <MapPin size={16} className="mt-1" style={{ color: primaryColor }} />
                <span>{company.address || 'Feira de Santana, Bahia'}<br />{company.country || 'Brasil'}</span>
              </li>
            </ul>
          </div>

          <div className="space-y-6 text-right md:text-left">
            {(() => {
              const hasSocial = isValidUrl(company.instagram_url) || isValidUrl(company.facebook_url) || isValidUrl(company.linkedin_url);
              if (!hasSocial) return null;
              return (
                <>
                  <h4 className="font-black text-[10px] uppercase tracking-[0.2em]" style={{ color: textColor }}>Siga-nos</h4>
                  <div className="flex gap-4 justify-end md:justify-start">
                    {isValidUrl(company.instagram_url) && (
                      <a href={company.instagram_url} target="_blank" rel="noreferrer" className="p-3 rounded-2xl hover:scale-110 transition-transform hover:text-[var(--primary)]">
                        <Instagram size={20} />
                      </a>
                    )}

                    {isValidUrl(company.facebook_url) && (
                      <a href={company.facebook_url} target="_blank" rel="noreferrer" className="p-3 rounded-2xl hover:scale-110 transition-transform hover:text-[var(--primary)]">
                        <Facebook size={20} />
                      </a>
                    )}

                    {isValidUrl(company.linkedin_url) && (
                      <a href={company.linkedin_url} target="_blank" rel="noreferrer" className="p-3 rounded-2xl hover:scale-110 transition-transform hover:text-[var(--primary)]">
                        <Linkedin size={20} />
                      </a>
                    )}

                    {/* WhatsApp moved to Contato section as a phone link */}
                  </div>
                </>
              );
            })()}

            { (company.show_pdf_catalog || company.show_pdf_link) && company.catalog_pdf_url && (
              <div className="mt-6">
                <a
                  href={company.catalog_pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-transform hover:scale-105 shadow-lg"
                  style={{ backgroundColor: primaryColor || '#2563eb', color: '#ffffff' }}
                >
                  <FileText size={16} />
                  Baixar Catálogo (PDF)
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            © {currentYear} {company.name} — Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold text-slate-300 uppercase">Powered by</span>
             <img src="/repvendas.png" alt="RepVendas" className="h-4 opacity-30 grayscale" />
          </div>
        </div>
      </div>
    </footer>
  )
}
