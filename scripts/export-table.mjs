import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

// Usage: node scripts/export-table.mjs <table> <field1,field2,...> [out.xlsx]
const [,, tableName, fieldsArg, outFile = `${Date.now()}_${'export'}.xlsx`] = process.argv;

if (!tableName) {
  console.error('Usage: node scripts/export-table.mjs <table> <field1,field2,...> [out.xlsx]');
  process.exit(1);
}

const fields = fieldsArg ? fieldsArg.split(',').map(s => s.trim()).filter(Boolean) : [];

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no environment');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function fetchAll() {
  const out: any[] = [];
  const pageSize = 5000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase.from(tableName).select(fields.length ? fields.join(',') : '*').range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

(async () => {
  try {
    console.log('Buscando dados...', tableName, fields.length ? fields.join(',') : '*');
    const data = await fetchAll();
    console.log('Registros obtidos:', data.length);

    const worksheet = XLSX.utils.json_to_sheet(data || []);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
    XLSX.writeFile(workbook, outFile);
    console.log('Arquivo gravado em', outFile);
  } catch (err) {
    console.error('Erro:', err.message || err);
    process.exit(3);
  }
})();
