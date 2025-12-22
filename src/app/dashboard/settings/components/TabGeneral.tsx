import React from 'react';
import { Store, Phone, MessageSquare, Lock } from 'lucide-react';

interface TabGeneralProps {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSlugChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function TabGeneral({ formData, handleChange, handleSlugChange }: TabGeneralProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm md:col-span-2 space-y-6">
        <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
          <Store size={18} className="text-[var(--primary)]" /> Dados Básicos
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Nome da Loja
            </label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
              placeholder="Ex: Minha Loja Incrível"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block flex items-center gap-2">
              <Phone size={14} /> Telefone/WhatsApp
            </label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Email de Contato
            </label>
            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
              placeholder="contato@loja.com"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
        <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
          <Lock size={18} className="text-[var(--primary)]" /> Acesso e Links
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Link do Catálogo
          </label>
          <div className="flex rounded-lg shadow-sm">
            <span className="bg-gray-100 dark:bg-slate-800 border border-r-0 border-gray-300 dark:border-slate-700 rounded-l-lg px-3 py-2.5 text-gray-500 text-sm hidden sm:flex items-center select-none">
              repvendas.com.br/catalogo/
            </span>
            <input
              type="text"
              name="catalog_slug"
              value={formData.catalog_slug}
              onChange={handleSlugChange}
              className="flex-1 p-2.5 border border-gray-300 dark:border-slate-700 rounded-r-lg sm:rounded-l-none rounded-l-lg focus:ring-2 focus:ring-[var(--primary)] outline-none font-mono text-[var(--primary)] font-bold bg-white dark:bg-slate-950"
              placeholder="minha-loja"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            Senha de Preços (Opcional)
          </label>
          <input
            name="price_password"
            value={formData.price_password}
            onChange={handleChange}
            className="w-full p-2.5 border rounded-lg font-mono bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
            placeholder="Ex: 123456"
          />
          <p className="text-xs text-gray-500 mt-1">
            Se definido, o cliente precisará da senha para ver os preços (Modo Custo).
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
        <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
          <MessageSquare size={18} className="text-[var(--primary)]" /> Rodapé
        </h3>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            Mensagem do Footer
          </label>
          <textarea
            name="footer_message"
            value={formData.footer_message}
            onChange={handleChange}
            className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none"
            rows={4}
            placeholder="Ex: Enviamos para todo o Brasil. Aceitamos Pix e Cartão."
          />
        </div>
      </div>
    </div>
  );
}