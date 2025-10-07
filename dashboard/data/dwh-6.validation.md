# Dashboard JSON Validation Report

**File**: `.\dashboard\data\dwh-6.fixed.json`  
**Generated**: 2025-10-06 10:22:13

---

## Summary

| Metric | Count |
|--------|-------|
| Total Nodes | 885 |
| Total Edges | 35 |
| Errors | 5 |
| Warnings | 174 |
| Unique Node IDs | 885 |
| Unique Node Labels | 858 |

---
## ❌ Validation Status: **FAILED**

The JSON file has errors that must be fixed before it can be used.

---

## ❌ Errors (5)

The following errors must be fixed:
### Adapter missing required child roles: staging, archive

**Path**: `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 3 -> Private Bank -> Matrix -> Matrix`

### Adapter missing required child roles: transform

**Path**: `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 3 -> Loans & Mortgages -> Moneyview -> Moneyview`

### Adapter missing required child roles: transform

**Path**: `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 4 -> WIC (WCT) -> WIC (WCT)`

### Adapter missing required child roles: transform

**Path**: `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 4 -> Monthly -> Rijksdienst voor ondernemingen (RVO) -> RVO Energielabels (REM) -> RVO Energielabels (REM)`

### Adapter missing required child roles: transform

**Path**: `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 4 -> Monthly -> Rijksdienst voor ondernemingen (RVO) -> RVO Energielabels 2019 (REV) -> RVO Energielabels 2019 (REV)`


---

## ⚠️ Warnings (174)

The following warnings should be reviewed:
### Adapter child missing explicit 'role' or 'category', but can infer 'archive' from label (57 occurrences)

- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Eximius -> Eximius -> VLK DWH.ARC_LOAD_EXM_EXI_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Eximius -> Rendementen -> VLK DWH.ARC_LOAD_EXM_REN_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Overige Product Administrations -> OPA CVA -> VLK DWH.ARC_LOAD_OPA_CVA_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Overige Product Administrations -> OPA DMR -> VLK DWH.ARC_LOAD_OPA_DMR_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Overige Product Administrations -> OPA HRT -> VLK DWH.ARC_LOAD_OPA_HRT_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Overige Product Administrations -> OPA KRC -> VLK DWH.ARC_LOAD_OPA_KRC_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Overige Product Administrations -> OPA OHR -> VLK DWH.ARC_LOAD_OPA_OHR_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Overige Product Administrations -> OPA STP -> VLK DWH.ARC_LOAD_OPA_STP_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> IT KAN -> Timetell -> VLK DWH.ARC_LOAD_TTL_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> IT KAN -> KCM -> VLK DWH.ARC_LOAD_KCM_DAG`

... and 47 more

### Adapter child missing explicit 'role' or 'category', but can infer 'staging' from label (58 occurrences)

- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Eximius -> Eximius -> VLK DWH.STG_LOAD_EXM_EXI_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Eximius -> Rendementen -> VLK DWH.STG_LOAD_EXM_REN_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Overige Product Administrations -> OPA CVA -> VLK DWH.STG_LOAD_OPA_CVA_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Overige Product Administrations -> OPA DMR -> VLK DWH.STG_LOAD_OPA_DMR_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Overige Product Administrations -> OPA HRT -> VLK DWH.STG_LOAD_OPA_HRT_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Overige Product Administrations -> OPA KRC -> VLK DWH.STG_LOAD_OPA_KRC_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Overige Product Administrations -> OPA OHR -> VLK DWH.STG_LOAD_OPA_OHR_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Overige Product Administrations -> OPA STP -> VLK DWH.STG_LOAD_OPA_STP_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Treasury -> Quion (daily) -> VLK DWH.STG_LOAD_QIN_DAY`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> IT KAN -> Timetell -> VLK DWH.STG_LOAD_TTL_DAG`

... and 48 more

### Adapter child missing explicit 'role' or 'category', but can infer 'transform' from label (8 occurrences)

- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 1 -> Treasury -> Quion (daily) -> VLK DWH.TFM_LOAD_QIN_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 2 -> Daughters -> DOCHTERSHEETS KCO -> VLK DWH.TFM_LOAD_DCH_KCO_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 2 -> Finance -> Coda Overige Dochters (CDO) -> VLK DWH.TFM_LOAD_CDO_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 3 -> Loans & Mortgages -> Stater -> Daily transactions MUT (STH-STT) -> VLK DWH.TFM_LOAD_STT_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 3 -> Loans & Mortgages -> Stater -> Stater Daily download (STH-STD) -> VLK DWH.TFM_LOAD_STD_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 4 -> Monthly -> Stater (monthly) -> VLK DWH.TFM_LOAD_STM_MAAND`
- `DWH & Strada -> DWH -> VLK DWH -> Staging -> Staging 4 -> Monthly -> Fitch (Monthly) -> VLK DWH.TFM_LOAD_FCH_MAAND`
- `DWH & Strada -> DWH -> Maintenance -> Deprecated -> DCH_VCH -> VLK DWH.TFM_LOAD_DCH_VCH_DAG`

### Foundation child missing explicit 'role' or 'category', but can infer 'base' from label (7 occurrences)

- `DWH & Strada -> Strada Foundation -> vl_dwh -> vl_dwh (DFX) -> vl_dwh.stg_archive_moneyview (DFX) -> base.vl_dwh.stg_archive_moneyview`
- `DWH & Strada -> Strada Foundation -> vl_dwh -> vl_dwh (DFX) -> vl_dwh.stg_archive_ohpen (dfx) -> base.vl_dwh.stg_archive_ohpen`
- `DWH & Strada -> Strada Foundation -> vl_dwh -> vl_dwh (DFX) -> vl_dwh.calc_archive_irb (dfx) -> Strada Foundation.DFX.base.vl_dwh.calc_archive_irb`
- `DWH & Strada -> Strada Foundation -> vl_dwh -> vl_dwh (DFX) -> vl_dwh.em_afo (DFX) -> base.vl_dwh.em_afo`
- `DWH & Strada -> Strada Foundation -> Other -> corona.corona -> base.corona.corona`
- `DWH & Strada -> Strada Foundation -> Other -> vl_vdz.vl_vdz_be (DFX) -> base.vl_vdz.vl_vdz_be`
- `DWH & Strada -> Strada Foundation -> Other -> vl_vdz.vl_vdz (DFX) -> base.vl_vdz.vl_vdz `

### Foundation child missing explicit 'role' or 'category', but can infer 'raw' from label (6 occurrences)

- `DWH & Strada -> Strada Foundation -> vl_dwh -> vl_dwh (DFX) -> vl_dwh.stg_archive_moneyview (DFX) -> raw.vl_dwh.stg_archive_moneyview`
- `DWH & Strada -> Strada Foundation -> vl_dwh -> vl_dwh (DFX) -> vl_dwh.stg_archive_ohpen (dfx) -> raw.vl_dwh.stg_archive_ohpen`
- `DWH & Strada -> Strada Foundation -> vl_dwh -> vl_dwh (DFX) -> vl_dwh.calc_archive_irb (dfx) -> Strada Foundation.DFX.raw.vl_dwh.calc_archive_irb`
- `DWH & Strada -> Strada Foundation -> vl_dwh -> vl_dwh (DFX) -> vl_dwh.em_afo (DFX) -> raw.vl_dwh.em_afo`
- `DWH & Strada -> Strada Foundation -> Other -> vl_vdz.vl_vdz_be (DFX) -> raw.vl_vdz.vl_vdz_be`
- `DWH & Strada -> Strada Foundation -> Other -> vl_vdz.vl_vdz (DFX) -> raw.vl_vdz.vl_vdz`

### Mart child missing explicit 'role' or 'category', but can infer 'load' from label (19 occurrences)

- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> EM_AFO -> LOAD EM_AFO MONTH`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Matrix -> EM_MTX COC -> LOAD EM_MATRIX.COC Day`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Matrix -> EM_MTX GAR -> LOAD EM_MATRIX.GAR Day`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Matrix -> EM_MTX MTX -> LOAD EM_MATRIX.MTX Day`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Anti-money laundry (AML) -> AML BE -> LOAD EM_AML_BE Day`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Anti-money laundry (AML) -> AML NL -> LOAD EM_AML_NL Day`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Monthly Extractions -> Prommise (Monthly) -> EM_PRM SLP -> VLK DWH.EM_PRM_SLP_LOAD_MAAND`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Monthly Extractions -> Prommise (Monthly) -> EM_PRM REF -> Load EM_PROMMISE REF`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Monthly Extractions -> Prommise (Monthly) -> EM_PRM RRE -> VLK DWH.EM_PRM_RRE_LOAD_MAAND`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Quarterly extractions -> EM_CES (Quarterly) ->  LOAD EM_CESOP Quarter`

... and 9 more

### Mart child missing explicit 'role' or 'category', but can infer 'report' from label (19 occurrences)

- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> EM_AFO -> VLK DWH.EM_AFO_RPRT_MONTH`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Matrix -> EM_MTX COC -> VLK DWH.EM_MTX_RPRT_COC_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Matrix -> EM_MTX GAR -> VLK DWH.EM_MTX_RPRT_GAR_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Matrix -> EM_MTX MTX -> VLK DWH.EM_MTX_RPRT_MTX_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Anti-money laundry (AML) -> AML BE -> VLK DWH.EM_AML_BE_RPRT_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Anti-money laundry (AML) -> AML NL -> VLK DWH.EM_AML_NL_RPRT_DAG`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Monthly Extractions -> Prommise (Monthly) -> EM_PRM SLP -> Report EM_PROMMISE SLP`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Monthly Extractions -> Prommise (Monthly) -> EM_PRM REF -> VLK DWH.EM_PRM_REF_RPRT_MAAND`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Monthly Extractions -> Prommise (Monthly) -> EM_PRM RRE -> VLK DWH.EM_PRM_RRE_RPRT_MAAND`
- `DWH & Strada -> DWH -> VLK DWH -> Exporting data -> Extraction Marts 1 -> Quarterly extractions -> EM_CES (Quarterly) -> VLK DWH.EM_CES_RPRT_KWARTAAL`

... and 9 more


---

## 📋 Duplicate Labels

The following labels are used by multiple nodes:

| Label | Count | Note |
|-------|-------|------|
| raw.vl_dwh.stg_archive_stater | 2 | OK - Different paths |
| Reports | 2 | OK - Different paths |
| transform Fidor | 2 | OK - Different paths |
| Load | 2 | OK - Different paths |
| Staging | 3 | OK - Different paths |
| Reference | 2 | OK - Different paths |
| Eximius | 2 | OK - Different paths |
| BAN | 2 | OK - Different paths |
| vl_dwh.stg_archive_stater (rawbase) | 2 | OK - Different paths |
| BTM | 2 | OK - Different paths |
| Calcasa (Quarterly) | 2 | OK - Different paths |
| base.vl_dwh.stg_archive_stater | 2 | OK - Different paths |
| Compliance | 2 | OK - Different paths |
| BAM | 2 | OK - Different paths |
| Investment Bank (IB) | 2 | OK - Different paths |
| Matrix | 3 | OK - Different paths |
| Report | 2 | OK - Different paths |
| Archive | 2 | OK - Different paths |
| Treasury | 2 | OK - Different paths |
| VIA | 2 | OK - Different paths |
| EVI | 2 | OK - Different paths |
| BTR | 2 | OK - Different paths |
| Market Data | 2 | OK - Different paths |
| DWH | 2 | OK - Different paths |
| FOS | 2 | OK - Different paths |

> **Note**: Duplicate labels are allowed if they appear in different paths of the hierarchy.


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
- ✓ Every edge must have sourceName and 	argetName

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
- Remove edges that reference non-existent nodes, or
- Add the missing nodes to the hierarchy

