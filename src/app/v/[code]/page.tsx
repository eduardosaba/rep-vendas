import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function RedirectPage({
  params,
}: {
  params: { code: string };
}) {
  const supabase = await createClient();
  const { code } = params;

  try {
    const { data, error } = await supabase
      .from('short_links')
      .select('id, destination_url, clicks_count')
      .eq('code', code)
      .limit(1)
      .single();

    if (error || !data) {
      return redirect('/');
    }

    // Log click + increment counter atomically via RPC
    try {
      await supabase.rpc('log_short_link_click', { p_short_link_id: data.id });
    } catch (e) {
      // non-fatal: proceed to redirect even if logging fails
    }

    // Redirect to destination
    return redirect(data.destination_url);
  } catch (err) {
    return redirect('/');
  }
}
