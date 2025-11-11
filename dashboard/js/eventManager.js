// Event Manager for centralized event handling
export class EventManager {
  static setupNodeEvents(node, handlers) {
    const element = node.element;
    
    if (handlers.onClick) {
      element.on("click", (event) => {
        event.stopPropagation();
        handlers.onClick(event, node);
      });
    }
    
    if (handlers.onDblClick) {
      element.on("dblclick", (event) => {
        event.stopPropagation();
  try { event.preventDefault?.(); } catch {}
        handlers.onDblClick(event, node);
      });
    }
    
    if (handlers.onDrag) {
      const drag = d3.drag()
        .on("start", handlers.onDrag.start)
        .on("drag", handlers.onDrag.drag)
        .on("end", handlers.onDrag.end);
      
      element.call(drag);
    }
  }
  
  static setupDefaultNodeEvents(node) {
    const element = node.element;
    
    element.on("click", (event) => {
      event.stopPropagation();
  // Pass the original node through so bubbling preserves the clicked target
  node.handleClicked(event, node);
    });
    
    element.on("dblclick", (event) => {
      event.stopPropagation();
      try { event.preventDefault?.(); } catch {}
      // Pass the original node through so bubbling preserves the clicked target
      node.handleDblClicked(event, node);
    });
  }
  
  static setupDragEvents(node) {
    const drag = d3.drag()
      .on("start", (event) => node.drag_started(event, node))
      .on("drag", (event) => node.dragged(event, node))
      .on("end", (event) => node.drag_ended(event, node));
    
    node.element.call(drag);
  }
  
  static propagateEvent(node, eventType, event) {
    if (node[`on${eventType}`]) {
      node[`on${eventType}`](event, node);
    } else if (node.parentNode) {
      this.propagateEvent(node.parentNode, eventType, event);
    }
  }
  
  static handleNodeClick(node, event, originalNode = node) {
    // Always invoke handlers with the originally clicked node
    if (node.onClick) {
      node.onClick(originalNode, event);
    } else if (node.parentNode) {
      this.handleNodeClick(node.parentNode, event, originalNode);
    } else {
      console.warn(`No onClicked handler, node ${originalNode.id} clicked!`);
    }
  }
  
  static handleNodeDblClick(node, event, originalNode = node) {
    // Always invoke handlers with the originally double-clicked node
    if (node.onDblClick) {
      node.onDblClick(originalNode, event);
    } else if (node.parentNode) {
      this.handleNodeDblClick(node.parentNode, event, originalNode);
    } else {
      console.warn(`No onDblClicked handler, node ${originalNode.id} double-clicked!`);
    }
  }
} 