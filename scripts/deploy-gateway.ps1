# Al-Manhaj Radio - Gateway Deployment Script (Windows PowerShell)
# This script updates the gateway server on EC2

param(
    [string]$EC2Host = "98.93.42.61",
    [string]$EC2User = "ubuntu",
    [string]$GatewayPath = "/opt/almanhaj-gateway"
)

Write-Host "🚀 Deploying Al-Manhaj Radio Gateway to EC2..." -ForegroundColor Green
Write-Host ""

# Check if required files exist
if (-not (Test-Path "gateway/server.js")) {
    Write-Host "❌ Error: gateway/server.js not found!" -ForegroundColor Red
    Write-Host "Make sure you're running this from the project root directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Pre-deployment checklist:" -ForegroundColor Yellow
Write-Host "1. Make sure you have SSH access to EC2 instance"
Write-Host "2. Ensure gateway files are ready in ./gateway/"
Write-Host "3. Verify .env file is configured on EC2"
Write-Host ""

$continue = Read-Host "Continue with deployment? (y/N)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "📦 Copying gateway files to EC2..." -ForegroundColor Yellow

try {
    # Copy server.js
    Write-Host "Copying server.js..."
    scp "gateway/server.js" "${EC2User}@${EC2Host}:${GatewayPath}/"
    
    # Copy package.json
    Write-Host "Copying package.json..."
    scp "gateway/package.json" "${EC2User}@${EC2Host}:${GatewayPath}/"
    
    Write-Host "✅ Files copied successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error copying files: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔄 Restarting gateway service on EC2..." -ForegroundColor Yellow
Write-Host "You'll need to run these commands manually on EC2:" -ForegroundColor Cyan
Write-Host ""
Write-Host "ssh ubuntu@98.93.42.61" -ForegroundColor White
Write-Host "cd /opt/almanhaj-gateway" -ForegroundColor White
Write-Host "npm install --production" -ForegroundColor White
Write-Host "sudo systemctl stop almanhaj-gateway" -ForegroundColor White
Write-Host "sudo systemctl start almanhaj-gateway" -ForegroundColor White
Write-Host "sudo systemctl status almanhaj-gateway" -ForegroundColor White
Write-Host "sudo journalctl -u almanhaj-gateway -n 10" -ForegroundColor White
Write-Host ""

Write-Host "✅ Gateway files deployed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Next steps:" -ForegroundColor Yellow
Write-Host "1. SSH into EC2 and run the commands above"
Write-Host "2. Test the broadcast functionality from admin panel"
Write-Host "3. Verify listeners receive real-time updates"
Write-Host ""
Write-Host "🔧 Useful commands:" -ForegroundColor Yellow
Write-Host "• Check status: ssh ubuntu@98.93.42.61 'sudo systemctl status almanhaj-gateway'"
Write-Host "• View logs: ssh ubuntu@98.93.42.61 'sudo journalctl -u almanhaj-gateway -f'"
Write-Host "• Restart: ssh ubuntu@98.93.42.61 'sudo systemctl restart almanhaj-gateway'"