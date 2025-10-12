#!/usr/bin/env pwsh
# PowerShell launcher for node init profiling test

Write-Host "🔬 Starting Node Init Performance Profiling..." -ForegroundColor Cyan
Write-Host ""

# Check if server is running on port 8000
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    $serverRunning = $true
    Write-Host "✅ Server detected on http://localhost:8000" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No server detected on port 8000" -ForegroundColor Yellow
    Write-Host "   Starting Python HTTP server..." -ForegroundColor Yellow
    
    # Start server in background
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; python -m http.server 8000" -WindowStyle Normal
    
    Write-Host "   Waiting for server to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    $serverRunning = $true
}

if ($serverRunning) {
    Write-Host ""
    Write-Host "🌐 Opening profiling page in browser..." -ForegroundColor Cyan
    Write-Host "   URL: http://localhost:8000/test-node-init-profiling.html" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📋 Instructions:" -ForegroundColor Yellow
    Write-Host "   1. Open Browser DevTools (F12)" -ForegroundColor White
    Write-Host "   2. Go to Console tab" -ForegroundColor White
    Write-Host "   3. Click 'Start Profiling' button" -ForegroundColor White
    Write-Host "   4. Wait for results to appear" -ForegroundColor White
    Write-Host "   5. Look for BOTTLENECK entries in the results" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 What to look for:" -ForegroundColor Yellow
    Write-Host "   - Operations that take >15% of node init time" -ForegroundColor White
    Write-Host "   - Average time per node for each operation" -ForegroundColor White
    Write-Host "   - Total time across all nodes" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Expected findings:" -ForegroundColor Yellow
    Write-Host "   - Zone Manager or Display Change likely to be slowest" -ForegroundColor White
    Write-Host "   - These operations may trigger style recalc or layout" -ForegroundColor White
    Write-Host ""
    
    Start-Process "http://localhost:8000/dashboard/test-node-init-profiling.html"
} else {
    Write-Host "❌ Failed to start server" -ForegroundColor Red
    Write-Host "   Please start a server manually: python -m http.server 8000" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
