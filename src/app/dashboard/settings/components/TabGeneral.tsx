import React from 'react';
import {
  Store,
  Phone,
  MessageSquare,
  Lock,
  Eye,
  EyeOff,
  Power,
  Package,
} from 'lucide-react';

interface TabGeneralProps {
  formData: any;
  nameFieldLabel?: string;
  nameFieldPlaceholder?: string;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleSlugChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  slugRef?: React.RefObject<HTMLInputElement>;
  showPassword?: boolean;
  onToggleShowPassword?: () => void;
  isActive: boolean;
  onToggleActive: () => void;
  isCompanyAdmin?: boolean;
  userRole?: string | null;
  onContractTypeChange?: (type: string) => void;
}

export function TabGeneral({
  formData,
  nameFieldLabel = 'Nome da Distribuidora',
  nameFieldPlaceholder = 'Ex: Minha Loja Incrível',
  handleChange,
  handleSlugChange,
  slugRef,
  showPassword = false,
  onToggleShowPassword,
  isActive,
  onToggleActive,
  isCompanyAdmin = false,
  userRole = null,
  onContractTypeChange,
}: TabGeneralProps) {
  const currentContractType = formData.contract_type || 'gestao_completa';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
      {/* TIPO DE CONTRATAÇÃO / MÓDULO DA DISTRIBUIDORA */}
      {isCompanyAdmin && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm md:col-span-2 space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
            <div className="p-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg">
              <Package size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Módulo Contratado pela Distribuidora
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Defina os recursos e menus disponíveis para a distribuidora e sua equipe de representantes.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-1">
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                currentContractType !== 'catalogo'
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5 dark:bg-[var(--primary)]/10'
                  : 'border-gray-200 dark:border-slate-800 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="contract_type"
                value="gestao_completa"
                checked={currentContractType !== 'catalogo'}
                onChange={() => {
                  if (onContractTypeChange) {
                    onContractTypeChange('gestao_completa');
                  } else {
                    handleChange({
                      target: { name: 'contract_type', value: 'gestao_completa' },
                    } as any);
                  }
                }}
                className="mt-1 text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                    Gestão Completa
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                    Ativo
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block leading-relaxed">
                  Catálogo Virtual + Central de Pedidos dos Representantes no menu e acompanhamento de vendas da equipe.
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                currentContractType === 'catalogo'
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5 dark:bg-[var(--primary)]/10'
                  : 'border-gray-200 dark:border-slate-800 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="contract_type"
                value="catalogo"
                checked={currentContractType === 'catalogo'}
                onChange={() => {
                  if (onContractTypeChange) {
                    onContractTypeChange('catalogo');
                  } else {
                    handleChange({
                      target: { name: 'contract_type', value: 'catalogo' },
                    } as any);
                  }
                }}
                className="mt-1 text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <div className="space-y-1">
                <span className="font-bold text-sm text-gray-900 dark:text-white block">
                  Apenas Catálogo Virtual
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 block leading-relaxed">
                  Apenas exibição de produtos. O menu de pedidos é ocultado do sidebar da distribuidora e dos seus representantes.
                </span>
              </div>
            </label>
          </div>
        </div>
      )}
      {/* STATUS DO CATÁLOGO ONLINE */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm md:col-span-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-slate-800'}`}
            >
              <Power
                size={20}
                className={
                  isActive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400'
                }
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Catálogo Online
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isActive
                  ? 'Seu catálogo está público e acessível aos clientes'
                  : 'Seu catálogo está em manutenção - clientes verão página de aviso'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleActive}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${
              isActive ? 'bg-green-600' : 'bg-gray-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm md:col-span-2 space-y-6">
        <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
          <Store size={18} className="text-[var(--primary)]" /> Dados Básicos
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              {nameFieldLabel}
            </label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
              placeholder={nameFieldPlaceholder}
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
            Link do Catálogo principal da Distribuidora
          </label>
          <div className="flex rounded-lg shadow-sm">
            <span className="bg-gray-100 dark:bg-slate-800 border border-r-0 border-gray-300 dark:border-slate-700 rounded-l-lg px-3 py-2.5 text-gray-500 text-sm hidden sm:flex items-center select-none">
              repvendas.com.br/catalogo/
            </span>
            <input
              type="text"
              name="catalog_slug"
              ref={slugRef}
              value={formData.catalog_slug || ''}
              onChange={handleSlugChange}
              autoComplete="off"
              className="flex-1 p-2.5 border border-gray-300 dark:border-slate-700 rounded-r-lg sm:rounded-l-none rounded-l-lg focus:ring-2 focus:ring-[var(--primary)] outline-none font-mono text-[var(--primary)] font-bold bg-white dark:bg-slate-950"
              placeholder="minha-loja"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            Senha de Preços (Opcional)
          </label>
          <div className="flex items-center gap-2">
            <input
              name="price_password"
              type={showPassword ? 'text' : 'password'}
              value={formData.price_password || ''}
              onChange={handleChange}
              autoComplete="new-password"
              className="flex-1 p-2.5 border rounded-lg font-mono bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
              placeholder={formData.price_password_hash ? '•••••• (Senha configurada - digite para alterar)' : 'Ex: 123456'}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleShowPassword}
                className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xs text-gray-500">
              {formData.price_password_hash
                ? 'Uma senha de preços já está cadastrada no catálogo. Digite um novo valor caso queira alterá-la, ou deixe em branco para mantê-la ativa.'
                : 'Se definido, o cliente precisará da senha para ver os preços (Modo Custo).'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
        <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
          <MessageSquare size={18} className="text-[var(--primary)]" /> Apresentação & Rodapé
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Headline do Catálogo
            </label>
            <input
              name="headline"
              value={formData.headline || ''}
              onChange={handleChange}
              className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
              placeholder="Ex: Somos uma marca especializada em armações sofisticadas e acessíveis."
            />
            <p className="text-xs text-gray-400 mt-1">
              Frase de apresentação exibida na capa e nas boas-vindas do catálogo virtual.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Mensagem do Rodapé (Footer)
            </label>
            <textarea
              name="footer_message"
              value={formData.footer_message || ''}
              onChange={handleChange}
              className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none"
              rows={3}
              placeholder="Ex: Enviamos para todo o Brasil. Preços exclusivos para lojistas."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
