'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Edit3,
  Terminal,
  Play,
  DollarSign,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type Stats = {
  total: number;
  updated: number;
  notFound: number;
  errors: number;
};

// Normaliza strings para facilitar busca de colunas
function normalizeKey(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

function getField(row: any, key: string | undefined) {
  if (!key) return null;
  return row[key];
}

export default function UpdatePricesPage() {
  const router = useRouter();
  const supabase = createClient();

  // Estados
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stopOnError, setStopOnError] = useState(true);

  // Dados do Arquivo
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  // Mapeamento (Colunas do arquivo)
  const [mapping, setMapping] = useState<{
    ref?: string;
    price?: string;
    sale_price?: string;
  }>({});

  // Feedback
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    updated: 0,
    notFound: 0,
    errors: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll do console
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (
    message: string,
    type: 'info' | 'error' | 'success' | 'warn' = 'info'
  ) => {
    let icon = 'ℹ️ ';
    if (type === 'error') icon = '❌ ';
    if (type === 'success') icon = '✅ ';
    if (type === 'warn') icon = '⚠️ ';
    setLogs((prev) => [...prev, `${icon} ${message}`]);
  };

  // --- 1. Leitura e Análise do Arquivo ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLogs([]);
    addLog(`Arquivo carregado: ${file.name}`);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });

        if (data.length === 0) {
          toast.error('A planilha está vazia.');
          return;
        }

        setRows(data);
        const cols = Object.keys(data[0]);
        setColumns(cols);

        // Auto-Mapeamento Inteligente
        autoMapColumns(cols);

        addLog(`Leitura OK. ${data.length} linhas encontradas.`, 'success');
        setStep(2);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao ler arquivo. Verifique o formato.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const autoMapColumns = (cols: string[]) => {
    const map: typeof mapping = {};

    map.ref = cols.find((c) => /ref|sku|codigo|code/i.test(normalizeKey(c)));
    map.price = cols.find((c) =>
      /preco|price|valor|custo|novo/i.test(normalizeKey(c))
    );
    map.sale_price = cols.find((c) =>
      /precovenda|preco.?venda|sale|promocional/i.test(normalizeKey(c))
    );

    setMapping(map);
    if (map.ref && map.price) {
      addLog('Colunas identificadas automaticamente.', 'success');
    } else {
      addLog(
        'Atenção: Selecione as colunas correspondentes manualmente.',
        'warn'
      );
    }
  };

  // --- 2. Processamento e Atualização com Auditoria ---
  const handleUpdate = async () => {
    if (!mapping.ref || !mapping.price) {
      toast.error('Mapeie as colunas de Referência e Preço.');
      return;
    }

    setLoading(true);
    addLog('--- INICIANDO ATUALIZAÇÃO ---');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não logado.');

      let updatedCount = 0;
      let notFoundCount = 0;
      let errorCount = 0;
      const mismatches: any[] = []; // Lista para auditoria
      const rollbackData: any[] = []; // snapshot para possível desfazer

      const BATCH_SIZE = 20;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (row) => {
            const refValue = getField(row, mapping.ref);
            if (!refValue) return;

            const priceRaw = mapping.price
              ? getField(row, mapping.price)
              : undefined;
            const saleRaw = mapping.sale_price
              ? getField(row, mapping.sale_price)
              : undefined;

            const parseRawToNumber = (raw: any) => {
              if (raw === undefined || raw === null || raw === '')
                return undefined;
              if (typeof raw === 'number') return raw;
              if (typeof raw === 'string') {
                const clean = raw.replace(/[^\d,.-]/g, '');
                if (clean.includes(',') && !clean.includes('.')) {
                  return parseFloat(clean.replace(',', '.'));
                } else if (clean.includes('.') && clean.includes(',')) {
                  return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
                }
                return parseFloat(clean);
              }
              return Number(raw);
            };

            const newPrice = parseRawToNumber(priceRaw);
            const newSalePrice = parseRawToNumber(saleRaw);

            if (newPrice === undefined && newSalePrice === undefined) return;

            if (
              (newPrice !== undefined && isNaN(newPrice)) ||
              (newSalePrice !== undefined && isNaN(newSalePrice))
            ) {
              const errorMsg = `Preço inválido para Ref ${refValue}`;
              if (stopOnError) {
                console.error('╔════════════════════════════════╗');
                console.error('║   ❌ ERRO NO PROCESSAMENTO    ║');
                console.error('╚════════════════════════════════╝');
                console.error(`Produto: ${refValue}`);
                console.error(`Motivo: ${errorMsg}`);
                addLog(`ERRO CRÍTICO: ${errorMsg}`, 'error');
                toast.error(`Processo interrompido: ${errorMsg}`, {
                  duration: 10000,
                });
                setLoading(false);
                return;
              }
              addLog(`Erro: ${errorMsg}`, 'error');
              errorCount++;
              return;
            }

            const updatePayload: Record<string, any> = {
              updated_at: new Date().toISOString(),
            };
            if (newPrice !== undefined) updatePayload.price = newPrice;
            if (newSalePrice !== undefined)
              updatePayload.sale_price = newSalePrice;

            // Captura do valor atual para rollback
            const { data: existing } = await supabase
              .from('products')
              .select('id, price, sale_price')
              .eq('user_id', user.id)
              .eq('reference_code', String(refValue))
              .maybeSingle();
            if (existing) {
              rollbackData.push({
                id: existing.id,
                old_values: {
                  price: existing.price,
                  sale_price: existing.sale_price,
                },
              });
            }

            const { error, data } = await supabase
              .from('products')
              .update(updatePayload)
              .eq('user_id', user.id)
              .eq('reference_code', String(refValue))
              .select('id');

            if (error) {
              const errorMsg = `Erro ao atualizar ${refValue}: ${error.message}`;
              if (stopOnError) {
                console.error('╔════════════════════════════════╗');
                console.error('║   ❌ ERRO NO PROCESSAMENTO    ║');
                console.error('╚════════════════════════════════╝');
                console.error(`Produto: ${refValue}`);
                console.error(`Motivo: ${error.message}`);
                addLog(`ERRO CRÍTICO: ${errorMsg}`, 'error');
                toast.error(`Processo interrompido: ${errorMsg}`, {
                  duration: 10000,
                });
                setLoading(false);
                return;
              }
              addLog(errorMsg, 'error');
              errorCount++;
            } else if (!data || data.length === 0) {
              addLog(`Produto não encontrado: ${refValue}`, 'warn');
              notFoundCount++;
              mismatches.push({ key: String(refValue) }); // Adiciona à lista de falhas
            } else {
              updatedCount++;
            }
          })
        );

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // --- GRAVAÇÃO DA AUDITORIA (SYNC_LOGS) ---
      await supabase.from('sync_logs').insert({
        user_id: user.id,
        filename: fileName || 'Atualização de Preços',
        target_column: 'update_prices', // Identificador da ferramenta
        total_processed: rows.length,
        updated_count: updatedCount,
        mismatch_count: notFoundCount,
        mismatch_list: mismatches,
        rollback_data: rollbackData,
      });

      setStats({
        total: rows.length,
        updated: updatedCount,
        notFound: notFoundCount,
        errors: errorCount,
      });

      addLog('--- PROCESSO FINALIZADO E REGISTRADO ---', 'success');
      setStep(3);
      toast.success('Atualização concluída e auditada!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro durante o processamento.');
      addLog(`Erro Fatal: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Referencia: 'REF-001', Novo_Preco: 150.0, Preco_Promocional: 139.9 },
      { Referencia: 'REF-002', Novo_Preco: 299.9, Preco_Promocional: '' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Precos');
    XLSX.writeFile(wb, 'modelo_atualizacao_precos.xlsx');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-1rem)] bg-gray-50 dark:bg-slate-950 p-4 md:p-6 overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl shadow-sm">
            <DollarSign size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Atualização de Preços
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Atualize valores em massa via planilha Excel.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/products"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} />
          Voltar para Lista
        </Link>
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-center space-y-6 max-w-lg w-full shadow-sm">
            <div className="mx-auto w-16 h-16 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
              <FileSpreadsheet size={32} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Carregar Planilha
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                O arquivo deve conter as colunas de Referência e Preço.
              </p>
            </div>

            <div className="flex flex-col gap-3 items-center w-full">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-all font-bold shadow-md active:scale-95"
              >
                <Upload size={18} />
                Escolher Arquivo (.xlsx)
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={downloadTemplate}
                className="text-sm text-[var(--primary)] hover:underline mt-2 font-medium flex items-center gap-1"
              >
                <Download size={14} /> Baixar modelo de exemplo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Mapeamento e Execução */}
      {step === 2 && (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm shrink-0">
            <h3 className="font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
              <Edit3 size={18} /> Mapeamento de Colunas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                  Referência *
                </label>
                <select
                  className="w-full border-gray-300 dark:border-slate-700 rounded-lg text-sm p-2.5 border bg-gray-50 dark:bg-slate-800 outline-none dark:text-white"
                  value={mapping.ref || ''}
                  onChange={(e) =>
                    setMapping({ ...mapping, ref: e.target.value })
                  }
                >
                  <option value="">-- Selecione --</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                  Novo Preço *
                </label>
                <select
                  className="w-full border-gray-300 dark:border-slate-700 rounded-lg text-sm p-2.5 border bg-gray-50 dark:bg-slate-800 outline-none dark:text-white"
                  value={mapping.price || ''}
                  onChange={(e) =>
                    setMapping({ ...mapping, price: e.target.value })
                  }
                >
                  <option value="">-- Selecione --</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                  Preço Promocional
                </label>
                <select
                  className="w-full border-gray-300 dark:border-slate-700 rounded-lg text-sm p-2.5 border bg-gray-50 dark:bg-slate-800 outline-none dark:text-white"
                  value={mapping.sale_price || ''}
                  onChange={(e) =>
                    setMapping({ ...mapping, sale_price: e.target.value })
                  }
                >
                  <option value="">-- Ignorar --</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stopOnError}
                  onChange={(e) => setStopOnError(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded border-gray-300 dark:border-slate-700 focus:ring-red-500"
                />
                <AlertTriangle size={16} className="text-red-500" />
                <span className="font-medium">Parar ao primeiro erro</span>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300 font-medium transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={loading}
                  className="px-8 py-2.5 bg-[var(--primary)] text-white hover:opacity-90 rounded-lg font-bold shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Play size={18} />
                  )}
                  {loading ? 'Processando...' : 'Iniciar Atualização'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono shadow-inner border border-gray-800 flex-1 overflow-y-auto">
            <div className="mb-3 text-gray-500 border-b border-gray-700 pb-2 font-bold flex items-center gap-2 sticky top-0 bg-gray-900">
              <Terminal size={14} /> LOG DE EXECUÇÃO
            </div>
            <div className="space-y-1">
              {logs.length === 0 && (
                <span className="opacity-30 italic">
                  Aguardando início do processo...
                </span>
              )}
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="truncate border-b border-gray-800/30 pb-0.5 last:border-0"
                >
                  <span className="opacity-40 mr-2">
                    [{new Date().toLocaleTimeString()}]
                  </span>
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Resumo Final */}
      {step === 3 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-gray-200 dark:border-slate-800 text-center shadow-lg max-w-xl w-full animate-in zoom-in-95">
            <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Processo Finalizado!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              O histórico foi registrado na aba Saúde dos Dados.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {stats.updated}
                </p>
                <p className="text-[10px] uppercase font-black text-green-800 mt-1">
                  Atualizados
                </p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-900/20 text-center">
                <p className="text-3xl font-bold text-yellow-600">
                  {stats.notFound}
                </p>
                <p className="text-[10px] uppercase font-black text-yellow-800 mt-1">
                  Ignorados
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20 text-center">
                <p className="text-3xl font-bold text-red-600">
                  {stats.errors}
                </p>
                <p className="text-[10px] uppercase font-black text-red-800 mt-1">
                  Erros
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Nova Atualização
              </button>
              <Link
                href="/dashboard/products"
                className="px-6 py-2.5 text-sm text-white bg-[var(--primary)] rounded-lg font-bold shadow-md"
              >
                Voltar ao Catálogo
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
