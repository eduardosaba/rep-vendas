/**
 * CONFIGURAÇÃO DE ATUALIZAÇÕES DO SISTEMA
 *
 * Este arquivo centraliza as informações sobre atualizações que serão exibidas
 * no popup de notificação quando o usuário fizer login no dashboard.
 *
 * INSTRUÇÕES:
 * 1. Sempre que lançar uma nova versão, atualize:
 *    - package.json (campo "version")
 *    - .env.local (NEXT_PUBLIC_APP_VERSION)
 *    - Este arquivo (LATEST_UPDATE)
 *
 * 2. O popup aparecerá APENAS UMA VEZ para cada versão por usuário
 *    (controlado via localStorage)
 *
 * 3. Adicione quantos highlights quiser, mas mantenha entre 3-5 itens
 */

export interface UpdateNotification {
  version: string;
  title: string;
  date: string;
  highlights: string[];
}

/**
 * EDITE AQUI: Informações da última atualização
 * Esta será a notificação exibida no popup
 */
export const LATEST_UPDATE: UpdateNotification = {
  version: '1.0.0',
  title: '🎉 Bem-vindo ao RepVendas 1.0!',
  date: '2024-12-19',
  highlights: [
    '🎨 Sistema de temas personalizáveis',
    '📄 Geração de PDF otimizada',
    '🚀 Interface administrativa completa',
  ],
};

/**
 * HISTÓRICO DE ATUALIZAÇÕES
 * Mantenha este array atualizado para referência futura
 */
export const UPDATE_HISTORY: UpdateNotification[] = [
  LATEST_UPDATE,
  // Próximas versões serão adicionadas acima
];

/**
 * CHAVE DO LOCALSTORAGE
 * Não altere este valor ou todos os usuários verão o popup novamente
 */
export const LAST_SEEN_VERSION_KEY = 'repvendas_last_seen_version';

// Chave para armazenar o ID da atualização vista pelo usuário
export const LAST_SEEN_UPDATE_ID_KEY = 'repvendas_last_seen_update_id';
