import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

export default async function ShortLinkRedirect({ params }: Props) {
  const supabase = await createClient();
  const { slug } = params;

  const { data: linkData, error } = await supabase
    .from('short_links')
    .select('id, original_url, clicks_count')
    .eq('short_slug', slug)
    .maybeSingle();

  if (error || !linkData) return redirect('/');

  // Increment clicks_count (best-effort, don't block redirect)
  try {
    await supabase
      .from('short_links')
      .update({ clicks_count: (linkData.clicks_count || 0) + 1 })
      .eq('id', linkData.id);
  } catch (e) {
    console.error('Failed to increment short link clicks', e);
  }

  return redirect(linkData.original_url);
}
