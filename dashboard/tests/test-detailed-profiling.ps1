# Detailed Manual Profiling Launcher
# Use this when Chrome DevTools hangs during profiling

Write-Host "🔬 Detailed Manual Profiling Tool" -ForegroundColor Cyan
Write-Host ""
Write-Host "This tool provides detailed timing WITHOUT using DevTools" -ForegroundColor Yellow
Write-Host "Perfect for when DevTools 'Loading trace...' hangs" -ForegroundColor Yellow
Write-Host ""

# Check if server is running
$testUrl = "http://localhost:8000"
try {
    $null = Invoke-WebRequest -Uri $testUrl -Method Head -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Server detected at $testUrl" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No server detected. Starting one..." -ForegroundColor Yellow
    try {
        $null = Get-Command python -ErrorAction Stop
        Write-Host "Starting Python HTTP server on port 8000..." -ForegroundColor Green
        Set-Location ..
        Start-Process python -ArgumentList "-m", "http.server", "8000" -WindowStyle Normal
        Start-Sleep -Seconds 2
        Set-Location dashboard
    } catch {
        Write-Host "❌ Could not start server. Please run manually:" -ForegroundColor Red
        Write-Host "   python -m http.server 8000" -ForegroundColor Gray
        exit 1
    }
}

# Open browser
$url = "http://localhost:8000/dashboard/test-detailed-profiling.html"
Write-Host ""
Write-Host "🌐 Opening: $url" -ForegroundColor Cyan
Start-Process $url

Write-Host ""
Write-Host "✅ Page opened!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 How to use:" -ForegroundColor Yellow
Write-Host "  1. Open Console (F12 → Console tab)" -ForegroundColor White
Write-Host "  2. Click 'Start Profiling' button" -ForegroundColor White
Write-Host "  3. Watch the progress bar and console" -ForegroundColor White
Write-Host "  4. Results will show automatically" -ForegroundColor White
Write-Host ""
Write-Host "💡 This tool shows:" -ForegroundColor Cyan
Write-Host "  • Real-time progress during load" -ForegroundColor Gray
Write-Host "  • Detailed timing for each phase" -ForegroundColor Gray
Write-Host "  • Bottleneck detection" -ForegroundColor Gray
Write-Host "  • Recommendations" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ No DevTools recording needed!" -ForegroundColor Green
Write-Host ""
