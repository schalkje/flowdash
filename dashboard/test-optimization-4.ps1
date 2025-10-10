# Test Optimization #4 - Quick Verification
# This script opens the test page for Optimization #4

Write-Host "🚀 Testing Optimization #4: Cache Node Lookups for Edges" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
$serverRunning = netstat -ano | Select-String ":8000" | Select-Object -First 1

if ($serverRunning) {
    Write-Host "✅ Local server detected on port 8000" -ForegroundColor Green
    Write-Host ""
    Write-Host "Opening Optimization #4 test page..." -ForegroundColor Yellow
    Start-Process "http://localhost:8000/dashboard/test-optimization-4.html"
    Write-Host ""
    Write-Host "📊 What to look for:" -ForegroundColor Cyan
    Write-Host "  1. Console log: '📇 Built node lookup map: X nodes in Y ms'" -ForegroundColor White
    Write-Host "  2. Console log: '✅ Created edges in Y ms'" -ForegroundColor White
    Write-Host "  3. Edge creation time should be <1s for dwh-6.fixed.json" -ForegroundColor White
    Write-Host "  4. All edges should connect correctly (no console errors)" -ForegroundColor White
    Write-Host ""
    Write-Host "📈 Expected improvements:" -ForegroundColor Cyan
    Write-Host "  - Edge creation: 2-5s → <1s (60-80% faster)" -ForegroundColor Green
    Write-Host "  - Single tree traversal instead of 2000+" -ForegroundColor Green
    Write-Host ""
    Write-Host "✨ Test in browser console:" -ForegroundColor Yellow
    Write-Host "  dashboard.reportPerformanceMetrics()" -ForegroundColor White
    Write-Host ""
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
