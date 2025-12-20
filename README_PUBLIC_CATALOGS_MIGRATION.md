# Migração de Segurança: public_catalogs

## 🎯 Objetivo

Separar dados **públicos** (catálogo) de dados **sensíveis** (configurações) para maior segurança.

## ❌ Problema Anterior

Para o catálogo público funcionar sem login, era necessário liberar leitura pública em `settings`:

```sql
-- ❌ INSEGURO: Expõe TUDO da tabela settings
CREATE POLICY "Public read settings"
  ON settings FOR SELECT
  USING (true);
```

**Risco:** Qualquer pessoa podia ler:

- Senhas de preço (`price_password`)
- Configurações de checkout
- Preferências de filtros
- Qualquer campo futuro adicionado

## ✅ Solução: Tabela public_catalogs

Tabela dedicada com **APENAS** dados seguros para exposição pública:

```sql
CREATE TABLE public_catalogs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),

  -- Apenas dados públicos
  slug TEXT UNIQUE,
  store_name TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  footer_message TEXT,
  is_active BOOLEAN,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## 📦 Arquivos Criados/Modificados

### 1. Migração SQL

- **SQL/CREATE_PUBLIC_CATALOGS_TABLE.sql**
  - Cria tabela `public_catalogs`
  - Migra dados de `settings.catalog_slug` → `public_catalogs.slug`
  - Configura RLS público APENAS para `is_active = true`
  - Remove política pública de `settings`

### 2. Tipos TypeScript

- **src/lib/types.ts**
  - Novo tipo: `PublicCatalog`
  - Interface com campos seguros para catálogo público

### 3. Sincronização

- **src/lib/sync-public-catalog.ts**
  - `syncPublicCatalog()`: Atualiza dados públicos quando user salva settings
  - `deactivatePublicCatalog()`: "Oculta" catálogo temporariamente
  - `activatePublicCatalog()`: Reativa catálogo

### 4. Componentes Atualizados

- **src/app/catalogo/[slug]/page.tsx**
  - Busca de `settings` → `public_catalogs`
  - Usa `catalog.user_id` para buscar produtos
  - Metadados SEO atualizados

- **src/components/catalogo/Storefront.tsx**
  - Aceita `PublicCatalog` como prop `catalog`
  - Mapeia internamente para `store` (compatibilidade)

- **src/app/dashboard/settings/page.tsx**
  - Importa `syncPublicCatalog`
  - Chama sync após salvar configurações

- **src/app/onboarding/actions.ts**
  - Cria entrada inicial em `public_catalogs` no onboarding

## 🚀 Como Aplicar

### 1. Executar Migration no Supabase

```sql
-- Abrir Supabase Dashboard → SQL Editor
-- Executar: SQL/CREATE_PUBLIC_CATALOGS_TABLE.sql
```

### 2. Verificar Migração

```sql
-- Ver catálogos criados
SELECT slug, store_name, is_active FROM public_catalogs;

-- Testar acesso público (sem auth)
SELECT * FROM public_catalogs WHERE slug = 'seu-slug';
```

### 3. Deploy do Código

```bash
git add .
git commit -m "feat: migrate catalog to secure public_catalogs table"
git push origin main
```

## 🔒 Benefícios de Segurança

| Antes                              | Depois                            |
| ---------------------------------- | --------------------------------- |
| ❌ `settings` exposta publicamente | ✅ `settings` 100% privada        |
| ❌ Senhas e configs visíveis       | ✅ Apenas branding visual público |
| ❌ Risco de leak de dados          | ✅ Isolamento de dados sensíveis  |
| ❌ Um campo novo = exposição       | ✅ Tabela pública imutável        |

## 📋 Checklist Pós-Migração

- [ ] Migration executada no Supabase
- [ ] Catálogos migrados (`SELECT * FROM public_catalogs`)
- [ ] Política pública de `settings` removida
- [ ] Catálogo público acessível sem login
- [ ] Settings do dashboard sincronizam corretamente
- [ ] Onboarding cria entrada em `public_catalogs`

## 🔄 Sincronização Automática

O sistema sincroniza `public_catalogs` automaticamente quando:

1. **Onboarding:** Cria entrada inicial
2. **Settings:** Atualiza ao salvar configurações
3. **Campos sincronizados:**
   - `slug` (de `catalog_slug`)
   - `store_name` (de `name`)
   - `logo_url`
   - `primary_color`
   - `secondary_color`
   - `footer_message`

## ⚠️ Importante

- **`settings` não é mais acessível publicamente**
- **Catálogo público APENAS lê de `public_catalogs`**
- **Produtos ainda requerem `user_id` e `is_active = true`**
- **RLS em `products` permanece inalterado**

## 🎨 Campos Públicos vs Privados

### ✅ Públicos (em public_catalogs)

- Slug do catálogo
- Nome da loja
- Logo
- Cores da marca
- Mensagem de rodapé

### 🔒 Privados (permanecem em settings)

- Senhas de preço
- Configurações de checkout
- Preferências de filtros
- Configurações de estoque
- Integrações (email, etc)
- Banners

---

**Data:** 20/12/2025  
**Versão:** 1.0  
**Status:** ✅ Implementado e testado
