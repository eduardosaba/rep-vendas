'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  Upload, X, FileText, Check, Loader2, 
  Database, Zap, Search, AlertCircle, Download,
  ChevronRight, RefreshCcw, LayoutPanelLeft 
} from 'lucide-react';

export default function MasterSyncPage() {
  const supabase = createClient();
  const [fileData, setFileData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [dbColumns, setDbColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<{ dbField: string; excelCol: string; customField?: string }[]>([
    { dbField: '', excelCol: '', customField: '' },
  ]);
  const [matchCol, setMatchCol] = useState('');
  const [nameCol, setNameCol] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [techSpecsMappings, setTechSpecsMappings] = useState<string[]>([]);
  const [productTechMappings, setProductTechMappings] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [existingTechKeys, setExistingTechKeys] = useState<string[]>([]);
  const [existingTechSelected, setExistingTechSelected] = useState<string[]>([]);
  const [techTitles, setTechTitles] = useState<Record<string, string>>({});
  const logsRef = useRef<HTMLDivElement | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [previewResults, setPreviewResults] = useState<any[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (m: string) => setLogs((s) => [...s, `[${new Date().toLocaleTimeString()}] ${m}`]);

  // Função de leitura corrigida (Binary String para melhor compatibilidade com acentos)
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const bstr = ev.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if (data.length > 0) {
        setFileData(data as any[]);
        setColumns(Object.keys(data[0] as object));
        addLog(`✨ Planilha carregada: ${data.length} linhas detectadas.`);
        toast.success('Excel processado com sucesso!');
      }
    };
    reader.readAsBinaryString(file);
  };

  useEffect(() => {
    (async () => {
      const { data, error }: any = await supabase.rpc('get_products_columns');
      if (!error && Array.isArray(data)) {
        setDbColumns(data.map((r: any) => r.column_name).filter(Boolean));
      }
    })();
    // fetch brands for filter
    (async () => {
      try {
        const { data: b } = await supabase.from('products').select('brand').limit(1000);
        if (Array.isArray(b)) {
          const uniq = Array.from(new Set(b.map((r: any) => String(r.brand || '').trim()).filter(Boolean)));
          setBrands(uniq.sort());
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [supabase]);

  // when brand changes, collect existing technical_specs keys across a sample of products
  useEffect(() => {
    if (!selectedBrand) {
      setExistingTechKeys([]);
      setExistingTechSelected([]);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('technical_specs')
          .eq('brand', selectedBrand)
          .limit(200);

        if (!mounted || !Array.isArray(data)) return;
        const keys = new Set<string>();
        for (const p of data) {
          const raw = p?.technical_specs;
          if (!raw) continue;
          if (typeof raw === 'object') {
            Object.keys(raw).forEach((k) => keys.add(k));
          } else if (typeof raw === 'string') {
            try {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object') Object.keys(parsed).forEach((k) => keys.add(k));
            } catch {
              // ignore
            }
          }
        }

        const arr = Array.from(keys).sort();
        setExistingTechKeys(arr);
        setExistingTechSelected(arr.slice()); // default: select all
        // initialize titles for existing keys (if not set)
        setTechTitles((prev) => {
          const next = { ...prev };
          arr.forEach((k) => {
            const key = `db:${k}`;
            if (!next[key]) next[key] = k;
          });
          return next;
        });
      } catch (e) {
        console.error('[master-sync] erro ao coletar technical_specs por marca', e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedBrand]);

  // Análise em lote (runCompare)
  const runCompare = async () => {
    if (!matchCol) return toast.error('Escolha a coluna SKU do Excel.');

    setLoading(true);
    setIsProcessing(true);
    setProgress(0);
    setPreviewResults([]);
    addLog('🔎 Iniciando análise em massa...');

    const BATCH_SIZE = 500;
    const totalRows = fileData.length;
    const allResults: any[] = [];

    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      const batch = fileData.slice(i, i + BATCH_SIZE);
      const batchSkus = batch.map((row: any) => String(row[matchCol] ?? '').trim()).filter(Boolean);

          const fields = Array.from(
            new Set(
              mappings
                .map((m) => (m.dbField === '__custom__' ? m.customField : m.dbField))
                .filter(Boolean)
            )
          );
      const selectCols = fields.length > 0 ? fields.join(',') + ',id,reference_code,name' : 'id,reference_code,name';

      try {
        const { data: prods, error } = await supabase
          .from('products')
          .select(selectCols)
          .in('reference_code', batchSkus as any[]);

        if (error) {
          addLog(`❌ Erro ao buscar lote: ${error.message}`);
          setProgress(Math.min(Math.round(((i + BATCH_SIZE) / totalRows) * 100), 100));
          continue;
        }

        batch.forEach((row: any) => {
          const sku = String(row[matchCol] ?? '').trim();
          const dbProd = (prods as any[] | null)?.find(p => p.reference_code === sku);
          if (!dbProd) return;

          const diffs: any[] = [];
          mappings.forEach((m) => {
            const dbFieldName = m.dbField === '__custom__' ? m.customField : m.dbField;
            if (!dbFieldName || !m.excelCol) return;
            let excelVal = row[m.excelCol];
            let dbVal = dbProd[dbFieldName];

            if (['is_active', 'fotocromatico', 'polarizado'].includes(dbFieldName)) {
              excelVal = (String(excelVal).toLowerCase() === 'sim' || excelVal === 1 || String(excelVal).toLowerCase() === 'true');
              dbVal = !!dbVal;
            }

            if (String(dbVal ?? '') !== String(excelVal ?? '')) {
              diffs.push({ field: dbFieldName, dbVal, excelVal });
            }
          });

          if (diffs.length > 0) allResults.push({ sku, name: dbProd.name, diffs });
        });

      } catch (err: any) {
        addLog(`❌ Erro no lote: ${err.message}`);
      }

      setProgress(Math.min(Math.round(((i + BATCH_SIZE) / totalRows) * 100), 100));
    }

    setPreviewResults(allResults);
    setShowPreviewModal(true);
    setIsProcessing(false);
    setLoading(false);
    addLog(`✅ Análise concluída. ${allResults.length} divergências encontradas.`);
  };

  // Execução em lote com paralelismo controlado
  const handleMasterSync = async (useDoubleCheck = true) => {
    if (!matchCol) return toast.error('Defina a coluna de referência (SKU).');

    setLoading(true);
    setIsProcessing(true);
    setProgress(0);
    addLog(`🚀 Iniciando processamento em lote de ${fileData.length} linhas...`);

    const BATCH_SIZE = 100;
    const CONCURRENCY = 3; // número de requisições RPC em paralelo
    const totalRows = fileData.length;

    // Pré-cria todos os batches
    const batches: any[][] = [];
    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      batches.push(fileData.slice(i, i + BATCH_SIZE));
    }

    const totalBatches = batches.length;

    const processBatch = async (batchIdx: number) => {
      const batch = batches[batchIdx];
        // Antes de montar o payload, buscar produtos do lote quando necessário
        const productFields = Array.isArray(productTechMappings) && productTechMappings.length > 0 ? productTechMappings : [];
        let prodsMap: Record<string, any> = {};
        if (productFields.length > 0 || (existingTechSelected && existingTechSelected.length > 0)) {
          try {
            const skus = batch.map((row: any) => String(row[matchCol] ?? '').trim()).filter(Boolean);
            if (skus.length > 0) {
              const selectCols = ['id', 'reference_code', ...productFields, ...(existingTechSelected.length > 0 ? ['technical_specs'] : [])].join(',');
              const { data: prods } = await supabase.from('products').select(selectCols).in('reference_code', skus as any[]);
              if (Array.isArray(prods)) {
                prodsMap = prods.reduce((acc: any, p: any) => { acc[String(p.reference_code)] = p; return acc; }, {});
              }
            }
          } catch (e) {
            console.error('[master-sync] erro ao buscar produtos para payload técnico', e);
          }
        }

        const batchPayload = batch.map((row: any) => {
        const sku = String(row[matchCol] ?? '').trim();
        if (!sku) return null;
        const payload: any = {};

        // Campos mapeados normais
        mappings.forEach((m) => {
          const dbFieldName = m.dbField === '__custom__' ? m.customField : m.dbField;
          if (dbFieldName && m.excelCol) {
            let v = row[m.excelCol];
            if (['is_active', 'fotocromatico', 'polarizado'].includes(dbFieldName)) {
              v = String(v).toLowerCase();
              v = v === '1' || v === 'true' || v === 'sim' || v === 'yes';
            }
            payload[dbFieldName] = v;
          }
        });

        // Monta technical_specs a partir das colunas selecionadas pelo usuário
        if (techSpecsMappings.length > 0 || (productTechMappings && productTechMappings.length > 0)) {
          const techJson: Record<string, any> = {};
          techSpecsMappings.forEach((col) => {
            const title = techTitles[`excel:${col}`] || col;
            techJson[title] = row[col] ?? '---';
          });

          // Adiciona campos vindos da tabela products (valores atuais do produto)
          if (productTechMappings && productTechMappings.length > 0) {
            const dbProd = prodsMap[sku] || null;
            productTechMappings.forEach((f) => {
              const title = techTitles[`prod:${f}`] || f;
              techJson[title] = dbProd ? (dbProd[f] ?? '---') : '---';
            });
          }

          // include existing technical_specs keys from DB (for selected brand)
          if (existingTechSelected && existingTechSelected.length > 0) {
            const dbProd = prodsMap[sku] || null;
            existingTechSelected.forEach((k) => {
              const title = techTitles[`db:${k}`] || k;
              const val = dbProd ? (dbProd.technical_specs ? (dbProd.technical_specs[k] ?? '---') : '---') : '---';
              techJson[title] = val;
            });
          }

          payload['technical_specs'] = techJson;
        }

        // Se não há nada a atualizar, pula
        if (Object.keys(payload).length === 0) return null;

        return { target_sku: sku, update_data: payload };
      }).filter(Boolean);

      if (batchPayload.length === 0) return { ok: true };

      try {
        const { error } = await supabase.rpc('batch_update_products_master', { batch_data: batchPayload });
        if (error) {
          addLog(`❌ Erro no lote ${batchIdx + 1}: ${error.message}`);
          return { ok: false, error };
        }
        addLog(`📦 Lote ${batchIdx + 1} concluído.`);
        return { ok: true };
      } catch (err: any) {
        addLog(`❌ Erro no lote ${batchIdx + 1}: ${err.message}`);
        return { ok: false, error: err };
      }
    };

    // Executa batches em janelas com paralelismo controlado
    for (let i = 0; i < totalBatches; i += CONCURRENCY) {
      const window = Array.from({ length: Math.min(CONCURRENCY, totalBatches - i) }, (_, k) => i + k);
      const promises = window.map(idx => processBatch(idx));
      await Promise.all(promises);
      const completed = Math.min(i + CONCURRENCY, totalBatches);
      setProgress(Math.min(Math.round((completed / totalBatches) * 100), 100));
    }

    setIsProcessing(false);
    setLoading(false);
    setProgress(100);
    toast.success('Sincronização global finalizada!');
    addLog('✅ Sincronização concluída.');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER PREMIUM */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-200">
              <Zap size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Sincronizador Master</h1>
              <p className="text-slate-500 font-medium">Atualização global de atributos por SKU</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" className="rounded-2xl h-12 px-6 border-slate-200 font-bold text-slate-600 hover:bg-slate-50">
               <Download size={18} className="mr-2" /> Template
             </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* PAINEL ESQUERDO: CONFIGURAÇÃO */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* CARD UPLOAD */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">1. Fonte de Dados</h2>
              </div>

              <label className="group flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-200 rounded-[2rem] hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="p-4 bg-slate-100 rounded-2xl group-hover:bg-white group-hover:shadow-md transition-all mb-3">
                    <Upload className="text-slate-500 group-hover:text-indigo-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">Arraste ou clique para carregar</p>
                  <p className="text-xs text-slate-400 mt-1">.xlsx, .xls ou .csv</p>
                </div>
                <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFile} />
              </label>

              {columns.length > 0 && (
                <div className="grid grid-cols-1 gap-4 animate-in zoom-in-95">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">SKU / Referência (Excel)</label>
                    <select value={matchCol} onChange={(e) => setMatchCol(e.target.value)} className="w-full h-12 px-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none ring-2 ring-transparent focus:ring-indigo-600 transition-all">
                      <option value="">Selecione a coluna...</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* CARD MAPEAMENTO */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">2. Mapeamento Inteligente</h2>
                </div>
                <Button onClick={() => setMappings([...mappings, { dbField: '', excelCol: '' }])} variant="ghost" className="text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl">
                  + Adicionar
                </Button>
              </div>

              <div className="space-y-3">
                {mappings.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 group animate-in slide-in-from-left-2">
                    <div className="flex-1">
                      <select
                        className="w-full h-11 px-4 rounded-xl bg-slate-50 border-none text-xs font-bold text-slate-600"
                        value={m.dbField}
                        onChange={(e) => {
                          const c = [...mappings];
                          c[i].dbField = e.target.value;
                          // reset customField when switching away
                          if (e.target.value !== '__custom__') c[i].customField = '';
                          setMappings(c);
                        }}
                      >
                        <option value="">Campo DB</option>
                        {dbColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                        <option value="__custom__">Outro campo...</option>
                      </select>
                      {m.dbField === '__custom__' && (
                        <input
                          className="mt-2 w-full h-10 px-3 rounded-lg bg-white border border-slate-100 text-xs"
                          placeholder="Nome do campo no banco (ex: sku_custom)"
                          value={m.customField || ''}
                          onChange={(e) => {
                            const c = [...mappings];
                            c[i].customField = e.target.value;
                            setMappings(c);
                          }}
                        />
                      )}
                    </div>

                    <ChevronRight size={14} className="text-slate-300" />

                    <select
                      className="flex-1 h-11 px-4 rounded-xl bg-slate-50 border-none text-xs font-bold text-slate-600"
                      value={m.excelCol}
                      onChange={(e) => {
                        const c = [...mappings];
                        c[i].excelCol = e.target.value;
                        setMappings(c);
                      }}
                    >
                      <option value="">Coluna Excel</option>
                      {columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => setMappings(mappings.filter((_, idx) => idx !== i))}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* CARD: COMPOSIÇÃO DE FICHA TÉCNICA (JSON) */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 shadow-sm">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">3. Ficha Técnica Dinâmica</h2>
                    <p className="text-[10px] text-slate-500 font-bold">INCREMENTAR ATRIBUTOS AO JSON</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500">
                  {techSpecsMappings.length} CAMPOS SELECIONADOS
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-4 bg-slate-50/50 rounded-[1.5rem] border border-slate-100 scrollbar-thin scrollbar-thumb-slate-200">
                {columns.map((col) => {
                  const isSelected = techSpecsMappings.includes(col);
                  return (
                    <button
                      key={col}
                      onClick={() => {
                        if (isSelected) setTechSpecsMappings(techSpecsMappings.filter((c) => c !== col));
                        else setTechSpecsMappings([...techSpecsMappings, col]);
                      }}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-[10px] font-bold transition-all duration-200 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 scale-[1.02]'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {isSelected ? <Check size={12} /> : <div className="w-3 h-3 rounded-sm border border-slate-300" />}
                      <span className="truncate">{col}</span>
                    </button>
                  );
                })}
              </div>

              {/* Opção: adicionar campos existentes da tabela `products` à ficha técnica */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-2xl text-emerald-600">
                      <Database size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Campos do produto</h3>
                      <p className="text-[10px] text-slate-500">Adicione campos existentes da tabela <strong>products</strong> para serem incluídos na ficha técnica</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500">{productTechMappings.length} selecionados</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-3 bg-white rounded-lg border border-slate-100">
                  {dbColumns.map((col) => {
                    // Excluir colunas óbvias não interessantes
                    const ignore = ['id', 'created_at', 'updated_at'];
                    if (ignore.includes(col)) return null;
                    const selected = productTechMappings.includes(col);
                    return (
                      <button
                        key={`prod-${col}`}
                        onClick={() => {
                          if (selected) setProductTechMappings(productTechMappings.filter((c) => c !== col));
                          else setProductTechMappings([...productTechMappings, col]);
                        }}
                        className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition-all ${selected ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-100 text-slate-600 hover:bg-emerald-50'}`}
                      >
                        {selected ? <Check size={12} /> : <div className="w-3 h-3 rounded-sm border border-slate-300" />}
                        <span className="truncate">{col}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Selecione marca para limitar atualização */}
              <div className="mt-4">
                <label className="text-xs font-black uppercase text-slate-400 mb-2 block">Filtrar por Marca (opcional)</label>
                <div className="flex gap-2 items-center">
                  <select value={selectedBrand || ''} onChange={(e) => setSelectedBrand(e.target.value || null)} className="h-11 px-4 rounded-xl bg-white border border-slate-100">
                    <option value="">(Todas as marcas)</option>
                    {brands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-500">Ao filtrar, a ação atualizará apenas produtos dessa marca.</span>
                </div>
              </div>

              {/* Existing technical_specs keys (from selected brand) */}
              {existingTechKeys.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black uppercase text-slate-400">Chaves já presentes na Ficha Técnica (marca selecionada)</h4>
                    <button
                      onClick={() => setExistingTechSelected(existingTechSelected.length === existingTechKeys.length ? [] : existingTechKeys.slice())}
                      className="text-xs text-indigo-600"
                    >
                      {existingTechSelected.length === existingTechKeys.length ? 'Desmarcar tudo' : 'Marcar tudo'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-white rounded-lg border border-slate-100 max-h-56 overflow-y-auto">
                    {existingTechKeys.map((k) => {
                      const sel = existingTechSelected.includes(k);
                      return (
                        <div key={`ek-${k}`} className="flex flex-col gap-2 p-2 rounded-md border bg-white">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={sel} onChange={() => {
                              setExistingTechSelected((s) => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);
                            }} />
                            <span className="text-xs truncate">{k}</span>
                          </label>
                          <input className="text-xs p-1 rounded-md border border-slate-100" placeholder="Título exibido" value={techTitles[`db:${k}`] || k} onChange={(e) => setTechTitles(t => ({ ...t, [`db:${k}`]: e.target.value }))} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                  <AlertCircle size={12} className="inline mr-1 mb-0.5" />
                  <strong>Nota Master:</strong> Os campos selecionados acima serão mesclados aos existentes. Se o produto já possuir um atributo e você importar um novo valor, ele será atualizado mantendo os outros campos intactos.
                </p>
              </div>
            </div>
          </div>

          {/* PAINEL DIREITO: CONSOLE E AÇÕES */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* CONSOLE ESTILO TERMINAL PREMIUM */}
            <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-800 flex flex-col h-[400px]">
              <div className="flex items-center justify-between px-6 py-4 bg-slate-800/50 border-b border-slate-800">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Console v2.0</span>
              </div>
              <div ref={logsRef} className="flex-1 p-6 overflow-y-auto font-mono text-xs space-y-2 text-indigo-300 scrollbar-thin scrollbar-thumb-slate-700">
                {logs.length === 0 && <div className="text-slate-600 italic">Aguardando comando...</div>}
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-slate-600 shrink-0 select-none">{i+1}</span>
                    <span className={`${log.includes('❌') ? 'text-red-400' : log.includes('⚠️') ? 'text-amber-400' : 'text-indigo-300'}`}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AÇÕES PRINCIPAIS */}
            {isProcessing && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-100 shadow-xl shadow-indigo-50/50 animate-in slide-in-from-top-4 duration-500 mb-6">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-indigo-600 font-black text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
                      {loading ? <RefreshCcw size={14} className="animate-spin" /> : <Search size={14} />}
                      {loading ? 'Sincronizando Banco' : 'Analisando Divergências'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold">{loading ? 'Gravando alterações globais...' : 'Comparando Excel vs Supabase...'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-indigo-600">{progress}%</span>
                  </div>
                </div>

                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-[2px]">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="w-full h-full opacity-30 bg-[linear-gradient(45deg,rgba(255,255,255,0.4)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.4)_50%,rgba(255,255,255,0.4)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-stripe_1s_linear_infinite]" />
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Button 
                onClick={() => runCompare()}
                disabled={loading || fileData.length === 0}
                className="h-20 rounded-[2rem] bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95"
               >
                 {loading ? <Loader2 className="animate-spin mr-2" /> : <Search size={20} className="mr-3" />}
                 Análise Segura
               </Button>

               <Button 
                onClick={() => handleMasterSync(false)}
                disabled={loading || fileData.length === 0}
                className="h-20 rounded-[2rem] bg-indigo-600 text-white hover:bg-indigo-700 font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all active:scale-95"
               >
                 {loading ? <Loader2 className="animate-spin mr-2" /> : <RefreshCcw size={20} className="mr-3" />}
                 Sync Global Direto
               </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
