'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  User,
  Lock,
  Store,
  Camera,
  Loader2,
  Save,
  CreditCard,
  Calendar,
  ShieldCheck,
  Smile,
  X,
  Phone,
  Mail,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function UserProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'plan'>(
    'profile'
  );
  const [userId, setUserId] = useState<string>('');

  // Estado do Modal de Avatares
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [libraryAvatars, setLibraryAvatars] = useState<string[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);

  // Dados do Usuário
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    store_name: '',
    whatsapp: '',
    avatar_url: null as string | null,
  });

  // Dados de Senha
  const [passData, setPassData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Dados do Plano
  const [planData, setPlanData] = useState({
    name: 'Gratuito',
    status: 'active',
    expires_at: null as string | null,
    is_trial: false,
  });

  const supabase = useMemo(() => createClient(), []);

  // --- MÁSCARA DE TELEFONE ---
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    // Formata (XX) XXXXX-XXXX
    if (value.length > 2) {
      value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
    }
    if (value.length > 9) {
      value = `${value.substring(0, 10)}-${value.substring(10)}`;
    }

    setFormData({ ...formData, whatsapp: value });
  };

  // 1. Carregar Dados Iniciais
  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      setUserId(user.id);

      // Executa as duas buscas ao mesmo tempo
      const [profileResponse, subResponse] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const profile = profileResponse.data;
      const sub = subResponse.data;

      // Configura Perfil
      setFormData({
        full_name: profile?.full_name || user.user_metadata?.full_name || '',
        email: user.email || '',
        store_name: profile?.store_name || '',
        whatsapp: profile?.whatsapp || '',
        avatar_url:
          profile?.avatar_url || user.user_metadata?.avatar_url || null,
      });

      // Configura Plano
      if (sub) {
        setPlanData({
          name: sub.plan_name || 'Gratuito',
          status: sub.status || 'active',
          expires_at: sub.current_period_end,
          is_trial: sub.status === 'trial',
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [supabase, router]);

  // 2. Carregar Biblioteca de Avatares
  const fetchAvatarLibrary = async () => {
    setLoadingAvatars(true);
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .list('biblio_avatar', {
          limit: 50,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) throw error;

      if (data) {
        const urls = data.map((file: any) => {
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(`biblio_avatar/${file.name}`);
          return urlData.publicUrl;
        });
        setLibraryAvatars(urls);
      }
    } catch (error) {
      console.error('Erro ao carregar avatares:', error);
      toast.error('Não foi possível carregar a galeria.');
    } finally {
      setLoadingAvatars(false);
    }
  };

  useEffect(() => {
    if (showAvatarModal && libraryAvatars.length === 0) {
      fetchAvatarLibrary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAvatarModal]);

  // --- AÇÕES ---

  const updateAvatarUrl = async (url: string | null) => {
    // 1. Atualiza visualmente na hora
    setFormData((prev) => ({ ...prev, avatar_url: url }));

    // 2. Salva no banco e auth
    await Promise.all([
      supabase.auth.updateUser({ data: { avatar_url: url } }),
      supabase.from('profiles').upsert({
        id: userId,
        avatar_url: url,
        updated_at: new Date().toISOString(),
      }),
    ]);

    // 3. Atualiza sessão em background
    router.refresh();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `public/${userId}/avatars/avatar-${Date.now()}.${fileExt}`;
    const toastId = toast.loading('Enviando foto...');

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateAvatarUrl(urlData.publicUrl);
      toast.success('Foto atualizada!', { id: toastId });
    } catch (error: any) {
      toast.error('Erro no upload', {
        id: toastId,
        description: error.message,
      });
    }
  };

  const handleSelectLibraryAvatar = async (url: string) => {
    setShowAvatarModal(false);
    setFormData((prev) => ({ ...prev, avatar_url: url }));

    toast.promise(updateAvatarUrl(url), {
      loading: 'Aplicando avatar...',
      success: 'Avatar selecionado!',
      error: 'Erro ao salvar avatar',
    });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updates = {
        id: userId,
        full_name: formData.full_name,
        store_name: formData.store_name,
        whatsapp: formData.whatsapp,
        avatar_url: formData.avatar_url,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;

      await supabase.auth.updateUser({
        data: { full_name: formData.full_name },
      });

      toast.success('Perfil salvo com sucesso!');
      router.refresh();
    } catch (error: any) {
      toast.error('Erro ao salvar', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passData.newPassword !== passData.confirmPassword)
      return toast.error('As senhas não coincidem!');

    if (passData.newPassword.length < 6)
      return toast.error('A senha deve ter no mínimo 6 caracteres.');

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passData.newPassword,
      });

      if (error) throw error;

      toast.success('Senha alterada com sucesso!');
      setPassData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error('Erro ao alterar senha', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Vitalício / Indeterminado';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // --- CREATE USER (MANUAL) ---
  // create-user UI removed

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-1rem)] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  // Estilos reutilizáveis (com suporte a Dark Mode)
  const inputClass =
    'w-full p-2.5 rounded-lg outline-none transition-all border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary';
  const labelClass =
    'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  const cardClass =
    'bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm animate-in fade-in zoom-in-95 duration-300';

  return (
    <div className="flex flex-col min-h-[calc(100vh-1rem)] bg-gray-50 dark:bg-slate-950 p-4 md:p-6 overflow-hidden">
      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Minha Conta
          </h1>
          <div className="ml-4" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Gerencie seus dados pessoais e de acesso.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUNA ESQUERDA: FOTO E MENU */}
        <div className="lg:col-span-1 space-y-6">
          <div
            className={`${cardClass} flex flex-col items-center text-center`}
          >
            {/* Foto de Perfil */}
            <div className="relative group cursor-pointer mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 dark:border-slate-800 shadow-inner bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-slate-600">
                    <User size={48} />
                  </div>
                )}
              </div>

              {/* Overlay de Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                <Camera className="text-white" size={24} />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                className="hidden"
                accept="image/*"
              />
            </div>

            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => setShowAvatarModal(true)}
                size="sm"
                variant="secondary"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide"
              >
                <Smile size={14} /> Escolher da Galeria
              </Button>
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate w-full px-4">
              {formData.full_name || 'Usuário'}
            </h2>
            <p
              className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate w-full px-4"
              title={formData.email}
            >
              {formData.email}
            </p>

            <div className="w-full border-t border-gray-100 dark:border-slate-800 pt-4 mt-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  planData.name === 'Gratuito'
                    ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                }`}
              >
                {planData.name === 'Gratuito' ? (
                  <User size={12} />
                ) : (
                  <ShieldCheck size={12} />
                )}
                {planData.name}
              </span>
            </div>
          </div>

          {/* Menu Lateral */}
          <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            <Button
              onClick={() => setActiveTab('profile')}
              variant={activeTab === 'profile' ? 'primary' : 'secondary'}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap"
            >
              <User size={18} /> Dados Pessoais
            </Button>
            <Button
              onClick={() => setActiveTab('security')}
              variant={activeTab === 'security' ? 'primary' : 'secondary'}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap"
            >
              <Lock size={18} /> Segurança
            </Button>
            <Button
              onClick={() => setActiveTab('plan')}
              variant={activeTab === 'plan' ? 'primary' : 'secondary'}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap"
            >
              <CreditCard size={18} /> Meu Plano
            </Button>
          </nav>
        </div>

        {/* COLUNA DIREITA: CONTEÚDO */}
        <div className="lg:col-span-2 space-y-6">
          {/* ABA PERFIL */}
          {activeTab === 'profile' && (
            <section className={cardClass}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-4">
                <User
                  size={20}
                  className="text-[var(--primary)] dark:text-[var(--primary)]"
                />{' '}
                Editar Perfil
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className={labelClass}>Nome Completo</label>
                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      className={`${inputClass} pl-10`}
                      placeholder="Seu nome"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Nome da Loja{' '}
                    <span className="text-gray-400 font-normal text-xs ml-1">
                      (opcional)
                    </span>
                  </label>
                  <div className="relative">
                    <Store
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={formData.store_name}
                      onChange={(e) =>
                        setFormData({ ...formData, store_name: e.target.value })
                      }
                      placeholder="Minha Loja"
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>WhatsApp</label>
                  <div className="relative">
                    <Phone
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={formData.whatsapp}
                      onChange={handlePhoneChange}
                      placeholder="(00) 00000-0000"
                      className={`${inputClass} pl-10`}
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className={labelClass}>E-mail (Login)</label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className={`${inputClass} pl-10 opacity-60 cursor-not-allowed bg-gray-50 dark:bg-slate-900/50`}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end pt-4 border-t border-gray-100 dark:border-slate-800">
                <Button
                  onClick={handleSaveProfile}
                  isLoading={saving}
                  leftIcon={<Save size={18} />}
                  variant="primary"
                  className="font-bold px-6 py-2.5 rounded-lg shadow-md transition-all active:scale-95"
                >
                  Salvar Dados
                </Button>
              </div>
            </section>
          )}

          {/* ABA SEGURANÇA */}
          {activeTab === 'security' && (
            <section className={cardClass}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-4">
                <Lock size={20} className="text-orange-500" /> Alterar Senha
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Nova Senha</label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passData.newPassword}
                      onChange={(e) =>
                        setPassData({
                          ...passData,
                          newPassword: e.target.value,
                        })
                      }
                      className={`${inputClass} pl-10`}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Confirmar Senha</label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passData.confirmPassword}
                      onChange={(e) =>
                        setPassData({
                          ...passData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className={`${inputClass} pl-10`}
                      placeholder="Repita a senha"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end pt-4 border-t border-gray-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={handleChangePassword}
                  isLoading={saving}
                  disabled={!passData.newPassword}
                  className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 px-6 py-2.5 rounded-lg"
                >
                  Atualizar Senha
                </Button>
              </div>
            </section>
          )}

          {/* ABA PLANO */}
          {activeTab === 'plan' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div
                className={`${cardClass} relative overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800`}
              >
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 uppercase tracking-wider">
                      Licença Atual
                    </p>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                      {planData.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          planData.status === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            planData.status === 'active'
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          }`}
                        ></span>
                        {planData.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                  <div className="h-14 w-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-100 dark:ring-indigo-800">
                    <ShieldCheck size={32} />
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-blue-600 dark:text-blue-400">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">
                        Vencimento
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                        {formatDate(planData.expires_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE AVATARES */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[80vh] border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Smile size={20} className="text-[var(--primary)]" /> Galeria de
                Avatares
              </h3>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-950">
              {loadingAvatars ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                </div>
              ) : libraryAvatars.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                  <p>Nenhum avatar encontrado na biblioteca.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {libraryAvatars.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectLibraryAvatar(url)}
                      className="group relative aspect-square rounded-xl bg-gray-50 dark:bg-slate-800 overflow-hidden ring-1 ring-gray-200 dark:ring-slate-700 hover:ring-2 hover:ring-[var(--primary)] transition-all shadow-sm hover:shadow-md"
                    >
                      {}
                      <img
                        src={url}
                        alt={`Avatar ${idx}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* create-user modal removed */}
    </div>
  );
}
