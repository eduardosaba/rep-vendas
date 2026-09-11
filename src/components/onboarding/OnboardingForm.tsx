'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  saveOnboardingStep1,
  saveOnboardingStep2,
  saveOnboardingStep3,
  finishOnboarding,
} from '@/app/onboarding/actions';
import {
  User,
  Building2,
  Store,
  Palette,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  UploadCloud,
  Rocket,
  LogOut,
} from 'lucide-react';
import { SYSTEM_LOGO_URL } from '@/lib/constants';

interface OnboardingFormProps {
  userId: string;
  userEmail: string;
  initialFullName?: string;
  initialPhone?: string;
  initialStep?: number;
}

export function OnboardingForm({
  userId,
  userEmail,
  initialFullName = '',
  initialPhone = '',
  initialStep = 1,
}: OnboardingFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const BRAND_BLUE = '#0d1b2c';
  const BRAND_BRONZE = '#b9722e';

  const [step, setStep] = useState<number>(initialStep > 4 ? 4 : initialStep);
  const [loading, setLoading] = useState(false);

  // Form State
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [email] = useState(userEmail || '');

  const [companyName, setCompanyName] = useState('');
  const [organizationType, setOrganizationType] = useState<'independent_representative' | 'distributor' | 'optical_store'>('independent_representative');

  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('');
  const [primaryColor, setPrimaryColor] = useState(BRAND_BRONZE);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(SYSTEM_LOGO_URL);

  // Auto-fill Store & Company Name if initialFullName exists
  useEffect(() => {
    if (initialFullName && !companyName) {
      setCompanyName(`${initialFullName} Representações`);
      setStoreName(`${initialFullName}`);
    }
  }, [initialFullName]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error', err);
    }
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      /* ignore */
    }
    if (typeof window !== 'undefined') window.location.href = '/login';
  };

  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStoreName(val);
    if (!slug || slug === storeName.toLowerCase().replace(/\s+/g, '-')) {
      const generatedSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setSlug(generatedSlug);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // Step 1 Submission
  const handleNextStep1 = async () => {
    if (!fullName.trim()) {
      toast.warning('Por favor, informe seu nome completo.');
      return;
    }
    setLoading(true);
    try {
      await saveOnboardingStep1({ fullName, phone, email });
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar dados pessoais');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Submission
  const handleNextStep2 = async () => {
    if (!companyName.trim()) {
      toast.warning('Por favor, informe o nome da empresa ou negócio.');
      return;
    }
    setLoading(true);
    try {
      await saveOnboardingStep2({ companyName, organizationType, phone });
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar dados da empresa');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 Submission
  const handleNextStep3 = async () => {
    if (!storeName.trim()) {
      toast.warning('Por favor, informe o nome do seu catálogo digital.');
      return;
    }
    setLoading(true);
    try {
      let logoUrl: string | null = null;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const filePath = `public/${userId}/branding/logo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, logoFile, { upsert: true });

        if (!uploadError) {
          const { data } = await supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
          logoUrl = data.publicUrl;
        }
      }

      await saveOnboardingStep3({ storeName, slug, primaryColor, logoUrl });
      setStep(4);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar configurações do catálogo');
    } finally {
      setLoading(false);
    }
  };

  // Step 4 Final Completion
  const handleFinishOnboarding = async () => {
    setLoading(true);
    try {
      await finishOnboarding();
      toast.success('Configuração concluída com sucesso!');
      window.location.href = '/dashboard';
    } catch (err: any) {
      toast.error(err.message || 'Erro ao finalizar onboarding');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[
        { id: 1, label: 'Seus Dados' },
        { id: 2, label: 'Seu Negócio' },
        { id: 3, label: 'Seu Catálogo' },
        { id: 4, label: 'Tudo Pronto' },
      ].map((s, idx) => (
        <div key={s.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                step >= s.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > s.id ? <CheckCircle size={18} /> : s.id}
            </div>
            <span className="text-[10px] font-semibold text-gray-500 mt-1 hidden sm:block">{s.label}</span>
          </div>
          {idx < 3 && (
            <div className={`w-8 sm:w-12 h-1 mb-3 ${step > s.id ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative w-full"
      style={{ backgroundColor: BRAND_BLUE }}
    >
      <div className="absolute top-4 right-4 text-white flex items-center gap-4">
        <span className="text-xs opacity-80 hidden sm:inline">
          Logado como: <strong>{userEmail}</strong>
        </span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl text-xs transition-colors"
        >
          <LogOut size={14} /> Sair
        </button>
      </div>

      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden mt-10 border border-slate-100">
        <div className="h-2 bg-gray-100 w-full">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${(step / 4) * 100}%`,
              backgroundColor: BRAND_BRONZE,
            }}
          />
        </div>

        <div className="p-6 md:p-10">
          {renderStepIndicator()}

          {/* ETAPA 1 — SEUS DADOS */}
          {step === 1 && (
            <div className="animate-in slide-in-from-right fade-in duration-300">
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                  <User size={28} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Etapa 1: Seus Dados Pessoais</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Confirme seus dados de perfil para contato e identificação.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
                    placeholder="Ex: Eduardo Saba"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Telefone / WhatsApp</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">E-mail de Cadastro</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 2 — SEU NEGÓCIO */}
          {step === 2 && (
            <div className="animate-in slide-in-from-right fade-in duration-300">
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                  <Building2 size={28} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Etapa 2: Seu Negócio</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Configure os dados da sua empresa ou representação comercial.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nome da Empresa / Razão Social *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
                    placeholder="Ex: Eduardo Saba Representações"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-2">Tipo de Atuação Comercial</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { id: 'independent_representative', title: 'Representante Comercial', desc: 'Atua de forma autônoma' },
                      { id: 'distributor', title: 'Distribuidora', desc: 'Distribui produtos e marcas' },
                      { id: 'optical_store', title: 'Óptica / Loja', desc: 'Venda direta ao cliente' },
                    ].map((t) => (
                      <label
                        key={t.id}
                        onClick={() => setOrganizationType(t.id as any)}
                        className={`p-3 border rounded-xl cursor-pointer transition-all ${
                          organizationType === t.id
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold shadow-sm'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="orgType"
                          checked={organizationType === t.id}
                          onChange={() => {}}
                          className="sr-only"
                        />
                        <span className="block text-xs font-bold">{t.title}</span>
                        <span className="block text-[10px] text-gray-500 mt-0.5">{t.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3 — SEU CATÁLOGO */}
          {step === 3 && (
            <div className="animate-in slide-in-from-right fade-in duration-300">
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-3">
                  <Store size={28} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Etapa 3: Identidade do Seu Catálogo</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Personalize a presença digital pública da sua marca.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nome Público do Catálogo *</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={handleStoreNameChange}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
                    placeholder="Ex: Saba Representações Digital"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Link do Catálogo (Slug)</label>
                  <div className="flex">
                    <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl px-3 py-3 text-gray-500 text-xs hidden sm:block">
                      repvendas.com/catalogo/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-xl sm:rounded-l-none focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
                      placeholder="saba-representacoes"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">Cor Principal da Marca</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-16 rounded-lg cursor-pointer border p-0.5"
                      />
                      <div
                        className="flex-1 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Preview do Botão
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-2">Logotipo da Marca</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 hover:bg-gray-50 transition-colors text-center cursor-pointer relative">
                      <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept="image/*"
                        onChange={handleLogoChange}
                      />
                      {logoPreview ? (
                        <div className="relative h-12 w-24 mx-auto">
                          <Image src={logoPreview} alt="Logo" fill sizes="96px" className="object-contain" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-gray-400">
                          <UploadCloud size={20} />
                          <span className="text-xs">Enviar Logo</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4 — TUDO PRONTO */}
          {step === 4 && (
            <div className="animate-in slide-in-from-right fade-in duration-300 text-center py-4">
              <div className="mx-auto w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <Rocket size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Seu RepVendas está pronto!</h2>
              <p className="text-gray-600 text-sm max-w-md mx-auto mb-6">
                Sua empresa <strong>{companyName || 'comercial'}</strong> e seu catálogo foram configurados com sucesso.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs max-w-md mx-auto space-y-2 mb-6">
                <div className="font-bold text-slate-800">Resumo da sua conta:</div>
                <div>&bull; Organização: <strong>{companyName}</strong></div>
                <div>&bull; Catálogo Digital: <strong>repvendas.com/catalogo/{slug}</strong></div>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            {step > 1 && step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={loading}
                className="flex items-center text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-xl text-xs hover:bg-gray-100"
              >
                <ArrowLeft size={16} className="mr-1.5" /> Voltar
              </button>
            ) : (
              <div />
            )}

            {step === 1 && (
              <button
                type="button"
                onClick={handleNextStep1}
                disabled={loading}
                style={{ backgroundColor: BRAND_BRONZE }}
                className="flex items-center text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:scale-105 transition-all shadow-md ml-auto"
              >
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Avançar para Empresa <ArrowRight size={16} className="ml-1.5" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleNextStep2}
                disabled={loading}
                style={{ backgroundColor: BRAND_BRONZE }}
                className="flex items-center text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:scale-105 transition-all shadow-md ml-auto"
              >
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Avançar para Catálogo <ArrowRight size={16} className="ml-1.5" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleNextStep3}
                disabled={loading}
                style={{ backgroundColor: BRAND_BRONZE }}
                className="flex items-center text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:scale-105 transition-all shadow-md ml-auto"
              >
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Concluir Configuração <ArrowRight size={16} className="ml-1.5" />
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                Ir para o Painel Dashboard <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
