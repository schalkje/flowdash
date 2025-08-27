//////////////////////////////////////////////////////////////
//
// Demo: states-columns-2rects
// Node Type: columns (children are columns, collapsed, with two rects)
// Features: One container per state, collapsed by default
// Test Status: Not Tested
//

export const demoData = {
	metadata: {
		name: "states-columns-2rects",
		nodeType: "columns",
		features: ["Columns containers", "Collapsed children", "Statuses"],
		description: "Columns with multiple child columns, one per state, each collapsed and containing two rectangles",
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
			id: "columns-states",
			label: "Columns (Collapsed by State)",
			type: "columns",
			layout: {
				arrangement: "default",
				display: "content"
			},
			children: [
				{ id: "cl-1", label: "Unknown Columns", type: "columns", code: "CL1", state: "Unknown", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "cl-1-a", label: "A", type: "rect", layout: null, children: [], state: "Unknown" },
					{ id: "cl-1-b", label: "B", type: "rect", layout: null, children: [], state: "Unknown" }
				] },
				{ id: "cl-2", label: "Disabled Columns", type: "columns", code: "CL2", state: "Disabled", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "cl-2-a", label: "A", type: "rect", layout: null, children: [], state: "Disabled" },
					{ id: "cl-2-b", label: "B", type: "rect", layout: null, children: [], state: "Disabled" }
				] },
				{ id: "cl-3", label: "Ready Columns", type: "columns", code: "CL3", state: "Ready", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "cl-3-a", label: "A", type: "rect", layout: null, children: [], state: "Ready" },
					{ id: "cl-3-b", label: "B", type: "rect", layout: null, children: [], state: "Ready" }
				] },
				{ id: "cl-4", label: "Updating Columns", type: "columns", code: "CL4", state: "Updating", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "cl-4-a", label: "A", type: "rect", layout: null, children: [], state: "Updating" },
					{ id: "cl-4-b", label: "B", type: "rect", layout: null, children: [], state: "Updating" }
				] },
				{ id: "cl-5", label: "Updated Columns", type: "columns", code: "CL5", state: "Updated", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "cl-5-a", label: "A", type: "rect", layout: null, children: [], state: "Updated" },
					{ id: "cl-5-b", label: "B", type: "rect", layout: null, children: [], state: "Updated" }
				] },
				{ id: "cl-6", label: "Skipped Columns", type: "columns", code: "CL6", state: "Skipped", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "cl-6-a", label: "A", type: "rect", layout: null, children: [], state: "Skipped" },
					{ id: "cl-6-b", label: "B", type: "rect", layout: null, children: [], state: "Skipped" }
				] },
				{ id: "cl-7", label: "Delayed Columns", type: "columns", code: "CL7", state: "Delayed", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "cl-7-a", label: "A", type: "rect", layout: null, children: [], state: "Delayed" },
					{ id: "cl-7-b", label: "B", type: "rect", layout: null, children: [], state: "Delayed" }
				] },
				{ id: "cl-8", label: "Warning Columns", type: "columns", code: "CL8", state: "Warning", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "cl-8-a", label: "A", type: "rect", layout: null, children: [], state: "Warning" },
					{ id: "cl-8-b", label: "B", type: "rect", layout: null, children: [], state: "Warning" }
				] },
				{ id: "cl-9", label: "Error Columns", type: "columns", code: "CL9", state: "Error", collapsed: true, layout: { mode: "full", arrangement: 1, displayMode: "full" }, children: [
					{ id: "cl-9-a", label: "A", type: "rect", layout: null, children: [], state: "Error" },
					{ id: "cl-9-b", label: "B", type: "rect", layout: null, children: [], state: "Error" }
				] }
			]
		}
	],
	edges: []
};



