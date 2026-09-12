'use client';

import type { CompanyPageBlock } from '@/lib/company-page-content';
import { Phone, MessageCircle, Mail, Instagram, MapPin, Building2 } from 'lucide-react';

interface ContactBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
}

export function ContactBlockEditor({ block, onChange }: ContactBlockEditorProps) {
  const useCompanyDefaults = block.data.useCompanyDefaults !== false;
  const phone = block.data.contactPhone || '';
  const whatsapp = block.data.contactWhatsapp || '';
  const email = block.data.contactEmail || '';
  const instagram = block.data.contactInstagram || '';
  const address = block.data.contactAddress || '';

  const update = (patch: Partial<CompanyPageBlock['data']>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...patch,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Toggle Usar Dados da Empresa */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={useCompanyDefaults}
            onChange={(e) => update({ useCompanyDefaults: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
          />
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span>Usar dados do cadastro da empresa</span>
          </div>
        </label>
        <p className="mt-1 text-[11px] text-blue-700 pl-6 leading-relaxed">
          {useCompanyDefaults
            ? 'Os canais de contato serão atualizados automaticamente conforme as configurações do sistema.'
            : 'Preencha abaixo os contatos específicos que serão exibidos neste bloco.'}
        </p>
      </div>

      {!useCompanyDefaults && (
        <div className="space-y-3 pt-1">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Phone className="h-3.5 w-3.5 text-slate-600" />
              Telefone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => update({ contactPhone: e.target.value })}
              placeholder="(11) 3333-4444"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
              WhatsApp Comercial
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => update({ contactWhatsapp: e.target.value })}
              placeholder="(11) 99999-8888"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Mail className="h-3.5 w-3.5 text-blue-600" />
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => update({ contactEmail: e.target.value })}
              placeholder="contato@empresa.com.br"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Instagram className="h-3.5 w-3.5 text-pink-600" />
              Instagram (Username ou Link)
            </label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => update({ contactInstagram: e.target.value })}
              placeholder="@suaempresa ou https://instagram.com/..."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-red-500" />
              Endereço Físico
            </label>
            <textarea
              value={address}
              onChange={(e) => update({ contactAddress: e.target.value })}
              rows={2}
              placeholder="Av. Paulista, 1000 - São Paulo, SP"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
