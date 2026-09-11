import { createRouteSupabase } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { redirect } from 'next/navigation';
import { OrganizationFeaturesClient } from './OrganizationFeaturesClient';

async function getOrganizations() {
  const supabase = await createRouteSupabase();
  const user = await getServerUserFallback();

  if (!user || user.role !== 'master') {
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, organization_type, status, is_active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getFeatureFlags() {
  const supabase = await createRouteSupabase();
  const { data, error } = await supabase
    .from('organization_features')
    .select('organization_id, feature_key, enabled');

  if (error) throw error;
  return data || [];
}

export default async function OrganizationFeaturesPage() {
  const organizations = await getOrganizations();
  const featureFlags = await getFeatureFlags();

  return <OrganizationFeaturesClient initialOrganizations={organizations} initialFeatureFlags={featureFlags} />;
}