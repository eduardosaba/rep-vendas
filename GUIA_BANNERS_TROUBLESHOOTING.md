# 🎯 Guia de Resolução: Carrossel de Banners não Aparece

## 📋 Diagnóstico do Problema

O carrossel de banners pode não aparecer por 3 motivos principais:

1. **Colunas não existem no banco** (migrations não aplicadas)
2. **Dados não estão salvos** (banners não configurados no dashboard)
3. **Sincronização falhou** (settings ≠ public_catalogs)

---

## 🔍 Passo 1: Diagnóstico

### Execute o script de verificação:

```bash
# Abra Supabase SQL Editor e execute:
a:\RepVendas\SQL\check_banners_config.sql
```

**O que verificar:**

- ✅ Query 1 e 2: Devem retornar as colunas `banners` e `banners_mobile` (tipo `ARRAY`)
- ✅ Query 3: Deve mostrar arrays com URLs (ex: `{https://...}`)
- ✅ Query 4: Deve mostrar mesmos dados da query 3
- ✅ Query 5: Status deve estar `✅ OK` (não `⚠️ DESCINCRONIZADO`)

### Se Query 1 ou 2 retornar vazio:

**➡️ Vá para Passo 2A**

### Se Query 3 retornar NULL ou array vazio:

**➡️ Vá para Passo 2B**

### Se Query 5 mostrar descincronizado:

**➡️ Vá para Passo 2C**

---

## 🔧 Passo 2A: Criar Colunas + Sincronizar

Execute o script de correção completo:

```bash
# Supabase SQL Editor (como service_role):
a:\RepVendas\SQL\fix_banners_complete.sql
```

Este script:

- Cria as colunas se não existirem
- Sincroniza dados de `settings` → `public_catalogs`
- Inicializa arrays vazios
- Mostra relatório final

**Resultado esperado:** Última query deve mostrar status dos catálogos.

---

## 🔧 Passo 2B: Configurar Banners no Dashboard

1. Acesse: **Dashboard > Settings** (http://localhost:3001/dashboard/settings)

2. Role até a seção **"Banners do Carrossel"**

3. **Adicionar Banners Desktop:**
   - Clique em "Adicionar Banner Desktop"
   - Faça upload de imagem (ideal: 1920x480px ou proporção 4:1)
   - Adicione quantos banners quiser

4. **Adicionar Banners Mobile (opcional):**
   - Clique em "Adicionar Banner Mobile"
   - Faça upload de imagem otimizada para mobile (ideal: 800x600px ou proporção 4:3)

5. **Salvar:**
   - Clique em "💾 Salvar Configurações" no final da página
   - Aguarde mensagem de sucesso
   - **IMPORTANTE:** Verifique o console do terminal (onde o dev server está rodando)
   - Deve aparecer logs como:
     ```
     [settings/save] Chamando syncPublicCatalog com: { slug: '...', banners: [...], ... }
     [syncPublicCatalog] UPDATE - Banners a sincronizar: { ... }
     [settings/save] syncPublicCatalog concluído com sucesso
     ```

6. **Se não ver os logs ou houver erro:**
   - Execute manualmente: `a:\RepVendas\SQL\force_sync_banners.sql` (substitua 'seu-slug')
   - Isso força a sincronização de settings → public_catalogs

7. **Verificar:**
   - Vá para seu catálogo: `http://localhost:3001/catalogo/seu-slug`
   - Os banners devem aparecer abaixo do header

---

## 🔧 Passo 2C: Forçar Sincronização

Se os dados estão em `settings` mas não em `public_catalogs`:

**Opção 1: Script SQL Específico (RECOMENDADO)**
```bash
# Execute no Supabase SQL Editor:
# Abra: a:\RepVendas\SQL\force_sync_banners.sql
# Substitua 'seu-slug' pelo slug real
# Execute passo a passo para ver o progresso
```

**Opção 2: UPDATE Direto**
```sql
-- Execute no Supabase SQL Editor:
UPDATE public.public_catalogs pc
SET 
  banners = s.banners,
  banners_mobile = s.banners_mobile,
  updated_at = now()
FROM public.settings s
WHERE pc.user_id = s.user_id
  AND s.catalog_slug IS NOT NULL;
```

**Opção 3: Re-salvar no Dashboard**
- Vá em Dashboard > Settings
- Clique em "💾 Salvar Configurações" (mesmo sem alterar nada)
- Verifique os logs no terminal do dev server
- Deve mostrar: `[syncPublicCatalog] UPDATE - Banners a sincronizar: { ... }`

### 3.1 Verificar no Banco:

```sql
SELECT
  slug,
  store_name,
  banners[1] as primeiro_banner,
  array_length(banners, 1) as qtd_banners
FROM public.public_catalogs
WHERE slug = 'seu-slug'; -- substitua pelo seu slug
```

Deve retornar: `qtd_banners > 0` e `primeiro_banner` com URL.

### 3.2 Verificar no Navegador:

1. Abra o catálogo: `http://localhost:3001/catalogo/seu-slug`
2. Deve aparecer um carrossel de banners entre o header e os produtos
3. No mobile (F12 > device toolbar): Deve usar `banners_mobile` se configurado

---

## 🐛 Troubleshooting

### Banners aparecem mas quebrados (404 nas imagens):

**Problema:** URLs inválidas ou storage sem permissão.

**Solução:**

```sql
-- Ver URLs atuais:
SELECT banners FROM public.public_catalogs WHERE slug = 'seu-slug';

-- Se URLs estiverem como storage/v1/object/public/product-images/...
-- Rode o script de normalização:
UPDATE public.settings
SET banners = ARRAY(
  SELECT REPLACE(b, 'product-images/public/', 'product-images/')
  FROM unnest(banners) b
)
WHERE banners IS NOT NULL
  AND EXISTS(SELECT 1 FROM unnest(banners) b WHERE b LIKE '%product-images/public%');
```

### Banners não atualizam após salvar:

**Problema:** Cache do navegador.

**Solução:**

- Ctrl + Shift + R (hard refresh)
- Ou abra em aba anônima

### Erro "banners is not a column":

**Problema:** Migration não foi aplicada.

**Solução:** Execute `fix_banners_complete.sql` primeiro.

---

## 📝 Checklist Final

- [ ] Colunas `banners` e `banners_mobile` existem em `settings`
- [ ] Colunas `banners` e `banners_mobile` existem em `public_catalogs`
- [ ] Dados em `settings.banners` não estão NULL/vazio
- [ ] Dados em `public_catalogs.banners` não estão NULL/vazio
- [ ] URLs dos banners estão normalizadas (sem `product-images/public/`)
- [ ] Carrossel aparece no catálogo público (abaixo do header)
- [ ] No mobile, usa `banners_mobile` se disponível

---

## 🎯 Código Atualizado

Foi atualizado:

- ✅ `src/components/product-components.tsx` - StoreBanners agora detecta mobile e escolhe banners apropriados

Se ainda não funcionar após todos os passos, execute:

```bash
pnpm run build
```

E verifique os logs do navegador (F12 > Console) para erros.
