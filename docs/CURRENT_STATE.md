# Estado Atual do RepVendas (CURRENT_STATE.md)

**Última Revisão:** 2026-07-29  
**Status do Documento:** Índice Verificável do Estado Atual (Não reproduz esquemas completos de banco)

> [!NOTE]
> As fontes da verdade executáveis do banco e das regras são:
> - `supabase/migrations/`
> - `src/types/database.types.ts`
> - `src/domain/` e os componentes/serviços ativos sob `src/`

---

## 1. Mapeamento da Distribuidora (Inventário da Fase 0)

A aplicação já possui uma implementação funcional para o modelo de Distribuidora B2B. Os componentes e fluxos auditados são:

### Rotas e Páginas
- **Fila de Orçamentos B2B (`/dashboard/distribuidora`)**: 
  - Status: `Confirmado no código`
  - Arquivo: [src/app/dashboard/distribuidora/page.tsx](file:///f:/repvendas/rep-vendas/src/app/dashboard/distribuidora/page.tsx)
  - Funcionalidade: Exibe fila de orçamentos B2B filtrados por representante (`seller_id`) e empresa (`company_id`), separando abas "Pendentes" (aguardando revisão) e "Aprovados". Permite iniciar contato direto via WhatsApp.

### Layout e Shell do Portal Distribuidor
- **Navegação Lateral (`DistributorSidebar`)**:
  - Status: `Confirmado no código`
  - Arquivo: [src/features/dashboard/components/DistributorSidebar.tsx](file:///f:/repvendas/rep-vendas/src/features/dashboard/components/DistributorSidebar.tsx)
  - Links: Torre de Controle, Catálogo Óptico, Controle de Estoque, Fila de Pedidos B2B, Esteira de Expedição, Fluxo Financeiro, Time Comercial, Configurações e Personalização.
- **Shell do Portal (`DistributorShell`)**:
  - Status: `Confirmado no código`
  - Arquivo: [src/features/dashboard/components/DistributorShell.tsx](file:///f:/repvendas/rep-vendas/src/features/dashboard/components/DistributorShell.tsx)

### Catálogo Público da Distribuidora
- **Cabeçalho Público (`HeaderDistribuidora`)**:
  - Status: `Confirmado no código`
  - Arquivo: [src/components/catalogo/HeaderDistribuidora.tsx](file:///f:/repvendas/rep-vendas/src/components/catalogo/HeaderDistribuidora.tsx)
  - Funcionalidade: Renderiza logo, cores customizadas, redes sociais, avisos institucionais e suporte aos preços liberados por senha/login.
- **Rodapé Público (`FooterDistribuidora`)**:
  - Status: `Confirmado no código`
  - Arquivo: [src/components/catalogo/FooterDistribuidora.tsx](file:///f:/repvendas/rep-vendas/src/components/catalogo/FooterDistribuidora.tsx)
- **Layout de Catálogo Enriquecido (`CatalogRichLayout`)**:
  - Status: `Confirmado no código`
  - Arquivo: [src/components/catalogo/CatalogRichLayout.tsx](file:///f:/repvendas/rep-vendas/src/components/catalogo/CatalogRichLayout.tsx)

### Configurações e Branding
- **Aba de Personalização (`CustomizationTab`)**:
  - Status: `Confirmado no código`
  - Arquivo: [src/components/admin/config/CustomizationTab.tsx](file:///f:/repvendas/rep-vendas/src/components/admin/config/CustomizationTab.tsx)
  - Conteúdo Atual: Mistura branding (logo, cores primária/secundária, nome), páginas institucionais (sobre, frete), gatilho de comissão e taxa padrão de comissão.
- **Resolução de Branding (`TenantBranding`)**:
  - Status: `Confirmado no código`
  - Arquivos: 
    - [src/features/branding/branding-types.ts](file:///f:/repvendas/rep-vendas/src/features/branding/branding-types.ts)
    - [src/features/branding/branding-resolver.ts](file:///f:/repvendas/rep-vendas/src/features/branding/branding-resolver.ts)

### Permissões e Contexto B2B
- **Permissões por Role (`usePermissions`)**:
  - Status: `Confirmado no código`
  - Arquivo: [src/hooks/usePermissions.ts](file:///f:/repvendas/rep-vendas/src/hooks/usePermissions.ts)
  - Roles mapeadas: `master`, `admin_company`, `rep`, `representative`, `template`.
- **Resolução de Escopo (`resolveUserScope`)**:
  - Status: `Confirmado no código`
  - Arquivo: [src/lib/permissions.ts](file:///f:/repvendas/rep-vendas/src/lib/permissions.ts)
- **Resolução de Contexto de Catálogo (`resolveContext`)**:
  - Status: `Confirmado no código`
  - Arquivo: [src/lib/resolve-context.ts](file:///f:/repvendas/rep-vendas/src/lib/resolve-context.ts)
  - Distingue o catálogo `distributor` do `individual`.
- **Hub de Contexto da Aplicação (`getApplicationContext`)**:
  - Status: `Confirmado no código`
  - Arquivo: [src/core/context/application-context.ts](file:///f:/repvendas/rep-vendas/src/core/context/application-context.ts)
- **Montador de Contexto de Aplicação (`ApplicationContextAssembler`)**:
  - Status: `Confirmado no código`
  - Arquivo: [src/modules/catalog/ApplicationContextAssembler.ts](file:///f:/repvendas/rep-vendas/src/modules/catalog/ApplicationContextAssembler.ts)
- **Governança de Features (`FeatureGovernance`)**:
  - Status: `Confirmado no código`
  - Arquivo: [src/domain/organizations/features.ts](file:///f:/repvendas/rep-vendas/src/domain/organizations/features.ts)
- **Serviço de Configurações de Organização (`FeatureService`)**:
  - Status: `Confirmado no código`
  - Arquivo: [src/domain/settings/feature-service.ts](file:///f:/repvendas/rep-vendas/src/domain/settings/feature-service.ts)

---

## 2. Fontes de Dados e Migrations Confirmadas

As tabelas do banco de dados relacionadas ao módulo B2B e multiempresa estão declaradas e gerenciadas nas migrations do Supabase:

### Tabelas Principais (Nomes Confirmados em Migrations)
- `organizations` e `organization_members`: `Confirmado em migration` (`20260717_06_b2b_organization_slug.sql`)
- `organization_features` e `organization_settings`: `Confirmado em migration` (`20260721010000_feature_governance.sql`, `20260721020000_operational_feature_flags.sql`)
- `companies` e `company_pages`: `Confirmado em migration` (`20260418110000_create_company_pages.sql`)
- `profiles`: `Confirmado em migration` (`20251127193000_profiles_rls_policies.sql`)
- `orders` e `order_items`: `Confirmado em migration` (`20251127094500_add_orders_display_and_guest_fields.sql`, `20260718193000_create_draft_orders.sql`)
- `products`: `Confirmado em migration` (`20260729100000_add_tipo_montagem_to_products.sql`)
- `role_permissions`: `Confirmado em migration` e `Confirmado no código` ([src/hooks/usePermissions.ts](file:///f:/repvendas/rep-vendas/src/hooks/usePermissions.ts))
- `public_catalogs`: `Confirmado em migration` (`001_sync_settings_to_public_catalogs.sql`)

---

## 3. Divergências e Pendências Arquiteturais (Ações Futuras)

1. **Separação de Branding e Comissão**:
   - `CustomizationTab.tsx` atualmente junta identidade visual com regras de comissão. Na evolução multiempresa, as regras comerciais e de comissão devem ser movidas para configurações comerciais específicas da Distribuidora.
2. **Autorização por Membership**:
   - `usePermissions.ts` ainda utiliza primariamente checagem baseada na role global do perfil. Na evolução (Fase 1 e 2), a autorização considerará o vínculo explícito da membership (`companyId` e `organizationId`).
3. **Consolidação de Tabela de Empresas**:
   - Atualmente convivem a tabela `organizations` e a tabela `companies`. A fundação multiempresa unificará/compatibilizará as referências sem perda de acessos.
