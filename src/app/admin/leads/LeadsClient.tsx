'use client';

import React, { useState, useTransition } from 'react';
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
  MoreVertical,
  Calendar,
  Layers,
  Trash2,
  Eye,
  RefreshCw,
  Tag,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  getAdminLeadsAction,
  updateLeadStatusAction,
  toggleLeadHandledAction,
  deleteLeadAction,
  LeadItem,
  LeadMetrics,
  LeadFilterParams,
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

  const [isPending, startTransition] = useTransition();

  // Filtros locais
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actingTypeFilter, setActingTypeFilter] = useState<string>('all');
  const [handledFilter, setHandledFilter] = useState<string>('all');

  // Lead selecionado para Drawer de detalhes
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);

  // Lead selecionado para exclusão de spam/teste
  const [leadToDelete, setLeadToDelete] = useState<LeadItem | null>(null);

  // Lead para alteração de status
  const [leadToUpdateStatus, setLeadToUpdateStatus] = useState<LeadItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('in_contact');

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

  // Formatador de link seguro do WhatsApp (https://wa.me/55...)
  const formatWhatsappUrl = (phone: string | null) => {
    if (!phone) return null;
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 10) return null;
    const fullNumber = cleanDigits.startsWith('55') ? cleanDigits : `55${cleanDigits}`;
    return `https://wa.me/${fullNumber}?text=${encodeURIComponent('Olá! Vi seu cadastro no RepVendas e gostaria de conversar.')}`;
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

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <UserCheck className="text-primary" size={28} />
            Gestão de Leads de Vendas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Acompanhamento em tempo real dos leads capturados na Landing Page, UTMs, contatos e funil comercial.
          </p>
        </div>

        <button
          onClick={() => fetchLeads()}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={isPending ? 'animate-spin' : ''} />
          Atualizar Dados
        </button>
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

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atendidos</span>
            <UserCheck className="text-indigo-500" size={18} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{metrics.handledCount}</p>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por Nome, WhatsApp, E-mail ou Empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchLeads({ status: e.target.value, page: 1 });
            }}
            className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="lead_captured">Capturado (Novo)</option>
            <option value="account_created">Conta Criada</option>
            <option value="onboarding_started">Onboarding Iniciado</option>
            <option value="activated">Ativado (Sistema)</option>
            <option value="in_contact">Em Contato (CRM)</option>
            <option value="converted">Convertido (CRM)</option>
            <option value="discarded">Descartado (CRM)</option>
          </select>

          <select
            value={actingTypeFilter}
            onChange={(e) => {
              setActingTypeFilter(e.target.value);
              fetchLeads({ actingType: e.target.value, page: 1 });
            }}
            className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Todas Atuações</option>
            <option value="representante">Representantes</option>
            <option value="distribuidora">Distribuidoras</option>
            <option value="industria">Indústrias</option>
            <option value="outro">Outros</option>
          </select>

          <select
            value={handledFilter}
            onChange={(e) => {
              setHandledFilter(e.target.value);
              const boolVal = e.target.value === 'true' ? true : e.target.value === 'false' ? false : null;
              fetchLeads({ handled: boolVal, page: 1 });
            }}
            className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Todos Atendimentos</option>
            <option value="true">Apenas Atendidos</option>
            <option value="false">Apenas Não Atendidos</option>
          </select>

          <button
            type="submit"
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            Filtrar
          </button>
        </div>
      </form>

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
                <th className="p-4 pr-6 text-right">Ações</th>
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
                              className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-md font-bold text-[11px] hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
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
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedLead(lead)}
                            title="Ver Detalhes e UTMs"
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => {
                              setLeadToUpdateStatus(lead);
                              setTargetStatus(lead.status === 'in_contact' ? 'converted' : 'in_contact');
                            }}
                            title="Alterar Status Comercial"
                            className="p-1.5 text-slate-400 hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Tag size={16} />
                          </button>

                          <button
                            onClick={() => setLeadToDelete(lead)}
                            title="Excluir (Spam/Teste)"
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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

      {/* Drawer de Detalhes do Lead (UTMs, Origem e Metadados) */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 h-full p-6 overflow-y-auto shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-slate-800 mb-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Detalhes do Lead</h2>
                  <p className="text-xs text-slate-400">{selectedLead.id}</p>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="bg-gray-50 dark:bg-slate-900 p-3.5 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Contato</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.name || 'Sem nome'}</p>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">{selectedLead.email || 'Sem e-mail'}</p>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">{selectedLead.whatsapp || 'Sem WhatsApp'}</p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-900 p-3.5 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Negócio</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Atuação: {getActingTypeLabel(selectedLead.acting_type)}</p>
                  <p className="text-slate-600 dark:text-slate-400">Empresa: {selectedLead.company_name || 'Não informada'}</p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-900 p-3.5 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Origem & UTMs</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Source (Origem): {selectedLead.source || selectedLead.utm_source || 'Direto / Desconhecido'}</p>
                  <p className="text-slate-500 mt-1">UTM Medium: {selectedLead.utm_medium || '—'}</p>
                  <p className="text-slate-500">UTM Campaign: {selectedLead.utm_campaign || '—'}</p>
                  <p className="text-slate-500">UTM Content: {selectedLead.utm_content || '—'}</p>
                  <p className="text-slate-500">UTM Term: {selectedLead.utm_term || '—'}</p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-900 p-3.5 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Auditoria & Identificadores</span>
                  <p className="text-slate-600 dark:text-slate-300">Status: {selectedLead.status}</p>
                  <p className="text-slate-600 dark:text-slate-300">Atendido: {selectedLead.handled ? 'Sim' : 'Não'}</p>
                  <p className="text-slate-600 dark:text-slate-300">Submission ID: {selectedLead.submission_id || '—'}</p>
                  <p className="text-slate-600 dark:text-slate-300">User ID: {selectedLead.user_id || 'Nenhum usuário vinculado'}</p>
                  <p className="text-slate-400 text-[11px] mt-1">Criado em: {new Date(selectedLead.created_at).toLocaleString('pt-BR')}</p>
                  <p className="text-slate-400 text-[11px]">Atualizado em: {new Date(selectedLead.updated_at).toLocaleString('pt-BR')}</p>
                </div>

                {selectedLead.metadata && Object.keys(selectedLead.metadata).length > 0 && (
                  <div className="bg-gray-50 dark:bg-slate-900 p-3.5 rounded-xl border border-gray-100 dark:border-slate-800">
                    <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Metadados JSON</span>
                    <pre className="text-[10px] bg-slate-900 text-emerald-400 p-2 rounded-lg overflow-x-auto font-mono">
                      {JSON.stringify(selectedLead.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedLead(null)}
                className="w-full py-2.5 bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Atualização de Status Comercial */}
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

            <p className="text-[11px] text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg border border-blue-100 dark:border-blue-800">
              Nota: Os status automáticos do funil (como Ativado) são controlados pelo sistema e não podem ser forçados manualmente.
            </p>

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

      {/* Modal de Confirmação de Exclusão Física (Spam/Teste) */}
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
            <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950 p-2.5 rounded-lg border border-red-100 dark:border-red-900 font-semibold">
              Esta ação apaga permanentemente o registro e deve ser usada apenas para spam ou testes. Para encerrar o atendimento de leads reais, use o status &quot;Descartado&quot;.
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
