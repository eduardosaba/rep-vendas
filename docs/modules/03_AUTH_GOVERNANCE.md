# Autenticação, Governança e Multi-Tenancy (03_AUTH_GOVERNANCE.md)

Este documento descreve o Bounded Context de **Autenticação, Governança, RLS Multi-Tenant, Permissões e Branding**.

---

## 1. Visão Geral do Domínio

Este módulo gerencia quem acessa a plataforma, a qual tenant (organização/empresa) pertence, quais permissões e feature flags possui ativas, e como a sua identidade visual (branding) é renderizada.

---

## 2. Componentes e Código Confirmados

### Gestão de Permissões e Roles
- **Hook de Permissões de Interface (`usePermissions`)**:
  - `Confirmado no código`: [src/hooks/usePermissions.ts](file:///f:/repvendas/rep-vendas/src/hooks/usePermissions.ts)
  - Roles mapeadas: `master`, `admin_company`, `rep`, `representative`, `template`.
  - Permissões dinâmicas: Busca na tabela `role_permissions` com fallback seguro para a constante `FALLBACK_PERMISSIONS`.
- **Resolução de Escopo Administrativo (`resolveUserScope`)**:
  - `Confirmado no código`: [src/lib/permissions.ts](file:///f:/repvendas/rep-vendas/src/lib/permissions.ts)
  - Distingue se o usuário possui visão `isCompanyScope` (enxerga toda a equipe) ou visão individual por `user_id`.

### Contexto de Aplicação Multi-Tenant
- **Resolução de Contexto de Catálogo (`resolveContext`)**:
  - `Confirmado no código`: [src/lib/resolve-context.ts](file:///f:/repvendas/rep-vendas/src/lib/resolve-context.ts)
  - Suporta rotas `/catalogo/[empresa]/[representante]` (Distribuidora) e `/catalogo/[representante]` (Individual).
- **Hub Central de Contexto (`getApplicationContext`)**:
  - `Confirmado no código`: [src/core/context/application-context.ts](file:///f:/repvendas/rep-vendas/src/core/context/application-context.ts)
- **Montador de Contexto (`ApplicationContextAssembler`)**:
  - `Confirmado no código`: [src/modules/catalog/ApplicationContextAssembler.ts](file:///f:/repvendas/rep-vendas/src/modules/catalog/ApplicationContextAssembler.ts)

### Feature Flags e Governança
- **Governança de Features de Organização (`FeatureGovernance`)**:
  - `Confirmado no código`: [src/domain/organizations/features.ts](file:///f:/repvendas/rep-vendas/src/domain/organizations/features.ts)
  - Enums de Feature: `PICKING`, `OPERATIONAL_ANALYTICS`, `AUTO_INVOICE`, `FISCAL_ENGINE`, `SHIPPING`, `TRACKING`.
- **Serviço de Configurações de Recursos (`FeatureService`)**:
  - `Confirmado no código`: [src/domain/settings/feature-service.ts](file:///f:/repvendas/rep-vendas/src/domain/settings/feature-service.ts)

### Branding Multi-Tenant
- **Resolvedor de Estilos e Logotipo (`getTenantBranding`)**:
  - `Confirmado no código`: [src/features/branding/branding-resolver.ts](file:///f:/repvendas/rep-vendas/src/features/branding/branding-resolver.ts)
  - Hierarquia de resolução: `company` → `organization` → `default`.

---

## 3. Fontes de Dados e Migrations

- **Políticas RLS do Perfil**: `profiles` (`20251127193000_profiles_rls_policies.sql`, `20251125083000_fix_profiles_policies.sql`)
- **Organizações B2B e Slugs**: `organizations` (`20260717_06_b2b_organization_slug.sql`)
- **Governança de Features**: `organization_features` (`20260721010000_feature_governance.sql`)
- **Flags de Operações**: `organization_settings` (`20260721020000_operational_feature_flags.sql`)
- **Políticas RLS para Distribuidora**: `20260717_01_distributor_rls_policies.sql`
- **Branding B2B**: `20260717_04_b2b_branding.sql`
- **Tabelas de Permissão por Role**: `role_permissions`
