import { createRouteSupabase } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { getProductService } from '@/domain/catalog/ProductService';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const user = await getServerUserFallback();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string || 'csv';

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['csv', 'xlsx', 'xls'];
    if (!validTypes.includes(fileType)) {
      return NextResponse.json({ error: 'Tipo de arquivo inválido. Use CSV, XLSX ou XLS.' }, { status: 400 });
    }

    // Read file as ArrayBuffer for XLSX, text for CSV
    let fileContent: string | ArrayBuffer;
    if (fileType === 'csv') {
      fileContent = await file.text();
    } else {
      fileContent = await file.arrayBuffer();
    }

    const service = getProductService();
    const result = await service.importProducts(user.id, fileContent, fileType as 'csv' | 'xlsx');

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[api/products/import] POST error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao importar produtos' }, { status });
  }
}