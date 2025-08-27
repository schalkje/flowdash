//////////////////////////////////////////////////////////////
//
// Demo: states-mart-explicit
// Node Type: lane with mart children (collapsed) with explicit roles
// Features: One mart per state, collapsed by default
// Test Status: Not Tested
//

export const demoData = {
	metadata: {
		name: "states-mart-explicit",
		nodeType: "mart",
		features: ["Mart containers", "Collapsed children", "Statuses", "Explicit roles"],
		description: "Lane with multiple mart nodes, one per state, each collapsed with explicit role children",
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
			id: "lane-marts",
			label: "Marts (Collapsed by State)",
			type: "lane",
			layout: { arrangement: "default", display: "content" },
			children: [
				{ id: "m-1", label: "Unknown Mart", type: "mart", code: "M1", state: "Unknown", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "m-1-load", label: "load", type: "node", layout: null, children: [], state: "Unknown", role: "load", category: "load", width: 60, height: 32 },
					{ id: "m-1-report", label: "report", type: "node", layout: null, children: [], state: "Unknown", role: "report", category: "report", width: 60, height: 32 }
				] },
				{ id: "m-2", label: "Disabled Mart", type: "mart", code: "M2", state: "Disabled", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "m-2-load", label: "load", type: "node", layout: null, children: [], state: "Disabled", role: "load", category: "load", width: 60, height: 32 },
					{ id: "m-2-report", label: "report", type: "node", layout: null, children: [], state: "Disabled", role: "report", category: "report", width: 60, height: 32 }
				] },
				{ id: "m-3", label: "Ready Mart", type: "mart", code: "M3", state: "Ready", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "m-3-load", label: "load", type: "node", layout: null, children: [], state: "Ready", role: "load", category: "load", width: 60, height: 32 },
					{ id: "m-3-report", label: "report", type: "node", layout: null, children: [], state: "Ready", role: "report", category: "report", width: 60, height: 32 }
				] },
				{ id: "m-4", label: "Updating Mart", type: "mart", code: "M4", state: "Updating", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "m-4-load", label: "load", type: "node", layout: null, children: [], state: "Updating", role: "load", category: "load", width: 60, height: 32 },
					{ id: "m-4-report", label: "report", type: "node", layout: null, children: [], state: "Updating", role: "report", category: "report", width: 60, height: 32 }
				] },
				{ id: "m-5", label: "Updated Mart", type: "mart", code: "M5", state: "Updated", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "m-5-load", label: "load", type: "node", layout: null, children: [], state: "Updated", role: "load", category: "load", width: 60, height: 32 },
					{ id: "m-5-report", label: "report", type: "node", layout: null, children: [], state: "Updated", role: "report", category: "report", width: 60, height: 32 }
				] },
				{ id: "m-6", label: "Skipped Mart", type: "mart", code: "M6", state: "Skipped", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "m-6-load", label: "load", type: "node", layout: null, children: [], state: "Skipped", role: "load", category: "load", width: 60, height: 32 },
					{ id: "m-6-report", label: "report", type: "node", layout: null, children: [], state: "Skipped", role: "report", category: "report", width: 60, height: 32 }
				] },
				{ id: "m-7", label: "Delayed Mart", type: "mart", code: "M7", state: "Delayed", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "m-7-load", label: "load", type: "node", layout: null, children: [], state: "Delayed", role: "load", category: "load", width: 60, height: 32 },
					{ id: "m-7-report", label: "report", type: "node", layout: null, children: [], state: "Delayed", role: "report", category: "report", width: 60, height: 32 }
				] },
				{ id: "m-8", label: "Warning Mart", type: "mart", code: "M8", state: "Warning", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "m-8-load", label: "load", type: "node", layout: null, children: [], state: "Warning", role: "load", category: "load", width: 60, height: 32 },
					{ id: "m-8-report", label: "report", type: "node", layout: null, children: [], state: "Warning", role: "report", category: "report", width: 60, height: 32 }
				] },
				{ id: "m-9", label: "Error Mart", type: "mart", code: "M9", state: "Error", collapsed: true, layout: { mode: "auto", displayMode: "role", orientation: "horizontal" }, children: [
					{ id: "m-9-load", label: "load", type: "node", layout: null, children: [], state: "Error", role: "load", category: "load", width: 60, height: 32 },
					{ id: "m-9-report", label: "report", type: "node", layout: null, children: [], state: "Error", role: "report", category: "report", width: 60, height: 32 }
				] }
			]
		}
	],
	edges: []
};



