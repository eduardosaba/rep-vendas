// src/lib/env.ts

// Utilities to validate and warn about environment variables
let _devSkipActiveChecks = false;

// Detect common build/CI environments and provide an explicit opt-out variable.
const shouldSkipActiveChecksFromEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_SKIP_VALIDATION === '1' ||
    process.env.CI === 'true' ||
    process.env.CI === '1' ||
    process.env.NEXT_BUILD === '1' ||
    process.env.VERCEL === '1' ||
    process.env.GITHUB_ACTIONS === 'true'
);

if (shouldSkipActiveChecksFromEnv) {
  _devSkipActiveChecks = true;
}

export function checkSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!anon) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `⚠️ Variáveis de ambiente Supabase ausentes: ${missing.join(', ')}. Adicione-as em .env.local ou no ambiente de execução.`
    );
    return { url: url ?? null, anon: anon ?? null };
  }

  if (typeof url === 'string' && !/^https?:\/\//i.test(url)) {
    // eslint-disable-next-line no-console
    console.warn(
      `⚠️ NEXT_PUBLIC_SUPABASE_URL parece inválida: "${url}". Deve começar com http:// ou https://`
    );
  }

  if (typeof anon === 'string' && anon.length < 20) {
    // eslint-disable-next-line no-console
    console.warn(
      `⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY parece curta/inválida. Confirme a chave no painel do Supabase.`
    );
  }

  return { url, anon };
}

export function isDevSkipActiveChecks() {
  return _devSkipActiveChecks;
}

export function enableDevSkipActiveChecks() {
  _devSkipActiveChecks = true;
}

// Reachability check (Mantido apenas a definição para evitar quebras de importação, mas não é executado automaticamente)
export async function checkSupabaseReachability(timeoutMs = 3000) {
  const { url } = checkSupabaseEnv();
  if (!url || isDevSkipActiveChecks()) return;
  if (url.includes('YOUR_SUPABASE_URL') || url.includes('<seu-projeto>'))
    return;

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    let res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    if (res.status === 405) {
      res = await fetch(url, { method: 'GET', signal: controller.signal });
    }
    clearTimeout(id);
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️ Não foi possível contatar o Supabase em ${url} — status ${res.status}`
      );
    }
  } catch (err) {
    // Silently fail or log in debug
  }
}

// Checagem de autenticação: usa a chave anon para um request ao REST endpoint
export async function checkSupabaseAuth(timeoutMs = 3000) {
  const { url, anon } = checkSupabaseEnv();
  if (!url || !anon) return;
  if (isDevSkipActiveChecks()) return;

  if (
    url.includes('YOUR_SUPABASE_URL') ||
    url.includes('<seu-projeto>') ||
    anon.includes('YOUR_SUPABASE_ANON_KEY')
  )
    return;

  const base = String(url).replace(/\/$/, '');
  const authUrl = `${base}/rest/v1/`;

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(authUrl, {
      method: 'GET',
      headers: {
        apikey: String(anon),
        Authorization: `Bearer ${String(anon)}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(id);

    if (res.status === 401 || res.status === 403) {
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️ Erro de autenticação ao usar a chave anon com ${authUrl} — status ${res.status}.`
      );
      if (process.env.NODE_ENV === 'development') {
        enableDevSkipActiveChecks();
      }
      return;
    }

    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️ Requisição autenticada retornou HTTP ${res.status} ${res.statusText} ao ${authUrl}.`
      );
    }
  } catch (err: any) {
    if (err && err.name === 'AbortError') {
      // eslint-disable-next-line no-console
      console.warn(`⚠️ Timeout ao tentar autenticar contra ${authUrl}.`);
      if (process.env.NODE_ENV === 'development') enableDevSkipActiveChecks();
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️ Erro ao tentar validar chave anon: ${err?.message ?? String(err)}`
      );
      if (process.env.NODE_ENV === 'development') enableDevSkipActiveChecks();
    }
  }
}

// 🛑 Execução Condicional Limpa 🛑
if (typeof window === 'undefined') {
  // Lado do Servidor
  if (!isDevSkipActiveChecks()) {
    // Apenas verifica a autenticação (que confirma que a URL e Chave estão corretas)
    // A verificação de "Reachability" foi removida daqui para evitar erros 404 falsos.
    void checkSupabaseAuth();
  }
}
