'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  Upload, X, FileText, Check, Loader2, 
  Database, Zap, Search, AlertCircle, Download,
  ChevronRight, RefreshCcw, LayoutPanelLeft, ListFilter,
  Settings2
} from 'lucide-react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressBar } from '@/components/ui/ProgressBar';

export default function MasterSyncPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState("data");
  const [fileData, setFileData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [dbColumns, setDbColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<{ dbField: string; excelCol: string; customField?: string }[]>([
    { dbField: '', excelCol: '', customField: '' },
  ]);
  const [matchCol, setMatchCol] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<Array<{ ref: string; before: any; after: any }>>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [finalOrder, setFinalOrder] = useState<Array<{ type: 'prod'|'excel'|'db'; key: string; title: string }> | null>(null);
  const [showOrderEditor, setShowOrderEditor] = useState(false);
  const [previewSource, setPreviewSource] = useState<'file' | 'brand' | null>(null);
  const [previewLimit, setPreviewLimit] = useState<number>(50);

  // States da Ficha Técnica
  const [techSpecsMappings, setTechSpecsMappings] = useState<string[]>([]);
  const [productTechMappings, setProductTechMappings] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [existingTechKeys, setExistingTechKeys] = useState<string[]>([]);
  const [existingTechSelected, setExistingTechSelected] = useState<string[]>([]);
  const [techTitles, setTechTitles] = useState<Record<string, string>>({});

  const logsRef = useRef<HTMLDivElement | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (m: string) => setLogs((s) => [...s, `[${new Date().toLocaleTimeString()}] ${m}`]);

  const moveArrayItem = <T,>(arr: T[], index: number, dir: number): T[] => {
    const to = index + dir;
    if (index < 0 || to < 0 || index >= arr.length || to >= arr.length) return arr;
    const next = [...arr];
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    return next;
  };

  // Move a productTechMappings position (up/down)
  const moveField = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...productTechMappings];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      setProductTechMappings(newOrder);
    }
  };

  // Carregar colunas do DB e Marcas (busca completa, sem limite)
  useEffect(() => {
    (async () => {
      const { data: cols } = await supabase.rpc('get_products_columns');
      if (Array.isArray(cols)) setDbColumns(cols.map((r: any) => r.column_name));

      // Tenta primeiro a tabela `brands` (coluna `name`), se existir.
      try {
        const { data: brandRows, error: brandErr } = await supabase.from('brands').select('name');
        if (!brandErr && Array.isArray(brandRows) && brandRows.length > 0) {
          // Normalize + dedupe by lowercase key but keep original casing from first occurrence
          const map = new Map<string, string>();
          brandRows.forEach((r: any) => {
            const name = String(r.name || '').trim();
            if (!name) return;
            const key = name.toLowerCase();
            if (!map.has(key)) map.set(key, name);
          });
          const brandsList = Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
          setBrands(brandsList);
          addLog(`✅ ${brandsList.length} marcas únicas carregadas da tabela brands.`);
          return;
        }
      } catch (e) {
        // ignore and fallback to products.brand
      }

      const { data: b, error } = await supabase
        .from('products')
        .select('brand')
        .not('brand', 'is', null);

      if (error) {
        addLog(`⚠️ Erro ao carregar marcas: ${error.message}`);
        return;
      }

      if (b) {
        const map = new Map<string, string>();
        b.forEach((r: any) => {
          const name = String(r.brand || '').trim();
          if (!name) return;
          const key = name.toLowerCase();
          if (!map.has(key)) map.set(key, name);
        });
        const brandsList = Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        setBrands(brandsList);
        addLog(`✅ ${brandsList.length} marcas únicas carregadas do banco (products.brand).`);
      }
    })();
  }, []);

  // Monitorar mudança de marca para carregar chaves existentes
  useEffect(() => {
    if (!selectedBrand) {
      setExistingTechKeys([]);
      setExistingTechSelected([]);
      return;
    }

    (async () => {
      addLog(`🔍 Analisando ficha técnica atual da marca: ${selectedBrand}...`);
      const { data } = await supabase
        .from('products')
        .select('technical_specs')
        .eq('brand', selectedBrand)
        .not('technical_specs', 'is', null)
        .limit(100);

      const keys = new Set<string>();
      data?.forEach(p => {
        const specs = typeof p.technical_specs === 'string' ? JSON.parse(p.technical_specs) : p.technical_specs;
        if (specs) Object.keys(specs).forEach(k => keys.add(k));
      });

      const sortedKeys = Array.from(keys).sort();
      setExistingTechKeys(sortedKeys);
      setExistingTechSelected(sortedKeys); // Pré-seleciona o que já existe
      
      // Inicializa títulos se não existirem
      setTechTitles(prev => {
        const next = { ...prev };
        sortedKeys.forEach(k => { if (!next[`db:${k}`]) next[`db:${k}`] = k; });
        return next;
      });
    })();
  }, [selectedBrand]);

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
        addLog(`✨ Planilha carregada: ${data.length} linhas.`);
        toast.success('Excel processado!');
      }
    };
    reader.readAsBinaryString(file);
  };

  // util
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Gera pré-visualização das mudanças (não escreve no DB)
  const generatePreview = async (limit = 50) => {
    if (!matchCol) return toast.error('Selecione a coluna SKU primeiro');
    setPreviewRows([]);
    setPreviewOpen(true);
    setPreviewSource('file');
    setPreviewLimit(limit);

    const skuMapping = mappings.find(m => m.excelCol === matchCol);
    const skuDbField = skuMapping?.dbField || 'ref';

    const rows = fileData.slice(0, limit);
    const previews: Array<{ ref: string; before: any; after: any }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const sku = row[matchCol];
      if (!sku) continue;
      try {
      const { data: dbProd } = await supabase.from('products').select('*').eq(skuDbField, sku).maybeSingle();

        // Se o usuário filtrou por marca via select, garantir que o preview mostre apenas produtos
        // daquela marca (quando possível). Se o arquivo tiver marca mapeada, o filtro já ocorreu
        // antes; aqui garantimos por segurança verificando o produto no DB.
        if (selectedBrand && dbProd && (dbProd as any).brand && String((dbProd as any).brand).trim() !== String(selectedBrand).trim()) {
          // não adiciona ao preview
          continue;
        }
        // Se o usuário filtrou por marca via select, garantimos que o preview ignore SKUs de outras marcas.
        if (selectedBrand && dbProd && (dbProd as any).brand && String((dbProd as any).brand).trim() !== String(selectedBrand).trim()) {
          // pular sem adicionar ao preview
          continue;
        }
        const before = dbProd?.technical_specs || null;
        // Build ordered tech JSON: product fields -> excel fields -> existing keys
        const techJson: Record<string, any> = {};

        // 1) Campos do banco na ordem selecionada
        productTechMappings.forEach((col) => {
          const title = techTitles[`prod:${col}`] || col;
          const currentValue = dbProd ? (dbProd as any)[col] : '---';
          techJson[title] = currentValue ?? '---';
        });

        // 2) Campos do Excel na ordem selecionada
        techSpecsMappings.forEach((col) => {
          const title = techTitles[`excel:${col}`] || col;
          techJson[title] = row[col] ?? '---';
        });

        // 3) Manter chaves já existentes na ficha técnica (se selecionadas)
        existingTechSelected.forEach((key) => {
          const title = techTitles[`db:${key}`] || key;
          const val = dbProd?.technical_specs ? (dbProd.technical_specs as any)[key] : '---';
          techJson[title] = val ?? '---';
        });

        const ref = dbProd?.reference_code ?? (dbProd?.ref ?? sku);
        previews.push({ ref, before, after: techJson });
      } catch (err: any) {
        // ignore per-preview errors but log
        addLog(`⚠️ Preview linha ${i + 1}: ${err?.message || String(err)}`);
      }
    }

    setPreviewRows(previews);
    // inicializa finalOrder como concatenação padrão apenas se ainda não houver
    if (!finalOrder) {
      const defaultOrder: Array<{ type: 'prod'|'excel'|'db'; key: string; title: string }> = [];
      productTechMappings.forEach(k => defaultOrder.push({ type: 'prod', key: k, title: techTitles[`prod:${k}`] || k }));
      techSpecsMappings.forEach(k => defaultOrder.push({ type: 'excel', key: k, title: techTitles[`excel:${k}`] || k }));
      existingTechSelected.forEach(k => defaultOrder.push({ type: 'db', key: k, title: techTitles[`db:${k}`] || k }));
      setFinalOrder(defaultOrder);
    }
    addLog(`🔎 Preview gerado: ${previews.length} itens (mostrando até ${limit}).`);
  };

  // Comparar amostra de produtos da marca selecionada (usa products.brand)
  const runCompare = async () => {
    if (!selectedBrand) {
      addLog('⚠️ Selecione uma marca para analisar.');
      return;
    }

    setLoading(true);
    addLog(`🔍 Analisando produtos da marca: ${selectedBrand}`);

    try {
      const { data: sampleProducts, error } = await supabase
        .from('products')
        .select('*')
        .eq('brand', selectedBrand)
        .limit(5);

      if (error || !sampleProducts || sampleProducts.length === 0) {
        addLog('❌ Nenhum produto encontrado para esta marca.');
        setLoading(false);
        return;
      }

      setPreviewSource('brand');
      setPreviewLimit(5);
      const previews: Array<{ ref: string; before: any; after: any }> = [];
      for (const prod of sampleProducts) {
        const oldSpecs = prod.technical_specs || null;
        const newSpecs: Record<string, any> = {};

        // Campos do produto na ordem definida por productTechMappings
        productTechMappings.forEach((col) => {
          const title = techTitles[`prod:${col}`] || col;
          const currentValue = prod ? prod[col] : '---';
          newSpecs[title] = currentValue ?? '---';
        });

        // Mantém chaves adicionais se selecionadas
        existingTechSelected.forEach((key) => {
          const title = techTitles[`db:${key}`] || key;
          const val = prod?.technical_specs ? (prod.technical_specs as any)[key] : '---';
          newSpecs[title] = val ?? '---';
        });

        const refVal = prod?.reference_code ?? prod?.ref ?? prod?.id ?? prod?.name ?? '';
        previews.push({ ref: String(refVal), before: oldSpecs, after: newSpecs });
      }

      setPreviewRows(previews);
      // inicializa finalOrder como concatenação padrão apenas se ainda não houver
      if (!finalOrder) {
        const defaultOrder: Array<{ type: 'prod'|'excel'|'db'; key: string; title: string }> = [];
        productTechMappings.forEach(k => defaultOrder.push({ type: 'prod', key: k, title: techTitles[`prod:${k}`] || k }));
        techSpecsMappings.forEach(k => defaultOrder.push({ type: 'excel', key: k, title: techTitles[`excel:${k}`] || k }));
        existingTechSelected.forEach(k => defaultOrder.push({ type: 'db', key: k, title: techTitles[`db:${k}`] || k }));
        setFinalOrder(defaultOrder);
      }
      setPreviewOpen(true);
      addLog(`🔎 Preview de comparação gerado: ${previews.length} itens.`);
    } catch (e: any) {
      addLog(`❌ Erro ao gerar comparação: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  // Executa atualizações em batches para não travar a UI
  const applyInBatches = async (batchSize = 10, delayMs = 200) => {
    if (!matchCol) return toast.error('Selecione a coluna SKU primeiro');
    if (fileData.length === 0) return toast.error('Carregue um Excel antes');

    setIsApplying(true);
    setProgress(0);
    addLog('🚀 Iniciando aplicação em lote...');

    const dataToProcess = selectedBrand 
      ? fileData.filter(row => mappings.find(m => m.dbField === 'brand') 
          ? row[mappings.find(m => m.dbField === 'brand')!.excelCol] === selectedBrand
          : true
        )
      : fileData;

    const skuMapping = mappings.find(m => m.excelCol === matchCol);
    const skuDbField = skuMapping?.dbField || 'ref';

    const total = dataToProcess.length;
    let completed = 0;

    for (let i = 0; i < total; i += batchSize) {
      const chunk = dataToProcess.slice(i, i + batchSize);
      const promises = chunk.map(async (row) => {
        const sku = row[matchCol];
        if (!sku) return;
        try {
          const { data: dbProd } = await supabase.from('products').select('*').eq(skuDbField, sku).maybeSingle();
          // Se o usuário escolheu uma marca, pule produtos que não pertencem a ela
          if (selectedBrand && dbProd && (dbProd as any).brand && String((dbProd as any).brand).trim() !== String(selectedBrand).trim()) {
            addLog(`❗ SKU ${sku} - marca diferente, pulando.`);
            return;
          }
          // Build ordered tech JSON using finalOrder if set
          const order = finalOrder ?? ([...productTechMappings.map(k => ({ type: 'prod', key: k })), ...techSpecsMappings.map(k => ({ type: 'excel', key: k })), ...existingTechSelected.map(k => ({ type: 'db', key: k }))]);
          const techJson: Record<string, any> = {};
          order.forEach((entry: any) => {
            let title = '';
            let value: any = '---';
            if (entry.type === 'prod') {
              title = techTitles[`prod:${entry.key}`] || entry.key;
              value = dbProd ? (dbProd as any)[entry.key] : '---';
            } else if (entry.type === 'excel') {
              title = techTitles[`excel:${entry.key}`] || entry.key;
              value = row[entry.key] ?? '---';
            } else {
              title = techTitles[`db:${entry.key}`] || entry.key;
              value = dbProd?.technical_specs ? (dbProd.technical_specs as any)[entry.key] : '---';
            }
            techJson[title] = value ?? '---';
          });

          const updatePayload: any = { technical_specs: techJson };
          // Apply update but always scope by SKU and, if set, by brand for safety
          let q: any = supabase.from('products').update(updatePayload).eq(skuDbField, sku);
          if (selectedBrand) q = q.eq('brand', selectedBrand);
          const { error } = await q;
          if (error) addLog(`❌ Erro aplicando ${sku}: ${error.message}`);
          else addLog(`✅ Aplicado ${sku}`);
        } catch (err: any) {
          addLog(`❌ Exceção aplicando SKU ${row[matchCol]}: ${err?.message || String(err)}`);
        } finally {
          completed += 1;
        }
      });

      await Promise.all(promises);
      setProgress(Math.round((completed / total) * 100));
      // pequeno delay para evitar travar o event loop e permitir atualização de UI
      await sleep(delayMs);
    }

    addLog(`✅ Aplicação em lote finalizada. ${completed}/${total} processados.`);
    setIsApplying(false);
    setIsProcessing(false);
    setProgress(100);
  };

  // Re-generate preview when finalOrder changes while preview is open
  useEffect(() => {
    if (!previewOpen || !previewSource) return;
    // debounce quick changes
    let mounted = true;
    const regen = async () => {
      if (!mounted) return;
      if (previewSource === 'file') {
        await generatePreview(previewLimit);
      } else if (previewSource === 'brand') {
        await runCompare();
      }
    };
    const id = setTimeout(regen, 150);
    return () => { mounted = false; clearTimeout(id); };
  }, [finalOrder]);

  const handleSync = async () => {
    if (!matchCol) return toast.error('Selecione a coluna SKU no Passo 1');
    setLoading(true);
    setIsProcessing(true);
    addLog(`🚀 Iniciando sincronização...`);

    // Lógica de filtragem por marca no processamento
    const dataToProcess = selectedBrand 
      ? fileData.filter(row => mappings.find(m => m.dbField === 'brand') 
          ? row[mappings.find(m => m.dbField === 'brand')!.excelCol] === selectedBrand
          : true // Se não mapeou marca no excel, assume que o usuário sabe o que está fazendo
        )
      : fileData;

    addLog(`📦 Processando ${dataToProcess.length} itens.`);

    // Determine qual campo do DB corresponde à coluna SKU selecionada
    const skuMapping = mappings.find(m => m.excelCol === matchCol);
    const skuDbField = skuMapping?.dbField || 'ref';

    for (let i = 0; i < dataToProcess.length; i++) {
      const row = dataToProcess[i];
      const sku = row[matchCol];
      if (!sku) {
        addLog(`Linha ${i + 1}: SKU vazio — pulando.`);
        continue;
      }

      try {
        // Busca estado atual do produto para poder ler valores do banco
        const { data: dbProd } = await supabase.from('products').select('*').eq(skuDbField, sku).maybeSingle();

        // Build ordered tech JSON using finalOrder if set
        const order = finalOrder ?? ([...productTechMappings.map(k => ({ type: 'prod', key: k })), ...techSpecsMappings.map(k => ({ type: 'excel', key: k })), ...existingTechSelected.map(k => ({ type: 'db', key: k }))]);
        const techJson: Record<string, any> = {};
        order.forEach((entry: any) => {
          let title = '';
          let value: any = '---';
          if (entry.type === 'prod') {
            title = techTitles[`prod:${entry.key}`] || entry.key;
            value = dbProd ? (dbProd as any)[entry.key] : '---';
          } else if (entry.type === 'excel') {
            title = techTitles[`excel:${entry.key}`] || entry.key;
            value = row[entry.key] ?? '---';
          } else {
            title = techTitles[`db:${entry.key}`] || entry.key;
            value = dbProd?.technical_specs ? (dbProd.technical_specs as any)[entry.key] : '---';
          }
          techJson[title] = value ?? '---';
        });

        const updatePayload: any = { technical_specs: techJson };

        // Proteção: só atualiza produtos da marca selecionada quando definida
        let q: any = supabase.from('products').update(updatePayload).eq(skuDbField, sku);
        if (selectedBrand) q = q.eq('brand', selectedBrand);
        const { error } = await q;
        if (error) {
          addLog(`❌ Erro atualizando ${sku}: ${error.message}`);
        } else {
          addLog(`✅ Produto ${sku} atualizado.`);
        }

        setProgress(Math.round(((i + 1) / dataToProcess.length) * 100));
      } catch (err: any) {
        addLog(`❌ Exceção linha ${i + 1}: ${err?.message || String(err)}`);
      }
    }

    setLoading(false);
    setIsProcessing(false);
  };

  // Sincroniza por marca (Banco -> Banco) sem depender do Excel
  const handleSyncByBrand = async () => {
    if (!selectedBrand) return toast.error('Selecione uma marca primeiro');

    setLoading(true);
    setIsProcessing(true);
    addLog(`🚀 Iniciando atualização em massa para a marca: ${selectedBrand}`);

    try {
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('brand', selectedBrand);

      if (fetchError) {
        addLog(`❌ Erro ao buscar produtos da marca: ${fetchError.message}`);
        return;
      }
      if (!products || products.length === 0) {
        addLog('❌ Nenhum produto encontrado para esta marca.');
        return;
      }

      // garante finalOrder calculado
      let order = finalOrder;
      if (!order) {
        const defaultOrder: Array<{ type: 'prod'|'excel'|'db'; key: string; title: string }> = [];
        productTechMappings.forEach(k => defaultOrder.push({ type: 'prod', key: k, title: techTitles[`prod:${k}`] || k }));
        existingTechSelected.forEach(k => defaultOrder.push({ type: 'db', key: k, title: techTitles[`db:${k}`] || k }));
        order = defaultOrder;
        setFinalOrder(defaultOrder);
      }

      const batchSize = 20;
      let completed = 0;

      for (let i = 0; i < products.length; i += batchSize) {
        const chunk = products.slice(i, i + batchSize);
        const promises = chunk.map(async (prod: any) => {
          try {
            const orderedSpecs: Record<string, any> = {};
            order!.forEach((entry) => {
              if (entry.type === 'prod') {
                const title = techTitles[`prod:${entry.key}`] || entry.key;
                orderedSpecs[title] = prod[entry.key] ?? '---';
              } else if (entry.type === 'db') {
                const title = techTitles[`db:${entry.key}`] || entry.key;
                const val = prod.technical_specs ? (prod.technical_specs as any)[entry.key] : undefined;
                orderedSpecs[title] = val ?? '---';
              }
            });

            const { error } = await supabase.from('products').update({ technical_specs: orderedSpecs }).eq('id', prod.id);
            if (error) addLog(`❌ Erro aplicando ${prod.reference_code || prod.ref || prod.id}: ${error.message}`);
            else addLog(`✅ Aplicado ${prod.reference_code || prod.ref || prod.id}`);
          } catch (err: any) {
            addLog(`❌ Exceção aplicando ${prod.reference_code || prod.ref || prod.id}: ${err?.message || String(err)}`);
          } finally {
            completed += 1;
          }
        });

        await Promise.all(promises);
        setProgress(Math.round((completed / products.length) * 100));
        await sleep(150);
      }

      addLog(`✅ Atualização em massa finalizada. ${completed}/${products.length} processados.`);
      toast.success(`Ficha técnica da marca ${selectedBrand} atualizada.`);
    } catch (e: any) {
      addLog(`❌ Erro no processo: ${e?.message || String(e)}`);
      toast.error('Falha na sincronização por marca.');
    } finally {
      setLoading(false);
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleAction = async () => {
    // Se estamos na aba 'tech', sem Excel e com marca selecionada, executa o fluxo Banco->Banco
    if (activeTab === 'tech' && selectedBrand && fileData.length === 0) {
      await handleSyncByBrand();
    } else {
      await handleSync();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex items-center gap-5 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white">
            <RefreshCcw size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Sincronizador Master v3</h1>
            <p className="text-slate-500 text-sm">Controle total de atributos e fichas técnicas</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <Tabs defaultValue="data" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="bg-white p-1 rounded-2xl border border-slate-200 h-14 mb-6">
                <TabsTrigger value="data" className="rounded-xl px-8 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  <Database size={18} className="mr-2" /> Dados Gerais
                </TabsTrigger>
                <TabsTrigger value="tech" className="rounded-xl px-8 font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                  <FileText size={18} className="mr-2" /> Ficha Técnica
                </TabsTrigger>
              </TabsList>

              {/* ABA 1: DADOS GERAIS */}
              <TabsContent value="data" className="space-y-6 outline-none">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                   <div className="flex items-center gap-2 mb-6">
                      <div className="w-2 h-5 bg-indigo-600 rounded-full" />
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Mapeamento de Colunas Padrão</h2>
                   </div>
                   {/* Aqui entra o seu loop de mappings atual */}
                   <div className="space-y-3">
                     {mappings.map((m, i) => (
                       <div key={i} className="flex gap-3 items-start">
                          <select className="flex-1 h-12 bg-slate-50 rounded-xl px-4 text-sm font-bold border-none" value={m.dbField} onChange={(e) => {
                            const newM = [...mappings];
                            newM[i].dbField = e.target.value;
                            setMappings(newM);
                          }}>
                            <option value="">Campo no Banco</option>
                            {dbColumns.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <ChevronRight className="mt-3 text-slate-300" size={18} />
                          <select className="flex-1 h-12 bg-slate-50 rounded-xl px-4 text-sm font-bold border-none" value={m.excelCol} onChange={(e) => {
                            const newM = [...mappings];
                            newM[i].excelCol = e.target.value;
                            setMappings(newM);
                          }}>
                            <option value="">Coluna no Excel</option>
                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                       </div>
                     ))}
                     <Button variant="ghost" onClick={() => setMappings([...mappings, { dbField: '', excelCol: '' }])} className="w-full border-2 border-dashed border-slate-100 rounded-xl py-6 text-slate-400 hover:text-indigo-600">
                       + Adicionar Novo Campo
                     </Button>
                   </div>
                </div>
              </TabsContent>

              {/* ABA 2: FICHA TÉCNICA */}
              <TabsContent value="tech" className="space-y-6 outline-none">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                  
                  {/* Filtro de Marca */}
                  <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ListFilter className="text-amber-500" />
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Filtro de Refinamento</p>
                        <p className="text-sm font-bold">Atualizar Marca Específica</p>
                      </div>
                    </div>
                    <select 
                      value={selectedBrand || ''} 
                      onChange={(e) => setSelectedBrand(e.target.value || null)}
                      className="h-10 px-4 rounded-xl bg-white border border-slate-200 font-bold text-sm"
                    >
                      <option value="">Todas as Marcas</option>
                      {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  {/* PREVIEW (quando aberto) */}
                  {previewOpen && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mt-4 max-h-72 overflow-auto">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold">Pré-visualização de Mudanças ({previewRows.length})</h4>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" onClick={() => { setPreviewOpen(false); setPreviewRows([]); }}>Fechar</Button>
                          <Button onClick={() => applyInBatches(10, 150)} disabled={isApplying || previewRows.length === 0} className="bg-amber-500 text-white">Aplicar Preview</Button>
                        </div>
                      </div>
                      {previewRows.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhuma mudança prevista (verifique mapeamentos e arquivo).</p>
                      ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm font-bold">Ordem dos Campos</div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setShowOrderEditor(s => !s)} className="text-xs px-3 py-1 bg-slate-100 rounded">{showOrderEditor ? 'Fechar Editor' : 'Editar Ordem'}</button>
                                <button onClick={() => { setFinalOrder(null); addLog('ℹ️ Ordem redefinida para padrão.'); }} className="text-xs px-3 py-1 bg-slate-100 rounded">Redefinir</button>
                              </div>
                            </div>

                            {showOrderEditor && finalOrder && (
                              <div className="mb-4 p-3 bg-white border rounded">
                                {finalOrder.map((item, idx) => (
                                  <div key={item.type + ':' + item.key} className="flex items-center justify-between py-1">
                                    <div className="text-sm">{item.title} <span className="text-xs text-slate-400">({item.type})</span></div>
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => setFinalOrder(prev => {
                                        if (!prev) return prev;
                                        const next = [...prev];
                                        if (idx > 0) [next[idx-1], next[idx]] = [next[idx], next[idx-1]];
                                        return next;
                                      })} className="p-1 rounded hover:bg-slate-100"><ChevronUp size={14} /></button>
                                      <button onClick={() => setFinalOrder(prev => {
                                        if (!prev) return prev;
                                        const next = [...prev];
                                        if (idx < next.length - 1) [next[idx+1], next[idx]] = [next[idx], next[idx+1]];
                                        return next;
                                      })} className="p-1 rounded hover:bg-slate-100"><ChevronDown size={14} /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                          {previewRows.map((p, idx) => (
                            <div key={p.ref + idx} className="p-2 rounded-xl border border-slate-100 bg-slate-50">
                              <div className="flex items-start gap-4">
                                <div className="w-28 text-xs text-slate-500">Ref: <span className="font-bold text-slate-700">{p.ref}</span></div>
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                  <div>
                                    <div className="text-[10px] text-slate-400">Antes</div>
                                    <pre className="text-xs text-slate-700 max-h-28 overflow-auto bg-white p-2 rounded">{JSON.stringify(p.before, null, 2)}</pre>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-slate-400">Depois</div>
                                    <pre className="text-xs text-slate-700 max-h-28 overflow-auto bg-white p-2 rounded">{JSON.stringify(p.after, null, 2)}</pre>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Configuração de Títulos e Checkboxes */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Campos da Ficha Técnica</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Campos do Banco Existentes para a Marca */}
                      {existingTechKeys.map(key => (
                        <div key={key} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-amber-200">
                          <input 
                            type="checkbox" 
                            checked={existingTechSelected.includes(key)}
                            onChange={() => setExistingTechSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
                            className="w-5 h-5 rounded-lg border-slate-300 text-amber-500 focus:ring-amber-500"
                          />
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Campo no Banco</p>
                            <p className="text-sm font-bold text-slate-700">{key}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Título no Catálogo</p>
                            <input 
                              className="w-full h-8 px-3 bg-white rounded-lg border border-slate-200 text-sm font-medium"
                              value={techTitles[`db:${key}`] || ''}
                              onChange={(e) => setTechTitles({...techTitles, [`db:${key}`]: e.target.value})}
                              placeholder="Ex: Material da Lente"
                            />
                          </div>
                          {existingTechSelected.includes(key) && (
                            <div className="flex flex-col gap-1">
                              <button type="button" onClick={() => setExistingTechSelected(prev => {
                                const idx = prev.indexOf(key);
                                return moveArrayItem(prev, idx, -1);
                              })} className="p-1 rounded hover:bg-slate-100"><ChevronUp size={14} /></button>
                              <button type="button" onClick={() => setExistingTechSelected(prev => {
                                const idx = prev.indexOf(key);
                                return moveArrayItem(prev, idx, 1);
                              })} className="p-1 rounded hover:bg-slate-100"><ChevronDown size={14} /></button>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* BLOCO: CAMPOS DO BANCO PARA O JSON */}
                      {/* SEÇÃO: INJETAR COLUNAS DO BANCO NO JSON */}
                      <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                              <Database size={18} />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Injetar Atributos da Tabela Products</h3>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                            {productTechMappings.length} selecionados
                          </span>
                        </div>

                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                              <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                                <tr>
                                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase w-12 text-center">Ativo</th>
                                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Coluna Original</th>
                                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Título no Catálogo</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {dbColumns.map((col) => {
                                  if (['id', 'created_at', 'image_url', 'technical_specs', 'reference_code'].includes(col)) return null;
                                  const isSelected = productTechMappings.includes(col);
                                  return (
                                    <tr key={col} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-emerald-50/30' : ''}`}>
                                      <td className="p-4 text-center">
                                        <input 
                                          type="checkbox" 
                                          checked={isSelected}
                                          onChange={() => setProductTechMappings(prev => isSelected ? prev.filter(k => k !== col) : [...prev, col])}
                                          className="w-5 h-5 rounded-lg text-emerald-600 border-slate-300 focus:ring-emerald-500"
                                        />
                                      </td>
                                      <td className="p-4">
                                        <span className="text-sm font-bold text-slate-700">{col}</span>
                                      </td>
                                            <td className="p-4">
                                              <div className="flex items-center gap-3">
                                                <input 
                                                  className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                                                  value={techTitles[`prod:${col}`] || ''}
                                                  onChange={(e) => setTechTitles({...techTitles, [`prod:${col}`]: e.target.value})}
                                                  placeholder={`Título para ${col}`}
                                                />
                                                {isSelected && (
                                                  <div className="flex flex-col">
                                                    <button type="button" onClick={() => moveField(productTechMappings.indexOf(col), 'up')} className="p-1 rounded hover:bg-slate-100"><ChevronUp size={14} /></button>
                                                    <button type="button" onClick={() => moveField(productTechMappings.indexOf(col), 'down')} className="p-1 rounded hover:bg-slate-100"><ChevronDown size={14} /></button>
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Novos Campos do Excel */}
                      {columns.filter(c => c !== matchCol).map(col => {
                        const isSelected = techSpecsMappings.includes(col);
                        return (
                          <div key={col} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${isSelected ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => setTechSpecsMappings(prev => isSelected ? prev.filter(k => k !== col) : [...prev, col])}
                              className="w-5 h-5 rounded-lg"
                            />
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-amber-600 uppercase">Nova Coluna Excel</p>
                              <p className="text-sm font-bold text-slate-700">{col}</p>
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase">Título no Catálogo</p>
                              <input 
                                className="w-full h-8 px-3 bg-white rounded-lg border border-slate-200 text-sm font-medium"
                                value={techTitles[`excel:${col}`] || ''}
                                onChange={(e) => setTechTitles({...techTitles, [`excel:${col}`]: e.target.value})}
                                placeholder="Defina o título..."
                              />
                            </div>
                            {isSelected && (
                              <div className="flex flex-col gap-1">
                                <button type="button" onClick={() => setTechSpecsMappings(prev => {
                                  const idx = prev.indexOf(col);
                                  return moveArrayItem(prev, idx, -1);
                                })} className="p-1 rounded hover:bg-slate-100"><ChevronUp size={14} /></button>
                                <button type="button" onClick={() => setTechSpecsMappings(prev => {
                                  const idx = prev.indexOf(col);
                                  return moveArrayItem(prev, idx, 1);
                                })} className="p-1 rounded hover:bg-slate-100"><ChevronDown size={14} /></button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* PAINEL LATERAL: CONTROLE */}
          <div className="lg:col-span-4 space-y-6">
             <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-5 bg-emerald-500 rounded-full" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Execução</h2>
                </div>
                
                <label className="block p-8 border-2 border-dashed border-slate-200 rounded-3xl hover:bg-slate-50 cursor-pointer transition-all text-center">
                   <Upload className="mx-auto mb-2 text-slate-400" />
                   <p className="text-xs font-bold text-slate-600">Carregar Novo Excel</p>
                   <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFile} />
                </label>

                {columns.length > 0 && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Coluna SKU de Referência</p>
                      <select value={matchCol} onChange={(e) => setMatchCol(e.target.value)} className="w-full h-10 bg-white rounded-xl border border-slate-200 text-sm font-bold px-3">
                        <option value="">Selecione...</option>
                        {columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="space-y-3">
                      {/* botões movidos para abaixo do console */}

                      <Button 
                        onClick={handleAction}
                        disabled={loading || (fileData.length === 0 && !selectedBrand)}
                        className="w-full h-16 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : <RefreshCcw size={20} className="mr-2" />}
                        Sincronizar {activeTab === 'tech' ? 'Ficha Técnica' : 'Dados'}
                      </Button>

                      {(isApplying || isProcessing || progress > 0) && (
                        <div className="pt-3">
                          <ProgressBar value={progress} label={isApplying ? 'Aplicando em lote' : isProcessing ? 'Sincronizando' : 'Progresso'} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
             </div>

             {/* LOGS */}
             <div className="bg-slate-900 rounded-[2rem] p-6 h-64 shadow-inner overflow-hidden flex flex-col">
                <div className="flex justify-between mb-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Console Log</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                </div>
                <div ref={logsRef} className="flex-1 overflow-y-auto font-mono text-[10px] text-indigo-400 space-y-1">
                   {logs.map((log, i) => <div key={i} className="border-l border-slate-800 pl-2">{log}</div>)}
                </div>
             </div>
          </div>
          {/* Ações: comparar / aplicar — colocadas após o console conforme solicitado */}
          <div className="lg:col-span-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mt-3">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => {
                    if (!fileData.length && selectedBrand) runCompare();
                    else generatePreview(50);
                  }}
                  disabled={fileData.length === 0 && !selectedBrand}
                  variant="outline"
                  className="h-12 w-full"
                >
                  <Search size={16} className="mr-2" /> {(!fileData.length && selectedBrand) ? 'Comparar Marca' : 'Visualizar Mudanças'}
                </Button>
                <Button 
                  onClick={() => applyInBatches(10, 150)}
                  disabled={isApplying || fileData.length === 0}
                  className="h-12 w-full bg-amber-500 text-white hover:bg-amber-600"
                >
                  {isApplying ? <Loader2 className="animate-spin mr-2" /> : <Zap size={16} className="mr-2" />}
                  Executar em Lote
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}