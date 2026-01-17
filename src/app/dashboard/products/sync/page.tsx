'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  AlertTriangle,
  Upload,
  Terminal,
  Search,
  Download,
  Save,
  Database,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SyncPreview {
  id?: string; // Adicionado para facilitar o batch update
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

  // Estados para o Progresso
  const [progress, setProgress] = useState({ current: 0, total: 0 });

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
        id: dbProduct.id, // Guardamos o ID real do banco
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
    addLog('🚀 Iniciando sincronização em lote...');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const updates = preview.filter((p) => p.status === 'match');
      const mismatches = preview.filter((p) => p.status === 'not_found');

      setProgress({ current: 0, total: updates.length });
      let updatedCount = 0;
      let errorCount = 0;

      // ESTRATÉGIA DE CHUNKS (Fatias de 50 produtos)
      const chunkSize = 50;
      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize);

        // Filtra itens sem `id` — evita que o upsert tente inserir linhas incompletas
        const validChunk = chunk.filter((item) => !!item.id);
        if (validChunk.length !== chunk.length) {
          const skipped = chunk.length - validChunk.length;
          addLog(
            `⚠️ Pulando ${skipped} item(s) sem ID no lote ${i / chunkSize + 1} (evita inserts inválidos)`
          );
        }
        if (validChunk.length === 0) {
          setProgress((prev) => ({
            ...prev,
            current: Math.min(i + chunkSize, updates.length),
          }));
          continue;
        }

        // Preparamos os dados para o UPSERT (Update em massa via ID)
        const batchData = validChunk.map((item) => {
          let val = item.newValue;
          if (dbTargetCol === 'price' || dbTargetCol === 'stock_quantity') {
            val =
              parseFloat(String(item.newValue).replace(/[^\d.-]/g, '')) || 0;
          }
          return {
            id: item.id, // O ID é a chave para o Supabase saber qual linha atualizar
            [dbTargetCol]: val,
            updated_at: new Date().toISOString(),
            user_id: user.id, // garante que RLS permita a operação (pertence ao usuário)
          };
        });

        // Atualiza um-a-um para evitar inserts (upsert pode inserir linhas incompletas)
        const results = await Promise.allSettled(
          validChunk.map((item) => {
            let val = item.newValue;
            if (dbTargetCol === 'price' || dbTargetCol === 'stock_quantity') {
              val =
                parseFloat(String(item.newValue).replace(/[^\d.-]/g, '')) || 0;
            }
            const updateObj: any = {
              [dbTargetCol]: val,
              updated_at: new Date().toISOString(),
              user_id: user.id,
            };
            return supabase
              .from('products')
              .update(updateObj)
              .eq('id', item.id);
          })
        );

        // Avalia resultados individuais
        let successful = 0;
        for (const r of results) {
          if (r.status === 'fulfilled') {
            const resp: any = r.value;
            if (resp.error) {
              addLog(
                `❌ Erro em update: ${resp.error.message || JSON.stringify(resp.error)}`
              );
              errorCount += 1;
              if (stopOnError) break;
            } else {
              successful += 1;
            }
          } else {
            addLog(`❌ Erro em update (rejected): ${String(r.reason)}`);
            errorCount += 1;
            if (stopOnError) break;
          }
        }

        updatedCount += successful;
        addLog(
          `✅ Bloco processado: ${updatedCount} produtos (${successful} atualizados).`
        );

        setProgress((prev) => ({
          ...prev,
          current: Math.min(i + chunkSize, updates.length),
        }));
      }

      // PREPARAR DADOS DE ROLLBACK (snapshot dos valores antigos)
      const rollbackData = updates.map((u) => ({
        id: u.id,
        old_value: u.currentValue,
        column: dbTargetCol,
      }));

      // SALVAR LOG FINAL (inclui snapshot para possível desfazer)
      await supabase.from('sync_logs').insert({
        user_id: user.id,
        filename: 'Importação via Excel (PROCV)',
        target_column: dbTargetCol,
        total_processed: preview.length,
        updated_count: updatedCount,
        mismatch_count: mismatches.length,
        mismatch_list: mismatches.map((m) => ({
          key: m.key,
          name: m.productName,
        })),
        rollback_data: rollbackData,
      });

      addLog(`✨ Finalizado com sucesso.`);
      toast.success(`Sincronização concluída! ${updatedCount} atualizados.`);
      setPreview([]);
    } catch (err: any) {
      addLog(`❌ Erro fatal: ${err.message}`);
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  // Funções de Download e Backup mantidas...
  const handleDownloadTemplate = () => {
    /* ... sua lógica atual ... */
  };
  const handleExportBackup = () => {
    /* ... sua lógica atual ... */
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 p-4 md:p-8 overflow-hidden">
      {/* HEADER MANTIDO */}
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
              <Save size={18} className="mr-2" /> Salvar Alterações
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-3 gap-8 overflow-hidden">
        <div className="space-y-6 overflow-y-auto">
          {/* BARRA DE PROGRESSO VISUAL */}
          {loading && progress.total > 0 && (
            <div className="bg-white p-6 rounded-[2rem] border shadow-xl animate-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase text-indigo-600">
                  Progresso da Sincronização
                </span>
                <span className="text-[10px] font-black text-gray-400">
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[9px] text-gray-400 mt-2 text-center font-bold">
                {progress.current} de {progress.total} produtos processados
              </p>
            </div>
          )}

          {/* PAINEL DE CONFIGURAÇÃO MANTIDO */}
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

          {/* CONSOLE DE OPERAÇÃO */}
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

        {/* TABELA DE PREVIEW MANTIDA */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b bg-gray-50/50">
            <h3 className="font-bold flex items-center gap-2 text-sm text-slate-700">
              <Search size={18} /> Preview de Alterações
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {preview.length > 0 ? (
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
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-20">
                <Database size={64} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO MANTIDO */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Confirmar Sincronização
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Você atualizará{' '}
              <strong>
                {preview.filter((p) => p.status === 'match').length} produtos
              </strong>{' '}
              em lote. Esta operação é rápida e segura.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 border rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteSync}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-2"
              >
                <Check size={18} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
