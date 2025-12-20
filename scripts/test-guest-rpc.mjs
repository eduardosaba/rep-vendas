import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const VERBOSE = process.env.VERBOSE_RPC === '1' || process.env.DEBUG;
const vlog = (...args) => VERBOSE && console.log('[VERBOSE]', ...args);

vlog(
  'ENV NEXT_PUBLIC_SUPABASE_URL=',
  process.env.NEXT_PUBLIC_SUPABASE_URL
    ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/:\/\/[^:]+:/, '://***:***:')
    : undefined
);
vlog(
  'ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***' : undefined
);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error(
    'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local'
  );
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

async function run() {
  const guestId = crypto.randomUUID();
  const shortId = 'TST' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const items = [
    { product_id: '00000000-0000-0000-0000-000000000000', quantity: 2 },
  ];

  console.log('guestId:', guestId);
  console.log('shortId:', shortId);
  const tryRpc = async (candidates, params) => {
    for (const name of candidates) {
      try {
        console.log(`Tentando RPC: ${name}`);
        vlog('RPC params:', params);
        const start = Date.now();
        const { data, error } = await supabase.rpc(name, params);
        const duration = Date.now() - start;
        vlog(`RPC ${name} duration: ${duration}ms`);
        if (error) {
          console.log(
            `RPC ${name} retornou erro:`,
            error.code || error.message || error
          );
          vlog('RPC full error object:', error);
          continue;
        }
        vlog('RPC response data:', data);
        return { name, data };
      } catch (err) {
        console.log(
          `RPC ${name} falhou:`,
          err && err.message ? err.message : err
        );
        vlog('RPC caught error object:', err && (err.stack || err));
      }
    }
    return null;
  };

  const insertCandidates = [
    'api.insert_saved_cart_for_guest',
    'insert_saved_cart_for_guest',
    'public.insert_saved_cart_for_guest',
  ];

  console.log('Tentando inserir saved_cart (vários nomes)...');
  const insertResult = await tryRpc(insertCandidates, {
    p_guest_id: guestId,
    p_short_id: shortId,
    p_items: items,
  });

  if (!insertResult) {
    console.error('Nenhum RPC de insert funcionou.');
    process.exit(2);
  }

  console.log('Insert RPC ok com nome:', insertResult.name);
  console.log('Insert RPC result:', insertResult.data);

  const getCandidates = [
    'api.get_saved_cart_for_guest',
    'get_saved_cart_for_guest',
    'public.get_saved_cart_for_guest',
  ];

  console.log('Tentando recuperar saved_cart (vários nomes)...');
  const getResult = await tryRpc(getCandidates, {
    p_short_id: shortId,
    p_guest_id: guestId,
  });

  if (!getResult) {
    console.error('Nenhum RPC de get funcionou.');
    process.exit(3);
  }

  console.log('Get RPC ok com nome:', getResult.name);
  console.log('Get RPC result:', getResult.data);
  console.log('Teste concluído com sucesso.');
}

run().catch((err) => {
  console.error(err);
  process.exit(99);
});
