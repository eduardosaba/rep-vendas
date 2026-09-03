import { createRouteSupabase } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const user = await getServerUserFallback();

    if (!user || user.role !== 'master') {
      return NextResponse.json({ error: 'Forbidden: master role required' }, { status: 403 });
    }

    const { organizationId, featureKey, enabled } = await request.json();

    if (!organizationId || !featureKey || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const validFeatures = [
      'organization_context_enabled',
      'distributor_portal_enabled',
      'optical_store_enabled',
      'b2b_relationships_enabled',
      'organization_products_enabled',
      'dual_order_status_enabled',
      'catalog_template_clone_enabled',
    ];

    if (!validFeatures.includes(featureKey)) {
      return NextResponse.json({ error: 'Invalid feature key' }, { status: 400 });
    }

    const { error } = await supabase
      .from('organization_features')
      .upsert({
        organization_id: organizationId,
        feature_key: featureKey,
        enabled,
        activated_at: enabled ? new Date().toISOString() : null,
        activated_by: enabled ? user.id : null,
      }, {
        onConflict: 'organization_id,feature_key',
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Toggle feature flag error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle feature flag' },
      { status: 500 }
    );
  }
}