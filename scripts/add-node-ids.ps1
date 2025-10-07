# Script to add unique IDs to all nodes in a dashboard JSON file
param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputFile = $null
)

# If no output file specified, use input file with .fixed.json extension
if (-not $OutputFile) {
    $OutputFile = $InputFile -replace '\.json$', '.fixed.json'
}

Write-Host "Reading JSON file: $InputFile" -ForegroundColor Cyan

# Read and parse JSON
$jsonContent = Get-Content $InputFile -Raw | ConvertFrom-Json

# Counter for generating unique IDs
$script:idCounter = 1
$script:idMap = @{}

# Function to generate a unique ID based on label
function Get-UniqueId {
    param(
        [string]$label,
        [string]$type
    )
    
    # Create a base ID from the label
    $baseId = $label -replace '[^\w\s-]', '' -replace '\s+', '-' -replace '--+', '-'
    $baseId = $baseId.Trim('-').ToLower()
    
    # If empty, use type
    if ([string]::IsNullOrWhiteSpace($baseId)) {
        $baseId = $type.ToLower()
    }
    
    # If still empty, use generic
    if ([string]::IsNullOrWhiteSpace($baseId)) {
        $baseId = "node"
    }
    
    # Ensure uniqueness
    $finalId = $baseId
    $counter = 1
    while ($script:idMap.ContainsKey($finalId)) {
        $finalId = "$baseId-$counter"
        $counter++
    }
    
    $script:idMap[$finalId] = $true
    return $finalId
}

# Function to recursively add IDs to nodes
function Add-NodeIds {
    param(
        [Parameter(Mandatory=$true)]
        $node,
        
        [Parameter(Mandatory=$false)]
        [int]$depth = 0
    )
    
    # Add ID if missing
    if (-not $node.PSObject.Properties['id']) {
        $newId = Get-UniqueId -label $node.label -type $node.type
        $node | Add-Member -MemberType NoteProperty -Name 'id' -Value $newId
        Write-Host ("  " * $depth) "Added ID '$newId' to node: $($node.label)" -ForegroundColor Green
    } else {
        # Track existing ID to avoid duplicates
        if ($node.id) {
            $script:idMap[$node.id] = $true
        }
        Write-Host ("  " * $depth) "Node already has ID '$($node.id)': $($node.label)" -ForegroundColor Gray
    }
    
    # Recursively process children
    if ($node.PSObject.Properties['children'] -and $node.children -is [Array]) {
        foreach ($child in $node.children) {
            Add-NodeIds -node $child -depth ($depth + 1)
        }
    }
}

# Process all nodes
Write-Host "`nProcessing nodes..." -ForegroundColor Cyan
$nodeCount = 0
if ($jsonContent.PSObject.Properties['nodes'] -and $jsonContent.nodes -is [Array]) {
    foreach ($node in $jsonContent.nodes) {
        Add-NodeIds -node $node
        $nodeCount++
    }
}

Write-Host "`nProcessed $nodeCount root node(s)" -ForegroundColor Cyan
Write-Host "Total unique IDs in map: $($script:idMap.Count)" -ForegroundColor Cyan

# Restructure settings if needed
Write-Host "`nChecking settings structure..." -ForegroundColor Cyan
if (-not $jsonContent.PSObject.Properties['settings']) {
    Write-Host "Creating settings object..." -ForegroundColor Yellow
    $settings = @{}
    
    # Move root-level settings into settings object
    $settingsProperties = @(
        'showCenterMark', 'showConnectionPoints', 'showGhostlines', 
        'curved', 'showBoundingBox', 'toggleCollapseOnStatusChange',
        'cascadeOnStatusChange', 'zoomToRoot', 'showEdges'
    )
    
    foreach ($prop in $settingsProperties) {
        if ($jsonContent.PSObject.Properties[$prop]) {
            $settings[$prop] = $jsonContent.$prop
            $jsonContent.PSObject.Properties.Remove($prop)
        }
    }
    
    $jsonContent | Add-Member -MemberType NoteProperty -Name 'settings' -Value $settings -Force
} else {
    Write-Host "Settings object already exists" -ForegroundColor Gray
    
    # Move any misplaced settings from root to settings object
    $settingsProperties = @(
        'showCenterMark', 'showConnectionPoints', 'showGhostlines', 
        'curved', 'showBoundingBox', 'toggleCollapseOnStatusChange',
        'cascadeOnStatusChange', 'zoomToRoot', 'showEdges'
    )
    
    foreach ($prop in $settingsProperties) {
        if ($jsonContent.PSObject.Properties[$prop]) {
            Write-Host "Moving $prop from root to settings" -ForegroundColor Yellow
            $jsonContent.settings | Add-Member -MemberType NoteProperty -Name $prop -Value $jsonContent.$prop -Force
            $jsonContent.PSObject.Properties.Remove($prop)
        }
    }
}

# Write output
Write-Host "`nWriting output to: $OutputFile" -ForegroundColor Cyan
$jsonContent | ConvertTo-Json -Depth 100 | Set-Content $OutputFile -Encoding UTF8

Write-Host "`nDone! Fixed JSON saved to: $OutputFile" -ForegroundColor Green
Write-Host "Original file preserved at: $InputFile" -ForegroundColor Gray

# Validate the output
Write-Host "`nValidating output JSON..." -ForegroundColor Cyan
try {
    Get-Content $OutputFile -Raw | ConvertFrom-Json | Out-Null
    Write-Host "✓ Output JSON is valid!" -ForegroundColor Green
} catch {
    Write-Host "✗ Output JSON is invalid: $_" -ForegroundColor Red
}
