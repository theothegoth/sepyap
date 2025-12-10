# PowerShell script to fix frontend webpack cache issue

Write-Host "Cleaning frontend build cache..." -ForegroundColor Yellow

# Remove .next directory if it exists
docker exec gm-frontend rm -rf /app/.next 2>$null

# Restart frontend container
Write-Host "Restarting frontend container..." -ForegroundColor Yellow
docker-compose restart frontend

Write-Host "Done! Frontend should rebuild on next request." -ForegroundColor Green

