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
