//////////////////////////////////////////////////////////////
//
// Demo: states-foundation-explicit
// Node Type: lane with foundation children (collapsed) with explicit roles
// Features: One foundation per state, collapsed by default
// Test Status: Not Tested
//

export const demoData = {
	metadata: {
		name: "states-foundation-explicit",
		nodeType: "foundation",
		features: ["Foundation containers", "Collapsed children", "Statuses", "Explicit roles"],
		description: "Lane with multiple foundation nodes, one per state, each collapsed with explicit role children",
		testStatus: "Not Tested",
		version: "1.0.0"
	},
	settings: {
		showCenterMark: false,
		showGrid: true,
		showGroupLabels: true,
		showGroupTitles: true,
		showGhostlines: false,
		curved: false,
		showConnectionPoints: false,
		zoomToRoot: true,
		isDebug: false
	},
	nodes: [
		{
			id: "lane-foundations",
			label: "Foundations (Collapsed by State)",
			type: "lane",
			layout: { arrangement: "default", display: "content" },
			children: [
				{ id: "f-1", label: "Unknown Foundation", type: "foundation", code: "F1", state: "Unknown", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "f-1-raw", label: "raw", type: "node", layout: null, children: [], state: "Unknown", role: "raw", category: "raw", width: 60, height: 32 },
					{ id: "f-1-base", label: "base", type: "node", layout: null, children: [], state: "Unknown", role: "base", category: "base", width: 60, height: 32 }
				] },
				{ id: "f-2", label: "Disabled Foundation", type: "foundation", code: "F2", state: "Disabled", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "f-2-raw", label: "raw", type: "node", layout: null, children: [], state: "Disabled", role: "raw", category: "raw", width: 60, height: 32 },
					{ id: "f-2-base", label: "base", type: "node", layout: null, children: [], state: "Disabled", role: "base", category: "base", width: 60, height: 32 }
				] },
				{ id: "f-3", label: "Ready Foundation", type: "foundation", code: "F3", state: "Ready", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "f-3-raw", label: "raw", type: "node", layout: null, children: [], state: "Ready", role: "raw", category: "raw", width: 60, height: 32 },
					{ id: "f-3-base", label: "base", type: "node", layout: null, children: [], state: "Ready", role: "base", category: "base", width: 60, height: 32 }
				] },
				{ id: "f-4", label: "Updating Foundation", type: "foundation", code: "F4", state: "Updating", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "f-4-raw", label: "raw", type: "node", layout: null, children: [], state: "Updating", role: "raw", category: "raw", width: 60, height: 32 },
					{ id: "f-4-base", label: "base", type: "node", layout: null, children: [], state: "Updating", role: "base", category: "base", width: 60, height: 32 }
				] },
				{ id: "f-5", label: "Updated Foundation", type: "foundation", code: "F5", state: "Updated", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "f-5-raw", label: "raw", type: "node", layout: null, children: [], state: "Updated", role: "raw", category: "raw", width: 60, height: 32 },
					{ id: "f-5-base", label: "base", type: "node", layout: null, children: [], state: "Updated", role: "base", category: "base", width: 60, height: 32 }
				] },
				{ id: "f-6", label: "Skipped Foundation", type: "foundation", code: "F6", state: "Skipped", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "f-6-raw", label: "raw", type: "node", layout: null, children: [], state: "Skipped", role: "raw", category: "raw", width: 60, height: 32 },
					{ id: "f-6-base", label: "base", type: "node", layout: null, children: [], state: "Skipped", role: "base", category: "base", width: 60, height: 32 }
				] },
				{ id: "f-7", label: "Delayed Foundation", type: "foundation", code: "F7", state: "Delayed", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "f-7-raw", label: "raw", type: "node", layout: null, children: [], state: "Delayed", role: "raw", category: "raw", width: 60, height: 32 },
					{ id: "f-7-base", label: "base", type: "node", layout: null, children: [], state: "Delayed", role: "base", category: "base", width: 60, height: 32 }
				] },
				{ id: "f-8", label: "Warning Foundation", type: "foundation", code: "F8", state: "Warning", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "f-8-raw", label: "raw", type: "node", layout: null, children: [], state: "Warning", role: "raw", category: "raw", width: 60, height: 32 },
					{ id: "f-8-base", label: "base", type: "node", layout: null, children: [], state: "Warning", role: "base", category: "base", width: 60, height: 32 }
				] },
				{ id: "f-9", label: "Error Foundation", type: "foundation", code: "F9", state: "Error", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "f-9-raw", label: "raw", type: "node", layout: null, children: [], state: "Error", role: "raw", category: "raw", width: 60, height: 32 },
					{ id: "f-9-base", label: "base", type: "node", layout: null, children: [], state: "Error", role: "base", category: "base", width: 60, height: 32 }
				] }
			]
		}
	],
	edges: []
};



