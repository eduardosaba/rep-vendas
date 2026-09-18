'use client';

import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  HelpCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  analyzeSpreadsheetAction,
  createJobAction,
  getJobFailuresAction,
  previewEngineAction,
  processBatchChunkAction,
  rollbackJobAction,
} from '@/modules/product-update-engine/application/actions';
import { UPDATE_FIELD_REGISTRY, TargetLayer, getFieldDefinition } from '@/modules/product-update-engine/domain/field-registry';
import {
  AnalyzeSpreadsheetResult,
  EngineConfiguration,
  NormalizerRule,
  PreviewEngineResult,
  StructuredOperationType,
  ValueSourceType,
} from '@/modules/product-update-engine/domain/types';

interface SmartUpdateClientProps {
  availableCompanies: { id: string; name: string }[];
  availableUsers: { id: string; email: string; full_name?: string }[];
  availableBrands?: { id: string; name: string }[];
  availableScopes?: string[];
  userRole?: string;
  currentUserId?: string;
}

export function SmartUpdateClient({
  availableUsers,
  availableBrands = [],
}: SmartUpdateClientProps) {
  // Step Tracker State
  const [step, setStep] = useState<number>(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<number>(1);

  const advanceToStep = (nextStep: number) => {
    setMaxUnlockedStep((current) => Math.max(current, nextStep));
    setStep(nextStep);
  };

  const handleStepClick = (targetStep: number) => {
    if (isExecuting) return;
    if (targetStep <= maxUnlockedStep) {
      setStep(targetStep);
    }
  };

  // Step 1 State: File & Sheet Analysis
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeData, setAnalyzeData] = useState<AnalyzeSpreadsheetResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Step 2 State: Identification (Spreadsheet Column -> DB Field)
  const [spreadsheetColumn, setSpreadsheetColumn] = useState<string>('');
  const [dbField, setDbField] = useState<'reference_code' | 'reference_id' | 'sku' | 'barcode'>('reference_code');
  const [normalizations, setNormalizations] = useState<NormalizerRule[]>(['trim', 'uppercase']);

  // Step 3 State: Actions to Update
  const [actions, setActions] = useState<{
    targetLayer: TargetLayer;
    targetField: string;
    operation: StructuredOperationType;
    valueSource: ValueSourceType;
    sourceColumn?: string;
    fixedValue?: any;
  }[]>([
    {
      targetLayer: 'global',
      targetField: 'price',
      operation: 'set',
      valueSource: 'spreadsheet',
      sourceColumn: '',
    },
  ]);

  // Step 4 State: Brand Filter (Spreadsheet Rows Filter)
  const [brandFilterMode, setBrandFilterMode] = useState<'all' | 'specific'>('all');
  const [selectedBrandName, setSelectedBrandName] = useState<string>('');
  const [spreadsheetBrandColumn, setSpreadsheetBrandColumn] = useState<string>('');

  // Step 5 State: User Scope (Destination Products Filter)
  const [userFilterMode, setUserFilterMode] = useState<'all' | 'specific'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Step 6 State: Preview Results
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewEngineResult | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [omitUnmatched, setOmitUnmatched] = useState(true);
  const [omitNoChanges, setOmitNoChanges] = useState(true);

  // Step 7 State: Execution Progress
  const [jobId, setJobId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [execStats, setExecStats] = useState({ processed: 0, applied: 0, skipped: 0, failed: 0 });

  // Step 8 State: Rollback & Failure Details
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackResult, setRollbackResult] = useState<{ success: boolean; rolledBack: number; conflicts: number; errors: string[] } | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showFailureDetails, setShowFailureDetails] = useState(false);
  const [jobFailures, setJobFailures] = useState<{ rowNumber: number; targetField: string; oldValue: any; newValue: any; errorMessage: string; status: string }[]>([]);

  React.useEffect(() => {
    if (step === 8 && jobId) {
      getJobFailuresAction(jobId).then((failures) => {
        setJobFailures(failures);
      });
    }
  }, [step, jobId]);

  // Auto-detect brand column and unique brand values from sample spreadsheet rows
  const detectedBrandsInSpreadsheet = useMemo(() => {
    const brandSet = new Set<string>();

    if (analyzeData?.sampleRows && analyzeData.sampleRows.length > 0) {
      const detectedCol = spreadsheetBrandColumn || analyzeData.columns.find((c) => /marca|brand|fabricante/i.test(c.name))?.name;
      if (detectedCol) {
        analyzeData.sampleRows.forEach((row) => {
          const val = row[detectedCol];
          if (val) brandSet.add(String(val).trim());
        });
      }
    }

    availableBrands.forEach((b) => brandSet.add(b.name));
    return Array.from(brandSet).filter(Boolean).sort();
  }, [analyzeData, spreadsheetBrandColumn, availableBrands]);

  // Filter sample details according to user filter options
  const displayedSampleDetails = useMemo(() => {
    if (!previewResult?.sampleDetails) return [];
    let list = previewResult.sampleDetails;
    if (omitUnmatched) {
      list = list.filter(
        (d) => (d.matchedProductsCount || 0) > 0 || (d.affectedUsersCount || 0) > 0
      );
    }
    if (omitNoChanges) {
      list = list.filter((d) => d.proposedChanges && d.proposedChanges.length > 0);
    }
    return list;
  }, [previewResult, omitUnmatched, omitNoChanges]);

  // Handle File Upload & Analysis
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsAnalyzing(true);
    const fd = new FormData();
    fd.append('file', selectedFile);

    const res = await analyzeSpreadsheetAction(fd);
    setIsAnalyzing(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    setAnalyzeData(res);
    setSelectedSheet(res.selectedSheet || res.sheets[0] || '');

    if (res.columns.length > 0) {
      const refCodeCol = res.columns.find((c) => /reference_code|ref_code|referencia|ref|codigo/i.test(c.name))?.name;
      const refIdCol = res.columns.find((c) => /reference_id|ref_id|model_code|modelo/i.test(c.name))?.name;
      const skuCol = res.columns.find((c) => /^sku$/i.test(c.name))?.name;
      const barcodeCol = res.columns.find((c) => /barcode|ean|gtin|codigo_barras/i.test(c.name))?.name;

      if (refCodeCol) {
        setSpreadsheetColumn(refCodeCol);
        setDbField('reference_code');
      } else if (refIdCol) {
        setSpreadsheetColumn(refIdCol);
        setDbField('reference_id');
      } else if (skuCol) {
        setSpreadsheetColumn(skuCol);
        setDbField('sku');
      } else if (barcodeCol) {
        setSpreadsheetColumn(barcodeCol);
        setDbField('barcode');
      } else {
        setSpreadsheetColumn(res.columns[0].name);
        setDbField('reference_code');
      }

      const brandCol = res.columns.find((c) => /marca|brand|fabricante/i.test(c.name))?.name;
      if (brandCol) setSpreadsheetBrandColumn(brandCol);

      // Auto-detect action columns
      const detectedActions: typeof actions = [];
      res.columns.forEach((c) => {
        const colLower = c.name.toLowerCase();
        let targetField = '';
        if (/price|preco|valor/i.test(colLower) && !/custo|promocao|cost|sale/i.test(colLower)) targetField = 'price';
        else if (/is_launch|lancamento/i.test(colLower)) targetField = 'is_launch';
        else if (/is_active|ativo/i.test(colLower)) targetField = 'is_active';
        else if (/reference_id|ref_id|model_code|agrupamento/i.test(colLower)) targetField = 'reference_id';

        if (targetField && !detectedActions.some((a) => a.targetField === targetField)) {
          detectedActions.push({
            targetLayer: 'global',
            targetField,
            operation: 'set',
            valueSource: 'spreadsheet',
            sourceColumn: c.name,
          });
        }
      });

      if (detectedActions.length > 0) {
        setActions(detectedActions);
      }
    }
    advanceToStep(2);
  };

  // Build EngineConfiguration
  const getEngineConfig = (): EngineConfiguration => {
    return {
      sheetName: selectedSheet,
      identifier: {
        spreadsheetColumn,
        dbField,
        normalizations,
      },
      brandScope: {
        mode: brandFilterMode,
        selectedBrandName: brandFilterMode === 'specific' ? selectedBrandName : undefined,
        spreadsheetBrandColumn: spreadsheetBrandColumn || undefined,
      },
      userScope: {
        mode: userFilterMode,
        targetUserIds: userFilterMode === 'specific' ? selectedUsers : undefined,
      },
      actions: actions.map((a) => ({ ...a })),
    };
  };

  // Run Preview
  const handleRunPreview = async () => {
    if (!file) return;

    if (!spreadsheetColumn) {
      toast.warning('Por favor, selecione a coluna da planilha usada para identificar o produto.');
      return;
    }

    setIsPreviewing(true);
    const fd = new FormData();
    fd.append('file', file);

    const configStr = JSON.stringify(getEngineConfig());
    const res = await previewEngineAction(fd, configStr);
    setIsPreviewing(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    setPreviewResult(res);
    advanceToStep(6);
  };

  // Run Batch Execution
  const handleStartExecution = async () => {
    if (!file || !previewResult) return;
    if (previewResult.criticalConfirmationRequired && confirmationInput.trim().toUpperCase() !== 'ATUALIZAR') {
      toast.warning('Por favor, digite ATUALIZAR para confirmar a execução.');
      return;
    }

    advanceToStep(7);
    setIsExecuting(true);

    const configStr = JSON.stringify(getEngineConfig());
    const metrics = {
      matchedProducts: previewResult.matchedProducts || 0,
      affectedOrganizations: previewResult.affectedOrganizations || 0,
      changedProducts: previewResult.changedProducts || 0,
      noChangeProducts: previewResult.noChangeProducts || 0,
      notFoundRows: previewResult.notFoundRows || 0,
      invalidRows: previewResult.invalidRows || 0,
    };

    const createRes = await createJobAction(
      file.name,
      selectedSheet,
      previewResult.totalRows,
      configStr,
      previewResult.fileHash,
      metrics
    );

    if (createRes.error || !createRes.jobId) {
      toast.error(createRes.error || 'Erro ao criar o job de atualização.');
      setIsExecuting(false);
      return;
    }

    const currentJobId = createRes.jobId;
    setJobId(currentJobId);

    const chunkSize = 200;
    const targetTotalRows = previewResult.eligibleRows ?? previewResult.totalRows;
    let totalProcessed = 0;
    let totalApplied = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let executionFailed = false;

    for (let rowIndex = 0; rowIndex < targetTotalRows; rowIndex += chunkSize) {
      const fd = new FormData();
      fd.append('file', file);

      const chunkRes = await processBatchChunkAction(currentJobId, rowIndex, chunkSize, fd);
      if (chunkRes.error) {
        toast.error(`Erro no lote ${rowIndex}: ${chunkRes.error}`);
        executionFailed = true;
        break;
      }

      totalProcessed += chunkRes.processed;
      totalApplied += chunkRes.applied;
      totalSkipped += chunkRes.skipped;
      totalFailed += chunkRes.failed;

      setExecStats({ processed: totalProcessed, applied: totalApplied, skipped: totalSkipped, failed: totalFailed });
      setProgressPercent(Math.min(100, Math.round((totalProcessed / Math.max(1, targetTotalRows)) * 100)));

      if (chunkRes.isCompleted) break;
    }

    setIsExecuting(false);

    if (executionFailed) {
      return;
    }

    advanceToStep(8);
  };

  // Rollback Job
  const handleRollback = async () => {
    if (!jobId) return;
    if (!confirm('Deseja realmente desfazer todas as alterações efetuadas por esta atualização?')) return;

    setIsRollingBack(true);
    const res = await rollbackJobAction(jobId);
    setIsRollingBack(false);
    setRollbackResult(res);
  };

  return (
    <div className="space-y-6">
      {/* STEPPER HEADER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold scrollbar-none py-1">
          {[
            { id: 1, name: '1. Arquivo' },
            { id: 2, name: '2. Identificação' },
            { id: 3, name: '3. Campos a Atualizar' },
            { id: 4, name: '4. Marca' },
            { id: 5, name: '5. Usuários' },
            { id: 6, name: '6. Preview' },
            { id: 7, name: '7. Execução' },
            { id: 8, name: '8. Resultado' },
          ].map((s) => {
            const isCurrent = step === s.id;
            const isCompletedStep = s.id < step;
            const isUnlocked = s.id <= maxUnlockedStep;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleStepClick(s.id)}
                disabled={isExecuting || !isUnlocked}
                className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-bold ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isCompletedStep
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : isUnlocked
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer'
                    : 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-50 dark:bg-slate-900'
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowManualModal(true)}
          className="flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-semibold px-4 py-2 rounded-xl text-xs transition-colors border border-indigo-200 dark:border-indigo-800 shrink-0"
        >
          <HelpCircle size={16} /> Guia do Fluxo
        </button>
      </div>

      {/* STEP 1: ARQUIVO */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-sm">
          <div className="mx-auto w-16 h-16 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-full flex items-center justify-center">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Etapa 1: Importar Planilha Excel</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Selecione o arquivo (.xlsx ou .xls) com as atualizações de catálogo.
            </p>
          </div>

          {isAnalyzing ? (
            <div className="space-y-4 max-w-md mx-auto pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={14} className="animate-spin" /> Lendo colunas e abas da planilha...
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full animate-pulse w-full"></div>
              </div>
            </div>
          ) : (
            <label className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl cursor-pointer transition-colors shadow-sm text-sm">
              <Upload size={18} />
              Escolher Arquivo
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileChange} disabled={isAnalyzing} />
            </label>
          )}
        </div>
      )}

      {/* STEP 2: IDENTIFICAÇÃO DO PRODUTO */}
      {step === 2 && analyzeData && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Etapa 2: Identificação do Produto</h3>
              <p className="text-xs text-slate-500">Escolha exatamente qual coluna da planilha corresponde a qual campo do banco de dados.</p>
            </div>
            {analyzeData.sheets.length > 1 && (
              <select
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="text-xs border rounded-lg p-2 dark:bg-slate-800 dark:border-slate-700"
              >
                {analyzeData.sheets.map((s) => (
                  <option key={s} value={s}>Aba: {s}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Spreadsheet Column Choice */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                1. Coluna da Planilha:
              </label>
              <select
                value={spreadsheetColumn}
                onChange={(e) => setSpreadsheetColumn(e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 font-medium"
              >
                <option value="">Selecione a coluna...</option>
                {analyzeData.columns.map((c) => (
                  <option key={c.name} value={c.name}>
                    [ {c.name} ] ({c.inferredType})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">Coluna que contém a referência ou código único na planilha.</p>
            </div>

            {/* Products DB Field Choice */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                2. Buscar na Tabela products em:
              </label>
              <select
                value={dbField}
                onChange={(e) => setDbField(e.target.value as any)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 font-medium"
              >
                <option value="reference_code">reference_code (Código da Referência, ex: HER 0404/G ZI9)</option>
                <option value="reference_id">reference_id (ID da Referência / Modelo)</option>
                <option value="sku">sku (SKU individual)</option>
                <option value="barcode">barcode (Código de Barras / EAN)</option>
              </select>
              <p className="text-[11px] text-slate-400">O matching buscará rigorosamente neste campo do banco sem substituições automáticas.</p>
            </div>
          </div>

          {/* Normalization Options */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Regras de Normalização (Aplicadas Igualmente nos Dois Lados)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={normalizations.includes('trim') && normalizations.includes('uppercase')}
                  disabled
                  readOnly
                />
                <span className="font-semibold">Padronização Simples (Trim + Maiúsculas - Recomendado)</span>
              </label>

              <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={normalizations.includes('alphanumeric_only')}
                  onChange={(e) => {
                    if (e.target.checked) setNormalizations(['trim', 'uppercase', 'alphanumeric_only']);
                    else setNormalizations(['trim', 'uppercase']);
                  }}
                />
                <span>Limpeza Alfanumérica (Ignorar espaços, barras e caracteres especiais)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-600 text-sm hover:underline font-medium">
              Voltar
            </button>
            <button
              onClick={() => {
                if (!spreadsheetColumn) {
                  toast.warning('Selecione a coluna da planilha antes de avançar.');
                  return;
                }
                advanceToStep(3);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
            >
              Avançar para Campos a Atualizar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CAMPOS A ATUALIZAR */}
      {step === 3 && analyzeData && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Etapa 3: Campos a Atualizar</h3>
              <p className="text-xs text-slate-500">Defina uma ou mais ações de atualização nos produtos localizados.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setActions([
                  ...actions,
                  { targetLayer: 'global', targetField: 'is_active', operation: 'set', valueSource: 'fixed', fixedValue: true },
                ])
              }
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800"
            >
              <Plus size={14} /> Adicionar Ação
            </button>
          </div>

          <div className="space-y-4">
            {actions.map((act, idx) => (
              <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Ação #{idx + 1}</span>
                  {actions.length > 1 && (
                    <button
                      onClick={() => setActions(actions.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Remover
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Campo products</label>
                    <select
                      value={act.targetField}
                      onChange={(e) => {
                        const newKey = e.target.value;
                        const def = getFieldDefinition(act.targetLayer, newKey);
                        const newA = [...actions];
                        newA[idx].targetField = newKey;
                        if (def?.type === 'boolean' && (newA[idx].fixedValue === undefined || newA[idx].fixedValue === '')) {
                          newA[idx].fixedValue = true;
                        }
                        setActions(newA);
                      }}
                      className="w-full text-sm border rounded-xl p-2.5 dark:bg-slate-800 dark:border-slate-700"
                    >
                      {Object.entries(UPDATE_FIELD_REGISTRY.global).map(([key, def]) => (
                        <option key={key} value={key}>
                          {def.label} ({def.column})
                        </option>
                      ))}
                    </select>
                  </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Operação</label>
                      <select
                        value={act.operation}
                        onChange={(e) => {
                          const newA = [...actions];
                          newA[idx].operation = e.target.value as any;
                          setActions(newA);
                        }}
                        className="w-full text-sm border rounded-xl p-2.5 dark:bg-slate-800 dark:border-slate-700"
                      >
                        <option value="set">Definir Valor (set)</option>
                        <option value="derive_base_reference">Derivar Modelo Base (Remover Cor de reference_code)</option>
                        <option value="clear">Limpar Campo (NULL)</option>
                        <option value="add">Somar (add)</option>
                        <option value="subtract">Subtrair (subtract)</option>
                        <option value="multiply">Multiplicar (multiply)</option>
                        <option value="percentage_increase">Aumentar Percentual (%)</option>
                        <option value="percentage_decrease">Reduzir Percentual (%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Origem do Valor</label>
                      <select
                        value={act.valueSource}
                        onChange={(e) => {
                          const newSource = e.target.value as 'spreadsheet' | 'fixed' | 'auto_derive';
                          const def = getFieldDefinition(act.targetLayer, act.targetField);
                          const newA = [...actions];
                          newA[idx].valueSource = newSource;
                          if (newSource === 'fixed' && def?.type === 'boolean' && (newA[idx].fixedValue === undefined || newA[idx].fixedValue === '')) {
                            newA[idx].fixedValue = true;
                          }
                          setActions(newA);
                        }}
                        className="w-full text-sm border rounded-xl p-2.5 dark:bg-slate-800 dark:border-slate-700"
                      >
                        <option value="spreadsheet">Coluna da Planilha</option>
                        <option value="fixed">Valor Fixo</option>
                        <option value="auto_derive">Gerar Automático (Derivar Modelo Base sem Cor)</option>
                      </select>
                    </div>
                  </div>

                  {(act.targetField === 'reference_id' || act.operation === 'derive_base_reference' || act.valueSource === 'auto_derive') && (
                    <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                      <Sparkles size={14} className="shrink-0 text-indigo-500" />
                      <span>
                        <strong>Recalcular Agrupamento:</strong> O sistema irá derivar a referência base (ex: <code>BOSS 1983/S 4C3</code> &rarr; <code>BOSS 1983/S</code>) garantindo que todas as variações de cor fiquem agrupadas sob o mesmo modelo.
                      </span>
                    </div>
                  )}

                {act.valueSource === 'spreadsheet' ? (
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Coluna Origem na Planilha</label>
                    <select
                      value={act.sourceColumn || ''}
                      onChange={(e) => {
                        const newA = [...actions];
                        newA[idx].sourceColumn = e.target.value;
                        setActions(newA);
                      }}
                      className="w-full text-sm border rounded-xl p-2.5 dark:bg-slate-800 dark:border-slate-700 font-medium"
                    >
                      <option value="">Selecione a coluna...</option>
                      {analyzeData.columns.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Valor Fixo</label>
                    {getFieldDefinition(act.targetLayer, act.targetField)?.type === 'boolean' ? (
                      <select
                        value={String(act.fixedValue ?? 'true')}
                        onChange={(e) => {
                          const newA = [...actions];
                          newA[idx].fixedValue = e.target.value === 'true';
                          setActions(newA);
                        }}
                        className="w-full text-sm border border-indigo-200 dark:border-indigo-800 rounded-xl p-2.5 bg-indigo-50/50 dark:bg-indigo-950/40 font-bold text-indigo-700 dark:text-indigo-300"
                      >
                        <option value="true">Sim (true - Ativar Lançamento / Ativo)</option>
                        <option value="false">Não (false - Remover Lançamento / Inativo)</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Ex: 990.00"
                        value={act.fixedValue ?? ''}
                        onChange={(e) => {
                          const newA = [...actions];
                          newA[idx].fixedValue = e.target.value;
                          setActions(newA);
                        }}
                        className="w-full text-sm border rounded-xl p-2.5 dark:bg-slate-800 dark:border-slate-700"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-slate-600 text-sm hover:underline font-medium">
              Voltar
            </button>
            <button onClick={() => advanceToStep(4)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
              Avançar para Marca <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: MARCA */}
      {step === 4 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Etapa 4: Marca (Filtro de Universo da Planilha)</h3>
            <p className="text-xs text-slate-500">A marca é usada para filtrar as linhas da planilha que serão processadas antes do Preview.</p>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <input
                type="radio"
                name="brandFilterMode"
                value="all"
                checked={brandFilterMode === 'all'}
                onChange={() => {
                  setBrandFilterMode('all');
                  setSelectedBrandName('');
                }}
                className="mt-1 text-indigo-600"
              />
              <div>
                <span className="block font-bold text-sm text-slate-900 dark:text-white">Todas as marcas da planilha</span>
                <span className="block text-xs text-slate-500">Processa todas as linhas elegíveis presentes na planilha.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <input
                type="radio"
                name="brandFilterMode"
                value="specific"
                checked={brandFilterMode === 'specific'}
                onChange={() => setBrandFilterMode('specific')}
                className="mt-1 text-indigo-600"
              />
              <div className="w-full">
                <span className="block font-bold text-sm text-slate-900 dark:text-white">Uma marca específica</span>
                <span className="block text-xs text-slate-500">Filtra as linhas da planilha para processar somente a marca selecionada.</span>

                {brandFilterMode === 'specific' && (
                  <div className="mt-3 space-y-3">
                    <select
                      value={selectedBrandName}
                      onChange={(e) => setSelectedBrandName(e.target.value)}
                      className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 font-medium"
                    >
                      <option value="">Selecione a marca...</option>
                      {detectedBrandsInSpreadsheet.map((bName) => (
                        <option key={bName} value={bName}>
                          {bName}
                        </option>
                      ))}
                    </select>

                    {analyzeData && (
                      <div className="text-xs text-slate-500">
                        <span>Coluna de marca na planilha: </span>
                        <select
                          value={spreadsheetBrandColumn}
                          onChange={(e) => setSpreadsheetBrandColumn(e.target.value)}
                          className="border rounded p-1 dark:bg-slate-800 text-xs ml-1"
                        >
                          <option value="">Auto-detectar</option>
                          {analyzeData.columns.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={() => setStep(3)} className="px-4 py-2 text-slate-600 text-sm hover:underline font-medium">
              Voltar
            </button>
            <button
              onClick={() => {
                if (brandFilterMode === 'specific' && !selectedBrandName) {
                  toast.warning('Selecione uma marca específica ou escolha "Todas as marcas da planilha".');
                  return;
                }
                advanceToStep(5);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
            >
              Avançar para Usuários <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: USUÁRIOS */}
      {step === 5 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Etapa 5: Usuários (Filtro de Destino dos Produtos)</h3>
            <p className="text-xs text-slate-500">Defina quais contas/usuários proprietários dos produtos serão afetados pela atualização.</p>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <input
                type="radio"
                name="userFilterMode"
                value="all"
                checked={userFilterMode === 'all'}
                onChange={() => {
                  setUserFilterMode('all');
                  setSelectedUsers([]);
                }}
                className="mt-1 text-indigo-600"
              />
              <div>
                <span className="block font-bold text-sm text-slate-900 dark:text-white">Todos os usuários que possuem essa marca</span>
                <span className="block text-xs text-slate-500">Atualiza os produtos em todas as organizações/contas existentes (Org A, Org B, Org C...).</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <input
                type="radio"
                name="userFilterMode"
                value="specific"
                checked={userFilterMode === 'specific'}
                onChange={() => setUserFilterMode('specific')}
                className="mt-1 text-indigo-600"
              />
              <div className="w-full">
                <span className="block font-bold text-sm text-slate-900 dark:text-white">Selecionar usuários específicos</span>
                <span className="block text-xs text-slate-500">Restringe a atualização exclusivamente aos produtos pertencentes aos usuários marcados.</span>

                {userFilterMode === 'specific' && (
                  <div className="mt-3 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-1.5 bg-white dark:bg-slate-800">
                    {availableUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedUsers([...selectedUsers, u.id]);
                            else setSelectedUsers(selectedUsers.filter((id) => id !== u.id));
                          }}
                        />
                        <span>{u.full_name || u.email} ({u.email})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={() => setStep(4)} className="px-4 py-2 text-slate-600 text-sm hover:underline font-medium">
              Voltar
            </button>
            <button
              onClick={handleRunPreview}
              disabled={isPreviewing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm"
            >
              {isPreviewing ? <RefreshCw size={16} className="animate-spin" /> : 'Gerar Preview'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: PREVIEW */}
      {step === 6 && previewResult && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Etapa 6: Preview da Atualização</h3>
            <p className="text-xs text-slate-500">Simulação completa dos produtos e organizações que serão atualizados.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Planilha Elegível</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{previewResult.eligibleRows ?? previewResult.totalRows}</div>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800">
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Com Match</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{previewResult.matchedRows}</div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">Produtos No Banco</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{previewResult.matchedProducts || 0}</div>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl">
              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">Orgs Afetadas</div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{previewResult.affectedOrganizations || 0}</div>
            </div>
            <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl">
              <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase">Com Alterações</div>
              <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{previewResult.changedProducts || 0}</div>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
              <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">Não Encontrados</div>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400">{previewResult.notFoundRows}</div>
            </div>
          </div>

          {/* Sample Rows Details Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Detalhamento da Busca Por Linha (Amostra de Preview)</h4>
                {previewResult.notFoundRows > 0 && omitUnmatched && (
                  <p className="text-[11px] text-slate-400">
                    Omitindo {previewResult.notFoundRows} referência(s) sem resultado (não encontradas no banco de dados).
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                  <input
                    type="checkbox"
                    checked={omitNoChanges}
                    onChange={(e) => setOmitNoChanges(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Omitir referências sem alteração (0 mudanças propostas)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                  <input
                    type="checkbox"
                    checked={omitUnmatched}
                    onChange={(e) => setOmitUnmatched(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Omitir referências sem resultado (0 produtos)</span>
                </label>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-3"># Linha</th>
                    <th className="p-3">Valor na Planilha</th>
                    <th className="p-3">Valor Encontrado em Products</th>
                    <th className="p-3">Produtos Encontrados</th>
                    <th className="p-3">Usuários com a Ref.</th>
                    <th className="p-3">Usuários Afetados</th>
                    <th className="p-3">Organizações</th>
                    <th className="p-3">Alterações Propostas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedSampleDetails.length > 0 ? (
                    displayedSampleDetails.map((detail, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-semibold">{detail.rowNumber}</td>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{detail.reference}</td>
                        <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {detail.matchedDbValues && detail.matchedDbValues.length > 0 ? (
                            detail.matchedDbValues.join(', ')
                          ) : (
                            <span className="text-slate-400 italic font-normal">-</span>
                          )}
                        </td>
                        <td className="p-3 font-bold">{detail.matchedProductsCount}</td>
                        <td className="p-3 font-semibold">{detail.totalUsersCount ?? detail.affectedUsersCount ?? 0} user(s)</td>
                        <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{detail.affectedUsersCount ?? 0} user(s)</td>
                        <td className="p-3">{detail.affectedOrganizationsCount} org(s)</td>
                        <td className="p-3">
                          {detail.proposedChanges.length > 0 ? (
                            <div className="space-y-1">
                              {detail.proposedChanges.map((c, ci) => (
                                <div key={ci} className="text-[11px] font-mono">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">{c.targetField}:</span>{' '}
                                  <span className="text-rose-500">{String(c.oldValue)}</span> &rarr;{' '}
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{String(c.newValue)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Sem alterações</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                        {previewResult.sampleDetails.length > 0 ? (
                          <div className="space-y-1">
                            <div>Nenhuma referência nesta amostra atende aos filtros atuais.</div>
                            <div className="flex justify-center gap-3 text-xs not-italic pt-1">
                              {omitNoChanges && (
                                <button onClick={() => setOmitNoChanges(false)} className="text-indigo-600 dark:text-indigo-400 underline font-semibold cursor-pointer">
                                  Desmarcar 'Omitir referências sem alteração'
                                </button>
                              )}
                              {omitUnmatched && (
                                <button onClick={() => setOmitUnmatched(false)} className="text-indigo-600 dark:text-indigo-400 underline font-semibold cursor-pointer">
                                  Desmarcar 'Omitir referências sem resultado'
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          'Nenhuma linha encontrada no preview.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <span>
                ℹ️ <strong>Nota:</strong> A tabela acima exibe uma amostra para conferência visual. Na execução real (Etapa 7), <strong>todos os {previewResult.matchedProducts || 0} produtos</strong> encontrados em <strong>{previewResult.matchedRows || 0} linhas da planilha</strong> serão atualizados.
              </span>
            </p>
          </div>

          {/* Critical confirmation if large dataset update */}
          {previewResult.criticalConfirmationRequired && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
              <strong className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-2 text-sm">
                <AlertTriangle size={18} /> Confirmação Obrigatória
              </strong>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Esta atualização altera mais de 30% dos registros. Digite <strong>ATUALIZAR</strong> para confirmar.
              </p>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="Digite ATUALIZAR"
                className="text-xs border rounded-lg p-2 dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={() => setStep(5)} className="px-4 py-2 text-slate-600 text-sm hover:underline font-medium">
              Voltar
            </button>
            <button
              onClick={handleStartExecution}
              disabled={isExecuting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm"
            >
              Confirmar e Executar Atualização <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: EXECUÇÃO */}
      {step === 7 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-sm">
          <div className="mx-auto w-16 h-16 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-full flex items-center justify-center">
            <RefreshCw size={32} className="animate-spin" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Etapa 7: Executando Atualização por Lotes</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Processando registros em lotes seguros. Por favor, aguarde.
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-3">
            <div className="flex justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>Progresso</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full transition-all duration-300 rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center pt-2">
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                <span className="block text-slate-400">Processados</span>
                <span className="font-bold">{execStats.processed}</span>
              </div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-xs text-emerald-600">
                <span className="block">Aplicados</span>
                <span className="font-bold">{execStats.applied}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                <span className="block text-slate-400">Sem alteração</span>
                <span className="font-bold">{execStats.skipped}</span>
              </div>
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-xs text-rose-600">
                <span className="block">Falhas</span>
                <span className="font-bold">{execStats.failed}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 8: RESULTADO */}
      {step === 8 && (() => {
        const hasFailures = execStats.failed > 0;
        const isPartialCompletion = hasFailures && execStats.applied > 0;
        const isTotalFailure = hasFailures && execStats.applied === 0;

        const failureSummaryMap = new Map<string, number>();
        for (const f of jobFailures) {
          const msg = f.errorMessage || 'Falha ao aplicar alteração';
          failureSummaryMap.set(msg, (failureSummaryMap.get(msg) || 0) + 1);
        }
        const failureSummary = Array.from(failureSummaryMap.entries()).map(([msg, count]) => ({ msg, count }));

        return (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-sm">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
              isPartialCompletion
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                : isTotalFailure
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'
            }`}>
              {hasFailures ? <AlertTriangle size={36} /> : <CheckCircle2 size={36} />}
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {isPartialCompletion
                  ? 'Atualização Concluída com Ressalvas'
                  : isTotalFailure
                  ? 'Atualização com Falhas'
                  : 'Atualização Concluída com Sucesso!'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {isPartialCompletion
                  ? 'A atualização foi aplicada, porém algumas linhas não puderam ser processadas devido a erros.'
                  : isTotalFailure
                  ? 'A execução falhou e nenhuma alteração foi aplicada no banco de dados.'
                  : 'Todos os lotes da planilha foram processados e aplicados no banco de dados.'}
              </p>
            </div>

            <div className="max-w-md mx-auto grid grid-cols-3 gap-3 text-center">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-800">
                <span className="block text-xs font-bold text-emerald-600 uppercase">Aplicados</span>
                <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{execStats.applied}</span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="block text-xs font-bold text-slate-400 uppercase">Sem Alteração</span>
                <span className="text-2xl font-extrabold text-slate-700 dark:text-slate-300">{execStats.skipped}</span>
              </div>
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-100 dark:border-rose-800">
                <span className="block text-xs font-bold text-rose-600 uppercase">Falhas</span>
                <span className="text-2xl font-extrabold text-rose-700 dark:text-rose-300">{execStats.failed}</span>
              </div>
            </div>

            {/* Failure Summary Box */}
            {failureSummary.length > 0 && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-left space-y-2 max-w-lg mx-auto">
                <strong className="text-rose-800 dark:text-rose-300 text-xs font-bold uppercase block">
                  Motivo das Falhas:
                </strong>
                <ul className="space-y-1.5 text-xs text-rose-700 dark:text-rose-300 font-mono">
                  {failureSummary.map(({ msg, count }, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="font-bold bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 px-2 py-0.5 rounded text-[11px] shrink-0">
                        {count} &times;
                      </span>
                      <span>{msg}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowFailureDetails((prev) => !prev)}
                    className="text-xs font-bold text-rose-700 dark:text-rose-300 underline hover:text-rose-900 dark:hover:text-rose-100 cursor-pointer"
                  >
                    {showFailureDetails ? 'Ocultar detalhes das falhas' : 'Ver detalhes das falhas'}
                  </button>
                </div>
              </div>
            )}

            {/* Failure Details Table */}
            {showFailureDetails && jobFailures.length > 0 && (
              <div className="space-y-3 text-left max-w-3xl mx-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle size={18} /> Detalhamento das Falhas ({jobFailures.length} exibidos)
                </h4>
                <div className="overflow-x-auto border border-rose-200 dark:border-rose-900/60 rounded-xl bg-rose-50/40 dark:bg-rose-950/30">
                  <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
                    <thead className="bg-rose-100/70 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 font-bold border-b border-rose-200 dark:border-rose-900">
                      <tr>
                        <th className="p-3"># Linha Planilha</th>
                        <th className="p-3">Campo</th>
                        <th className="p-3">Alteração Proposta</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Motivo da Falha / Erro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 dark:divide-rose-900/40">
                      {jobFailures.map((f, fi) => (
                        <tr key={fi} className="hover:bg-rose-100/40 dark:hover:bg-rose-900/30">
                          <td className="p-3 font-semibold">{f.rowNumber}</td>
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">{f.targetField}</td>
                          <td className="p-3 font-mono">
                            <span className="text-rose-500">{String(f.oldValue ?? 'null')}</span> &rarr;{' '}
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{String(f.newValue)}</span>
                          </td>
                          <td className="p-3 font-bold uppercase text-[10px]">
                            <span className={f.status === 'conflict' ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-md' : 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-md'}>
                              {f.status}
                            </span>
                          </td>
                          <td className="p-3 text-rose-800 dark:text-rose-300 font-medium">{f.errorMessage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {rollbackResult && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-900 dark:text-indigo-300 max-w-md mx-auto">
              <strong className="font-bold block">Resultado do Rollback:</strong>
              <p>{rollbackResult.rolledBack} registros restaurados ao estado anterior com sucesso.</p>
            </div>
          )}

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={handleRollback}
              disabled={isRollingBack}
              className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
            >
              {isRollingBack ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Desfazer Alterações (Rollback)
            </button>

            <button
              onClick={() => {
                setStep(1);
                setMaxUnlockedStep(1);
                setFile(null);
                setAnalyzeData(null);
                setPreviewResult(null);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
            >
              Nova Atualização
            </button>
          </div>
        </div>
      );
    })()}

      {/* MANUAL MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Guia do Fluxo de Atualização Global</h3>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p><strong>1. Arquivo:</strong> Selecione a planilha Excel com seus dados.</p>
              <p><strong>2. Identificação:</strong> Escolha a coluna da planilha e o campo equivalente na tabela <code className="font-mono">products</code> (ex: reference_code).</p>
              <p><strong>3. Campos a Atualizar:</strong> Adicione os campos que deseja alterar (preço, ativo, lançamento, etc.).</p>
              <p><strong>4. Marca:</strong> Escolha todas as marcas ou uma marca específica para filtrar as linhas da planilha.</p>
              <p><strong>5. Usuários:</strong> Escolha todos os usuários ou contas específicas para receber o update.</p>
              <p><strong>6. Preview:</strong> Confira o número exato de produtos e organizações encontrados antes de executar.</p>
              <p><strong>7. Execução &amp; 8. Resultado:</strong> Processamento em lotes seguros com opção de desfazimento (rollback).</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowManualModal(false)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
