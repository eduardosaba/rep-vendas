'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  Plus,
  Building2,
  Globe,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Layers,
  LayoutGrid,
  List,
  Search,
  Pencil,
  Trash2,
  Users,
  ExternalLink,
  X,
  Save,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  UserX,
  Activity,
  CheckCircle2,
  Power,
  PowerOff,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import {
  getCompanies,
  createCompanyWithAdmin,
  updateCompanyOrderManagementMode,
  updateCompany,
  deleteCompany,
  toggleCompanyActive,
  getCompanyRepresentatives,
} from './actions';
import {
  runIntegrityAudit,
  repairIntegrityIssues,
  type IntegrityReport,
} from '../integrity/actions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type NewCompanyForm = {
  companyName: string;
  slug: string;
  cnpj: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  orderManagementMode: 'representative' | 'distributor';
};

const initialForm: NewCompanyForm = {
  companyName: '',
  slug: '',
  cnpj: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
  orderManagementMode: 'representative',
};

function slugify(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

export default function CompaniesAdminPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [updatingCompanyId, setUpdatingCompanyId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [newCompany, setNewCompany] = useState<NewCompanyForm>(initialForm);

  // Confirmação para alteração do pacote da distribuidora
  const [pendingModeChange, setPendingModeChange] = useState<{
    companyId: string;
    companyName: string;
    targetMode: 'representative' | 'distributor';
  } | null>(null);

  // Estado para Edição de Distribuidora
  const [editingCompany, setEditingCompany] = useState<{
    id: string;
    name: string;
    slug: string;
    cnpj: string;
    orderManagementMode: 'representative' | 'distributor';
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Estado para Exclusão de Distribuidora
  const [deletingCompany, setDeletingCompany] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado para Visualização de Representantes
  const [viewingRepsCompany, setViewingRepsCompany] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [repsList, setRepsList] = useState<any[]>([]);
  const [isLoadingReps, setIsLoadingReps] = useState(false);

  // Estado para Auditoria de Integridade Multi-tenant
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditReport, setAuditReport] = useState<IntegrityReport | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  useEffect(() => {
    fetchCompanies();
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('admin_companies_view_mode') as 'grid' | 'table';
      if (savedMode === 'grid' || savedMode === 'table') {
        setViewMode(savedMode);
      }
    }
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await getCompanies();
      if (res.success && res.data) setCompanies(res.data as any[]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_companies_view_mode', mode);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createCompanyWithAdmin(newCompany);
      if (res.success) {
        toast.success('Distribuidora e administrador criados com sucesso!');
        setIsModalOpen(false);
        setNewCompany(initialForm);
        setSlugTouched(false);
        fetchCompanies();
      } else {
        toast.error(res.error || 'Erro ao criar distribuidora');
      }
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    setIsUpdating(true);
    try {
      const res = await updateCompany(editingCompany.id, {
        name: editingCompany.name,
        slug: editingCompany.slug,
        cnpj: editingCompany.cnpj,
        orderManagementMode: editingCompany.orderManagementMode,
      });

      if (res.success) {
        toast.success(`Distribuidora "${editingCompany.name}" atualizada com sucesso!`);
        setEditingCompany(null);
        fetchCompanies();
      } else {
        toast.error(res.error || 'Erro ao atualizar distribuidora');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao salvar alterações');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleActive = async (company: { id: string; name: string; is_active?: boolean }) => {
    const nextState = company.is_active === false ? true : false;
    const actionLabel = nextState ? 'reativar' : 'desativar';

    setUpdatingCompanyId(company.id);
    try {
      const res = await toggleCompanyActive(company.id, nextState);
      if (res.success) {
        toast.success(res.message);
        setCompanies((prev) =>
          prev.map((c) => (c.id === company.id ? { ...c, is_active: nextState } : c))
        );
      } else {
        toast.error(res.error || `Erro ao ${actionLabel} distribuidora`);
      }
    } catch (err: any) {
      toast.error(err?.message || `Falha ao ${actionLabel}`);
    } finally {
      setUpdatingCompanyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingCompany) return;

    setIsDeleting(true);
    try {
      const res = await deleteCompany(deletingCompany.id);
      if (res.success) {
        toast.success(`Distribuidora "${deletingCompany.name}" excluída definitivamente!`);
        setDeletingCompany(null);
        fetchCompanies();
      } else {
        toast.error(res.error || 'Não foi possível excluir a distribuidora', {
          duration: 10000,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro inesperado ao excluir');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenRepresentatives = async (company: { id: string; name: string }) => {
    setViewingRepsCompany(company);
    setIsLoadingReps(true);
    try {
      const res = await getCompanyRepresentatives(company.id);
      if (res.success) {
        setRepsList(res.data || []);
      } else {
        toast.error(res.error || 'Erro ao carregar representantes');
      }
    } catch {
      toast.error('Falha ao carregar representantes');
    } finally {
      setIsLoadingReps(false);
    }
  };

  const handleRunAudit = async () => {
    setIsRunningAudit(true);
    try {
      const res = await runIntegrityAudit();
      if (res.success && res.data) {
        setAuditReport(res.data);
        setIsAuditModalOpen(true);
        if (res.data.healthy) {
          toast.success('Auditoria concluída: Nenhuma inconsistência encontrada!');
        } else {
          toast.warning(`Auditoria concluída: ${res.data.totalIssuesCount} inconsistência(s) encontrada(s).`);
        }
      } else {
        toast.error(res.error || 'Erro ao executar auditoria');
      }
    } catch {
      toast.error('Falha ao executar auditoria de integridade');
    } finally {
      setIsRunningAudit(false);
    }
  };

  const handleRepairAudit = async (targetType?: string) => {
    setIsRepairing(true);
    try {
      const res = await repairIntegrityIssues(targetType);
      if (res.success) {
        toast.success(res.message);
        await handleRunAudit();
        fetchCompanies();
      } else {
        toast.error(res.error || 'Erro ao reparar inconsistências');
      }
    } catch {
      toast.error('Falha ao executar reparo');
    } finally {
      setIsRepairing(false);
    }
  };

  const handleChangeMode = async (companyId: string, newMode: 'representative' | 'distributor') => {
    setUpdatingCompanyId(companyId);
    try {
      const res = await updateCompanyOrderManagementMode(companyId, newMode);
      if (res.success) {
        toast.success(
          newMode === 'distributor'
            ? 'Pacote atualizado: B2B Completo (Gestão Centralizada ativada)'
            : 'Pacote atualizado: Catálogo Digital (Autonomia do Representante)'
        );
        setCompanies((prev) =>
          prev.map((c) => (c.id === companyId ? { ...c, order_management_mode: newMode } : c))
        );
      } else {
        toast.error(res.error || 'Erro ao atualizar pacote da distribuidora');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao atualizar');
    } finally {
      setUpdatingCompanyId(null);
    }
  };

  const filteredCompanies = companies.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.slug?.toLowerCase().includes(q) ||
      c.cnpj?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* CABEÇALHO PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="text-indigo-600" size={30} />
            Distribuidoras
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Torre de Controle corporativa: clientes, representantes, pacotes comerciais e governança multi-tenant
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={handleRunAudit}
            disabled={isRunningAudit}
            className="gap-2 text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
          >
            {isRunningAudit ? (
              <Loader2 size={16} className="animate-spin text-indigo-600" />
            ) : (
              <Activity size={16} className="text-indigo-600" />
            )}
            Auditoria de Integridade
          </Button>

          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus size={20} /> Nova Distribuidora
          </Button>
        </div>
      </div>

      {/* BARRA DE FERRAMENTAS: BUSCA E TOGGLE GRID / LISTA */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar por nome, slug ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border rounded-xl text-sm w-full bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {filteredCompanies.length} distribuidora{filteredCompanies.length === 1 ? '' : 's'}
          </span>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => handleToggleViewMode('grid')}
              title="Visualização em Grid"
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <LayoutGrid size={16} />
              <span className="hidden md:inline">Grid</span>
            </button>
            <button
              onClick={() => handleToggleViewMode('table')}
              title="Visualização em Lista"
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <List size={16} />
              <span className="hidden md:inline">Lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* ESTADO VAZIO OU LOADING */}
      {loading ? (
        <div className="flex justify-center items-center py-20 gap-3 text-slate-500">
          <Loader2 className="animate-spin text-indigo-600" size={26} />
          <span>Carregando distribuidoras...</span>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 space-y-3">
          <Building2 size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
            Nenhuma distribuidora encontrada
          </h3>
          <p className="text-sm text-slate-400">
            {search ? 'Tente ajustar os termos da sua busca.' : 'Clique em "Nova Distribuidora" para cadastrar.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* VISUALIZAÇÃO EM GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => {
            const mode = company.order_management_mode || 'representative';
            const isDistributorMode = mode === 'distributor';
            const repsCount = company.representatives_count ?? 0;
            const isActive = company.is_active !== false;

            return (
              <div
                key={company.id}
                className={`p-6 rounded-3xl shadow-sm border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:shadow-md'
                    : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-85'
                }`}
              >
                <div>
                  {/* HEADER DO CARD */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-3 rounded-2xl shrink-0 ${
                          isActive
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        <Building2 size={24} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-slate-800 dark:text-white truncate text-base">
                            {company.name}
                          </h3>
                          {isActive ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              Ativa
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              Desativada
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold uppercase text-slate-500 dark:text-slate-400">
                          {company.slug}
                        </span>
                      </div>
                    </div>

                    {/* BOTÕES DE AÇÕES NO TOPO DO CARD */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          setEditingCompany({
                            id: company.id,
                            name: company.name,
                            slug: company.slug,
                            cnpj: company.cnpj || '',
                            orderManagementMode: mode,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar Distribuidora"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => handleToggleActive(company)}
                        disabled={updatingCompanyId === company.id}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive
                            ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800'
                        }`}
                        title={isActive ? 'Desativar Distribuidora' : 'Reativar Distribuidora'}
                      >
                        {isActive ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>

                      <button
                        onClick={() =>
                          setDeletingCompany({
                            id: company.id,
                            name: company.name,
                            slug: company.slug,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Excluir Definitivamente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* INFORMAÇÕES DE CONTATO E CATÁLOGO */}
                  <div className="space-y-2 mb-4 text-xs text-slate-500 dark:text-slate-400">
                    <a
                      href={`/catalogo/${company.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                    >
                      <Globe size={14} className="shrink-0" />
                      <span className="truncate">repvendas.com.br/catalogo/{company.slug}</span>
                      <ExternalLink size={12} className="shrink-0 ml-0.5" />
                    </a>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="shrink-0" />
                      <span>CNPJ: {company.cnpj || 'Não informado'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="shrink-0" />
                      <span>{repsCount} representante{repsCount === 1 ? '' : 's'} vinculado{repsCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  {/* PACOTE CONTRATADO */}
                  <div className="mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Modelo de Gestão Contratado (Master)
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={mode}
                        disabled={updatingCompanyId === company.id}
                        onChange={(e) => {
                          const targetMode = e.target.value as 'representative' | 'distributor';
                          if (targetMode !== mode) {
                            setPendingModeChange({
                              companyId: company.id,
                              companyName: company.name,
                              targetMode,
                            });
                          }
                        }}
                        className={`w-full text-xs font-bold p-2 rounded-xl border transition-all cursor-pointer ${
                          isDistributorMode
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        <option value="representative">Catálogo Digital (Autonomia do Rep)</option>
                        <option value="distributor">B2B Completo (Aprovação da Distribuidora)</option>
                      </select>
                      {updatingCompanyId === company.id && (
                        <Loader2 size={14} className="animate-spin text-slate-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {isDistributorMode
                        ? 'Exige aprovação formal da distribuidora antes do faturamento.'
                        : 'Representante confirma e transmite pedidos pelo app externo.'}
                    </p>
                  </div>
                </div>

                {/* BOTÕES DO CARD */}
                <div className="pt-2 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenRepresentatives(company)}
                    className="flex-1 text-xs gap-1.5"
                  >
                    <Users size={14} />
                    <span>Ver Representantes ({repsCount})</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISUALIZAÇÃO EM LISTA / TABELA */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse" style={{ minWidth: '980px' }}>
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4">Distribuidora</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">CNPJ</th>
                  <th className="px-6 py-4">Catálogo</th>
                  <th className="px-6 py-4">Modelo de Gestão</th>
                  <th className="px-6 py-4 text-center">Representantes</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCompanies.map((company) => {
                  const mode = company.order_management_mode || 'representative';
                  const isDistributorMode = mode === 'distributor';
                  const repsCount = company.representatives_count ?? 0;
                  const isActive = company.is_active !== false;

                  return (
                    <tr
                      key={company.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        !isActive ? 'opacity-70 bg-slate-50/50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              isActive
                                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            <Building2 size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-white block">
                              {company.name}
                            </span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold uppercase text-slate-500 dark:text-slate-400">
                              {company.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Desativada
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {company.cnpj || '—'}
                      </td>

                      <td className="px-6 py-4">
                        <a
                          href={`/catalogo/${company.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <Globe size={13} />
                          <span>/{company.slug}</span>
                          <ExternalLink size={11} />
                        </a>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            const targetMode = isDistributorMode ? 'representative' : 'distributor';
                            setPendingModeChange({
                              companyId: company.id,
                              companyName: company.name,
                              targetMode,
                            });
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                            isDistributorMode
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 hover:bg-indigo-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                          }`}
                          title="Clique para alternar o pacote contratado"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDistributorMode ? 'bg-indigo-600' : 'bg-emerald-600'
                            }`}
                          />
                          {isDistributorMode ? 'B2B Completo' : 'Catálogo Digital'}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenRepresentatives(company)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                          title="Ver representantes vinculados"
                        >
                          <Users size={13} />
                          <span>{repsCount}</span>
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenRepresentatives(company)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Ver Representantes"
                          >
                            <Users size={16} />
                          </button>
                          <button
                            onClick={() =>
                              setEditingCompany({
                                id: company.id,
                                name: company.name,
                                slug: company.slug,
                                cnpj: company.cnpj || '',
                                orderManagementMode: mode,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Editar Distribuidora"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(company)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isActive
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800'
                            }`}
                            title={isActive ? 'Desativar Distribuidora' : 'Reativar Distribuidora'}
                          >
                            {isActive ? <PowerOff size={16} /> : <Power size={16} />}
                          </button>
                          <button
                            onClick={() =>
                              setDeletingCompany({
                                id: company.id,
                                name: company.name,
                                slug: company.slug,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Excluir Definitivamente"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO DE DISTRIBUIDORA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="text-indigo-600" size={20} />
                Nova Distribuidora
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSlugTouched(false);
                }}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
                <input
                  value={newCompany.companyName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewCompany((prev) => ({
                      ...prev,
                      companyName: name,
                      slug: slugTouched ? prev.slug : slugify(name),
                    }));
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Slug</label>
                <input
                  value={newCompany.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setNewCompany({ ...newCompany, slug: e.target.value });
                  }}
                  onBlur={(e) => {
                    const normalized = slugify(e.target.value);
                    setNewCompany((prev) => ({ ...prev, slug: normalized }));
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CNPJ</label>
                <input
                  value={newCompany.cnpj}
                  onChange={(e) => setNewCompany({ ...newCompany, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Pacote / Modelo de Gestão
                </label>
                <select
                  value={newCompany.orderManagementMode}
                  onChange={(e) =>
                    setNewCompany({
                      ...newCompany,
                      orderManagementMode: e.target.value as any,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm font-semibold"
                >
                  <option value="representative">
                    Catálogo Digital (Autonomia do Rep / Transmissão Externa)
                  </option>
                  <option value="distributor">
                    B2B Completo (Aprovação Centralizada da Distribuidora)
                  </option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Administrador da Distribuidora</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Admin</label>
                    <input
                      value={newCompany.adminName}
                      onChange={(e) => setNewCompany({ ...newCompany, adminName: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail do Admin</label>
                    <input
                      type="email"
                      value={newCompany.adminEmail}
                      onChange={(e) => setNewCompany({ ...newCompany, adminEmail: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha Provisória</label>
                    <input
                      type="password"
                      minLength={8}
                      value={newCompany.adminPassword}
                      onChange={(e) => setNewCompany({ ...newCompany, adminPassword: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSlugTouched(false);
                  }}
                  type="button"
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Criando...
                    </span>
                  ) : (
                    'Criar Distribuidora'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE DISTRIBUIDORA */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="text-indigo-600" size={18} />
                Editar Distribuidora
              </h3>
              <button
                onClick={() => setEditingCompany(null)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nome da Distribuidora *
                </label>
                <input
                  required
                  value={editingCompany.name}
                  onChange={(e) =>
                    setEditingCompany({ ...editingCompany, name: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Slug do Catálogo *
                </label>
                <input
                  required
                  value={editingCompany.slug}
                  onChange={(e) =>
                    setEditingCompany({ ...editingCompany, slug: e.target.value })
                  }
                  onBlur={(e) => {
                    const normalized = slugify(e.target.value);
                    setEditingCompany({ ...editingCompany, slug: normalized });
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  URL: repvendas.com.br/catalogo/{slugify(editingCompany.slug || '')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  CNPJ
                </label>
                <input
                  value={editingCompany.cnpj}
                  onChange={(e) =>
                    setEditingCompany({ ...editingCompany, cnpj: e.target.value })
                  }
                  placeholder="00.000.000/0000-00"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Modelo de Gestão Contratado
                </label>
                <select
                  value={editingCompany.orderManagementMode}
                  onChange={(e) =>
                    setEditingCompany({
                      ...editingCompany,
                      orderManagementMode: e.target.value as any,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm font-semibold"
                >
                  <option value="representative">
                    Catálogo Digital (Autonomia do Representante)
                  </option>
                  <option value="distributor">
                    B2B Completo (Aprovação Centralizada da Distribuidora)
                  </option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Alterações de modelo valem para os novos pedidos criados a partir desta data.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => setEditingCompany(null)}
                  type="button"
                  disabled={isUpdating}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUpdating} className="gap-2">
                  {isUpdating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO DEFINITIVA COM ALERTA RIGOROSO */}
      {deletingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-red-200 dark:border-red-900/50 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-50 dark:bg-red-950/50 rounded-2xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Exclusão Definitiva
                </h3>
                <p className="text-xs text-slate-500">Operação restrita para dados sem dependências</p>
              </div>
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3">
              <p>
                Você solicitou a exclusão definitiva de{' '}
                <strong className="text-slate-900 dark:text-white">{deletingCompany.name}</strong>{' '}
                (<span className="font-mono text-xs">{deletingCompany.slug}</span>).
              </p>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-900 dark:text-amber-300 text-xs space-y-1.5">
                <p className="font-bold">⚠️ Política de Integridade Comercial:</p>
                <p>
                  • A exclusão definitiva é <strong>bloqueada automaticamente</strong> se existirem pedidos, produtos, catálogos, clientes ou representantes vinculados.
                </p>
                <p>
                  • Para distribuidoras operacionais, recomendamos usar a ação <strong>&quot;Desativar Distribuidora&quot;</strong>, que suspende acessos preservando o histórico contábil.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setDeletingCompany(null)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white gap-2 font-bold"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Verificando & Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} /> Excluir se Vazia
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REPRESENTANTES VINCULADOS */}
      {viewingRepsCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl text-indigo-600">
                  <Users size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Representantes Vinculados
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Distribuidora: <strong className="text-slate-800 dark:text-slate-200">{viewingRepsCompany.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingRepsCompany(null)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {isLoadingReps ? (
              <div className="py-12 flex justify-center items-center gap-2 text-slate-500">
                <Loader2 size={20} className="animate-spin text-indigo-600" />
                <span>Buscando representantes...</span>
              </div>
            ) : repsList.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <Users size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nenhum representante vinculado no momento.
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Você pode vincular novos usuários a esta distribuidora criando-os em <strong>Gerenciar Usuários</strong> ou editando o perfil de um usuário existente.
                </p>
                <div className="pt-2">
                  <Link
                    href="/admin/users"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Ir para Gerenciar Usuários <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
                {repsList.map((rep) => (
                  <div
                    key={rep.id}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 px-3 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold shrink-0 text-sm">
                        {rep.email?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 dark:text-white text-sm block truncate">
                          {rep.full_name || rep.email}
                        </span>
                        <span className="text-xs text-slate-400 truncate block">
                          {rep.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {rep.role === 'admin_company' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Admin Distribuidora
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Representante
                        </span>
                      )}

                      {rep.is_active === false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700">
                          <UserX size={11} /> Desativado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          <UserCheck size={11} /> Ativo
                        </span>
                      )}

                      <Link
                        href={`/admin/users/${rep.id}`}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
                        title="Editar Usuário"
                      >
                        <Pencil size={14} />
                        <span className="hidden sm:inline">Editar</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setViewingRepsCompany(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AUDITORIA DE INTEGRIDADE MULTI-TENANT */}
      {isAuditModalOpen && auditReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-2xl ${
                    auditReport.healthy
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                  }`}
                >
                  {auditReport.healthy ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Auditoria de Integridade Multi-Tenant
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Última verificação: {new Date(auditReport.timestamp).toLocaleTimeString('pt-BR')} • {auditReport.stats.totalProfiles} perfis, {auditReport.stats.totalCompanies} distribuidoras
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* STATUS GERAL */}
            <div
              className={`p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border ${
                auditReport.healthy
                  ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {auditReport.healthy ? (
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                )}
                <span className="font-bold text-sm">
                  {auditReport.healthy
                    ? 'Sistema 100% íntegro. Nenhuma inconsistência de vínculo ou organização detectada.'
                    : `${auditReport.totalIssuesCount} inconsistência(s) detectada(s) que podem comprometer isolamento ou permissões.`}
                </span>
              </div>

              {!auditReport.healthy && (
                <Button
                  onClick={() => handleRepairAudit()}
                  disabled={isRepairing}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shrink-0"
                >
                  {isRepairing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Reparando...
                    </>
                  ) : (
                    <>
                      <Wrench size={14} /> Reparar Inconsistências
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* LISTA DE INCONSISTÊNCIAS */}
            {auditReport.issues.length > 0 && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {auditReport.issues.map((iss) => (
                  <div
                    key={iss.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                            iss.severity === 'high'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {iss.severity === 'high' ? 'Crítico' : 'Atenção'}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {iss.description}
                        </span>
                      </div>
                      <p className="text-slate-400 font-mono text-[11px] truncate">
                        ID: {iss.entityId} • Detalhes: {JSON.stringify(iss.details)}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRepairAudit(iss.type)}
                      disabled={isRepairing}
                      className="text-[11px] shrink-0 font-bold h-7 px-2.5"
                    >
                      Reparar Este
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={handleRunAudit}
                disabled={isRunningAudit}
                className="gap-1.5 text-xs font-semibold"
              >
                <RefreshCw size={13} className={isRunningAudit ? 'animate-spin' : ''} />
                Reexecutar Auditoria
              </Button>
              <Button variant="outline" onClick={() => setIsAuditModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE MUDANÇA DE PACOTE */}
      {pendingModeChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl">
                <Layers size={22} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Confirmar Alteração de Pacote
              </h3>
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <p>
                Você está alterando o modelo de gestão de pedidos da distribuidora{' '}
                <strong className="text-slate-900 dark:text-white">{pendingModeChange.companyName}</strong> para:{' '}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {pendingModeChange.targetMode === 'distributor'
                    ? 'B2B Completo (Gestão Centralizada pela Distribuidora)'
                    : 'Catálogo Digital (Autonomia do Representante / Transmissão Externa)'}
                </span>.
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-900 dark:text-amber-300 text-xs font-medium">
                ⚠️ A nova configuração será aplicada aos próximos pedidos. Os pedidos existentes continuarão seguindo o fluxo originalmente registrado no momento de sua criação.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setPendingModeChange(null)}
                disabled={Boolean(updatingCompanyId)}
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  const target = pendingModeChange;
                  setPendingModeChange(null);
                  if (target) {
                    await handleChangeMode(target.companyId, target.targetMode);
                  }
                }}
                disabled={Boolean(updatingCompanyId)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Confirmar Alteração
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
