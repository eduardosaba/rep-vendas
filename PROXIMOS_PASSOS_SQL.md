## 🎯 Próximos Passos - Execute no Supabase

### Opção 1: Interface Web (Recomendado)

1. **Acesse o SQL Editor do Supabase:**

   ```
   https://supabase.com/dashboard/project/aawghxjbipcqefmikwby/sql
   ```

2. **Visualize o SQL para copiar:**

   ```bash
   node scripts/show-sync-functions.mjs
   ```

3. **Copie TODO o SQL exibido** (ambas as funções)

4. **Cole no SQL Editor** e clique em **Run** ▶️

### Opção 2: Copiar Arquivos Diretamente

Copie o conteúdo destes arquivos e execute no SQL Editor:

1. [SQL/create_sync_brands_function.sql](SQL/create_sync_brands_function.sql)
2. [SQL/create_sync_categories_function.sql](SQL/create_sync_categories_function.sql)

---

## ✅ Após Executar

As seguintes funcionalidades estarão disponíveis:

### 📦 Dashboard > Marcas

- Botão **"Sincronizar do Catálogo"**
- Importa automaticamente marcas únicas dos produtos
- Atualiza `brand_id` em todos os produtos

### 🏷️ Dashboard > Categorias

- Botão **"Sincronizar do Catálogo"**
- Importa automaticamente categorias únicas dos produtos
- Atualiza `category_id` em todos os produtos

---

## 🔍 Verificação

Após executar o SQL, você pode testar:

1. Vá em **Dashboard > Marcas**
2. Clique em **"Sincronizar do Catálogo"**
3. Deve aparecer: ✅ "Marcas sincronizadas com sucesso!"

Se funcionar, faça o mesmo em **Dashboard > Categorias**.

---

## 🆘 Problemas?

Se ainda aparecer erro 404 ou 400:

- Verifique se executou **AMBAS** as funções SQL
- Confirme que não houve erro ao executar no SQL Editor
- Recarregue a página do Dashboard (F5)
