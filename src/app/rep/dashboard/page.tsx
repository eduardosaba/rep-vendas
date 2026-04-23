'use server';

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import RepDashboard from './RepDashboard.client';
import { getRepresentativeStats } from '../actions/stats';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return (
    <div className="p-6">Acesse para ver seu dashboard.</div>
  );

  const stats = await getRepresentativeStats(user.id);

  let announcements: Array<{
    id: string;
    title: string;
    content: string;
    published_at: string | null;
  }> = [];

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    const companyId = (profile as any)?.company_id;
    if (companyId) {
      const { data } = await supabase
        .from('company_announcements')
        .select('id,title,content,published_at,created_at')
        .eq('company_id', companyId)
        .eq('is_published', true)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(5);

      announcements = (data || []) as any;
    }
  } catch {
    announcements = [];
  }

  return <RepDashboard stats={stats} announcements={announcements} />;
}
