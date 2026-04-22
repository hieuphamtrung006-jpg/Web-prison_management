$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

$nodeDir = "C:\Program Files\nodejs"
if (Test-Path $nodeDir) {
  $env:Path = "$nodeDir;$env:Path"
}

Write-Host "[1/4] Starting backend..." -ForegroundColor Cyan
$backendCmd = "Set-Location '$backend'; py -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
$backendProc = Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", $backendCmd -PassThru

Start-Sleep -Seconds 2

Write-Host "[2/4] Installing frontend deps if needed..." -ForegroundColor Cyan
Set-Location $frontend
if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
  npm install
}

Write-Host "[3/4] Starting frontend..." -ForegroundColor Cyan
$frontendCmd = "Set-Location '$frontend'; npm run dev"
$frontendProc = Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", $frontendCmd -PassThru

Write-Host "[4/4] Ready" -ForegroundColor Green
Write-Host "Backend: http://127.0.0.1:8000/docs"
Write-Host "Frontend: http://127.0.0.1:5173"
Write-Host "Use Stop-Process -Id $($backendProc.Id),$($frontendProc.Id) to stop both." -ForegroundColor Yellow
