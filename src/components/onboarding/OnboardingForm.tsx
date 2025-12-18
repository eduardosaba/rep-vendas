'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { finishOnboarding } from '@/app/onboarding/actions'; // Certifique-se que o caminho está certo
import {
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
}

export function OnboardingForm({ userId, userEmail }: OnboardingFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const BRAND_BLUE = '#0d1b2c';
  const BRAND_BRONZE = '#b9722e';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: userEmail || '',
    slug: '',
    primary_color: BRAND_BRONZE,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    SYSTEM_LOGO_URL
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // --- SLUG AVAILABILITY CHECK (debounced) ---
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugCheckError, setSlugCheckError] = useState<string | null>(null);

  useEffect(() => {
    const slug = formData.slug?.trim();
    if (!slug) {
      setSlugAvailable(null);
      setSlugCheckError(null);
      return;
    }

    let mounted = true;
    const timer = setTimeout(async () => {
      try {
        setSlugChecking(true);
        setSlugCheckError(null);
        const { data, error } = await supabase
          .from('settings')
          .select('user_id')
          .eq('catalog_slug', slug)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.debug('Slug check error', error);
          setSlugCheckError('Erro ao verificar disponibilidade');
          setSlugAvailable(null);
        } else if (
          data &&
          (data as any).user_id &&
          (data as any).user_id !== userId
        ) {
          setSlugAvailable(false);
        } else {
          setSlugAvailable(true);
        }
      } catch (_err) {
        if (!mounted) return;
        setSlugCheckError('Erro ao verificar disponibilidade');
        setSlugAvailable(null);
      } finally {
        if (mounted) setSlugChecking(false);
      }
    }, 600);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [formData.slug, supabase, userId]);

  const handleSubmit = async () => {
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

      await finishOnboarding({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        slug: formData.slug,
        primary_color: formData.primary_color,
        logo_url: logoUrl,
      });

      toast.success('Loja configurada!');
      // Redirecionamento via router.push no client pode ser cacheado,
      // o window.location.href força um refresh limpo.
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar', { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= i ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}
          >
            {step > i ? <CheckCircle size={20} /> : i}
          </div>
          {i < 3 && (
            <div
              className={`w-16 h-1 ${step > i ? 'bg-primary' : 'bg-gray-200'}`}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative"
      style={{ backgroundColor: BRAND_BLUE }}
    >
      <div className="absolute top-4 right-4 text-white flex items-center gap-4">
        <span className="text-sm opacity-80 hidden sm:inline">
          Logado como: {userEmail}
        </span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>

      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden mt-12">
        <div className="h-2 bg-gray-100 w-full">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${(step / 3) * 100}%`,
              backgroundColor: BRAND_BRONZE,
            }}
          />
        </div>

        <div className="p-8 md:p-12">
          {renderStepIndicator()}

          {step === 1 && (
            <div className="animate-in slide-in-from-right fade-in duration-300">
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-primary/10 rv-text-primary rounded-full flex items-center justify-center mb-4">
                  <Store size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Bem-vindo ao Rep-Vendas!
                </h2>
                <p className="text-gray-500 mt-2">
                  Vamos configurar a identidade da sua loja digital.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Loja / Empresa *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Ex: Calçados Silva"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link do Catálogo (Slug)
                  </label>
                  <div className="flex">
                    <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg px-3 py-3 text-gray-500 text-sm hidden sm:block">
                      repvendas.com/catalogo/
                    </span>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleChange}
                      className="flex-1 p-3 border border-gray-300 rounded-lg sm:rounded-l-none focus:ring-2 focus:ring-primary outline-none"
                      placeholder="calcados-silva"
                    />
                  </div>
                  <div className="mt-2">
                    {slugChecking ? (
                      <p className="text-xs text-gray-500">
                        Verificando disponibilidade...
                      </p>
                    ) : slugAvailable === false ? (
                      <p className="text-xs text-red-600">
                        Este link já está em uso. Escolha outro.
                      </p>
                    ) : slugAvailable === true ? (
                      <p className="text-xs text-green-600">Disponível ✅</p>
                    ) : slugCheckError ? (
                      <p className="text-xs text-red-600">{slugCheckError}</p>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Público
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in slide-in-from-right fade-in duration-300">
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                  <Palette size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Personalização
                </h2>
                <p className="text-gray-500 mt-2">
                  Deixe o catálogo com a cara da sua marca.
                </p>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Cor Principal
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      name="primary_color"
                      value={formData.primary_color}
                      onChange={handleChange}
                      className="h-12 w-24 rounded cursor-pointer border p-1"
                    />
                    <div className="flex-1">
                      <div
                        className="h-10 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-sm"
                        style={{ backgroundColor: formData.primary_color }}
                      >
                        Botão de Exemplo
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logotipo da Empresa
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:bg-gray-50 transition-colors text-center cursor-pointer relative">
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/*"
                      onChange={handleLogoChange}
                    />
                    {logoPreview ? (
                      <div className="relative h-24 w-24 mx-auto">
                        <Image
                          src={logoPreview}
                          alt="Logo Preview"
                          fill
                          sizes="96px"
                          className="object-contain shadow-sm"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">
                          Clique ou arraste sua logo aqui
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in slide-in-from-right fade-in duration-300 text-center py-4">
              <div className="mx-auto w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
                <Rocket size={48} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Tudo Pronto!
              </h2>
              <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                Sua loja <strong>{formData.name}</strong> está pronta. Agora
                você será redirecionado para o painel.
              </p>
            </div>
          )}

          <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft size={18} className="mr-2" /> Voltar
              </button>
            ) : (
              <div />
            )}
            {step < 3 ? (
              <button
                onClick={() => {
                  if (step === 1 && !formData.name) {
                    toast('Preencha o nome');
                    return;
                  }
                  setStep(step + 1);
                }}
                style={{ backgroundColor: BRAND_BRONZE }}
                className="flex items-center text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
              >
                Próximo <ArrowRight size={18} className="ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ backgroundColor: BRAND_BRONZE }}
                className="flex items-center text-white px-10 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-lg disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  'Começar a Usar!'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
