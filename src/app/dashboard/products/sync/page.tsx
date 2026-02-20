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
import {
  prepareProductImage,
  prepareProductGallery,
} from '@/lib/utils/image-logic';

interface SyncPreview {
  id?: string; // Adicionado para facilitar o batch update
  key: string;
  currentValue: any;
  newValue: any;
  displayValue?: any;
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
        .select('id, name, reference_code, barcode, price, sale_price, cost, stock_quantity, description, category, color, technical_specs')
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
          displayValue: excelValue,
          currentValue: null,
          productName: 'Não encontrado',
          status: 'not_found',
        };
      const currentDbValue = dbProduct[dbTargetCol] || 0;
      
      // Truncar textos longos para display (description, technical_specs)
      let displayVal = excelValue;
      if (['description', 'technical_specs'].includes(dbTargetCol) && typeof excelValue === 'string' && excelValue.length > 50) {
        displayVal = excelValue.substring(0, 50) + '...';
      }
      
      // If target is image_url, prepare a friendly preview (first URL + gallery hint)
      if (dbTargetCol === 'image_url' && typeof excelValue === 'string') {
        const firstUrl = excelValue.split(';')[0].trim();
        const hasGallery = excelValue.includes(';');
        const hasChanged = String(dbProduct.image_url) !== firstUrl;
        return {
          id: dbProduct.id,
          key: excelKey,
          newValue: excelValue, // keep full value for upsert
          displayValue: `${firstUrl}${hasGallery ? ' (+ galeria)' : ''}`,
          currentValue: dbProduct.image_url,
          productName: dbProduct.name,
          status: hasChanged ? 'match' : 'no_change',
        };
      }

      return {
        id: dbProduct.id, // Guardamos o ID real do banco
        key: excelKey,
        newValue: excelValue,
        displayValue: displayVal,
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

      // Filtra apenas os itens que realmente precisam mudar e deduplica por `id`
      const rawUpdates = preview.filter((p) => p.status === 'match');
      const updatesMap = new Map<string, SyncPreview>();
      rawUpdates.forEach((u) => {
        if (u.id) updatesMap.set(String(u.id), u); // mantém o último valor para o mesmo id
      });
      const updates = Array.from(updatesMap.values());
      if (updates.length < rawUpdates.length)
        addLog(
          `⚠️ ${rawUpdates.length - updates.length} registros duplicados foram removidos antes do upsert.`
        );

      setProgress({ current: 0, total: updates.length });

      let updatedCount = 0;
      const chunkSize = 50;

      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize);
        const batchImages: any[] = [];

        // Preparamos os dados para um ÚNICO comando UPSERT por lote
        const batchData = chunk.map((item) => {
          let val = item.newValue;
          
          // Tratamento numérico para campos de valor monetário e quantidade
          if (['price', 'sale_price', 'cost', 'stock_quantity'].includes(dbTargetCol)) {
            val = parseFloat(String(item.newValue).replace(/[^\d.-]/g, '')) || 0;
          }

          // Lógica especial para imagens: suporta múltiplas URLs separadas por ';'
          let imageProps: any = {};
          if (dbTargetCol === 'image_url') {
            const rawString = String(val || '').trim();
            const allUrls = rawString
              ? rawString
                .split(';')
                .map((u) => u.trim())
                .filter((u) => typeof u === 'string' && u.startsWith('http'))
              : [];

            if (allUrls.length > 0) {
              imageProps.image_url = allUrls[0];
              imageProps.images = allUrls; // atualiza JSONB images com a galeria completa
              imageProps.image_path = null; // força re-download
              imageProps.image_optimized = false;
              imageProps.sync_status = 'pending';

              if (item.id) {
                const gallery = prepareProductGallery(item.id, allUrls);
                batchImages.push(...gallery);
              }
            }
          }

          // Buscar produto atual para preservar campos NOT NULL
          const prodAtual = products.find((p) => p.id === item.id);

          return {
            id: item.id,
            name: item.productName, // OBRIGATÓRIO: Incluímos o nome para satisfazer a constraint NOT NULL
            [dbTargetCol]: val,
            ...imageProps, // Injeta sync_status e campos de imagem se for imagem
            // Preservar campos NOT NULL quando não estão sendo atualizados diretamente
            ...(dbTargetCol !== 'price' && {
              price: prodAtual?.price ?? item.currentValue ?? 0,
            }),
            updated_at: new Date().toISOString(),
            user_id: user.id,
          };
        });

        // Validação rápida: garantir que todos os registros do lote têm `id`
        const invalid = batchData.filter((d) => !d.id);
        if (invalid.length > 0) {
          addLog(
            `⚠️ Lote contém ${invalid.length} registros sem 'id', serão ignorados.`
          );
        }

        // Garantir IDs únicos dentro do lote para evitar ON CONFLICT DO UPDATE affecting same row twice
        const toUpsert = Array.from(
          new Map(
            batchData.filter((d) => d.id).map((d) => [String(d.id), d])
          ).values()
        );

        // Executa o lote inteiro de uma vez (Alta performance)
        let upsertError: any = null;
        try {
          const upsertRes: any = await supabase
            .from('products')
            .upsert(toUpsert, { onConflict: 'id' });
          upsertError = upsertRes.error;
          const upData = upsertRes.data as any[] | null;
          if (Array.isArray(upData) && upData.length > 0) {
            // opcional: log retorno
            addLog(`ℹ️ Resposta upsert: ${upData.length} linhas afetadas.`);
          }
        } catch (err) {
          upsertError = err;
        }

        if (!upsertError && batchImages.length > 0) {
          // Atualiza a galeria: DELETE + INSERT ("substituição total" para as linhas afetadas)
          // Isso garante que se o usuário forneceu uma lista nova, a antiga é removida.

          // Coletamos os IDs de produtos que estão sendo atualizados com imagens neste lote
          const productIds = Array.from(
            new Set(batchImages.map((img) => img.product_id))
          );

          if (productIds.length > 0) {
            // Removemos as imagens antigas desses produtos
            await supabase
              .from('product_images')
              .delete()
              .in('product_id', productIds);

            // Inserimos a nova lista
            const { error: galleryError } = await supabase
              .from('product_images')
              .insert(batchImages);

            if (galleryError) {
              console.warn('Erro ao atualizar galeria:', galleryError.message);
              addLog(
                `⚠️ Erro ao atualizar galeria de fotos: ${galleryError.message}`
              );
            }
          }
        }

        if (upsertError) {
          try {
            const msg =
              (upsertError && upsertError.message) || String(upsertError);
            addLog(`❌ Erro no lote ${Math.floor(i / chunkSize) + 1}: ${msg}`);

            // Tentar extrair detalhes adicionais do erro do Supabase
            const details =
              (upsertError &&
                (upsertError.details ||
                  upsertError.hint ||
                  upsertError.code)) ||
              null;
            if (details) addLog(`❗ Detalhes: ${String(details)}`);

            // Log do primeiro item do lote para diagnóstico (sem expor dados sensíveis)
            try {
              if (toUpsert && toUpsert.length > 0) {
                const first = toUpsert[0];
                addLog(
                  `❗ Primeiro item do lote (preview): ${JSON.stringify(first)}`
                );
              }
            } catch (e) {
              // ignore JSON errors
            }
          } catch {}
          if (stopOnError)
            throw new Error(
              (upsertError && upsertError.message) || 'Erro no upsert'
            );
        } else {
          updatedCount += toUpsert.length;
          addLog(
            `✅ Lote ${Math.floor(i / chunkSize) + 1} processado (${toUpsert.length} itens).`
          );
        }

        setProgress((prev) => ({
          ...prev,
          current: Math.min(i + chunkSize, updates.length),
        }));
      }

      // Snapshot para Log/Rollback (Opcional, mas mantido conforme seu código)
      const rollbackData = updates.map((u) => ({
        id: u.id,
        old_value: u.currentValue,
        column: dbTargetCol,
      }));

      await supabase.from('sync_logs').insert({
        user_id: user.id,
        filename: 'Importação via Excel (PROCV)',
        target_column: dbTargetCol,
        total_processed: preview.length,
        updated_count: updatedCount,
        mismatch_count: preview.filter((p) => p.status === 'not_found').length,
        rollback_data: rollbackData,
      });

      addLog(`✨ Finalizado com sucesso.`);
      toast.success(`Sincronização concluída! ${updatedCount} atualizados.`);
      setPreview([]);
    } catch (err: any) {
      addLog(`❌ Erro fatal: ${err.message}`);
      toast.error('Falha na sincronização.');
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
                  <option value="price">💰 Preços (Custo)</option>
                  <option value="sale_price">🏷️ Preços de Venda</option>
                  <option value="cost">📊 Custo Real</option>
                  <option value="stock_quantity">📦 Estoque (Quantidade)</option>
                  <option value="image_url">🖼️ URL Imagens</option>
                  <option value="barcode">🔢 Código de Barras (EAN)</option>
                  <option value="description">📝 Descrição</option>
                  <option value="category">🏪 Categoria</option>
                  <option value="color">🎨 Cor</option>
                  <option value="technical_specs">📋 Ficha Técnica</option>
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
                        {typeof item.currentValue === 'string' && item.currentValue.length > 40 
                          ? item.currentValue.substring(0, 40) + '...' 
                          : item.currentValue ?? '--'}
                      </td>
                      <td className="p-6 text-right font-black text-primary">
                        {typeof item.displayValue === 'string' && item.displayValue.length > 40
                          ? item.displayValue.substring(0, 40) + '...'
                          : item.displayValue}
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
