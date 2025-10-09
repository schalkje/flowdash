# Script to add unique IDs to all nodes in a dashboard JSON file
param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile
)

# Check if file exists
if (-not (Test-Path $InputFile)) {
    Write-Host "Error: File not found: $InputFile" -ForegroundColor Red
    exit 1
}

# Create backup filename
$BackupFile = $InputFile -replace '\.json$', '.backup.json'

Write-Host "Reading JSON file: $InputFile" -ForegroundColor Cyan

# Read and parse JSON
$jsonContent = Get-Content $InputFile -Raw | ConvertFrom-Json

# Counter for generating unique IDs
$script:idCounter = 1
$script:labelToIdMap = @{

}

# Function to get next unique integer ID
function Get-NextId {
    $id = $script:idCounter
    $script:idCounter++
    return $id
}

# Function to recursively add IDs to nodes
function Add-NodeIds {
    param(
        [Parameter(Mandatory=$true)]
        $node,
        
        [Parameter(Mandatory=$false)]
        [int]$depth = 0
    )
    
    # Add ID if missing or convert string ID to integer
    if (-not $node.PSObject.Properties['id']) {
        $newId = Get-NextId
        $node | Add-Member -MemberType NoteProperty -Name 'id' -Value $newId
        Write-Host ("  " * $depth) "Added ID $newId to node: $($node.label)" -ForegroundColor Green
    } elseif ($node.id -is [string]) {
        # Convert string ID to integer
        $newId = Get-NextId
        $node.id = $newId
        Write-Host ("  " * $depth) "Converted string ID to integer $newId for node: $($node.label)" -ForegroundColor Yellow
    } else {
        # Ensure existing ID is integer and update counter
        $node.id = [int]$node.id
        if ($node.id -ge $script:idCounter) {
            $script:idCounter = $node.id + 1
        }
        Write-Host ("  " * $depth) "Node already has ID $($node.id): $($node.label)" -ForegroundColor Gray
    }
    
    # Map label to ID for edge processing
    if ($node.label -and $node.id) {
        $script:labelToIdMap[$node.label] = [int]$node.id
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
Write-Host "Total labels mapped to IDs: $($script:labelToIdMap.Count)" -ForegroundColor Cyan
Write-Host "Next available ID: $script:idCounter" -ForegroundColor Cyan

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
                $sourceId = [int]$script:labelToIdMap[$edge.sourceName]
                
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
                $targetId = [int]$script:labelToIdMap[$edge.targetName]
                
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

# Create backup of original file
Write-Host "`nCreating backup: $BackupFile" -ForegroundColor Cyan
Copy-Item -Path $InputFile -Destination $BackupFile -Force

# Write output to original filename
Write-Host "Writing changes to: $InputFile" -ForegroundColor Cyan
$jsonContent | ConvertTo-Json -Depth 100 | Set-Content $InputFile -Encoding UTF8

Write-Host "`nDone! Updated JSON saved to: $InputFile" -ForegroundColor Green
Write-Host "Original file backed up to: $BackupFile" -ForegroundColor Gray

# Validate the output
Write-Host "`nValidating output JSON..." -ForegroundColor Cyan
try {
    Get-Content $InputFile -Raw | ConvertFrom-Json | Out-Null
    Write-Host "✓ Output JSON is valid!" -ForegroundColor Green
} catch {
    Write-Host "✗ Output JSON is invalid: $_" -ForegroundColor Red
    Write-Host "Restoring from backup..." -ForegroundColor Yellow
    Copy-Item -Path $BackupFile -Destination $InputFile -Force
    Write-Host "Original file restored from backup" -ForegroundColor Yellow
}
