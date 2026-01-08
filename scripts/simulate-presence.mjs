import pkg from '@supabase/supabase-js';
const { createClient } = pkg;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const userId = process.argv[2];
const action = process.argv[3] || 'online';

if (!userId) {
  console.error('Usage: node simulate-presence.mjs <user_id> [online|offline]');
  process.exit(1);
}

(async () => {
  try {
    const isOnline = action === 'online';
    const payload = {
      user_id: userId,
      is_online: isOnline,
      last_seen: new Date().toISOString(),
      connection_id: `script-${Date.now()}`,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_status')
      .upsert(payload, { onConflict: 'user_id' });
    if (error) {
      console.error('Erro ao upsert user_status:', error);
      process.exit(1);
    }
    console.log('Upsert ok:', data);
    process.exit(0);
  } catch (err) {
    console.error('Erro inesperado:', err);
    process.exit(1);
  }
})();
