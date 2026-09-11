'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { SYSTEM_LOGO_URL } from '@/lib/constants';
import { LeadCaptureModal } from './LeadCaptureModal';

interface LandingClientWrapperProps {
  children: React.ReactNode;
  jsonLd: Record<string, any>[];
}

export default function LandingClientWrapper({
  children,
  jsonLd,
}: LandingClientWrapperProps) {
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  // Global event listener for buttons with data-open-lead-modal="true"
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-open-lead-modal="true"]')) {
        e.preventDefault();
        setIsLeadModalOpen(true);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#b9722e] selection:text-white">
      {/* Inject Factual JSON-LD Structured Data */}
      {jsonLd.map((schema, i) => (
        <Script
          key={i}
          id={`json-ld-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full bg-[#0d1b2c]/95 backdrop-blur-md z-40 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={SYSTEM_LOGO_URL}
              alt="RepVendas"
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </div>

          <div className="hidden lg:flex items-center gap-8">
            <a
              href="#beneficios"
              className="text-gray-300 hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Benefícios
            </a>
            <a
              href="#como-funciona"
              className="text-gray-300 hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Como Funciona
            </a>
            <a
              href="#faq"
              className="text-gray-300 hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Dúvidas
            </a>
            <a
              href="/catalogo/teste"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Catálogo Demo
            </a>
            <a
              href="/demo/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Painel Demo
            </a>

            <Link
              href="/login"
              className="text-white font-bold hover:text-[#b9722e] transition-colors"
            >
              Entrar
            </Link>
            <button
              data-open-lead-modal="true"
              className="bg-[#b9722e] text-white px-6 py-2.5 rounded-full font-bold hover:bg-[#a06025] transition-all shadow-lg hover:-translate-y-0.5 cursor-pointer text-sm"
            >
              Criar meu catálogo
            </button>
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <Link
              href="/login"
              className="text-white font-bold hover:text-[#b9722e] transition-colors text-sm px-3 py-2"
            >
              Entrar
            </Link>
            <button
              data-open-lead-modal="true"
              className="bg-[#b9722e] text-white px-4 py-2 rounded-full font-bold hover:bg-[#a06025] transition-all shadow-lg text-sm cursor-pointer"
            >
              Criar meu catálogo
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      {children}

      {/* Lead Capture Modal */}
      <LeadCaptureModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
      />
    </div>
  );
}
