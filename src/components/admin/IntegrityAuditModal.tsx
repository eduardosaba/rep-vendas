'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wrench,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  runIntegrityAudit,
  repairIntegrityIssues,
  type IntegrityReport,
} from '@/app/admin/integrity/actions';

interface IntegrityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepaired?: () => void;
}

export function IntegrityAuditModal({
  isOpen,
  onClose,
  onRepaired,
}: IntegrityAuditModalProps) {
  const [auditReport, setAuditReport] = useState<IntegrityReport | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      handleRunAudit();
    }
  }, [isOpen]);

  const handleRunAudit = async () => {
    setIsRunningAudit(true);
    const toastId = toast.loading('Executando auditoria multi-tenant...');
    try {
      const res = await runIntegrityAudit();
      if (res.success && res.data) {
        setAuditReport(res.data);
        if (res.data.healthy) {
          toast.success('Auditoria concluída: Sistema 100% íntegro!', { id: toastId });
        } else {
          toast.warning(`Auditoria detectou ${res.data.totalIssuesCount} inconsistência(s).`, {
            id: toastId,
          });
        }
      } else {
        toast.error(res.error || 'Falha ao executar auditoria.', { id: toastId });
      }
    } catch {
      toast.error('Erro de conexão ao executar auditoria.', { id: toastId });
    } finally {
      setIsRunningAudit(false);
    }
  };

  const handleRepairAudit = async (targetType?: string) => {
    setIsRepairing(true);
    const toastId = toast.loading('Aplicando correções de integridade...');
    try {
      const res = await repairIntegrityIssues(targetType);
      if (res.success) {
        toast.success(res.message || 'Inconsistências reparadas com sucesso!', { id: toastId });
        await handleRunAudit();
        if (onRepaired) onRepaired();
      } else {
        toast.error(res.error || 'Falha ao aplicar correções.', { id: toastId });
      }
    } catch {
      toast.error('Erro ao executar reparos.', { id: toastId });
    } finally {
      setIsRepairing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl ${
                auditReport?.healthy
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
              }`}
            >
              {auditReport?.healthy ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Auditoria de Integridade Multi-Tenant
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {auditReport ? (
                  <>
                    Última verificação: {new Date(auditReport.timestamp).toLocaleTimeString('pt-BR')} •{' '}
                    {auditReport.stats.totalProfiles} perfis, {auditReport.stats.totalCompanies} distribuidoras
                  </>
                ) : (
                  'Carregando diagnóstico do sistema...'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* LOADING STATE */}
        {isRunningAudit && !auditReport && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Cruzando tabelas de perfis, distribuidoras e permissões...</p>
          </div>
        )}

        {/* STATUS GERAL */}
        {auditReport && (
          <>
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
          </>
        )}

        {/* RODAPÉ */}
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
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
