'use client';

import React, { useEffect } from 'react';
import { MessageCircle, ExternalLink, Headphones, ShieldAlert } from 'lucide-react';

interface BlockedCatalogModalProps {
  storeName?: string | null;
  catalogSlug?: string | null;
  whatsappNumber?: string;
}

export default function BlockedCatalogModal({
  storeName,
  catalogSlug,
  whatsappNumber = '5575981272323',
}: BlockedCatalogModalProps) {
  // Bloquear rolagem do body enquanto o modal estiver presente
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Prevenir navegação por tecla Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  const displayName = storeName || (catalogSlug ? `@${catalogSlug}` : 'este catálogo');
  const waMessage = `Olá! Estou acessando o link do catálogo (${displayName}) no RepVendas e preciso de suporte com o atendimento.`;
  const cleanPhone = whatsappNumber.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="blocked-catalog-title"
      aria-describedby="blocked-catalog-desc"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md select-none transition-all duration-300"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Container do Modal com Glassmorphism Premium */}
      <div className="relative w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-3xl p-7 sm:p-10 text-center overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Orbes de iluminação ambiente decorativa */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-20 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-20 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl"
        />

        {/* Ícone de Suporte em destaque */}
        <div className="relative mx-auto mb-6 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-center shadow-inner">
            <Headphones className="w-10 h-10 text-amber-600 dark:text-amber-400 animate-pulse" />
          </div>
          <span className="absolute -bottom-2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm">
            Canal de Atendimento
          </span>
        </div>

        {/* Título Discreto e Profissional (sem menção a cobrança ou motivo) */}
        <h1
          id="blocked-catalog-title"
          className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3"
        >
          Catálogo Temporariamente Indisponível
        </h1>

        {/* Mensagem Institucional Respeitosa */}
        <p
          id="blocked-catalog-desc"
          className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-normal"
        >
          Este catálogo digital encontra-se temporariamente em manutenção ou indisponível no momento.
          Para obter atendimento, consultar disponibilidade de itens ou esclarecer dúvidas, entre em
          contato diretamente com a equipe da plataforma RepVendas.
        </p>

        {/* Card Informativo com Botão WhatsApp */}
        <div className="flex flex-col gap-3 w-full">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 active:scale-[0.98] transition-all"
          >
            <MessageCircle className="w-5 h-5 flex-shrink-0" />
            <span>Falar com o Suporte RepVendas</span>
          </a>

          <a
            href="https://repvendas.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <span>Conhecer a plataforma RepVendas</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Rodapé Informativo */}
        <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
          <span>RepVendas • Tecnologia para Representantes e Distribuidoras</span>
          <span>Atendimento de Segunda a Sexta, das 08h às 18h</span>
        </div>
      </div>
    </div>
  );
}
