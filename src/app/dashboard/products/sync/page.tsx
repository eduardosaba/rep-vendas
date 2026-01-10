'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  Upload,
  Terminal,
  Search,
  Download,
  Save,
  Database,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SyncPreview {
  key: string;
  currentValue: any;
  newValue: any;
  productName: string;
  status: 'match' | 'not_found' | 'no_change';
}

export default function ProductSyncPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [stopOnError, setStopOnError] = useState(true);
  const [fileData, setFileData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [matchCol, setMatchCol] = useState('');
  const [valueCol, setValueCol] = useState('');
  const [dbTargetCol, setDbTargetCol] = useState('price');

  const [logs, setLogs] = useState<string[]>([]);
  const [preview, setPreview] = useState<SyncPreview[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    async function loadProducts() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('products')
        .select('id, name, reference_code, barcode, price, stock_quantity')
        .eq('user_id', user.id);
      if (data) setProducts(data);
    }
    loadProducts();
  }, [supabase]);

  const handleDownloadTemplate = () => {
    const template = [
      { REFERENCIA: 'REF123', EAN: '789...', VALOR: 150.0, ESTOQUE: 10 },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `template_repvendas.xlsx`);
    addLog('✅ Template baixado.');
  };

  const handleExportBackup = () => {
    const dataToExport = products.map((p) => ({
      Ref: p.reference_code,
      Nome: p.name,
      Atual: p[dbTargetCol],
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Backup');
    XLSX.writeFile(wb, `backup_produtos.xlsx`);
    addLog('✅ Backup gerado.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if (data.length > 0) {
        setFileData(data);
        setColumns(Object.keys(data[0] as object));
        addLog(`📄 Planilha carregada: ${data.length} linhas.`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const runPreview = () => {
    if (!matchCol || !valueCol) return toast.warning('Selecione as colunas.');
    addLog(`🔍 Analisando divergências em [${dbTargetCol}]...`);
    const results: SyncPreview[] = fileData.map((row) => {
      const excelKey = String(row[matchCol] || '');
      const excelValue = row[valueCol];
      const dbProduct = products.find((p) =>
        matchCol.toLowerCase().includes('ean')
          ? p.barcode === excelKey
          : p.reference_code === excelKey
      );
      if (!dbProduct)
        return {
          key: excelKey,
          newValue: excelValue,
          currentValue: null,
          productName: 'Não encontrado',
          status: 'not_found',
        };
      const currentDbValue = dbProduct[dbTargetCol] || 0;
      return {
        key: excelKey,
        newValue: excelValue,
        currentValue: currentDbValue,
        productName: dbProduct.name,
        status:
          String(currentDbValue) === String(excelValue) ? 'no_change' : 'match',
      };
    });
    setPreview(results);
  };

  const handleExecuteSync = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    addLog('🚀 Iniciando sincronização...');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const updates = preview.filter((p) => p.status === 'match');
      const mismatches = preview
        .filter((p) => p.status === 'not_found')
        .map((p) => ({ key: p.key, name: p.productName }));

      let updatedCount = 0;
      let errorCount = 0;

      // Processar item por item com controle de erro
      for (const item of updates) {
        try {
          const matchField = matchCol.toLowerCase().includes('ean')
            ? 'barcode'
            : 'reference_code';

          // Converter valor para o tipo apropriado
          let valueToUpdate = item.newValue;
          if (dbTargetCol === 'price' || dbTargetCol === 'stock_quantity') {
            valueToUpdate =
              parseFloat(String(item.newValue).replace(/[^\d.-]/g, '')) || 0;
          }

          const { data, error } = await supabase
            .from('products')
            .update({
              [dbTargetCol]: valueToUpdate,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .eq(matchField, String(item.key))
            .select('id');

          if (error) {
            const errorMsg = `Erro ao atualizar ${item.key}: ${error.message}`;
            if (stopOnError) {
              console.error('╔════════════════════════════════╗');
              console.error('║   ❌ ERRO NO PROCESSAMENTO    ║');
              console.error('╚════════════════════════════════╝');
              console.error(`Produto: ${item.productName}`);
              console.error(`Chave: ${item.key}`);
              console.error(`Motivo: ${error.message}`);
              addLog(`ERRO CRÍTICO: ${errorMsg}`);
              toast.error(`Processo interrompido: ${errorMsg}`, {
                duration: 10000,
              });
              setLoading(false);
              return;
            }
            addLog(`❌ ${errorMsg}`);
            errorCount++;
          } else if (!data || data.length === 0) {
            addLog(`⚠️ Produto não encontrado: ${item.key}`);
          } else {
            updatedCount++;
            addLog(`✅ ${item.productName} atualizado`);
          }
        } catch (itemError: any) {
          const errorMsg = `Erro ao processar ${item.key}: ${itemError.message}`;
          if (stopOnError) {
            console.error('╔════════════════════════════════╗');
            console.error('║   ❌ ERRO NO PROCESSAMENTO    ║');
            console.error('╚════════════════════════════════╝');
            console.error(`Produto: ${item.productName}`);
            console.error(`Motivo: ${itemError.message}`);
            addLog(`ERRO CRÍTICO: ${errorMsg}`);
            toast.error(`Processo interrompido: ${errorMsg}`, {
              duration: 10000,
            });
            setLoading(false);
            return;
          }
          addLog(`❌ ${errorMsg}`);
          errorCount++;
        }
      }

      // SALVAR NA TABELA DE LOGS
      await supabase.from('sync_logs').insert({
        user_id: user.id,
        filename: 'Importação via Excel (PROCV)',
        target_column: dbTargetCol,
        total_processed: preview.length,
        updated_count: updatedCount,
        mismatch_count: mismatches.length,
        mismatch_list: mismatches,
      });

      addLog(
        `✨ Concluído: ${updatedCount} atualizados, ${mismatches.length} não encontrados, ${errorCount} erros.`
      );
      toast.success(
        `Sincronização completa! ${updatedCount} produtos atualizados.`
      );
      setPreview([]);
    } catch (err: any) {
      console.error(err);
      addLog(`❌ Erro fatal: ${err.message}`);
      toast.error('Erro durante a sincronização.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 p-4 md:p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="p-3 bg-white rounded-2xl border shadow-sm"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-slate-900">
            Sincronizador PROCV
          </h1>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleDownloadTemplate} variant="outline">
            <FileText size={18} className="mr-2" /> Template
          </Button>
          <Button onClick={handleExportBackup} variant="outline">
            <Download size={18} className="mr-2" /> Backup
          </Button>
          {preview.some((p) => p.status === 'match') && (
            <Button
              onClick={() => setShowConfirmModal(true)}
              isLoading={loading}
              className="bg-green-600"
            >
              <Save size={18} className="mr-2" />
              Salvar Alterações
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-3 gap-8 overflow-hidden">
        <div className="space-y-6 overflow-y-auto">
          <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-6">
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center relative group">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-[10px] font-black uppercase text-gray-400">
                Arraste sua planilha aqui
              </p>
            </div>

            {fileData.length > 0 && (
              <div className="space-y-4">
                <select
                  value={matchCol}
                  onChange={(e) => setMatchCol(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm"
                >
                  <option value="">Coluna SKU/EAN...</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={dbTargetCol}
                  onChange={(e) => setDbTargetCol(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm text-primary"
                >
                  <option value="price">Atualizar Preços (R$)</option>
                  <option value="stock_quantity">
                    Atualizar Estoque (Un.)
                  </option>
                </select>
                <select
                  value={valueCol}
                  onChange={(e) => setValueCol(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm"
                >
                  <option value="">Coluna Novo Valor...</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={runPreview}
                  className="w-full py-7 rounded-2xl font-black uppercase text-xs tracking-widest"
                >
                  Comparar Dados
                </Button>
              </div>
            )}
          </div>

          <div className="bg-slate-950 p-5 rounded-[2rem] h-64 flex flex-col shadow-2xl">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase mb-3 border-b border-slate-900 pb-2">
              <Terminal size={14} className="text-emerald-500" /> Console de
              Operação
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-1">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b bg-gray-50/50">
            <h3 className="font-bold flex items-center gap-2 text-sm text-slate-700">
              <Search size={18} /> Preview de Alterações
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {preview.length > 0 ? (
              <>
                {/* DESKTOP: tabela de preview */}
                <div className="hidden md:block">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white border-b z-10">
                      <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="p-6">Produto</th>
                        <th className="p-6 text-right">Atual</th>
                        <th className="p-6 text-right text-primary">Novo</th>
                        <th className="p-6 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.map((item, i) => (
                        <tr key={i} className="text-xs group hover:bg-gray-50">
                          <td className="p-6">
                            <div className="font-bold text-slate-800">
                              {item.productName}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              Ref: {item.key}
                            </div>
                          </td>
                          <td className="p-6 text-right text-gray-400">
                            {item.currentValue ?? '--'}
                          </td>
                          <td className="p-6 text-right font-black text-primary">
                            {item.newValue}
                          </td>
                          <td className="p-6 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${item.status === 'match' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
                            >
                              {item.status === 'match'
                                ? 'Alterar'
                                : item.status === 'no_change'
                                  ? 'Igual'
                                  : 'Erro'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE: cards */}
                <div className="grid grid-cols-1 gap-3 md:hidden p-4">
                  {preview.map((item, i) => (
                    <div
                      key={i}
                      className="p-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {item.productName}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Ref: {item.key}
                          </div>
                        </div>
                        <div className="text-xs">
                          <span
                            className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${item.status === 'match' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
                          >
                            {item.status === 'match'
                              ? 'Alterar'
                              : item.status === 'no_change'
                                ? 'Igual'
                                : 'Erro'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="text-xs text-gray-400">
                          Atual:{' '}
                          <span className="text-gray-700 font-medium">
                            {item.currentValue ?? '--'}
                          </span>
                        </div>
                        <div className="text-xs text-primary font-black">
                          Novo:{' '}
                          <span className="ml-1 text-primary font-black">
                            {item.newValue}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-20">
                <Database size={64} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Confirmar Sincronização
              </h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Você está prestes a atualizar{' '}
              <strong className="text-primary">
                {preview.filter((p) => p.status === 'match').length} produtos
              </strong>
              . Esta ação não pode ser desfeita automaticamente.
            </p>

            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer mb-6 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
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
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteSync}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
