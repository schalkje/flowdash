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
$script:labelToIdMap = @{}

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
    
    # Map label to ID for edge processing
    if ($node.label -and $node.id) {
        $script:labelToIdMap[$node.label] = $node.id
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
if ($jsonContent.PSObject.Properties['nodes']) {
    if ($jsonContent.nodes -is [Array]) {
        # Handle array of nodes
        foreach ($node in $jsonContent.nodes) {
            Add-NodeIds -node $node
            $nodeCount++
        }
    } else {
        # Handle single root node object - wrap it in an array
        Write-Host "Converting single node object to array..." -ForegroundColor Yellow
        $singleNode = $jsonContent.nodes
        Add-NodeIds -node $singleNode
        $jsonContent.nodes = @($singleNode)
        $nodeCount = 1
    }
}

Write-Host "`nProcessed $nodeCount root node(s)" -ForegroundColor Cyan
Write-Host "Total unique IDs in map: $($script:idMap.Count)" -ForegroundColor Cyan
Write-Host "Total labels mapped to IDs: $($script:labelToIdMap.Count)" -ForegroundColor Cyan

# Process edges
Write-Host "`nProcessing edges..." -ForegroundColor Cyan
$edgeCount = 0
$edgeUpdatedCount = 0
$edgeMissingSourceCount = 0
$edgeMissingTargetCount = 0

if ($jsonContent.PSObject.Properties['edges'] -and $jsonContent.edges -is [Array]) {
    foreach ($edge in $jsonContent.edges) {
        $edgeCount++
        $updated = $false
        
        # Add source ID based on sourceName
        if ($edge.PSObject.Properties['sourceName'] -and $edge.sourceName) {
            if ($script:labelToIdMap.ContainsKey($edge.sourceName)) {
                $sourceId = $script:labelToIdMap[$edge.sourceName]
                
                # Add or update source property
                if (-not $edge.PSObject.Properties['source']) {
                    $edge | Add-Member -MemberType NoteProperty -Name 'source' -Value $sourceId
                } else {
                    $edge.source = $sourceId
                }
                $updated = $true
                Write-Host "  Edge: '$($edge.sourceName)' -> '$($edge.targetName)' - Added source ID: $sourceId" -ForegroundColor Green
            } else {
                Write-Host "  Edge: '$($edge.sourceName)' -> '$($edge.targetName)' - Warning: Source node not found" -ForegroundColor Yellow
                $edgeMissingSourceCount++
            }
        }
        
        # Add target ID based on targetName
        if ($edge.PSObject.Properties['targetName'] -and $edge.targetName) {
            if ($script:labelToIdMap.ContainsKey($edge.targetName)) {
                $targetId = $script:labelToIdMap[$edge.targetName]
                
                # Add or update target property
                if (-not $edge.PSObject.Properties['target']) {
                    $edge | Add-Member -MemberType NoteProperty -Name 'target' -Value $targetId
                } else {
                    $edge.target = $targetId
                }
                $updated = $true
                Write-Host "  Edge: '$($edge.sourceName)' -> '$($edge.targetName)' - Added target ID: $targetId" -ForegroundColor Green
            } else {
                Write-Host "  Edge: '$($edge.sourceName)' -> '$($edge.targetName)' - Warning: Target node not found" -ForegroundColor Yellow
                $edgeMissingTargetCount++
            }
        }
        
        if ($updated) {
            $edgeUpdatedCount++
        }
    }
}

Write-Host "`nProcessed $edgeCount edge(s)" -ForegroundColor Cyan
Write-Host "Updated $edgeUpdatedCount edge(s) with source/target IDs" -ForegroundColor Cyan
if ($edgeMissingSourceCount -gt 0) {
    Write-Host "Warning: $edgeMissingSourceCount edge(s) have missing source nodes" -ForegroundColor Yellow
}
if ($edgeMissingTargetCount -gt 0) {
    Write-Host "Warning: $edgeMissingTargetCount edge(s) have missing target nodes" -ForegroundColor Yellow
}

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
