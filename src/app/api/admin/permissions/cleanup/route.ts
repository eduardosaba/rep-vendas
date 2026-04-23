import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

async function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin config missing');
  return createSupabaseAdmin(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get('x-admin-cleanup-token');
    if (!process.env.ADMIN_CLEANUP_TOKEN) {
      return NextResponse.json({ ok: false, error: 'ADMIN_CLEANUP_TOKEN not configured' }, { status: 500 });
    }
    if (!token || token !== process.env.ADMIN_CLEANUP_TOKEN) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const admin = await getAdmin();

    // fetch minimal columns needed
    const { data, error } = await admin.from('role_permissions').select('role, company_id, updated_at');
    if (error) {
      console.error('select error', error);
      return NextResponse.json({ ok: false, error: error.message || String(error) }, { status: 500 });
    }

    // group by role+company_id
    const groups = new Map<string, Array<any>>();
    for (const row of (data as any[]) || []) {
      const key = `${row.role}-${row.company_id ?? 'null'}`;
      const arr = groups.get(key) || [];
      arr.push(row);
      groups.set(key, arr);
    }

    const results: any = { inspected: groups.size, cleaned: [] };

    for (const [key, rows] of groups.entries()) {
      if (rows.length <= 1) continue;
      // find newest updated_at (fallback to epoch 0 if missing)
      let newest: string | null = null;
      for (const r of rows) {
        if (r.updated_at) {
          if (!newest || new Date(r.updated_at) > new Date(newest)) newest = r.updated_at;
        }
      }
      // If none have updated_at, keep the first and delete others by excluding one row via combination
      if (!newest) {
        // nothing to compare; skip (unlikely in your schema)
        continue;
      }

      // parse key back
      const [role, companyPart] = key.split('-');
      const company_id = companyPart === 'null' ? null : companyPart;

      // build delete query: delete rows with same role and company_id and updated_at < newest
      let delQuery: any = admin.from('role_permissions').delete();
      delQuery = delQuery.eq('role', role).lt('updated_at', newest);
      if (company_id === null) {
        delQuery = delQuery.is('company_id', null);
      } else {
        delQuery = delQuery.eq('company_id', company_id);
      }

      const { data: delData, error: delError } = await delQuery;
      if (delError) {
        console.error('delete error for', key, delError);
        results.cleaned.push({ key, ok: false, error: delError.message || String(delError) });
      } else {
        results.cleaned.push({ key, ok: true, deleted: Array.isArray(delData) ? delData.length : 0 });
      }
    }

    // Note: creating DDL (ALTER TABLE ... ADD CONSTRAINT) from server code may be unsafe; we recommend running the SQL in file /SQL/cleanup_role_permissions_duplicates.sql

    return NextResponse.json({ ok: true, results, note: 'Consider running the SQL file SQL/cleanup_role_permissions_duplicates.sql to add UNIQUE constraint.' });
  } catch (err: any) {
    console.error('cleanup error', err);
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
