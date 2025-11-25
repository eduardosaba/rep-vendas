<#
Apply profiles RLS migration

Usage:
- From project root (PowerShell):
    .\scripts\apply-profiles-policies.ps1

- You can pass a DATABASE_URL via env or parameter:
    $env:DATABASE_URL = "postgresql://user:pass@host:5432/dbname"
    .\scripts\apply-profiles-policies.ps1

Or:
    .\scripts\apply-profiles-policies.ps1 -DatabaseUrl "postgresql://..."

This script will try `psql` first. If not found and `supabase` CLI exists, it will try `supabase db query -f`.
If neither is available it will instruct you to use the Supabase Console.
#>

[CmdletBinding()]
param(
    [string]$DatabaseUrl
)

Set-StrictMode -Version Latest

try {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    $migrationPath = Join-Path $scriptRoot "..\supabase\migrations\20251125083000_fix_profiles_policies.sql"
    $migrationPath = (Resolve-Path -Path $migrationPath -ErrorAction Stop).Path
} catch {
    Write-Error "Não foi possível localizar o arquivo de migration. Verifique o caminho relativo a partir de `scripts/`."
    exit 1
}

if (-not (Test-Path $migrationPath)) {
    Write-Error "Arquivo de migration não encontrado: $migrationPath"
    exit 1
}

# Determine connection string
if (-not $DatabaseUrl) {
    if ($env:DATABASE_URL) {
        $DatabaseUrl = $env:DATABASE_URL
    } else {
        $DatabaseUrl = Read-Host -Prompt 'DATABASE_URL não definida. Cole a connection string (postgresql://user:pass@host:5432/db)':
    }
}

if (-not $DatabaseUrl) {
    Write-Error "DATABASE_URL não fornecida. Abortando."
    exit 1
}

Write-Output "Migration: $migrationPath"

# Try psql
$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if ($psqlCmd) {
    Write-Output "Executando migration com psql..."
    & $psqlCmd.Source $DatabaseUrl -f $migrationPath
    $rc = $LASTEXITCODE
    if ($rc -ne 0) {
        Write-Error "psql retornou código de erro $rc"
        exit $rc
    }
    Write-Output "Migration aplicada com sucesso via psql."
    exit 0
}

# Fallback: supabase CLI
$supCmd = Get-Command supabase -ErrorAction SilentlyContinue
if ($supCmd) {
    Write-Output "psql não encontrado; tentando com supabase CLI (requere login/configuração)..."
    & $supCmd.Source 'db' 'query' '-f' $migrationPath
    $rc = $LASTEXITCODE
    if ($rc -ne 0) {
        Write-Error "supabase CLI retornou código de erro $rc"
        exit $rc
    }
    Write-Output "Migration aplicada com sucesso via supabase CLI."
    exit 0
}

Write-Error "Nem 'psql' nem 'supabase' CLI foram encontrados no PATH. Abra o Supabase Console e rode o SQL manualmente: $migrationPath"
exit 2
