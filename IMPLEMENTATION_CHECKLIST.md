# Checklist de Implementação — RepVendas

Este documento lista os passos práticos para preparar, executar e validar a sincronização/virtualização no ambiente de desenvolvimento.

## 1) Instalação de dependências

- Instale `react-window` para virtualização da tabela:

```bash
pnpm add react-window react-virtualized-auto-sizer
```

- Verifique se as dependências necessárias para processamento de imagens estão presentes (`sharp`, `node-fetch` ou `undici`):

```bash
pnpm add -D sharp
# ou, se o script usa node-fetch/undici
pnpm add node-fetch@2
```

- Atualize as dependências do projeto e rode a build localmente:

```bash
pnpm install
pnpm run build # ou pnpm run dev para desenvolvimento
```

## 2) Variáveis de ambiente (temporário para carga inicial)

- Para a carga de muitos itens localmente, você pode precisar permitir TLS inseguro temporariamente (somente DEV):

Crie/edite `.env.local`:

```env
# Somente em dev/local - REMOVA/defina para false em produção
ALLOW_INSECURE_TLS=true
```

- Outras variáveis importantes:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `DATABASE_URL` (se necessário)

## 3) Execução do motor de sincronização (script local)

- Abra um terminal dedicado e execute o script de sincronização completo em background:

```bash
# Terminal 1 - deixar rodando
node scripts/local-sync-full.mjs
```

- Monitore logs no terminal; use outro terminal para navegar na UI e validar o progresso.

## 4) Validação Visual e Funcional

- Abra o painel de administração (Torre de Controle) e verifique:
  - A tabela está virtualizada e o scroll é fluido.
  - As imagens aparecem apenas quando entram na viewport (lazy loading + `LazyProductImage`).
  - O console do navegador não apresenta centenas de `ERR_INSUFFICIENT_RESOURCES`.
  - Os contadores de `Pendentes` / `Falhas` / `OK` batem com o esperado.

- Comprovantes rápidos:
  - Faça uma busca por `Falhas` e verifique se o botão `Reprocessar` aparece com o contador correto.
  - Clique em `Reprocessar` (se aplicável) e confirme que os itens voltam para `pending` no banco.

## 5) Checklist de segurança (após a carga)

1. Pare o script de sincronização local.
2. Defina `ALLOW_INSECURE_TLS=false` ou remova a chave do `.env.local`.
3. Rode um teste rápido de upload/consulta para garantir que a comunicação com o Storage do Supabase usa TLS válido.
4. Se tudo OK, faça o deploy seguindo o seu fluxo (CI/CD).

## 6) Boas práticas e recomendações

- Virtualize tabelas administrativas muito grandes; use `react-window` e `react-virtualized-auto-sizer`.
- Use lazy-loading + `IntersectionObserver` para páginas públicas com muitos cartões (catálogo).
- Para reduzir requests concorrentes, pagine endpoints administrativos ou exponha um `limit`/`offset` do servidor.
- Considere um cache/proxy para imagens externas (CDN) para evitar depender de servidores terceiros durante a carga.

## 7) Comandos úteis

```bash
# Checagens
pnpm run typecheck
pnpm run lint
pnpm run build

# Run dev
pnpm run dev

# Rodar sync script
node scripts/local-sync-full.mjs
```

---

Se quiser, eu já instalo `react-window` e adiciono a versão virtualizada da tabela (`ManageExternalImagesClient.tsx`) automaticamente. Deseja que eu faça isso agora?
