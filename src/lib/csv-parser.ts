export function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header.trim().toLowerCase()] = values[index]?.trim() || '';
      });
      rows.push(row);
    }
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Pular próxima aspas
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export function generateCSVTemplate(): string {
  const headers = [
    'name',
    'reference_code',
    'description',
    'brand',
    'price',
    'cost',
    'sale_price',
    'category',
    'category_id',
    'sku',
    'barcode',
    'stock_quantity',
    'min_stock_level',
    'track_stock',
    'manage_stock',
    'is_active',
    'is_launch',
    'is_destaque',
    'material',
    'fotocromatico',
    'polarizado',
    'gender',
    'color',
  ];

  const example = [
    'Armação Ray Vision RV001',
    'RV001',
    'Armação de teste',
    'Ray Vision',
    '150.00',
    '50.00',
    '130.00',
    'Armações',
    '',
    'RV001',
    '7891234567890',
    '100',
    '10',
    'true',
    'true',
    'true',
    'false',
    'false',
    'Acetato',
    'false',
    'false',
    'Unissex',
    'Preto',
  ];

  return [headers.join(','), example.join(',')].join('\n');
}