# Baseline Performance Test Launcher
# Opens the baseline test runner in the default browser

Write-Host "🚀 Starting Baseline Performance Tests..." -ForegroundColor Cyan
Write-Host ""

# Check if server is running
$serverRunning = netstat -ano | Select-String ":8000" | Select-Object -First 1

if ($serverRunning) {
    Write-Host "✅ Local server detected on port 8000" -ForegroundColor Green
    Write-Host ""
    Write-Host "Opening baseline test runner..." -ForegroundColor Yellow
    Start-Process "http://localhost:8000/dashboard/run-baseline-tests.html"
    Write-Host ""
    Write-Host "📊 Instructions:" -ForegroundColor Cyan
    Write-Host "  1. Click 'Start Baseline Tests' button" -ForegroundColor White
    Write-Host "  2. Wait 2-3 minutes for all tests to complete" -ForegroundColor White
    Write-Host "  3. Click 'Download Results (JSON)' to save" -ForegroundColor White
    Write-Host "  4. Save to: dashboard\performance-results\" -ForegroundColor White
    Write-Host ""
    Write-Host "✨ Results will be displayed in your browser" -ForegroundColor Green
} else {
    Write-Host "❌ No server detected on port 8000" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start a local server first:" -ForegroundColor Yellow
    Write-Host "  python -m http.server 8000" -ForegroundColor White
    Write-Host "  or" -ForegroundColor White
    Write-Host "  npx http-server -p 8000" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
}
