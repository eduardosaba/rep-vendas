param(
  [switch]$Dry,
  [int]$Limit = 20
)

# Carrega variáveis de .env.local (linha simples KEY=VALUE)
$envFile = Join-Path $PSScriptRoot '..\.env.local'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#') { continue }
    if ($_ -match '^\s*$') { continue }
    $parts = $_ -split '=',2
    if ($parts.Length -eq 2) {
      $name = $parts[0].Trim()
      $val = $parts[1].Trim()
      ${env:$name} = $val
    }
  }
} else {
  Write-Host ".env.local not found at $envFile. Please set environment variables manually." -ForegroundColor Yellow
}

$dryArg = ''
if ($Dry.IsPresent) { $dryArg = '--dry' }

$limitArg = ''
if ($Limit -gt 0) { $limitArg = "--limit=$Limit" }

Write-Host "Running migrate-storage-to-user-prefix.mjs (DRY=$($Dry.IsPresent)) with LIMIT=$Limit"
node (Join-Path $PSScriptRoot 'migrate-storage-to-user-prefix.mjs') $dryArg $limitArg
