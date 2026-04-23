# Multitenant Owner Audit (Individual x Distribuidora)

Data: 2026-04-15

## 1) Mapa de ownership atual (tabelas e padrao)

Padrao encontrado no projeto hoje:
- products: user_id + company_id
- orders: user_id + company_id
- customers: company_id
- brands/categories: user_id legado + profile_id/company_id em migracoes novas

Observacao importante:
- O projeto esta majoritariamente no modelo user_id + company_id para produtos.
- profile_id aparece em outras entidades, mas nao como owner primario em products.

Arquivos-chave:
- database_schema.sql (schema legado base user_id)
- SQL/2026-04-14_products_company_stock.sql
- SQL/2026-04-14_rls_products_orders.sql
- SQL/2026-04-15_brands_categories_company_rls_hardening.sql

## 2) Queries com risco de escopo ambiguo

### Critico: endpoint de importacao em lote sem escopo de owner na busca inicial
- src/app/api/import-products-chunk/route.ts:30-47

Risco:
- Busca por reference_id/reference_code sem filtro por owner.
- Pode cruzar produto de outro tenant com a mesma referencia.

### Critico: endpoint de produtos depende de userId vindo por query string
- src/app/api/products/route.ts:17
- src/app/api/products/route.ts:75
- src/app/api/products/route.ts:166

Risco:
- Modelo de acesso baseado em userId recebido na URL.
- Para contexto company, tende a ficar inconsistente e fragiliza isolamento se policy/cliente mudar.

### Medio: tela de novo pedido no dashboard fixa user_id
- src/app/dashboard/orders/new/page.tsx:22

Risco:
- Em conta vinculada a company, pode carregar conjunto errado (ou incompleto) de produtos.

### Medio: regra de estoque em query contraditoria
- src/lib/products.ts:28

Risco:
- Combina filter('manage_stock', true) com or incluindo manage_stock=false.
- Pode retornar comportamento inesperado dependendo da interpretacao do PostgREST.

## 3) Pacote SQL de hardening criado

Arquivo criado:
- SQL/2026-04-15_products_owner_hardening.sql

Conteudo do pacote:
- Check constraint para exigir owner em products (user_id ou company_id)
- Validacao segura (nao quebra se houver violacoes)
- Indices por owner + reference_code/sku
- Bloco de unicidade opcional para aplicar depois da limpeza de duplicados

## Recomendacoes de implementacao (ordem)

1. Aplicar SQL/2026-04-15_products_owner_hardening.sql em staging.
2. Corrigir src/app/api/import-products-chunk/route.ts para incluir ownerField/ownerId em TODA busca por existing.
3. Padronizar endpoint src/app/api/products/route.ts para resolver owner no servidor (sessao/perfil) e nao por query string.
4. Ajustar src/app/dashboard/orders/new/page.tsx para usar escopo company_id quando existir.
5. Revisar src/lib/products.ts para remover condicao contraditoria em estoque.
