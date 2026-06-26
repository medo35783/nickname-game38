$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path $PSScriptRoot -Parent
$depsRoot = if ($env:NG_DEPS_ROOT) { $env:NG_DEPS_ROOT } else { 'D:\ng-deps\nickname-game55777' }
$legacyRoot = 'C:\Users\Hp\ng-deps\nickname-game55777'

Write-Host ""
Write-Host "=== تثبيت التبعيات على NTFS ===" -ForegroundColor Cyan
Write-Host "المشروع: $projectRoot"
Write-Host "التبعيات: $depsRoot"
Write-Host ""

New-Item -ItemType Directory -Force -Path $depsRoot | Out-Null
Copy-Item -Force "$projectRoot\package.json" $depsRoot
if (Test-Path "$projectRoot\package-lock.json") {
  Copy-Item -Force "$projectRoot\package-lock.json" $depsRoot
}

Push-Location $depsRoot
try {
  Copy-Item -Force "$projectRoot\scripts\vite.config.proxy.mjs" $depsRoot
  npm install
} finally {
  Pop-Location
}

if ($depsRoot -ne $legacyRoot -and (Test-Path "$legacyRoot\node_modules")) {
  Write-Host ""
  Write-Host "يمكنك حذف النسخة القديمة على C: لتوفير المساحة:" -ForegroundColor Yellow
  Write-Host "  Remove-Item -Recurse -Force '$legacyRoot'"
}

Write-Host ""
Write-Host "تم. شغّل المشروع:" -ForegroundColor Green
Write-Host "  npm run dev"
Write-Host ""
