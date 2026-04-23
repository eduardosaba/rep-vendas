'use server'

import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function exportTableToExcel(
  tableName: string,
  fields: string[] = [],
  dateRange?: { start: string; end: string },
  columnMap?: Record<string, string>
) {
  const supabase = await createClient();
  const selectQuery = fields.length > 0 ? fields.join(',') : '*';

  const allData: any[] = [];
  // Reduce page size to avoid long-running queries that trigger statement_timeout
  const pageSize = 1000;

  // Try to use stable, efficient pagination by primary key (`id`) if available.
  // Falling back to `created_at` range if `id` is not present.
  let useIdPagination = false;
  let lastId: any = null;

  try {
    // Test if `id` exists and is queriable
    const test = await supabase.from(tableName).select('id').order('id', { ascending: true }).limit(1);
    if (!(test as any).error) useIdPagination = true;
  } catch (e) {
    useIdPagination = false;
  }

  if (useIdPagination) {
    while (true) {
      let q: any = supabase.from(tableName).select(selectQuery).order('id', { ascending: true }).limit(pageSize);
      if (lastId !== null) q = q.gt('id', lastId);
      if (dateRange?.start && dateRange?.end) {
        q = q.gte('created_at', dateRange.start).lte('created_at', dateRange.end);
      }

      let data: any = null;
      try {
        const res = await q;
        data = (res as any).data;
        const err = (res as any).error;
        if (err) throw err;
      } catch (err: any) {
        if (String(err?.message || '').toLowerCase().includes('statement timeout')) {
          throw new Error(
            'Consulta muito longa: o banco cancelou a operação por `statement timeout`. Tente filtrar por intervalo de datas, reduzir a quantidade de campos selecionados, ou criar um índice em `created_at` na tabela.'
          );
        }
        throw new Error(String(err?.message || err));
      }

      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < pageSize) break;
      lastId = (data as any)[data.length - 1]?.id ?? null;
    }
  } else {
    // Fallback to created_at pagination (offset-style via range)
    let from = 0;
    while (true) {
      // Order by created_at to keep pagination stable; helps DB use indexes if present
      let q = supabase.from(tableName).select(selectQuery).order('created_at', { ascending: true });
      if (dateRange?.start && dateRange?.end) {
        q = q.gte('created_at', dateRange.start).lte('created_at', dateRange.end);
      }

      let data: any = null;
      try {
        const res = await q.range(from, from + pageSize - 1);
        data = (res as any).data;
        const err = (res as any).error;
        if (err) throw err;
      } catch (err: any) {
        if (String(err?.message || '').toLowerCase().includes('statement timeout')) {
          throw new Error(
            'Consulta muito longa: o banco cancelou a operação por `statement timeout`. Tente filtrar por intervalo de datas, reduzir a quantidade de campos selecionados, ou criar um índice em `created_at` na tabela.'
          );
        }
        throw new Error(String(err?.message || err));
      }

      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }

  // If a columnMap is provided, remap object keys to friendly names before creating the sheet
  let sheetData: any[] = allData || [];
  if (columnMap && Object.keys(columnMap).length > 0) {
    sheetData = (allData || []).map((row: any) => {
      const newRow: any = {};
      Object.keys(row).forEach((k) => {
        const friendly = columnMap[k] || k;
        newRow[friendly] = row[k];
      });
      return newRow;
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatorio');

  const excelBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  return excelBase64;
}
