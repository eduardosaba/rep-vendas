# Copy-on-Write (CoW) — Fluxo e Testes

## Resumo

O sistema mantém imagens compartilhadas quando um catálogo é clonado (para economizar armazenamento). Quando um lojista/representante edita um produto que referencia uma imagem compartilhada (`image_is_shared = true`), disparamos um fluxo _copy-on-write_ que:

- copia o arquivo do bucket do local compartilhado para um caminho exclusivo do usuário (`/${userId}/products/{productId}{ext}`)
- atualiza a linha em `products` (`image_path`, `image_url`, `image_is_shared=false`)

## Componentes envolvidos

- Endpoint server: `POST /api/image/copy-on-write` — recebe `{ sourcePath, productId }`, valida o usuário autenticado e envia evento Inngest `image/copy_on_write.requested`.
- Função Inngest: `copyImageOnWrite` — assinada para `image/copy_on_write.requested`, chama `copyImageToUser` server-side usando `SUPABASE_SERVICE_ROLE_KEY`.
- Helper server: `src/lib/copyImageToUser.ts` — faz download do arquivo do bucket, upload para o destino do usuário e atualiza o registro do produto.
- Trigger no cliente: `src/components/dashboard/EditProductForm.tsx` — após upload local, se `product.image_is_shared` for `true` e existir `product.image_path`, a UI chama `/api/image/copy-on-write` assincronamente para enfileirar o CoW.

## Como testar localmente (rápido)

Pré-requisitos:

- Defina as variáveis de ambiente no terminal onde executará o script:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "https://<your>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service-role-key>"
```

Com o repositório no diretório raiz, rode o script Node:

```bash
node scripts/test-copy-on-write.mjs "masterUser/products/abc.jpg" "target-user-id" "target-product-id"
```

O script fará o download do arquivo `masterUser/products/abc.jpg` do bucket `product-images`, fará upload para `target-user-id/products/target-product-id.jpg` e atualizará a linha `products.id = target-product-id` para apontar para a cópia.

## Fluxo de verificação manual via UI

1. Clone um catálogo para um usuário de teste (usando o admin UI ou `scripts/clone-test.mjs`).
2. Faça login como o usuário alvo e abra o produto que referencia a imagem compartilhada.
3. No editor do produto, substitua a imagem (ou apenas salve após a mudança de imagem). O cliente chamará `/api/image/copy-on-write` em background.
4. Verifique na tabela `products` que `image_is_shared` ficou `false` e `image_path` aponta para o caminho do usuário.

## Notas operacionais

- O worker Inngest precisa de `SUPABASE_SERVICE_ROLE_KEY` disponível no ambiente onde roda para executar `copyImageToUser`.
- O endpoint `/api/image/copy-on-write` valida apenas que o usuário está autenticado; o trabalho real é feito assíncrono pelo Inngest/worker.
- Caso precise forçar imediatamente (sem Inngest), use o script `scripts/test-copy-on-write.mjs` com credenciais de service role.

## Possíveis melhorias

- Adicionar verificação de referência contadora (refcount) para evitar cópias desnecessárias quando múltiplos produtos do mesmo usuário apontam para a mesma imagem.
- Monitorar histórico de CoW no `catalog_clones` ou em tabela de auditoria para rastreabilidade.
