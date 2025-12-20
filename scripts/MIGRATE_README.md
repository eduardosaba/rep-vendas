Erro recebido: `syntax error at or near "fs"` indica que o arquivo JavaScript foi executado por um motor SQL (Postgres), não pelo Node.js.

Causa provável:

- O script foi passado acidentalmente para uma ferramenta que executa arquivos como SQL (p.ex. um runner de migrations). O Node/JS contém `import` e outras sintaxes que são inválidas em SQL.

Como executar corretamente (Windows PowerShell):

1. Usando o wrapper (recomendado):

```powershell
# dry-run de 20 itens
.\scripts\run-migrate-dry.ps1 -Dry -Limit 20

# execução real (em staging primeiro)
.\scripts\run-migrate-dry.ps1 -Limit 100
```

2. Executando manualmente no PowerShell definindo variáveis de ambiente:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "https://...supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<sua_service_role_key>"
node scripts/migrate-storage-to-user-prefix.mjs --dry --limit=20
```

3. Em Linux / macOS (bash):

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://...supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<sua_service_role_key>"
node scripts/migrate-storage-to-user-prefix.mjs --dry --limit=20
```

Notas de segurança e boas práticas:

- Nunca execute o script com a `SERVICE_ROLE_KEY` em produção pública ou no cliente; mantenha essa chave apenas em servidores/ambientes confiáveis.
- Teste `--dry` primeiro e em staging antes de rodar em produção.
- Se você usou algum utilitário que aplica todos os arquivos em uma pasta como SQL (ex: `apply-sql`), garanta que a pasta `scripts/` não esteja sendo escaneada por ele.

Quer que eu adicione um pequeno `package.json` entry (`"migrate:storage"`) para facilitar a execução com `pnpm`/`npm`? Se sim, confirmo e adiciono.
