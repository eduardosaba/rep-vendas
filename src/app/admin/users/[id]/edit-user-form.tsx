'use client';
// @ts-nocheck - legacy fallback hooks and dynamic runtime hook resolution

import React, { useState, useRef, useEffect } from 'react';
import {
  useFormState as useFormStateLegacy,
  useFormStatus as useFormStatusLegacy,
} from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  updateUserLicense,
  updateUserProfile,
  adminResetPassword,
  deactivateUser,
  reactivateUser,
  getUserDeletionImpact,
  permanentlyDeleteUser,
} from '../actions';
import {
  Save,
  CreditCard,
  User,
  Lock,
  KeyRound,
  Loader2,
  UserX,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

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

  // Estados dos Modais de Governança V1
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  // Estados do Modal de Exclusão Definitiva
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<any>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);

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

  // Handler Desativar Acesso
  const handleConfirmDeactivate = async () => {
    if (!deactivateReason.trim()) {
      toast.error('É obrigatório informar uma justificativa para a desativação.');
      return;
    }

    setIsDeactivating(true);
    const toastId = toast.loading('Desativando acesso do usuário...');
    try {
      const res = await deactivateUser(userId, deactivateReason);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        if (res.warning) toast.warning(res.warning);
        setIsDeactivateOpen(false);
        router.refresh();
      } else {
        toast.error(res.error, { id: toastId });
      }
    } catch (err) {
      toast.error('Erro inesperado.', { id: toastId });
    } finally {
      setIsDeactivating(false);
    }
  };

  // Handler Reativar Acesso
  const handleConfirmReactivate = async () => {
    setIsReactivating(true);
    const toastId = toast.loading('Reativando acesso do usuário...');
    try {
      const res = await reactivateUser(userId);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        router.refresh();
      } else {
        toast.error(res.error, { id: toastId });
      }
    } catch (err) {
      toast.error('Erro inesperado ao reativar.', { id: toastId });
    } finally {
      setIsReactivating(false);
    }
  };

  const handleOpenDeleteModal = async () => {
    setIsDeleteModalOpen(true);
    setIsLoadingImpact(true);
    try {
      const res = await getUserDeletionImpact(userId);
      if (res.success && res.impact) {
        setDeleteImpact(res.impact);
      } else {
        toast.error(res.error || 'Erro ao carregar prévia do impacto.');
      }
    } catch (err) {
      toast.error('Erro ao carregar prévia do impacto.');
    } finally {
      setIsLoadingImpact(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (deleteConfirmEmail.trim().toLowerCase() !== initialData.email.trim().toLowerCase()) {
      toast.error('O e-mail digitado não confere com a conta.');
      return;
    }

    setIsDeletingUser(true);
    const toastId = toast.loading('Excluindo usuário e produtos definitivamente...');
    try {
      const res = await permanentlyDeleteUser(userId, deleteConfirmEmail);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        setIsDeleteModalOpen(false);
        router.push('/admin/users');
      } else {
        toast.error(res.error, { id: toastId });
      }
    } catch (err) {
      toast.error('Erro ao excluir usuário definitivamente.', { id: toastId });
    } finally {
      setIsDeletingUser(false);
    }
  };

  const isInactive = initialData.is_active === false;

  const disabledByInfo = initialData.disabledByProfile
    ? (initialData.disabledByProfile.full_name || initialData.disabledByProfile.email)
    : (initialData.disabled_by ? `ID: ${initialData.disabled_by}` : null);

  return (
    <div className="space-y-6 relative">
      {/* ALERTA DE STATUS COM DETALHES DE AUDITORIA */}
      {isInactive && (
        <div data-testid="disabled-access-panel" className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-red-900 dark:text-red-200 text-sm">
          <div className="flex items-start gap-3">
            <UserX size={22} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-base">Acesso Desativado</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                O acesso deste usuário foi desativado. Pedidos, produtos, clientes e históricos permanecem intactos.
              </p>
              <div className="mt-2 text-xs space-y-1 text-red-800 dark:text-red-200 font-mono">
                {initialData.disabled_at && (
                  <p>Data: {new Date(initialData.disabled_at).toLocaleString('pt-BR')}</p>
                )}
                {disabledByInfo && (
                  <p>Desativado por: {disabledByInfo}</p>
                )}
                {initialData.disabled_reason && (
                  <p>Motivo: &quot;{initialData.disabled_reason}&quot;</p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleConfirmReactivate}
            disabled={isReactivating}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 self-end sm:self-center shrink-0"
          >
            {isReactivating ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />} Reativar Acesso
          </button>
        </div>
      )}

      {/* CARD 1: DADOS DO USUÁRIO */}
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
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <SubmitButton label="Salvar Dados" />
          </div>
        </form>
      </div>

      {/* CARD 2: PLANO & LICENÇA */}
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
            <SubmitButton label="Salvar Assinatura" />
          </div>
        </form>
      </div>

      {/* CARD 3: SEGURANÇA */}
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

      {/* CARD DE AÇÃO PRINCIPAL DE GOVERNANÇA: DESATIVAR OU REATIVAR ACESSO */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UserX size={18} className={isInactive ? "text-red-500" : "text-amber-500"} />
            {isInactive ? 'Status do Acesso: Desativado' : 'Desativar Acesso do Usuário'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md">
            {isInactive
              ? 'Este usuário está com o acesso suspenso. Clique em Reativar Acesso para restabelecer as permissões de login.'
              : 'Bloqueia o login e revoga acessos imediatamente. Preserva 100% dos pedidos, catálogo e histórico comercial.'}
          </p>
        </div>
        <div>
          {isInactive ? (
            <button
              onClick={handleConfirmReactivate}
              disabled={isReactivating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isReactivating ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
              Reativar Acesso
            </button>
          ) : (
            <button
              onClick={() => setIsDeactivateOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <UserX size={16} /> Desativar Acesso
            </button>
          )}
        </div>
      </div>

      {/* CARD DE ZONA DE PERIGO: EXCLUSÃO DEFINITIVA */}
      <div className="bg-red-50/40 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
            <UserX size={18} />
            Zona de Perigo: Exclusão Definitiva
          </h3>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1 max-w-md">
            Remove permanentemente a conta do Supabase Auth, o perfil em profiles e todos os produtos cadastrados pelo usuário. Se existirem pedidos vinculados, a exclusão será bloqueada.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenDeleteModal}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <UserX size={16} /> Excluir Definitivamente
          </button>
        </div>
      </div>

      {/* MODAL: DESATIVAR ACESSO (EXIGE JUSTIFICATIVA) */}
      {isDeactivateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-amber-600">
              <UserX /> Confirmar Desativação de Acesso
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              O login de <strong>{initialData.email}</strong> será suspenso. Todos os pedidos, produtos e logs permanecerão preservados.
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Motivo / Justificativa (Obrigatório)
              </label>
              <input
                type="text"
                required
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="Informe a justificativa..."
                className="w-full p-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeactivateOpen(false)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-slate-800 dark:text-white rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                disabled={isDeactivating || !deactivateReason.trim()}
                onClick={handleConfirmDeactivate}
                className="px-4 py-2 text-sm bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeactivating && <Loader2 size={14} className="animate-spin" />}
                Confirmar Desativação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUSÃO DEFINITIVA (AUDITORIA E CONFIRMAÇÃO POR EMAIL) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl p-6 space-y-4 border border-red-200 dark:border-red-900">
            <h3 className="text-lg font-bold flex items-center gap-2 text-red-600">
              <UserX /> Exclusão Definitiva de Usuário
            </h3>

            {isLoadingImpact ? (
              <div className="py-8 flex items-center justify-center gap-2 text-gray-500">
                <Loader2 className="animate-spin text-red-600" size={20} />
                <span>Calculando impacto da exclusão...</span>
              </div>
            ) : deleteImpact ? (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs space-y-1.5 border grid grid-cols-2 gap-x-2 gap-y-1">
                  <p className="col-span-2"><strong>Conta:</strong> {initialData.email}</p>
                  <p><strong>Produtos:</strong> {deleteImpact.productsCount} (serão apagados)</p>
                  <p><strong>Clientes:</strong> {deleteImpact.clientsCount}</p>
                  <p><strong>Pedidos:</strong> {deleteImpact.ordersCount}</p>
                  <p><strong>Pedidos como Rep:</strong> {deleteImpact.ordersAsRepresentativeCount}</p>
                  <p><strong>Itens de Pedidos:</strong> {deleteImpact.orderItemsCount}</p>
                  <p><strong>Carrinhos Salvos:</strong> {deleteImpact.savedCartsCount}</p>
                  <p><strong>Rascunhos de Pedido:</strong> {deleteImpact.draftOrdersCount}</p>
                  <p><strong>Configurações:</strong> {deleteImpact.settingsCount}</p>
                  <p><strong>Preferências:</strong> {deleteImpact.userPreferencesCount}</p>
                </div>

                {deleteImpact.isBlocked ? (
                  <div className="p-3 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-lg text-xs text-red-800 dark:text-red-200 space-y-1">
                    <p className="font-bold flex items-center gap-1 text-red-700">
                      ⚠️ Exclusão Definitiva Bloqueada
                    </p>
                    <p>{deleteImpact.blockReason}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Para confirmar a exclusão <strong>definitiva e irreversível</strong>, digite exatamente o e-mail do usuário (<strong>{initialData.email}</strong>):
                    </p>
                    <input
                      type="email"
                      value={deleteConfirmEmail}
                      onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                      placeholder={initialData.email}
                      className="w-full p-2.5 border border-red-300 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500 font-mono"
                    />
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmEmail('');
                }}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-slate-800 dark:text-white rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              {deleteImpact && !deleteImpact.isBlocked && (
                <button
                  disabled={isDeletingUser || deleteConfirmEmail.trim().toLowerCase() !== initialData.email.trim().toLowerCase()}
                  onClick={handleConfirmPermanentDelete}
                  className="px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
                >
                  {isDeletingUser && <Loader2 size={14} className="animate-spin" />}
                  Confirmar Exclusão Definitiva
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
