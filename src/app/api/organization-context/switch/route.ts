import { createRouteSupabase } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { getOrganizationContextService } from '@/domain/organizations/OrganizationContextService';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const user = await getServerUserFallback();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const service = getOrganizationContextService();
    
    // Validar membership antes de trocar
    const membership = await service.validateMembership(user.id, organizationId);
    
    if (!membership) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 });
    }

    // Resolver novo contexto
    const context = await service.resolveOrganizationContext(user.id, organizationId);

    // Setar cookie para persistir escolha
    const response = NextResponse.json(context);
    response.cookies.set('active_org_id', organizationId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Switch organization error:', error);
    return NextResponse.json(
      { error: 'Failed to switch organization' },
      { status: 500 }
    );
  }
}