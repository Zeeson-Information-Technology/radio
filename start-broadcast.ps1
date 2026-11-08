# Al-Manhaj Radio - Start Broadcasting
# Run this script before every broadcast session

Write-Host "`n=== Al-Manhaj Radio Gateway Starter ===" -ForegroundColor Cyan

# 1. Kill any old processes
Write-Host "`nStopping any old processes..." -ForegroundColor Yellow
Stop-Process -Name "cloudflared" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*radio*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. Start the gateway
Write-Host "Starting gateway..." -ForegroundColor Yellow
$gateway = Start-Process -FilePath "node" -ArgumentList "server.js" `
  -WorkingDirectory "c:\Users\ibrah\Documents\dev\radio\radio\gateway" `
  -NoNewWindow -PassThru -RedirectStandardOutput "c:\Users\ibrah\Documents\dev\radio\radio\gateway\gateway.log" `
  -RedirectStandardError "c:\Users\ibrah\Documents\dev\radio\radio\gateway\gateway-err.log"

Start-Sleep -Seconds 3

# Check gateway is up
try {
  $health = Invoke-WebRequest -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 5 -UseBasicParsing
  Write-Host "Gateway: RUNNING" -ForegroundColor Green
} catch {
  Write-Host "Gateway: FAILED TO START - check gateway-err.log" -ForegroundColor Red
  exit 1
}

# 3. Start the tunnel
Write-Host "Starting Cloudflare tunnel..." -ForegroundColor Yellow
$tunnelLog = "c:\Users\ibrah\Documents\dev\radio\radio\tunnel.log"
Remove-Item $tunnelLog -Force -ErrorAction SilentlyContinue
Start-Process -FilePath "C:\Program Files (x86)\cloudflared\cloudflared.exe" `
  -ArgumentList "tunnel","--url","http://localhost:8080","--protocol","http2" `
  -NoNewWindow -RedirectStandardError $tunnelLog

# Wait for tunnel URL
Write-Host "Waiting for tunnel URL..." -ForegroundColor Yellow
$tunnelUrl = ""
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Path $tunnelLog) {
    $match = Select-String -Path $tunnelLog -Pattern "https://[\w-]+\.trycloudflare\.com" -ErrorAction SilentlyContinue
    if ($match) {
      $tunnelUrl = $match.Matches[0].Value
      break
    }
  }
}

if (-not $tunnelUrl) {
  Write-Host "Could not get tunnel URL - check tunnel.log" -ForegroundColor Red
  exit 1
}

Write-Host "`nTunnel: RUNNING" -ForegroundColor Green
Write-Host "Tunnel URL: $tunnelUrl" -ForegroundColor Cyan

# 4. Show what to update on Vercel
Write-Host "`n=== UPDATE THESE 3 VALUES ON VERCEL ===" -ForegroundColor Magenta
Write-Host "BROADCAST_GATEWAY_URL = $($tunnelUrl -replace 'https://', 'wss://')" -ForegroundColor White
Write-Host "GATEWAY_URL           = $tunnelUrl" -ForegroundColor White
Write-Host "STREAM_URL            = $tunnelUrl/test-stream" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "`nGo to: https://vercel.com -> radio project -> Settings -> Environment Variables" -ForegroundColor Yellow
Write-Host "After updating, redeploy from the Deployments tab." -ForegroundColor Yellow
Write-Host "`nAll done! Your PC is ready to broadcast." -ForegroundColor Green
