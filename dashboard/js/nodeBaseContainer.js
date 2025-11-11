import BaseNode, { NodeStatus } from "./nodeBase.js";
import { getComputedDimensions } from "./utils.js";
import { StatusManager } from "./statusManager.js";
import { GeometryManager } from "./geometryManager.js";
import { ConfigManager } from "./configManager.js";
import { ZoneManager } from "./zones/index.js";

export default class BaseContainerNode extends BaseNode {
  constructor(nodeData, parentElement, createNode, settings, parentNode = null) {
    nodeData.width ??= 0;
    nodeData.height ??= 0;
    nodeData.expandedSize ??= { width: nodeData.width, height: nodeData.height };
    // Ensure layout is an object, not a string
    if (typeof nodeData.layout === 'string') {
      nodeData.layout = { type: nodeData.layout };
    }
    nodeData.layout ??= {};
    nodeData.layout.minimumSize ??= { width: 0, height: 0 };
    nodeData.layout.minimumSize.width ??= 0;
    nodeData.layout.minimumSize.height ??= 0;
    nodeData.layout.minimumSize.useRootRatio ??= false;

    super(nodeData, parentElement, settings, parentNode);
    this.data.type ??= "container";

    this.isContainer = true;

    this.createNode = createNode;

    this.simulation = null;
    this.edgesContainer ??= null;
    // Initialize layout-related properties from settings with sensible defaults
    this.containerMargin = {
      ...ConfigManager.getDefaultContainerMargin(),
      ...(this.settings?.containerMargin || {})
    };
    this.nodeSpacing = {
      ...ConfigManager.getDefaultNodeSpacing(),
      ...(this.settings?.nodeSpacing || {})
    };
    this.childNodes = [];
    this.zoneManager = null;

    // child edges contain the edges that are between nodes where this container
    // is the first joined parent
    this.childEdges = [];
  }

  get nestedCorrection_y() {
    // Prefer zone-system derived offset when available (offset from container center to inner content origin)
    try {
      const innerZone = this.zoneManager?.innerContainerZone;
      const transform = innerZone?.coordinateSystem?.transform;
      if (transform && typeof transform === 'string') {
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) return parseFloat(match[2]);
      }
    } catch {}

    // Legacy fallback (non-zone layout)
    return this.y - this.data.height / 2 + this.containerMargin.top;
  }

  get nestedCorrection_x() {
    // Prefer zone-system derived offset when available (offset from container center to inner content origin)
    try {
      const innerZone = this.zoneManager?.innerContainerZone;
      const transform = innerZone?.coordinateSystem?.transform;
      if (transform && typeof transform === 'string') {
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) return parseFloat(match[1]);
      }
    } catch {}

    // Legacy fallback (non-zone layout)
    return this.x;
  }

  get collapsed() {
    return super.collapsed;
  }

  set collapsed(value) {
    if (value === this._collapsed) return;
    
    super.collapsed = value;

    if (this.collapsed) {
      this.collapse();
      this.handleDisplayChange(this, false);
    } else {
      this.expand();
    }

    this.cascadeUpdate();
  }

  propagateVisibility(visible) {
    this.childNodes.forEach((childNode) => {
      childNode.visible = visible;
      
      // Only propagate to nested containers if they are not collapsed
      // Collapsed containers should become visible themselves, but their children should remain hidden
      if (childNode instanceof BaseContainerNode && !childNode.collapsed) {
        childNode.propagateVisibility(visible);
      }
    });
  }

  get visible() {
    return this._visible;
  }

  set visible(value) {
    if (value === this._visible) return;
    super.visible = value;

  }

  get status() {
    return super.status;
  }
  set status(value) {
    super.status = value;
  }

  determineStatusBasedOnChildren() {
    if (this.childNodes.length === 0) return;
    if (!this.settings.cascadeOnStatusChange) {
      return;
    }

    // Safety check: don't determine status if element is null
    // Allow recalculation even when collapsed so auto-expand can trigger on status changes
    if (!this.element) {
      return;
    }

    const containerStatus = StatusManager.calculateContainerStatus(this.childNodes, this.settings);
    this.status = containerStatus;
  }

  handleDisplayChange(node = this, propagate = true) {
    if (this.suspenseDisplayChange) {
      return;
    }
    
    if (this.onDisplayChange) {
      this.onDisplayChange();
    } else if (propagate && this.parentNode && typeof this.parentNode.handleDisplayChange === 'function') {
      this.parentNode.handleDisplayChange();
    }
  }

  resize(size, forced = false) {


    // make sure the size of the element doesn't go below minimum size
    size.width = Math.max(size.width, this.minimumSize.width);
    size.height = Math.max(size.height, this.minimumSize.height);

    super.resize(size, forced);
  }

  // resize the node based on a resize of the container and it's child
  resizeContainer(size, forced = false) {
    size.width += this.containerMargin.left + this.containerMargin.right;
    size.height += this.containerMargin.top + this.containerMargin.bottom;


    this.resize(size, forced);
  }

  expand() {
    // Safety check: if element is already null, don't proceed with expand
    if (!this.element) {
      console.warn('Attempting to expand node with null element:', this.id);
      return;
    }

    // you can only expand a container if it's parent is already expanded
    // expand parent first when not expanded
    if (this.parentNode && this.parentNode.collapsed) {
      this.parentNode.collapsed = false;
    } else {
      // Recreate inner container zone DOM and re-attach child nodes to the DOM when expanding
      if (this.zoneManager) {
        // Lazily ensure the inner zone exists only when expanding
        const innerZone = this.zoneManager.ensureInnerContainerZone ? this.zoneManager.ensureInnerContainerZone() : this.zoneManager.innerContainerZone;
        
        // Force re-initialization of the inner container zone if its DOM was destroyed
        if (!innerZone.element || !innerZone.initialized) {
          innerZone.init();
          // Ensure freshly recreated zone has correct size from current node
          if (this.zoneManager) {
            this.zoneManager.resize(this.data.width, this.data.height);
          } else {
            innerZone.resize(this.data.width, this.data.height);
          }
          innerZone.update(); // Ensure coordinate system is updated
        }
        
        // Show zones first so the child container exists
        this.zoneManager.updateZoneVisibility();
        
        // CRITICAL: Restore the layout algorithm BEFORE reattaching children
        // This ensures the zone knows how to position children correctly
        if (!innerZone.layoutAlgorithm) {
          // If no layout algorithm exists (was lost during zone destruction), 
          // call the specific node type's layout method to restore it
          if (typeof this.layoutLane === 'function') {
            this.layoutLane();
          } else if (typeof this.layoutColumns === 'function') {
            this.layoutColumns();
          } else if (typeof this.updateChildren === 'function' && !this._updating) {
            this._updating = true;
            try {
              this.updateChildren();
            } finally {
              this._updating = false;
            }
          }
        }
        
        // CRITICAL: Update children BEFORE reattaching to ensure proper sizing
        // This ensures the container knows its proper dimensions before positioning children
        if (typeof this.updateChildren === 'function' && !this._updating) {
          this._updating = true;
          try {
            this.updateChildren();
          } finally {
            this._updating = false;
          }
        }
        
        // Ensure zones reflect current size and coordinate systems
        this.zoneManager.update();
        
        // Re-attach children and make them visible
        this.attachChildrenToDOM();
        
        // Now that children are attached and layout algorithm is restored, position them
        if (innerZone.layoutAlgorithm) {
          innerZone.updateChildPositions();
        }
        
        // Ensure the inner zone is properly updated after children are attached
        innerZone.update();
        innerZone.updateChildVisibility(true);

        // FINAL: Recompute container size from actual child content and resize
        if (!this.collapsed) {
          const headerZone = this.zoneManager?.headerZone;
          const headerHeight = headerZone ? headerZone.getHeaderHeight() : 20;
          const margins = this.zoneManager?.marginZone ? this.zoneManager.marginZone.getMargins() : { top: 8, right: 8, bottom: 8, left: 8 };
          const contentSize = innerZone.calculateChildContentSize();
          const widthFromContent = contentSize.width + margins.left + margins.right;
          const headerMinWidth = (headerZone && typeof headerZone.getMinimumWidthThrottled === 'function')
            ? headerZone.getMinimumWidthThrottled()
            : (headerZone && typeof headerZone.getMinimumWidth === 'function')
              ? headerZone.getMinimumWidth()
              : (headerZone ? (headerZone.getSize?.().width || 0) : 0);
          const headerBuffer = 2; // small extra to avoid tight fit
          const newWidth = Math.max(this.data.width, this.minimumSize.width, widthFromContent, headerMinWidth + headerBuffer);
          const newHeight = Math.max(this.minimumSize.height, headerHeight + margins.top + contentSize.height + margins.bottom);
          this.resize({ width: newWidth, height: newHeight }, true);
          // Ensure zones reflect final size
          if (this.zoneManager && !this.zoneManager._resizing) {
            this.zoneManager._resizing = true;
            try {
              this.zoneManager.resize(newWidth, newHeight);
            } finally {
              this.zoneManager._resizing = false;
            }
          }
          this.zoneManager.update();
          // And update child positions once more relative to final coordinate system
          innerZone.updateChildPositions();
          innerZone.update();
        }
      }

      // Show edges and ghostlines when expanding
      if (this.edgesContainer) {
        this.edgesContainer.style('display', null);
      }
      if (this.ghostContainer) {
        this.ghostContainer.style('display', null);
      }

      // Store current collapsed size before expanding  
      const collapsedSize = { width: this.data.width, height: this.data.height };

      // Recalculate container size based on current child content
      // This works for both:
      // 1. Containers that were expanded before (recalculates current content)
      // 2. Containers that started collapsed (calculates proper expanded size)
      // Note: We already called updateChildren above, so this is just for final sizing
      if (this.data.height > collapsedSize.height + 5 || this.data.width > collapsedSize.width + 5) {
        this.data.expandedSize = { width: this.data.width, height: this.data.height };
      }
      
      // Update parent container if this container's size changed
      // Disable pre-render mode for this layout pass since user manually changed layout
      if (this.parentNode && !this.parentNode._updating) {
        const parentZone = this.parentNode.zoneManager?.innerContainerZone;
        const wasPrerenderMode = parentZone?._prerenderMode;
        
        // Invalidate parent's pre-render data since child size changed
        if (this.parentNode.data.prerender) {
          delete this.parentNode.data.prerender;
        }
        
        // Temporarily disable pre-render mode so parent can recalculate layout
        if (parentZone) {
          parentZone._prerenderMode = false;
        }
        
        // Also disable the ZoneManager's prerender mode
        if (this.parentNode.zoneManager) {
          this.parentNode.zoneManager._prerenderMode = false;
        }
        
        this.parentNode._updating = true;
        try {
          this.parentNode.updateChildren();
        } finally {
          this.parentNode._updating = false;
          // Restore pre-render mode flag (but don't re-enable it, manual edits invalidate pre-render)
          if (parentZone && wasPrerenderMode) {
            // Keep it disabled - manual interaction invalidated the pre-render data
            // parentZone._prerenderMode = wasPrerenderMode;
          }
        }
      }
      
      this.initEdges();
    }
  }

  collapse() {
    // Safety check: if element is already null, don't proceed with collapse
    if (!this.element) {
      console.warn('Attempting to collapse node with null element:', this.id);
      return;
    }
    
    this.suspenseDisplayChange = true;
    // store the expanded size before collapsing
    if (this.data.height > this.minimumSize.height + 5 || this.data.width > this.minimumSize.width + 5)
      // Js: + 5, because of a strange bug, where the size differs slightly between renders, depending on the zoom level
      this.data.expandedSize = { height: this.data.height, width: this.data.width };

    // Detach child nodes and remove inner container/edges from the DOM
    if (this.zoneManager) {
      // Remove child DOM and child zone managers
      this.detachChildrenFromDOM();

      // Remove edges and ghostlines groups entirely
      if (this.edgesContainer) {
        this.edgesContainer.remove();
        this.edgesContainer = null;
      }
      if (this.ghostContainer) {
        this.ghostContainer.remove();
        this.ghostContainer = null;
      }

      // Destroy inner container zone DOM (g and rect)
      const innerZone = this.zoneManager.innerContainerZone;
      if (innerZone && typeof innerZone.destroy === 'function') {
        innerZone.destroy();
      }

      // Update zone visibility to hide inner container and margin zones
      this.zoneManager.updateZoneVisibility();
    } else {
      // Fallback to old behavior if zone system not available
      this.cleanContainer();
    }

    // Hide edges and ghostlines groups when collapsed
    if (this.edgesContainer && this.edgesContainer.style) {
      this.edgesContainer.style('display', 'none');
    }
    if (this.ghostContainer && this.ghostContainer.style) {
      this.ghostContainer.style('display', 'none');
    }

    // Update zones before sizing, so header metrics are current
    this.update();

    // Compute collapsed size based on header's intrinsic minimum (text + controls) and user minimums
    let headerMinWidth = 0;
    let headerHeight = this.minimumSize.height;
    if (this.zoneManager?.headerZone) {
      // Prefer precise header minimum width calculation when available
      if (typeof this.zoneManager.headerZone.getMinimumWidthThrottled === 'function') {
        headerMinWidth = this.zoneManager.headerZone.getMinimumWidthThrottled();
      } else if (typeof this.zoneManager.headerZone.getMinimumWidth === 'function') {
        headerMinWidth = this.zoneManager.headerZone.getMinimumWidth();
      } else {
        // Fallback to current header size width (may be larger than minimum)
        headerMinWidth = this.zoneManager.headerZone.getSize().width || 0;
      }
      // Use header's measured height if available
      headerHeight = this.zoneManager.headerZone.getHeaderHeight?.() ?? this.zoneManager.headerZone.getSize().height ?? headerHeight;
    }

    // Final collapsed dimensions (clamp to minimums)
    const collapsedWidth = Math.max(headerMinWidth, this.minimumSize.width);
    const collapsedHeight = Math.max(headerHeight, this.minimumSize.height);

    // Apply collapsed size
    this.resize({ width: collapsedWidth, height: collapsedHeight }, true);
    // Ensure zones reflect the new collapsed dimensions so header/background match text
    if (this.zoneManager) {
      try { this.zoneManager.resize(collapsedWidth, collapsedHeight); } catch {}
    }

    // Update parent and disable pre-render mode since user manually changed layout
    if (this.parentNode) {
      const parentZone = this.parentNode.zoneManager?.innerContainerZone;
      const wasPrerenderMode = parentZone?._prerenderMode;
      
      // Invalidate parent's pre-render data since child size changed
      if (this.parentNode.data.prerender) {
        delete this.parentNode.data.prerender;
      }
      
      // Temporarily disable pre-render mode so parent can recalculate layout
      if (parentZone) {
        parentZone._prerenderMode = false;
      }
      
      // Also disable the ZoneManager's prerender mode
      if (this.parentNode.zoneManager) {
        this.parentNode.zoneManager._prerenderMode = false;
      }
      
      this.parentNode.update();
      
      // Keep pre-render disabled - manual interaction invalidated the pre-render data
      // if (parentZone && wasPrerenderMode) {
      //   parentZone._prerenderMode = wasPrerenderMode;
      // }
    }

    // Ensure any child elements that might still exist are moved under this.element (collapsed containers do not show inner content group)
    try {
      const elNode = this.element?.node?.();
      if (elNode) {
        this.childNodes.forEach((child) => {
          const childEl = child?.element?.node?.();
          if (childEl && childEl.parentNode !== elNode) {
            try { elNode.appendChild(childEl); } catch {}
          }
        });
      }
    } catch {}
    this.suspenseDisplayChange = false;
  }

  getNode(nodeId) {
    if (this.id == nodeId) {
      return this;
    }
    for (const childNode of this.childNodes) {
      const foundNode = childNode.getNode(nodeId);
      if (foundNode) {
        return foundNode;
      }
    }
    return null;
  }

  getNodesByDatasetId(datasetId) {
    var nodes = [];
    if (this.data.datasetId == datasetId) {
      nodes.push(this);
    }
    if (this.childNodes) {
      for (const childNode of this.childNodes) {
        nodes.push(...childNode.getNodesByDatasetId(datasetId));
      }
    }
    return nodes;
  }

  positionContainer() {
    // When using the zone system, container positioning is handled by zones (center-based)
    if (this.zoneManager) {
      return;
    }
    // Legacy fallback (non-zone system)
    var containerDimensions = getComputedDimensions(this.element);
    var elementDimensions = getComputedDimensions(this.element);
    const containerX = 0;
    var containerY = elementDimensions.y - containerDimensions.y + this.containerMargin.top;
    this.element.attr("transform", `translate(${containerX}, ${containerY})`);
  }

  initEdges(propagate = false) {
    if (this.collapsed) return;

    if (this.childEdges.length > 0) {
      // create container for ghost lines first (so they appear behind edges)
      if (this.settings.showGhostlines)
      {
            if (this.ghostContainer)
              this.ghostContainer.selectAll("*").remove();
            else
              this.ghostContainer = this.element
                .append("g")
                .attr("class", (d) => `ghostlines`);
      }

      // create container for edges (after ghost lines, so edges appear on top)
      if (this.edgesContainer == null) 
      {
        this.edgesContainer = this.element.append("g").attr("class", (d) => `edges`);
      }
      else
      {
        this.edgesContainer.selectAll("*").remove();
      }

      this.childEdges.forEach((edge) => edge.init());
    }

    if (propagate) {
      this.childNodes.forEach((childNode) => {
        if (childNode instanceof BaseContainerNode) childNode.initEdges(propagate);
      });
    }
  }

  updateEdges() {
    if (!this.visible) return;
    if (this.collapsed) return;

    if (this.childEdges.length > 0) {
      this.childEdges.forEach((edge) => edge.update());
    }
  }

  // function to return all the nodes in the graph
  getAllNodes(onlySelected = false, onlyEndNodes = false) {
    const nodes = [];
    if ((!onlySelected || this.selected) && !onlyEndNodes) nodes.push(this);

    if (this.childNodes) {
      this.childNodes.forEach((childNode) => {
        nodes.push(...childNode.getAllNodes(onlySelected, onlyEndNodes));
      });
    }
    return nodes;
  }

  getAllEdges(onlySelected = false, allEdges = []) {
    super.getAllEdges(onlySelected, allEdges);

    if (this.childNodes) {
      this.childNodes.forEach((childNode) => {
        childNode.getAllEdges(onlySelected, allEdges);
      });
    }
  }

  init(parentElement = null) {
    if (parentElement) this.parentElement = parentElement;

    super.init(parentElement);

    // Zone manager is already initialized in BaseNode.init()

    // Container event handling strategy:
    // - Keep the bubble-phase handlers from BaseNode.init (they already call stopPropagation)
    // - Child nodes naturally prevent events from bubbling to parent due to stopPropagation
    // - No special logic needed - DOM event flow handles this correctly
    // - When clicking on container background (not on a child), the container's handler runs
    // - When clicking on a child node, the child's handler runs and stops propagation

    // Calculate minimum size using header zone metrics when available
    // In pre-render mode, use the pre-calculated minimum size to avoid recalculation
    if (this.hasPrerenderData && this.data.prerender?.minimumSize) {
      // Use pre-rendered minimum size (avoids text measurement and ensures consistency)
      this.minimumSize = {
        width: this.data.prerender.minimumSize.width || 0,
        height: this.data.prerender.minimumSize.height || 0
      };
    } else {
      // Normal mode: calculate minimum size from header zone
      const labelText = this.data.label || '';
      const fallbackLabelWidth = labelText.length * 8 + 36; // Fallback approximation

      let minHeaderWidth = fallbackLabelWidth;
      let headerHeight = 20; // Default fallback
      if (this.zoneManager?.headerZone) {
        const headerZone = this.zoneManager.headerZone;
        // Prefer precise header minimum width (text + indicator + button + paddings)
        if (typeof headerZone.getMinimumWidthThrottled === 'function') {
          try {
            minHeaderWidth = headerZone.getMinimumWidthThrottled();
          } catch {}
        } else if (typeof headerZone.getMinimumWidth === 'function') {
          try {
            minHeaderWidth = headerZone.getMinimumWidth();
          } catch {}
        } else {
          // Fallback to current header size width (may be larger than minimum)
          const headerSize = headerZone.getSize?.();
          if (headerSize?.width) minHeaderWidth = headerSize.width;
        }
        // Use header's measured height if available
        headerHeight = headerZone.getHeaderHeight?.() ?? headerHeight;
      }

      const defaultSize = { width: minHeaderWidth, height: headerHeight };
      this.minimumSize = GeometryManager.calculateMinimumSize([], defaultSize);
    }
    
    if (this.data.layout.minimumSize.width > this.minimumSize.width) this.minimumSize.width = this.data.layout.minimumSize.width;
    if (this.data.layout.minimumSize.height > this.minimumSize.height) this.minimumSize.height = this.data.layout.minimumSize.height;
    if (this.data.layout.minimumSize.useRootRatio) this.applyMinimumSize();

    if (this.data.width < this.minimumSize.width || this.data.height < this.minimumSize.height) {
      this.resize(
        {
          width: Math.max(this.minimumSize.width, this.data.width),
          height: Math.max(this.minimumSize.height, this.data.height),
        },
        true
      );
    }

    // Shape drawing is now handled by ContainerZone in the zone system

    // Always initialize children, regardless of collapsed state
    if (this.data.children && this.data.children.length > 0) {
      this.initChildren();
    }
    
    // Apply collapsed state after children are initialized
    if (this.collapsed) {
      this.collapse();
    } else {
      this.expand();
    }

    // you cannot move the g node,, move the child elements in stead
    this.element.attr("transform", `translate(${this.x}, ${this.y})`);

    // Post-initialization: defer one re-measure to stabilize header width after fonts/styles
    // Skip this in pre-render mode since we already have the correct minimum size
    if (!this._didPostInitMeasure && !this.hasPrerenderData) {
      this._didPostInitMeasure = true;
      setTimeout(() => {
        try {
          const headerZone = this.zoneManager?.headerZone;
          if (!headerZone) return;
          const headerMinWidth = (typeof headerZone.getMinimumWidthThrottled === 'function')
            ? headerZone.getMinimumWidthThrottled()
            : (typeof headerZone.getMinimumWidth === 'function')
              ? headerZone.getMinimumWidth()
              : (headerZone.getSize?.().width || 0);
          const width = Math.max(this.data.width || 0, this.minimumSize?.width || 0, headerMinWidth || 0);
          if (width > (this.data.width || 0)) {
            const size = { width, height: this.data.height };
            this.resize(size, true);
            if (this.zoneManager) this.zoneManager.resize(size.width, size.height);
            this.update();
          }
        } catch {}
      }, 0);
    }
  }

  initChildren() {
    if (!this.data.children || this.data.children.length === 0) {
      return;
    }

    

    if (this.data.children.length == 0) {
      // no rendering of the children, but this renders a placeholder rect
      const containerWidth = this.data.width - this.containerMargin.left - this.containerMargin.right;
      const containerHeight = this.data.height - this.containerMargin.top - this.containerMargin.bottom;
      this.element
        .append("rect")
        .attr("class", `${this.data.type} placeholder`)
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .attr("x", -containerWidth / 2)
        .attr("y", -containerHeight / 2);
    }
    else
    {
      // Ensure inner container zone exists before creating children so we never fall back to the root element
      let innerZone = this.zoneManager?.innerContainerZone;
      if (!innerZone && this.zoneManager?.ensureInnerContainerZone) {
        innerZone = this.zoneManager.ensureInnerContainerZone();
      }
      // Get child container from zone system (prefer inner container)
      const childContainer = innerZone?.getChildContainer() || this.element;
      
      for (const node of this.data.children) {
        // Create the childComponent instance based on node type
        var childComponent = this.getNode(node.id);
        if (childComponent == null) {
          
          childComponent = this.createNode(node, childContainer, this.settings, this);
          this.childNodes.push(childComponent);

          // Add child to zone system
          if (innerZone) {
            innerZone.addChild(childComponent);
          } else {
            console.warn("Zone system not available for child:", node.id);
          }
        }

        childComponent.init(childContainer);
      }
      
      // Trigger child positioning after all children are initialized
      if (innerZone) {
        innerZone.forceUpdateChildPositions();
      }
    }

    // Only call updateChildren if we're not already in an update cycle
    if (!this._updating) {
      this._updating = true;
      try {
        this.updateChildren();
      } finally {
        this._updating = false;
      }
    }
  }

  update() {
    super.update();

    // Shape drawing is now handled by ContainerZone in the zone system

    // Ensure DOM parent for all children is correct before layout
    this.ensureChildrenDomParent();

    // Only call updateChildren if we're not already in an update cycle
    // This prevents infinite loops between the zone system and node updates
    if (!this._updating) {
      this._updating = true;
      try {
        this.updateChildren();
      } finally {
        this._updating = false;
      }
    }

    if (!this.collapsed) {
      this.updateEdges();
    }
  }

  // Ensure children are attached under the inner container zone's child container
  ensureChildrenDomParent() {
    try {
      if (!this.childNodes || this.childNodes.length === 0) return;
      // Prefer inner container when expanded; fallback to this.element when collapsed
      let innerZone = this.zoneManager?.innerContainerZone;
      if (!this.collapsed && !innerZone && this.zoneManager?.ensureInnerContainerZone) {
        innerZone = this.zoneManager.ensureInnerContainerZone();
      }
      const parentGroup = (innerZone && !this.collapsed) ? (innerZone.getChildContainer?.() || this.element) : this.element;
      const parentNode = parentGroup?.node?.() || null;
      if (!parentNode) return;
      this.childNodes.forEach((childNode) => {
        const el = childNode?.element?.node?.();
        if (!el) return;
        if (el.parentNode !== parentNode) {
          // Move element under the correct parent group
          try { parentNode.appendChild(el); } catch {}
        }
      });
    } catch {}
  }

  updateChildren() {
    // If we have pre-render data, skip layout calculations
    if (this.hasPrerenderData && this.allChildrenHavePrerender()) {
      // console.log(`📊 Pre-render: Skipping layout for ${this.id}`);
      
      // Apply pre-render positions to children
      this.applyPrerenderToChildren();
      
      // Update container size based on pre-render data
      this.updateContainerSize();
      
      return; // Skip normal layout algorithm
    }

    // Use zone system for child positioning if available
    if (this.zoneManager) {
      // Ensure DOM parent is correct even when status toggles cause collapse/expand
      this.ensureChildrenDomParent();
      
      // If not using pre-render, recalculate container size from actual children
      if (!this.collapsed && this.zoneManager.innerContainerZone) {
        const innerZone = this.zoneManager.innerContainerZone;
        const headerZone = this.zoneManager.headerZone;
        const marginZone = this.zoneManager.marginZone;
        
        const headerHeight = headerZone ? headerZone.getHeaderHeight() : 20;
        const margins = marginZone ? marginZone.getMargins() : { top: 8, right: 8, bottom: 8, left: 8 };
        
        // CRITICAL: First reposition children, THEN calculate size from their positions
        innerZone.updateChildPositions();
        
        // Now calculate the bounding box of the repositioned children
        const contentSize = innerZone.calculateChildContentSize();
        const widthFromContent = contentSize.width + margins.left + margins.right;
        const headerMinWidth = (headerZone && typeof headerZone.getMinimumWidthThrottled === 'function')
          ? headerZone.getMinimumWidthThrottled()
          : (headerZone && typeof headerZone.getMinimumWidth === 'function')
            ? headerZone.getMinimumWidth()
            : (headerZone ? (headerZone.getSize?.().width || 0) : 0);
        
        const newWidth = Math.max(this.minimumSize.width, widthFromContent, headerMinWidth);
        const newHeight = Math.max(this.minimumSize.height, headerHeight + margins.top + contentSize.height + margins.bottom);
        
        // Only resize if size actually changed to avoid infinite loops
        const widthDiff = Math.abs(this.data.width - newWidth);
        const heightDiff = Math.abs(this.data.height - newHeight);
        if (widthDiff > 1 || heightDiff > 1) {
          this.resize({ width: newWidth, height: newHeight }, true);
          if (this.zoneManager && !this.zoneManager._resizing) {
            this.zoneManager._resizing = true;
            try {
              this.zoneManager.resize(newWidth, newHeight);
            } finally {
              this.zoneManager._resizing = false;
            }
          }
          
          // After resizing parent, reposition children again to adjust to new parent size
          innerZone.updateChildPositions();
        }
      }
      
      // Zone system handles positioning
      return;
    }

    // Fallback to legacy positioning
    this.element.attr(
      "transform",
      `translate(
            ${this.containerMargin.left - this.containerMargin.right}, 
            ${this.containerMargin.top - this.containerMargin.bottom}
          )`
    );
  }

  // Method to remove child nodes from the SVG
  cleanContainer(propagate = true) {
    // Only clean if element exists
    if (this.element) {
      this.element.selectAll("*").remove();
    }
    this.edgesContainer = null;
    for (const childNode of this.childNodes) {
      if (childNode instanceof BaseContainerNode) childNode.cleanContainer(propagate);
    }
  }

  // Remove child DOM nodes (but keep instances) so collapsed containers reduce DOM size
  detachChildrenFromDOM() {
    if (!this.childNodes || this.childNodes.length === 0) return;

    // Mark children invisible and remove their DOM elements
    this.childNodes.forEach((childNode) => {
      try {
        childNode.visible = false;
        if (childNode.element) {
          childNode.element.remove();
          childNode.element = null;
        }
        // If child is a container and has zones, destroy them so they can re-init on expand
        if (childNode.zoneManager && typeof childNode.zoneManager.destroy === 'function') {
          childNode.zoneManager.destroy();
          childNode.zoneManager = null;
        }
      } catch (e) {
        console.warn('Failed detaching child from DOM:', childNode?.id, e);
      }
    });
  }

  // Re-create child DOM nodes and add them back into the inner container zone
  attachChildrenToDOM() {
    if (!this.childNodes || this.childNodes.length === 0) return;
    
    // Ensure inner container exists only when the parent is expanded
    const innerZone = this.zoneManager?.ensureInnerContainerZone ? this.zoneManager.ensureInnerContainerZone() : this.zoneManager?.innerContainerZone;
    const childContainer = innerZone?.getChildContainer() || this.element;

    this.childNodes.forEach((childNode) => {
      try {
        // console.log(`attachChildrenToDOM: Processing child ${childNode.id}, has element: ${!!childNode.element}, visible: ${childNode.visible}`);
        
        // If DOM does not exist, re-init the child into the current child container
        if (!childNode.element) {
          // console.log(`attachChildrenToDOM: Reinitializing child ${childNode.id} in container ${this.id}`);
          childNode.init(childContainer);
        } else {
          // Ensure DOM is attached to the correct container group
          try {
            const currentParent = childNode.element.node()?.parentNode || null;
            const desiredParent = childContainer.node?.() || null;
            if (desiredParent && currentParent !== desiredParent) {
              desiredParent.appendChild(childNode.element.node());
            }
          } catch {}
        }
        // Ensure the zone knows about this child (always re-register after zone recreation)
        if (innerZone) {
          innerZone.addChild(childNode);
        }
        // Make the child visible again (containers will manage their own collapsed children)
        childNode.visible = true;
        // console.log(`attachChildrenToDOM: Set child ${childNode.id} visible to true`);
        
        // For nested containers, ensure their zones and layout are refreshed
        if (childNode.isContainer) {
          // console.log(`attachChildrenToDOM: Child ${childNode.id} is a container, refreshing its zones`);
          
          // Ensure descendants are visible unless they are collapsed containers
          if (typeof childNode.propagateVisibility === 'function') {
            childNode.propagateVisibility(true);
          }
          
          // Force re-initialization of nested container zones if their DOM was destroyed
          if (childNode.zoneManager?.innerContainerZone && (!childNode.zoneManager.innerContainerZone.element || !childNode.zoneManager.innerContainerZone.initialized)) {
            // Only initialize nested inner zones if the nested container is expanded
            if (!childNode.collapsed) {
              // console.log(`attachChildrenToDOM: Reinitializing nested inner zone for child ${childNode.id}`);
              childNode.zoneManager.innerContainerZone.init();
                        // Ensure nested zones have correct size from child node
          if (childNode.zoneManager && !childNode.zoneManager._resizing) {
            childNode.zoneManager._resizing = true;
            try {
              childNode.zoneManager.resize(childNode.data.width, childNode.data.height);
            } finally {
              childNode.zoneManager._resizing = false;
            }
          }
              childNode.zoneManager.innerContainerZone.update();
            }
          }
          
          if (childNode.zoneManager) {
            childNode.zoneManager.update();
          }
          
          // CRITICAL: Update children BEFORE calling updateChildPositions
          // This ensures the nested container has proper dimensions
          if (!childNode.collapsed && typeof childNode.updateChildren === 'function' && !childNode._updating) {
            // console.log(`attachChildrenToDOM: Updating children for nested container ${childNode.id}`);
            childNode._updating = true;
            try {
              childNode.updateChildren();
            } finally {
              childNode._updating = false;
            }
          }
          
          // Now that children are updated, position them
          if (!childNode.collapsed && childNode.zoneManager?.innerContainerZone) {
            childNode.zoneManager.innerContainerZone.updateChildPositions();
          }
        }
      } catch (e) {
        console.warn('Failed attaching child to DOM:', childNode?.id, e);
      }
    });

    // After re-attaching, update positions via the zone system
    if (innerZone) {
      innerZone.forceUpdateChildPositions();
    }

    // Finally, ensure this container recomputes its own sizing/zone metrics
    if (this.zoneManager) {
      this.zoneManager.update();
    }

    // Defer an additional layout pass to ensure nested containers complete init cycles
    setTimeout(() => {
      try {
        this.childNodes.forEach((childNode) => {
          if (childNode.isContainer) {
            if (childNode.zoneManager) childNode.zoneManager.update();
            
            // CRITICAL: Update children BEFORE positioning them
            if (!childNode.collapsed && typeof childNode.updateChildren === 'function' && !childNode._updating) {
              childNode._updating = true;
              try {
                childNode.updateChildren();
              } finally {
                childNode._updating = false;
              }
            }
            
            // Now that children are updated, position them
            if (!childNode.collapsed && childNode.zoneManager?.innerContainerZone) {
              childNode.zoneManager.innerContainerZone.updateChildPositions();
            }
          }
        });
      } catch (e) {
        console.warn('Failed deferred layout update:', e);
      }
    }, 0);

    // console.log(`attachChildrenToDOM: Finished reattaching children for node ${this.id}`);
  }

  applyMinimumSize() {
    if (this.minimumSize.width < this.data.layout.minimumSize.width) this.minimumSize.width = this.data.layout.minimumSize.width;
    if (this.minimumSize.height < this.data.layout.minimumSize.height) this.minimumSize.height = this.data.layout.minimumSize.height;

    if (!this.data.layout.minimumSize.useRootRatio) return;

    // Guard: ensure we have a valid ratio to avoid NaN during early layout passes
    const ratio = (this.settings && this.settings.divRatio && this.settings.divRatio > 0)
      ? this.settings.divRatio
      : 16 / 9;

    // Use current node data.height as reference; avoid undefined "this.height"
    const currentHeight = this.data.height || this.minimumSize.height || 1;

    if (this.minimumSize.width / currentHeight > ratio) {
      this.minimumSize.height = this.minimumSize.width / ratio;
    } else {
      this.minimumSize.width = this.minimumSize.height * ratio;
    }
  }

  /**
   * Check if all children have pre-render data
   * @returns {boolean}
   */
  allChildrenHavePrerender() {
    if (!this.childNodes || this.childNodes.length === 0) return false;
    return this.childNodes.every(child => child.hasPrerenderData);
  }

  /**
   * Apply pre-render positions to all children
   */
  applyPrerenderToChildren() {
    this.childNodes.forEach(child => {
      // Position is already set in constructor
      // Just need to apply the transform
      child.element.attr('transform', `translate(${child.x}, ${child.y})`);
      
      // If child is a container, recursively apply to its children
      if (child.isContainer && typeof child.applyPrerenderToChildren === 'function') {
        child.applyPrerenderToChildren();
      }
    });
  }

  /**
   * Update container size based on pre-render data
   */
  updateContainerSize() {
    if (this.data.prerender) {
      this.data.width = this.data.prerender.width;
      this.data.height = this.data.prerender.height;
    }
  }
}
