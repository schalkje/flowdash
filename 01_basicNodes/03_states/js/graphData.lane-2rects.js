//////////////////////////////////////////////////////////////
//
// Demo: states-lane-2rects
// Node Type: lane (children are lanes, collapsed, with two rects)
// Features: One container per state, collapsed by default
// Test Status: Not Tested
//

export const demoData = {
	// Demo metadata
	metadata: {
		name: "states-lane-2rects",
		nodeType: "lane",
		features: ["Lane containers", "Collapsed children", "Statuses"],
		description: "Lane with multiple child lanes, one per state, each collapsed and containing two rectangles",
		testStatus: "Not Tested",
		version: "1.0.0"
	},

	// Dashboard settings
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

	// Node definitions
	nodes: [
		{
			id: "lane-lanes",
			label: "Lanes (Collapsed by State)",
			type: "lane",
			layout: {
				arrangement: "default",
				display: "content"
			},
			children: [
				{ id: "ln-1", label: "Unknown Lane", type: "lane", code: "LN1", state: "Unknown", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "ln-1-a", label: "A", type: "rect", layout: null, children: [], state: "Unknown" },
					{ id: "ln-1-b", label: "B", type: "rect", layout: null, children: [], state: "Unknown" }
				] },
				{ id: "ln-2", label: "Disabled Lane", type: "lane", code: "LN2", state: "Disabled", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "ln-2-a", label: "A", type: "rect", layout: null, children: [], state: "Disabled" },
					{ id: "ln-2-b", label: "B", type: "rect", layout: null, children: [], state: "Disabled" }
				] },
				{ id: "ln-3", label: "Ready Lane", type: "lane", code: "LN3", state: "Ready", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "ln-3-a", label: "A", type: "rect", layout: null, children: [], state: "Ready" },
					{ id: "ln-3-b", label: "B", type: "rect", layout: null, children: [], state: "Ready" }
				] },
				{ id: "ln-4", label: "Updating Lane", type: "lane", code: "LN4", state: "Updating", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "ln-4-a", label: "A", type: "rect", layout: null, children: [], state: "Updating" },
					{ id: "ln-4-b", label: "B", type: "rect", layout: null, children: [], state: "Updating" }
				] },
				{ id: "ln-5", label: "Updated Lane", type: "lane", code: "LN5", state: "Updated", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "ln-5-a", label: "A", type: "rect", layout: null, children: [], state: "Updated" },
					{ id: "ln-5-b", label: "B", type: "rect", layout: null, children: [], state: "Updated" }
				] },
				{ id: "ln-6", label: "Skipped Lane", type: "lane", code: "LN6", state: "Skipped", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "ln-6-a", label: "A", type: "rect", layout: null, children: [], state: "Skipped" },
					{ id: "ln-6-b", label: "B", type: "rect", layout: null, children: [], state: "Skipped" }
				] },
				{ id: "ln-7", label: "Delayed Lane", type: "lane", code: "LN7", state: "Delayed", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "ln-7-a", label: "A", type: "rect", layout: null, children: [], state: "Delayed" },
					{ id: "ln-7-b", label: "B", type: "rect", layout: null, children: [], state: "Delayed" }
				] },
				{ id: "ln-8", label: "Warning Lane", type: "lane", code: "LN8", state: "Warning", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "ln-8-a", label: "A", type: "rect", layout: null, children: [], state: "Warning" },
					{ id: "ln-8-b", label: "B", type: "rect", layout: null, children: [], state: "Warning" }
				] },
				{ id: "ln-9", label: "Error Lane", type: "lane", code: "LN9", state: "Error", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "ln-9-a", label: "A", type: "rect", layout: null, children: [], state: "Error" },
					{ id: "ln-9-b", label: "B", type: "rect", layout: null, children: [], state: "Error" }
				] }
			]
		}
	],

	// Edge definitions
	edges: []
};



