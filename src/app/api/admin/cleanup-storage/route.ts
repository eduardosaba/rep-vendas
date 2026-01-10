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

    // Defina aqui o seu e-mail de administrador master
    const MASTER_EMAIL = 'seu-email@exemplo.com';

    if (authError || !user || user.email !== MASTER_EMAIL) {
      return NextResponse.json(
        {
          error:
            'Acesso negado. Apenas o Master pode acessar a Torre de Controle.',
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
    const { data: storageItems } = await supabaseAdmin.storage
      .from('product-images')
      .list('', { limit: 5000 });

    const orphans =
      storageItems
        ?.filter(
          (item) =>
            item.id && !item.name.endsWith('/') && !validPaths.has(item.name)
        )
        .map((item) => item.name) ?? [];

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
