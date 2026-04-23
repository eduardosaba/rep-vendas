import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import createClient from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!adminKey || !supabaseUrl) return new Response(JSON.stringify({ error: 'service role not configured' }), { status: 500 });

    const admin = createSupabaseAdmin(String(supabaseUrl), String(adminKey), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const form = await req.formData();
    const file = form.get('file') as any;
    if (!file) return new Response(JSON.stringify({ error: 'no file' }), { status: 400 });

    // build filename
    const filename = form.get('filename') ? String(form.get('filename')) : `catalog-${Date.now()}`;
    const ext = (file?.name || '').split('.').pop() || 'pdf';
    const filePath = `catalogs/${filename}.${ext}`;

    // Upload using admin client
    // @ts-ignore
    const { error: uploadError } = await admin.storage.from('catalogs').upload(filePath, file, { upsert: true });
    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message || String(uploadError) }), { status: 500 });
    }

    const { data } = admin.storage.from('catalogs').getPublicUrl(filePath);
    const publicUrl = data?.publicUrl || null;

    // If companyId provided, verify current user is admin of that company before updating
    const companyId = form.get('companyId') ? String(form.get('companyId')) : null;
    if (companyId) {
      try {
        // server-side client to read auth cookie
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = (user as any)?.id || null;
        if (!userId) {
          return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 });
        }

        // check profile
        // @ts-ignore
        const { data: profile } = await admin.from('profiles').select('id,company_id,role').eq('id', userId).maybeSingle();
        const isAdmin = profile && (profile.role === 'admin_company' || profile.role === 'master') && String(profile.company_id) === String(companyId);

        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
        }

        // @ts-ignore
        const { error: updError } = await admin.from('companies').update({ catalog_pdf_url: publicUrl }).eq('id', companyId);
        if (updError) {
          // log and continue
          // eslint-disable-next-line no-console
          console.warn('Could not update company catalog_pdf_url', updError.message || updError);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Error updating company record', e);
      }
    }

    return new Response(JSON.stringify({ publicUrl }), { status: 200 });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('catalog upload error', e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500 });
  }
}
