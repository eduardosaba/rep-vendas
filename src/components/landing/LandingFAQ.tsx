'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'O RepVendas substitui o catálogo em PDF?',
    answer:
      'Sim! Em vez de enviar arquivos em PDF pesados que ficam desatualizados a cada mudança de preço ou estoque, você compartilha um link de catálogo digital profissional. Seu cliente acessa pelo celular ou computador, vê as fotos organizadas e pode montar o pedido sozinho.',
  },
  {
    question: 'Meu cliente precisa instalar algum aplicativo para ver o catálogo?',
    answer:
      'Não. O seu catálogo funciona diretamente no navegador do celular ou computador do seu cliente, sem necessidade de baixar ou instalar nada na Play Store ou App Store.',
  },
  {
    question: 'Como recebo os pedidos dos meus clientes?',
    answer:
      'Quando o cliente finaliza o pedido no seu catálogo, as informações chegam formatadas e organizadas no seu Painel Administrativo. O cliente também pode enviar uma cópia do pedido pronto diretamente para o seu WhatsApp com um único clique.',
  },
  {
    question: 'É possível proteger ou ocultar os preços dos produtos?',
    answer:
      'Sim! Você pode definir se os preços ficam públicos ou se exigem uma senha de acesso. Desta forma, apenas clientes autorizados conseguem visualizar informações comerciais estratégicas.',
  },
  {
    question: 'Posso importar meus produtos de uma planilha Excel ou CSV?',
    answer:
      'Com certeza. O RepVendas permite importar sua relação de produtos via planilha e vincular todas as imagens de forma simples e rápida na nossa interface visual.',
  },
  {
    question: 'Posso usar minha própria marca, logo e cores?',
    answer:
      'Sim! Você pode fazer upload da sua logo, personalizar as cores principais do catálogo e configurar a identidade visual para transmitir total profissionalismo aos seus clientes.',
  },
];

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 bg-gray-50 border-t border-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 text-[#b9722e] text-xs font-bold mb-3">
            <HelpCircle size={16} />
            Dúvidas Frequentes
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0d1b2c] tracking-tight">
            Perguntas Frequentes sobre o Catálogo Digital
          </h2>
          <p className="text-gray-600 mt-3 text-lg">
            Tire suas dúvidas e entenda como transformar sua operação de vendas.
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => toggleIndex(index)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-lg text-[#0d1b2c] hover:text-[#b9722e] transition-colors"
                  aria-expanded={isOpen}
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    size={20}
                    className={`text-gray-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#b9722e]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-50 pt-4">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
