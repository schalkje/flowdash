# Dashboard JSON Validation Report

**File**: `.\dashboard\data\dwh-6.fixed.json`  
**Generated**: 2025-10-07 08:46:26

---

## Summary

| Metric | Count |
|--------|-------|
| Total Nodes | 0 |
| Total Edges | 35 |
| Errors | 76 |
| Warnings | 0 |
| Unique Node IDs | 0 |
| Unique Node Labels | 0 |

---
## ❌ Validation Status: **FAILED**

The JSON file has errors that must be fixed before it can be used.

---

## ❌ Errors (76)

The following errors must be fixed:
### 'nodes' property must be an array

### Edge references non-existent source node ID: 'odsklt'

### Edge references non-existent target node ID: 'dwh1'

### Edge references non-existent source node ID: 'odsprd_bel'

### Edge references non-existent target node ID: 'dwh1'

### Edge references non-existent source node ID: 'odsprd_spr'

### Edge references non-existent target node ID: 'dwh1'

### Edge references non-existent source node ID: 'odsklt'

### Edge references non-existent target node ID: 'dwh2'

### Edge references non-existent source node ID: 'odsprd_bel'

### Edge references non-existent target node ID: 'dwh2'

### Edge references non-existent source node ID: 'odsprd_spr'

### Edge references non-existent target node ID: 'dwh2'

### Edge references non-existent source node ID: 'odsklt'

### Edge references non-existent target node ID: 'dwh3'

### Edge references non-existent source node ID: 'odsprd_bel'

### Edge references non-existent target node ID: 'dwh3'

### Edge references non-existent source node ID: 'odsprd_spr'

### Edge references non-existent target node ID: 'dwh3'

### Edge references non-existent source node ID: 'odsklt'

### Edge references non-existent target node ID: 'dwh4'

### Edge references non-existent source node ID: 'odsprd_bel'

### Edge references non-existent target node ID: 'dwh4'

### Edge references non-existent source node ID: 'odsprd_spr'

### Edge references non-existent target node ID: 'dwh4'

### Edge references non-existent source node ID: 'odsklt'

### Edge references non-existent target node ID: 'dwh5'

### Edge references non-existent source node ID: 'odsprd_bel'

### Edge references non-existent target node ID: 'dwh5'

### Edge references non-existent source node ID: 'odsprd_spr'

### Edge references non-existent target node ID: 'dwh5'

### Edge references non-existent source node ID: 'odsklt'

### Edge references non-existent target node ID: 'dwh6'

### Edge references non-existent source node ID: 'odsprd_bel'

### Edge references non-existent target node ID: 'dwh6'

### Edge references non-existent source node ID: 'odsprd_spr'

### Edge references non-existent target node ID: 'dwh6'

### Edge has same source and target (self-loop): source='bam-1', target='bam-1'

### Edge references non-existent source node ID: 'bam-1'

### Edge references non-existent target node ID: 'bam-1'

### Edge references non-existent source node ID: 'bam-1'

### Edge references non-existent target node ID: 'transform-fidor-1'

### Edge references non-existent source node ID: 'btm-1'

### Edge references non-existent target node ID: 'transform-fidor-1'

### Edge has same source and target (self-loop): source='btm-1', target='btm-1'

### Edge references non-existent source node ID: 'btm-1'

### Edge references non-existent target node ID: 'btm-1'

### Edge references non-existent source node ID: 'ban-1'

### Edge references non-existent target node ID: 'transform-fidor-1'

### Edge references non-existent source node ID: 'btr-1'

### Edge references non-existent target node ID: 'transform-fidor-1'

### Edge references non-existent source node ID: 'fos-1'

### Edge references non-existent target node ID: 'transform-fidor-1'

### Edge references non-existent source node ID: 'em_calcasa'

### Edge references non-existent target node ID: 'crf'

### Edge references non-existent source node ID: 'em_calcasa'

### Edge references non-existent target node ID: 'cal'

### Edge references non-existent source node ID: 'em_csd'

### Edge references non-existent target node ID: 'csd-belgium'

### Edge references non-existent source node ID: 'em_csd'

### Edge references non-existent target node ID: 'csd-netherlands'

### Edge references non-existent source node ID: 'em_belgie'

### Edge references non-existent target node ID: 'cap2-daily'

### Edge references non-existent source node ID: 'em_belgie'

### Edge references non-existent target node ID: 'cap2-half-yearly'

### Edge has same source and target (self-loop): source='fos-1', target='fos-1'

### Edge references non-existent source node ID: 'fos-1'

### Edge references non-existent target node ID: 'fos-1'

### Edge has same source and target (self-loop): source='btr-1', target='btr-1'

### Edge references non-existent source node ID: 'btr-1'

### Edge references non-existent target node ID: 'btr-1'

### Edge has same source and target (self-loop): source='ban-1', target='ban-1'

### Edge references non-existent source node ID: 'ban-1'

### Edge references non-existent target node ID: 'ban-1'

### Edge references non-existent source node ID: 'staging_quionqin-monthly'

### Edge references non-existent target node ID: 'stg_archive_quionqin'


---

## 📊 Node Type Distribution

| Type | Expected Children | Role Requirements |
|------|-------------------|-------------------|
| Columns | Lane, Columns, Foundation, Adapter, Mart, Node | N/A |
| Lane | Lane, Columns, Foundation, Adapter, Mart, Node | N/A |
| Foundation | Node only | Exactly 2: 'raw', 'base' |
| Adapter | Node only | 1-3 from: 'staging', 'archive', 'transform' |
| Mart | Node only | Exactly 2: 'load', 'report' |
| Node | None (leaf) | N/A |

---

## 📋 Validation Rules Applied

### Required Properties
- ✓ Every node must have an id property
- ✓ Every node must have a label property
- ✓ Every node should have a 	ype property
- ✓ Every edge must have source and 	arget properties (referencing node IDs)

### Nesting Rules
- ✓ **Foundation** nodes must have exactly 2 **Node** children with roles: 'raw' and 'base'
- ✓ **Adapter** nodes must have 1-3 **Node** children with roles: 'staging', 'archive', 'transform'
- ✓ **Mart** nodes must have exactly 2 **Node** children with roles: 'load' and 'report'
- ✓ **Node** types should not have children (leaf nodes)
- ✓ **Foundation** cannot contain **Foundation**
- ✓ **Adapter** cannot contain **Adapter**
- ✓ **Mart** cannot contain **Mart**

### Reference Integrity
- ✓ Edge source property must reference an existing node ID
- ✓ Edge 	arget property must reference an existing node ID
- ✓ Edge source and target must be different (no self-loops)
- ✓ Node IDs must be unique across the entire file

---

## 🔧 How to Fix Issues

### Missing IDs
Run the dd-node-ids.ps1 script to automatically add IDs:
```powershell
.\scripts\add-node-ids.ps1 -InputFile ".\dashboard\data\dwh-6.fixed.json"
```

### Invalid Nesting
Manually restructure the JSON to follow the nesting rules:
- Move Foundation children out of Foundation parents
- Ensure Adapter nodes only contain Node children
- Verify Node types don't have children

### Orphaned Edges
- Remove edges that reference non-existent node IDs, or
- Add the missing nodes to the hierarchy
- Ensure edge source and 	arget properties reference valid node id values

