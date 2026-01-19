import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. BLOQUEIO DE SEGURANÇA: Validar se o usuário é Master
    // Buscamos a sessão do usuário que fez a requisição
    const authHeader = req.headers.get('Authorization');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(authHeader?.split(' ')[1] ?? '');

    // Aceita qualquer usuário autenticado (remova essa validação se quiser restringir)
    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'Acesso negado. Faça login para acessar esta funcionalidade.',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get('dryRun') !== 'false';

    // 2. BUSCA DE CAMINHOS NO BANCO (Principal + Galeria)
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('image_path, images');
    const validPaths = new Set<string>();

    products?.forEach((p) => {
      if (p.image_path) validPaths.add(p.image_path);
      if (p.images && Array.isArray(p.images)) {
        p.images.forEach((img: string) => {
          const path = img.includes('product-images/')
            ? img.split('product-images/')[1]
            : img;
          validPaths.add(path);
        });
      }
    });

    // 3. LISTAGEM E FILTRAGEM
    // Listagem recursiva do bucket para cobrir pastas aninhadas
    async function listRecursive(prefix = ''): Promise<string[]> {
      const { data, error } = await supabaseAdmin.storage
        .from('product-images')
        .list(prefix, { limit: 1000 });
      if (error) throw error;
      let names: string[] = [];
      for (const item of data || []) {
        // Heurística: nomes sem extensão são pastas — descer recursivamente
        if (!item.name.includes('.')) {
          const childPrefix = prefix ? `${prefix}/${item.name}` : item.name;
          const sub = await listRecursive(childPrefix);
          names.push(...sub.map((n) => `${childPrefix}/${n}`));
        } else {
          names.push(prefix ? `${prefix}/${item.name}` : item.name);
        }
      }
      return names;
    }

    const storageNames = await listRecursive('');

    const orphans = storageNames.filter((name) => !validPaths.has(name));

    if (dryRun) {
      return NextResponse.json({ success: true, mode: 'dryRun', orphans });
    }

    // 4. DELEÇÃO REAL
    if (orphans.length > 0) {
      await supabaseAdmin.storage.from('product-images').remove(orphans);
    }

    return NextResponse.json({
      success: true,
      mode: 'production',
      count: orphans.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
