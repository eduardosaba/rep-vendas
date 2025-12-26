'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function login(_: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  revalidatePath('/', 'layout');

  return {
    success: true,
    redirectTo: profile?.role === 'master' ? '/admin' : '/dashboard',
  };
}

export async function signup(...args: any[]) {
  const formData: FormData = args.length === 1 ? args[0] : args[1];
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) return { error: error.message };

  revalidatePath('/', 'layout');

  return { success: true };
}

export async function loginWithGoogle() {
  const supabase = createClient();
  const origin = (await headers()).get('origin');

  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  return { url: data?.url };
}

export async function logout() {
  const supabase = createClient();
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // ignore
  }
  revalidatePath('/', 'layout');
  return { success: true };
}
