#!/usr/bin/env pwsh
# =============================================
# SCRIPT: Aplicar Migrations SQL Pendentes
# =============================================
# Aplica as migrations necessárias no Supabase
# Uso: .\apply-pending-migrations.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Aplicando Migrations SQL Pendentes no Supabase..." -ForegroundColor Cyan
Write-Host ""

# Verificar se .env.local existe
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ Arquivo .env.local não encontrado!" -ForegroundColor Red
    Write-Host "💡 Crie o arquivo .env.local com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
    exit 1
}

# Carregar variáveis de ambiente
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$name" -Value $value
    }
}

$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_SERVICE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_SERVICE_KEY) {
    Write-Host "❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Variáveis de ambiente carregadas" -ForegroundColor Green
Write-Host "🔗 Supabase URL: $($SUPABASE_URL.Substring(0, 30))..." -ForegroundColor Gray
Write-Host ""

# Lista de migrations para aplicar (em ordem)
$migrations = @(
    "SQL/create_fonts_bucket.sql",
    "SQL/migration_add_font_support.sql"
)

Write-Host "📋 Migrations a serem aplicadas:" -ForegroundColor Cyan
$migrations | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($migration in $migrations) {
    if (-not (Test-Path $migration)) {
        Write-Host "⚠️  Arquivo não encontrado: $migration" -ForegroundColor Yellow
        $failCount++
        continue
    }

    Write-Host "⏳ Aplicando: $migration" -ForegroundColor Cyan
    
    $sql = Get-Content $migration -Raw
    
    $body = @{
        query = $sql
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod `
            -Uri "$SUPABASE_URL/rest/v1/rpc/exec" `
            -Method Post `
            -Headers @{
                "apikey" = $SUPABASE_SERVICE_KEY
                "Authorization" = "Bearer $SUPABASE_SERVICE_KEY"
                "Content-Type" = "application/json"
            } `
            -Body $body `
            -ErrorAction Stop

        Write-Host "   ✅ Aplicado com sucesso!" -ForegroundColor Green
        $successCount++
    }
    catch {
        # Tentar via psql se a API falhar
        Write-Host "   ⚠️  API REST falhou, tentando aplicar manualmente via SQL Editor..." -ForegroundColor Yellow
        Write-Host "   📄 Copie e cole o conteúdo de $migration no SQL Editor do Supabase" -ForegroundColor Yellow
        $failCount++
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 RESUMO:" -ForegroundColor Cyan
Write-Host "   ✅ Sucesso: $successCount" -ForegroundColor Green
Write-Host "   ❌ Falha/Manual: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Yellow" } else { "Green" })
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($failCount -gt 0) {
    Write-Host "⚠️  AÇÃO NECESSÁRIA:" -ForegroundColor Yellow
    Write-Host "   1. Acesse: $SUPABASE_URL/project/_/sql" -ForegroundColor White
    Write-Host "   2. Execute os scripts SQL manualmente no SQL Editor" -ForegroundColor White
    Write-Host "   3. Migrations pendentes:" -ForegroundColor White
    $migrations | ForEach-Object { 
        if (Test-Path $_) {
            Write-Host "      - $_" -ForegroundColor Gray
        }
    }
}
else {
    Write-Host "🎉 Todas as migrations foram aplicadas com sucesso!" -ForegroundColor Green
}

Write-Host ""
Write-Host "💡 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Verificar no Supabase Dashboard > Storage se bucket fonts foi criado" -ForegroundColor White
Write-Host "   2. Configurar CORS e Cache-Control no bucket fonts (opcional)" -ForegroundColor White
Write-Host "   3. Testar upload de fontes em /admin/settings" -ForegroundColor White
Write-Host ""
