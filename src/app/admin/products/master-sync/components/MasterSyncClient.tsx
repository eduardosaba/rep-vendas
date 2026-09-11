'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  Building2,
  Package,
  Layers,
  FileCheck,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  previewControlTowerUpdateAction,
  executeControlTowerUpdateAction,
  rollbackControlTowerUpdateJobAction,
  SmartUpdatePreviewResult,
} from '@/actions/commercial/smart-product-update';
import { AllowedTargetField, ProductUpdateMode } from '@/domain/commercial/smart-update-parsers';

export default function MasterSyncClient() {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [rollingBack, setRollingBack] = useState<boolean>(false);

  // Dados do Arquivo
  const [fileRows, setFileRows] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');

  // Mapeamento
  const [matchRefCol, setMatchRefCol] = useState<string>('');
  const [brandCol, setBrandCol] = useState<string>('');
  const [targetField, setTargetField] = useState<AllowedTargetField>('is_active');
  const [valueCol, setValueCol] = useState<string>('');
  const [mode, setMode] = useState<ProductUpdateMode>('DEACTIVATE_ONLY');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('');

  // Resultados do Preview e Execução
  const [previewResult, setPreviewResult] = useState<SmartUpdatePreviewResult | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [executionMessage, setExecutionMessage] = useState<string>('');

  // 1. Leitura da Planilha
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

        if (data.length === 0) {
          toast.error('A planilha está vazia.');
          return;
        }

        setFileRows(data);
        const cols = Object.keys(data[0] || {});
        setColumns(cols);

        // Auto-detecção de colunas
        const refCandidate = cols.find((c) => /ref|sku|codigo|code|reference/i.test(c));
        const brandCandidate = cols.find((c) => /brand|marca|fabricante/i.test(c));
        const activeCandidate = cols.find((c) => /active|ativo|status|disponivel/i.test(c));

        if (refCandidate) setMatchRefCol(refCandidate);
        if (brandCandidate) setBrandCol(brandCandidate);
        if (activeCandidate) setValueCol(activeCandidate);

        toast.success(`Planilha '${file.name}' lida com sucesso! ${data.length} linhas.`);
        setStep(2);
      } catch (err: any) {
        toast.error('Erro ao ler a planilha Excel.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // 2. Geração de Preview (Server-Side - SELECT puro sem gravação)
  const handleGeneratePreview = async () => {
    if (!matchRefCol) {
      toast.error('Selecione a coluna de Referência/SKU.');
      return;
    }

    setLoading(true);
    setPreviewResult(null);

    try {
      const result = await previewControlTowerUpdateAction({
        fileRows,
        matchRefCol,
        brandCol: brandCol || undefined,
        targetField,
        valueCol: valueCol || undefined,
        mode,
        selectedBrandFilter: selectedBrandFilter || undefined,
        filename: fileName,
      });

      setPreviewResult(result);
      setStep(3);
      toast.success('Simulação de impacto global calculada no servidor!');
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao calcular preview no servidor.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Execução Server-Side Segura (UPDATE explícito + Auditoria)
  const handleExecuteUpdate = async () => {
    setExecuting(true);
    try {
      const res = await executeControlTowerUpdateAction({
        fileRows,
        matchRefCol,
        brandCol: brandCol || undefined,
        targetField,
        valueCol: valueCol || undefined,
        mode,
        selectedBrandFilter: selectedBrandFilter || undefined,
        filename: fileName,
      });

      if (res.success) {
        setLastJobId(res.jobId);
        setExecutionMessage(res.message);
        setStep(4);
        toast.success(res.message);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao executar atualização.');
    } finally {
      setExecuting(false);
    }
  };

  // 4. Rollback de Job Confirmado
  const handleRollback = async () => {
    if (!lastJobId) return;
    setRollingBack(true);
    try {
      const res = await rollbackControlTowerUpdateJobAction(lastJobId);
      if (res.success) {
        toast.success(res.message);
        setExecutionMessage(`Rollback concluído: ${res.restoredCount} produtos restaurados ao valor anterior.`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao executar rollback.');
    } finally {
      setRollingBack(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Torre de Controle • Módulo Master
          </div>
          <h1 className="text-2xl font-black tracking-tight">Motor de Atualização Inteligente de Linha</h1>
          <p className="text-xs text-slate-400 mt-1">
            Processamento Server-Side autônomo com busca global por chave normalizada (MARCA|REFERÊNCIA).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono rounded-full font-bold">
            PLATFORM_GLOBAL
          </span>
        </div>
      </div>

      {/* Stepper Visual */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { num: 1, label: '1. Planilha' },
          { num: 2, label: '2. Mapeamento' },
          { num: 3, label: '3. Preview Global' },
          { num: 4, label: '4. Conclusão & Job' },
        ].map((s) => (
          <div
            key={s.num}
            className={`p-3 rounded-2xl border text-center transition-all ${
              step === s.num
                ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-md'
                : step > s.num
                ? 'bg-indigo-50 text-indigo-900 border-indigo-200 font-semibold'
                : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}
          >
            <span className="text-xs">{s.label}</span>
          </div>
        ))}
      </div>

      {/* PASSO 1: UPLOAD DO EXCEL */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-6">
          <div className="border-2 border-dashed border-indigo-200 rounded-3xl p-12 hover:border-indigo-400 transition-colors bg-indigo-50/30 relative">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="mx-auto text-indigo-500 mb-3" size={40} />
            <h3 className="text-lg font-bold text-slate-800">Selecione ou arraste a planilha oficial</h3>
            <p className="text-xs text-slate-500 mt-1">Formatos suportados: .XLSX, .XLS, .CSV</p>
          </div>
          {loading && (
            <div className="flex items-center justify-center gap-2 text-indigo-600 text-sm font-semibold">
              <Loader2 className="animate-spin" size={18} /> Lendo arquivo...
            </div>
          )}
        </div>
      )}

      {/* PASSO 2: MAPEAMENTO E CONFIGURAÇÃO DA OPERAÇÃO */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="text-indigo-600" size={20} /> Arquivo: <span className="text-indigo-600">{fileName}</span> ({fileRows.length} linhas)
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              Trocar Arquivo
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Colunas do Excel */}
            <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Mapeamento da Planilha</h3>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Coluna de Referência / SKU (Obrigatório)</label>
                <select
                  value={matchRefCol}
                  onChange={(e) => setMatchRefCol(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
                >
                  <option value="">Selecione a coluna...</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Coluna de Marca (Opcional se filtrada abaixo)</label>
                <select
                  value={brandCol}
                  onChange={(e) => setBrandCol(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
                >
                  <option value="">Nenhuma / Usar filtro global</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Filtro Global de Marca (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: MOSCHINO, BOSS..."
                  value={selectedBrandFilter}
                  onChange={(e) => setSelectedBrandFilter(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
                />
              </div>
            </div>

            {/* Configuração da Ação no Banco */}
            <div className="space-y-4 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
              <h3 className="text-xs font-black uppercase text-indigo-600 tracking-wider">Configuração da Atualização (Server-Side)</h3>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Campo Alvo no Banco (Whitelist)</label>
                <select
                  value={targetField}
                  onChange={(e) => setTargetField(e.target.value as AllowedTargetField)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-indigo-900"
                >
                  <option value="is_active">⚡ Status Ativo / Inativo (is_active)</option>
                  <option value="price">💰 Preço de Tabela (price)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Modo de Operação</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as ProductUpdateMode)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800"
                >
                  <option value="DEACTIVATE_ONLY">🔴 Somente Desativar (Padrão Seguro - Inativação)</option>
                  <option value="SYNC_BOOLEAN">🔄 Sincronizar Ativo / Inativo (Ambos os sentidos)</option>
                  <option value="SET_PRICE">💵 Atualização Monetária R$ (Parser Brasileiro)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Coluna com Novo Valor na Planilha</label>
                <select
                  value={valueCol}
                  onChange={(e) => setValueCol(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
                >
                  <option value="">Nenhuma / Usar valor fixo do modo</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleGeneratePreview} disabled={loading} className="bg-indigo-600 text-white font-bold px-6">
              {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Search className="mr-2" size={18} />}
              Gerar Simulação de Impacto Global
            </Button>
          </div>
        </div>
      )}

      {/* PASSO 3: PREVIEW GLOBAL COM MULTIPLICAÇÃO MULTITENANT */}
      {step === 3 && previewResult && (
        <div className="space-y-6">
          {/* Cards de Impacto Global */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Linhas Planilha</span>
              <span className="text-2xl font-black text-slate-800">{previewResult.spreadsheetRows}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Refs Únicas</span>
              <span className="text-2xl font-black text-indigo-600">{previewResult.uniqueReferences}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Produtos no Banco</span>
              <span className="text-2xl font-black text-emerald-600">{previewResult.matchingProductsCount}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Orgs Afetadas</span>
              <span className="text-2xl font-black text-purple-600">{previewResult.affectedOrganizationsCount}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border text-center bg-indigo-50 border-indigo-200">
              <span className="text-[10px] font-black uppercase text-indigo-600 block mb-1">Produtos a Alterar</span>
              <span className="text-2xl font-black text-indigo-700">{previewResult.productsToUpdateCount}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl border text-center">
              <span className="text-[10px] font-bold text-slate-500">Sem Mudança</span>
              <div className="text-lg font-bold text-slate-700">{previewResult.noChangeCount}</div>
            </div>
            <div className="bg-rose-50 p-3 rounded-2xl border border-rose-200 text-center">
              <span className="text-[10px] font-bold text-rose-600">Não Encontrados</span>
              <div className="text-lg font-bold text-rose-700">{previewResult.notFoundCount}</div>
            </div>
            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-center">
              <span className="text-[10px] font-bold text-amber-600">Linhas Inválidas</span>
              <div className="text-lg font-bold text-amber-700">{previewResult.invalidRowsCount}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 text-center">
              <span className="text-[10px] font-bold text-purple-600">Ambiguidades Parciais</span>
              <div className="text-lg font-bold text-purple-700">{previewResult.ambiguousOrganizationsCount}</div>
            </div>
          </div>

          {/* Tabela de Amostra de Preview */}
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-900 text-white font-bold text-xs uppercase flex justify-between items-center">
              <span>Amostra de Simulação (Mostrando até 50 itens de {previewResult.spreadsheetRows})</span>
              <span className="text-[10px] text-slate-400 font-mono">SELECT PURO • NENHUMA ALTERAÇÃO REALIZADA AINDA</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Marca / Referência</th>
                    <th className="p-3 text-center">Cópias / Orgs</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Valor Atual ➡️ Novo Valor</th>
                    <th className="p-3">Detalhe</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewResult.previewItems.map((item) => (
                    <tr key={item.lineIndex} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-slate-400">#{item.lineIndex}</td>
                      <td className="p-3 font-bold text-slate-800">
                        {item.brand} / <span className="font-mono text-indigo-600">{item.referenceCode}</span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-purple-600">
                        {item.matchedProductsCount} prods / {item.affectedOrgsCount} orgs
                      </td>
                      <td className="p-3">
                        {item.status === 'READY' && <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-md">PRONTO</span>}
                        {item.status === 'NO_CHANGE' && <span className="px-2 py-1 bg-slate-100 text-slate-600 font-bold rounded-md">SEM MUDANÇA</span>}
                        {item.status === 'NOT_FOUND' && <span className="px-2 py-1 bg-rose-100 text-rose-800 font-bold rounded-md">NÃO ENCONTRADO</span>}
                        {item.status === 'INVALID_ROW' && <span className="px-2 py-1 bg-amber-100 text-amber-800 font-bold rounded-md">INVÁLIDO</span>}
                        {item.status === 'PARTIAL_AMBIGUITY' && <span className="px-2 py-1 bg-purple-100 text-purple-800 font-bold rounded-md">AMBIGUIDADE</span>}
                      </td>
                      <td className="p-3 font-mono font-bold">
                        {item.oldValueText} ➡️ <span className="text-indigo-600">{item.newValueText}</span>
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">{item.detailMessage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border">
            <Button variant="outline" onClick={() => setStep(2)}>
              Voltar ao Mapeamento
            </Button>
            <Button
              onClick={handleExecuteUpdate}
              disabled={executing || previewResult.productsToUpdateCount === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-6 rounded-2xl text-sm"
            >
              {executing ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} /> Executando no Banco (UPDATE)...
                </>
              ) : (
                <>
                  <Play className="mr-2" size={18} /> Confirmar & Executar Atualização Global ({previewResult.productsToUpdateCount} prods)
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* PASSO 4: RESULTADO DA EXECUÇÃO & HISTÓRICO DE JOB */}
      {step === 4 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>

          <h2 className="text-2xl font-black text-slate-900">Atualização Concluída com Sucesso!</h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">{executionMessage}</p>

          {lastJobId && (
            <div className="p-4 bg-slate-50 rounded-2xl border font-mono text-xs text-slate-500 max-w-md mx-auto">
              ID do Job de Auditoria: <span className="font-bold text-slate-800">{lastJobId}</span>
            </div>
          )}

          <div className="flex justify-center gap-4 pt-4">
            <Button
              variant="outline"
              onClick={handleRollback}
              disabled={rollingBack || !lastJobId}
              className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold"
            >
              {rollingBack ? <Loader2 className="animate-spin mr-2" size={16} /> : <RotateCcw className="mr-2" size={16} />}
              Executar Rollback Cirúrgico deste Job
            </Button>
            <Button onClick={() => setStep(1)} className="bg-slate-900 text-white font-bold">
              Nova Sincronização
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
