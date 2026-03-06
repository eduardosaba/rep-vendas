# Checklist de Segurança — Arquivos de ambiente (.env)

Este checklist lista ações recomendadas para proteger segredos no repositório e em ambientes de CI/CD.

1) Verificações imediatas (já realizadas)
- `.gitignore` contém `.env*.local` — protege ` .env.local` de commits acidentais.
- Arquivo `.env.local` contém chaves sensíveis (ex.: `SUPABASE_SERVICE_ROLE_KEY`, `INNGEST_API_KEY`, `VERCEL_OIDC_TOKEN`, `POPUP_ADMIN_SECRET`, `INTERNAL_MIDDLEWARE_SECRET`).

2) Passos rápidos (execute agora)
- Remover `SUPABASE_SERVICE_ROLE_KEY` e outras chaves server-only do repositório local: 

  ```powershell
  git rm --cached .env.local
  git commit -m "Remove .env.local from repo"
  ```

- Substituir esses segredos por variáveis de ambiente nos provedores (Vercel, Supabase, GH Actions, etc.).
- Rotacionar as keys que estavam no arquivo se já tiverem sido compartilhadas (SUPABASE_SERVICE_ROLE_KEY, INNGEST_API_KEY, VERCEL_OIDC_TOKEN, ASAAS_API_KEY).

3) Limpeza do histórico Git (se as chaves já foram commitadas)
- Se as credenciais já estiverem no histórico, remova-as com `git filter-repo` ou `bfg-repo-cleaner` (recomendado) e force-push para o repositório remoto (cautela — operação destrutiva):

  ```bash
  # usando bfg
  bfg --delete-files .env.local
  git reflog expire --expire=now --all && git gc --prune=now --aggressive
  git push --force
  ```

4) Boas práticas para chaves server-side
- `SUPABASE_SERVICE_ROLE_KEY` e `INNGEST_API_KEY` devem estar apenas em ambientes server-side (Vercel Secrets, Supabase Project Secrets, ou variáveis de CI) e NÃO em arquivos compartilhados.
- Use secrets no painel do provedor (Vercel Secrets ou Supabase env) e acesse via `process.env` no código server-side.

5) Rotinas e automações
- Adicione checagem no CI para bloquear commits contendo padrões de segredos (ex.: `SUPABASE_SERVICE_ROLE_KEY=`, `PRIVATE_KEY`, `-----BEGIN RSA PRIVATE KEY-----`).
- Automatize rotação periódica de segredos sensíveis.

6) Comandos úteis locais
- Limpar `NODE_OPTIONS` para a sessão PowerShell (evita warnings do dev-wrapper):

  ```powershell
  $env:NODE_OPTIONS = ''
  pnpm run dev
  ```

7) Checklist pós-migração (após rotacionar/remover segredos)
- Atualizar secrets nos provedores: Vercel, Supabase, CI.
- Testar endpoints que usam `SUPABASE_SERVICE_ROLE_KEY` (ex.: rotas admin) em staging.
- Verificar logs por acessos inesperados.

---
Gerado automaticamente em 2026-03-06 por assistente. Se quiser, aplico os passos rápidos para você (remover `.env.local` do git e criar instruções de rotação), ou apenas guio passo-a-passo.