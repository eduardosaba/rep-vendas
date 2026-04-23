Resumo das rotas do Catálogo — RepVendas

Objetivo: documentar o formato de links público para catálogos individuais, distribuidoras e representantes vinculados a distribuidoras.

- Catálogo individual (mantido):
  - Formato: /catalogo/{slug}
  - Exemplo: /catalogo/eduardo
  - Arquivo: [src/app/(catalogo)/catalogo/[slug]/page.tsx](src/app/(catalogo)/catalogo/[slug]/page.tsx)
  - Observação: usado quando existe um registro em `public_catalogs` com `catalog_slug = {slug}`.

- Catálogo da distribuidora (empresa):
  - Formato: /catalogo/{slug}
  - Exemplo: /catalogo/otica-saba
  - Arquivo: mesma rota pai do catálogo individual — o conteúdo decide se é empresa ou catálogo individual
  - Observação: a mesma URL raiz pode representar uma empresa se houver `companies.slug = {slug}`; lógica do servidor diferencia pela existência de `companies`/`public_catalogs`.

- Representante vinculado à distribuidora (nova estrutura aninhada):
  - Formato: /catalogo/{slug}/{repSlug}
  - Exemplo: /catalogo/otica-saba/eduardo
  - Arquivo: [src/app/(catalogo)/catalogo/[slug]/[repSlug]/page.tsx](src/app/(catalogo)/catalogo/[slug]/[repSlug]/page.tsx)
  - Observação: o primeiro segmento `{slug}` é o mesmo parâmetro do catálogo/empresa; se existir um segundo segmento, o Next.js desce para a subpasta e carrega o catálogo do representante vinculado àquela empresa.

- Checkout com representante (query params):
  - Exemplo gerado no código: `/catalogo/checkout?company={companyId}&venda={repSlug}&product={productId}`
  - Observação: o parâmetro `venda` identifica o representante (slug) que fez a indicação; `company` é o `company.id` usado para garantir vínculo correto.

Boas práticas / notas operacionais:
- Não renomear o parâmetro pai `[slug]` — tanto o catálogo individual quanto a distribuidora usam o mesmo nome para evitar conflito de rotas.
- Sempre resolver o representante (`repSlug`) verificando `profiles.company_id = company.id` para garantir que o rep pertence àquela distribuidora.
- Manter fallback para `public_catalogs` quando a tabela `companies` não existir ou não for aplicável.

Se quiser, eu posso:
- Atualizar todos os lugares do código que ainda usam o nome `companySlug` para `slug` (refatoração de strings/links).
- Adicionar testes de integração para rotas públicas e exemplos de URLs.

Arquivo criado automaticamente em: `docs/ROTAS_CATALOGO.md`
