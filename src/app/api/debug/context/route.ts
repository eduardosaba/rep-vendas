import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/resolve-context';
import { ApplicationContextAssembler } from '@/modules/catalog/ApplicationContextAssembler';
import { ApplicationContextService } from '@/modules/catalog/ApplicationContextService';
import { RepositoryFactory } from '@/infrastructure/supabase/RepositoryFactory';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const rep = searchParams.get('rep');
  
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
  }

  const supabase = await createClient();

  // 1. Test Legacy Resolver
  const legacyStart = performance.now();
  let legacyContext = null;
  try {
    legacyContext = await resolveContext([slug], supabase as any);
  } catch (e) {
    console.error(e);
  }
  const legacyEnd = performance.now();
  const legacyTime = Math.round(legacyEnd - legacyStart);

  // 2. Test Application Context (New Architecture)
  const appStart = performance.now();
  const orgRepo = RepositoryFactory.organization(supabase as any);
  const profileRepo = RepositoryFactory.profile(supabase as any);
  const brandingRepo = RepositoryFactory.branding(supabase as any);
  
  const assembler = new ApplicationContextAssembler(orgRepo, profileRepo, brandingRepo);
  const contextService = new ApplicationContextService(assembler);
  
  let appContext = null;
  try {
    appContext = await contextService.resolve(slug, rep || undefined);
  } catch (e) {
    console.error(e);
  }
  const appEnd = performance.now();
  const applicationTime = Math.round(appEnd - appStart);

  // Determine winner mode based on business logic (legacy always wins if it exists)
  let mode = 'not_found';
  let resolver = 'none';
  
  if (legacyContext?.type === 'individual') {
    mode = 'legacy';
    resolver = 'LegacyResolver';
  } else if (appContext?.organization) {
    mode = 'application';
    resolver = 'ApplicationContext';
  }

  const memoryUsage = process.memoryUsage();
  
  return NextResponse.json({
    mode,
    resolver,
    legacyTime,
    applicationTime,
    organization: appContext?.organization?.name || legacyContext?.company?.name || legacyContext?.settings?.name || null,
    features: appContext?.features || [],
    modules: appContext?.modules || [],
    permissions: appContext?.permissions || [],
    plan: appContext?.plan || null,
    tenant: appContext?.tenant || null,
    memory: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
    node: process.version
  });
}
