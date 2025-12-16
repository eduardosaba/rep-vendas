// Deriva a URL do logo do projeto a partir da variável de ambiente em runtime.
// Isso evita hardcoding da URL no código e previne tentativas de acesso durante o build.
export const SYSTEM_LOGO_URL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/logos/logos/logo.png`
    : '/_next/static/media/default-logo.png';

// Cor primária do sistema usada como fallback quando a loja não define uma
export const SYSTEM_PRIMARY_COLOR = '#4f46e5'; // fallback padrão (indigo-600) usado quando --primary não está definido
