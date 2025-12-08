'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { supabase as sharedSupabase } from '@/lib/supabaseClient';
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
} from 'lucide-react';
import { toast } from 'sonner';

type Stats = {
  total: number;
  updated: number;
  notFound: number;
  errors: number;
};

// Limpa strings para facilitar busca de colunas (ex: "Preço Venda" -> "precovenda")
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
  const supabase = sharedSupabase;

  // Estados
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Dados do Arquivo
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  // Mapeamento (Só precisamos de 2 campos)
  const [mapping, setMapping] = useState<{
    ref?: string; // Coluna da Referência (Chave de busca)
    price?: string; // Coluna do Novo Preço
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
    setLogs((prev) => [...prev, `${icon}${message}`]);
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
          toast.error('Planilha vazia.');
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
        toast.error('Erro ao ler arquivo.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const autoMapColumns = (cols: string[]) => {
    const map: typeof mapping = {};

    // Tenta achar colunas comuns
    map.ref = cols.find((c) => /ref|sku|codigo|code/i.test(normalizeKey(c)));
    map.price = cols.find((c) =>
      /preco|price|valor|novo/i.test(normalizeKey(c))
    );

    setMapping(map);
    if (map.ref && map.price) {
      addLog('Colunas identificadas automaticamente.', 'success');
    } else {
      addLog('Por favor, selecione as colunas correspondentes.', 'warn');
    }
  };

  // --- 2. Processamento e Atualização ---
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

      // Processamento em pequenos lotes (Batch) para não travar,
      // mas precisamos fazer updates individuais ou usar um "Upsert" cuidadoso.
      // Como queremos atualizar APENAS o preço e precisamos saber se existe,
      // faremos verificações em paralelo controlado.

      const BATCH_SIZE = 10;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        // Executa o lote em paralelo
        await Promise.all(
          batch.map(async (row) => {
            const refValue = getField(row, mapping.ref);
            const priceRaw = getField(row, mapping.price);

            if (!refValue) return; // Pula linha vazia

            // Tratamento de Preço (Brasil/EUA)
            let newPrice = 0;
            if (typeof priceRaw === 'string') {
              // Remove R$, troca vírgula por ponto
              newPrice = parseFloat(
                priceRaw.replace(/[^\d,.-]/g, '').replace(',', '.')
              );
            } else {
              newPrice = Number(priceRaw);
            }

            if (isNaN(newPrice)) {
              addLog(
                `Preço inválido para Ref ${refValue}: "${priceRaw}"`,
                'error'
              );
              errorCount++;
              return;
            }

            // Executa Update no Supabase
            // Importante: Filtra por user_id para garantir segurança
            const res: any = await supabase
              .from('products')
              .update({ price: newPrice })
              .eq('user_id', user.id)
              .eq('reference_code', String(refValue))
              .select('id');

            const { error, data } = res || {};

            if (error) {
              addLog(
                `Erro ao atualizar ${refValue}: ${error.message}`,
                'error'
              );
              errorCount++;
            } else if (!data || data.length === 0) {
              addLog(`Produto não encontrado: ${refValue}`, 'warn');
              notFoundCount++;
            } else {
              addLog(
                `Atualizado: ${refValue} -> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newPrice)}`,
                'success'
              );
              updatedCount++;
            }
          })
        );
      }

      setStats({
        total: rows.length,
        updated: updatedCount,
        notFound: notFoundCount,
        errors: errorCount,
      });

      addLog('--- FINALIZADO ---');
      setStep(3);
      toast.success('Atualização concluída!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message);
      addLog(`Erro Fatal: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Referencia: 'REF-001', Novo_Preco: '150,00' },
      { Referencia: 'REF-002', Novo_Preco: '299,90' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Precos');
    XLSX.writeFile(wb, 'modelo_atualizacao_precos.xlsx');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pb-20 space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/products"
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="text-green-600" /> Atualização de Preços
          </h1>
          <p className="text-sm text-gray-500">
            Atualize valores em massa usando a Referência do produto.
          </p>
        </div>
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Carregar Planilha de Preços
            </h3>
            <p className="text-gray-500 max-w-md mx-auto text-sm mt-1">
              O arquivo precisa ter apenas duas colunas: Referência e o Novo
              Preço.
            </p>
          </div>

          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
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
              className="text-sm text-primary hover:underline mt-2 font-medium"
            >
              Baixar modelo simples
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Mapeamento e Execução */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <Edit3 size={18} /> Mapeie as Colunas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coluna Referência */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">
                  Coluna de Referência/Código *
                </label>
                <select
                  className="w-full border-gray-300 rounded-md text-sm p-2.5 border bg-gray-50 focus:bg-white focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
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
                <p className="text-[10px] text-gray-400 mt-1">
                  Usado para encontrar o produto.
                </p>
              </div>

              {/* Coluna Preço */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">
                  Coluna do Novo Preço *
                </label>
                <select
                  className="w-full border-gray-300 rounded-md text-sm p-2.5 border bg-gray-50 focus:bg-white focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
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
                <p className="text-[10px] text-gray-400 mt-1">
                  O valor que será salvo.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="bg-primary text-primary-foreground px-8 py-2.5 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 shadow-sm hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
              Atualizar Preços
            </button>
          </div>

          {/* Console de Logs */}
          <div className="bg-gray-900 text-green-400 p-4 rounded-md text-xs font-mono shadow-inner border border-gray-700 max-h-64 overflow-y-auto mt-6">
            <div className="mb-2 text-gray-500 border-b border-gray-700 pb-1 font-bold flex items-center gap-2">
              <Terminal size={14} /> LOG DE SISTEMA
            </div>
            {logs.length === 0 && (
              <span className="opacity-30 italic">Aguardando início...</span>
            )}
            {logs.map((log, index) => (
              <div
                key={index}
                className="truncate py-0.5 border-b border-gray-800/50 last:border-0 font-mono"
              >
                <span className="opacity-50 mr-2">
                  [{new Date().toLocaleTimeString()}]
                </span>
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* STEP 3: Resumo Final */}
      {step === 3 && (
        <div className="bg-white p-12 rounded-xl border text-center shadow-sm max-w-xl mx-auto animate-in zoom-in-95">
          <div className="mx-auto w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Atualização Finalizada!
          </h2>

          <div className="grid grid-cols-3 gap-4 my-8 text-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {stats.updated}
              </p>
              <p className="text-xs uppercase font-bold text-green-800 mt-1">
                Atualizados
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {stats.notFound}
              </p>
              <p className="text-xs uppercase font-bold text-yellow-800 mt-1">
                Não Encontrados
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
              <p className="text-xs uppercase font-bold text-red-800 mt-1">
                Erros
              </p>
            </div>
          </div>

          {stats.notFound > 0 && (
            <div className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded mb-6 text-left flex gap-2">
              <AlertTriangle className="flex-shrink-0" size={18} />
              <p>
                Alguns produtos da planilha não foram encontrados no sistema.
                Verifique se o Código de Referência está exato.
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Nova Atualização
            </button>
            <Link
              href="/dashboard/products"
              className="px-4 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium"
            >
              Voltar para Produtos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
