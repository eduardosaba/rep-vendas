'use client';

import React, { useState, useTransition, useMemo } from 'react';
import {
  Users,
  UserCheck,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ExternalLink,
  MessageSquare,
  Calendar,
  Layers,
  Trash2,
  Eye,
  RefreshCw,
  Tag,
  Clock,
  Sparkles,
  Kanban,
  List,
  BarChart3,
  Send,
  PlusCircle,
  AlertTriangle,
  History,
  FileText,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  getAdminLeadsAction,
  updateLeadStatusAction,
  toggleLeadHandledAction,
  deleteLeadAction,
  saveLeadDossierAction,
  extendLeadTrialAction,
  LeadItem,
  LeadMetrics,
  LeadFilterParams,
  LeadDossierPayload,
} from './actions';
import { toast } from 'sonner';

interface LeadsClientProps {
  initialLeads: LeadItem[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  initialTotalPages: number;
  initialMetrics: LeadMetrics;
}

type TabMode = 'list' | 'kanban' | 'metrics';

const PIPELINE_STAGES = [
  { id: 'novo', label: 'Novos Leads', color: 'border-blue-400 bg-blue-50/40 text-blue-800' },
  { id: 'em_contato', label: 'Primeiro Contato', color: 'border-amber-400 bg-amber-50/40 text-amber-800' },
  { id: 'demonstracao', label: 'Em Demonstração', color: 'border-purple-400 bg-purple-50/40 text-purple-800' },
  { id: 'negociacao', label: 'Em Negociação', color: 'border-indigo-400 bg-indigo-50/40 text-indigo-800' },
  { id: 'convertido', label: 'Convertido (Cliente)', color: 'border-emerald-400 bg-emerald-50/40 text-emerald-800' },
  { id: 'perdido', label: 'Perdido / Desistente', color: 'border-rose-400 bg-rose-50/40 text-rose-800' },
];

export default function LeadsClient({
  initialLeads,
  initialTotal,
  initialPage,
  initialPageSize,
  initialTotalPages,
  initialMetrics,
}: LeadsClientProps) {
  const [leads, setLeads] = useState<LeadItem[]>(initialLeads);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(initialTotalPages);
  const [metrics, setMetrics] = useState<LeadMetrics>(initialMetrics);

  const [activeTab, setActiveTab] = useState<TabMode>('list');
  const [isPending, startTransition] = useTransition();

  // Filtros locais
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actingTypeFilter, setActingTypeFilter] = useState<string>('all');
  const [handledFilter, setHandledFilter] = useState<string>('all');

  // Prontuário do Lead selecionado
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);

  // Estados do Prontuário
  const [dossierNoteText, setDossierNoteText] = useState('');
  const [dossierNextAction, setDossierNextAction] = useState('');
  const [dossierNextDate, setDossierNextDate] = useState('');
  const [dossierObjection, setDossierObjection] = useState('');
  const [dossierLossReason, setDossierLossReason] = useState('');
  const [dossierStage, setDossierStage] = useState<any>('novo');

  // Extensão de teste
  const [isExtendTrialModalOpen, setIsExtendTrialModalOpen] = useState(false);
  const [extendDays, setExtendDays] = useState(7);
  const [extendReason, setExtendReason] = useState('Acompanhamento comercial para teste do catálogo');

  // Modais de exclusão e status
  const [leadToDelete, setLeadToDelete] = useState<LeadItem | null>(null);
  const [leadToUpdateStatus, setLeadToUpdateStatus] = useState<LeadItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('in_contact');

  // Sincroniza formulário do prontuário ao selecionar um lead
  const handleOpenDossier = (lead: LeadItem) => {
    setSelectedLead(lead);
    const meta = lead.metadata || {};
    setDossierNoteText('');
    setDossierNextAction(meta.nextAction || '');
    setDossierNextDate(meta.nextContactDate || '');
    setDossierObjection(meta.objection || '');
    setDossierLossReason(meta.lossReason || '');
    setDossierStage(meta.commercialStage || (lead.status === 'converted' ? 'convertido' : lead.status === 'discarded' ? 'perdido' : 'novo'));
  };

  // Recarregar dados com filtros
  const fetchLeads = (newParams: Partial<LeadFilterParams> = {}) => {
    const queryParams: LeadFilterParams = {
      search: newParams.search !== undefined ? newParams.search : search,
      status: newParams.status !== undefined ? newParams.status : statusFilter,
      actingType: newParams.actingType !== undefined ? newParams.actingType : actingTypeFilter,
      handled:
        newParams.handled !== undefined
          ? newParams.handled
          : handledFilter === 'true'
          ? true
          : handledFilter === 'false'
          ? false
          : null,
      page: newParams.page !== undefined ? newParams.page : page,
      pageSize: initialPageSize,
    };

    startTransition(async () => {
      const res = await getAdminLeadsAction(queryParams);
      if (res.success) {
        setLeads(res.leads);
        setTotal(res.total);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setMetrics(res.metrics);
      } else {
        toast.error(res.error || 'Falha ao carregar leads');
      }
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads({ page: 1 });
  };

  // Alternar a flag handled (tratamento humano)
  const handleToggleHandled = (lead: LeadItem) => {
    const newHandled = !lead.handled;
    startTransition(async () => {
      const res = await toggleLeadHandledAction(lead.id, newHandled);
      if (res.success) {
        toast.success(`Atendimento ${newHandled ? 'marcado como concluído' : 'reaberto'}`);
        setLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? { ...l, handled: newHandled, updated_at: new Date().toISOString() } : l))
        );
        setMetrics((prev) => ({
          ...prev,
          handledCount: newHandled ? prev.handledCount + 1 : Math.max(0, prev.handledCount - 1),
        }));
      } else {
        toast.error(res.error || 'Erro ao alterar flag de atendimento');
      }
    });
  };

  // Alterar status comercial
  const handleConfirmStatusUpdate = () => {
    if (!leadToUpdateStatus) return;

    startTransition(async () => {
      const res = await updateLeadStatusAction(leadToUpdateStatus.id, targetStatus);
      if (res.success) {
        toast.success('Status do lead atualizado com sucesso');
        setLeadToUpdateStatus(null);
        fetchLeads();
      } else {
        toast.error(res.error || 'Erro ao atualizar status');
      }
    });
  };

  // Salvar dados do prontuário
  const handleSaveDossier = () => {
    if (!selectedLead) return;

    const payload: LeadDossierPayload = {
      notes: dossierNoteText,
      nextAction: dossierNextAction,
      nextContactDate: dossierNextDate,
      objection: dossierObjection,
      lossReason: dossierLossReason,
      commercialStage: dossierStage,
    };

    startTransition(async () => {
      const res = await saveLeadDossierAction(selectedLead.id, payload);
      if (res.success) {
        toast.success('Prontuário do lead atualizado!');
        setDossierNoteText('');
        fetchLeads();
      } else {
        toast.error(res.error || 'Erro ao salvar prontuário');
      }
    });
  };

  // Estender período de teste com confirmação e justificativa
  const handleConfirmExtendTrial = () => {
    if (!selectedLead) return;

    startTransition(async () => {
      const res = await extendLeadTrialAction(selectedLead.id, extendDays, extendReason);
      if (res.success) {
        toast.success(`Período de teste estendido em ${extendDays} dias com sucesso!`);
        setIsExtendTrialModalOpen(false);
        fetchLeads();
      } else {
        toast.error(res.error || 'Erro ao estender teste');
      }
    });
  };

  // Exclusão física de spam/teste
  const handleConfirmDelete = () => {
    if (!leadToDelete) return;

    startTransition(async () => {
      const res = await deleteLeadAction(leadToDelete.id);
      if (res.success) {
        toast.success('Lead de spam/teste removido');
        setLeadToDelete(null);
        fetchLeads();
      } else {
        toast.error(res.error || 'Erro ao remover lead');
      }
    });
  };

  // Formatador de link seguro do WhatsApp
  const formatWhatsappUrl = (phone: string | null) => {
    if (!phone) return null;
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 10) return null;
    const fullNumber = cleanDigits.startsWith('55') ? cleanDigits : `55${cleanDigits}`;
    return `https://wa.me/${fullNumber}?text=${encodeURIComponent('Olá! Vi seu cadastro no RepVendas e gostaria de te apresentar o catálogo modelo.')}`;
  };

  // Badge de Status do Funil e Comercial
  const renderStatusBadge = (status: string | null) => {
    const s = status || 'lead_captured';
    const config: Record<string, { label: string; bg: string; text: string; isSystem: boolean }> = {
      lead_captured: { label: 'Capturado', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', isSystem: true },
      account_created: { label: 'Conta Criada', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', isSystem: true },
      onboarding_started: { label: 'Onboarding Inserido', bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', isSystem: true },
      activated: { label: 'Ativado (Sistema)', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', isSystem: true },
      in_contact: { label: 'Em Contato', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', isSystem: false },
      converted: { label: 'Convertido', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', isSystem: false },
      discarded: { label: 'Descartado', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', isSystem: false },
    };

    const current = config[s] || { label: s, bg: 'bg-gray-100', text: 'text-gray-700', isSystem: false };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${current.bg} ${current.text}`}>
        {current.isSystem ? <Sparkles size={11} /> : <Tag size={11} />}
        {current.label}
      </span>
    );
  };

  const getActingTypeLabel = (type: string | null) => {
    const map: Record<string, string> = {
      representante: 'Representante',
      distribuidora: 'Distribuidora',
      industria: 'Indústria',
      outro: 'Outro',
    };
    return map[type || ''] || type || 'Não Informado';
  };

  // Agrupamento para visão Kanban
  const kanbanColumns = useMemo(() => {
    const grouped: Record<string, LeadItem[]> = {
      novo: [],
      em_contato: [],
      demonstracao: [],
      negociacao: [],
      convertido: [],
      perdido: [],
    };

    leads.forEach((lead) => {
      const stage = (lead.metadata?.commercialStage as string) || (lead.status === 'converted' ? 'convertido' : lead.status === 'discarded' ? 'perdido' : lead.status === 'in_contact' ? 'em_contato' : 'novo');
      if (grouped[stage]) {
        grouped[stage].push(lead);
      } else {
        grouped['novo'].push(lead);
      }
    });

    return grouped;
  }, [leads]);

  // Taxas de Ativação e Conversão
  const activationRate = metrics.total > 0 ? Math.round((metrics.converted / metrics.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 font-sans">
      {/* Header com Navegação de Abas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A46431] mb-1">
            <ShieldCheck size={14} /> Torre de Controle Administrativa
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <UserCheck className="text-[#A46431]" size={30} />
            Leads, Ativação & Conversões
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe a jornada de ativação dos representantes, pipeline comercial, demonstrações e conversão em assinaturas.
          </p>
        </div>

        {/* Alternância de Abas e Atualização */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <List size={14} /> Lista Detalhada
            </button>

            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Kanban size={14} /> Pipeline Comercial
            </button>

            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'metrics'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <BarChart3 size={14} /> Indicadores
            </button>
          </div>

          <button
            onClick={() => fetchLeads()}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* 5 Cards de Métricas Globais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Leads</span>
            <Users className="text-blue-500" size={18} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{metrics.total}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Novos</span>
            <Sparkles className="text-sky-500" size={18} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{metrics.newLeads}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Em Contato</span>
            <PhoneCall className="text-amber-500" size={18} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{metrics.inContact}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Convertidos</span>
            <CheckCircle2 className="text-emerald-500" size={18} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{metrics.converted}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atendidos</span>
            <CheckCircle2 className="text-indigo-500" size={18} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{metrics.handledCount}</p>
        </div>
      </div>

      {/* ABA 1: LISTA DETALHADA */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* Barra de Filtros e Busca */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email, WhatsApp ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary"
              />
            </form>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Filtro Status */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  fetchLeads({ status: e.target.value, page: 1 });
                }}
                className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="lead_captured">Capturado</option>
                <option value="account_created">Conta Criada</option>
                <option value="activated">Ativado</option>
                <option value="in_contact">Em Contato</option>
                <option value="converted">Convertido</option>
                <option value="discarded">Descartado</option>
              </select>

              {/* Filtro Atuação */}
              <select
                value={actingTypeFilter}
                onChange={(e) => {
                  setActingTypeFilter(e.target.value);
                  fetchLeads({ actingType: e.target.value, page: 1 });
                }}
                className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">Todas Atuações</option>
                <option value="representante">Representante</option>
                <option value="distribuidora">Distribuidora</option>
                <option value="industria">Indústria</option>
                <option value="outro">Outro</option>
              </select>

              {/* Filtro Atendido */}
              <select
                value={handledFilter}
                onChange={(e) => {
                  setHandledFilter(e.target.value);
                  fetchLeads({ handled: e.target.value === 'true' ? true : e.target.value === 'false' ? false : null, page: 1 });
                }}
                className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">Atendimento: Todos</option>
                <option value="true">Atendido (Sim)</option>
                <option value="false">Pendente (Não)</option>
              </select>
            </div>
          </div>

          {/* Tabela de Leads */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="p-4 pl-6">Nome & E-mail</th>
                    <th className="p-4">WhatsApp / Ação</th>
                    <th className="p-4">Atuação & Empresa</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Atendido</th>
                    <th className="p-4">Data Captura</th>
                    <th className="p-4 pr-6 text-right">Prontuário</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-xs">
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 font-medium">
                        Nenhum lead encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => {
                      const waUrl = formatWhatsappUrl(lead.whatsapp);

                      return (
                        <tr key={lead.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 pl-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {lead.name || 'Sem nome'}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 text-xs">{lead.email || '—'}</span>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700 dark:text-slate-300">{lead.whatsapp || '—'}</span>
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-md font-bold text-[11px] hover:bg-emerald-100 transition-colors"
                                  title="Abrir no WhatsApp"
                                >
                                  <MessageSquare size={12} />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {getActingTypeLabel(lead.acting_type)}
                              </span>
                              {lead.company_name && (
                                <span className="text-[11px] text-slate-400 italic">{lead.company_name}</span>
                              )}
                            </div>
                          </td>

                          <td className="p-4">{renderStatusBadge(lead.status)}</td>

                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleToggleHandled(lead)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                lead.handled
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                                  : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-gray-200'
                              }`}
                            >
                              {lead.handled ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                              <span>{lead.handled ? 'Sim' : 'Não'}</span>
                            </button>
                          </td>

                          <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">
                            {lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>

                          <td className="p-4 pr-6 text-right">
                            <button
                              onClick={() => handleOpenDossier(lead)}
                              className="px-3 py-1.5 bg-[#0D1B2C] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ml-auto"
                            >
                              <FileText size={13} className="text-[#A46431]" />
                              Prontuário
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Página {page} de {totalPages} ({total} leads)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1 || isPending}
                    onClick={() => fetchLeads({ page: page - 1 })}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={page >= totalPages || isPending}
                    onClick={() => fetchLeads({ page: page + 1 })}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: PIPELINE COMERCIAL (KANBAN) */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {PIPELINE_STAGES.map((col) => {
            const stageLeads = kanbanColumns[col.id] || [];

            return (
              <div
                key={col.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-sm min-h-[500px] flex flex-col"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-slate-400 italic">
                      Nenhum lead nesta etapa
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const waUrl = formatWhatsappUrl(lead.whatsapp);
                      const meta = lead.metadata || {};

                      return (
                        <div
                          key={lead.id}
                          onClick={() => handleOpenDossier(lead)}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-[#A46431] hover:shadow-md transition-all cursor-pointer space-y-2"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                              {lead.name || 'Sem nome'}
                            </span>
                            {meta.objection && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                                Objeção
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 truncate">
                            {lead.company_name || getActingTypeLabel(lead.acting_type)}
                          </div>

                          {meta.nextContactDate && (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              <Calendar size={11} /> Próx: {new Date(meta.nextContactDate).toLocaleDateString('pt-BR')}
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">
                              {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                            </span>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5"
                              >
                                <MessageSquare size={11} /> WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ABA 3: INDICADORES E MÉTRICAS EXECUTIVAS */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Taxa de Conversão em Clientes</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900 dark:text-white">{activationRate}%</span>
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5">
                  <TrendingUp size={12} /> {metrics.converted} de {metrics.total} leads
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Percentual de leads capturados que se tornaram assinantes pagantes confirmados.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Tempo Médio até Ativação</span>
              <div className="text-4xl font-black text-slate-900 dark:text-white">~48h</div>
              <p className="text-xs text-slate-500 mt-2">
                Com o novo catálogo demonstrativo óptico, o Time-to-Value cai para menos de 5 minutos.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Leads que Precisam de Contato</span>
              <div className="text-4xl font-black text-amber-600">
                {Math.max(0, metrics.total - metrics.handledCount)}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Cadastros que ainda não tiveram atendimento humano ou mensagem registrada.
              </p>
            </div>
          </div>

          {/* Gráfico / Tabela de Coortes Históricas */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-4">
              Coortes de Ativação & Histórico de Testes
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3">Coorte (Mês)</th>
                    <th className="p-3">Cadastros de Teste</th>
                    <th className="p-3">Concluíram Onboarding</th>
                    <th className="p-3">Produtos Cadastrados</th>
                    <th className="p-3">Assinaturas Ativas</th>
                    <th className="p-3">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">Setembro 2026</td>
                    <td className="p-3">5 usuários</td>
                    <td className="p-3 text-emerald-600 font-bold">5 (100%)</td>
                    <td className="p-3 text-rose-600 font-bold">0 produtos (Abandono)</td>
                    <td className="p-3 font-semibold">0 assinaturas</td>
                    <td className="p-3 text-slate-500 italic">Encontraram catálogo vazio e sem guia de demonstração.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">Base Histórica</td>
                    <td className="p-3">~20 usuários</td>
                    <td className="p-3 text-emerald-600 font-bold">19 (95%)</td>
                    <td className="p-3 font-bold text-emerald-600">+10.000 produtos reais</td>
                    <td className="p-3 font-extrabold text-emerald-600">~10 representantes pagantes</td>
                    <td className="p-3 text-slate-500 italic">Base consolidada com suporte e setup assistido.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER LATERAL: PRONTUÁRIO INDIVIDUAL DO LEAD */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-slate-950 h-full p-6 overflow-y-auto shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-slate-800">
            <div className="space-y-6">
              {/* Header do Prontuário */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A46431] block">
                    Prontuário Individual do Lead
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedLead.name || 'Lead sem nome'}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">{selectedLead.email}</p>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <XCircle size={22} />
                </button>
              </div>

              {/* Botões Rápidos de Ação: WhatsApp & Extensão de Teste */}
              <div className="flex gap-2">
                {formatWhatsappUrl(selectedLead.whatsapp) && (
                  <a
                    href={formatWhatsappUrl(selectedLead.whatsapp)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageSquare size={15} /> Conversar no WhatsApp
                  </a>
                )}

                {selectedLead.user_id && (
                  <button
                    onClick={() => setIsExtendTrialModalOpen(true)}
                    className="flex-1 py-2.5 bg-[#A46431] hover:bg-[#8e5427] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Clock size={15} /> Estender Teste (+7d)
                  </button>
                )}
              </div>

              {/* Estágio Comercial & Dados do Lead */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Etapa no Pipeline Comercial
                </span>
                <select
                  value={dossierStage}
                  onChange={(e) => setDossierStage(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#A46431]"
                >
                  <option value="novo">Novos Leads</option>
                  <option value="em_contato">Primeiro Contato</option>
                  <option value="demonstracao">Em Demonstração</option>
                  <option value="negociacao">Em Negociação</option>
                  <option value="convertido">Convertido (Cliente Assinante)</option>
                  <option value="perdido">Perdido / Desistente</option>
                </select>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Atuação:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {getActingTypeLabel(selectedLead.acting_type)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Empresa:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 truncate block">
                      {selectedLead.company_name || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Planejamento de Próximo Contato & Objeções */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Acompanhamento & Objeções
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Data do Próximo Contato
                    </label>
                    <input
                      type="date"
                      value={dossierNextDate}
                      onChange={(e) => setDossierNextDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Objeção Identificada
                    </label>
                    <select
                      value={dossierObjection}
                      onChange={(e) => setDossierObjection(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-white"
                    >
                      <option value="">Nenhuma</option>
                      <option value="Preço / Mensalidade">Preço / Mensalidade</option>
                      <option value="Sem tempo para cadastrar">Sem tempo para cadastrar</option>
                      <option value="Já usa outro sistema">Já usa outro sistema</option>
                      <option value="Não atua mais no ramo">Não atua mais no ramo</option>
                      <option value="Outro motivo">Outro motivo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Próxima Ação Planejada
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ligar na sexta para ver se testou o catálogo demo..."
                    value={dossierNextAction}
                    onChange={(e) => setDossierNextAction(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Registro de Nova Anotação & Histórico */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Anotações de Contato
                </span>

                <div className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Escreva anotações da conversa por telefone, WhatsApp ou reunião..."
                    value={dossierNoteText}
                    onChange={(e) => setDossierNoteText(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#A46431]"
                  />

                  <button
                    onClick={handleSaveDossier}
                    disabled={isPending}
                    className="w-full py-2 bg-[#0D1B2C] hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Send size={13} /> Salvar Prontuário & Notas
                  </button>
                </div>

                {/* Linha do tempo de notas anteriores */}
                {selectedLead.metadata?.notesHistory && selectedLead.metadata.notesHistory.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 max-h-48 overflow-y-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Histórico Recente
                    </span>
                    {selectedLead.metadata.notesHistory.map((n: any) => (
                      <div key={n.id} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{n.text}</p>
                        <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                          <span>{n.author}</span>
                          <span>{new Date(n.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-slate-800 mt-6">
              <button
                onClick={() => setSelectedLead(null)}
                className="w-full py-2.5 bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200 text-xs transition-colors"
              >
                Fechar Prontuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXTENSÃO CONTROLADA DE TESTE */}
      {isExtendTrialModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gray-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#A46431]">
              <Clock size={28} />
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Estender Período de Teste
                </h3>
                <p className="text-xs text-slate-400">{selectedLead.name || selectedLead.email}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Conceda dias adicionais de teste para que o representante possa experimentar o catálogo demonstrativo e cadastrar seus primeiros produtos.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Dias Adicionais
                </label>
                <select
                  value={extendDays}
                  onChange={(e) => setExtendDays(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value={7}>+7 Dias (Recomendado)</option>
                  <option value={14}>+14 Dias (Período Completo)</option>
                  <option value={30}>+30 Dias (Excepcional)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Justificativa da Extensão (Obrigatório para Auditoria)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Representante solicitou mais tempo para testar mix de armações..."
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <ShieldCheck size={16} className="shrink-0 mt-0.5" />
              <span>
                Proteção Ativa: Se este usuário tiver uma assinatura paga ativa, o sistema bloqueará a operação automaticamente para proteger os dados financeiros.
              </span>
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <button
                onClick={() => setIsExtendTrialModalOpen(false)}
                className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmExtendTrial}
                disabled={isPending || !extendReason.trim()}
                className="px-5 py-2.5 bg-[#A46431] hover:bg-[#8e5427] text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending ? <RefreshCw size={14} className="animate-spin" /> : null}
                Confirmar Extensão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE STATUS COMERCIAL */}
      {leadToUpdateStatus && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-gray-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Alterar Status Comercial</h3>
            <p className="text-xs text-slate-500">
              Selecione o novo status comercial para <strong className="text-slate-900 dark:text-white">{leadToUpdateStatus.name}</strong>:
            </p>

            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="in_contact">Em Contato (CRM)</option>
              <option value="converted">Convertido (CRM)</option>
              <option value="discarded">Descartado (CRM)</option>
            </select>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setLeadToUpdateStatus(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmStatusUpdate}
                disabled={isPending}
                className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 disabled:opacity-50"
              >
                Salvar Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (SPAM/TESTE) */}
      {leadToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-gray-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 size={24} />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Excluir Lead de Spam/Teste</h3>
            </div>

            <p className="text-xs text-slate-500">
              Tem certeza que deseja remover fisicamente o registro de <strong className="text-slate-900 dark:text-white">{leadToDelete.name || leadToDelete.email}</strong>?
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setLeadToDelete(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 disabled:opacity-50"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
