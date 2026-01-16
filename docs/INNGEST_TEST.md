# Testando Inngest localmente

Pré-requisitos

- Ter o projeto rodando em `next dev` (porta padrão 3000).
- Ter o arquivo `.env.local` com `INNGEST_SIGNING_SECRET` e `INNGEST_API_KEY` definidos.

1. Iniciar o Next.js (dev)

```powershell
pnpm dev
```

2. Iniciar o Inngest CLI em modo dev (escuta e expõe UI/CLI)

```powershell
npx inngest-cli@latest dev
```

3. Enviar um evento de teste (via Inngest CLI)

```powershell
npx inngest-cli@latest send --name "catalog/sync.requested" --data '{"userId":"test-user-123"}'
```

Observações e alternativas

- Se preferir assinar e enviar manualmente (útil para debugging), use o script auxiliar `scripts/test-inngest-webhook.cjs`:

Dry-run (mostra payload + headers gerados):

```powershell
node scripts/test-inngest-webhook.cjs --dry
```

Enviar realmente para `http://localhost:3000/api/inngest`:

```powershell
node scripts/test-inngest-webhook.cjs
```

- Se o handler do servidor retornar `No function ID found`, rode o `inngest-cli dev` (passo 2) — o CLI garante que as funções locais sejam mapeadas corretamente para a rota do servidor.

Problemas comuns

- `Missing INNGEST_SIGNING_SECRET`: confirme `.env.local` contém `INNGEST_SIGNING_SECRET=` ou passe a variável no ambiente antes de rodar os comandos.
- Erro 500 com `No function ID found`: normalmente significa que o Inngest dev-server não está rodando ou que o payload não foi enviado via CLI dev (o CLI cria um túnel de desenvolvimento correto).

Se quiser, eu posso executar esse fluxo aqui (iniciar `inngest-cli dev` e enviar um evento) — confirme que deseja que eu rode os comandos.
