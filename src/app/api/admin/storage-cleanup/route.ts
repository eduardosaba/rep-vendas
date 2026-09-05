import { NextResponse } from 'next/server';
import createClient from '@/lib/supabase/server';
import { deleteImageIfUnused } from '@/lib/storage';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Listagem recursiva de TODOS os arquivos do bucket product-images
    async function listRecursive(prefix = ''): Promise<any[]> {
      const { data, error } = await supabase.storage
        .from('product-images')
        .list(prefix, { limit: 1000 });
      if (error) return [];
      const result: any[] = [];
      for (const item of data || []) {
        if (item.name === '.emptyFolderPlaceholder') continue;
        const currentPath = prefix ? `${prefix}/${item.name}` : item.name;
        // Se item não possui metadata ou ID e não tem extensão, trata como diretório
        if (!item.id && !item.name.includes('.')) {
          const sub = await listRecursive(currentPath);
          result.push(...sub);
        } else {
          result.push({
            ...item,
            path: currentPath,
          });
        }
      }
      return result;
    }

    const allStorageFiles = await listRecursive('');

    // 2. Buscar todas as referências de imagem em uso no banco de dados (de TODOS os produtos)
    const { data: products } = await supabase
      .from('products')
      .select('image_path, image_variants, gallery_images, image_url, images');

    const urlsInUse = new Set<string>();
    (products || []).forEach((p: any) => {
      if (p.image_path) {
        urlsInUse.add(String(p.image_path));
        urlsInUse.add(String(p.image_path).replace(/^public\//, ''));
      }
      if (Array.isArray(p.image_variants)) {
        p.image_variants.forEach((v: any) => {
          if (v?.path) {
            urlsInUse.add(String(v.path));
            urlsInUse.add(String(v.path).replace(/^public\//, ''));
          }
          if (v?.url) urlsInUse.add(String(v.url));
        });
      }
      if (Array.isArray(p.gallery_images)) {
        p.gallery_images.forEach((g: any) => {
          if (typeof g === 'string') {
            urlsInUse.add(g);
          } else if (g?.path) {
            urlsInUse.add(String(g.path));
            urlsInUse.add(String(g.path).replace(/^public\//, ''));
          } else if (g?.url) {
            urlsInUse.add(String(g.url));
          }
        });
      }
      if (p.image_url) urlsInUse.add(String(p.image_url));
      if (Array.isArray(p.images)) {
        p.images.forEach((img: any) => img && urlsInUse.add(String(img)));
      }
    });

    // 3. Identificar órfãos (arquivos no Storage sem produto associado no DB)
    const orphans: any[] = [];
    for (const file of allStorageFiles) {
      const path = file.path;
      const cleanPath = path.replace(/^public\//, '');
      const hasMatch = Array.from(urlsInUse).some(
        (u) => u === path || u === cleanPath || u.endsWith(path) || u.endsWith(cleanPath)
      );

      if (!hasMatch) {
        const { data: publicData } = supabase.storage
          .from('product-images')
          .getPublicUrl(path);

        orphans.push({
          name: file.name,
          path,
          size_kb: ((file.metadata?.size || file.size || 0) / 1024).toFixed(2),
          public_url: publicData?.publicUrl || '',
        });
      }
    }

    return NextResponse.json({
      total_files: allStorageFiles.length,
      orphan_count: orphans.length,
      orphans,
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST: Move arquivos aprovados para /trash/ (dupla-trava via RPC `check_file_usage` quando disponível)
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const paths: string[] | undefined = body?.paths;

    // Se nenhuma lista for enviada, varremos a pasta repair e processamos todos os órfãos
    let filesToCheck: { name: string; path: string; public_url: string }[] = [];
    if (Array.isArray(paths) && paths.length > 0) {
      filesToCheck = paths.map((p) => ({
        name: p.split('/').pop() || p,
        path: p,
        public_url: '',
      }));
    } else {
      const { data: files } = await supabase.storage
        .from('product-images')
        .list(`${user.id}/repair`, { limit: 1000 });
      for (const f of files || []) {
        const path = `${user.id}/repair/${f.name}`;
        const { data: publicData } = supabase.storage
          .from('product-images')
          .getPublicUrl(path);
        filesToCheck.push({
          name: f.name,
          path,
          public_url: publicData?.publicUrl || '',
        });
      }
    }

    const results = { moved: 0, protected: 0, errors: 0, details: [] as any[] };

    for (const file of filesToCheck) {
      try {
        // Segurança: chama a função RPC check_file_usage se existir
        let inUse = false;
        try {
          const { data: rpcData, error: rpcErr } = await supabase.rpc(
            'check_file_usage',
            { file_path: file.public_url }
          );
          if (rpcErr) {
            // se a RPC não existir ou falhar, considere como protegido por segurança
            inUse = true;
          } else {
            inUse = Boolean(rpcData);
          }
        } catch (rpcCatch) {
          inUse = true;
        }

        if (inUse) {
          results.protected++;
          results.details.push({ path: file.path, status: 'protected' });
          continue;
        }

        // move para trash
        const target = `${user.id}/trash/${file.name}`;
        const { error: moveError } = await supabase.storage
          .from('product-images')
          .move(file.path, target);
        if (moveError) {
          results.errors++;
          results.details.push({
            path: file.path,
            status: 'error',
            message: moveError.message,
          });
        } else {
          results.moved++;
          results.details.push({
            path: file.path,
            status: 'moved',
            to: target,
          });
        }
      } catch (e: any) {
        results.errors++;
        results.details.push({
          path: file.path,
          status: 'error',
          message: String(e),
        });
      }
    }

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE: remove permanentemente arquivos (paths) - operação destrutiva, requer confirmação no cliente
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { paths } = await req.json(); // array de strings com paths completos
    if (!Array.isArray(paths) || paths.length === 0)
      return NextResponse.json({ error: 'No paths provided' }, { status: 400 });

    const deleted: string[] = [];
    for (const p of paths) {
      const res = await deleteImageIfUnused(supabase, 'product-images', p);
      if (!res.success) {
        return NextResponse.json(
          { error: res.error || 'delete_failed', path: p },
          { status: 500 }
        );
      }
      deleted.push(p);
    }
    return NextResponse.json({ success: true, deleted });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
