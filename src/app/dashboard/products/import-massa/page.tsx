'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  ArrowLeft,
  Edit3,
  FileText,
  AlertTriangle,
  Terminal,
  Play,
  ArrowUp,
  ArrowDown,
  X,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import {
  prepareProductImage,
  prepareProductGallery,
  processSafiloImages,
} from '@/lib/utils/image-logic';

type Stats = {
  total: number;
  success: number;
  errors: number;
};

const IMAGE_KEYWORDS = [
  'image',
  'img',
  'foto',
  'foto_url',
  'foto-url',
  'url',
  'link',
  'imagem',
  'src',
  'fotos',
  'images',
];

function isImageLike(header: string) {
  const h = String(header || '').toLowerCase();
  return IMAGE_KEYWORDS.some((kw) => h.includes(kw));
}

function normalizeKey(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function getField(row: any, key: string | undefined) {
  if (!key) return null;
  return row[key];
}

// --- GERADOR DE DESCRIÇÃO ---
function generateAutoDescription(data: {
  name: string;
  brand: string | null;
  ref: string | null;
  category: string | null;
  color: string | null;
}) {
  const { name, brand, ref, category, color } = data;
  const catLower = (category || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();
  let intro = 'Conheça o';
  let productTerm = 'produto';

  if (
    catLower.includes('solar') ||
    catLower.includes('sol') ||
    nameLower.includes('solar')
  ) {
    intro = 'Proteja sua visão com estilo usando o';
    productTerm = 'Óculos de Sol';
  } else if (
    catLower.includes('receitu') ||
    catLower.includes('grau') ||
    nameLower.includes('armação')
  ) {
    intro = 'Enxergue o mundo com clareza com a';
    productTerm = 'Armação';
  } else {
    intro = 'Confira o';
    productTerm = name;
  }

  let desc = `${intro} ${productTerm}`;
  if (brand) desc += ` da marca ${brand}`;
  if (ref) desc += ` (Referência: ${ref})`;
  desc += '.';
  if (color)
    desc += ` Modelo disponível na cor ${color}, combinando elegância e versatilidade.`;
  else desc += ` Design moderno que combina elegância e versatilidade.`;
  desc +=
    ' Produzido com materiais de alta qualidade para garantir durabilidade e conforto no seu dia a dia.';
  return desc;
}

export default function ImportMassaPage() {
  const router = useRouter();

  // Hook de limites do plano
  const { usage, loading: limitLoading } = usePlanLimits();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const [mapping, setMapping] = useState<{
    name?: string;
    sku?: string;
    price?: string;
    sale_price?: string;
    brand?: string;
    image?: string;
    ref?: string;
    ean?: string;
    category?: string;
    color?: string;
    desc?: string;
    techSpecColumns?: string[];
  }>({});

  const [techSpecTitles, setTechSpecTitles] = useState<Record<string, string>>(
    {}
  );
  const [stats, setStats] = useState<Stats>({
    total: 0,
    success: 0,
    errors: 0,
  });

  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (
    message: string,
    type: 'info' | 'error' | 'success' = 'info'
  ) => {
    const icon = type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : 'ℹ️ ';
    setLogs((prev) => [...prev, `${icon}${message}`]);
  };

  const moveTechSpec = (index: number, direction: 'up' | 'down') => {
    const currentList = [...(mapping.techSpecColumns || [])];
    if (direction === 'up') {
      if (index === 0) return;
      [currentList[index - 1], currentList[index]] = [
        currentList[index],
        currentList[index - 1],
      ];
    } else {
      if (index === currentList.length - 1) return;
      [currentList[index + 1], currentList[index]] = [
        currentList[index],
        currentList[index + 1],
      ];
    }
    setMapping({ ...mapping, techSpecColumns: currentList });
  };

  const removeTechSpec = (colName: string) => {
    const currentList = mapping.techSpecColumns || [];
    setMapping({
      ...mapping,
      techSpecColumns: currentList.filter((c) => c !== colName),
    });
  };

  // --- Passo 1: Leitura ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLogs([]);
    addLog(`Arquivo selecionado: ${file.name}`);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' }); // defval: '' garante vazio em vez de undefined

        if (data.length === 0) {
          toast.error('A planilha está vazia.');
          addLog('Erro: Planilha vazia.', 'error');
          return;
        }

        setRows(data);
        addLog(
          `Leitura concluída. ${data.length} linhas encontradas.`,
          'success'
        );

        const cols = Object.keys(data[0]);
        setColumns(cols);
        autoMapColumns(cols);
        setStep(2);
      } catch (err) {
        console.error(err);
        addLog('Erro crítico ao ler o arquivo Excel.', 'error');
        toast.error('Erro ao ler arquivo Excel.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const autoMapColumns = (cols: string[]) => {
    const map: typeof mapping = {};
    const usedCols: string[] = [];

    const findCol = (regex: RegExp) => {
      const col = cols.find(
        (c) => regex.test(normalizeKey(c)) && !usedCols.includes(c)
      );
      if (col) usedCols.push(col);
      return col;
    };

    map.name = findCol(/nome|name|produto|title/);
    map.sku = findCol(/sku|codigo|code/);
    map.price = findCol(/preco|price|valor/);
    map.sale_price = findCol(/precovenda|preco.?venda|sale|sale_price/);
    map.brand = findCol(/marca|brand|fornecedor/);
    map.ref = findCol(/referencia|ref|reference/);
    map.ean = findCol(/ean|barcode|codigo de barras|gtin/);
    map.category = findCol(/categoria|category/);
    map.color = findCol(/cor|color/);
    map.desc = findCol(/descricao|desc|description/);

    map.image = cols.find((c) => isImageLike(c));
    if (map.image) usedCols.push(map.image);

    const techSpecs = cols.filter(
      (c) => !usedCols.includes(c) && !isImageLike(c)
    );
    map.techSpecColumns = techSpecs;

    const titles: Record<string, string> = {};
    techSpecs.forEach((c) => {
      titles[c] = c;
    });

    setMapping(map);
    setTechSpecTitles(titles);

    if (Object.keys(map).length > 0) {
      addLog('Colunas mapeadas automaticamente com sucesso.');
    }
  };

  // --- Passo 3: Execução ---

  const handleImport = async () => {
    if (!mapping.name || !mapping.price) {
      toast.error("Por favor, mapeie pelo menos 'Nome' e 'Preço'.");
      addLog(
        'Tentativa de importação falhou: Campos obrigatórios faltando.',
        'error'
      );
      return;
    }

    // Verificação de limite do plano
    const totalNewItems = rows.length;
    const currentTotal = usage.current;
    const maxLimit = usage.max;

    if (!limitLoading && currentTotal + totalNewItems > maxLimit) {
      toast.error('Limite do Plano Excedido!', {
        description: `Seu plano permite ${maxLimit} produtos. Você tem ${currentTotal} e está tentando importar mais ${totalNewItems}.`,
        duration: 8000,
        action: {
          label: 'Fazer Upgrade',
          onClick: () => router.push('/dashboard/settings?tab=billing'),
        },
      });
      addLog(
        `❌ IMPORTAÇÃO BLOQUEADA: Limite do plano excedido (${currentTotal} + ${totalNewItems} > ${maxLimit})`,
        'error'
      );
      return; // IMPEDE O PROCESSO DE CONTINUAR
    }

    setLoading(true);
    setLogs((prev) => [...prev, '--- INICIANDO IMPORTAÇÃO ---']);

    try {
      addLog('Verificando autenticação...');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      addLog(`Usuário autenticado: ${user.email}`);
      addLog(`Processando ${rows.length} produtos...`);

      let successCount = 0;
      let errorCount = 0;
      const uniqueProductsMap = new Map();
      const detectedBrands = new Set<string>();

      const finalTechCols = mapping.techSpecColumns || [];

      for (const row of rows) {
        const name = getField(row, mapping.name);
        const priceRaw = getField(row, mapping.price);
        const sku = getField(row, mapping.sku);
        const ref = getField(row, mapping.ref);
        const ean = getField(row, mapping.ean);
        const brand = getField(row, mapping.brand)
          ? String(getField(row, mapping.brand))
          : null;
        if (brand) detectedBrands.add(brand);

        const category = getField(row, mapping.category)
          ? String(getField(row, mapping.category))
          : null;
        const color = getField(row, mapping.color)
          ? String(getField(row, mapping.color))
          : null;

        // Imagem (Processamento Safilo: P00=Capa, Remove P13/P14)
        let coverUrl: string | null = null;
        let galleryUrls: string[] = [];

        if (mapping.image) {
          const originalVal = getField(row, mapping.image);
          const rawString = originalVal ? String(originalVal).trim() : '';

          // Processamento específico para Safilo/Tommy
          const processed = processSafiloImages(rawString);

          // Se o processSafiloImages não retornou uma galeria mas a string
          // contém múltiplas URLs separadas por ';', dividimos manualmente.
          if (
            (processed.images?.length || 0) === 0 &&
            rawString.includes(';')
          ) {
            const splitUrls = rawString
              .split(';')
              .map((u) => u.trim())
              .filter(Boolean);
            coverUrl = splitUrls.length > 0 ? splitUrls[0] : null;
            galleryUrls = splitUrls.length > 1 ? splitUrls.slice(1) : [];
          } else {
            coverUrl = processed.image_url;
            galleryUrls = processed.images || [];
          }
        }

        // LÓGICA DE DESCRIÇÃO (Ajustada)
        let finalDescription = null;
        const mappedDesc = getField(row, mapping.desc);

        // Verifica se tem conteúdo real na coluna do Excel
        if (mappedDesc && String(mappedDesc).trim().length > 0) {
          finalDescription = String(mappedDesc);
        } else {
          // Se coluna vazia ou não mapeada -> Template Automático
          finalDescription = generateAutoDescription({
            name: String(name),
            brand,
            ref: ref ? String(ref) : null,
            category,
            color,
          });
        }

        // Ficha Técnica
        const techSpecs: Record<string, string> = {};
        finalTechCols.forEach((col) => {
          const val = getField(row, col);
          if (val) {
            const finalKey = techSpecTitles[col] || col;
            techSpecs[finalKey] = String(val);
          }
        });

        let price = 0;
        if (typeof priceRaw === 'string') {
          price = parseFloat(
            priceRaw.replace('R$', '').replace(',', '.').trim()
          );
        } else {
          price = Number(priceRaw);
        }

        // sale_price parsing: if mapped, use that column; otherwise fallback to price
        let salePrice = price;
        const saleRaw = getField(row, mapping.sale_price);
        if (
          saleRaw !== undefined &&
          saleRaw !== null &&
          String(saleRaw).trim() !== ''
        ) {
          if (typeof saleRaw === 'string') {
            salePrice = parseFloat(
              String(saleRaw).replace('R$', '').replace(',', '.').trim()
            );
          } else {
            salePrice = Number(saleRaw);
          }
        }

        if (!name) {
          addLog(
            `Linha ignorada (Sem Nome): ${JSON.stringify(row).slice(0, 50)}...`,
            'error'
          );
          continue;
        }

        const refCode = ref
          ? String(ref)
          : sku
            ? String(sku)
            : `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        const slugify = (s: string) =>
          s
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        const slugBase = slugify(String(name) || 'produto');

        const imageMeta = prepareProductImage(coverUrl || null);

        const hasExternalImage = Boolean(
          (typeof coverUrl === 'string' && coverUrl.startsWith('http')) ||
          (galleryUrls &&
            galleryUrls.some((u) => !!u && typeof u === 'string' && u.startsWith('http')))
        );

        // Monta array COMPLETO de imagens: capa + galeria
        // O local-sync-full.mjs espera que products.images contenha TODAS as URLs externas
        const allImageUrls: string[] = [];
        if (coverUrl) allImageUrls.push(coverUrl);
        if (galleryUrls && galleryUrls.length > 0) {
          allImageUrls.push(...galleryUrls);
        }
        // Flatten e dedup
        const flattenedImages = allImageUrls
          .flatMap((g) =>
            typeof g === 'string' && g.includes(';')
              ? g.split(';').map((u) => (u || '').trim())
              : [g]
          )
          .map((u) => String(u || '').trim())
          .filter(Boolean);
        const uniqueImages = Array.from(new Set(flattenedImages));

        const productObj = {
          user_id: user.id,
          name: String(name),
          reference_code: refCode,
          sku: sku ? String(sku) : null,
          barcode: ean ? String(ean) : null,
          price: isNaN(price) ? 0 : price,
          sale_price: isNaN(salePrice) ? (isNaN(price) ? 0 : price) : salePrice,
          brand,
          category,
          color,
          description: finalDescription,
          // Garantir que o importador NÃO marque como otimizada por omissão.
          // `image_path` deve ser null quando a imagem ainda não foi internalizada.
          image_path: null,
          external_image_url: coverUrl,
          image_url: imageMeta.image_url || null,
          // Força o status para 'pending' quando houver imagens externas
          sync_status: hasExternalImage
            ? 'pending'
            : imageMeta.sync_status || 'synced',
          sync_error: imageMeta.sync_error,
          // Explicitamente define `image_optimized` como falso no momento da importação.
          // Isso evita falsos positivos caso exista um `image_path` antigo no banco
          // que seria preservado por um upsert que omite o campo.
          image_optimized: false,
          // CRÍTICO: Salva TODAS as URLs (capa + galeria) para o sync processar
          images: uniqueImages,

          technical_specs: Object.keys(techSpecs).length > 0 ? techSpecs : null,
          last_import_id: null,
          slug: `${slugBase}-${Date.now().toString(36).slice(-6)}`,
        };

        uniqueProductsMap.set(refCode, productObj);
      }

      const productsToInsert = Array.from(uniqueProductsMap.values());
      const duplicatesInFile = rows.length - productsToInsert.length;

      if (duplicatesInFile > 0) {
        addLog(
          `ℹ️ ${duplicatesInFile} linhas duplicadas removidas da planilha (mesma referência).`
        );
      }

      // --- OTIMIZAÇÃO: BUSCA DE EXISTENTES EM CHUNKS MENORES (200) ---
      addLog(
        'Verificando produtos existentes no banco (chunks otimizados de 200)...'
      );
      const allRefCodes = productsToInsert.map((p) => p.reference_code);
      const existingRefCodes = new Set<string>();
      const existingMap: Record<
        string,
        {
          id: string;
          slug?: string;
          gallery_images?: any;
          image_path?: string;
          external_image_url?: string;
        }
      > = {};

      if (allRefCodes.length > 0) {
        const chunkSize = 200; // REDUZIDO de 1000 para 200 para evitar timeout
        for (let j = 0; j < allRefCodes.length; j += chunkSize) {
          const chunk = allRefCodes.slice(j, j + chunkSize);
          const chunkIndex = Math.floor(j / chunkSize) + 1;
          addLog(
            `Verificando chunk ${chunkIndex} (items ${j + 1}-${Math.min(j + chunkSize, allRefCodes.length)})...`
          );
          const { data: existingChunk, error: searchError } = await supabase
            .from('products')
            .select(
              'id,reference_code,slug,gallery_images,image_path,external_image_url'
            )
            .eq('user_id', user.id)
            .in('reference_code', chunk as any[]);

          if (searchError) {
            addLog(
              `Aviso: Erro ao consultar chunk ${chunkIndex}: ${searchError.message}`,
              'error'
            );
            continue;
          }

          if (existingChunk && Array.isArray(existingChunk)) {
            existingChunk.forEach((p: any) => {
              if (p && p.reference_code) {
                existingRefCodes.add(p.reference_code);
                existingMap[p.reference_code] = {
                  id: p.id,
                  slug: p.slug,
                  gallery_images: p.gallery_images,
                  image_path: p.image_path,
                  external_image_url: p.external_image_url,
                };
              }
            });
          }
        }
      }

      const newProductsCount = productsToInsert.filter(
        (p) => !existingRefCodes.has(p.reference_code)
      ).length;
      const updateProductsCount = productsToInsert.length - newProductsCount;

      addLog(
        `📊 Resumo: ${newProductsCount} NOVOS | ${updateProductsCount} ATUALIZAÇÕES`,
        'success'
      );

      // Histórico
      let brandSummary = 'Diversas';
      if (detectedBrands.size === 1)
        brandSummary = Array.from(detectedBrands)[0];
      else if (detectedBrands.size > 1)
        brandSummary = `Várias (${detectedBrands.size} marcas)`;

      const { data: historyData, error: historyError } = await supabase
        .from('import_history')
        .insert({
          user_id: user.id,
          total_items: productsToInsert.length,
          brand_summary: brandSummary,
          file_name: fileName || 'Importação Manual',
        })
        .select()
        .maybeSingle();

      if (historyError)
        throw new Error('Erro ao criar histórico: ' + historyError.message);

      const historyId = historyData.id;
      addLog(`Histórico criado: ${historyId}`, 'success');

      const finalBatch = productsToInsert.map((p) => ({
        ...p,
        last_import_id: historyId,
      }));

      // Counters to report accurate inserted vs updated amounts
      let totalInserted = 0;
      let totalUpdated = 0;

      // Busca produtos existentes para preservar o `slug` quando já existirem
      const referenceCodesAll = finalBatch.map((p) => p.reference_code);
      if (referenceCodesAll.length > 0) {
        addLog(
          `Buscando ${referenceCodesAll.length} produtos já existentes (em chunks, consultando apenas refs faltantes)...`
        );
        const chunkSizeExisting = 500;
        for (let j = 0; j < referenceCodesAll.length; j += chunkSizeExisting) {
          const chunk = referenceCodesAll.slice(j, j + chunkSizeExisting);
          // apenas buscar refs que ainda não temos em existingMap
          const missingChunk = chunk.filter((rc) => !existingMap[rc]);
          if (missingChunk.length === 0) continue;
          const chunkIndex = Math.floor(j / chunkSizeExisting) + 1;
          addLog(
            `Buscando chunk ${chunkIndex} (items ${j + 1}-${Math.min(j + chunkSizeExisting, referenceCodesAll.length)}) - ${missingChunk.length} faltantes...`
          );
          const { data: existingProducts, error: existingError } =
            await supabase
              .from('products')
              .select('id,reference_code,slug')
              .eq('user_id', user.id)
              .in('reference_code', missingChunk as any[]);

          if (existingError) {
            addLog(
              `Erro ao buscar produtos existentes (chunk ${chunkIndex}): ${existingError.message}`,
              'error'
            );
            continue;
          }

          if (existingProducts && Array.isArray(existingProducts)) {
            existingProducts.forEach((ep: any) => {
              if (ep && ep.reference_code) {
                existingMap[ep.reference_code] = {
                  id: ep.id,
                  slug: ep.slug,
                } as any;
              }
            });
          }
        }
        addLog(
          `Busca de produtos existentes concluída. Encontrados: ${Object.keys(existingMap).length}`
        );
      }

      const batchSize = 50; // REDUZIDO de 100 para 50 para garantir resposta rápida
      const totalBatches = Math.ceil(finalBatch.length / batchSize);

      addLog(
        `Inserindo/atualizando ${finalBatch.length} itens em ${totalBatches} lotes otimizados...`
      );

      for (let i = 0; i < finalBatch.length; i += batchSize) {
        const batchNum = Math.floor(i / batchSize) + 1;
        const batch = finalBatch.slice(i, i + batchSize);

        addLog(
          `Enviando Lote ${batchNum}/${totalBatches} (itens ${i + 1}-${Math.min(i + batchSize, finalBatch.length)})...`
        );

        // Preserva slug existente quando houver
        batch.forEach((item) => {
          const existing = existingMap[item.reference_code];
          if (existing && existing.slug) {
            item.slug = existing.slug;
          } else if (!item.slug) {
            // Garante um slug para itens novos
            const slugBase = String(item.name || 'produto')
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-');
            item.slug = `${slugBase}-${Date.now().toString(36).slice(-6)}`;
          }
        });

        // Insert new items and update existing ones without overwriting critical fields
        try {
          const upsertMap: Record<string, any> = {};

          // split into inserts (new) and updates (existing)
          const toInsert = batch.filter(
            (it) => !existingMap[it.reference_code]
          );
          const toUpdate = batch.filter((it) => existingMap[it.reference_code]);

          // INSERT new products (retain last_import_id on insert)
          if (toInsert.length > 0) {
            const { data: inserted, error: insertErr } = await supabase
              .from('products')
              .insert(toInsert)
              .select('id, external_image_url, reference_code');
            if (insertErr) {
              addLog(
                `❌ Erro lote ${batchNum} (insert): ${insertErr.message}`,
                'error'
              );
              errorCount += toInsert.length;
            } else if (inserted && Array.isArray(inserted)) {
              inserted.forEach((p: any) => {
                if (p && p.reference_code) upsertMap[p.reference_code] = p;
              });
              totalInserted += inserted.length;
            }
          }

          // UPDATE existing products: only update non-destructive fields
          if (toUpdate.length > 0) {
            for (const itm of toUpdate) {
              const safeFields: any = {
                price: itm.price,
                sale_price: itm.sale_price,
                sku: itm.sku ?? null,
                barcode: itm.barcode ?? null,
                stock_quantity: (itm as any).stock_quantity ?? null,
              };

              // Ensure we don't overwrite last_import_id or image fields
              try {
                const { data: updated, error: updErr } = await supabase
                  .from('products')
                  .update(safeFields)
                  .eq('user_id', itm.user_id)
                  .eq('reference_code', itm.reference_code)
                  .select('id, external_image_url, reference_code');
                if (updErr) {
                  addLog(
                    `❌ Erro atualizando ${itm.reference_code}: ${updErr.message}`,
                    'error'
                  );
                  errorCount += 1;
                } else if (updated && Array.isArray(updated)) {
                  updated.forEach((p: any) => {
                    if (p && p.reference_code) upsertMap[p.reference_code] = p;
                  });
                  totalUpdated += updated.length;
                }
              } catch (e: any) {
                addLog(
                  `❌ Exceção atualizando ${itm.reference_code}: ${e.message}`,
                  'error'
                );
                errorCount += 1;
              }
            }
          }

          // Some items may already exist in DB but were not part of the insert/update responses
          const missingRefs = batch
            .map((it) => it.reference_code)
            .filter((rc) => rc && !upsertMap[rc]);
          if (missingRefs.length > 0) {
            const { data: fetchedMissing } = await supabase
              .from('products')
              .select(
                'id,external_image_url,reference_code,gallery_images,image_path'
              )
              .eq('user_id', user.id)
              .in('reference_code', missingRefs);

            if (fetchedMissing && Array.isArray(fetchedMissing)) {
              fetchedMissing.forEach((p: any) => {
                if (p && p.reference_code) upsertMap[p.reference_code] = p;
              });
            }
          }

          // mark batch success based on processed items
          successCount += Object.keys(upsertMap).length;

          // --- PROCESSAMENTO DE GALERIA ---
          const allImagesToInsert: any[] = [];
          batch.forEach((originalItem) => {
            const p =
              upsertMap[originalItem.reference_code] ||
              existingMap[originalItem.reference_code];
            const productId = p ? p.id : undefined;
            const externalUrl = p
              ? p.external_image_url
              : originalItem.external_image_url;

            const allImages = [] as string[];
            if (externalUrl) allImages.push(externalUrl);
            if (originalItem.images && Array.isArray(originalItem.images)) {
              allImages.push(...originalItem.images);
            } else if (
              p &&
              p.gallery_images &&
              Array.isArray(p.gallery_images)
            ) {
              allImages.push(
                ...p.gallery_images.map((g: any) =>
                  typeof g === 'string' ? g : g.url || g.path
                )
              );
            } else if (p && p.image_path) {
              allImages.unshift(p.image_path);
            }

            if (productId && allImages.length > 0) {
              const galleryItems = prepareProductGallery(productId, allImages);
              allImagesToInsert.push(...galleryItems);
            }
          });

          if (allImagesToInsert.length > 0) {
            addLog(
              `Inserindo ${allImagesToInsert.length} imagens de galeria...`
            );
            const galleryChunkSize = 200; // REDUZIDO de 500 para 200
            for (
              let k = 0;
              k < allImagesToInsert.length;
              k += galleryChunkSize
            ) {
              const galleryChunk = allImagesToInsert.slice(
                k,
                k + galleryChunkSize
              );
              const chunkIndex = Math.floor(k / galleryChunkSize) + 1;
              addLog(
                `  → Galeria chunk ${chunkIndex} (${k + 1}-${Math.min(k + galleryChunkSize, allImagesToInsert.length)})`
              );
              const { error: galleryError } = await supabase
                .from('product_images')
                .insert(galleryChunk);

              if (galleryError) {
                addLog(
                  `  ⚠️ Aviso: Erro na galeria chunk ${chunkIndex}: ${galleryError.message}`,
                  'error'
                );
              }
            }
            addLog(`✓ Galeria do lote ${batchNum} processada.`, 'success');
          }
        } catch (err: any) {
          addLog(
            `❌ Erro processamento lote ${batchNum}: ${err.message}`,
            'error'
          );
          errorCount += batch.length;
        }
      }

      setStats({
        total: rows.length,
        success: successCount,
        errors: errorCount,
      });

      // Atualiza o histórico com a quantidade real de inserções (para o desfazer funcionar corretamente)
      try {
        await supabase
          .from('import_history')
          .update({ total_items: totalInserted })
          .eq('id', historyId);
        addLog(
          `Histórico atualizado: ${totalInserted} inseridos, ${totalUpdated} atualizados.`,
          'success'
        );
      } catch (e: any) {
        addLog(
          `Falha ao atualizar histórico: ${e?.message || String(e)}`,
          'error'
        );
      }

      addLog('--- PROCESSO FINALIZADO ---');
      setStep(3);
      toast.success('Processo concluído!');
    } catch (err: any) {
      console.error(err);
      addLog(`ERRO CRÍTICO: ${err.message}`, 'error');
      toast.error('Erro fatal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Nome: 'Exemplo', Referencia: 'REF01', Preco: '100' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'modelo_produtos.xlsx');
  };

  // --- UI ---

  return (
    <div className="max-w-5xl mx-auto p-6 pb-20 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Importação em Massa
            </h1>
            <p className="text-sm text-gray-500">Importe produtos via Excel</p>
          </div>
        </div>
        <Link
          href="/dashboard/products/import-history"
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary transition-colors border px-3 py-2 rounded-lg hover:bg-gray-50"
        >
          <History size={16} />
          Ver Histórico / Desfazer
        </Link>
      </div>

      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-dashed border-gray-300 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Selecione sua planilha
            </h3>
            <p className="text-gray-500 max-w-md mx-auto text-sm mt-1">
              O arquivo deve ter cabeçalhos na primeira linha.
            </p>
          </div>
          <div className="flex flex-col gap-3 items-center">
            <Button
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload size={18} />}
              variant="primary"
              className="px-6 py-2.5"
            >
              Escolher Arquivo (.xlsx)
            </Button>
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
              Baixar modelo
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border shadow-sm">
            <h3 className="font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <Edit3 size={18} /> Mapeamento de Colunas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { k: 'name', l: 'Nome do Produto', r: true },
                { k: 'price', l: 'Preço Venda', r: true },
                { k: 'sku', l: 'SKU / Código' },
                { k: 'ref', l: 'Referência' },
                { k: 'brand', l: 'Marca' },
                { k: 'image', l: 'URL da Imagem' },
                { k: 'ean', l: 'EAN / Barcode' },
                { k: 'category', l: 'Categoria' },
                { k: 'color', l: 'Cor' },
                { k: 'desc', l: 'Descrição' }, // Mantive label simples aqui
              ].map((field) => {
                // Lógica de texto da opção padrão
                const isDesc = field.k === 'desc';
                const defaultOptionText = isDesc
                  ? 'Gerar Automaticamente (Se Vazio)'
                  : '-- Não importar --';

                return (
                  <div key={field.k}>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      {field.l}{' '}
                      {field.r && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      className="w-full border-gray-300 rounded-md text-sm p-2.5 border bg-gray-50 focus:bg-white transition-colors focus:ring-1 focus:ring-primary focus:border-primary"
                      value={(mapping as any)[field.k] || ''}
                      onChange={(e) =>
                        setMapping({ ...mapping, [field.k]: e.target.value })
                      }
                    >
                      <option value="">{defaultOptionText}</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border shadow-sm">
            <h3 className="font-semibold mb-2 text-gray-800 flex items-center gap-2">
              <FileText size={18} /> Ficha Técnica Extra
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Selecione o que deseja importar.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {columns
                .filter(
                  (c) =>
                    !Object.values(mapping).includes(c) ||
                    (mapping.techSpecColumns || []).includes(c)
                )
                .map((col, idx) => {
                  const isChecked = (mapping.techSpecColumns || []).includes(
                    col
                  );
                  return (
                    <label
                      key={`${col}-${idx}`}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${isChecked ? 'bg-primary/5 border-primary/30' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const current = mapping.techSpecColumns || [];
                          setMapping({
                            ...mapping,
                            techSpecColumns: e.target.checked
                              ? [...current, col]
                              : current.filter((x) => x !== col),
                          });
                          if (e.target.checked && !techSpecTitles[col])
                            setTechSpecTitles((prev) => ({
                              ...prev,
                              [col]: col,
                            }));
                        }}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span
                        className={`text-sm truncate select-none ${isChecked ? 'text-primary font-medium' : 'text-gray-600'}`}
                        title={col}
                      >
                        {col}
                      </span>
                    </label>
                  );
                })}
            </div>

            {(mapping.techSpecColumns || []).length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm text-gray-700 mb-3">
                  Organizar e Renomear
                </h4>
                <div className="space-y-2 max-w-2xl">
                  {mapping.techSpecColumns?.map((col, index) => (
                    <div
                      key={col}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded border border-gray-200 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveTechSpec(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 text-gray-600"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => moveTechSpec(index, 'down')}
                          disabled={
                            index === (mapping.techSpecColumns?.length || 0) - 1
                          }
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 text-gray-600"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">
                          Coluna Excel:{' '}
                          <strong className="text-gray-800">{col}</strong>
                        </p>
                        <input
                          type="text"
                          value={techSpecTitles[col] || col}
                          onChange={(e) =>
                            setTechSpecTitles((prev) => ({
                              ...prev,
                              [col]: e.target.value,
                            }))
                          }
                          className="w-full text-sm border border-gray-300 rounded p-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          placeholder="Título no Sistema"
                        />
                      </div>
                      <button
                        onClick={() => removeTechSpec(col)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Remover"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
            >
              Voltar
            </button>
            <Button
              onClick={handleImport}
              isLoading={loading}
              leftIcon={
                loading ? undefined : <Play size={18} fill="currentColor" />
              }
              variant="primary"
              className="px-8 py-2.5"
            >
              Iniciar Importação
            </Button>
          </div>

          {(logs.length > 0 || loading) && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-md text-xs font-mono shadow-inner border border-gray-700 max-h-60 overflow-y-auto mt-6">
              <div className="mb-2 text-gray-500 border-b border-gray-700 pb-1 font-bold flex items-center gap-2">
                <Terminal size={14} /> LOG DE SISTEMA
              </div>
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
          )}
        </div>
      )}

      {step === 3 && (
        <div className="bg-white p-12 rounded-xl border text-center shadow-sm max-w-2xl mx-auto">
          <CheckCircle className="mx-auto w-20 h-20 text-green-600 mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Importação Concluída!
          </h2>
          <p className="text-gray-500">Dados salvos com sucesso.</p>
          <div className="flex justify-center gap-8 my-8 py-6 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {stats.success}
              </p>
              <p className="text-xs uppercase font-bold text-gray-400 mt-1">
                Salvos
              </p>
            </div>
            {stats.errors > 0 && (
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {stats.errors}
                </p>
                <p className="text-xs uppercase font-bold text-gray-400 mt-1">
                  Erros
                </p>
              </div>
            )}
          </div>
          {logs.length > 0 && (
            <div className="text-left mb-6">
              <div className="bg-gray-900 text-green-400 p-4 rounded-md text-xs font-mono shadow-inner border border-gray-700 max-h-40 overflow-y-auto">
                <div className="mb-2 text-gray-500 border-b border-gray-700 pb-1 font-bold">
                  LOG FINAL
                </div>
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
              </div>
            </div>
          )}
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/dashboard/manage-external-images')}
              leftIcon={<AlertTriangle size={20} />}
              variant="primary"
              className="w-full px-6 py-3"
            >
              Ir para Sincronizar Imagens
            </Button>
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Importar Nova Planilha
              </button>
              <Link
                href="/dashboard/products"
                className="px-4 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium"
              >
                Ver Lista de Produtos
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
