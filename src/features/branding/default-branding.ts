import { TenantBranding } from './branding-types'

/**
 * Fallback de Tema Global (Native Theme do RepVendas)
 * Remete ao universo óptico: Tecnologia, Confiança e Saúde Visual
 */
export const DEFAULT_BRANDING: TenantBranding = {
  portal_name: 'RepVendas B2B',
  colors: {
    primary: '#154156',    // Azul petróleo
    secondary: '#FFFFFF',  // Fundo clínico/white
    accent: '#5DABBF',     // Azul clínico
    background: '#F8FAFC',
    text: '#0F172A',
    border: '#E2E8F0'
  },
  source: 'default'
}
