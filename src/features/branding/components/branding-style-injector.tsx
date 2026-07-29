import React from 'react'
import { TenantBranding } from '../branding-types'

interface Props {
  branding: TenantBranding
}

/**
 * Injeta os Design Tokens do Tenant globalmente.
 * Executado no Server-Side para evitar FOUC (Flash of Unstyled Content).
 */
export function BrandingStyleInjector({ branding }: Props) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          :root {
            --brand-primary: ${branding.colors.primary};
            --brand-secondary: ${branding.colors.secondary};
            --brand-accent: ${branding.colors.accent};
            --brand-background: ${branding.colors.background};
            --brand-text: ${branding.colors.text};
            --brand-border: ${branding.colors.border};
          }
        `
      }}
    />
  )
}
