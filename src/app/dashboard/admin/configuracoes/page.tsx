"use client";

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import CustomizationTab from '@/components/admin/config/CustomizationTab';
import PageManager from '@/components/admin/config/PageManager';
import Link from 'next/link';

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

const initialSettings: Settings = {
  name: '',
  logo_url: '',
  contact_email: '',
  primary_color: '#2563eb',
  secondary_color: '#0ea5e9',
  about_text: '',
  shipping_policy: '',
  hide_prices_globally: false,
  commission_trigger: 'liquidez',
  default_commission_rate: 5,
  require_customer_approval: true,
  block_new_orders: false,
};

export default function AdminCompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>(initialSettings);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/companies/me', { cache: 'no-store' });
        const json = await res.json();
        if (!mounted) return;

        if (!res.ok || !json?.success) {
          throw new Error(json?.error || 'Falha ao carregar configurações');
        }

        setSettings((prev) => ({ ...prev, ...(json.data || {}) }));
      } catch (e: any) {
        toast.error(e?.message || 'Erro ao carregar dados da empresa');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/companies/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Falha ao salvar');
      }
      toast.success('Configurações salvas com sucesso');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="bg-white border border-slate-100 rounded-[2rem] p-8">
        <h1 className="text-3xl font-black italic text-slate-900">Customização da Empresa</h1>
        <p className="text-slate-500 mt-2">Defina branding, páginas institucionais e layout dinâmico do catálogo.</p>
        <div className="mt-4">
          <Link href="/admin/configuracoes/catalogo" className="inline-block px-4 py-2 bg-slate-900 text-white rounded-2xl font-semibold">Editar Experiência do Catálogo</Link>
        </div>
      </header>

      <CustomizationTab settings={settings} onChange={setSettings} />

      <PageManager />

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-12 px-6 rounded-xl bg-slate-900 text-white font-semibold inline-flex items-center gap-2 disabled:opacity-60"
        >
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}
