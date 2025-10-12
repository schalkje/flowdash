# Performance Profiling Test Launcher
# Launch the profiling test page in browser

Write-Host "🔍 Performance Profiling Tool" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will open the profiling test page in your browser" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Before you start:" -ForegroundColor Green
Write-Host "  1. Close other browser tabs for best results" -ForegroundColor White
Write-Host "  2. Make sure you're running an HTTP server (e.g., http-server)" -ForegroundColor White
Write-Host "  3. Have Chrome DevTools ready (F12)" -ForegroundColor White
Write-Host ""

# Check if server is running
$testUrl = "http://localhost:8000"
try {
    $response = Invoke-WebRequest -Uri $testUrl -Method Head -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Server detected at $testUrl" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No server detected at $testUrl" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Starting a simple HTTP server..." -ForegroundColor Cyan
    Write-Host ""
    
    # Try to start Python HTTP server
    try {
        $pythonCmd = Get-Command python -ErrorAction Stop
        Write-Host "Starting Python HTTP server on port 8000..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop the server when done" -ForegroundColor Yellow
        Write-Host ""
        
        # Change to parent directory (repo root)
        Set-Location ..
        python -m http.server 8000
        exit
    } catch {
        Write-Host "❌ Python not found. Please start an HTTP server manually:" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Option 1: Python" -ForegroundColor White
        Write-Host "    python -m http.server 8000" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Option 2: Node.js" -ForegroundColor White
        Write-Host "    npx http-server -p 8000" -ForegroundColor Gray
        Write-Host ""
        exit 1
    }
}

# Open browser
$url = "http://localhost:8000/dashboard/test-profiling.html"
Write-Host ""
Write-Host "🌐 Opening browser: $url" -ForegroundColor Cyan
Write-Host ""

Start-Process $url

Write-Host "✅ Profiling page opened in browser" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Press F12 to open Chrome DevTools" -ForegroundColor White
Write-Host "  2. Click the 'Performance' tab" -ForegroundColor White
Write-Host "  3. Click 'Start Profiling Workflow' button" -ForegroundColor White
Write-Host "  4. Follow the on-screen instructions" -ForegroundColor White
Write-Host ""
Write-Host "📖 For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "   dashboard/PROFILING_GUIDE.md" -ForegroundColor Gray
Write-Host ""
