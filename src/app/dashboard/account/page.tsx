'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  User,
  Lock,
  Camera,
  Save,
  Loader2,
  ShieldCheck,
  UserCircle,
} from 'lucide-react';

export default function AccountPage() {
  // usar sonner programático
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');

  // Estados do Perfil
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Estados da Senha
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      setUserEmail(user.email || '');

      // Resiliência: usar .maybeSingle() para não quebrar se não houver perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setFullName(profile.full_name || '');
        setAvatarUrl(profile.avatar_url);
      }
      setLoading(false);
    };

    loadProfile();
  }, [supabase]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!userId) throw new Error('Usuário não identificado');

      let newAvatarUrl = avatarUrl;

      // 1. Upload Avatar
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `public/${userId}/avatars/avatar-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        newAvatarUrl = data.publicUrl;
      }

      // 2. Atualizar Perfil
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      // Opcional: Atualizar metadados do Auth também
      await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: newAvatarUrl },
      });

      toast.success('Perfil atualizado com sucesso!');
      // Recarrega para atualizar o Topbar se necessário (ou usar contexto)
      window.location.reload();
    } catch (error: any) {
      toast.error('Erro ao salvar', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast('Senhas não conferem');
      return;
    }
    if (password.length < 6) {
      toast('Senha muito curta', { description: 'Mínimo 6 caracteres' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;

      toast.success('Senha alterada!', {
        description: 'Use a nova senha no próximo login.',
      });
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error('Erro ao alterar senha', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minha Conta</h1>
        <p className="text-sm text-gray-500">
          Gerencie suas informações pessoais e segurança.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* COLUNA ESQUERDA: PERFIL PÚBLICO */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2 border-b pb-2">
              <User size={18} className="text-gray-400" /> Dados do Perfil
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                    {avatarPreview || avatarUrl ? (
                      <img
                        src={avatarPreview || (avatarUrl as string)}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserCircle size={64} className="text-gray-300" />
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
                    <Camera size={24} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Foto de Perfil
                  </p>
                  <p className="text-xs text-gray-500">
                    Clique na imagem para alterar.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Seu Nome"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    disabled
                    className="w-full p-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-white rounded-lg font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* COLUNA DIREITA: SEGURANÇA */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2 border-b pb-2">
              <ShieldCheck size={18} className="text-gray-400" /> Segurança
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Nova Senha
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  placeholder="••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  placeholder="••••••"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !password}
                className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Lock size={16} /> Atualizar Senha
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
