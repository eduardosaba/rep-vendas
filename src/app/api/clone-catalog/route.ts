import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

type Body = {
  target_user_id: string;
  brands: string[];
  source_template_slug?: string;
};

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );
    }

    const supabase = createServiceClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    /*
     * =====================================================
     * PAYLOAD
     * =====================================================
     */

    if (
      !body?.target_user_id ||
      !Array.isArray(body.brands) ||
      body.brands.length === 0
    ) {
      return NextResponse.json(
        { error: 'Dados de clonagem inválidos.' },
        { status: 400 }
      );
    }

    const brands = [
      ...new Set(
        body.brands
          .map((b) => b?.trim())
          .filter(Boolean)
      ),
    ];

    /*
     * Template padrão atual = slug "template"
     *
     * No futuro a Torre pode mandar:
     * template-embalagens
     * template-alimentos
     * etc.
     */
    const sourceTemplateSlug =
      body.source_template_slug?.trim() || 'template';

    /*
     * =====================================================
     * AUTENTICAÇÃO
     * =====================================================
     */

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing auth' },
        { status: 401 }
      );
    }

    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: 'Invalid auth' },
        { status: 401 }
      );
    }

    const requestingUser = authData.user;

    /*
     * =====================================================
     * AUTORIZAÇÃO
     * =====================================================
     */

    const { data: adminProfile, error: adminProfileError } =
      await supabase
        .from('profiles')
        .select('role')
        .eq('id', requestingUser.id)
        .maybeSingle();

    if (adminProfileError) {
      throw adminProfileError;
    }

    if (
      adminProfile?.role !== 'master' &&
      adminProfile?.role !== 'admin'
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * LOCALIZAR TEMPLATE
     * =====================================================
     */

    const { data: templateProfile, error: templateError } =
      await supabase
        .from('profiles')
        .select('id, slug, email')
        .eq('slug', sourceTemplateSlug)
        .maybeSingle();

    if (templateError || !templateProfile) {
      return NextResponse.json(
        {
          error: `Template "${sourceTemplateSlug}" não encontrado.`,
        },
        { status: 404 }
      );
    }

    const sourceUserId = templateProfile.id;

    /*
     * =====================================================
     * VALIDAR DESTINO
     * =====================================================
     */

    if (sourceUserId === body.target_user_id) {
      return NextResponse.json(
        {
          error: 'Template e usuário destino não podem ser iguais.',
        },
        { status: 400 }
      );
    }

    const { data: targetProfile, error: targetProfileError } =
      await supabase
        .from('profiles')
        .select('id, slug, email, organization_id')
        .eq('id', body.target_user_id)
        .maybeSingle();

    if (targetProfileError || !targetProfile) {
      return NextResponse.json(
        {
          error: 'Usuário de destino não encontrado.',
        },
        { status: 404 }
      );
    }

    /*
     * =====================================================
     * ORGANIZAÇÃO DESTINO
     * =====================================================
     */

    let targetOrganizationId: string | null =
      targetProfile.organization_id ?? null;

    /*
     * Primeiro organization_members,
     * que é a associação efetiva atual.
     */
    const { data: memberships, error: membershipError } =
      await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', body.target_user_id);

    if (membershipError) {
      throw membershipError;
    }

    const organizationIds = [
      ...new Set(
        (memberships || [])
          .map((m: any) => m.organization_id)
          .filter(Boolean)
      ),
    ];

    if (organizationIds.length === 1) {
      targetOrganizationId = organizationIds[0];
    }

    if (organizationIds.length > 1) {
      return NextResponse.json(
        {
          error:
            'O usuário pertence a mais de uma organização. Selecione explicitamente a organização de destino.',
        },
        { status: 409 }
      );
    }

    /*
     * Fallback legado.
     */
    if (!targetOrganizationId) {
      const { data: legacyMap, error: legacyError } =
        await supabase
          .from('legacy_user_organization_map')
          .select('target_organization_id')
          .eq('user_id', body.target_user_id)
          .maybeSingle();

      if (legacyError) {
        throw legacyError;
      }

      targetOrganizationId =
        legacyMap?.target_organization_id ?? null;
    }

    if (!targetOrganizationId) {
      return NextResponse.json(
        {
          error:
            'Nenhuma organização encontrada para o usuário destino.',
        },
        { status: 409 }
      );
    }

    /*
     * =====================================================
     * CLONAGEM REAL
     * =====================================================
     */

    const { data: cloneResult, error: cloneError } =
      await supabase.rpc('clone_catalog_products_v2', {
        p_source_user_id: sourceUserId,
        p_target_user_id: body.target_user_id,
        p_target_organization_id: targetOrganizationId,
        p_brands: brands,
        p_cloned_by_user_id: requestingUser.id,
      });

    if (cloneError) {
      throw cloneError;
    }

    /*
     * =====================================================
     * SINCRONIZAÇÃO DE MARCAS E LOGOS (dashboard/brands)
     * =====================================================
     */
    let syncedBrandsCount = 0;
    try {
      // 1. Buscar marcas configuradas no usuário de origem
      const { data: sourceBrands } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', sourceUserId);

      // Fallback para template padrão caso o usuário fonte não tenha logos configurados
      let fallbackBrands: any[] = [];
      const hasMissingLogos =
        !sourceBrands ||
        sourceBrands.length === 0 ||
        brands.some((b) => {
          const match = sourceBrands.find(
            (sb: any) => sb.name?.trim().toLowerCase() === b.trim().toLowerCase()
          );
          return !match || !match.logo_url;
        });

      if (hasMissingLogos) {
        const { data: defaultTemplateProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('slug', 'template')
          .maybeSingle();

        if (defaultTemplateProfile?.id && defaultTemplateProfile.id !== sourceUserId) {
          const { data: tBrands } = await supabase
            .from('brands')
            .select('*')
            .eq('user_id', defaultTemplateProfile.id);
          fallbackBrands = tBrands || [];
        }
      }

      // 2. Buscar marcas já existentes no usuário destino para evitar duplicatas e preservar personalizações
      const { data: targetBrands } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', body.target_user_id);

      const targetBrandsMap = new Map<string, any>();
      (targetBrands || []).forEach((tb: any) => {
        if (tb.name) {
          targetBrandsMap.set(tb.name.trim().toLowerCase(), tb);
        }
      });

      // 3. Para cada marca clonada, criar ou atualizar com a imagem e metadados
      for (const brandName of brands) {
        const normalized = brandName.trim().toLowerCase();

        // Encontrar a marca na origem (ou no fallback)
        const srcBrand =
          (sourceBrands || []).find(
            (sb: any) => sb.name?.trim().toLowerCase() === normalized
          ) ||
          fallbackBrands.find(
            (fb: any) => fb.name?.trim().toLowerCase() === normalized
          );

        const existingTb = targetBrandsMap.get(normalized);

        if (existingTb) {
          // Já existe no destino: preenche logo e/ou banner caso o destino esteja sem imagem
          const updatePayload: Record<string, any> = {};
          if (!existingTb.logo_url && srcBrand?.logo_url) {
            updatePayload.logo_url = srcBrand.logo_url;
            if (srcBrand.logo_path) updatePayload.logo_path = srcBrand.logo_path;
          }
          if (!existingTb.banner_url && srcBrand?.banner_url) {
            updatePayload.banner_url = srcBrand.banner_url;
            if (srcBrand.banner_path) updatePayload.banner_path = srcBrand.banner_path;
            if (srcBrand.banner_meta) updatePayload.banner_meta = srcBrand.banner_meta;
          }
          if (Object.keys(updatePayload).length > 0) {
            updatePayload.updated_at = new Date().toISOString();
            await supabase
              .from('brands')
              .update(updatePayload)
              .eq('id', existingTb.id);
            syncedBrandsCount++;
          }
        } else {
          // Não existe no destino: insere a marca com logo, banner e dados visuais
          const insertPayload: Record<string, any> = {
            name: srcBrand?.name || brandName,
            user_id: body.target_user_id,
            organization_id: targetOrganizationId,
            company_id: targetProfile.company_id || null,
            logo_url: srcBrand?.logo_url || null,
            logo_path: srcBrand?.logo_path || null,
            banner_url: srcBrand?.banner_url || null,
            banner_path: srcBrand?.banner_path || null,
            banner_meta: srcBrand?.banner_meta || null,
            description: srcBrand?.description || null,
            commission_percent: srcBrand?.commission_percent ?? 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { error: insErr } = await supabase
            .from('brands')
            .insert(insertPayload);

          if (!insErr) {
            syncedBrandsCount++;
          } else {
            console.warn(`Aviso: falha ao inserir marca "${brandName}" no destino:`, insErr.message);
          }
        }
      }
    } catch (brandSyncError) {
      console.warn('Aviso: falha não-crítica ao sincronizar marcas durante clone de catálogo:', brandSyncError);
    }

    /*
     * =====================================================
     * AUDITORIA
     * =====================================================
     */

    try {
      const cookieStore = await cookies();
      const impersonateCookieName =
        process.env.IMPERSONATE_COOKIE_NAME ||
        'impersonate_user_id';
      const impersonatedId =
        cookieStore.get(impersonateCookieName)?.value || null;

      await supabase.from('activity_logs').insert({
        user_id: impersonatedId || requestingUser.id,
        impersonator_id: impersonatedId ? requestingUser.id : null,
        action_type: 'CLONE_COMPLETED',
        description: `${cloneResult?.inserted_count ?? 0} produtos clonados para ${targetProfile.slug}.`,
        metadata: {
          template_slug: sourceTemplateSlug,
          source_user_id: sourceUserId,
          target_user_id: body.target_user_id,
          target_organization_id: targetOrganizationId,
          brands,
          synced_brands_count: syncedBrandsCount,
          result: cloneResult,
        },
      });
    } catch (logError) {
      console.warn('Falha ao registrar activity log', logError);
    }

    /*
     * =====================================================
     * RESPOSTA REAL
     * =====================================================
     */

    return NextResponse.json({
      ok: true,
      message:
        cloneResult?.inserted_count > 0
          ? `${cloneResult.inserted_count} produtos clonados com sucesso.`
          : 'Nenhum produto novo para clonar.',
      template: sourceTemplateSlug,
      target_user: targetProfile.slug,
      synced_brands_count: syncedBrandsCount,
      ...cloneResult,
    });
  } catch (error: any) {
    console.error('clone-catalog error', error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
