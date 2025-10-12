import BaseContainerNode from "./nodeBaseContainer.js";
import { getComputedDimensions } from "./utils.js";
import { LayoutManager } from "./layoutManager.js";

export default class ColumnsNode extends BaseContainerNode {
  constructor(nodeData, parentElement, createNode, settings, parentNode = null) {
    // Set up default layout configuration for columns node
    // Ensure layout is an object, not a string
    if (typeof nodeData.layout === 'string') {
      nodeData.layout = { type: nodeData.layout };
    }
    nodeData.layout ??= {};
    nodeData.layout.minimumColumnWidth ??= 0;
    const minHeight = 10; // header + top margin + min child + bottom margin
    nodeData.layout.minimumSize ??= { height: minHeight, useRootRatio: false };

    super(nodeData, parentElement, createNode, settings, parentNode);
    
    // Prevent infinite recursion during resize operations
    this._isResizing = false;
  }

  get nestedCorrection_y() {
    // Defer to BaseContainerNode's zone-aware implementation to avoid double offsets
    return super.nestedCorrection_y;
  }

  get nestedCorrection_x() {
    // Defer to BaseContainerNode's zone-aware implementation to avoid double offsets
    return super.nestedCorrection_x;
  }

  updateChildren() {
    
    
    // Always call layoutColumns to recalculate size and positioning
    this.layoutColumns();
  }

  updateChildrenWithZoneSystem() {
    
    
    // Call layoutColumns to recalculate size and positioning when using zone system
    this.layoutColumns();
  }

  layoutColumns() {
    // If collapsed, size to header minimum without requiring inner zone
    if (this.collapsed) {
      const headerZone = this.zoneManager?.headerZone;
      const headerHeight = headerZone ? headerZone.getHeaderHeight() : 20;
      const headerMinWidth = (headerZone && typeof headerZone.getMinimumWidthThrottled === 'function')
        ? headerZone.getMinimumWidthThrottled()
        : (headerZone && typeof headerZone.getMinimumWidth === 'function')
          ? headerZone.getMinimumWidth()
          : (headerZone ? (headerZone.getSize?.().width || 0) : 0);

      if (!this._isResizing) {
        const newSize = {
          width: Math.max(this.minimumSize.width, headerMinWidth),
          height: Math.max(this.minimumSize.height, headerHeight)
        };
        this._isResizing = true;
        try {
          this.resize(newSize);
          this.handleDisplayChange();
        } finally {
          this._isResizing = false;
        }
      }
      return;
    }

    // Ensure inner container zone exists for expanded layout
    let innerContainerZone = this.zoneManager?.innerContainerZone;
    if (!innerContainerZone && this.zoneManager?.ensureInnerContainerZone) {
      innerContainerZone = this.zoneManager.ensureInnerContainerZone();
    }
    if (!innerContainerZone) {
      return;
    }


    

    // Set horizontal row layout algorithm
    innerContainerZone.setLayoutAlgorithm((childNodes, coordinateSystem) => {
      if (childNodes.length === 0) return;

      const spacing = this.nodeSpacing?.horizontal || 20;
      const visibleChildNodes = childNodes.filter(childNode => childNode.visible);
      if (visibleChildNodes.length === 0) return;

      // Compute total content width to center around 0
      const contentWidth = visibleChildNodes.reduce((sum, n) => {
        const w = n.getEffectiveWidth ? n.getEffectiveWidth() : n.data.width;
        return sum + w;
      }, 0) + (visibleChildNodes.length > 1 ? (visibleChildNodes.length - 1) * spacing : 0);

      let currentX = -contentWidth / 2;

      visibleChildNodes.forEach(childNode => {
        const w = childNode.getEffectiveWidth ? childNode.getEffectiveWidth() : childNode.data.width;
        const x = currentX + w / 2;
        const y = 0;
        childNode.move(x, y);
        currentX += w + spacing;
      });
    });

    // Calculate required size for visible children only
    // Children report their effective size (handling collapsed state internally)
    const visibleChildren = this.childNodes.filter(node => node.visible);
    const totalChildWidth = visibleChildren.reduce((sum, node) => {
      // Let each child report its effective width
      const effectiveWidth = node.getEffectiveWidth ? node.getEffectiveWidth() : node.data.width;
      return sum + effectiveWidth;
    }, 0);
    // Calculate spacing between ALL visible children (including collapsed ones)
    // This ensures proper spacing even when some children are collapsed
    const totalSpacing = visibleChildren.length > 1 ? (visibleChildren.length - 1) * this.nodeSpacing.horizontal : 0;
    const maxChildHeight = visibleChildren.length > 0 
      ? Math.max(...visibleChildren.map(node => {
          const effectiveHeight = node.getEffectiveHeight ? node.getEffectiveHeight() : node.data.height;
          return effectiveHeight;
        }))
      : 0;
    
    // Get margin zone for size calculations
    const marginZone = this.zoneManager?.marginZone;
    const headerZone = this.zoneManager?.headerZone;
    const headerHeight = headerZone ? headerZone.getHeaderHeight() : 20;

    if (marginZone && !this._isResizing) {
      let newSize;
      
      if (this.collapsed) {
        // When collapsed, only use header height (no margins or content)
        const headerMinWidth = (headerZone && typeof headerZone.getMinimumWidthThrottled === 'function')
          ? headerZone.getMinimumWidthThrottled()
          : (headerZone && typeof headerZone.getMinimumWidth === 'function')
            ? headerZone.getMinimumWidth()
            : (headerZone ? (headerZone.getSize?.().width || 0) : 0);
        newSize = {
          width: Math.max(this.minimumSize.width, headerMinWidth),
          height: Math.max(this.minimumSize.height, headerHeight)
        };
      } else {
        // When expanded, use margin zone calculation with correct margins
        // This ensures proper sizing based on actual child content
        const margins = marginZone.getMargins();
        // Compute content width unconstrained so node can expand to fit children
        const contentWidth = Math.max(0, totalChildWidth + totalSpacing);
        const contentHeight = Math.max(maxChildHeight, 0);
        
        const headerMinWidth = (headerZone && typeof headerZone.getMinimumWidthThrottled === 'function')
          ? headerZone.getMinimumWidthThrottled()
          : (headerZone && typeof headerZone.getMinimumWidth === 'function')
            ? headerZone.getMinimumWidth()
            : (headerZone ? (headerZone.getSize?.().width || 0) : 0);
        newSize = {
          width: Math.max(this.minimumSize.width, headerMinWidth, contentWidth + margins.left + margins.right),
          height: headerHeight + margins.top + Math.max(contentHeight, 0) + margins.bottom
        };
      }
      
      // Set flag to prevent infinite recursion
      this._isResizing = true;
      try {
        this.resize(newSize);
        // Notify parent nodes that this node's size has changed
        this.handleDisplayChange();
      } finally {
        this._isResizing = false;
      }
    }

    // Update child positions using zone system
    innerContainerZone.updateChildPositions();
  }



  arrange() {
    
    this.updateChildren();
  }
}
