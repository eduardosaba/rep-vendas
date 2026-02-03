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
    console.log(
      'Atualizando system_updates: set force_show = false onde for true...'
    );
    const { data, error } = await supabase
      .from('system_updates')
      .update({ force_show: false })
      .eq('force_show', true)
      .select();

    if (error) {
      console.error('Erro ao atualizar:', error);
      process.exit(2);
    }

    console.log('Registros atualizados:', data?.length ?? 0);
    console.log(data || 'Nenhum registro retornado');
    process.exit(0);
  } catch (err) {
    console.error('Exception:', err);
    process.exit(10);
  }
})();
