#!/usr/bin/env python3
"""Generate two perf-test variations of dashboard/data/All.json with random
node states, designed to exercise every auto-collapse rule.

  All-randomState.json              — toggleCollapseOnStatusChange: false
  All-randomState-autoCollapse.json — toggleCollapseOnStatusChange: true

State assignment is seeded so output is reproducible. Distribution and
targeted subtree patches guarantee coverage of:
  - Rule 1 (all children share one collapsible status: READY/UPDATED/SKIPPED/DISABLED)
  - Rule 2 (children are only SKIPPED and/or UPDATED)
  - Mixed-problem containers (ERROR/WARNING/DELAYED) that must stay expanded
"""

import copy
import json
import random
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "dashboard" / "data"
INPUT = DATA_DIR / "All.json"
OUT_NO_COLLAPSE = DATA_DIR / "All-randomState.json"
OUT_COLLAPSE = DATA_DIR / "All-randomState-autoCollapse.json"

# Status values match NodeStatus in dashboard/js/nodeBase.js
UNDETERMINED = "Undetermined"
UNKNOWN = "Unknown"
DISABLED = "Disabled"
READY = "Ready"
UPDATING = "Updating"
UPDATED = "Updated"
SKIPPED = "Skipped"
DELAYED = "Delayed"
WARNING = "Warning"
ERROR = "Error"

WEIGHTED = [
    (UPDATED, 24),
    (READY, 18),
    (SKIPPED, 14),
    (UPDATING, 10),
    (DELAYED, 8),
    (WARNING, 8),
    (ERROR, 7),
    (DISABLED, 5),
    (UNKNOWN, 3),
    (UNDETERMINED, 3),
]
COLLAPSIBLE = {READY, UPDATED, SKIPPED, DISABLED}


def walk_containers(node):
    if node.get("children"):
        yield node
        for c in node["children"]:
            yield from walk_containers(c)


def walk_leaves(node):
    if node.get("children"):
        for c in node["children"]:
            yield from walk_leaves(c)
    else:
        yield node


def assign_random_states(root, rng):
    states, weights = zip(*WEIGHTED)

    for leaf in walk_leaves(root):
        leaf["state"] = rng.choices(states, weights=weights, k=1)[0]

    leaf_only = [
        n for n in walk_containers(root)
        if n["children"] and all(not c.get("children") for c in n["children"])
    ]
    rng.shuffle(leaf_only)

    def all_to(kids, value):
        for k in kids:
            k["state"] = value

    def mix_skipped_updated(kids):
        for k in kids:
            k["state"] = SKIPPED if rng.random() < 0.5 else UPDATED

    def mix_problem(kids):
        for k in kids:
            k["state"] = rng.choice([ERROR, WARNING, DELAYED, UPDATING])

    def mix_disabled_updated(kids):
        for k in kids:
            k["state"] = DISABLED if rng.random() < 0.4 else UPDATED

    patterns = [
        # Rule 1: all-same collapsible status
        lambda k: all_to(k, READY),
        lambda k: all_to(k, UPDATED),
        lambda k: all_to(k, SKIPPED),
        lambda k: all_to(k, DISABLED),
        # Rule 1: all-same non-collapsible status (must NOT collapse)
        lambda k: all_to(k, ERROR),
        lambda k: all_to(k, WARNING),
        # Rule 2: SKIPPED + UPDATED only mix
        mix_skipped_updated,
        # Mixed problem: should stay expanded
        mix_problem,
        # DISABLED + UPDATED mix (DISABLED is filtered, so should still collapse via Rule 1)
        mix_disabled_updated,
    ]

    per_pattern = 6
    cursor = 0
    for apply in patterns:
        for _ in range(per_pattern):
            if cursor >= len(leaf_only):
                break
            apply(leaf_only[cursor]["children"])
            cursor += 1


def summarize(root):
    counts = {}
    leaves = 0
    for leaf in walk_leaves(root):
        leaves += 1
        counts[leaf["state"]] = counts.get(leaf["state"], 0) + 1

    rule1_collapse = rule1_stay = rule2 = mixed_stay = 0
    for n in walk_containers(root):
        child_states = [c["state"] for c in n["children"] if not c.get("children")]
        if not child_states:
            continue
        non_disabled = [s for s in child_states if s != DISABLED]
        if not non_disabled:
            continue
        unique = set(non_disabled)
        if len(unique) == 1:
            if next(iter(unique)) in COLLAPSIBLE:
                rule1_collapse += 1
            else:
                rule1_stay += 1
        elif unique <= {SKIPPED, UPDATED}:
            rule2 += 1
        else:
            mixed_stay += 1

    return {
        "leaves": leaves,
        "counts": counts,
        "rule1_collapse_candidates": rule1_collapse,
        "rule1_stay_expanded": rule1_stay,
        "rule2_collapse_candidates": rule2,
        "mixed_stay_expanded": mixed_stay,
    }


def main():
    raw = json.loads(INPUT.read_text())
    rng = random.Random(0xFD05_2026)

    v1 = copy.deepcopy(raw)
    v1["metadata"] = {
        **v1.get("metadata", {}),
        "name": "All-randomState",
        "description": "Random per-node states for perf testing; auto-collapse disabled.",
        "updated": datetime.now(timezone.utc).isoformat(),
    }
    v1["settings"] = {
        **v1.get("settings", {}),
        "toggleCollapseOnStatusChange": False,
        "cascadeOnStatusChange": False,
    }
    for root in v1["nodes"]:
        assign_random_states(root, rng)

    OUT_NO_COLLAPSE.write_text(json.dumps(v1, separators=(",", ":")))
    print(f"Wrote {OUT_NO_COLLAPSE}")
    for root in v1["nodes"]:
        print("  summary:", summarize(root))

    v2 = copy.deepcopy(raw)
    v2["metadata"] = {
        **v2.get("metadata", {}),
        "name": "All-randomState-autoCollapse",
        "description": "Random per-node states for perf testing; auto-collapse + cascade enabled.",
        "updated": datetime.now(timezone.utc).isoformat(),
    }
    v2["settings"] = {
        **v2.get("settings", {}),
        "toggleCollapseOnStatusChange": True,
        "cascadeOnStatusChange": True,
    }
    v2["nodes"] = copy.deepcopy(v1["nodes"])
    OUT_COLLAPSE.write_text(json.dumps(v2, separators=(",", ":")))
    print(f"Wrote {OUT_COLLAPSE}")


if __name__ == "__main__":
    main()
