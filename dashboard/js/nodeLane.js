import BaseContainerNode from './nodeBaseContainer.js';
import { getComputedDimensions } from './utils.js';
import { LayoutManager } from './layoutManager.js';

export default class LaneNode extends BaseContainerNode {
  constructor(nodeData, parentElement, createNode, settings, parentNode = null) {
    super(nodeData, parentElement, createNode, settings, parentNode);

    // Prevent infinite recursion during resize operations
    this._isResizing = false;
  }

  get nestedCorrection_y() {
    // Defer to BaseContainerNode's zone-aware implementation
    return super.nestedCorrection_y;
  }

  get nestedCorrection_x() {
    // Defer to BaseContainerNode's zone-aware implementation
    return super.nestedCorrection_x;
  }

  updateChildren() {
    // Always call layoutLane to recalculate size and positioning
    this.layoutLane();
  }

  updateChildrenWithZoneSystem() {
    // Call layoutLane to recalculate size and positioning when using zone system
    this.layoutLane();
  }

  layoutLane() {
    // If collapsed, size to header minimum without requiring inner zone
    if (this.collapsed) {
      const headerZone = this.zoneManager?.headerZone;
      const headerHeight = headerZone ? headerZone.getHeaderHeight() : 20;
      const headerMinWidth = headerZone?.getMinWidth?.() ?? 50;

      if (!this._isResizing) {
        const newSize = {
          width: Math.max(this.minimumSize.width, headerMinWidth),
          height: Math.max(this.minimumSize.height, headerHeight),
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

    // Set vertical stacking layout algorithm centered around (0,0)
    innerContainerZone.setLayoutAlgorithm((childNodes, coordinateSystem) => {
      if (childNodes.length === 0) return;

      const spacing = this.nodeSpacing?.vertical || 10;

      // Only position visible children
      const visibleChildNodes = childNodes.filter((childNode) => childNode.visible);
      if (visibleChildNodes.length === 0) return;

      // Compute total content height to center around 0
      const totalContentHeight =
        visibleChildNodes.reduce((sum, n) => sum + n.data.height, 0) +
        spacing * (visibleChildNodes.length - 1);
      let currentTop = -totalContentHeight / 2;

      visibleChildNodes.forEach((childNode) => {
        const x = 0; // center horizontally
        const y = currentTop + childNode.data.height / 2; // center of this child
        childNode.move(x, y);
        currentTop += childNode.data.height + spacing;
      });
    });

    // Calculate required size for visible children only
    // Children report their effective size (handling collapsed state internally)
    const visibleChildren = this.childNodes.filter((node) => node.visible);
    const totalChildHeight = visibleChildren.reduce((sum, node) => {
      // Let each child report its effective height
      const effectiveHeight = node.getEffectiveHeight
        ? node.getEffectiveHeight()
        : node.data.height;
      return sum + effectiveHeight;
    }, 0);
    // Calculate spacing between ALL visible children (including collapsed ones)
    // This ensures proper spacing even when some children are collapsed
    const totalSpacing =
      visibleChildren.length > 1 ? (visibleChildren.length - 1) * this.nodeSpacing.vertical : 0;
    const maxChildWidth =
      visibleChildren.length > 0
        ? Math.max(
            ...visibleChildren.map((node) => {
              // Let each child report its effective width
              const effectiveWidth = node.getEffectiveWidth
                ? node.getEffectiveWidth()
                : node.data.width;
              return effectiveWidth;
            }),
          )
        : 0;

    // Get margin zone for size calculations
    const marginZone = this.zoneManager?.marginZone;
    const headerZone = this.zoneManager?.headerZone;
    const headerHeight = headerZone ? headerZone.getHeaderHeight() : 20;
    const headerMinWidth = headerZone?.getMinWidth?.() ?? 0;

    if (marginZone && !this._isResizing) {
      let newSize;

      if (this.collapsed) {
        // When collapsed, only use header height (no margins or content)
        newSize = {
          width: Math.max(this.minimumSize.width, headerMinWidth),
          height: Math.max(this.minimumSize.height, headerHeight),
        };
      } else {
        // When expanded, use margin zone calculation with correct margins
        // This ensures proper sizing based on actual child content
        const margins = marginZone.getMargins();
        // Compute content width unconstrained so lane can expand to fit the widest child
        const contentWidth = Math.max(0, maxChildWidth);
        const contentHeight = totalChildHeight + totalSpacing;

        newSize = {
          width: Math.max(
            this.minimumSize.width,
            headerMinWidth,
            contentWidth + margins.left + margins.right,
          ),
          height: headerHeight + margins.top + contentHeight + margins.bottom,
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
