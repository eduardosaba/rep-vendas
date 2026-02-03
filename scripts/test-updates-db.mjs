import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

(async () => {
  try {
    const version = `test-script-${Date.now()}`;
    const payload = {
      version,
      title: 'Teste automático de publicação',
      date: new Date().toISOString(),
      highlights: ['Teste 1', 'Teste 2'],
      color_from: '#111827',
      color_to: '#1f2937',
      force_show: true,
    };

    console.log('Upserting system_updates with payload:', payload);
    const { data: upsertData, error: upsertError } = await supabase
      .from('system_updates')
      .upsert(payload, { onConflict: 'version' })
      .select()
      .single();

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      process.exit(2);
    }

    console.log('Upsert result:', upsertData);

    // opcional: se passar user id como argumento, marcar visto
    const userId = process.argv[2];
    if (userId) {
      const { data: seenData, error: seenError } = await supabase
        .from('user_update_views')
        .upsert({ user_id: userId, version }, { onConflict: 'user_id,version' })
        .select()
        .single();

      if (seenError) {
        console.error('Erro ao upsert user_update_views:', seenError);
        process.exit(3);
      }

      console.log('user_update_views upsert result:', seenData);
    }

    console.log('OK');
    process.exit(0);
  } catch (err) {
    console.error('Exception', err);
    process.exit(10);
  }
})();
