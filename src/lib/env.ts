// src/lib/env.ts

// Utilities to validate and warn about environment variables
let _devSkipActiveChecks = false;

// Detect common build/CI environments and provide an explicit opt-out variable.
// Quando verdadeiro, estas checagens ativas (requests HTTP) são suprimidas para
// evitar que o processo de build/prerender realize chamadas de rede que podem
// falhar ou poluir logs de CI. Use `NEXT_PUBLIC_SUPABASE_SKIP_VALIDATION=1`
// para desabilitar as validações ativas explicitamente.
const shouldSkipActiveChecksFromEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_SKIP_VALIDATION === '1' ||
    process.env.CI === 'true' ||
    process.env.CI === '1' ||
    process.env.NEXT_BUILD === '1' || // Detecta Next.js build
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

    // Basic sanity checks (formato)
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

// Reachability check: try a lightweight HEAD request to the Supabase host
export async function checkSupabaseReachability(timeoutMs = 3000) {
    const { url } = checkSupabaseEnv();
    if (!url) return;
    if (isDevSkipActiveChecks()) return; // Pula se estiver em ambiente de build/CI

    // If the URL contains the placeholder text, skip active check
    if (url.includes('YOUR_SUPABASE_URL') || url.includes('<seu-projeto>'))
        return;

    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);

        // Try HEAD first; some hosts may not respond to HEAD, fall back to GET if 405
        let res = await fetch(url, { method: 'HEAD', signal: controller.signal });

        if (res.status === 405) {
            // Method not allowed: try GET
            res = await fetch(url, { method: 'GET', signal: controller.signal });
        }

        clearTimeout(id);

        if (!res.ok) {
            // eslint-disable-next-line no-console
            console.warn(
                `⚠️ Não foi possível contatar o Supabase em ${url} — resposta HTTP ${res.status} ${res.statusText}`
            );
        }
        // otherwise OK — no log noisy success
    } catch (err: any) {
        // ... (resto do bloco catch é o mesmo, sem alteração)
        if (err && err.name === 'AbortError') {
            // eslint-disable-next-line no-console
            console.warn(
                `⚠️ Timeout ao tentar alcançar ${url} (esperou ${timeoutMs}ms). Verifique conexão de rede ou bloqueios de firewall.`
            );
            if (process.env.NODE_ENV === 'development') {
                enableDevSkipActiveChecks();
                // eslint-disable-next-line no-console
                console.warn(
                    '⚠️ Modo dev: desabilitando checagens ativas subsequentes para evitar spam de logs.'
                );
            }
        } else {
            // eslint-disable-next-line no-console
            console.warn(
                `⚠️ Erro de conexão ao tentar alcançar ${url}: ${err?.message ?? String(err)}`
            );
            if (process.env.NODE_ENV === 'development') {
                enableDevSkipActiveChecks();
                // eslint-disable-next-line no-console
                console.warn(
                    '⚠️ Modo dev: desabilitando checagens ativas subsequentes para evitar spam de logs.'
                );
            }
        }
    }
}

// Checagem de autenticação: usa a chave anon para um request ao REST endpoint
export async function checkSupabaseAuth(timeoutMs = 3000) {
    const { url, anon } = checkSupabaseEnv();
    if (!url || !anon) return;
    if (isDevSkipActiveChecks()) return; // Pula se estiver em ambiente de build/CI

    // Skip obvious placeholders
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

        // 401/403 -> auth problem
        if (res.status === 401 || res.status === 403) {
            // ... (resto do bloco try/catch é o mesmo, sem alteração)
            // eslint-disable-next-line no-console
            console.warn(
                `⚠️ Erro de autenticação ao usar a chave anon com ${authUrl} — status ${res.status}. Verifique se a chave anon está correta ou não foi revogada.`
            );
            if (process.env.NODE_ENV === 'development') {
                enableDevSkipActiveChecks();
                // eslint-disable-next-line no-console
                console.warn(
                    '⚠️ Modo dev: desabilitando checagens ativas subsequentes devido a falha de autenticação.'
                );
            }
            return;
        }

        // other non-ok statuses: report but treat as reachable
        if (!res.ok) {
            // eslint-disable-next-line no-console
            console.warn(
                `⚠️ Requisição autenticada retornou HTTP ${res.status} ${res.statusText} ao ${authUrl}.`
            );
        }

        // success or not-OK handled above; do not log on success to avoid noise
    } catch (err: any) {
        if (err && err.name === 'AbortError') {
            // eslint-disable-next-line no-console
            console.warn(
                `⚠️ Timeout ao tentar autenticar contra ${authUrl} (esperou ${timeoutMs}ms). Verifique rede/firewall.`
            );
            if (process.env.NODE_ENV === 'development') {
                enableDevSkipActiveChecks();
                // eslint-disable-next-line no-console
                console.warn(
                    '⚠️ Modo dev: desabilitando checagens ativas subsequentes para evitar spam de logs.'
                );
            }
        } else {
            // eslint-disable-next-line no-console
            console.warn(
                `⚠️ Erro ao tentar validar chave anon contra ${authUrl}: ${err?.message ?? String(err)}`
            );
            if (process.env.NODE_ENV === 'development') {
                enableDevSkipActiveChecks();
                // eslint-disable-next-line no-console
                console.warn(
                    '⚠️ Modo dev: desabilitando checagens ativas subsequentes para evitar spam de logs.'
                );
            }
        }
    }
}

// 🛑 Novo Bloco de Execução Condicional 🛑
// Garante que as checagens ativas só rodem em runtime e evita o 404 no build.

if (typeof window === 'undefined') {
    // Estamos no lado do servidor (Server Side), seja em runtime (funções) ou build.

    if (!isDevSkipActiveChecks()) {
        // Se isDevSkipActiveChecks() for falso, significa que não detectamos um
        // ambiente de build/CI (CI=true ou NEXT_BUILD=1, etc.).
        // Portanto, estamos em um ambiente de desenvolvimento local ou em produção/runtime
        // onde a checagem é útil.
        
        // Chamadas assíncronas para não bloquear o thread principal:
        checkSupabaseReachability();
        checkSupabaseAuth();
    }
}
// O código no cliente (browser) não executa este bloco, evitando que a checagem
// seja feita duas vezes no lado do cliente.