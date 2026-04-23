'use client';

import { useMemo, useState } from 'react';
import { Link2, Percent, User, X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    full_name: string;
    email: string;
    password: string;
    slug: string;
    commission_percent: number;
  }) => Promise<void> | void;
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateTemporaryPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*';
  let output = '';
  for (let i = 0; i < length; i++) {
    output += chars[Math.floor(Math.random() * chars.length)];
  }
  return output;
}

export default function ModalNovoRepresentante({ open, onClose, onSubmit }: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [passwordMode, setPasswordMode] = useState<'manual' | 'auto'>('manual');
  const [password, setPassword] = useState('');
  const [slug, setSlug] = useState('');
  const [commissionPercent, setCommissionPercent] = useState(5);
  const [saving, setSaving] = useState(false);

  const generatedSlug = useMemo(() => (slug ? slugify(slug) : slugify(nome)), [nome, slug]);
  const resolvedPassword = passwordMode === 'auto' ? password : password;

  const handleSubmit = async () => {
    if (!nome.trim() || !generatedSlug || !email.trim() || resolvedPassword.length < 8) return;
    setSaving(true);
    try {
      await onSubmit({
        full_name: nome.trim(),
        email: email.trim().toLowerCase(),
        password: resolvedPassword,
        slug: generatedSlug,
        commission_percent: Number(commissionPercent || 0),
      });
      setNome('');
      setEmail('');
      setPassword('');
      setPasswordMode('manual');
      setSlug('');
      setCommissionPercent(5);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black italic text-slate-900">Novo Representante</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="text-[10px] font-black text-slate-400 uppercase px-2">Nome Completo</span>
            <div className="relative mt-2">
              <User className="absolute left-4 top-4 text-slate-300" size={18} />
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[10px] font-black text-slate-400 uppercase px-2">E-mail de acesso</span>
            <div className="relative mt-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="representante@empresa.com"
                className="w-full h-14 px-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[10px] font-black text-slate-400 uppercase px-2">Senha provisória</span>
            <div className="relative mt-2">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setPasswordMode('manual')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    passwordMode === 'manual'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Definir manual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordMode('auto');
                    setPassword(generateTemporaryPassword());
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    passwordMode === 'auto'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Gerar automática
                </button>
              </div>

              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                className="w-full h-14 px-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium"
              />
            </div>
            <p className="text-[11px] text-slate-500 px-2 mt-2">
              Senha provisória pode ser enviada ao representante para primeiro acesso.
            </p>
          </label>

          <label className="block">
            <span className="text-[10px] font-black text-slate-400 uppercase px-2">Link do Catálogo (Slug)</span>
            <div className="relative mt-2">
              <Link2 className="absolute left-4 top-4 text-slate-300" size={18} />
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="joao-silva"
                className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-xs"
              />
            </div>
            <p className="text-[11px] text-slate-500 px-2 mt-2">URL final: /{generatedSlug || 'seu-slug'}</p>
          </label>

          <label className="block">
            <span className="text-[10px] font-black text-slate-400 uppercase px-2">Percentual de Comissão</span>
            <div className="relative mt-2">
              <Percent className="absolute left-4 top-4 text-slate-300" size={18} />
              <select
                className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-2xl border border-slate-100 font-semibold"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(Number(e.target.value))}
              >
                <option value={3}>3% - Standard</option>
                <option value={5}>5% - Bronze</option>
                <option value={7}>7% - Prata</option>
                <option value={10}>10% - Ouro</option>
              </select>
            </div>
          </label>

          <button
            onClick={handleSubmit}
            disabled={saving || !nome.trim() || !generatedSlug || !email.trim() || resolvedPassword.length < 8}
            className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black disabled:opacity-60"
          >
            {saving ? 'SALVANDO...' : 'ATIVAR REPRESENTANTE'}
          </button>
        </div>
      </div>
    </div>
  );
}
