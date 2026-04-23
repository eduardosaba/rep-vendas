'use client';

import React, { useEffect, useState } from 'react';

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const res = await fetch('/api/admin/company/settings');
      const data = await res.json();
      if (data?.success) setSettings(data.data || {});
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const body = { ...settings };
      const res = await fetch('/api/admin/company/settings', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (!data?.success) alert('Erro ao salvar: ' + (data?.error || ''));
      else setSettings(data.data || settings);
    } catch (e) {
      alert('Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  if (!settings) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black">Configuração do Catálogo</h1>
        <p className="text-slate-500">Personalize a experiência do seu cliente e representante.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border space-y-4">
          <label className="text-xs">Texto de Boas-vindas</label>
          <input value={settings.welcome_text || ''} onChange={(e) => setSettings({ ...settings, welcome_text: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl" />

          <label className="text-xs">URL do Banner Principal</label>
          <input value={settings.hero_banner_url || ''} onChange={(e) => setSettings({ ...settings, hero_banner_url: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl" />

          <label className="text-xs">Texto Sobre Nós</label>
          <textarea rows={4} value={settings.about_us_content || ''} onChange={(e) => setSettings({ ...settings, about_us_content: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl" />
        </div>

        <div className="bg-white p-6 rounded-3xl border space-y-4">
          <label className="text-xs">Políticas e Prazos</label>
          <textarea rows={6} value={settings.shipping_policy_content || ''} onChange={(e) => setSettings({ ...settings, shipping_policy_content: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl" />

          <label className="text-xs">Título Vantagens</label>
          <input value={settings.advantages_title || ''} onChange={(e) => setSettings({ ...settings, advantages_title: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl" />

          <label className="text-xs">Vantagens (texto)</label>
          <textarea rows={4} value={settings.advantages_content || ''} onChange={(e) => setSettings({ ...settings, advantages_content: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border space-y-4">
        <h3 className="font-bold">Contato</h3>
        <label className="text-xs">WhatsApp</label>
        <input value={(settings.contact_info && settings.contact_info.whatsapp) || ''} onChange={(e) => setSettings({ ...settings, contact_info: { ...(settings.contact_info || {}), whatsapp: e.target.value } })} className="w-full p-3 bg-slate-50 rounded-xl" />

        <label className="text-xs">Email</label>
        <input value={(settings.contact_info && settings.contact_info.email) || ''} onChange={(e) => setSettings({ ...settings, contact_info: { ...(settings.contact_info || {}), email: e.target.value } })} className="w-full p-3 bg-slate-50 rounded-xl" />
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={loading} className="bg-primary text-white px-8 py-3 rounded-2xl font-bold">{loading ? 'Salvando...' : 'Salvar Todas as Configurações'}</button>
      </div>
    </div>
  );
}
