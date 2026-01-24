# Manual de Sincronização — RepVendas

Este manual descreve, passo a passo, como sincronizar e otimizar as imagens do catálogo localmente (recomendado) ou acionar o processo via Inngest/Serverless.

---

## Opção A — Sincronização Local (recomendado)

Pré-requisitos

- Tenha as variáveis no seu `.env.local`:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (Service Role)
  - Opcional durante testes: `ALLOW_INSECURE_TLS=true` (SOMENTE EM DEV)
  - Opcional: `CHUNK_SIZE` (ex: `10`) e `DELAY_BETWEEN_CHUNKS` (ms)

Instalar dependências (uma vez)

```bash
pnpm install node-fetch sharp dotenv
```

Executar o script (principal + galeria)

```bash
# Processa capa + galeria (recomendado)
node scripts/local-sync-full.mjs

# Alternativa: processa apenas a imagem principal (mais rápido)
node scripts/local-sync-all.mjs
```

Rodar em background

- Windows (PowerShell):

```powershell
Start-Process -FilePath node -ArgumentList 'scripts/local-sync-full.mjs' -NoNewWindow
```

- macOS / Linux (nohup):

```bash
nohup node scripts/local-sync-full.mjs > sync-full.log 2>&1 &
```

Monitoramento

- Abra a Torre de Controle e verifique contadores e status.
- Verifique logs do terminal para progressão e erros.
- SQL rápido para checar pendentes:

```sql
select id, sync_status, sync_error from products where sync_status != 'synced' limit 20;
```

Pós-sincronização (segurança)

1. Pare o script.
2. Remova `ALLOW_INSECURE_TLS` do `.env.local` (ou defina `false`).
3. Commit & push das mudanças de UI (se aplicável).

---

## Opção B — Acionar via Inngest / API (Serverless)

Quando usar

- Para delegar processamento ao motor remoto (Inngest). Recomendado para tarefas curtas ou quando já existir um workflow Inngest configurado.

Requisitos

- Endpoint `POST /api/sync-trigger` que crie um job Inngest.
- Secrets no ambiente de produção: `SUPABASE_SERVICE_ROLE_KEY`, `ALLOW_INSECURE_TLS` (se necessário), etc.

Como disparar

```bash
curl -X POST https://your-app.example.com/api/sync-trigger -H "Content-Type: application/json" -d '{}'
```

Monitorar status

```bash
# Exemplo de poll simples (requer jq)
while true; do
  curl -s https://your-app.example.com/api/sync-jobs/latest | jq -r '.job | "ID:\(.id) STATUS:\(.status) \(.completed_count)/\(.total_count)"'
  sleep 5
done
```

Boas práticas para Serverless/Inngest

- Processar pequenos lotes por execução (3–5 itens) e encadear o job até esvaziar a fila.
- Armazenar a Service Role Key como secret no Inngest/provedor.
- Tratar timeouts: divida o trabalho em pequenos chunks.

---

Parâmetros e tuning

- `CHUNK_SIZE`: número de itens por lote. Local: 10–20; Serverless: 3–5.
- `DELAY_BETWEEN_CHUNKS`: ms de espera entre lotes (ex: 1000–3000).
- `ALLOW_INSECURE_TLS`: somente para debug/local; REMOVA em produção.

---

Soluções para bloqueio de IP ou certificados

- Se o host externo bloquear Data Center IPs, execute a carga inicial localmente (sua rede residencial).
- Alternativa: implementar um proxy/CDN que faça o fetch das imagens e as disponibilize com IPs confiáveis.

---

Comandos úteis

```bash
# Contar pendentes
pnpm exec supabase sql "select count(*) from products where sync_status != 'synced';"

# Typecheck e validação antes do push
pnpm run typecheck
pnpm run build
```

---

Observações finais

- Execute a sincronização local para os 1.194 itens inicialmente; depois mantenha a UI rápida pois lerá os `image_url` internos.
- Se desejar, eu posso ajustar os scripts para usar backoff exponencial, retries automáticos, ou processar apenas galerias específicas.

---

Arquivo gerado automaticamente pelo time de engenharia — RepVendas
