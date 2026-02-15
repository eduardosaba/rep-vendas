import { NextResponse } from 'next/server';
import { syncPublicCatalog } from '@/lib/sync-public-catalog';
import { revalidatePath } from 'next/cache';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * API Route para sincronizar dados entre a tabela privada 'settings'
 * e a tabela pública 'public_catalogs'.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      slug,
      is_active, // NOVO: Campo de ativação/desativação
      store_name,
      logo_url,
      banners,
      banners_mobile,
      primary_color,
      secondary_color,
      footer_message,
      show_sale_price,
      show_cost_price,
      header_background_color,
      enable_stock_management,
      show_installments,
      max_installments,
      show_cash_discount,
      cash_price_discount_percent,
      // Metadados visuais da Barra de Benefícios
      top_benefit_image_url,
      top_benefit_height,
      top_benefit_text_size,
      top_benefit_bg_color,
      top_benefit_text_color,
      top_benefit_text,
      show_top_benefit_bar,
      show_top_info_bar,
      font_family,
      // Share banner customizado (WhatsApp / Social)
      share_banner_url,
    } = body;

    // Extract singular banner fields separately (fallbacks for compatibility)
    const banner = body.banner ?? null;
    const banner_mobile = body.banner_mobile ?? null;

    // Validação básica: precisamos do ID e do Link para saber quem atualizar
    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Se slug não for fornecido, tentamos localizar um catálogo público
    // já existente para o `user_id` e usar seu slug. Isso permite que
    // atualizações em `settings` propaguem phone/email mesmo sem o admin
    // preencher manualmente o slug novamente.
    let finalSlug = slug;
    if (!finalSlug) {
      try {
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          const svc = createServiceClient(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY
          );
          const { data: existing } = await svc
            .from('public_catalogs')
            .select('catalog_slug')
            .eq('user_id', user_id)
            .maybeSingle();
          if (existing && existing.catalog_slug) {
            finalSlug = existing.catalog_slug;
            console.log(
              `✅ Slug encontrado automaticamente para user_id=${user_id}: ${finalSlug}`
            );
          }
        }
      } catch (e) {
        console.warn(
          '/api/public_catalogs/sync: failed to lookup slug by user_id',
          e
        );
      }
    }

    if (!finalSlug) {
      return NextResponse.json(
        {
          error:
            'slug is required (no existing public catalog found for this user)',
        },
        { status: 400 }
      );
    }

    // Chama a função auxiliar que executa o UPSERT no banco
    // Repasse explícito de campos críticos (telefone, email, hash de senha)
    // para garantir que sejam persistidos mesmo se a leitura de `settings`
    // falhar por questões de permissões/rls no client anon.
    await syncPublicCatalog(user_id, {
      slug: finalSlug,
      is_active: is_active ?? true,
      store_name,
      logo_url,
      banners,
      banners_mobile,
      banner,
      banner_mobile,
      primary_color,
      secondary_color,
      footer_message,
      show_sale_price,
      show_cost_price,
      header_background_color,
      enable_stock_management,
      show_installments,
      max_installments,
      show_cash_discount,
      cash_price_discount_percent,
      // Top Bar visuals
      top_benefit_image_url,
      top_benefit_height,
      top_benefit_text_size,
      top_benefit_bg_color,
      top_benefit_text_color,
      top_benefit_text,
      show_top_benefit_bar,
      show_top_info_bar,
      font_family,
      font_url: body.font_url ?? null,
      og_image_url: body.og_image_url ?? null,
      share_banner_url: body.share_banner_url ?? null,
      // Campos críticos vindos do payload
      phone: body.phone ?? null,
      email: body.email ?? null,
      price_password_hash: body.price_password_hash ?? null,
    });

    // Revalidação on-demand: atualizar cache/OG da página pública imediatamente
    try {
      if (finalSlug) revalidatePath(`/catalogo/${finalSlug}`);
    } catch (e) {
      console.warn('/api/public_catalogs/sync revalidatePath failed', e);
    }

    console.log(
      `✅ Catálogo '${finalSlug}' sincronizado com sucesso (status: ${is_active ? 'Online' : 'Offline'})`
    );

    return NextResponse.json({
      success: true,
      message: `Catálogo '${finalSlug}' sincronizado com status: ${is_active ? 'Online' : 'Offline'}`,
    });
  } catch (err: any) {
    console.error('ERRO CRÍTICO em API /api/public_catalogs/sync:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro interno de sincronização' },
      { status: 500 }
    );
  }
}
