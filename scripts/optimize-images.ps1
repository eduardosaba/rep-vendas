# Script PowerShell para executar otimização de imagens
# Uso: .\scripts\optimize-images.ps1

Write-Host "🎨 Script de Otimização de Imagens" -ForegroundColor Cyan
Write-Host "==================================`n" -ForegroundColor Cyan

# Verifica se o Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado. Instale em: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Verifica se sharp está instalado
Write-Host "`n📦 Verificando dependências..." -ForegroundColor Yellow

$packageJsonPath = Join-Path $PSScriptRoot "..\package.json"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

if (-not $packageJson.devDependencies.sharp) {
    Write-Host "⚠️  Pacote 'sharp' não encontrado." -ForegroundColor Yellow
    Write-Host "📥 Instalando sharp..." -ForegroundColor Yellow
    
    Set-Location (Join-Path $PSScriptRoot "..")
    
    # Tenta instalar com npm ou pnpm
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm add -D sharp
    } elseif (Get-Command npm -ErrorAction SilentlyContinue) {
        npm install --save-dev sharp
    } else {
        Write-Host "❌ Nenhum gerenciador de pacotes encontrado (npm/pnpm)." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Sharp instalado com sucesso!" -ForegroundColor Green
}

# Executa o script de otimização
Write-Host "`n🚀 Iniciando otimização...`n" -ForegroundColor Cyan

$scriptPath = Join-Path $PSScriptRoot "optimize-images.mjs"
node $scriptPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✨ Processo concluído com sucesso!" -ForegroundColor Green
    Write-Host "`n💡 Próximos passos:" -ForegroundColor Yellow
    Write-Host "   1. Revise as imagens otimizadas em: public/images/optimized/" -ForegroundColor White
    Write-Host "   2. Atualize o código para usar as imagens WebP" -ForegroundColor White
    Write-Host "   3. Mantenha os originais como fallback" -ForegroundColor White
} else {
    Write-Host "`n❌ Ocorreram erros durante a otimização." -ForegroundColor Red
}
