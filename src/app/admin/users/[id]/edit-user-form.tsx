'use client';
// @ts-nocheck - legacy fallback hooks and dynamic runtime hook resolution

import React, { useState, useRef, useEffect } from 'react';
// Fallback hooks: algumas versões do Next/React expõem hooks de formulário em 'react-dom'.
// Usamos esses exports legados quando as APIs novas (`React.useActionState`) não existem.
// @ts-ignore
import {
  useFormState as useFormStateLegacy,
  useFormStatus as useFormStatusLegacy,
} from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  updateUserLicense,
  updateUserProfile,
  adminResetPassword,
  deleteUser,
} from '../actions';
import {
  Save,
  CreditCard,
  User,
  Lock,
  KeyRound,
  AlertTriangle,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// --- COMPONENTES UI ---
function SubmitButton({
  label = 'Salvar',
  loadingLabel = 'Salvando...',
  variant = 'primary',
}: any) {
  const useActionStatusHook: any =
    (React as any).useActionStatus ?? useFormStatusLegacy;
  const { pending } = useActionStatusHook();
  const baseStyles =
    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: any = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    danger: 'bg-white border border-red-200 text-red-600 hover:bg-red-50',
  };

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${baseStyles} ${variants[variant]}`}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin h-4 w-4" />
          {loadingLabel}
        </>
      ) : (
        <>
          {variant === 'primary' && <Save size={16} />}
          {label}
        </>
      )}
    </button>
  );
}

const initialState = { success: false, message: '', error: '' };

export function EditUserForm({ userId, initialData, availablePlans }: any) {
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Bind actions
  const updateProfileBind = updateUserProfile.bind(null, userId);
  const updateLicenseBind = updateUserLicense.bind(null, userId);
  const resetPassBind = adminResetPassword.bind(null, userId);

  // Hooks do Formulário
  const useActionStateHook: any =
    (React as any).useActionState ?? useFormStateLegacy;
  const [profileState, profileAction] = useActionStateHook(
    updateProfileBind,
    initialState
  );
  const [licenseState, licenseAction] = useActionStateHook(
    updateLicenseBind,
    initialState
  );
  const [passState, passAction] = useActionStateHook(
    resetPassBind,
    initialState
  );

  const passFormRef = useRef<HTMLFormElement>(null);
  const licenseFormRef = useRef<HTMLFormElement>(null);

  // Feedbacks
  useEffect(() => {
    if (profileState?.success) toast.success(profileState.message);
    else if (profileState?.error) toast.error(profileState.error);
  }, [profileState]);

  useEffect(() => {
    if (licenseState?.success) toast.success(licenseState.message);
    else if (licenseState?.error) toast.error(licenseState.error);
  }, [licenseState]);

  useEffect(() => {
    if (passState?.success) {
      toast.success(passState.message);
      passFormRef.current?.reset();
    } else if (passState?.error) {
      toast.error(passState.error);
    }
  }, [passState]);

  const handleConfirmDelete = async () => {
    if (deleteConfirmation !== initialData.email) return;
    setIsDeleting(true);
    const toastId = toast.loading('Excluindo...');
    try {
      const res = await deleteUser(userId);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        setIsDeleteModalOpen(false);
        router.push('/admin/users');
      } else {
        toast.error(res.error, { id: toastId });
        setIsDeleting(false);
      }
    } catch (err) {
      toast.error('Erro inesperado.', { id: toastId });
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* CARD 1: DADOS */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex items-center gap-2">
          <User className="text-gray-500" size={18} />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
            Dados do Usuário & Permissões
          </h2>
        </div>
        <form action={profileAction} className="p-6 grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Nome Completo
              </label>
              <input
                name="full_name"
                defaultValue={initialData.fullName}
                className="w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Nível de Acesso
              </label>
              <select
                name="role"
                defaultValue={initialData.role}
                className="w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="rep">Representante</option>
                <option value="admin">Administrador</option>
                <option value="master">Master</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Estados que atuam (opcional)
              </label>
              <select
                name="estados"
                multiple
                defaultValue={initialData.estados || []}
                className="w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="AC">AC - Acre</option>
                <option value="AL">AL - Alagoas</option>
                <option value="AP">AP - Amapá</option>
                <option value="AM">AM - Amazonas</option>
                <option value="BA">BA - Bahia</option>
                <option value="CE">CE - Ceará</option>
                <option value="DF">DF - Distrito Federal</option>
                <option value="ES">ES - Espírito Santo</option>
                <option value="GO">GO - Goiás</option>
                <option value="MA">MA - Maranhão</option>
                <option value="MT">MT - Mato Grosso</option>
                <option value="MS">MS - Mato Grosso do Sul</option>
                <option value="MG">MG - Minas Gerais</option>
                <option value="PA">PA - Pará</option>
                <option value="PB">PB - Paraíba</option>
                <option value="PR">PR - Paraná</option>
                <option value="PE">PE - Pernambuco</option>
                <option value="PI">PI - Piauí</option>
                <option value="RJ">RJ - Rio de Janeiro</option>
                <option value="RN">RN - Rio Grande do Norte</option>
                <option value="RS">RS - Rio Grande do Sul</option>
                <option value="RO">RO - Rondônia</option>
                <option value="RR">RR - Roraima</option>
                <option value="SC">SC - Santa Catarina</option>
                <option value="SP">SP - São Paulo</option>
                <option value="SE">SE - Sergipe</option>
                <option value="TO">TO - Tocantins</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Marcas que trabalha (opcional)
              </label>
              <input
                name="brands"
                defaultValue={(initialData.brands || []).join(', ')}
                placeholder="Digite marcas separadas por vírgula"
                className="w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Separe múltiplas marcas por vírgula. Opcional.
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <SubmitButton label="Salvar Dados" />
          </div>
        </form>
      </div>

      {/* CARD 2: PLANO */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex items-center gap-2">
          <CreditCard className="text-indigo-600" size={18} />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
            Plano & Licença
          </h2>
        </div>
        <form id="license-form" ref={licenseFormRef} action={licenseAction} className="p-6 grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Plano
              </label>
              <select
                name="plan"
                defaultValue={initialData.plan}
                className="w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 text-sm"
              >
                {availablePlans?.map((p: any) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
                {!availablePlans?.length && (
                  <>
                    <option value="Free">Free</option>
                    <option value="Pro">Pro</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Status
              </label>
              <select
                name="status"
                defaultValue={initialData.status}
                className="w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 text-sm"
              >
                <option value="trialing">Trial</option>
                <option value="active">Ativo</option>
                <option value="past_due">Inadimplente</option>
                <option value="canceled">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Vencimento
              </label>
              <input
                type="date"
                name="ends_at"
                defaultValue={initialData.endsAt}
                className="w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <div className="flex items-center gap-2">
              <SubmitButton label="Salvar Assinatura" />
              <button
                type="button"
                disabled={initialData.status === 'active'}
                className="px-4 py-2.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  try {
                    const form = licenseFormRef.current as HTMLFormElement | null;
                    if (!form) return;
                    // set fields to activation defaults
                    const planEl = form.querySelector('[name="plan"]') as HTMLSelectElement | null;
                    const statusEl = form.querySelector('[name="status"]') as HTMLSelectElement | null;
                    const endsAtEl = form.querySelector('[name="ends_at"]') as HTMLInputElement | null;
                    if (planEl) planEl.value = initialData.plan || planEl.value;
                    if (statusEl) statusEl.value = 'active';
                    if (endsAtEl) endsAtEl.value = '';
                    // submit the form programmatically
                    if (typeof form.requestSubmit === 'function') form.requestSubmit();
                    else form.submit();
                  } catch (e) {
                    console.error('Erro ao ativar conta:', e);
                  }
                }}
              >
                Ativar Conta
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* CARD 3: SENHA */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 flex items-center gap-2">
          <Lock className="text-red-500" size={18} />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
            Segurança
          </h2>
        </div>
        <form
          ref={passFormRef}
          action={passAction}
          className="p-6 flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Redefinir Senha
            </label>
            <div className="relative">
              <KeyRound
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                name="new_password"
                placeholder="Nova senha..."
                autoComplete="new-password"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>
          <SubmitButton
            label="Redefinir"
            loadingLabel="Alterando..."
            variant="danger"
          />
        </form>
      </div>

      {/* CARD 4: EXCLUIR */}
      <div className="bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900 overflow-hidden mt-8 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-red-900 dark:text-red-200">
            Excluir Usuário
          </h3>
          <p className="text-xs text-red-600/80 dark:text-red-400 mt-1 max-w-md">
            Ação irreversível. Remove todos os dados.
          </p>
        </div>
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <Trash2 size={16} /> Excluir Conta
        </button>
      </div>

      {/* MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-500" /> Confirmar Exclusão
            </h3>
            <p className="text-sm mb-4">
              Digite <strong>{initialData.email}</strong> para confirmar.
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="w-full p-2 border rounded mb-4 dark:bg-slate-800"
              placeholder={initialData.email}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 dark:bg-slate-800 dark:text-white"
              >
                Cancelar
              </button>
              <button
                disabled={
                  deleteConfirmation !== initialData.email || isDeleting
                }
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
