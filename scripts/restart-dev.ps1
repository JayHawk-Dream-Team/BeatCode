$ErrorActionPreference = 'Stop'

Write-Host "Stopping stale node/npm processes..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process npm -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

if (Test-Path .next) {
  Write-Host "Removing .next cache..."
  Remove-Item -Recurse -Force .next
}

Write-Host "Starting Next.js dev server"
npm run dev