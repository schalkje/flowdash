# Dashboard JSON Validation Script
# Validates dashboard JSON files and generates a markdown report

param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputFile = $null,
    
    [Parameter(Mandatory=$false)]
    [switch]$ErrorsOnly = $true
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
    if (-not $ErrorsOnly) {
        Write-Host "  ⚠ WARNING: $message" -ForegroundColor Yellow
        if ($path) {
            Write-Host "    Path: $path" -ForegroundColor Gray
        }
    }
}

# Function to add info
function Add-Info {
    param([string]$message)
    $script:validationResults.Info += $message
    Write-Host "  ℹ $message" -ForegroundColor Cyan
}

# Function to resolve a JSON property name case-insensitively
function Get-JsonPropertyName {
    param(
        [Parameter(Mandatory=$false)]
        $Object,

        [Parameter(Mandatory=$true)]
        [string]$Name
    )

    if ($null -eq $Object) {
        return $null
    }

    if ($Object -is [System.Collections.IDictionary]) {
        foreach ($key in $Object.Keys) {
            if ([string]$key -ceq $Name) {
                return [string]$key
            }
        }

        foreach ($key in $Object.Keys) {
            if ([string]$key -ieq $Name) {
                return [string]$key
            }
        }

        return $null
    }

    foreach ($property in $Object.PSObject.Properties) {
        if ($property.Name -ceq $Name) {
            return $property.Name
        }
    }

    foreach ($property in $Object.PSObject.Properties) {
        if ($property.Name -ieq $Name) {
            return $property.Name
        }
    }

    return $null
}

# Function to test whether a JSON property exists, ignoring casing
function Test-JsonProperty {
    param(
        [Parameter(Mandatory=$false)]
        $Object,

        [Parameter(Mandatory=$true)]
        [string]$Name
    )

    return $null -ne (Get-JsonPropertyName -Object $Object -Name $Name)
}

# Function to get JSON property metadata without losing collection shape
function Get-JsonPropertyInfo {
    param(
        [Parameter(Mandatory=$false)]
        $Object,

        [Parameter(Mandatory=$true)]
        [string]$Name
    )

    $actualName = Get-JsonPropertyName -Object $Object -Name $Name
    if ($null -eq $actualName) {
        return @{
            Exists = $false
            Name = $null
            Value = $null
            IsCollection = $false
        }
    }

    if ($Object -is [System.Collections.IDictionary]) {
        $value = $Object[$actualName]
    } else {
        $value = $Object.PSObject.Properties[$actualName].Value
    }

    $isCollection = ($value -is [System.Array]) -or ($value -is [System.Collections.IList] -and $value -isnot [string] -and $value -isnot [System.Collections.IDictionary])

    $propertyValue = $value
    if ($isCollection) {
        $propertyValue = [System.Collections.ArrayList]::new()
        foreach ($item in $value) {
            [void]$propertyValue.Add($item)
        }
    }

    return @{
        Exists = $true
        Name = $actualName
        Value = $propertyValue
        IsCollection = $isCollection
    }
}

# Function to get a JSON property value, ignoring casing
function Get-JsonPropertyValue {
    param(
        [Parameter(Mandatory=$false)]
        $Object,

        [Parameter(Mandatory=$true)]
        [string]$Name,

        [Parameter(Mandatory=$false)]
        $Default = $null
    )

    $propertyInfo = Get-JsonPropertyInfo -Object $Object -Name $Name
    if (-not $propertyInfo.Exists) {
        return $Default
    }

    return $propertyInfo.Value
}

# Function to check whether a value is an array/list-like JSON collection
function Test-IsJsonArray {
    param([Parameter(Mandatory=$false)]$Value)

    return ($Value -is [System.Array]) -or ($Value -is [System.Collections.IList] -and $Value -isnot [string])
}

# Function to normalize node types to the validator's canonical casing
function Normalize-NodeType {
    param([Parameter(Mandatory=$false)][string]$Type)

    if ([string]::IsNullOrWhiteSpace($Type)) {
        return $null
    }

    foreach ($validType in $script:validTypes.Keys) {
        if ($validType -ieq $Type) {
            return $validType
        }
    }

    return $Type
}

# Function to read a layout mode from either an object or a JSON string
function Get-NodeLayoutMode {
    param([Parameter(Mandatory=$false)]$Node)

    $layout = Get-JsonPropertyValue -Object $Node -Name 'layout'
    if ($null -eq $layout) {
        return $null
    }

    $layoutObject = $layout
    if ($layout -is [string]) {
        try {
            $layoutObject = $layout | ConvertFrom-Json -AsHashtable -ErrorAction Stop
        } catch {
            return $null
        }
    }

    return Get-JsonPropertyValue -Object $layoutObject -Name 'mode'
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
    $nodeLabel = Get-JsonPropertyValue -Object $node -Name 'label'
    $nodeId = Get-JsonPropertyValue -Object $node -Name 'id'
    $nodeTypeRaw = Get-JsonPropertyValue -Object $node -Name 'type'
    $nodeType = Normalize-NodeType -Type $nodeTypeRaw
    $childrenInfo = Get-JsonPropertyInfo -Object $node -Name 'children'
    $children = $childrenInfo.Value
    
    # Check for required properties
    if (-not (Test-JsonProperty -Object $node -Name 'label')) {
        Add-Error "Node missing 'label' property" $path
        $script:validationResults.MissingLabels += $path
    }
    
    if (-not (Test-JsonProperty -Object $node -Name 'id')) {
        Add-Error "Node missing 'id' property" "$path -> label: $nodeLabel"
        $script:validationResults.NodesWithoutId += $path
    } else {
        # Check for duplicate IDs
        if ($script:nodeIds.ContainsKey($nodeId)) {
            Add-Error "Duplicate node ID found: '$nodeId'" "$path -> $nodeId"
            $script:validationResults.DuplicateIds += $nodeId
        } else {
            $script:nodeIds[$nodeId] = $path
        }
    }
    
    # Track node label
    if ($nodeLabel) {
        if (-not $script:nodeLabels.ContainsKey($nodeLabel)) {
            $script:nodeLabels[$nodeLabel] = @()
        }
        $script:nodeLabels[$nodeLabel] += $path
    }
    
    if (-not $nodeType) {
        Add-Warning "Node has no 'type' property" "$path -> $nodeLabel"
    } elseif (-not $script:validTypes.ContainsKey($nodeType)) {
        Add-Warning "Unknown node type: '$nodeTypeRaw'" "$path -> $nodeLabel"
        $script:validationResults.InvalidTypes += @{
            Type = $nodeTypeRaw
            Path = $path
            Label = $nodeLabel
        }
    }
    
    # Validate children
    if ($childrenInfo.Exists -and $childrenInfo.IsCollection) {
        $childCount = $children.Count
        
        # Check if this node type should have children
        if ($nodeType -eq 'Node' -and $childCount -gt 0) {
            Add-Warning "Node type 'Node' should not have children (has $childCount)" "$path -> $nodeLabel"
        }
        
        # Validate nesting rules
        if ($nodeType -and $script:validTypes.ContainsKey($nodeType)) {
            $allowedChildTypes = $script:validTypes[$nodeType]
            
            foreach ($child in $children) {
                $childTypeRaw = Get-JsonPropertyValue -Object $child -Name 'type'
                $childType = if ($childTypeRaw) { Normalize-NodeType -Type $childTypeRaw } else { 'Unknown' }
                $childLabel = Get-JsonPropertyValue -Object $child -Name 'label' -Default 'No Label'
                $childPath = "$path -> $childLabel"
                
                # Check for invalid nesting (e.g., Foundation containing Foundation)
                if ($nodeType -eq 'Foundation' -and $childType -eq 'Foundation') {
                    Add-Error "Invalid nesting: Foundation node contains Foundation child" "$childPath (parent: $nodeLabel)"
                    $script:validationResults.InvalidNesting += @{
                        ParentType = $nodeType
                        ParentLabel = $nodeLabel
                        ParentPath = $path
                        ChildType = $childType
                        ChildLabel = $childLabel
                        ChildPath = $childPath
                        Issue = "Foundation cannot contain Foundation"
                    }
                } elseif ($nodeType -eq 'Adapter' -and $childType -eq 'Adapter') {
                    Add-Error "Invalid nesting: Adapter node contains Adapter child" "$childPath (parent: $nodeLabel)"
                    $script:validationResults.InvalidNesting += @{
                        ParentType = $nodeType
                        ParentLabel = $nodeLabel
                        ParentPath = $path
                        ChildType = $childType
                        ChildLabel = $childLabel
                        ChildPath = $childPath
                        Issue = "Adapter cannot contain Adapter"
                    }
                } elseif ($nodeType -eq 'Mart' -and $childType -eq 'Mart') {
                    Add-Error "Invalid nesting: Mart node contains Mart child" "$childPath (parent: $nodeLabel)"
                    $script:validationResults.InvalidNesting += @{
                        ParentType = $nodeType
                        ParentLabel = $nodeLabel
                        ParentPath = $path
                        ChildType = $childType
                        ChildLabel = $childLabel
                        ChildPath = $childPath
                        Issue = "Mart cannot contain Mart"
                    }
                } elseif ($nodeType -eq 'Foundation' -and $childType -ne 'Node') {
                    Add-Warning "Foundation should only contain Node children, found: $childType" "$childPath (parent: $nodeLabel)"
                } elseif ($nodeType -eq 'Adapter' -and $childType -ne 'Node') {
                    Add-Warning "Adapter should only contain Node children, found: $childType" "$childPath (parent: $nodeLabel)"
                } elseif ($nodeType -eq 'Mart' -and $childType -ne 'Node') {
                    Add-Warning "Mart should only contain Node children, found: $childType" "$childPath (parent: $nodeLabel)"
                }
                
                # Check if child type is allowed
                if ($allowedChildTypes.Count -gt 0 -and $childType -notin $allowedChildTypes -and $childType -ne 'Unknown') {
                    Add-Warning "Node type '$nodeType' should not contain child type '$childType'" "$childPath (parent: $nodeLabel)"
                }
                
                # Recursively validate child
                Validate-Node -node $child -path $childPath -depth ($depth + 1)
            }
            
            # Validate role requirements for Foundation, Mart, and Adapter
            if ($script:requiredRoles.ContainsKey($nodeType)) {
                $roleReq = $script:requiredRoles[$nodeType]
                $childCount = $children.Count
                
                # For Adapter nodes, check the mode from layout to determine required roles
                $expectedRoles = $roleReq.Roles
                $adapterMode = if ($nodeType -eq 'Adapter') { Get-NodeLayoutMode -Node $node } else { $null }
                if ($adapterMode) {
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
                
                # Check child count (adjust for Adapter mode)
                $minCount = if ($adapterMode -and $expectedRoles.Count -gt 0) { $expectedRoles.Count } else { $roleReq.MinCount }
                $maxCount = if ($adapterMode -and $expectedRoles.Count -gt 0) { $expectedRoles.Count } else { $roleReq.MaxCount }
                
                if ($childCount -gt $maxCount) {
                    $modeInfo = if ($adapterMode) { " (mode: '$adapterMode')" } else { "" }
                    Add-Error "$nodeType has too many children: found $childCount, maximum allowed is $maxCount$modeInfo" "$path -> $nodeLabel"
                }
                
                # Check roles
                $foundRoles = @()
                $missingRoles = @()
                $invalidRoles = @()
                
                foreach ($child in $children) {
                    $childRole = Get-JsonPropertyValue -Object $child -Name 'role'
                    $childCategory = Get-JsonPropertyValue -Object $child -Name 'category'
                    $childLabel = Get-JsonPropertyValue -Object $child -Name 'label' -Default 'No Label'
                    
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
                    Add-Error "$nodeType missing required child roles: $($missingRoles -join ', ')$modeInfo" "$path -> $nodeLabel"
                }
                
                # Check for duplicate roles
                $duplicateRoles = $foundRoles | Group-Object | Where-Object { $_.Count -gt 1 } | Select-Object -ExpandProperty Name
                if ($duplicateRoles) {
                    Add-Warning "$nodeType has duplicate child roles: $($duplicateRoles -join ', ')" "$path -> $nodeLabel"
                }
            }
        } else {
            # Node type is unknown, still validate children
            foreach ($child in $children) {
                $childLabel = Get-JsonPropertyValue -Object $child -Name 'label' -Default 'No Label'
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
        
        $hasSource = Test-JsonProperty -Object $edge -Name 'source'
        $hasTarget = Test-JsonProperty -Object $edge -Name 'target'
        $source = Get-JsonPropertyValue -Object $edge -Name 'source'
        $target = Get-JsonPropertyValue -Object $edge -Name 'target'
        
        # Check for required properties
        if (-not $hasSource) {
            Add-Error "Edge missing 'source' property"
        }
        
        if (-not $hasTarget) {
            Add-Error "Edge missing 'target' property"
        }
        
        # Check if source and target are different
        if ($hasSource -and $hasTarget -and $source -and $target) {
            if ($source -eq $target) {
                $nodePath = if ($script:nodeIds.ContainsKey($source)) { $script:nodeIds[$source] } else { "Unknown" }
                Add-Error "Edge has same source and target (self-loop): id='$source', path='$nodePath'"
                $script:validationResults.OrphanedEdges += "Self-loop: $source"
            }
        }
        
        # Check if source node ID exists
        if ($source) {
            if (-not $script:nodeIds.ContainsKey($source)) {
                Add-Error "Edge references non-existent source node ID: '$source'"
                $script:validationResults.OrphanedEdges += "Source ID: $source"
            }
        }
        
        # Check if target node ID exists
        if ($target) {
            if (-not $script:nodeIds.ContainsKey($target)) {
                Add-Error "Edge references non-existent target node ID: '$target'"
                $script:validationResults.OrphanedEdges += "Target ID: $target"
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
        foreach ($validationError in $script:validationResults.Errors) {
            $report += "### $($validationError.Message)`n`n"
            if ($validationError.Path) {
                $report += "**Path**: ``$($validationError.Path)```n`n"
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
- ✓ Every edge must have `source` and `target` properties (referencing node IDs)

### Nesting Rules
- ✓ **Foundation** nodes must have exactly 2 **Node** children with roles: 'raw' and 'base'
- ✓ **Adapter** nodes must have 1-3 **Node** children with roles: 'staging', 'archive', 'transform'
- ✓ **Mart** nodes must have exactly 2 **Node** children with roles: 'load' and 'report'
- ✓ **Node** types should not have children (leaf nodes)
- ✓ **Foundation** cannot contain **Foundation**
- ✓ **Adapter** cannot contain **Adapter**
- ✓ **Mart** cannot contain **Mart**

### Reference Integrity
- ✓ Edge `source` property must reference an existing node ID
- ✓ Edge `target` property must reference an existing node ID
- ✓ Edge source and target must be different (no self-loops)
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
- Remove edges that reference non-existent node IDs, or
- Add the missing nodes to the hierarchy
- Ensure edge `source` and `target` properties reference valid node `id` values

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
        $jsonContent = Get-Content $InputFile -Raw | ConvertFrom-Json -AsHashtable -ErrorAction Stop
        Add-Info "JSON is syntactically valid"
    } catch {
        Add-Error "JSON parsing failed: $_"
        Generate-MarkdownReport -outputPath $OutputFile
        exit 1
    }
    
    Write-Host "`nValidating structure..." -ForegroundColor Cyan
    
    # Validate settings
    if (-not (Test-JsonProperty -Object $jsonContent -Name 'settings')) {
        Add-Warning "Missing 'settings' object at root level"
    }
    
    # Validate nodes
    if (-not (Test-JsonProperty -Object $jsonContent -Name 'nodes')) {
        Add-Error "Missing 'nodes' array at root level"
    } else {
        $rootNodesInfo = Get-JsonPropertyInfo -Object $jsonContent -Name 'nodes'
        $rootNodes = $rootNodesInfo.Value
        if (-not $rootNodesInfo.IsCollection) {
            Add-Error "'nodes' property must be an array"
        } else {
            Add-Info "Found $($rootNodes.Count) root node(s)"
            
            foreach ($node in $rootNodes) {
                $nodeLabel = Get-JsonPropertyValue -Object $node -Name 'label' -Default 'No Label'
                Validate-Node -node $node -path $nodeLabel
            }
        }
    }
    
    # Validate edges
    if (Test-JsonProperty -Object $jsonContent -Name 'edges') {
        $rootEdgesInfo = Get-JsonPropertyInfo -Object $jsonContent -Name 'edges'
        $rootEdges = $rootEdgesInfo.Value
        if (-not $rootEdgesInfo.IsCollection) {
            Add-Warning "'edges' property should be an array"
        } else {
            Add-Info "Found $($rootEdges.Count) edge(s)"
            Validate-Edges -edges $rootEdges
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
    
    # Show warning breakdown if ErrorsOnly and warnings exist
    if ($ErrorsOnly -and $script:validationResults.Warnings.Count -gt 0) {
        Write-Host "`nWarning Summary (use without -ErrorsOnly to see details):" -ForegroundColor Yellow
        $warningsByType = $script:validationResults.Warnings | Group-Object -Property Message
        foreach ($group in $warningsByType) {
            Write-Host "  - $($group.Name): $($group.Count) occurrence(s)" -ForegroundColor Yellow
        }
    }
    
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
