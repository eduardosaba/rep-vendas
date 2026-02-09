'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Atualiza campos simples (Tags, Status)
export async function bulkUpdateFields(ids: string[], data: any) {
  const supabase = await createClient();

  const { error } = await supabase.from('products').update(data).in('id', ids);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/products');
  return { success: true };
}

// Atualização Inteligente de Preço (Fixo ou Porcentagem)
export async function bulkUpdatePrice(
  ids: string[],
  mode: 'fixed' | 'percentage',
  value: number
) {
  const supabase = await createClient();

  if (mode === 'fixed') {
    // Define valor fixo para todos
    const { error } = await supabase
      .from('products')
      .update({ price: value })
      .in('id', ids);

    if (error) throw new Error(error.message);
  } else {
    // Porcentagem: Precisamos ler, calcular e atualizar um por um (ou criar uma procedure SQL)
    // Para simplificar e manter seguro no Next.js, vamos buscar e atualizar em lote
    const { data: products } = await supabase
      .from('products')
      .select('id, price')
      .in('id', ids);

    if (!products) return { success: false };

    const updates = products.map((p) => {
      const newPrice = p.price * (1 + value / 100);
      return supabase
        .from('products')
        .update({ price: newPrice })
        .eq('id', p.id);
    });

    await Promise.all(updates);
  }

  revalidatePath('/dashboard/products');
  return { success: true };
}

// Exclusão em Massa
export async function bulkDelete(
  ids: string[],
  opts?: { preferSoft?: boolean; scope?: 'mine' | 'all' }
) {
  const supabase = await createClient();

  // Ensure user is authenticated
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message || 'auth_error');
  if (!user) throw new Error('not_authenticated');

  // Check profile role to decide authorization
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // If master, use service role to perform a global delete (bypass RLS).
  const chunkSize = 200;

  const deletedIds: string[] = [];
  const softDeletedIds: string[] = [];

  const runDeleteChunk = async (
    client: any,
    chunkIds: string[],
    extraFilter?: { field: string; value: any }
  ) => {
    try {
      let query = client.from('products').delete().in('id', chunkIds);
      if (extraFilter) {
        query = query.eq(extraFilter.field, extraFilter.value);
      }
      // IMPORTANTE: Adicionar .select() para retornar os IDs deletados
      query = query.select('id');
      const { data, error } = await query;
      if (error) throw error;

      if (Array.isArray(data)) {
        data.forEach((r: any) => {
          if (r && r.id) deletedIds.push(r.id);
        });
      }
      return;
    } catch (err: any) {
      // Log full error for easier debugging in server logs

      console.error('[bulkDelete] chunk delete error', {
        message: err?.message || String(err),
        code: err?.code,
        detail: err?.details,
        hint: err?.hint,
        chunkSize: chunkIds.length,
        sampleIds: chunkIds.slice(0, 5),
      });

      // Detect foreign-key/constraint errors (Postgres code 23503) or messages
      const isFkError =
        err?.code === '23503' ||
        /foreign key constraint|violates foreign key|referential integrity/i.test(
          String(err?.message || '')
        );

      if (isFkError) {
        // Attempt soft-delete: marcar como inativo para preservar integridade
        try {
          console.info(
            '[bulkDelete] attempting soft-delete for chunk due to FK constraint',
            {
              chunkSize: chunkIds.length,
              sampleIds: chunkIds.slice(0, 5),
            }
          );

          let upd = client
            .from('products')
            .update({ is_active: false })
            .in('id', chunkIds)
            .select('id');
          if (extraFilter) upd = upd.eq(extraFilter.field, extraFilter.value);
          const { data: upData, error: upErr } = await upd;
          if (upErr) {
            console.error('[bulkDelete] soft-delete failed', {
              message: upErr?.message || String(upErr),
            });
            throw upErr;
          }

          if (Array.isArray(upData)) {
            upData.forEach((r: any) => {
              if (r && r.id) softDeletedIds.push(r.id);
            });
          }

          // soft-delete succeeded; return without throwing
          return;
        } catch (softErr) {
          // If soft-delete fails, rethrow the original or soft-delete error
          throw softErr || err;
        }
      }

      throw err;
    }
  };

  if (profile?.role === 'master') {
    const SUPABASE_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('missing_service_role_key');
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { global: { fetch } }
    );

    if (opts?.scope === 'mine') {
      // Master requested to delete only their own items: use normal client and restrict by user_id
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        if (opts?.preferSoft) {
          const { data: upData, error: upErr } = await supabase
            .from('products')
            .update({ is_active: false })
            .in('id', chunk)
            .eq('user_id', user.id)
            .select('id');
          if (upErr) throw upErr;
          if (Array.isArray(upData))
            (upData as any[]).forEach(
              (r: any) => r?.id && softDeletedIds.push(r.id)
            );
        } else {
          await runDeleteChunk(supabase, chunk, {
            field: 'user_id',
            value: user.id,
          });
        }
      }
    } else if (opts?.scope === 'all') {
      // master deleting globally
      if (opts?.preferSoft) {
        // prefer soft-delete globally
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          const { data: upData, error: upErr } = await supabaseAdmin
            .from('products')
            .update({ is_active: false })
            .in('id', chunk)
            .select('id');
          if (upErr) throw upErr;
          if (Array.isArray(upData))
            (upData as any[]).forEach(
              (r: any) => r?.id && softDeletedIds.push(r.id)
            );
        }
      } else {
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);

          // Antes de deletar os registros, removemos arquivos do Storage
          try {
            const { data: imgs } = await supabaseAdmin
              .from('products')
              .select('id, image_path, images')
              .in('id', chunk);

            const pathsToDelete: string[] = [];
            (imgs || []).forEach((p: any) => {
              if (p?.image_path)
                pathsToDelete.push(String(p.image_path).replace(/^\//, ''));
              if (p?.images && Array.isArray(p.images)) {
                p.images.forEach((img: any) => {
                  if (!img) return;
                  if (
                    typeof img === 'string' &&
                    img.includes('/product-images/')
                  ) {
                    pathsToDelete.push(img.split('/product-images/')[1]);
                  } else if (
                    typeof img === 'string' &&
                    !img.startsWith('http')
                  ) {
                    pathsToDelete.push(String(img).replace(/^\//, ''));
                  }
                });
              }
            });

            const uniquePaths = Array.from(new Set(pathsToDelete)).filter(
              Boolean
            );
            if (uniquePaths.length > 0) {
              const { error: rmErr } = await supabaseAdmin.storage
                .from('product-images')
                .remove(uniquePaths);
              if (rmErr) {
                console.error('[bulkDelete] storage remove error', rmErr);
                // Abort deletion to avoid DB inconsistency when files couldn't be removed
                throw new Error(
                  rmErr?.message || 'storage_remove_failed_for_product_images'
                );
              }
            }
          } catch (e) {
            console.error(
              '[bulkDelete] failed to fetch image paths before delete',
              e
            );
          }

          await runDeleteChunk(supabaseAdmin, chunk);
        }
      }
    } else {
      // default master behavior: global delete (backwards compatible)
      if (opts?.preferSoft) {
        // prefer soft-delete: update is_active = false in chunks
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          const { data: upData, error: upErr } = await supabaseAdmin
            .from('products')
            .update({ is_active: false })
            .in('id', chunk)
            .select('id');
          if (upErr) throw upErr;
          if (Array.isArray(upData))
            (upData as any[]).forEach(
              (r: any) => r?.id && softDeletedIds.push(r.id)
            );
        }
      } else {
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);

          // Antes de deletar os registros, removemos arquivos do Storage
          try {
            const { data: imgs } = await supabaseAdmin
              .from('products')
              .select('id, image_path, images')
              .in('id', chunk);

            const pathsToDelete: string[] = [];
            (imgs || []).forEach((p: any) => {
              if (p?.image_path)
                pathsToDelete.push(String(p.image_path).replace(/^\//, ''));
              if (p?.images && Array.isArray(p.images)) {
                p.images.forEach((img: any) => {
                  if (!img) return;
                  if (
                    typeof img === 'string' &&
                    img.includes('/product-images/')
                  ) {
                    pathsToDelete.push(img.split('/product-images/')[1]);
                  } else if (
                    typeof img === 'string' &&
                    !img.startsWith('http')
                  ) {
                    pathsToDelete.push(String(img).replace(/^\//, ''));
                  }
                });
              }
            });

            const uniquePaths = Array.from(new Set(pathsToDelete)).filter(
              Boolean
            );
            if (uniquePaths.length > 0) {
              const { error: rmErr } = await supabaseAdmin.storage
                .from('product-images')
                .remove(uniquePaths);
              if (rmErr) {
                console.error('[bulkDelete] storage remove error', rmErr);
                // Abort deletion to avoid DB inconsistency when files couldn't be removed
                throw new Error(
                  rmErr?.message || 'storage_remove_failed_for_product_images'
                );
              }
            }
          } catch (e) {
            console.error(
              '[bulkDelete] failed to fetch image paths before delete',
              e
            );
          }

          await runDeleteChunk(supabaseAdmin, chunk);
        }
      }
    }
  } else {
    // Non-master users can only delete their own products
    if (opts?.preferSoft) {
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { data: upData, error: upErr } = await supabase
          .from('products')
          .update({ is_active: false })
          .in('id', chunk)
          .eq('user_id', user.id)
          .select('id');
        if (upErr) throw upErr;
        if (Array.isArray(upData))
          (upData as any[]).forEach(
            (r: any) => r?.id && softDeletedIds.push(r.id)
          );
      }
    } else {
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        await runDeleteChunk(supabase, chunk, {
          field: 'user_id',
          value: user.id,
        });
      }
    }
  }

  revalidatePath('/dashboard/products');
  return { success: true, deletedIds, softDeletedIds };
}
