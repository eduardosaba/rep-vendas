# ADR-009: Integração da Distribuidora Existente na Arquitetura Multiempresa

- **Data**: 2026-07-29
- **Status**: Aceito

---

## Contexto

A auditoria da base de código revelou a existência de um módulo de Distribuidora funcional com fila de orçamentos B2B (`/dashboard/distribuidora`), componentes dedicados (`HeaderDistribuidora`, `FooterDistribuidora`), permissões (`admin_company`, `representative`) e branding customizado.

Desenvolver um novo portal B2B do zero descartando essa estrutura criaria duplicação de regras, potenciais conflitos de permissão e quebra de acessos para usuários atuais.

---

## Decisão

1. **Preservação e Refatoração**: A Distribuidora existente será preservada como base do ecossistema B2B e refatorada gradualmente para se integrar à fundação multiempresa (`organizations` / `companies`).
2. **Evolução em 5 Fases**:
   - **Fase 0**: Inventário e governança documental enxuta.
   - **Fase 1**: Fundação multiempresa sem quebra de rotas.
   - **Fase 2**: Configurações compartilhadas e branding desacoplado (`company_branding`).
   - **Fase 3**: Implementação do novo Módulo Ótica (B2C / Balcão).
   - **Fase 4**: Consolidação e evolução do Portal B2B da Distribuidora.
   - **Fase 5**: Recursos avançados B2B (recompra, limites de crédito, tabela por cliente).
3. **Isolamento por Feature Flags**: As funcionalidades exclusivas da Distribuidora B2B e da Ótica serão alternadas via `organization_features` e `organization_settings`.

---

## Consequências

- **Positivas**: Redução de tempo de desenvolvimento, compatibilidade contínua com usuários em produção, reaproveitamento da esteira comercial existente.
- **Negativas / Cuidados**: Exige refatoração cuidadosa dos pontos em que o código mistura branding visual com regras comerciais de comissão (`CustomizationTab.tsx`).
