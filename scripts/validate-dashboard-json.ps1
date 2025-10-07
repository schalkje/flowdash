# Dashboard JSON Validation Script
# Validates dashboard JSON files and generates a markdown report

param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputFile = $null
)

# If no output file specified, use input file with .validation.md extension
if (-not $OutputFile) {
    $OutputFile = $InputFile -replace '\.(fixed\.)?json$', '.validation.md'
}

Write-Host "Validating JSON file: $InputFile" -ForegroundColor Cyan
Write-Host "Output will be written to: $OutputFile" -ForegroundColor Cyan

# Initialize validation results
$script:validationResults = @{
    Errors = @()
    Warnings = @()
    Info = @()
    NodeCount = 0
    EdgeCount = 0
    NodesWithoutId = @()
    DuplicateIds = @()
    InvalidNesting = @()
    OrphanedEdges = @()
    MissingLabels = @()
    InvalidTypes = @()
}

$script:nodeIds = @{}
$script:nodeLabels = @{}
$script:nodeTypeHierarchy = @{}

# Valid node types and their allowed children
$script:validTypes = @{
    'Columns' = @('Lane', 'Columns', 'Foundation', 'Adapter', 'Mart', 'Node')
    'Lane' = @('Lane', 'Columns', 'Foundation', 'Adapter', 'Mart', 'Node')
    'Foundation' = @('Node')  # Foundation should only contain Node children
    'Adapter' = @('Node')     # Adapter should only contain Node children
    'Mart' = @('Node')        # Mart contains exactly 2 Node children (load, report)
    'Node' = @()              # Node should have no children (leaf nodes)
}

# Required roles for specific container types
$script:requiredRoles = @{
    'Foundation' = @{
        Roles = @('raw', 'base')
        MinCount = 2
        MaxCount = 2
        Description = "Foundation must have exactly 2 Node children: 'raw' and 'base'"
    }
    'Mart' = @{
        Roles = @('load', 'report')
        MinCount = 2
        MaxCount = 2
        Description = "Mart must have exactly 2 Node children: 'load' and 'report'"
    }
    'Adapter' = @{
        Roles = @('staging', 'archive', 'transform')
        MinCount = 1
        MaxCount = 3
        Description = "Adapter must have 1-3 Node children with roles: 'staging', 'archive', 'transform'"
    }
}

# Function to add error
function Add-Error {
    param([string]$message, [string]$path = "")
    $script:validationResults.Errors += @{
        Message = $message
        Path = $path
        Severity = "Error"
    }
    Write-Host "  ✗ ERROR: $message" -ForegroundColor Red
    if ($path) {
        Write-Host "    Path: $path" -ForegroundColor Gray
    }
}

# Function to add warning
function Add-Warning {
    param([string]$message, [string]$path = "")
    $script:validationResults.Warnings += @{
        Message = $message
        Path = $path
        Severity = "Warning"
    }
    Write-Host "  ⚠ WARNING: $message" -ForegroundColor Yellow
    if ($path) {
        Write-Host "    Path: $path" -ForegroundColor Gray
    }
}

# Function to add info
function Add-Info {
    param([string]$message)
    $script:validationResults.Info += $message
    Write-Host "  ℹ $message" -ForegroundColor Cyan
}

# Function to validate node recursively
function Validate-Node {
    param(
        [Parameter(Mandatory=$true)]
        $node,
        
        [Parameter(Mandatory=$false)]
        [string]$path = "root",
        
        [Parameter(Mandatory=$false)]
        [int]$depth = 0
    )
    
    $script:validationResults.NodeCount++
    
    # Check for required properties
    if (-not $node.PSObject.Properties['label']) {
        Add-Error "Node missing 'label' property" $path
        $script:validationResults.MissingLabels += $path
    }
    
    if (-not $node.PSObject.Properties['id']) {
        Add-Error "Node missing 'id' property" "$path -> label: $($node.label)"
        $script:validationResults.NodesWithoutId += $path
    } else {
        # Check for duplicate IDs
        if ($script:nodeIds.ContainsKey($node.id)) {
            Add-Error "Duplicate node ID found: '$($node.id)'" "$path -> $($node.id)"
            $script:validationResults.DuplicateIds += $node.id
        } else {
            $script:nodeIds[$node.id] = $path
        }
    }
    
    # Track node label
    if ($node.label) {
        if (-not $script:nodeLabels.ContainsKey($node.label)) {
            $script:nodeLabels[$node.label] = @()
        }
        $script:nodeLabels[$node.label] += $path
    }
    
    # Validate node type
    $nodeType = if ($node.PSObject.Properties['type']) { $node.type } else { $null }
    
    if (-not $nodeType) {
        Add-Warning "Node has no 'type' property" "$path -> $($node.label)"
    } elseif (-not $script:validTypes.ContainsKey($nodeType)) {
        Add-Warning "Unknown node type: '$nodeType'" "$path -> $($node.label)"
        $script:validationResults.InvalidTypes += @{
            Type = $nodeType
            Path = $path
            Label = $node.label
        }
    }
    
    # Validate children
    if ($node.PSObject.Properties['children'] -and $node.children -is [Array]) {
        $childCount = $node.children.Count
        
        # Check if this node type should have children
        if ($nodeType -eq 'Node' -and $childCount -gt 0) {
            Add-Warning "Node type 'Node' should not have children (has $childCount)" "$path -> $($node.label)"
        }
        
        # Validate nesting rules
        if ($nodeType -and $script:validTypes.ContainsKey($nodeType)) {
            $allowedChildTypes = $script:validTypes[$nodeType]
            
            foreach ($child in $node.children) {
                $childType = if ($child.PSObject.Properties['type']) { $child.type } else { 'Unknown' }
                $childLabel = if ($child.PSObject.Properties['label']) { $child.label } else { 'No Label' }
                $childPath = "$path -> $childLabel"
                
                # Check for invalid nesting (e.g., Foundation containing Foundation)
                if ($nodeType -eq 'Foundation' -and $childType -eq 'Foundation') {
                    Add-Error "Invalid nesting: Foundation node contains Foundation child" "$childPath (parent: $($node.label))"
                    $script:validationResults.InvalidNesting += @{
                        ParentType = $nodeType
                        ParentLabel = $node.label
                        ParentPath = $path
                        ChildType = $childType
                        ChildLabel = $childLabel
                        ChildPath = $childPath
                        Issue = "Foundation cannot contain Foundation"
                    }
                } elseif ($nodeType -eq 'Adapter' -and $childType -eq 'Adapter') {
                    Add-Error "Invalid nesting: Adapter node contains Adapter child" "$childPath (parent: $($node.label))"
                    $script:validationResults.InvalidNesting += @{
                        ParentType = $nodeType
                        ParentLabel = $node.label
                        ParentPath = $path
                        ChildType = $childType
                        ChildLabel = $childLabel
                        ChildPath = $childPath
                        Issue = "Adapter cannot contain Adapter"
                    }
                } elseif ($nodeType -eq 'Mart' -and $childType -eq 'Mart') {
                    Add-Error "Invalid nesting: Mart node contains Mart child" "$childPath (parent: $($node.label))"
                    $script:validationResults.InvalidNesting += @{
                        ParentType = $nodeType
                        ParentLabel = $node.label
                        ParentPath = $path
                        ChildType = $childType
                        ChildLabel = $childLabel
                        ChildPath = $childPath
                        Issue = "Mart cannot contain Mart"
                    }
                } elseif ($nodeType -eq 'Foundation' -and $childType -ne 'Node') {
                    Add-Warning "Foundation should only contain Node children, found: $childType" "$childPath (parent: $($node.label))"
                } elseif ($nodeType -eq 'Adapter' -and $childType -ne 'Node') {
                    Add-Warning "Adapter should only contain Node children, found: $childType" "$childPath (parent: $($node.label))"
                } elseif ($nodeType -eq 'Mart' -and $childType -ne 'Node') {
                    Add-Warning "Mart should only contain Node children, found: $childType" "$childPath (parent: $($node.label))"
                }
                
                # Check if child type is allowed
                if ($allowedChildTypes.Count -gt 0 -and $childType -notin $allowedChildTypes -and $childType -ne 'Unknown') {
                    Add-Warning "Node type '$nodeType' should not contain child type '$childType'" "$childPath (parent: $($node.label))"
                }
                
                # Recursively validate child
                Validate-Node -node $child -path $childPath -depth ($depth + 1)
            }
            
            # Validate role requirements for Foundation, Mart, and Adapter
            if ($script:requiredRoles.ContainsKey($nodeType)) {
                $roleReq = $script:requiredRoles[$nodeType]
                $childCount = $node.children.Count
                
                # For Adapter nodes, check the mode from layout to determine required roles
                $expectedRoles = $roleReq.Roles
                $adapterMode = $null
                if ($nodeType -eq 'Adapter' -and $node.PSObject.Properties['layout'] -and $node.layout) {
                    try {
                        $layoutObj = $node.layout | ConvertFrom-Json -ErrorAction SilentlyContinue
                        if ($layoutObj -and $layoutObj.PSObject.Properties['mode']) {
                            $adapterMode = $layoutObj.mode
                            
                            # Adjust expected roles based on mode
                            switch ($adapterMode) {
                                'staging-archive' {
                                    $expectedRoles = @('staging', 'archive')
                                }
                                'staging-transform' {
                                    $expectedRoles = @('staging', 'transform')
                                }
                                'archive-only' {
                                    $expectedRoles = @('archive')
                                }
                                # 'full' or default: use all three roles (staging, archive, transform)
                            }
                        }
                    } catch {
                        # If layout parsing fails, use default roles
                    }
                }
                
                # Check child count (adjust for Adapter mode)
                $minCount = if ($adapterMode -and $expectedRoles.Count -gt 0) { $expectedRoles.Count } else { $roleReq.MinCount }
                $maxCount = if ($adapterMode -and $expectedRoles.Count -gt 0) { $expectedRoles.Count } else { $roleReq.MaxCount }
                
                if ($childCount -lt $minCount) {
                    $modeInfo = if ($adapterMode) { " (mode: '$adapterMode')" } else { "" }
                    Add-Error "$nodeType has too few children: found $childCount, minimum required is $minCount$modeInfo" "$path -> $($node.label)"
                } elseif ($childCount -gt $maxCount) {
                    $modeInfo = if ($adapterMode) { " (mode: '$adapterMode')" } else { "" }
                    Add-Error "$nodeType has too many children: found $childCount, maximum allowed is $maxCount$modeInfo" "$path -> $($node.label)"
                }
                
                # Check roles
                $foundRoles = @()
                $missingRoles = @()
                $invalidRoles = @()
                
                foreach ($child in $node.children) {
                    $childRole = if ($child.PSObject.Properties['role']) { $child.role } else { $null }
                    $childCategory = if ($child.PSObject.Properties['category']) { $child.category } else { $null }
                    $childLabel = if ($child.PSObject.Properties['label']) { $child.label } else { 'No Label' }
                    
                    # Determine effective role (prefer 'role' property, fallback to 'category')
                    $effectiveRole = if ($childRole) { $childRole.ToLower() } elseif ($childCategory) { $childCategory.ToLower() } else { $null }
                    
                    # Check if role can be inferred from label (fallback logic from the node implementations)
                    $inferredRole = $null
                    if (-not $effectiveRole -or $effectiveRole -eq 'unknown') {
                        $lowerLabel = $childLabel.ToLower()
                        
                        switch ($nodeType) {
                            'Foundation' {
                                # Foundation: checks for "raw." or "raw" in label, "base." or "base" in label
                                if ($lowerLabel.Contains('raw.') -or $lowerLabel.Contains('raw')) {
                                    $inferredRole = 'raw'
                                } elseif ($lowerLabel.Contains('base.') -or $lowerLabel.Contains('base')) {
                                    $inferredRole = 'base'
                                }
                            }
                            'Adapter' {
                                # Adapter: checks for role keywords in label
                                if ($lowerLabel.Contains('staging') -or $lowerLabel.Contains('stg')) {
                                    $inferredRole = 'staging'
                                } elseif ($lowerLabel.Contains('archive') -or $lowerLabel.Contains('arc')) {
                                    $inferredRole = 'archive'
                                } elseif ($lowerLabel.Contains('transform') -or $lowerLabel.Contains('tfm')) {
                                    $inferredRole = 'transform'
                                }
                            }
                            'Mart' {
                                # Mart: checks for "load" or "report"/"rprt" in label
                                if ($lowerLabel.Contains('load')) {
                                    $inferredRole = 'load'
                                } elseif ($lowerLabel.Contains('report') -or $lowerLabel.Contains('rprt')) {
                                    $inferredRole = 'report'
                                }
                            }
                        }
                    }
                    
                    # Use inferred role if available, otherwise use effective role
                    $finalRole = if ($inferredRole) { $inferredRole } else { $effectiveRole }
                    
                    if ($finalRole) {
                        # Case-insensitive comparison (use mode-adjusted roles for Adapter)
                        if ($expectedRoles -contains $finalRole.ToLower()) {
                            $foundRoles += $finalRole.ToLower()
                            
                            # If role was inferred (not explicitly set), give a warning
                            if ($inferredRole -and (-not $effectiveRole -or $effectiveRole -eq 'unknown')) {
                                Add-Warning "$nodeType child missing explicit 'role' or 'category', but can infer '$inferredRole' from label" "$path -> $childLabel"
                            }
                        } else {
                            $invalidRoles += @{
                                Role = $finalRole
                                Label = $childLabel
                            }
                            $modeInfo = if ($adapterMode) { " [mode: '$adapterMode']" } else { "" }
                            if ($inferredRole) {
                                Add-Warning "$nodeType child has invalid role '$effectiveRole', inferred '$inferredRole' from label but it's not in expected roles ($($expectedRoles -join ', '))$modeInfo" "$path -> $childLabel"
                            } else {
                                Add-Warning "$nodeType child has invalid role '$effectiveRole': expected one of ($($expectedRoles -join ', '))$modeInfo" "$path -> $childLabel"
                            }
                        }
                    } else {
                        # Cannot infer role at all - this is an error
                        Add-Error "$nodeType child missing 'role' or 'category' and cannot infer from label" "$path -> $childLabel"
                    }
                }
                
                # Check for missing required roles (case-insensitive, use mode-adjusted roles)
                foreach ($reqRole in $expectedRoles) {
                    if ($foundRoles -notcontains $reqRole.ToLower()) {
                        $missingRoles += $reqRole
                    }
                }
                
                if ($missingRoles.Count -gt 0) {
                    $modeInfo = if ($adapterMode) { " [mode: '$adapterMode']" } else { "" }
                    Add-Error "$nodeType missing required child roles: $($missingRoles -join ', ')$modeInfo" "$path -> $($node.label)"
                }
                
                # Check for duplicate roles
                $duplicateRoles = $foundRoles | Group-Object | Where-Object { $_.Count -gt 1 } | Select-Object -ExpandProperty Name
                if ($duplicateRoles) {
                    Add-Warning "$nodeType has duplicate child roles: $($duplicateRoles -join ', ')" "$path -> $($node.label)"
                }
            }
        } else {
            # Node type is unknown, still validate children
            foreach ($child in $node.children) {
                $childLabel = if ($child.PSObject.Properties['label']) { $child.label } else { 'No Label' }
                Validate-Node -node $child -path "$path -> $childLabel" -depth ($depth + 1)
            }
        }
    }
}

# Function to validate edges
function Validate-Edges {
    param([array]$edges)
    
    foreach ($edge in $edges) {
        $script:validationResults.EdgeCount++
        
        if (-not $edge.PSObject.Properties['sourceName']) {
            Add-Error "Edge missing 'sourceName' property"
        }
        
        if (-not $edge.PSObject.Properties['targetName']) {
            Add-Error "Edge missing 'targetName' property"
        }
        
        # Check if source and target nodes exist
        if ($edge.sourceName) {
            if (-not $script:nodeLabels.ContainsKey($edge.sourceName)) {
                Add-Warning "Edge references non-existent source node: '$($edge.sourceName)'"
                $script:validationResults.OrphanedEdges += "Source: $($edge.sourceName)"
            }
        }
        
        if ($edge.targetName) {
            if (-not $script:nodeLabels.ContainsKey($edge.targetName)) {
                Add-Warning "Edge references non-existent target node: '$($edge.targetName)'"
                $script:validationResults.OrphanedEdges += "Target: $($edge.targetName)"
            }
        }
    }
}

# Function to generate markdown report
function Generate-MarkdownReport {
    param([string]$outputPath)
    
    $report = @"
# Dashboard JSON Validation Report

**File**: ``$InputFile``  
**Generated**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## Summary

| Metric | Count |
|--------|-------|
| Total Nodes | $($script:validationResults.NodeCount) |
| Total Edges | $($script:validationResults.EdgeCount) |
| Errors | $($script:validationResults.Errors.Count) |
| Warnings | $($script:validationResults.Warnings.Count) |
| Unique Node IDs | $($script:nodeIds.Count) |
| Unique Node Labels | $($script:nodeLabels.Count) |

---

"@

    # Overall status
    if ($script:validationResults.Errors.Count -eq 0 -and $script:validationResults.Warnings.Count -eq 0) {
        $report += @"
## ✅ Validation Status: **PASSED**

All validation checks passed successfully! The JSON file is valid and ready to use.

"@
    } elseif ($script:validationResults.Errors.Count -eq 0) {
        $report += @"
## ⚠️ Validation Status: **PASSED WITH WARNINGS**

The JSON file is valid but has some warnings that should be reviewed.

"@
    } else {
        $report += @"
## ❌ Validation Status: **FAILED**

The JSON file has errors that must be fixed before it can be used.

"@
    }
    
    # Errors section
    if ($script:validationResults.Errors.Count -gt 0) {
        $report += @"

---

## ❌ Errors ($($script:validationResults.Errors.Count))

The following errors must be fixed:

"@
        foreach ($error in $script:validationResults.Errors) {
            $report += "### $($error.Message)`n`n"
            if ($error.Path) {
                $report += "**Path**: ``$($error.Path)```n`n"
            }
        }
    }
    
    # Invalid nesting details
    if ($script:validationResults.InvalidNesting.Count -gt 0) {
        $report += @"

### Invalid Nesting Details

| Parent Type | Parent Label | Child Type | Child Label | Issue |
|-------------|--------------|------------|-------------|-------|

"@
        foreach ($nesting in $script:validationResults.InvalidNesting) {
            $report += "| $($nesting.ParentType) | $($nesting.ParentLabel) | $($nesting.ChildType) | $($nesting.ChildLabel) | $($nesting.Issue) |`n"
        }
        $report += "`n"
    }
    
    # Warnings section
    if ($script:validationResults.Warnings.Count -gt 0) {
        $report += @"

---

## ⚠️ Warnings ($($script:validationResults.Warnings.Count))

The following warnings should be reviewed:

"@
        # Group warnings by type
        $warningsByType = $script:validationResults.Warnings | Group-Object -Property Message
        
        foreach ($group in $warningsByType) {
            $report += "### $($group.Name) ($($group.Count) occurrences)`n`n"
            
            # Show first 10 examples
            $examples = $group.Group | Select-Object -First 10
            foreach ($warning in $examples) {
                if ($warning.Path) {
                    $report += "- ``$($warning.Path)```n"
                }
            }
            
            if ($group.Count -gt 10) {
                $report += "`n... and $($group.Count - 10) more`n"
            }
            $report += "`n"
        }
    }
    
    # Duplicate labels info
    $duplicateLabels = $script:nodeLabels.GetEnumerator() | Where-Object { $_.Value.Count -gt 1 }
    if ($duplicateLabels) {
        $report += @"

---

## 📋 Duplicate Labels

The following labels are used by multiple nodes:

| Label | Count | Note |
|-------|-------|------|

"@
        foreach ($dup in $duplicateLabels) {
            $note = if ($dup.Value.Count -gt 5) { "Many duplicates" } else { "OK - Different paths" }
            $report += "| $($dup.Key) | $($dup.Value.Count) | $note |`n"
        }
        $report += "`n> **Note**: Duplicate labels are allowed if they appear in different paths of the hierarchy.`n`n"
    }
    
    # Node type distribution
    $report += @"

---

## 📊 Node Type Distribution

"@
    $typeStats = @{}
    foreach ($id in $script:nodeIds.Keys) {
        # This is a simplified count - in a real scenario we'd track types during validation
    }
    
    $report += @"

| Type | Expected Children | Role Requirements |
|------|-------------------|-------------------|
| Columns | Lane, Columns, Foundation, Adapter, Mart, Node | N/A |
| Lane | Lane, Columns, Foundation, Adapter, Mart, Node | N/A |
| Foundation | Node only | Exactly 2: 'raw', 'base' |
| Adapter | Node only | 1-3 from: 'staging', 'archive', 'transform' |
| Mart | Node only | Exactly 2: 'load', 'report' |
| Node | None (leaf) | N/A |

"@
    
    # Validation rules
    $report += @"

---

## 📋 Validation Rules Applied

### Required Properties
- ✓ Every node must have an `id` property
- ✓ Every node must have a `label` property
- ✓ Every node should have a `type` property
- ✓ Every edge must have `sourceName` and `targetName`

### Nesting Rules
- ✓ **Foundation** nodes must have exactly 2 **Node** children with roles: 'raw' and 'base'
- ✓ **Adapter** nodes must have 1-3 **Node** children with roles: 'staging', 'archive', 'transform'
- ✓ **Mart** nodes must have exactly 2 **Node** children with roles: 'load' and 'report'
- ✓ **Node** types should not have children (leaf nodes)
- ✓ **Foundation** cannot contain **Foundation**
- ✓ **Adapter** cannot contain **Adapter**
- ✓ **Mart** cannot contain **Mart**

### Reference Integrity
- ✓ Edge source and target nodes must exist in the node hierarchy
- ✓ Node IDs must be unique across the entire file

---

## 🔧 How to Fix Issues

### Missing IDs
Run the `add-node-ids.ps1` script to automatically add IDs:
``````powershell
.\scripts\add-node-ids.ps1 -InputFile "$InputFile"
``````

### Invalid Nesting
Manually restructure the JSON to follow the nesting rules:
- Move Foundation children out of Foundation parents
- Ensure Adapter nodes only contain Node children
- Verify Node types don't have children

### Orphaned Edges
- Remove edges that reference non-existent nodes, or
- Add the missing nodes to the hierarchy

"@
    
    # Write report
    $report | Set-Content $outputPath -Encoding UTF8
    Write-Host "`nValidation report written to: $outputPath" -ForegroundColor Green
}

# Main validation process
try {
    # Check if file exists
    if (-not (Test-Path $InputFile)) {
        Write-Host "Error: File not found: $InputFile" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`nReading JSON file..." -ForegroundColor Cyan
    
    # Try to parse JSON
    try {
        $jsonContent = Get-Content $InputFile -Raw | ConvertFrom-Json
        Add-Info "JSON is syntactically valid"
    } catch {
        Add-Error "JSON parsing failed: $_"
        Generate-MarkdownReport -outputPath $OutputFile
        exit 1
    }
    
    Write-Host "`nValidating structure..." -ForegroundColor Cyan
    
    # Validate settings
    if (-not $jsonContent.PSObject.Properties['settings']) {
        Add-Warning "Missing 'settings' object at root level"
    }
    
    # Validate nodes
    if (-not $jsonContent.PSObject.Properties['nodes']) {
        Add-Error "Missing 'nodes' array at root level"
    } else {
        if ($jsonContent.nodes -isnot [Array]) {
            Add-Error "'nodes' property must be an array"
        } else {
            Add-Info "Found $($jsonContent.nodes.Count) root node(s)"
            
            foreach ($node in $jsonContent.nodes) {
                $nodeLabel = if ($node.PSObject.Properties['label']) { $node.label } else { 'No Label' }
                Validate-Node -node $node -path $nodeLabel
            }
        }
    }
    
    # Validate edges
    if ($jsonContent.PSObject.Properties['edges']) {
        if ($jsonContent.edges -isnot [Array]) {
            Add-Warning "'edges' property should be an array"
        } else {
            Add-Info "Found $($jsonContent.edges.Count) edge(s)"
            Validate-Edges -edges $jsonContent.edges
        }
    }
    
    # Generate report
    Write-Host "`nGenerating validation report..." -ForegroundColor Cyan
    Generate-MarkdownReport -outputPath $OutputFile
    
    # Summary
    Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
    Write-Host "Validation Summary:" -ForegroundColor Cyan
    Write-Host "  Nodes processed: $($script:validationResults.NodeCount)" -ForegroundColor White
    Write-Host "  Edges processed: $($script:validationResults.EdgeCount)" -ForegroundColor White
    Write-Host "  Errors found: $($script:validationResults.Errors.Count)" -ForegroundColor $(if ($script:validationResults.Errors.Count -eq 0) { "Green" } else { "Red" })
    Write-Host "  Warnings found: $($script:validationResults.Warnings.Count)" -ForegroundColor $(if ($script:validationResults.Warnings.Count -eq 0) { "Green" } else { "Yellow" })
    Write-Host ("=" * 60) -ForegroundColor Gray
    
    if ($script:validationResults.Errors.Count -eq 0) {
        Write-Host "`n✓ Validation completed successfully!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "`n✗ Validation found errors that must be fixed" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "`nUnexpected error during validation: $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}
