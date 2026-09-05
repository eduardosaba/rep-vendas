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
  ImagePlus,
  Terminal,
  Play,
  ArrowUp,
  ArrowDown,
  X,
  History,
  Users,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../../components/ui/button';
import {
  prepareProductImage,
  prepareProductGallery,
  processSafiloImages,
  getProductImage,
} from '@/lib/utils/image-logic';
import {
  deriveReferenceId,
  isCategoricalValue,
  cleanReferenceId,
} from '@/lib/utils/reference-logic';
import { trackEvent } from '@/lib/analytics';

type Stats = {
  total: number;
  inserted: number;
  updated: number;
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

// --- Normalização e dedupe de URLs de imagem (client-side) ---
function normalizeUrl(u: unknown) {
  if (!u) return null;
  let s = String(u).trim();
  if (!s) return null;
  if (s.startsWith('data:')) return null;
  // remove surrounding quotes
  s = s.replace(/^"|"$/g, '');
  // try to parse and remove common tracking params
  try {
    const url = new URL(s, 'https://example.invalid');
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((p) => url.searchParams.delete(p));
    // if base was example.invalid and original was relative, keep original string
    if (url.hostname === 'example.invalid') {
      s = url.pathname + url.search + url.hash;
    } else {
      s = url.href;
    }
  } catch (e) {
    // keep trimmed string when not a full URL
  }
  // collapse repeated spaces
  s = s.replace(/\s+/g, ' ');
  return s;
}

function cleanAndDedupeImages(raw: unknown[] | string | undefined, mainImageUrl?: string, limit = 60) {
  const arr: string[] = [];
  if (!raw) return arr;
  const candidates: string[] = [];

  if (typeof raw === 'string') {
    raw.split(/[\n;,|]+/).forEach((r) => r && candidates.push(r));
  } else if (Array.isArray(raw)) {
    raw.forEach((r) => r !== undefined && r !== null && candidates.push(String(r)));
  } else {
    candidates.push(String(raw));
  }

  const seen = new Set<string>();
  for (const c of candidates) {
    const n = normalizeUrl(c);
    if (!n) continue;
    if (mainImageUrl && normalizeUrl(mainImageUrl) === n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    arr.push(n);
    if (arr.length >= limit) break;
  }
  return arr;
}

// --- NORMALIZADOR DE TIPO DE MONTAGEM (Constraint PostgreSQL: 'aro_fechado', 'fio_nylon', 'balgriff') ---
function normalizeTipoMontagem(val: any): 'aro_fechado' | 'fio_nylon' | 'balgriff' | null {
  if (!val) return null;
  const s = String(val).toLowerCase().trim();
  if (s.includes('fechad') || s.includes('full') || s.includes('aro_fechado')) {
    return 'aro_fechado';
  }
  if (s.includes('nylon') || s.includes('fio') || s.includes('semi')) {
    return 'fio_nylon';
  }
  if (
    s.includes('balgriff') ||
    s.includes('parafus') ||
    s.includes('flutu') ||
    s.includes('rimless') ||
    s.includes('3_pec') ||
    s.includes('tres_pec')
  ) {
    return 'balgriff';
  }
  return null;
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
    gender?: string;
    image?: string;
    ref?: string;
    ean?: string;
    category?: string;
    color?: string;
    tipo_montagem?: string;
    desc?: string;
    model_code?: string;
    techSpecColumns?: string[];
  }>({});

  const [techSpecTitles, setTechSpecTitles] = useState<Record<string, string>>(
    {}
  );
  const [groupByReference, setGroupByReference] = useState<boolean>(true);
  const [markAsLaunch, setMarkAsLaunch] = useState<boolean>(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
  });
  const [externalPreviews, setExternalPreviews] = useState<string[]>([]);
  const [isMaster, setIsMaster] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [targetUsersList, setTargetUsersList] = useState<
    Array<{ user_id: string; full_name: string; email: string; role: string; total_products: number }>
  >([]);
  const [selectedTargetUserIds, setSelectedTargetUserIds] = useState<string[]>([]);
  const [lastImportedBrand, setLastImportedBrand] = useState<string>('');

  // Sincronização de Imagens pelo Navegador (Frontend SSE Streaming)
  const [isSyncingImages, setIsSyncingImages] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncResults, setSyncResults] = useState<{ success: number; failed: number; skipped: number } | null>(null);

  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const handleStartFrontendSync = async () => {
    setIsSyncingImages(true);
    setSyncLogs(['🚀 Conectando ao servidor para otimização de imagens...']);
    setSyncResults(null);
    setSyncProgress({ current: 0, total: 0 });

    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    try {
      const getPendingQuery = () => {
        let q = supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .is('image_path', null)
          .or('external_image_url.not.is.null,image_url.not.is.null,images.not.is.null');

        if (lastImportedBrand) {
          q = q.ilike('brand', `%${lastImportedBrand}%`);
        }
        return q;
      };

      const { count: grandTotalCount } = await getPendingQuery();
      const grandTotal = grandTotalCount || 0;
      setSyncProgress({ current: 0, total: grandTotal });

      let hasMore = true;
      let batchCount = 0;
      let consecutiveEmptyBatches = 0;

      while (hasMore) {
        batchCount++;

        const { count: remainingCount } = await getPendingQuery();
        const currentRemaining = remainingCount || 0;

        if (currentRemaining === 0) {
          hasMore = false;
          break;
        }

        const currentProcessed = Math.max(0, grandTotal - currentRemaining);
        setSyncProgress({
          current: currentProcessed,
          total: grandTotal,
        });

        const response = await fetch('/api/admin/sync-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brand_id: lastImportedBrand || undefined,
            limit: 5, // Lotes seguros de 5 produtos por vez para não exceder timeout do servidor
            force: false,
          }),
        });

        if (!response.ok) {
          throw new Error(`Erro de resposta do servidor (HTTP ${response.status})`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let batchItemsHandled = 0;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  if (data.type === 'log') {
                    setSyncLogs((prev) => [
                      ...prev.slice(-100),
                      `[${data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}] ${data.message}`,
                    ]);
                  } else if (data.type === 'progress') {
                    const currentTotal = Math.min(grandTotal, currentProcessed + data.current);
                    setSyncProgress({
                      current: currentTotal,
                      total: grandTotal,
                    });
                  } else if (data.type === 'complete') {
                    batchItemsHandled = data.success + data.failed + data.skipped;
                    totalSuccess += data.success;
                    totalFailed += data.failed;
                    totalSkipped += data.skipped;
                  }
                } catch (e) {
                  // parse error
                }
              }
            }
          }
        }

        // Se o lote não tratou nenhum item (ou server fechou limpo sem pendentes), incrementa trava
        if (batchItemsHandled === 0) {
          consecutiveEmptyBatches++;
          if (consecutiveEmptyBatches >= 2) {
            hasMore = false;
          }
        } else {
          consecutiveEmptyBatches = 0;
        }

        await new Promise((r) => setTimeout(r, 200));
      }

      setSyncProgress({ current: grandTotal, total: grandTotal });
      setSyncResults({ success: totalSuccess, failed: totalFailed, skipped: totalSkipped });
      toast.success('Sincronização de imagens concluída!');
    } catch (e: any) {
      setSyncLogs((prev) => [...prev, `❌ Erro na sincronização: ${e?.message || String(e)}`]);
      toast.error(`Falha na sincronização: ${e?.message || String(e)}`);
    } finally {
      setIsSyncingImages(false);
    }
  };

  useEffect(() => {
    async function loadMasterUserContext() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;
        setCurrentUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const userRole = profile?.role;
        if (userRole === 'master' || userRole === 'admin') {
          setIsMaster(true);
          const token = session.access_token;
          const res = await fetch('/api/admin/users-catalog-stats', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.data)) {
              setTargetUsersList(data.data);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load master user context:', err);
      }
    }
    loadMasterUserContext();
  }, []);

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

        // Tenta recuperar a linha de cabeçalho de forma robusta (header:1)
        const rawRows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 }) as any[];
        const headerRow = Array.isArray(rawRows) && rawRows.length > 0 ? rawRows[0] : [];
        const cols = (headerRow && headerRow.length > 0
          ? headerRow.map((c: any) => String(c))
          : Object.keys(data[0]));

        setRows(data);
        addLog(`Leitura concluída. ${data.length} linhas encontradas.`, 'success');
        setColumns(cols);

        // Log útil para depuração: mostra formas normalizadas dos cabeçalhos
        try {
          addLog(
            'Colunas detectadas: ' +
              cols
                .map((c: string) => `${c} (norm:${normalizeKey(String(c))})`)
                .join(', ')
          );
        } catch (e) {
          // não crítico
        }

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
      const col = cols.find((c: string) => regex.test(normalizeKey(c)) && !usedCols.includes(c));

      if (col) usedCols.push(col);
      return col;
    };

    // Prioriza captura de REF/Referência para evitar que colunas de categoria (ex: MODELO) sobrescrevam REF
    map.ref = findCol(/referencia|ref|reference/);
    map.model_code = findCol(/model_code|modelcode|codigo.*modelo|model_name|modelname/);
    map.name = findCol(/nome|name|produto|title/);
    map.sku = findCol(/sku|codigo|code/);
    map.price = findCol(/preco|price|valor/);
    map.sale_price = findCol(/precovenda|preco.?venda|sale|sale_price/);
    map.brand = findCol(/marca|brand|fornecedor/);
    map.ean = findCol(/ean|barcode|codigo de barras|gtin/);
    map.category = findCol(/categoria|category|tipo/);
    map.color = findCol(/cor|color/);
    map.tipo_montagem = findCol(/montagem|tipo.*montagem|tipo_montagem|tipo.?de.?montagem|mount/);
    // Não auto-mapear `genero` para o campo principal — preferimos tratá-lo
    // como ficha técnica por padrão. Usuário pode mapear manualmente se desejar.
    map.desc = findCol(/descricao|desc|description/);

    map.image = cols.find((c: string) => isImageLike(c));
    if (map.image) usedCols.push(map.image);

    // columns que serão consideradas ficha técnica (exclui imagens)
    const rawTechSpecs = cols.filter((c: string) => !usedCols.includes(c) && !isImageLike(c));

    // Forçar colunas relacionadas a 'genero' para o início da lista de ficha técnica
    const generoCols = rawTechSpecs.filter((c: string) => {
      const nk = normalizeKey(String(c));
      return nk === 'genero' || nk === 'gender' || nk === 'sexo';
    });

    const techSpecs = [
      ...generoCols,
      ...rawTechSpecs.filter((c) => !generoCols.includes(c)),
    ];
    map.techSpecColumns = techSpecs;

    const titles: Record<string, string> = {};
    techSpecs.forEach((c: string) => {
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
      
      // busca profile para detectar role/company/permissions e definir escopo (company vs user)
      let profile: any = null;
      let isCompany = false;
      let companyId: string | null = null;
      try {
        const profileRes = await supabase
          .from('profiles')
          .select('role,company_id,can_manage_catalog')
          .eq('id', user.id)
          .maybeSingle();
        profile = profileRes?.data ?? null;
        const role = profile?.role || '';
        const hasCompany = Boolean(profile?.company_id);
        const canManageCatalog = Boolean(profile?.can_manage_catalog);
        const canUseCompanyScope =
          role === 'admin_company' || role === 'master' || canManageCatalog;
        isCompany = hasCompany && canUseCompanyScope;
        companyId = isCompany ? profile?.company_id ?? null : null;
      } catch (e) {
        // ignore profile fetch errors and assume individual
      }

      if (isCompany && !companyId) {
        throw new Error('Empresa não identificada para importação em escopo distribuídora');
      }

      const ownerField = isCompany ? 'company_id' : 'user_id';
      const ownerId = isCompany ? companyId : user.id;

      let successCount = 0;
      let errorCount = 0;
      const uniqueProductsMap = new Map();
      const productsListNoGroup: any[] = [];
      const detectedBrands = new Set<string>();
      const referenceCounts: Record<string, number> = {};

      const finalTechCols = mapping.techSpecColumns || [];

      for (const row of rows) {
        const name = getField(row, mapping.name);
        const priceRaw = getField(row, mapping.price);
        const sku = getField(row, mapping.sku);
        const ref = getField(row, mapping.ref);
        const modelCodeVal = getField(row, mapping.model_code);
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
        const gender = getField(row, mapping.gender)
          ? String(getField(row, mapping.gender))
          : null;
        const tipoMontagem = normalizeTipoMontagem(getField(row, mapping.tipo_montagem));

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

        // Slugify helper para slugs de URLs
        const slugify = (s: string) =>
          s
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        // Derivar reference_id seguro com proteção estrita contra termos categóricos (ex: sunglasses, receituario, opt-clip-on)
        const referenceId = deriveReferenceId({
          ref: ref ? String(ref) : null,
          modelCode: modelCodeVal ? String(modelCodeVal) : null,
          refCode,
          name: name ? String(name) : null,
        });

        // Alerta visual no console se um valor categórico foi rejeitado
        if (modelCodeVal && isCategoricalValue(String(modelCodeVal))) {
          addLog(
            `⚠️ Alerta: Valor categórico '${modelCodeVal}' rejeitado para reference_id. Utilizado '${referenceId}'.`,
            'warning'
          );
        }

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
          user_id: isCompany ? null : user.id,
          company_id: isCompany ? companyId : null,
          name: String(name),
          reference_code: refCode,
          reference_id: referenceId,
          sku: sku ? String(sku) : null,
          barcode: ean ? String(ean) : null,
          price: isNaN(price) ? 0 : price,
          sale_price: isNaN(salePrice) ? (isNaN(price) ? 0 : price) : salePrice,
          brand,
          category,
          color,
          gender,
          tipo_montagem: tipoMontagem,
          description: finalDescription,
          is_launch: markAsLaunch,
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

        if (groupByReference) {
          uniqueProductsMap.set(refCode, productObj);
        } else {
          // Quando não agrupar por referência, gerar um reference_code único
          // Preferir sufixo pela cor; se não houver cor, usar um sufixo incremental.
          const baseRef = String(refCode || '').trim();
          const colorVal = color ? String(color).trim() : '';

          const normalizeForCode = (s: string) =>
            String(s || '')
              .normalize('NFD')
              .replace(/\p{Diacritic}/gu, '')
              .replace(/\s+/g, '-')
              .replace(/[^A-Za-z0-9-]/g, '')
              .toUpperCase();

          if (baseRef) {
            if (colorVal) {
              productObj.reference_code = `${baseRef}-${normalizeForCode(
                colorVal
              )}`;
            } else {
              // incremental
              referenceCounts[baseRef] = (referenceCounts[baseRef] || 0) + 1;
              productObj.reference_code = `${baseRef}-${referenceCounts[baseRef]}`;
            }
          }

          productsListNoGroup.push(productObj);
        }
      }

      const productsToInsert = groupByReference
        ? Array.from(uniqueProductsMap.values())
        : productsListNoGroup;
      const duplicatesInFile = groupByReference
        ? rows.length - productsToInsert.length
        : 0;

      if (duplicatesInFile > 0) {
        addLog(
          `ℹ️ ${duplicatesInFile} linhas duplicadas removidas da planilha (mesma referência).`
        );
      }

      // --- OTIMIZAÇÃO: BUSCA DE EXISTENTES EM CHUNKS MENORES (200) ---
      addLog(
        'Verificando produtos existentes no banco (chunks otimizados de 200)...'
      );
      // keys: use reference_id when available, otherwise reference_code
      const allKeys = productsToInsert.map((p) => p.reference_id || p.reference_code);
      const existingKeys = new Set<string>();
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
      if (allKeys.length > 0) {
        const chunkSize = 200; // REDUZIDO de 1000 para 200 para evitar timeout
        for (let j = 0; j < allKeys.length; j += chunkSize) {
          const chunk = allKeys.slice(j, j + chunkSize);
          const chunkIndex = Math.floor(j / chunkSize) + 1;
          addLog(
            `Verificando chunk ${chunkIndex} (items ${j + 1}-${Math.min(j + chunkSize, allKeys.length)})...`
          );

          // 1) tentar por reference_id
          const { data: byRefId, error: errRefId } = await supabase
            .from('products')
            .select('id,reference_id,reference_code,slug,gallery_images,image_path,external_image_url')
            .eq(ownerField, ownerId)
            .in('reference_id', chunk as any[]);

          if (errRefId) {
            addLog(
              `Aviso: Erro ao consultar reference_id chunk ${chunkIndex}: ${errRefId.message}`,
              'error'
            );
          }

          if (Array.isArray(byRefId) && byRefId.length > 0) {
            byRefId.forEach((p: any) => {
              const key = p.reference_id || p.reference_code;
              if (key) {
                existingKeys.add(key);
                existingMap[key] = {
                  id: p.id,
                  slug: p.slug,
                  gallery_images: p.gallery_images,
                  image_path: p.image_path,
                  external_image_url: p.external_image_url,
                };
              }
            });
          }

          // 2) localizar os keys do chunk que ainda faltam e consultar por reference_code (compatibilidade)
          const missing = chunk.filter((k) => !existingMap[k]);
          if (missing.length > 0) {
            const { data: byRefCode, error: errRefCode } = await supabase
              .from('products')
              .select('id,reference_id,reference_code,slug,gallery_images,image_path,external_image_url')
              .eq(ownerField, ownerId)
              .in('reference_code', missing as any[]);

            if (errRefCode) {
              addLog(
                `Aviso: Erro ao consultar reference_code chunk ${chunkIndex}: ${errRefCode.message}`,
                'error'
              );
            }

            if (Array.isArray(byRefCode) && byRefCode.length > 0) {
              byRefCode.forEach((p: any) => {
                const key = p.reference_id || p.reference_code;
                if (key) {
                  existingKeys.add(key);
                  existingMap[key] = {
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
      }

      const newProductsCount = productsToInsert.filter(
        (p) => !existingKeys.has(p.reference_id || p.reference_code)
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

      const historyPayload: Record<string, any> = {
        user_id: user.id,
        total_items: productsToInsert.length,
        brand_summary: brandSummary,
        file_name: fileName || 'Importação Manual',
      };

      if (isCompany && companyId) {
        historyPayload.company_id = companyId;
      }

      let { data: historyData, error: historyError } = await supabase
        .from('import_history')
        .insert(historyPayload)
        .select()
        .maybeSingle();

      if (historyError && historyPayload.company_id) {
        delete historyPayload.company_id;
        const retry = await supabase
          .from('import_history')
          .insert(historyPayload)
          .select()
          .maybeSingle();
        historyData = retry.data;
        historyError = retry.error;
      }

      if (historyError)
        throw new Error('Erro ao criar histórico: ' + historyError.message);

      const historyId = historyData?.id;
      addLog(`Histórico criado: ${historyId}`, 'success');

      const finalBatch = productsToInsert.map((p) => ({
        ...p,
        last_import_id: historyId,
      }));

      // Counters to report accurate inserted vs updated amounts
      let totalInserted = 0;
      let totalUpdated = 0;

      // Busca produtos existentes para preservar o `slug` quando já existirem
      const allKeysFinal = finalBatch.map((p) => p.reference_id || p.reference_code);
      if (allKeysFinal.length > 0) {
        addLog(
          `Buscando ${allKeysFinal.length} produtos já existentes (em chunks, consultando apenas refs faltantes)...`
        );
        const chunkSizeExisting = 500;
        for (let j = 0; j < allKeysFinal.length; j += chunkSizeExisting) {
          const chunk = allKeysFinal.slice(j, j + chunkSizeExisting);
          // apenas buscar keys que ainda não temos em existingMap
          const missingChunk = chunk.filter((k) => !existingMap[k]);
          if (missingChunk.length === 0) continue;
          const chunkIndex = Math.floor(j / chunkSizeExisting) + 1;
          addLog(
            `Buscando chunk ${chunkIndex} (items ${j + 1}-${Math.min(j + chunkSizeExisting, allKeysFinal.length)}) - ${missingChunk.length} faltantes...`
          );

          // 1) tentar por reference_id
          const { data: existingByRefId, error: errByRefId } = await supabase
            .from('products')
            .select('id,reference_id,reference_code,slug')
            .eq(ownerField, ownerId)
            .in('reference_id', missingChunk as any[]);

          if (errByRefId) {
            addLog(`Aviso: erro buscando por reference_id: ${errByRefId.message}`, 'error');
          }

          if (existingByRefId && Array.isArray(existingByRefId)) {
            existingByRefId.forEach((ep: any) => {
              const key = ep.reference_id || ep.reference_code;
              if (key) existingMap[key] = { id: ep.id, slug: ep.slug } as any;
            });
          }

          // 2) buscar pelos que continuam faltando por reference_code (compatibilidade)
          const stillMissing = missingChunk.filter((k) => !existingMap[k]);
          if (stillMissing.length > 0) {
            const { data: existingByRefCode, error: existingError } = await supabase
              .from('products')
              .select('id,reference_id,reference_code,slug')
              .eq(ownerField, ownerId)
              .in('reference_code', stillMissing as any[]);

            if (existingError) {
              addLog(
                `Erro ao buscar produtos existentes (chunk ${chunkIndex}): ${existingError.message}`,
                'error'
              );
              continue;
            }

            if (existingByRefCode && Array.isArray(existingByRefCode)) {
              existingByRefCode.forEach((ep: any) => {
                const key = ep.reference_id || ep.reference_code;
                if (key) existingMap[key] = { id: ep.id, slug: ep.slug } as any;
              });
            }
          }
        }
        addLog(`Busca de produtos existentes concluída. Encontrados: ${Object.keys(existingMap).length}`);
      }

      const batchSize = 30; // lote menor para reduzir latência e evitar timeouts
      const totalBatches = Math.ceil(finalBatch.length / batchSize);

      addLog(`Enviando/atualizando ${finalBatch.length} itens em ${totalBatches} lotes via API...`);

      for (let i = 0; i < finalBatch.length; i += batchSize) {
        const batchNum = Math.floor(i / batchSize) + 1;
        const batch = finalBatch.slice(i, i + batchSize);

        addLog(
          `Enviando Lote ${batchNum}/${totalBatches} (itens ${i + 1}-${Math.min(i + batchSize, finalBatch.length)})...`
        );

        // Preserva slug existente quando houver
        batch.forEach((item) => {
          const key = item.reference_id || item.reference_code;
          const existing = existingMap[key];
          if (existing && existing.slug) {
            item.slug = existing.slug;
          } else if (!item.slug) {
            const slugBase = String(item.name || 'produto')
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-');
            item.slug = `${slugBase}-${Date.now().toString(36).slice(-6)}`;
          }
        });

        // enviar para API em tentativa com retry
        let attempts = 0;
        let processed = false;
        while (attempts < 3 && !processed) {
          attempts += 1;
          try {
            const res = await fetch('/api/import-products-chunk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ batch, historyId }),
            });
            if (!res.ok) {
              const txt = await res.text();
              addLog(`Erro no lote ${batchNum}: ${res.status} ${txt}`, 'error');
              await new Promise((r) => setTimeout(r, 200 * attempts));
              continue;
            }
            const data = await res.json();
            totalInserted += data.inserted || 0;
            totalUpdated += data.updated || 0;
            if (data.lastError) {
              addLog(`Aviso no lote ${batchNum}: ${data.lastError}`, 'error');
            }
            addLog(`Lote ${batchNum} processado: ${data.inserted || 0} inseridos, ${data.updated || 0} atualizados`, 'success');
            processed = true;
          } catch (e: any) {
            addLog(`Exceção no lote ${batchNum}: ${e?.message || String(e)}`, 'error');
            await new Promise((r) => setTimeout(r, 200 * attempts));
          }
        }

        if (!processed) {
          errorCount += batch.length;
          addLog(`Falha definitiva no lote ${batchNum}`, 'error');
        }

        // pequeno delay entre lotes para reduzir bursts e aliviar limites de execução
        await new Promise((r) => setTimeout(r, 150));
      }

      setStats({
        total: rows.length,
        inserted: totalInserted,
        updated: totalUpdated,
        errors: errorCount,
      });

      // Coletar pré-visualizações de imagens externas para exibir ao usuário
      try {
        const previewUrls = finalBatch
          .flatMap((p) => (p.images && Array.isArray(p.images) ? p.images : []))
          .filter((u) => typeof u === 'string' && u.startsWith('http'))
          .map((u) => String(u).trim())
          .filter(Boolean);
        // Dedup e limitar
        const unique = Array.from(new Set(previewUrls)).slice(0, 24);
        setExternalPreviews(unique);
      } catch (e) {
        // não crítico
      }

      // Atualiza o histórico com a quantidade real de inserções (para o desfazer funcionar corretamente)
      if (historyId) {
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
      }

      // 🚀 SE FOR MASTER E HOUVER USUÁRIOS DESTINO SELECIONADOS: REPLICAR LANÇAMENTOS
      if (isMaster && selectedTargetUserIds.length > 0) {
        const detectedBrandsList = Array.from(detectedBrands);
        addLog(
          `🚀 Replicando lançamentos para ${selectedTargetUserIds.length} usuário(s) selecionado(s)...`,
          'info'
        );

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        for (const targetId of selectedTargetUserIds) {
          const targetUserObj = targetUsersList.find((u) => u.user_id === targetId);
          const targetName = targetUserObj?.full_name || targetUserObj?.email || targetId;

          addLog(`🔄 Replicando catálogo/lançamentos para: ${targetName}...`, 'info');

          try {
            const resp = await fetch('/api/admin/setup-new-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                sourceUserId: currentUserId || user.id,
                targetUserId: targetId,
                brands: detectedBrandsList.length > 0 ? detectedBrandsList : null,
              }),
            });

            if (resp.ok) {
              const resData = await resp.json();
              addLog(
                `✅ Lançamentos replicados para ${targetName} (${resData.totalProcessed || 'Concluído'})`,
                'success'
              );
            } else {
              const errData = await resp.json();
              addLog(
                `⚠️ Aviso ao replicar para ${targetName}: ${errData.error || 'Erro na API'}`,
                'error'
              );
            }
          } catch (cloneErr: any) {
            addLog(
              `❌ Erro ao replicar para ${targetName}: ${cloneErr?.message || String(cloneErr)}`,
              'error'
            );
          }
        }
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

  // Computa apenas os campos principais que foram realmente mapeados (truthy)
  const mappedMain = [
    'name',
    'sku',
    'price',
    'sale_price',
    'brand',
    'ref',
    'model_code',
    'ean',
    'category',
    'color',
    'gender',
    'desc',
    'image',
  ]
    .map((k) => (mapping as any)[k])
    .filter(Boolean) as string[];

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
                { k: 'model_code', l: 'Model Code / Reference ID' },
                { k: 'brand', l: 'Marca' },
                { k: 'gender', l: 'Gênero' },
                { k: 'image', l: 'URL da Imagem' },
                { k: 'ean', l: 'EAN / Barcode' },
                { k: 'category', l: 'Categoria' },
                { k: 'color', l: 'Cor' },
                { k: 'tipo_montagem', l: 'Tipo de Montagem' },
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
                      {columns.map((c: string) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
              <div className="md:col-span-3 flex flex-col sm:flex-row sm:items-center gap-4 pt-2 border-t dark:border-slate-800 mt-2">
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={groupByReference}
                    onChange={(e) => setGroupByReference(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Agrupar por Reference ID (mesmas referências → 1 produto)</span>
                </label>

                <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-3 py-1.5 rounded-lg transition-colors hover:bg-amber-100/60">
                  <input
                    type="checkbox"
                    checked={markAsLaunch}
                    onChange={(e) => setMarkAsLaunch(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <span className="text-amber-900 dark:text-amber-200 font-medium flex items-center gap-1">
                    🚀 Marcar estes produtos como <strong>Lançamento</strong> (<code className="text-xs bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-mono">is_launch = true</code>)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 👥 Painel Master: Seleção de Usuários para Replicação de Lançamentos */}
          {isMaster && (
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-6 rounded-xl border border-indigo-200 dark:border-indigo-800/60 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-2 text-base">
                  <Users size={20} className="text-indigo-600 dark:text-indigo-400" />
                  Replicar Lançamentos para Outros Usuários (Painel Master)
                </h3>
                <span className="text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/70 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-full w-fit">
                  {selectedTargetUserIds.length} selecionado(s)
                </span>
              </div>
              <p className="text-xs text-indigo-800 dark:text-indigo-300">
                Ao importar esta planilha no usuário template, os produtos também serão duplicados na tabela <code>products</code> para os usuários marcados abaixo, <strong>compartilhando exatamente as mesmas imagens</strong> no storage.
              </p>

              {targetUsersList.filter((u) => u.user_id !== currentUserId).length === 0 ? (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 italic">Carregando lista de usuários ou nenhum outro usuário cadastrado...</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const allOtherIds = targetUsersList
                          .filter((u) => u.user_id !== currentUserId)
                          .map((u) => u.user_id);
                        if (selectedTargetUserIds.length === allOtherIds.length) {
                          setSelectedTargetUserIds([]);
                        } else {
                          setSelectedTargetUserIds(allOtherIds);
                        }
                      }}
                      className="text-indigo-700 dark:text-indigo-300 hover:underline font-semibold"
                    >
                      {selectedTargetUserIds.length === targetUsersList.filter((u) => u.user_id !== currentUserId).length
                        ? 'Desmarcar Todos'
                        : 'Selecionar Todos os Usuários'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-2 border rounded-lg bg-white dark:bg-slate-900 border-indigo-200/80 dark:border-indigo-800/50">
                    {targetUsersList
                      .filter((u) => u.user_id !== currentUserId)
                      .map((u) => {
                        const isChecked = selectedTargetUserIds.includes(u.user_id);
                        return (
                          <label
                            key={u.user_id}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg text-xs cursor-pointer border transition-all ${
                              isChecked
                                ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-400 dark:border-indigo-600 text-indigo-950 dark:text-indigo-100 font-medium shadow-sm'
                                : 'hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTargetUserIds([...selectedTargetUserIds, u.user_id]);
                                } else {
                                  setSelectedTargetUserIds(selectedTargetUserIds.filter((id) => id !== u.user_id));
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0"
                            />
                            <div className="truncate min-w-0 flex-1">
                              <div className="font-semibold truncate">{u.full_name || u.email}</div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{u.email}</div>
                              {u.role && (
                                <span className="inline-block mt-0.5 text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border">
                                  {u.role}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border shadow-sm">
            <h3 className="font-semibold mb-2 text-gray-800 flex items-center gap-2">
              <FileText size={18} /> Ficha Técnica Extra
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Selecione o que deseja importar.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {columns
                .filter((c) =>
                  !mappedMain.includes(c) ||
                  (mapping.techSpecColumns || []).includes(c)
                )
                .map((col: string, idx: number) => {
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
              <p className="text-3xl font-bold text-green-600">{stats.inserted}</p>
              <p className="text-xs uppercase font-bold text-gray-400 mt-1">Inseridos</p>
            </div>

            <div className="text-center">
              <p className="text-3xl font-bold text-sky-600">{stats.updated}</p>
              <p className="text-xs uppercase font-bold text-gray-400 mt-1">Atualizados</p>
            </div>

            {stats.errors > 0 && (
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{stats.errors}</p>
                <p className="text-xs uppercase font-bold text-gray-400 mt-1">Erros</p>
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
          {/* PAINEL DE SINCRONIZAÇÃO DE IMAGENS NO NAVEGADOR */}
          <div className="mt-6 p-6 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-500/30 rounded-2xl text-left shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl shadow">
                <RefreshCw className={`w-6 h-6 ${isSyncingImages ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h4 className="font-bold text-base text-gray-900">
                  Sincronização de Imagens pelo Navegador
                </h4>
                <p className="text-xs text-gray-600">
                  Baixe as imagens externas da Safilo, converta para WebP (480w/1200w) e salve no Supabase Storage sem precisar do terminal!
                </p>
              </div>
            </div>

            {!isSyncingImages && syncResults === null && (
              <button
                onClick={handleStartFrontendSync}
                className="w-full mt-4 py-3.5 px-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Play size={18} fill="currentColor" />
                ⚡ Processar e Otimizar Imagens Externas Agora pelo Navegador
              </button>
            )}

            {isSyncingImages && (
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-xs font-bold text-gray-700">
                  <span>Sincronizando produtos... {syncProgress.current} / {syncProgress.total}</span>
                  <span>{Math.round((syncProgress.current / (syncProgress.total || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-orange-600 h-full transition-all duration-300"
                    style={{ width: `${Math.round((syncProgress.current / (syncProgress.total || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {syncLogs.length > 0 && (
              <div className="bg-gray-900 text-amber-400 p-4 rounded-xl text-xs font-mono max-h-48 overflow-y-auto mt-4 border border-gray-800 shadow-inner">
                <div className="text-gray-500 font-bold mb-1 border-b border-gray-800 pb-1 flex items-center gap-2">
                  <Terminal size={12} /> STREAMING DE SINCRONIZAÇÃO EM TEMPO REAL
                </div>
                {syncLogs.map((log, idx) => (
                  <div key={idx} className="py-0.5 border-b border-gray-800/40 last:border-0 truncate font-mono">
                    {log}
                  </div>
                ))}
              </div>
            )}

            {syncResults && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 text-green-900 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs">
                <span>✅ Sincronização concluída com sucesso! Sucesso: {syncResults.success} | Falhas: {syncResults.failed} | Pulados: {syncResults.skipped}</span>
              </div>
            )}
          </div>

          {externalPreviews.length > 0 && (
            <div className="mt-6 text-left">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">Pré-visualização de Imagens Externas</h4>
              <p className="text-xs text-gray-500 mb-2">Imagens referenciadas por URL (serão mantidas como externas e processadas em background).</p>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {externalPreviews.map((u, i) => (
                  <div key={`${u}-${i}`} className="w-full h-24 bg-gray-100 rounded overflow-hidden flex items-center justify-center border p-2">
                    <div className="text-xs text-center truncate">
                      <div className="mb-1 text-gray-600">Imagem externa (não carregada automaticamente)</div>
                      <a
                        href={String(u)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline block truncate"
                        title={String(u)}
                      >
                        Abrir imagem
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3 mt-6">
            <Button
              onClick={() => {
                trackEvent('click_import_visual', { from: 'import-massa' });
                router.push('/dashboard/products/import-visual');
              }}
              leftIcon={<ImagePlus size={20} />}
              variant="primary"
              className="w-full px-6 py-3"
            >
              Ir para Importar Imagens
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
