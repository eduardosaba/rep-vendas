'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Layers,
  Filter,
  Sliders,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  Plus,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import {
  analyzeSpreadsheetAction,
  createJobAction,
  previewEngineAction,
  processBatchChunkAction,
  rollbackJobAction,
} from '@/modules/product-update-engine/application/actions';
import { UPDATE_FIELD_REGISTRY, LAYER_AVAILABILITY, TargetLayer } from '@/modules/product-update-engine/domain/field-registry';
import {
  AnalyzeSpreadsheetResult,
  EngineConfiguration,
  FilterCondition,
  FilterOperator,
  NormalizerRule,
  PreviewEngineResult,
  StructuredOperationType,
} from '@/modules/product-update-engine/domain/types';

interface SmartUpdateClientProps {
  availableCompanies: { id: string; name: string }[];
  availableUsers: { id: string; email: string; full_name?: string }[];
}

export function SmartUpdateClient({ availableCompanies, availableUsers }: SmartUpdateClientProps) {
  const [step, setStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeData, setAnalyzeData] = useState<AnalyzeSpreadsheetResult | null>(null);

  // Step 2 Configuration State
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [identifierMappings, setIdentifierMappings] = useState<{ spreadsheetColumn: string; dbField: any }[]>([
    { spreadsheetColumn: '', dbField: 'reference_code' },
  ]);
  const [normalizations, setNormalizations] = useState<NormalizerRule[]>(['trim', 'uppercase']);

  // Step 3 Filters State
  const [filterConnective, setFilterConnective] = useState<'AND' | 'OR'>('AND');
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);

  // Step 4 Actions State
  const [targetLayer, setTargetLayer] = useState<TargetLayer>('global');
  const [actions, setActions] = useState<{
    targetLayer: TargetLayer;
    targetField: string;
    operation: StructuredOperationType;
    valueSource: 'fixed' | 'spreadsheet';
    sourceColumn?: string;
    fixedValue?: any;
  }[]>([
    {
      targetLayer: 'global',
      targetField: 'is_active',
      operation: 'set',
      valueSource: 'fixed',
      fixedValue: true,
    },
  ]);

  // Step 5 Scope State
  const [scopeType, setScopeType] = useState<'GLOBAL' | 'COMPANY' | 'USER'>('GLOBAL');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Step 6 Preview State
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewEngineResult | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');

  // Step 7 Execution State
  const [jobId, setJobId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [execStats, setExecStats] = useState({ processed: 0, applied: 0, skipped: 0, failed: 0 });
  const [isCompleted, setIsCompleted] = useState(false);

  // Step 8 Rollback State
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackResult, setRollbackResult] = useState<{ success: boolean; rolledBack: number; conflicts: number; errors: string[] } | null>(null);

  // Step 1: Handle File Selection & Analysis
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
      alert(res.error);
      return;
    }

    setAnalyzeData(res);
    setSelectedSheet(res.selectedSheet || res.sheets[0] || '');
    if (res.columns.length > 0) {
      setIdentifierMappings([{ spreadsheetColumn: res.columns[0].name, dbField: 'reference_code' }]);
    }
    setStep(2);
  };

  // Build current EngineConfiguration object
  const getEngineConfig = (): EngineConfiguration => {
    return {
      sheetName: selectedSheet,
      identifier: {
        mappings: identifierMappings,
        normalizations,
      },
      filters: {
        connective: filterConnective,
        conditions: filterConditions,
      },
      actions: actions.map((a) => ({ ...a, targetLayer })),
      scope: {
        type: scopeType,
        targetCompanyIds: selectedCompanies,
        targetUserIds: selectedUsers,
      },
    };
  };

  // Run Preview
  const handleRunPreview = async () => {
    if (!file) return;
    setIsPreviewing(true);
    const fd = new FormData();
    fd.append('file', file);

    const configStr = JSON.stringify(getEngineConfig());
    const res = await previewEngineAction(fd, configStr);
    setIsPreviewing(false);

    if (res.error) {
      alert(res.error);
      return;
    }

    setPreviewResult(res);
    setStep(6);
  };

  // Run Batch Execution
  const handleStartExecution = async () => {
    if (!file || !previewResult) return;
    if (previewResult.criticalConfirmationRequired && confirmationInput.trim().toUpperCase() !== 'ATUALIZAR') {
      alert('Por favor, digite ATUALIZAR para confirmar a operação crítica.');
      return;
    }

    setStep(7);
    setIsExecuting(true);

    const configStr = JSON.stringify(getEngineConfig());
    const createRes = await createJobAction(file.name, selectedSheet, previewResult.totalRows, configStr);

    if (createRes.error || !createRes.jobId) {
      alert(createRes.error || 'Erro ao criar job de atualização.');
      setIsExecuting(false);
      return;
    }

    const currentJobId = createRes.jobId;
    setJobId(currentJobId);

    const chunkSize = 200;
    let totalProcessed = 0;
    let totalApplied = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (let rowIndex = 0; rowIndex < previewResult.totalRows; rowIndex += chunkSize) {
      const fd = new FormData();
      fd.append('file', file);

      const chunkRes = await processBatchChunkAction(currentJobId, rowIndex, chunkSize, fd);
      if (chunkRes.error) {
        alert(`Erro no lote ${rowIndex}: ${chunkRes.error}`);
        break;
      }

      totalProcessed += chunkRes.processed;
      totalApplied += chunkRes.applied;
      totalSkipped += chunkRes.skipped;
      totalFailed += chunkRes.failed;

      setExecStats({ processed: totalProcessed, applied: totalApplied, skipped: totalSkipped, failed: totalFailed });
      setProgressPercent(Math.min(100, Math.round((totalProcessed / previewResult.totalRows) * 100)));

      if (chunkRes.isCompleted) break;
    }

    setIsExecuting(false);
    setIsCompleted(true);
    setStep(8);
  };

  // Handle Rollback
  const handleRollback = async () => {
    if (!jobId) return;
    if (!confirm('Deseja realmente desfazer todas as alterações feitas por este job?')) return;

    setIsRollingBack(true);
    const res = await rollbackJobAction(jobId);
    setIsRollingBack(false);
    setRollbackResult(res);
  };

  const [showManualModal, setShowManualModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* STEPPER HEADER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold scrollbar-none py-1">
          {[
            { id: 1, name: 'Arquivo' },
            { id: 2, name: 'Identificação' },
            { id: 3, name: 'Filtros' },
            { id: 4, name: 'Ações' },
            { id: 5, name: 'Escopo' },
            { id: 6, name: 'Preview' },
            { id: 7, name: 'Execução' },
            { id: 8, name: 'Resultado' },
          ].map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
                step === s.id
                  ? 'bg-indigo-600 text-white'
                  : step > s.id
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <span>{s.id}.</span>
              <span>{s.name}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowManualModal(true)}
          className="flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-semibold px-4 py-2 rounded-xl text-xs transition-colors shrink-0 border border-indigo-200 dark:border-indigo-800"
        >
          <HelpCircle size={16} /> Guia Prático / Manual
        </button>
      </div>

      {/* STEP 1: UPLOAD */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-sm">
          <div className="mx-auto w-16 h-16 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-full flex items-center justify-center">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Selecione a Planilha (.xlsx, .xls)</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              O sistema irá ler automaticamente os cabeçalhos e amostras de dados.
            </p>
          </div>

          {isAnalyzing ? (
            <div className="space-y-4 max-w-md mx-auto pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={14} className="animate-spin" /> Analisando planilha Excel...
                </span>
                <span>Processando...</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full animate-pulse w-full"></div>
              </div>
              <p className="text-xs text-slate-400">Extraindo abas, identificando colunas e inferindo tipos de dados...</p>
            </div>
          ) : (
            <label className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl cursor-pointer transition-colors shadow-sm">
              <Upload size={18} />
              Escolher Arquivo
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileChange} disabled={isAnalyzing} />
            </label>
          )}
        </div>
      )}

      {/* STEP 2: IDENTIFICATION & NORMALIZATION */}
      {step === 2 && analyzeData && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Passo 2: Mapeamento do Identificador</h3>
              <p className="text-xs text-slate-500">Escolha a(s) coluna(s) que identificam o produto no catálogo.</p>
            </div>
            {analyzeData.sheets.length > 1 && (
              <select
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="text-xs border rounded-lg p-2 dark:bg-slate-800 dark:border-slate-700"
              >
                {analyzeData.sheets.map((s) => (
                  <option key={s} value={s}>
                    Aba: {s}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Mappings */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Colunas Identificadoras</h4>
            {identifierMappings.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <select
                  value={m.spreadsheetColumn}
                  onChange={(e) => {
                    const newM = [...identifierMappings];
                    newM[i].spreadsheetColumn = e.target.value;
                    setIdentifierMappings(newM);
                  }}
                  className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:bg-slate-800"
                >
                  {analyzeData.columns.map((c) => (
                    <option key={c.name} value={c.name}>
                      Coluna Planilha: {c.name} ({c.inferredType})
                    </option>
                  ))}
                </select>

                <span className="text-xs font-bold text-slate-400">=</span>

                <select
                  value={m.dbField}
                  onChange={(e) => {
                    const newM = [...identifierMappings];
                    newM[i].dbField = e.target.value;
                    setIdentifierMappings(newM);
                  }}
                  className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:bg-slate-800"
                >
                  <option value="reference_code">Campo Banco: Referência (reference_code)</option>
                  <option value="brand">Campo Banco: Marca (brand)</option>
                  <option value="name">Campo Banco: Nome do Produto (name)</option>
                  <option value="color_nome">Campo Banco: Cor (color_nome)</option>
                  <option value="colecao">Campo Banco: Coleção (colecao)</option>
                </select>

                {identifierMappings.length > 1 && (
                  <button
                    onClick={() => setIdentifierMappings(identifierMappings.filter((_, idx) => idx !== i))}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => setIdentifierMappings([...identifierMappings, { spreadsheetColumn: analyzeData.columns[0]?.name || '', dbField: 'brand' }])}
              className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline"
            >
              <Plus size={14} /> Adicionar Identificador Composto (ex: MARCA + REFERENCIA)
            </button>
          </div>

          {/* Normalizations */}
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Regras de Normalização</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {[
                { id: 'trim', label: 'Remover Espaços Nas Pontas' },
                { id: 'uppercase', label: 'Converter Maiúsculas' },
                { id: 'remove_accents', label: 'Remover Acentos' },
                { id: 'remove_hyphens', label: 'Remover Hífens (-)' },
                { id: 'remove_dots', label: 'Remover Pontos (.)' },
                { id: 'remove_invisible', label: 'Remover Caracteres Invisíveis' },
              ].map((r) => (
                <label key={r.id} className="flex items-center gap-2 p-2 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={normalizations.includes(r.id as any)}
                    onChange={(e) => {
                      if (e.target.checked) setNormalizations([...normalizations, r.id as any]);
                      else setNormalizations(normalizations.filter((n) => n !== r.id));
                    }}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-600 text-sm hover:underline">
              Voltar
            </button>
            <button onClick={() => setStep(3)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
              Avançar para Filtros <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: FILTERS */}
      {step === 3 && analyzeData && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Passo 3: Construtor Dinâmico de Filtros</h3>
              <p className="text-xs text-slate-500">Defina critérios para filtrar quais linhas da planilha serão processadas.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span>Conectivo:</span>
              <select
                value={filterConnective}
                onChange={(e) => setFilterConnective(e.target.value as any)}
                className="border rounded-lg p-1.5 dark:bg-slate-800"
              >
                <option value="AND">E (Todos Devem Atender)</option>
                <option value="OR">OU (Qualquer Um Atende)</option>
              </select>
            </div>
          </div>

          {filterConditions.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Nenhum filtro aplicado. Todas as linhas da planilha serão elegíveis.</p>
          ) : (
            <div className="space-y-3">
              {filterConditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <select
                    value={cond.column}
                    onChange={(e) => {
                      const newC = [...filterConditions];
                      newC[idx].column = e.target.value;
                      setFilterConditions(newC);
                    }}
                    className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:bg-slate-800"
                  >
                    {analyzeData.columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={cond.operator}
                    onChange={(e) => {
                      const newC = [...filterConditions];
                      newC[idx].operator = e.target.value as FilterOperator;
                      setFilterConditions(newC);
                    }}
                    className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:bg-slate-800"
                  >
                    <option value="equals">Igual a</option>
                    <option value="not_equals">Diferente de</option>
                    <option value="contains">Contém</option>
                    <option value="not_contains">Não contém</option>
                    <option value="greater_than">Maior que (&gt;)</option>
                    <option value="greater_equal">Maior ou igual (&gt;=)</option>
                    <option value="less_than">Menor que (&lt;)</option>
                    <option value="less_equal">Menor ou igual (&lt;=)</option>
                    <option value="in_list">Está na lista (separado por vírgula)</option>
                    <option value="is_empty">Está vazio</option>
                    <option value="is_not_empty">Não está vazio</option>
                  </select>

                  {!['is_empty', 'is_not_empty'].includes(cond.operator) && (
                    <input
                      type="text"
                      placeholder="Valor do filtro"
                      value={cond.value || ''}
                      onChange={(e) => {
                        const newC = [...filterConditions];
                        newC[idx].value = e.target.value;
                        setFilterConditions(newC);
                      }}
                      className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:bg-slate-800"
                    />
                  )}

                  <button
                    onClick={() => setFilterConditions(filterConditions.filter((_, i) => i !== idx))}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() =>
              setFilterConditions([
                ...filterConditions,
                { column: analyzeData.columns[0]?.name || '', operator: 'equals', value: '' },
              ])
            }
            className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline"
          >
            <Plus size={14} /> Adicionar Condição de Filtro
          </button>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-slate-600 text-sm hover:underline">
              Voltar
            </button>
            <button onClick={() => setStep(4)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
              Avançar para Ações <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: ACTIONS */}
      {step === 4 && analyzeData && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Passo 4: Ações de Atualização</h3>
            <p className="text-xs text-slate-500">Escolha a camada de destino e quais campos da Whitelist serão modificados.</p>
          </div>

          {/* Layer Selection */}
          <div className="flex flex-col md:flex-row gap-4">
            {[
              { id: 'global', info: LAYER_AVAILABILITY.global },
              { id: 'company', info: LAYER_AVAILABILITY.company },
              { id: 'user', info: LAYER_AVAILABILITY.user },
            ].map((l) => {
              const isEnabled = l.info.enabled;
              return (
                <label
                  key={l.id}
                  className={`flex-1 p-4 border rounded-xl transition-colors ${
                    !isEnabled
                      ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'
                      : targetLayer === l.id
                      ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20 cursor-pointer'
                      : 'border-slate-200 dark:border-slate-800 cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="layer"
                    disabled={!isEnabled}
                    checked={targetLayer === l.id}
                    onChange={() => {
                      if (!isEnabled) return;
                      setTargetLayer(l.id as TargetLayer);
                      if (l.id === 'global') setScopeType('GLOBAL');
                    }}
                    className="hidden"
                  />
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{l.info.label}</span>
                    {!isEnabled && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded font-normal">Em breve</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{l.info.description}</div>
                </label>
              );
            })}
          </div>

          {/* Actions List */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {actions.map((act, idx) => (
              <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Ação #{idx + 1}</span>
                  {actions.length > 1 && (
                    <button onClick={() => setActions(actions.filter((_, i) => i !== idx))} className="text-rose-500 text-xs hover:underline">
                      Remover
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Field whitelist dropdown */}
                  <div>
                    <label className="text-xs font-medium text-slate-500">Campo de Destino</label>
                    <select
                      value={act.targetField}
                      onChange={(e) => {
                        const newA = [...actions];
                        newA[idx].targetField = e.target.value;
                        setActions(newA);
                      }}
                      className="w-full text-sm border rounded-xl p-2.5 dark:bg-slate-800 dark:border-slate-700"
                    >
                      {Object.entries(UPDATE_FIELD_REGISTRY[targetLayer] || {}).map(([key, def]) => (
                        <option key={key} value={key}>
                          {def.label} ({def.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Operation */}
                  <div>
                    <label className="text-xs font-medium text-slate-500">Operação Estruturada</label>
                    <select
                      value={act.operation}
                      onChange={(e) => {
                        const newA = [...actions];
                        newA[idx].operation = e.target.value as StructuredOperationType;
                        setActions(newA);
                      }}
                      className="w-full text-sm border rounded-xl p-2.5 dark:bg-slate-800 dark:border-slate-700"
                    >
                      <option value="set">Definir Valor (set)</option>
                      <option value="add">Somar (add)</option>
                      <option value="subtract">Subtrair (subtract)</option>
                      <option value="multiply">Multiplicar (multiply)</option>
                      <option value="percentage_increase">Aumentar Percentual (%)</option>
                      <option value="percentage_decrease">Reduzir Percentual (%)</option>
                    </select>
                  </div>

                  {/* Value Source */}
                  <div>
                    <label className="text-xs font-medium text-slate-500">Origem do Valor</label>
                    <select
                      value={act.valueSource}
                      onChange={(e) => {
                        const newA = [...actions];
                        newA[idx].valueSource = e.target.value as any;
                        setActions(newA);
                      }}
                      className="w-full text-sm border rounded-xl p-2.5 dark:bg-slate-800 dark:border-slate-700"
                    >
                      <option value="spreadsheet">Usar Coluna da Planilha</option>
                      <option value="fixed">Valor Fixo</option>
                    </select>
                  </div>
                </div>

                {/* Source Column or Fixed Value */}
                {act.valueSource === 'spreadsheet' ? (
                  <div>
                    <label className="text-xs font-medium text-slate-500">Coluna Origem da Planilha</label>
                    <select
                      value={act.sourceColumn || ''}
                      onChange={(e) => {
                        const newA = [...actions];
                        newA[idx].sourceColumn = e.target.value;
                        setActions(newA);
                      }}
                      className="w-full text-sm border rounded-xl p-2.5 dark:bg-slate-800 dark:border-slate-700"
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
                    <label className="text-xs font-medium text-slate-500">Valor Fixo</label>
                    <input
                      type="text"
                      placeholder="Ex: 399.90 ou true"
                      value={act.fixedValue ?? ''}
                      onChange={(e) => {
                        const newA = [...actions];
                        newA[idx].fixedValue = e.target.value;
                        setActions(newA);
                      }}
                      className="w-full text-sm border rounded-xl p-2.5 dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() =>
              setActions([
                ...actions,
                { targetLayer, targetField: 'sale_price', operation: 'set', valueSource: 'spreadsheet' },
              ])
            }
            className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline"
          >
            <Plus size={14} /> Adicionar Outra Ação de Atualização
          </button>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(3)} className="px-4 py-2 text-slate-600 text-sm hover:underline">
              Voltar
            </button>
            <button onClick={() => setStep(5)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
              Avançar para Escopo <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: SCOPE */}
      {step === 5 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Passo 5: Escopo do Público Afetado</h3>
            <p className="text-xs text-slate-500">
              Camada atual: <strong className="uppercase">{targetLayer}</strong>. Selecione quais empresas ou usuários receberão a atualização nos vínculos existentes.
            </p>
          </div>

          {targetLayer === 'global' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>A camada Global afeta o produto-base para todo o ecossistema do sistema.</span>
            </div>
          )}

          {targetLayer === 'company' && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Empresa(s) Alvo</label>
              <select
                multiple
                value={selectedCompanies}
                onChange={(e) => setSelectedCompanies(Array.from(e.target.selectedOptions, (o) => o.value))}
                className="w-full h-40 text-sm border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:bg-slate-800"
              >
                {availableCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400">Segure Ctrl (ou Cmd) para selecionar múltiplas empresas.</p>
            </div>
          )}

          {targetLayer === 'user' && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Usuário(s) / Representante(s) Alvo</label>
              <select
                multiple
                value={selectedUsers}
                onChange={(e) => setSelectedUsers(Array.from(e.target.selectedOptions, (o) => o.value))}
                className="w-full h-40 text-sm border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 dark:bg-slate-800"
              >
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(4)} className="px-4 py-2 text-slate-600 text-sm hover:underline">
              Voltar
            </button>
            <button
              onClick={handleRunPreview}
              disabled={isPreviewing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
            >
              {isPreviewing ? <RefreshCw size={16} className="animate-spin" /> : 'Gerar Preview e Simular'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: PREVIEW & CRITICAL CONFIRMATION */}
      {step === 6 && previewResult && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Passo 6: Preview e Simulação de Impacto</h3>
              <p className="text-xs text-slate-500">Nenhuma alteração foi realizada no banco ainda.</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="text-xs text-slate-400 font-bold uppercase">Total Linhas</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{previewResult.totalRows}</div>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Localizados</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{previewResult.matchedRows}</div>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl">
              <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase">Alterações</div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{previewResult.changedRows}</div>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
              <div className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase">Ignorados (Filtro)</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{previewResult.skippedRows}</div>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
              <div className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase">Não Encontrados</div>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{previewResult.notFoundRows}</div>
            </div>
          </div>

          {/* Sample Table */}
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                <tr>
                  <th className="p-3">Linha</th>
                  <th className="p-3">Identificador</th>
                  <th className="p-3">Produto Banco</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Proposta de Alteração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {previewResult.sampleDetails.map((det, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-mono font-medium text-slate-700 dark:text-slate-200">
                      {Object.values(det.rawIdentifierValues).filter(Boolean).join(' - ') || '-'}
                    </td>
                    <td className="p-3 font-medium">{det.matchedProductName || '-'}</td>
                    <td className="p-3 font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          det.status === 'READY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : det.status === 'SKIPPED_FILTER'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {det.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {det.proposedChanges.length === 0 ? (
                        <span className="text-slate-400">Sem alterações</span>
                      ) : (
                        det.proposedChanges.map((ch, i) => (
                          <div key={i} className="text-[11px]">
                            <span className="font-semibold">{ch.targetField}:</span> {String(ch.oldValue)} &rarr;{' '}
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{String(ch.newValue)}</span>
                          </div>
                        ))
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Critical Confirmation */}
          {previewResult.criticalConfirmationRequired && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300 text-sm">
                <AlertTriangle size={18} /> Operação Crítica Detectada
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-400">{previewResult.criticalReason}</p>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Digite <strong className="text-rose-600">ATUALIZAR</strong> para confirmar:
                </span>
                <input
                  type="text"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder="ATUALIZAR"
                  className="text-xs border border-rose-300 rounded-lg p-2 font-bold uppercase dark:bg-slate-900"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(5)} className="px-4 py-2 text-slate-600 text-sm hover:underline">
              Voltar
            </button>
            <button
              onClick={handleStartExecution}
              disabled={previewResult.criticalConfirmationRequired && confirmationInput.trim().toUpperCase() !== 'ATUALIZAR'}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm"
            >
              <CheckCircle2 size={16} /> Confirmar e Executar Importação
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: INCREMENTAL EXECUTION */}
      {step === 7 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-sm">
          <div className="mx-auto w-16 h-16 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-full flex items-center justify-center animate-spin">
            <RefreshCw size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Processando Lotes de Atualização...</h3>
            <p className="text-xs text-slate-500 mt-1">Gravando histórico auditado item a item no banco de dados.</p>
          </div>

          {/* Progress Bar & Detail */}
          <div className="max-w-lg mx-auto space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Progresso dos Lotes</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono pt-1">
              <span>{execStats.processed} de {previewResult?.totalRows || 0} produtos processados</span>
              <span>Lote de 200 itens</span>
            </div>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-4 gap-3 text-xs font-semibold max-w-lg mx-auto pt-4">
            <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Processados</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{execStats.processed}</div>
            </div>
            <div className="p-3 border border-emerald-200 dark:border-emerald-900 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="text-[10px] text-emerald-600 font-bold uppercase">Aplicados</div>
              <div className="text-lg font-bold text-emerald-600 mt-0.5">{execStats.applied}</div>
            </div>
            <div className="p-3 border border-amber-200 dark:border-amber-900 rounded-xl bg-amber-50/50 dark:bg-amber-950/20">
              <div className="text-[10px] text-amber-600 font-bold uppercase">Ignorados</div>
              <div className="text-lg font-bold text-amber-600 mt-0.5">{execStats.skipped}</div>
            </div>
            <div className="p-3 border border-rose-200 dark:border-rose-900 rounded-xl bg-rose-50/50 dark:bg-rose-950/20">
              <div className="text-[10px] text-rose-600 font-bold uppercase">Falhas</div>
              <div className="text-lg font-bold text-rose-600 mt-0.5">{execStats.failed}</div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 8: RESULT & ROLLBACK */}
      {step === 8 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-sm">
          <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Operação Concluída com Sucesso!</h3>
            <p className="text-xs text-slate-500 mt-1">Todos os lotes foram processados e auditados em `product_update_jobs`.</p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto text-center font-bold">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 rounded-xl">
              <div className="text-2xl">{execStats.applied}</div>
              <div className="text-xs font-normal">Alterações Aplicadas</div>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 text-amber-700 rounded-xl">
              <div className="text-2xl">{execStats.skipped}</div>
              <div className="text-xs font-normal">Ignorados</div>
            </div>
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-700 rounded-xl">
              <div className="text-2xl">{execStats.failed}</div>
              <div className="text-xs font-normal">Falhas</div>
            </div>
          </div>

          {/* Rollback Action */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center items-center gap-4">
            <button
              onClick={() => {
                setStep(1);
                setFile(null);
                setAnalyzeData(null);
                setPreviewResult(null);
              }}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-medium px-5 py-2.5 rounded-xl text-sm"
            >
              Nova Importação
            </button>

            <button
              onClick={handleRollback}
              disabled={isRollingBack}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
            >
              {isRollingBack ? <RefreshCw size={16} className="animate-spin" /> : <RotateCcw size={16} />}
              Desfazer Operação (Rollback)
            </button>
          </div>

          {rollbackResult && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-left text-xs space-y-2 max-w-lg mx-auto">
              <div className="font-bold text-slate-900 dark:text-white">Resultado do Rollback:</div>
              <div>Itens Revertidos: {rollbackResult.rolledBack}</div>
              <div>Conflitos Preservados: {rollbackResult.conflicts}</div>
              {rollbackResult.errors.length > 0 && <div className="text-rose-600 font-bold">Erros: {rollbackResult.errors.join(', ')}</div>}
            </div>
          )}
        </div>
      )}

      {/* POPUP MANUAL MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-xl">
                  <HelpCircle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    Manual de Uso — Motor de Atualização por Planilha
                  </h3>
                  <p className="text-xs text-slate-500">
                    Guia prático para inativação de produtos fora de linha e ajustes em lote.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700 dark:text-slate-300">
              {/* Step 1 */}
              <div className="space-y-1.5 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[11px]">1</span>
                  Passo 1: Carregar a Planilha
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Clique em <strong>"Escolher Arquivo"</strong> e selecione sua planilha <code>.xlsx</code> ou <code>.xls</code>. O sistema lerá as abas e inferirá automaticamente os tipos das colunas.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-1.5 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[11px]">2</span>
                  Passo 2: Mapear os Identificadores
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Selecione a coluna que identifica o produto (ex: <code>ITEM</code>, <code>SKU</code> ou <code>REFERENCIA</code>) e vincule com a <strong>Referência do Produto</strong> do banco.
                  <br />
                  <span className="text-indigo-600 font-semibold">• Dica:</span> Ative <em>"Preservar zeros à esquerda"</em> se seus códigos possuírem zeros no início (ex: <code>0005751</code>).
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-1.5 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[11px]">3</span>
                  Passo 3: Configurar Filtros (Quem será afetado?)
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Para afetar apenas produtos que estão saindo de linha: adicione um filtro na coluna de situação da fábrica (ex: <code>CORE</code> ou <code>SITUACAO</code>) com a condição <strong>Igual a</strong> <code>FORA DE LINHA</code> ou <code>INATIVO</code>.
                </p>
              </div>

              {/* Step 4 */}
              <div className="space-y-1.5 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[11px]">4</span>
                  Passo 4: Ação de Atualização (O que alterar?)
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Escolha a camada <strong>Catálogo Global (products)</strong>. Selecione o campo <strong>Produto Ativo (is_active)</strong>, a operação <strong>Definir Valor (set)</strong> e o valor <strong>falso</strong>.
                </p>
              </div>

              {/* Step 5 to 8 */}
              <div className="space-y-1.5 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[11px]">5-8</span>
                  Preview, Execução Incremental e Rollback Auditado
                </div>
                <p className="text-slate-500 leading-relaxed">
                  No <strong>Preview</strong>, o sistema simula as alterações sem tocar no banco de dados. Se afetar mais de 30% do catálogo, digite <code>ATUALIZAR</code> para liberar.
                  <br />
                  A execução grava os lotes de 200 em 200 itens. Se precisar desfazer, acesse a <strong>Central de Histórico & Auditoria</strong> para um Rollback em 1 clique.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-800/30">
              <button
                onClick={() => setShowManualModal(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
              >
                Entendi, Fechar Manual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
