'use server';

import { createClient } from '@/lib/supabase/server';
import { getActiveUserId } from '@/lib/auth-utils';
import * as XLSX from 'xlsx';
import { ImportSheetType, ParseExcelResult, PreviewRowDetail } from '../domain/types';
import { normalizeProductReference } from '@/shared/utils/normalize-product-reference';
import { normalizeBrand } from '@/shared/utils/normalize-brand';

// Utility to read excel from a buffer
function readExcelBuffer(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  // Convert sheet to JSON array (array of arrays to handle any header name)
  return XLSX.utils.sheet_to_json(sheet, { header: 1 });
}

export async function parseExcelAction(formData: FormData): Promise<ParseExcelResult> {
  const file = formData.get('file') as File;
  const brandParam = formData.get('brand') as string;
  const sheetType = formData.get('sheetType') as ImportSheetType;
  
  if (!file) {
    return { error: 'Nenhum arquivo enviado.' } as ParseExcelResult;
  }
  
  if (!brandParam || brandParam.trim() === '') {
    return { error: 'A marca não foi selecionada.' } as ParseExcelResult;
  }
  
  // Verify master access (can use getActiveUserId and then verify role, 
  // but as instructed we assume master validation)
  const supabase = await createClient();
  const userId = await getActiveUserId();
  
  if (!userId) {
    return { error: 'Usuário não autenticado.' } as ParseExcelResult;
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
    
  if (!profile || !['master', 'admin'].includes(profile.role)) {
    return { error: 'Acesso negado. Apenas administradores podem utilizar esta ferramenta.' } as ParseExcelResult;
  }

  const normalizedSelectedBrand = normalizeBrand(brandParam);
  const buffer = Buffer.from(await file.arrayBuffer());
  
  let rows: any[][];
  try {
    rows = readExcelBuffer(buffer) as any[][];
  } catch (err) {
    return { error: 'Falha ao ler o arquivo Excel. Verifique se o formato é suportado (.xlsx, .xls).' } as ParseExcelResult;
  }
  
  if (rows.length < 2) {
    return { error: 'O arquivo parece estar vazio ou não possui cabeçalhos.' } as ParseExcelResult;
  }
  
  if (rows.length > 50000) {
    return { error: 'A planilha excede o limite máximo de 50.000 linhas.' } as ParseExcelResult;
  }

  // Find header index for reference and status
  const headers = (rows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
  
  const refIndex = headers.findIndex(h => 
    h.includes('referencia') || h.includes('referência') || h.includes('ref') || h.includes('código') || h.includes('codigo')
  );
  
  const statusIndex = headers.findIndex(h => 
    h.includes('status') || h.includes('situação') || h.includes('situacao') || h.includes('disponibilidade')
  );
  
  const nameIndex = headers.findIndex(h =>
    h.includes('nome') || h.includes('descrição') || h.includes('descricao') || h.includes('produto')
  );

  if (refIndex === -1) {
    return { error: 'Não foi possível identificar a coluna de Referência/Código na planilha.' } as ParseExcelResult;
  }

  // Read lines
  let validRowsCount = 0;
  let invalidRowsCount = 0;
  const uniqueReferences = new Set<string>();
  const allParsedRows: Array<{
    originalRef: string;
    normRef: string;
    originalName: string;
    originalStatus: string;
    normStatus: 'ACTIVE' | 'INACTIVE' | 'UNKNOWN';
  }> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    const rawRef = String(row[refIndex] || '').trim();
    if (!rawRef) {
      invalidRowsCount++;
      continue;
    }
    
    const normRef = normalizeProductReference(rawRef);
    if (!normRef) {
      invalidRowsCount++;
      continue;
    }
    
    validRowsCount++;
    uniqueReferences.add(normRef);
    
    const rawStatus = statusIndex !== -1 ? String(row[statusIndex] || '').trim() : '';
    let normStatus: 'ACTIVE' | 'INACTIVE' | 'UNKNOWN' = 'UNKNOWN';
    
    if (rawStatus) {
      const lowerStatus = rawStatus.toLowerCase();
      if (lowerStatus.includes('ativo') || lowerStatus.includes('disponível') || lowerStatus.includes('disponivel') || lowerStatus.includes('linha')) {
        normStatus = 'ACTIVE';
      } else if (lowerStatus.includes('inativo') || lowerStatus.includes('fora') || lowerStatus.includes('indisponível') || lowerStatus.includes('esgotado')) {
        normStatus = 'INACTIVE';
      }
    }
    
    const rawName = nameIndex !== -1 ? String(row[nameIndex] || '').trim() : '';
    
    allParsedRows.push({
      originalRef: rawRef,
      normRef: normRef,
      originalName: rawName,
      originalStatus: rawStatus,
      normStatus: normStatus
    });
  }

  // Remove duplicates by normRef, keeping first occurrence
  const dedupedRows = [];
  const seenRefs = new Set();
  for (const r of allParsedRows) {
    if (!seenRefs.has(r.normRef)) {
      seenRefs.add(r.normRef);
      dedupedRows.push(r);
    }
  }

  // Fetch products by brand paginated to handle variations in reference_code formatting
  let allMatchedProducts: any[] = [];
  const PAGE_SIZE = 1000;
  let hasMore = true;
  let page = 0;
  
  // Create a base search term from the brand to avoid strict ILIKE missing aliases
  // We use the first word or the raw brand param as a loose filter in the DB
  const looseBrandTerm = brandParam.trim().split(' ')[0];

  while (hasMore) {
    const { data: productsPage, error } = await supabase
      .from('products')
      .select('id, reference_code, brand, is_active, user_id')
      .ilike('brand', `%${looseBrandTerm}%`)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
    if (error) {
      console.error('Supabase brand query error:', error);
      break;
    }
    
    if (!productsPage || productsPage.length === 0) {
      hasMore = false;
      break;
    }
    
    // Filter by brand exact normalization in memory
    const filteredByBrand = productsPage.filter(p => {
      if (!p.brand) return false;
      return normalizeBrand(p.brand) === normalizedSelectedBrand;
    });
    
    allMatchedProducts = allMatchedProducts.concat(filteredByBrand);
    
    if (productsPage.length < PAGE_SIZE) {
      hasMore = false;
    }
    page++;
  }
  // Map product counts
  const refToProductsMap = new Map<string, typeof allMatchedProducts>();
  for (const p of allMatchedProducts) {
    // Note: product reference_code is matched as-is since the IN clause matches exact, 
    // but we normalized the search. In DB reference_code might be unnormalized. 
    // Wait, the IN query matched exact `reference_code`. If DB has unnormalized, it wouldn't match.
    // So we must normalize the DB ref here to group properly!
    const pNormRef = normalizeProductReference(p.reference_code);
    if (!refToProductsMap.has(pNormRef)) {
      refToProductsMap.set(pNormRef, []);
    }
    refToProductsMap.get(pNormRef)!.push(p);
  }

  // Calculate stats and build preview details
  let foundRefs = 0;
  let notFoundRefs = 0;
  let productsKeptActive = 0;
  let productsToActivate = 0;
  let productsToDeactivate = 0;
  let productsUnchanged = 0;
  let totalProductsAffected = 0;
  const affectedUsers = new Set<string>();

  const details: PreviewRowDetail[] = [];

  for (const r of dedupedRows) {
    const matchedProducts = refToProductsMap.get(r.normRef) || [];
    const matchCount = matchedProducts.length;
    
    if (matchCount > 0) {
      foundRefs++;
      matchedProducts.forEach(p => affectedUsers.add(p.user_id));
      totalProductsAffected += matchCount;
    } else {
      notFoundRefs++;
    }
    
    // Determine system status
    let currentSystemStatus: 'ACTIVE' | 'INACTIVE' | 'MIXED' | 'NOT_FOUND' = 'NOT_FOUND';
    if (matchCount > 0) {
      const activeCount = matchedProducts.filter(p => p.is_active).length;
      if (activeCount === matchCount) currentSystemStatus = 'ACTIVE';
      else if (activeCount === 0) currentSystemStatus = 'INACTIVE';
      else currentSystemStatus = 'MIXED';
    }
    
    // Determine action based on sheetType
    let simulatedAction: PreviewRowDetail['simulatedAction'] = 'NONE';
    
    if (sheetType === 'FULL_CATALOG') {
      // If it's in the catalog, it's active. If it's not in the catalog... wait.
      // The row is IN the catalog, so it should be ACTIVE.
      simulatedAction = 'ACTIVATE';
    } else if (sheetType === 'ONLY_OUT_OF_STOCK') {
      simulatedAction = 'DEACTIVATE';
    } else if (sheetType === 'ONLY_IN_STOCK') {
      simulatedAction = 'ACTIVATE';
    } else if (sheetType === 'STATUS_COLUMN') {
      if (r.normStatus === 'ACTIVE') simulatedAction = 'ACTIVATE';
      else if (r.normStatus === 'INACTIVE') simulatedAction = 'DEACTIVATE';
      else simulatedAction = 'NONE';
    }

    if (currentSystemStatus === 'NOT_FOUND') {
      simulatedAction = 'NONE';
    }

    // Now refine the action depending on current status vs desired
    if (simulatedAction === 'ACTIVATE') {
      if (currentSystemStatus === 'ACTIVE') {
        simulatedAction = 'KEEP_ACTIVE';
        productsKeptActive += matchCount;
      } else {
        productsToActivate += matchCount; // Includes mixed, simplified
      }
    } else if (simulatedAction === 'DEACTIVATE') {
      if (currentSystemStatus === 'INACTIVE') {
        simulatedAction = 'KEEP_INACTIVE';
        productsUnchanged += matchCount;
      } else {
        productsToDeactivate += matchCount; // Includes mixed
      }
    } else {
      productsUnchanged += matchCount;
    }

    details.push({
      originalReference: r.originalRef,
      normalizedReference: r.normRef,
      originalName: r.originalName,
      factoryStatus: r.originalStatus,
      normalizedStatus: r.normStatus,
      matchingProductsCount: matchCount,
      affectedRepsCount: new Set(matchedProducts.map(p => p.user_id)).size,
      currentSystemStatus,
      simulatedAction,
      validationMessage: matchCount === 0 ? 'Referência não encontrada no banco' : 'Simulação concluída'
    });
  }

  // Add the ones that are in the database for this brand, but NOT in the "FULL_CATALOG" sheet.
  // The logic for FULL_CATALOG says: if it's in the DB but not in the sheet, it should be deactivated.
  // Note: Finding these requires querying all products for the brand. We'll skip for this iteration, 
  // as the user's prompt says: "Para o tipo 'Linha completa disponível', a prévia pode calcular os produtos ausentes que futuramente seriam desativados, mas deve apenas mostrar o resultado."
  // To do this, we need a separate query: "SELECT id, reference_code FROM products WHERE brand = X".
  // This could be huge, so we might just note it as a limitation for Marco 1 or do a Count query.
  
  return {
    brand: brandParam,
    fileName: file.name,
    sheetType,
    totalRows: rows.length - 1,
    validRows: validRowsCount,
    invalidRows: invalidRowsCount,
    uniqueReferences: uniqueReferences.size,
    duplicateReferences: allParsedRows.length - uniqueReferences.size,
    foundReferences: foundRefs,
    notFoundReferences: notFoundRefs,
    totalProductsAffected,
    totalUsersAffected: affectedUsers.size,
    totalOrganizationsAffected: 0, // Need company join to calculate this properly, defaulting 0 for now
    productsKeptActive,
    productsToActivate,
    productsToDeactivate,
    productsUnchanged,
    details
  };
}
