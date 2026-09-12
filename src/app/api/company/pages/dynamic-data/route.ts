import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCompanyPageContent } from '@/lib/company-page-content';
import { resolveCompanyPageDynamicData } from '@/lib/company-page-dynamic-data';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content: rawContent, companyId: rawCompanyId } = body || {};

    const supabase = await createClient();

    // Resolver usuário/empresa logado se companyId não for passado
    let companyId = String(rawCompanyId || '').trim();
    if (!companyId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .maybeSingle();

        companyId = profile?.company_id || '';
      }
    }

    if (!companyId) {
      return NextResponse.json({
        success: true,
        data: { products: {}, brands: {}, availableBrands: [], availableCategories: [] },
      });
    }

    const { content } = parseCompanyPageContent(rawContent);
    const dynamicData = await resolveCompanyPageDynamicData(content, companyId, supabase);

    return NextResponse.json({
      success: true,
      data: dynamicData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro ao resolver dados dinâmicos' },
      { status: 500 }
    );
  }
}
