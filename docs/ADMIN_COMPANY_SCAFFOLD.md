# Scaffold Admin Company

## Rotas criadas

- `GET /dashboard/admin`
- `GET /dashboard/admin/equipe`
- `GET /dashboard/admin/configuracoes`

## Componentes criados

- `src/components/admin/company/SidebarPro.tsx`
- `src/components/admin/config/CustomizationTab.tsx`
- `src/components/admin/config/PageManager.tsx`
- `src/components/admin/equipe/ModalNovoRepresentante.tsx`

## APIs adicionadas/ajustadas

- `src/app/api/company/page-sections/route.ts` (CRUD do gerenciador de páginas)
- `src/app/api/company/team/route.ts` (inclui `slug` no retorno)
- `src/app/actions/admin-actions.ts` (`getAdminContext`)

## SQL necessário

Aplicar estas migrations no banco:

1. `SQL/2026-04-16_add_companies_about_and_shipping.sql`
2. `SQL/2026-04-16_add_companies_ui_columns.sql`
3. `SQL/2026-04-16_create_company_page_sections.sql`

## Validação

1. Login com usuário `admin_company`
2. Acessar `/dashboard/admin`
3. Em `/dashboard/admin/configuracoes`, salvar branding e criar/remover seções
4. Em `/dashboard/admin/equipe`, validar listagem e botão "Ver como Representante"

## Observação atual

O modal `ModalNovoRepresentante` está scaffoldado e pronto para UX, mas a persistência de criação do representante ainda está pendente de integração final com endpoint dedicado (próximo passo).
