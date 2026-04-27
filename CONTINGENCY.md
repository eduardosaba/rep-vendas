🚨 Protocolo de Emergência: Instabilidade de Infraestrutura

Este projeto possui um sistema de "disjuntor" para lidar com falhas no Supabase (Postgres) ou manutenções críticas. Mantenha este documento como referência rápida para operações e delegação.

**1. Diagnóstico Rápido**

- Status Oficial: verifique https://status.supabase.com
- Health Check do app: acesse `https://<seu-dominio>/api/health` (GET)
  - 200 OK — Banco operacional
  - 503 Service Unavailable — Banco inacessível / recusando conexões

**2. Ativação do Banner de Manutenção**

Para sinalizar instabilidade aos usuários sem novo deploy de código:

- Painel Vercel → Project Settings → Environment Variables
- Variável (server-side):
  - Key: `MAINTENANCE_MODE`
  - Value: `true` para ativar, `false` para desativar
- Variável (client/build-time):
  - Key: `NEXT_PUBLIC_MAINTENANCE_MODE`
  - Value: `true` / `false`

Observações:
- Usamos leitura server-side em `layout.tsx`, então alterar `MAINTENANCE_MODE` no host normalmente faz o banner aparecer para novos requests sem rebuild (pode ser necessário "Purge Cache" em algumas configurações de CDN).
- `NEXT_PUBLIC_MAINTENANCE_MODE` exige alteração de build (ou reiniciar o servidor de dev) para aplicações estáticas; use apenas quando for ok rebuild.

**3. Onde checar o código (quick links)**

- Componente do banner: [src/components/MaintenanceBanner.tsx](src/components/MaintenanceBanner.tsx)
- Integração no layout: [src/app/layout.tsx](src/app/layout.tsx)
- Endpoint health-check: [src/app/api/health/route.ts](src/app/api/health/route.ts)

**4. Passos de teste (local)**

1) Rode em dev:

```bash
pnpm dev
```

2) Verifique health:

```bash
curl -i http://localhost:3000/api/health
```

3) Simular banner (client-build):
- Crie/edite `.env.local` com:

```
NEXT_PUBLIC_MAINTENANCE_MODE=true
```

- Reinicie o `pnpm dev` e recarregue a página pública para ver o banner.

4) Simular banner (server-side toggle — Vercel-like behavior):
- Em produção (Vercel), altere `MAINTENANCE_MODE=true` no painel e aguarde alguns segundos para novos requests. Se a sua configuração usar CDN/edges, faça "Purge Cache" para forçar refresh imediato.

**5. Mensagem de contingência recomendada**

Não ative o banner se o seu Postgres estiver em versão segura. Exemplo de mensagem curta para usuários públicos:

"Estamos realizando manutenção preventiva. Alguns recursos podem ficar instáveis por curto período. Agradecemos sua compreensão."

Mensagem técnica para área administrativa (mais detalhada):

"ALERTA TÉCNICO (SUPABASE): Instabilidade detectada. Evite reiniciar o projeto no painel. A equipe está avaliando." 

**6. Recomendação atual (situação do repositório)**

- Se o seu Postgres é `17.x` (como no seu caso), não há urgência em ativar o banner — a versão reportada como crítica era `15.x`.
- Mantenha o código do banner pronto no repositório; ative apenas se o status oficial ou nossos testes (health) indicarem problema.

**7. Próximos passos operacionais**

- (Opcional) Atualizar variáveis na Vercel: `MAINTENANCE_MODE` para controle instantâneo.
- Testar o endpoint `/api/health` após qualquer ação de mitigação.
- Se quiser, automatizar alertas (Slack/email) quando `/api/health` retornar 503.

---

Arquivo gerado automaticamente pelo time de operações. Mantê-lo junto ao repositório facilita a resposta a incidentes e a delegação de tarefas.
