# Click Handler Demo - Floating Div

This demo showcases the new custom click handler functionality in Flowdash, demonstrating how to register external click handlers that are called after normal selection behavior.

## Features Demonstrated

- **Custom Click Handlers**: Register additional click callbacks using `dashboard.setNodeClickCallback()`
- **Non-intrusive**: The callback runs after normal selection, preserving all default behavior
- **Floating UI**: Shows a beautiful floating information panel when nodes are clicked
- **Node Information**: Displays comprehensive node details including ID, label, type, position, size, and status
- **Status Styling**: Color-coded status badges for different node states
- **Smooth Animations**: CSS transitions for smooth show/hide animations
- **Auto-hide**: Panel automatically hides after 5 seconds (optional)

## How It Works

1. **Dashboard Initialization**: The dashboard is initialized with test data containing 5 nodes with different statuses
2. **Click Handler Registration**: A custom click handler is registered using `flowdash.setNodeClickCallback()`
3. **Node Click**: When a user clicks on any node:
   - Normal selection behavior occurs first (node gets selected, bounding box appears)
   - The custom callback is triggered with the selected node as parameter
   - A floating information panel appears with node details
4. **Panel Interaction**: Users can close the panel manually or wait for auto-hide

## Code Example

```javascript
// Register the click handler
flowdash.setNodeClickCallback((node) => {
    showNodeInfo(node);
});

// Function to display node information
function showNodeInfo(node) {
    const floatingDiv = document.getElementById('floatingInfo');
    const nodeDetails = document.getElementById('nodeDetails');
    
    // Create status badge HTML
    const statusClass = `status-${node.status.toLowerCase()}`;
    const statusBadge = `<span class="status-badge ${statusClass}">${node.status}</span>`;
    
    // Update content
    nodeDetails.innerHTML = `
        <div><strong>ID:</strong> ${node.id}</div>
        <div><strong>Label:</strong> ${node.label}</div>
        <div><strong>Type:</strong> ${node.type}</div>
        <div><strong>Position:</strong> (${Math.round(node.x)}, ${Math.round(node.y)})</div>
        <div><strong>Size:</strong> ${node.width} × ${node.height}</div>
        <div><strong>Status:</strong> ${statusBadge}</div>
    `;
    
    // Show the floating div with animation
    floatingDiv.classList.add('show');
}
```

## Test Data

The demo includes 5 test nodes with different statuses:
- **Data Source** (Ready) - Green status
- **Processing** (Updating) - Orange status  
- **Storage** (Updated) - Blue status
- **Error Node** (Error) - Red status
- **Warning Node** (Warning) - Yellow status

## Styling

The floating panel uses modern CSS with:
- Gradient background
- Smooth animations
- Color-coded status badges
- Responsive design
- Clean typography

## Browser Compatibility

This demo works in all modern browsers that support:
- ES6 modules
- CSS Grid and Flexbox
- CSS transitions and transforms
- D3.js v7+

## Usage

1. Open `floating-div-demo.html` in a web browser
2. Click on any node to see the floating information panel
3. Use the "Clear Panel" button to manually close the panel
4. Run tests using the "Run Tests" button to verify functionality
