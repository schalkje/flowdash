//////////////////////////////////////////////////////////////
//
// Demo: states
// Node Type: rect within a lane
// Features: One rectangular node per status
// Test Status: Not Tested
//

export const demoData = {
	// Demo metadata
	metadata: {
		name: "states",
		nodeType: "rect",
		features: ["Statuses", "Lane layout"],
		description: "Lane with a rectangular node for each available status",
		testStatus: "Not Tested",
		version: "1.0.0"
	},

	// Dashboard settings
	settings: { demoMode: true, showCenterMark: false,
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
			id: "lane-states",
			label: "All Statuses",
			type: "lane",
			layout: {
				arrangement: "default",
				display: "content"
			},
			children: [
				{ id: "n-unknown", label: "Unknown", type: "rect", state: "Unknown" },
				{ id: "n-disabled", label: "Disabled", type: "rect", state: "Disabled" },
				{ id: "n-ready", label: "Ready", type: "rect", state: "Ready" },
				{ id: "n-updating", label: "Updating", type: "rect", state: "Updating" },
				{ id: "n-updated", label: "Updated", type: "rect", state: "Updated" },
				{ id: "n-skipped", label: "Skipped", type: "rect", state: "Skipped" },
				{ id: "n-delayed", label: "Delayed", type: "rect", state: "Delayed" },
				{ id: "n-warning", label: "Warning", type: "rect", state: "Warning" },
				{ id: "n-error", label: "Error", type: "rect", state: "Error" }
			]
		}
	],

	// Edge definitions
	edges: []
};


