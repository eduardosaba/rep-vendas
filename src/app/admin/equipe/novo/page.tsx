'use client';

import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function NovoRepresentante() {
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [repSlug, setRepSlug] = useState('');
  const [slug, setSlug] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/companies/me');
        const json = await res.json();
          if (json?.success && json?.data) {
          setCompanyId(json.data.id || '');
          setSlug(json.data.slug || '');
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    const s = val.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    setRepSlug(s);
  };

  const shareLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://repvendas.com.br'}/catalogo/${slug || 'empresa'}/${repSlug}`;

  const handleCreate = async () => {
    if (!name || !repSlug || !companyId) return toast.error('Nome, slug e empresa são obrigatórios');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/reps/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, slug: repSlug, company_id: companyId }) });
      const json = await res.json();
      if (json?.success) {
        toast.success('Representante criado');
      } else {
        toast.error(json?.error || 'Erro ao criar representante');
      }
    } catch (e) {
      toast.error('Erro ao criar representante');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-black italic">Novo Representante</h1>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border space-y-6">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">Nome do Vendedor</label>
          <input 
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full h-14 bg-slate-50 rounded-2xl px-4 mt-1 border-none focus:ring-2 focus:ring-primary"
            placeholder="Ex: João Silva"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">Slug do Link (Personalizado)</label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-400 font-medium">{typeof window !== 'undefined' ? window.location.origin.replace(/^https?:\/\//, '') : 'repvendas.com.br'}/catalogo/{slug || 'empresa'}/</span>
            <input 
              value={repSlug}
              onChange={(e) => setRepSlug(e.target.value)}
              className="flex-1 h-10 bg-slate-100 rounded-lg px-3 border-none font-bold text-primary"
            />
          </div>
        </div>

        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
          <div className="truncate pr-4">
            <p className="text-[10px] font-black text-primary uppercase">Link de Vendas do {name || '...'}</p>
            <p className="text-sm font-medium text-slate-600 truncate">{shareLink}</p>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(shareLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="p-3 bg-white rounded-xl shadow-sm hover:bg-slate-50"
          >
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
          </button>
        </div>

        <button onClick={handleCreate} className="w-full h-14 bg-primary text-white rounded-2xl font-black shadow-lg" disabled={saving}>{saving ? 'Salvando...' : 'Criar e Ativar Vendedor'}</button>
      </div>
    </div>
  );
}
