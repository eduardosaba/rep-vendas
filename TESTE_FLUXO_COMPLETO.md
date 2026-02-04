# 🧪 Teste do Fluxo Completo - RepVendas

**Data:** 3 de fevereiro de 2026  
**Objetivo:** Validar todo o pipeline de importação e otimização de imagens

---

## 📋 Checklist de Funcionalidades Implementadas

### ✅ 1. Importação Excel (Import-Massa)

- [x] Split de URLs por `;` ou `,`
- [x] Processamento de URLs concatenadas (Safilo P00;P01;P02)
- [x] Filtragem de fotos técnicas (P13, P14)
- [x] Priorização P00 como capa
- [x] População correta de `products.images` com ALL URLs
- [x] Marcação `sync_status = 'pending'`

### ✅ 2. Importação Visual

- [x] Limite de 5MB por arquivo
- [x] Compressão automática client-side (WebP 75%)
- [x] Redimensionamento para 1600px
- [x] Fallback para JPEG se WebP falhar
- [x] Validação de tipos de arquivo
- [x] Feedback visual com logs em tempo real

### ✅ 3. Script de Sincronização (`local-sync-full.mjs`)

- [x] Processamento de URLs concatenadas
- [x] Download de imagens externas
- [x] Otimização com Sharp (3 variantes: 320w, 640w, 1000w)
- [x] Upload para Supabase Storage
- [x] Atualização de `products.images` para formato objeto `{url, path}`
- [x] Isolamento multi-tenant (user_id)

### ✅ 4. Torre de Controle (Interface Web)

- [x] Painel de estatísticas (pendentes, sincronizados, erros)
- [x] Botão "Sincronizar Agora"
- [x] Streaming de logs em tempo real (SSE)
- [x] Controle de throttling (chunks, concorrência)
- [x] Restrição de acesso (apenas admin)

### ✅ 5. Frontend (Exibição)

- [x] `getProductImageUrl()` prioriza storage path
- [x] Fallback para URLs externas
- [x] Proxy `/api/storage-image` para imagens do storage
- [x] ProductCard usa `normalizeImageInput` (OK)
- [x] ProductsTable usa `getProductImageUrl` (corrigido)

### ✅ 6. Marketing Page

- [x] Upload de banner com SmartImageUpload
- [x] Limite de 5MB
- [x] Drag & drop funcional
- [x] Preview em tempo real
- [x] Cache-busting para WhatsApp (`?v=${timestamp}`)
- [x] Sincronização com `public_catalogs`
- [x] Layout responsivo mobile

---

## 🧪 Plano de Teste

### **TESTE 1: Importação Excel com URLs Concatenadas**

#### Preparação:

1. Acesse `/dashboard/products/import-massa`
2. Prepare arquivo Excel com coluna "Imagem" contendo:
   ```
   https://commportal-images.safilo.com/11/17/00/1117000SZJ00_P00.JPG;https://commportal-images.safilo.com/11/17/00/1117000SZJ00_P01.JPG;https://commportal-images.safilo.com/11/17/00/1117000SZJ00_P02.JPG
   ```

#### Passos:

1. Faça upload do Excel
2. Aguarde processamento
3. Verifique mensagem de sucesso

#### Validações:

```sql
-- 1. Verificar se produtos.images contém TODAS as URLs
SELECT id, name, reference_code, images, sync_status
FROM products
WHERE reference_code = 'TH2345SZJ' -- substituir pelo código do produto
LIMIT 1;

-- Resultado esperado:
-- images: ["https://.../P00.JPG", "https://.../P01.JPG", "https://.../P02.JPG"]
-- sync_status: "pending"
```

```sql
-- 2. Verificar se product_images foi criado
SELECT id, url, is_primary, sync_status, position
FROM product_images
WHERE product_id = 'abc123' -- substituir pelo ID do produto
ORDER BY position;

-- Resultado esperado: 3 linhas (uma por URL)
```

---

### **TESTE 2: Sincronização via Terminal**

#### Preparação:

```powershell
# Definir variáveis de ambiente
$env:SUPABASE_URL = 'https://aawghxjbipcqefmikwby.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = 'sua-service-role-key-aqui'
```

#### Executar:

```powershell
node scripts/local-sync-full.mjs
```

#### Validações:

1. **Console logs esperados:**

   ```
   ========================================
   🚀 SYNC COMPLETO DE IMAGENS EXTERNAS
   ========================================
   📊 Produtos pendentes encontrados: X
   ⏳ Processando produto 1/X: Nome do Produto
   📥 Baixando imagem (1/3): https://.../P00.JPG
   ✅ Capa otimizada: 5MB → 800KB (84% economia)
   📸 Processando galeria (2 imagens)...
   ✅ Imagem 1/2 otimizada
   ✅ Produto sincronizado com sucesso
   ```

2. **Banco de dados após sync:**

   ```sql
   -- Verificar transformação de products.images
   SELECT images FROM products WHERE id = 'abc123';

   -- ANTES: ["https://.../P00.JPG", "https://.../P01.JPG"]
   -- DEPOIS: [
   --   {"url": "https://storage.../P00-1000w.webp", "path": "public/.../P00-1000w.webp"},
   --   {"url": "https://storage.../P01-1000w.webp", "path": "public/.../P01-1000w.webp"}
   -- ]
   ```

3. **Storage do Supabase:**
   - Acesse: Storage > product-images > public > brands > {brand-slug} > products > {product-id}
   - Deve conter:
     - `main-320w.webp`
     - `main-640w.webp`
     - `main-1000w.webp`
     - `gallery/{img-id}-320w.webp`
     - `gallery/{img-id}-640w.webp`
     - `gallery/{img-id}-1000w.webp`

---

### **TESTE 3: Torre de Controle (Interface Web)**

#### Acesso:

1. `/dashboard/settings` → Aba "Sincronização"

#### Validações:

1. **Estatísticas corretas:**
   - Produtos Pendentes: X
   - Sincronizados: Y
   - Com Erro: Z

2. **Disparar sync manualmente:**
   - Clicar em "Sincronizar Agora"
   - Ver logs em tempo real aparecendo
   - Aguardar mensagem de conclusão

3. **Logs esperados:**
   ```
   [14:23:15] 🔍 Buscando produtos pendentes...
   [14:23:16] ✅ 5 produtos encontrados
   [14:23:17] ⏳ Processando lote 1/1 (5 produtos)...
   [14:23:20] ✅ Produto "Óculos Tommy" sincronizado
   [14:23:45] 🎉 Sincronização concluída! 5/5 com sucesso
   ```

---

### **TESTE 4: Verificação Frontend**

#### Páginas para testar:

1. **Dashboard - Lista de Produtos** (`/dashboard/products`)
   - Verificar se imagens carregam do storage (não URLs externas)
   - Inspecionar Network tab: URLs devem ser `/api/storage-image?path=...`

2. **Catálogo Público** (`/catalogo/{slug}`)
   - Abrir produto
   - Verificar galeria de imagens
   - Testar zoom/lightbox

3. **Detalhes do Produto**
   - Verificar se variantes responsivas carregam (320w em mobile, 1000w em desktop)

#### Validação técnica:

```javascript
// Abra DevTools > Console
const produto = document.querySelector('[data-product-id]');
console.log(produto.dataset); // Deve ter storage path

// Network tab:
// ✅ CORRETO: /api/storage-image?path=public/brands/.../main-1000w.webp
// ❌ ERRADO: https://commportal-images.safilo.com/.../P00.JPG
```

---

### **TESTE 5: Marketing Page (Banner WhatsApp)**

#### Acesso:

`/dashboard/marketing`

#### Passos:

1. Fazer upload de banner (ideal: 1200x630px)
2. Aguardar mensagem "Banner sincronizado no catálogo público"
3. Verificar preview do WhatsApp atualizado
4. Copiar link do catálogo
5. Colar no WhatsApp Web (https://web.whatsapp.com)

#### Validações:

1. **Upload:**
   - Aceita apenas imagens <= 5MB
   - Mostra preview imediatamente
   - Bloqueia arquivos grandes com mensagem de erro

2. **Metadados Open Graph:**

   ```bash
   # Testar com ferramenta externa
   curl -I https://www.repvendas.com.br/catalogo/{seu-slug}

   # Ou use: https://www.opengraph.xyz
   # Deve mostrar:
   # - og:image com URL do banner
   # - og:title com nome do catálogo
   # - og:description com mensagem personalizada
   ```

3. **WhatsApp preview:**
   - Colar link no chat
   - Aguardar preview carregar
   - Deve mostrar banner personalizado
   - **Nota:** WhatsApp cacheia por ~7 dias, pode precisar de link curto novo

---

## 🐛 Troubleshooting

### Problema: Imagens não sincronizam

**Sintomas:**

- `sync_status` permanece `pending` após executar sync
- Nenhum log de erro

**Soluções:**

1. Verificar se `products.images` está populado:
   ```sql
   SELECT images FROM products WHERE sync_status = 'pending' LIMIT 5;
   ```
2. Se vazio, re-importar Excel
3. Verificar logs do script:
   ```powershell
   node scripts/local-sync-full.mjs 2>&1 | Tee-Object -FilePath sync-debug.log
   ```

---

### Problema: Frontend mostra URLs externas

**Sintomas:**

- Produtos sincronizados mas imagens carregam de URLs externas (Safilo, etc.)

**Causa:**

- `getProductImageUrl` não está priorizando `path` corretamente

**Solução:**

```sql
-- Verificar formato de products.images
SELECT id, name, images FROM products WHERE sync_status = 'synced' LIMIT 1;

-- Se estiver como string[], reprocessar:
UPDATE products SET sync_status = 'pending' WHERE id = 'abc123';
-- E executar sync novamente
```

---

### Problema: WhatsApp não atualiza banner

**Sintomas:**

- Banner atualizado no sistema mas WhatsApp mostra versão antiga

**Causa:**

- Cache do WhatsApp (7-14 dias)

**Soluções:**

1. **Criar link curto novo** (força novo scraping)
2. **Adicionar cache-bust manual:**
   ```
   https://www.repvendas.com.br/catalogo/{slug}?v=2026-02-03
   ```
3. **Aguardar 24-48h** para cache expirar
4. **Usar debugger do Facebook:**
   - https://developers.facebook.com/tools/debug/
   - Colar URL e clicar "Scrape Again"

---

## 📊 Métricas de Sucesso

### Performance esperada:

- **Compressão:** 70-85% de redução (5MB → ~800KB)
- **Tempo de sync:** ~3-5 segundos por produto (3 imagens)
- **Throughput:** ~200-300 produtos/hora (script local)
- **Taxa de sucesso:** > 95% (falhas apenas em URLs inválidas)

### Economia de storage:

```sql
-- Calcular economia total
SELECT
  COUNT(*) as total_produtos,
  COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as sincronizados,
  COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as falhados,
  ROUND(AVG(
    CASE WHEN sync_status = 'synced'
    THEN 85.0 -- % médio de economia
    ELSE 0 END
  ), 2) as economia_media_percent
FROM products;
```

---

## ✅ Aprovação Final

Marque cada item após validação:

- [ ] Importação Excel funciona com URLs concatenadas
- [ ] Script `local-sync-full.mjs` processa corretamente
- [ ] Torre de Controle exibe estatísticas corretas
- [ ] Sync manual pela interface funciona
- [ ] Frontend carrega imagens do storage
- [ ] Variantes responsivas funcionam (320w, 640w, 1000w)
- [ ] Marketing page aceita upload de banner
- [ ] WhatsApp preview exibe banner personalizado
- [ ] Metadados Open Graph corretos
- [ ] Compressão economiza > 70% de espaço

---

**Próximos Passos:**

1. Testar em produção com dataset real
2. Monitorar logs do CRON job (executa diariamente às 2 AM)
3. Configurar alertas para falhas de sincronização
4. Documentar casos especiais (marcas específicas)

**Contato para Dúvidas:**

- Consulte: [MANUAL_FLUXO_IMAGENS.md](MANUAL_FLUXO_IMAGENS.md)
- Logs do sistema: `/dashboard/settings/sync`
