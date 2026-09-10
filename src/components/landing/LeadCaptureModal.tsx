'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  User,
  Phone,
  Mail,
  Building2,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { captureLeadAction } from '@/app/actions/lead';

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (leadId: string) => void;
}

export function LeadCaptureModal({
  isOpen,
  onClose,
  onSuccess,
}: LeadCaptureModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [actingType, setActingType] = useState<
    'representante' | 'distribuidora' | 'industria' | 'outro'
  >('representante');
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot bot trap

  // UTM state
  const [utms, setUtms] = useState({
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
  });

  const [submissionId, setSubmissionId] = useState('');

  // Generate idempotency submission_id once on mount or when modal opens
  useEffect(() => {
    if (isOpen && !submissionId) {
      const newId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setSubmissionId(newId);
    }
  }, [isOpen, submissionId]);

  // Extract UTMs from URL / sessionStorage on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const extractedUtms = {
        utm_source: params.get('utm_source') || window.sessionStorage.getItem('utm_source') || '',
        utm_medium: params.get('utm_medium') || window.sessionStorage.getItem('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || window.sessionStorage.getItem('utm_campaign') || '',
        utm_content: params.get('utm_content') || window.sessionStorage.getItem('utm_content') || '',
        utm_term: params.get('utm_term') || window.sessionStorage.getItem('utm_term') || '',
      };

      setUtms(extractedUtms);

      // Persist in sessionStorage
      Object.entries(extractedUtms).forEach(([k, v]) => {
        if (v) window.sessionStorage.setItem(k, v);
      });
    } catch (e) {
      // ignore
    }
  }, []);

  // Format phone with BR mask (00) 00000-0000
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    let formatted = value;
    if (value.length > 2) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 7) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    }

    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await captureLeadAction({
        name,
        email,
        phone,
        acting_type: actingType,
        company_name: companyName,
        submission_id: submissionId,
        website, // honeypot
        ...utms,
      });

      if (!res.success) {
        setError(res.error || 'Ocorreu um erro ao preparar seu cadastro.');
        setLoading(false);
        return;
      }

      const leadId = res.lead_id || '';
      try {
        if (leadId) {
          window.sessionStorage.setItem('rep_lead_id', leadId);
        }
      } catch (e) {
        // ignore
      }

      if (onSuccess) {
        onSuccess(leadId);
      } else {
        router.push(`/register?lead_id=${encodeURIComponent(leadId)}`);
      }
    } catch (err: any) {
      setError('Erro ao enviar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header do Modal */}
        <div className="bg-[#0d1b2c] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#b9722e] text-xs font-bold mb-3 border border-white/10">
            <span className="flex h-2 w-2 rounded-full bg-[#b9722e] animate-ping"></span>
            Passo 1 de 2
          </div>
          <h2 id="modal-title" className="text-2xl font-black tracking-tight">
            Vamos preparar seu RepVendas
          </h2>
          <p className="text-sm text-gray-300 mt-1">
            Preencha seus dados básicos para personalizar sua experiência.
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Campo Honeypot Oculto para Spam/Bots */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#0d1b2c] mb-1">
              Seu Nome Completo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <User size={18} />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Silva"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b9722e] focus:border-[#b9722e] outline-none text-gray-900 text-sm transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#0d1b2c] mb-1">
                WhatsApp
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Phone size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b9722e] focus:border-[#b9722e] outline-none text-gray-900 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#0d1b2c] mb-1">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b9722e] focus:border-[#b9722e] outline-none text-gray-900 text-sm transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#0d1b2c] mb-1">
              Como você atua?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'representante', label: 'Representante Comercial' },
                { id: 'distribuidora', label: 'Distribuidora' },
                { id: 'industria', label: 'Indústria' },
                { id: 'outro', label: 'Outro' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActingType(item.id as any)}
                  className={`p-2.5 border rounded-lg text-xs font-bold transition-all text-left flex items-center justify-between ${
                    actingType === item.id
                      ? 'border-[#b9722e] bg-orange-50/50 text-[#b9722e] ring-1 ring-[#b9722e]'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-gray-50/50'
                  }`}
                >
                  <span>{item.label}</span>
                  {actingType === item.id && (
                    <CheckCircle2 size={14} className="text-[#b9722e]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#0d1b2c] mb-1">
              Empresa / Representação <span className="text-gray-400 font-normal">(Opcional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Building2 size={18} />
              </div>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: Vendas Brasil Representações"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b9722e] focus:border-[#b9722e] outline-none text-gray-900 text-sm transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 bg-[#b9722e] text-white font-bold rounded-xl hover:bg-[#a06025] transition-all shadow-lg flex items-center justify-center gap-2 group disabled:opacity-70"
          >
            {loading ? (
              'Preparando seu RepVendas...'
            ) : (
              <>
                Continuar para Criar Conta <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          {/* Microcopy e LGPD */}
          <div className="pt-2 text-center text-xs text-gray-500 space-y-1">
            <p className="flex items-center justify-center gap-1">
              <ShieldCheck size={14} className="text-green-600 inline" />
              Seus dados estão protegidos. Sem cartão de crédito.
            </p>
            <p>
              Ao continuar, você concorda com nossos{' '}
              <Link
                href="/termos"
                target="_blank"
                className="underline hover:text-[#b9722e]"
              >
                Termos de Uso
              </Link>{' '}
              e{' '}
              <Link
                href="/privacidade"
                target="_blank"
                className="underline hover:text-[#b9722e]"
              >
                Política de Privacidade
              </Link>
              .
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
