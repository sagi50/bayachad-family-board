$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$python = Join-Path $project '..\..\work\api-venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) {
  $python = Join-Path $project '.venv\Scripts\python.exe'
}
if (-not (Test-Path -LiteralPath $python)) {
  Write-Host 'Python environment not found. Run the local setup from the project README first.'
  Read-Host 'Press Enter to close'
  exit 1
}
$env:APP_ENV = 'development'
$env:APP_ORIGIN = 'http://localhost:8080'
$env:COOKIE_SECURE = 'false'
$env:LOCAL_DATABASE_FILE = Join-Path $project 'local-data\bayachad.sqlite3'
Push-Location (Join-Path $project 'backend')
try {
  & $python -m app.manage change-password
  if ($LASTEXITCODE -eq 0) { Write-Host 'Password updated successfully.' }
} finally { Pop-Location }
Read-Host 'Press Enter to close'
