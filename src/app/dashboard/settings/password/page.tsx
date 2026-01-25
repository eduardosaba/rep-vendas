'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function PasswordSettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Validações em tempo real
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password === confirmPassword && password !== '';

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasMinLength || !hasNumber || !passwordsMatch) {
      toast.error('Verifique os requisitos de segurança.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Senha atualizada com sucesso!');
      setTimeout(() => router.push('/dashboard'), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <ShieldCheck className="text-[#b9722e]" size={32} /> Segurança da
          Conta
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
          Defina uma nova senha forte para proteger seu acesso ao RepVendas.
        </p>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        <form onSubmit={handleUpdatePassword} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Nova Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-3xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 py-5 pl-14 pr-14 outline-none focus:border-[#b9722e]/30 transition-all font-medium"
                placeholder="No mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-slate-500 transition-colors"
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Confirme a Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-3xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 py-5 pl-14 pr-4 outline-none focus:border-[#b9722e]/30 transition-all font-medium"
                placeholder="Repita a nova senha"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800">
            <div
              className={`flex items-center gap-2 text-xs font-bold ${hasMinLength ? 'text-emerald-600' : 'text-slate-400'}`}
            >
              {hasMinLength ? (
                <CheckCircle2 size={16} />
              ) : (
                <XCircle size={16} />
              )}{' '}
              8+ caracteres
            </div>
            <div
              className={`flex items-center gap-2 text-xs font-bold ${hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}
            >
              {hasNumber ? <CheckCircle2 size={16} /> : <XCircle size={16} />}{' '}
              Ao menos um número
            </div>
            <div
              className={`flex items-center gap-2 text-xs font-bold ${passwordsMatch ? 'text-emerald-600' : 'text-slate-400'}`}
            >
              {passwordsMatch ? (
                <CheckCircle2 size={16} />
              ) : (
                <XCircle size={16} />
              )}{' '}
              Senhas coincidem
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !passwordsMatch || !hasMinLength}
            className="w-full flex items-center justify-center rounded-[2rem] bg-[#b9722e] py-5 font-black text-white hover:bg-[#a06328] transition-all shadow-xl shadow-[#b9722e]/20 disabled:opacity-50 disabled:grayscale"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                ATUALIZAR MINHA SENHA <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="text-center mt-8 text-xs text-slate-400 font-medium">
        🔒 Sua nova senha deve ser diferente das anteriores para maior
        segurança.
      </p>
    </div>
  );
}
