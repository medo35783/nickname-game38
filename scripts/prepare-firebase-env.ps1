# Copies FIREBASE_SERVICE_ACCOUNT_JSON (one line) to clipboard for Vercel
# Run: powershell -ExecutionPolicy Bypass -File scripts/prepare-firebase-env.ps1

$jsonPath = Join-Path $env:USERPROFILE 'Downloads\nickname-game-firebase-adminsdk-fbsvc-56e8db428e.json'
if (-not (Test-Path $jsonPath)) {
  Write-Host 'JSON file not found in Downloads. Update path in this script.'
  exit 1
}

$oneLine = ((Get-Content $jsonPath -Raw) -replace '\s*\r?\n\s*', '').Trim()
$oneLine | Set-Clipboard
Write-Host 'Copied to clipboard.'
Write-Host 'Paste in Vercel -> Settings -> Environment Variables'
Write-Host 'Key: FIREBASE_SERVICE_ACCOUNT_JSON'
