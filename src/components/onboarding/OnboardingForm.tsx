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
  Trash2,
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
        const fileExt = logoFile.name.split('.').pop() || 'png';
        const filePath = `public/${userId}/branding/logo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, logoFile, { upsert: true });

        if (uploadError) {
          console.error('[OnboardingStep3] Erro ao enviar logomarca:', uploadError);
          toast.warning(`Aviso ao salvar logo: ${uploadError.message}. O catálogo continuará com a logo padrão.`);
        } else {
          const { data } = await supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
          logoUrl = data?.publicUrl || null;
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
  const handleFinishOnboarding = async (targetRoute: string = '/dashboard') => {
    setLoading(true);
    try {
      await finishOnboarding();
      toast.success('Configuração concluída com sucesso!');
      window.location.href = targetRoute;
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
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 hover:border-indigo-500 hover:bg-indigo-50/20 transition-all relative group">
                      <input
                        type="file"
                        id="onboarding-logo-input"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        accept="image/*"
                        onChange={handleLogoChange}
                      />
                      
                      <div className="flex items-center justify-between gap-3">
                        <div className="relative h-14 w-28 bg-gray-50 border rounded-lg p-1.5 flex items-center justify-center overflow-hidden shrink-0">
                          {logoPreview ? (
                            <Image src={logoPreview} alt="Logo" fill sizes="112px" className="object-contain p-1" />
                          ) : (
                            <UploadCloud size={24} className="text-gray-400" />
                          )}
                        </div>
                        
                        <div className="flex-1 text-left">
                          <span className="text-xs font-semibold text-gray-800 block truncate max-w-[180px]">
                            {logoFile ? logoFile.name : logoPreview ? 'Logo Padrão do Sistema' : 'Nenhuma logo selecionada'}
                          </span>
                          <span className="text-[11px] text-indigo-600 font-medium flex items-center gap-1 mt-0.5 group-hover:underline">
                            <UploadCloud size={14} /> {logoFile || logoPreview ? 'Clique para alterar a logo' : 'Fazer upload de imagem'}
                          </span>
                        </div>

                        {logoFile && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setLogoFile(null);
                              setLogoPreview(SYSTEM_LOGO_URL);
                            }}
                            title="Restaurar logo padrão"
                            className="z-20 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4 — TUDO PRONTO & GUIA DE IMPORTAÇÃO */}
          {step === 4 && (
            <div className="animate-in slide-in-from-right fade-in duration-300 py-2 space-y-5">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 shadow-inner">
                  <Rocket size={36} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Seu RepVendas está pronto!</h2>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Sua empresa <strong>{companyName || 'comercial'}</strong> e seu catálogo digital foram configurados com sucesso.
                </p>
              </div>

              {/* Resumo do Catálogo Ativo */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Seu Catálogo Digital está Ativo:</span>
                  {slug && (
                    <a
                      href={`/catalogo/${slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 font-semibold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      Abrir Catálogo ↗
                    </a>
                  )}
                </div>
                <div className="text-slate-600 font-mono bg-white p-2.5 rounded-xl border text-center break-all text-xs font-semibold text-indigo-700 shadow-2xs">
                  {typeof window !== 'undefined' ? `${window.location.origin}/catalogo/${slug}` : `repvendas.com/catalogo/${slug}`}
                </div>
              </div>

              {/* Guia Rápido de Importação de Produtos */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs space-y-3">
                <h4 className="font-bold text-amber-900 flex items-center gap-2 text-sm">
                  <UploadCloud size={18} className="text-amber-600" /> Guia Rápido: Como Importar seus Produtos
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-amber-950">
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                    <div className="font-bold text-amber-700 mb-0.5">1. Preparar Lista ou Fotos</div>
                    <span>Organize seus produtos em planilha Excel/CSV ou fotos.</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                    <div className="font-bold text-amber-700 mb-0.5">2. Importador Visual</div>
                    <span>Acesse <strong>Produtos &gt; Importação Visual</strong> no painel.</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                    <div className="font-bold text-amber-700 mb-0.5">3. Publicar Catálogo</div>
                    <span>Seus itens ficam disponíveis para pedidos imediatamente.</span>
                  </div>
                </div>
              </div>

              {/* Informação sobre Mais Configurações */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                <Store size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Quer personalizar ainda mais?</span>
                  <span className="text-[11px] text-blue-800">
                    Você pode incluir banners promocionais, tabela de preços, senha para catálogo e dados de pagamento em <strong>Painel &gt; Configurações</strong>.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="flex justify-between mt-6 pt-5 border-t border-gray-100">
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
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => handleFinishOnboarding('/dashboard/products/import-visual')}
                  disabled={loading}
                  className="w-full sm:flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                  Importar Produtos
                </button>

                <button
                  type="button"
                  onClick={() => handleFinishOnboarding('/dashboard/settings')}
                  disabled={loading}
                  className="w-full sm:flex-1 bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Store size={15} />}
                  Mais Configurações
                </button>

                <button
                  type="button"
                  onClick={() => handleFinishOnboarding('/dashboard')}
                  disabled={loading}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                  Painel Geral <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
