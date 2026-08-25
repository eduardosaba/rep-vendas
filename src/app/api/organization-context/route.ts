import { createRouteSupabase } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { getOrganizationContextService } from '@/domain/organizations/OrganizationContextService';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createRouteSupabase();
    const user = await getServerUserFallback();

    if (!user) {
      return NextResponse.json({ 
        organizationId: null,
        organization: null,
        organizationType: null,
        memberRole: null,
        memberStatus: null,
        permissions: [],
        memberships: [],
        fallback: 'none',
      });
    }

    const service = getOrganizationContextService();
    const context = await service.resolveOrganizationContext(user.id);

    return NextResponse.json(context);
  } catch (error) {
    console.error('Organization context error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve organization context' },
      { status: 500 }
    );
  }
}