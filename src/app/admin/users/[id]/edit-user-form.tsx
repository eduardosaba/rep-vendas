'use client';

import { useActionState, useState, useRef, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
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
  X,
  Loader2,
} from 'lucide-react';

import { toast } from 'sonner';

// --- COMPONENTES UI AUXILIARES ---
function SubmitButton({
  label = 'Salvar Alterações',
  loadingLabel = 'Salvando...',
  variant = 'primary',
}: {
  label?: string;
  loadingLabel?: string;
  variant?: 'primary' | 'danger';
}) {
  const { pending } = useFormStatus();

  const baseStyles =
    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
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
        <span className="flex items-center gap-2">
          <Loader2 className="animate-spin h-4 w-4" />
          {loadingLabel}
        </span>
      ) : (
        <>
          {variant === 'primary' ? <Save size={16} /> : null}
          {label}
        </>
      )}
    </button>
  );
}

function FormFeedback({ state }: { state: any }) {
  useEffect(() => {
    if (state?.success) toast.success(state.message);
    if (state?.error) toast.error(state.error);
  }, [state]);
  return null;
}

// --- PROPS ---
interface EditUserFormProps {
  userId: string;
  initialData: {
    email: string; // Necessário para a confirmação
    fullName: string;
    role: string;
    plan: string;
    status: string;
    endsAt: string;
  };
  availablePlans: any[];
}

const initialState = { success: false, message: '', error: '' };

export function EditUserForm({
  userId,
  initialData,
  availablePlans,
}: EditUserFormProps) {
  const router = useRouter();

  // Estados do Modal de Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Ações de Formulário
  const updateProfileBind = updateUserProfile.bind(null, userId);
  const [profileState, profileAction] = useActionState(
    updateProfileBind,
    initialState
  );

  const updateLicenseBind = updateUserLicense.bind(null, userId);
  const [licenseState, licenseAction] = useActionState(
    updateLicenseBind,
    initialState
  );

  const resetPassBind = adminResetPassword.bind(null, userId);
  const [passState, passAction] = useActionState(resetPassBind, initialState);
  const passFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (passState?.success) passFormRef.current?.reset();
  }, [passState]);

  // Lógica de Exclusão Segura
  const handleConfirmDelete = async () => {
    if (deleteConfirmation !== initialData.email) return;

    setIsDeleting(true);
    const toastId = toast.loading('Excluindo usuário e limpando dados...');

    try {
      const res = await deleteUser(userId);

      if (res.success) {
        toast.success(res.message, { id: toastId });
        setIsDeleteModalOpen(false);
        router.push('/admin/users'); // Redireciona para a lista
      } else {
        toast.error(res.error, { id: toastId });
        setIsDeleting(false);
      }
    } catch (err) {
      toast.error('Ocorreu um erro inesperado.', { id: toastId });
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <FormFeedback state={profileState} />
      <FormFeedback state={licenseState} />
      <FormFeedback state={passState} />

      {/* CARD 1: DADOS PESSOAIS */}
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
                placeholder="Ex: João Silva"
                className="w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Nível de Acesso (Role)
              </label>
              <select
                name="role"
                defaultValue={initialData.role}
                className="w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="rep">Representante (Padrão)</option>
                <option value="admin">Administrador</option>
                <option value="master">Master (Super Admin)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <SubmitButton label="Salvar Dados Pessoais" />
          </div>
        </form>
      </div>

      {/* CARD 2: ASSINATURA */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex items-center gap-2">
          <CreditCard className="text-indigo-600" size={18} />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
            Plano & Licença
          </h2>
        </div>
        <form action={licenseAction} className="p-6 grid gap-6">
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
                {availablePlans && availablePlans.length > 0 ? (
                  availablePlans.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Free">Free</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
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

      {/* CARD 3: SENHA */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 flex items-center gap-2">
          <Lock className="text-red-500" size={18} />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
            Segurança & Acesso
          </h2>
        </div>
        <form
          ref={passFormRef}
          action={passAction}
          className="p-6 flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Redefinir Senha do Usuário
            </label>
            <div className="relative">
              <KeyRound
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                name="new_password"
                placeholder="Digite a nova senha..."
                autoComplete="new-password"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
              <AlertTriangle size={10} />
              Isso desconectará o usuário de todos os dispositivos.
            </p>
          </div>
          <SubmitButton
            label="Redefinir Senha"
            loadingLabel="Alterando..."
            variant="danger"
          />
        </form>
      </div>

      {/* CARD 4: ZONA DE PERIGO (ABRIR MODAL) */}
      <div className="bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900 overflow-hidden mt-8">
        <div className="p-4 border-b border-red-200 dark:border-red-900 flex items-center gap-2">
          <AlertTriangle
            className="text-red-600 dark:text-red-500"
            size={18}
          />
          <h2 className="font-bold text-red-700 dark:text-red-500 text-sm">
            Zona de Perigo
          </h2>
        </div>

        <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-red-900 dark:text-red-200">
              Excluir Usuário
            </h3>
            <p className="text-xs text-red-600/80 dark:text-red-400 mt-1 max-w-md">
              Uma vez excluído, não há volta. Isso removerá permanentemente a
              conta, os catálogos, produtos e o histórico de assinaturas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <Trash2 size={16} />
            Excluir Conta
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO (CUSTOM DIALOG) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl border border-gray-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Cabeçalho */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} />
                Confirmar Exclusão
              </h3>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Corpo */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Esta ação <strong>não pode ser desfeita</strong>. Isso excluirá
                permanentemente o usuário <strong>{initialData.email}</strong>,
                seus catálogos e todos os dados associados.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Digite o email do usuário para confirmar
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={initialData.email}
                  className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-red-500 text-sm font-mono"
                  autoFocus
                />
              </div>
            </div>

            {/* Rodapé */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteConfirmation !== initialData.email || isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Excluindo...
                  </>
                ) : (
                  'Entendo as consequências, excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}