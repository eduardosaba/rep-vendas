'use client';

import { Palette } from 'lucide-react';

type Settings = {
  name: string;
  logo_url: string;
  contact_email: string;
  primary_color: string;
  secondary_color: string;
  about_text: string;
  shipping_policy: string;
  hide_prices_globally: boolean;
  commission_trigger: 'faturamento' | 'liquidez';
  default_commission_rate: number;
  require_customer_approval: boolean;
  block_new_orders: boolean;
};

type Props = {
  settings: Settings;
  onChange: (next: Settings) => void;
};

export default function CustomizationTab({ settings, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
        <h3 className="text-lg font-black italic text-slate-900">Branding da Distribuidora</h3>

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-black text-slate-400 uppercase ml-2">Logo da Empresa (URL)</span>
            <input
              value={settings.logo_url}
              onChange={(e) => onChange({ ...settings, logo_url: e.target.value })}
              placeholder="https://..."
              className="mt-2 w-full h-12 px-4 bg-slate-50 rounded-2xl border border-slate-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-400 uppercase ml-2">Cor Primária</span>
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => onChange({ ...settings, primary_color: e.target.value })}
                className="w-full h-14 rounded-2xl cursor-pointer bg-white border border-slate-100"
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-400 uppercase ml-2">Cor de Destaque</span>
              <input
                type="color"
                value={settings.secondary_color}
                onChange={(e) => onChange({ ...settings, secondary_color: e.target.value })}
                className="w-full h-14 rounded-2xl cursor-pointer bg-white border border-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>
              <span className="text-xs font-black text-slate-400 uppercase ml-2">Nome da Empresa</span>
              <input
                value={settings.name}
                onChange={(e) => onChange({ ...settings, name: e.target.value })}
                className="mt-2 w-full h-12 px-4 bg-slate-50 rounded-2xl border border-slate-100"
              />
            </label>
            <label>
              <span className="text-xs font-black text-slate-400 uppercase ml-2">E-mail Comercial</span>
              <input
                value={settings.contact_email}
                onChange={(e) => onChange({ ...settings, contact_email: e.target.value })}
                className="mt-2 w-full h-12 px-4 bg-slate-50 rounded-2xl border border-slate-100"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col justify-center items-center text-center">
        <Palette className="mb-4 opacity-20" size={64} />
        <h4 className="font-bold text-xl">Preview de Marca</h4>
        <p className="text-sm opacity-70 max-w-[280px] mt-2">
          O estilo principal da distribuidora será herdado por catálogo e áreas visuais da equipe.
        </p>
        <div className="mt-6 flex gap-3">
          <div className="w-10 h-10 rounded-xl border border-white/20" style={{ backgroundColor: settings.primary_color }} />
          <div className="w-10 h-10 rounded-xl border border-white/20" style={{ backgroundColor: settings.secondary_color }} />
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
        <h3 className="font-bold text-slate-900">Páginas institucionais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label>
            <span className="text-xs font-black text-slate-400 uppercase ml-2">Sobre a Empresa</span>
            <textarea
              rows={4}
              value={settings.about_text}
              onChange={(e) => onChange({ ...settings, about_text: e.target.value })}
              className="mt-2 w-full p-4 bg-slate-50 rounded-2xl border border-slate-100"
            />
          </label>
          <label>
            <span className="text-xs font-black text-slate-400 uppercase ml-2">Política de Vendas/Envio</span>
            <textarea
              rows={4}
              value={settings.shipping_policy}
              onChange={(e) => onChange({ ...settings, shipping_policy: e.target.value })}
              className="mt-2 w-full p-4 bg-slate-50 rounded-2xl border border-slate-100"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <label className="block">
            <span className="text-xs font-black text-slate-400 uppercase ml-2">Gatilho de Comissão</span>
            <select
              value={settings.commission_trigger}
              onChange={(e) =>
                onChange({
                  ...settings,
                  commission_trigger:
                    e.target.value === 'faturamento' ? 'faturamento' : 'liquidez',
                })
              }
              className="mt-2 w-full h-12 px-4 bg-slate-50 rounded-2xl border border-slate-100"
            >
              <option value="liquidez">Liquidez</option>
              <option value="faturamento">Faturamento</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-2 px-2">
              Regra única da distribuidora para liberar comissão dos representantes.
            </p>
          </label>

          <label className="block">
            <span className="text-xs font-black text-slate-400 uppercase ml-2">Taxa Padrão de Comissão (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={settings.default_commission_rate}
              onChange={(e) =>
                onChange({
                  ...settings,
                  default_commission_rate: Number(e.target.value) || 0,
                })
              }
              className="mt-2 w-full h-12 px-4 bg-slate-50 rounded-2xl border border-slate-100"
            />
            <p className="text-[11px] text-slate-500 mt-2 px-2">
              Usada quando o representante não tiver taxa individual definida.
            </p>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <label className="flex items-start gap-3 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
            <input
              type="checkbox"
              checked={settings.hide_prices_globally}
              onChange={(e) => onChange({ ...settings, hide_prices_globally: e.target.checked })}
              className="mt-0.5"
            />
            <span>Ocultar preços globalmente</span>
          </label>
          <label className="flex items-start gap-3 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
            <input
              type="checkbox"
              checked={settings.require_customer_approval}
              onChange={(e) => onChange({ ...settings, require_customer_approval: e.target.checked })}
              className="mt-0.5"
            />
            <span>Exigir aprovação de cliente</span>
          </label>
          <label className="flex items-start gap-3 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
            <input
              type="checkbox"
              checked={settings.block_new_orders}
              onChange={(e) => onChange({ ...settings, block_new_orders: e.target.checked })}
              className="mt-0.5"
            />
            <span>Bloquear novos pedidos</span>
          </label>
        </div>
      </div>
    </div>
  );
}
