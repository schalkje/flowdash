import BaseContainerNode from './nodeBaseContainer.js';
import RectangularNode from './nodeRect.js';
import { createInternalEdge } from './edge.js';
import { getComputedDimensions } from './utils.js';

const roleWidth = 80;

const DisplayMode = Object.freeze({
  FULL: 'full',
  ROLE: 'role',
});

const Orientation = Object.freeze({
  HORIZONTAL: 'horizontal',
  HORIZONTAL_LINE: 'horizontal_line',
  VERTICAL: 'vertical',
  ROTATE_90: 'rotate90',
  ROTATE_270: 'rotate270',
});

const FoundationMode = Object.freeze({
  MANUAL: 'manual',
  AUTO: 'auto',
});

export default class FoundationNode extends BaseContainerNode {
  static initializeNodeDataStatic(nodeData) {
    // Base sizing and layout defaults
    if (!nodeData.width) nodeData.width = 334;
    if (!nodeData.height) nodeData.height = 44;
    // Normalize layout object and defaults
    if (!nodeData.layout || typeof nodeData.layout !== 'object') nodeData.layout = {};
    const allowedDisplayModes = [DisplayMode.FULL, DisplayMode.ROLE];
    const allowedOrientations = [
      Orientation.HORIZONTAL,
      Orientation.HORIZONTAL_LINE,
      Orientation.VERTICAL,
      Orientation.ROTATE_90,
      Orientation.ROTATE_270,
    ];
    const allowedModes = [FoundationMode.MANUAL, FoundationMode.AUTO];

    // Display mode
    let displayMode = nodeData.layout.displayMode ?? DisplayMode.ROLE;
    displayMode = typeof displayMode === 'string' ? displayMode.toLowerCase() : DisplayMode.ROLE;
    if (!allowedDisplayModes.includes(displayMode)) displayMode = DisplayMode.ROLE;
    nodeData.layout.displayMode = displayMode;

    // Orientation
    let orientation = nodeData.layout.orientation ?? Orientation.HORIZONTAL;
    orientation =
      typeof orientation === 'string' ? orientation.toLowerCase() : Orientation.HORIZONTAL;
    if (!allowedOrientations.includes(orientation)) orientation = Orientation.HORIZONTAL;
    nodeData.layout.orientation = orientation;

    // Mode
    let mode = nodeData.layout.mode ?? FoundationMode.AUTO;
    mode = typeof mode === 'string' ? mode.toLowerCase() : FoundationMode.AUTO;
    if (!allowedModes.includes(mode)) mode = FoundationMode.AUTO; // manual, auto
    nodeData.layout.mode = mode;

    // Role mode has fixed role tag widths
    if (nodeData.layout.displayMode === DisplayMode.ROLE) {
      nodeData.width = roleWidth + roleWidth + 20 + 8 + 8; // two roles + spacing + margins
      nodeData.height = 44;
    }

    // Ensure children array exists and pre-create raw/base when in AUTO mode
    if (!nodeData.children) nodeData.children = [];

    // Validate explicit children roles when provided and normalize for role mode
    if (nodeData.children.length > 0) {
      const allowedRoles = ['raw', 'base'];
      nodeData.children.forEach((child) => {
        let role = (child.role || '').toLowerCase();
        if (!role) {
          const category = (child.category || '').toLowerCase();
          if (allowedRoles.includes(category)) role = category;
          else if ((child.label || '').toLowerCase().includes('raw')) role = 'raw';
          else if ((child.label || '').toLowerCase().includes('base')) role = 'base';
        }
        if (!role || !allowedRoles.includes(role)) {
          console.error('FoundationNode child missing or invalid role', {
            parentId: nodeData.id,
            parentLabel: nodeData.label,
            childId: child.id,
            childLabel: child.label,
            role: child.role,
          });
        } else {
          // Normalize role and label in ROLE display mode early
          child.role = role;
          child.category = role;
          if (nodeData.layout.displayMode === DisplayMode.ROLE) {
            child.label = role;
            child.width = roleWidth;
            // Prefer consistent default height for rectangular nodes
            if (!child.height) child.height = 20;
          }
        }
      });
    }
    const isAuto = nodeData.layout.mode === FoundationMode.AUTO;
    const ensureChild = (role) => {
      let child = nodeData.children.find((c) => c.role === role || c.category === role);
      if (!child && isAuto) {
        const isRoleMode = nodeData.layout.displayMode === DisplayMode.ROLE;
        child = {
          id: `${role}_${nodeData.id}`,
          label: isRoleMode
            ? role
            : `${role.charAt(0).toUpperCase() + role.slice(1)} ${nodeData.label}`,
          role: role,
          category: role,
          type: 'node',
          width: isRoleMode ? roleWidth : 150,
          height: 20,
        };
        nodeData.children.push(child);
      }
    };
    ensureChild('raw');
    ensureChild('base');

    return nodeData;
  }

  constructor(nodeData, parentElement, createNode, settings, parentNode = null) {
    // Normalize and pre-populate children before base initialization (zone system relies on it)
    nodeData = FoundationNode.initializeNodeDataStatic(nodeData);

    super(nodeData, parentElement, createNode, settings, parentNode);

    this.rawNode = null;
    this.baseNode = null;
    // Adopt node spacing from settings if provided
    this.nodeSpacing = {
      horizontal: this.settings?.nodeSpacing?.horizontal ?? 20,
      vertical: this.settings?.nodeSpacing?.vertical ?? 10,
    };

    // Cache for header minimum width to avoid repeated calculations
    this._cachedHeaderMinWidth = undefined;
  }

  get nestedCorrection_y() {
    return this.y;
  }

  initChildren() {
    this.suspenseDisplayChange = true;

    // Let BaseContainerNode create child components from pre-created child data
    super.initChildren();

    if (!this.data.children || this.data.children.length === 0) {
      this.data.children = [];
    }

    // After super created the children, always run role-aware initializer to normalize labels/sizes
    this.rawNode = this.initializeChildNode('raw', ['raw']);
    this.baseNode = this.initializeChildNode('base', ['base']);

    // Standardize explicit and auto-created child dimensions so height is consistent
    this.standardizeChildDimensions();

    createInternalEdge(
      {
        source: this.rawNode.data.id,
        target: this.baseNode.data.id,
        isActive: true,
        type: 'SSIS',
        state: 'Ready',
      },
      this.rawNode,
      this.baseNode,
      this.settings,
    );

    this.initEdges();

    // In prerender mode, init() already applied the prerender size; recomputing
    // expandedSize and resizing here would overwrite it with a heuristic
    // header/raw/base width and a fixed 18px height.
    if (!this.hasPrerenderData) {
      // Compute expanded width from children and ensure it's at least the header minimum width
      const headerZone = this.zoneManager?.headerZone;
      const headerMinWidth = headerZone?.getMinWidth?.() ?? 0;
      const headerBuffer = 2;
      this.data.expandedSize = {
        width: Math.max(
          headerMinWidth + headerBuffer,
          this.rawNode.data.width +
            this.nodeSpacing.horizontal +
            this.baseNode.data.width +
            this.containerMargin.left +
            this.containerMargin.right,
        ),
        height: this.containerMargin.top + this.containerMargin.bottom + 18, //JS: why fixed 18
      };

      this.resize(this.data.expandedSize, true);
    }
    this.update();
    this.cascadeUpdate();

    this.suspenseDisplayChange = false;
    this.handleDisplayChange();
  }

  /**
   * Ensure raw/base child nodes have consistent dimensions across explicit and auto-generated cases
   */
  standardizeChildDimensions() {
    const isRoleMode = this.data.layout.displayMode === DisplayMode.ROLE;
    const standardWidth = isRoleMode ? roleWidth : 150;
    const standardHeight = 20;

    [this.rawNode, this.baseNode].forEach((child) => {
      if (!child) return;
      child.data.width = standardWidth;
      child.data.height = standardHeight;
      if (typeof child.resize === 'function') {
        child.resize({ width: standardWidth, height: standardHeight });
      }
      if (isRoleMode && typeof child.redrawText === 'function') {
        const newLabel = child.data.role || child.data.label;
        child.redrawText(newLabel, standardWidth);
      }
    });
  }

  initializeChildNode(role, labels) {
    let node = this.childNodes.find(
      (child) =>
        child.data.category != null && child.data.category.toLowerCase() === role.toLowerCase(),
    );
    if (!node) {
      node = this.childNodes.find((child) =>
        labels.some((label) => child.data.label.toLowerCase().includes(label.toLowerCase() + '.')),
      );
    }
    if (!node) {
      node = this.childNodes.find((child) =>
        labels.some((label) => child.data.label.toLowerCase().includes(label.toLowerCase())),
      );
    }
    if (!node) {
      let childData = this.data.children.find((child) => child.category === role);
      if (!childData && this.shouldCreateChildNode(role)) {
        childData = {
          id: `${role}_${this.data.id}`,
          label: `${role.charAt(0).toUpperCase() + role.slice(1)} ${this.data.label}`,
          role: role,
          type: 'node',
        };
        this.data.children.push(childData);
      }
      node = this.initChildNode(childData, node);
    } else {
      if (this.data.layout.displayMode == DisplayMode.ROLE) {
        node.data.role = role;
        node.data.width = roleWidth;
        node.redrawText(node.data.role, node.data.width);
      }
    }
    return node;
  }

  shouldCreateChildNode(role) {
    const mode = this.data.layout.mode;
    return mode === FoundationMode.AUTO;
  }

  initChildNode(childData, childNode) {
    if (!childData) return null;
    // Prefer inner container zone; lazily ensure it, otherwise fallback to node element
    let parentElement = this.zoneManager?.innerContainerZone?.getChildContainer();
    if (!parentElement && this.zoneManager?.ensureInnerContainerZone) {
      parentElement = this.zoneManager.ensureInnerContainerZone()?.getChildContainer();
    }
    parentElement = parentElement || this.element;

    if (childNode == null) {
      const copyChild = JSON.parse(JSON.stringify(childData));
      if (this.data.layout.displayMode === DisplayMode.ROLE) {
        copyChild.label = copyChild.role;
        copyChild.width = roleWidth;
      }
      childNode = new RectangularNode(copyChild, parentElement, this.settings, this);
      this.childNodes.push(childNode);
      // Add child to zone system when available
      if (this.zoneManager?.innerContainerZone) {
        this.zoneManager.innerContainerZone.addChild(childNode);
      }
      // Initialize the child node immediately so it renders
      childNode.init(parentElement);
    } else {
      // Re-init existing child node to ensure it is rendered inside the current child container
      childNode.init(parentElement);
    }
    return childNode;
  }

  updateChildren() {
    // Prerender fast-path: see LaneNode.updateChildren for rationale.
    if (this.hasPrerenderData) return;

    // When collapsed, size to header minimum and skip zone-dependent layout
    if (this.collapsed) {
      const headerZone = this.zoneManager?.headerZone;
      const headerHeight = headerZone ? headerZone.getHeaderHeight() : 10;

      // Use cached header width if available, otherwise calculate once
      let headerMinWidth;
      if (this._cachedHeaderMinWidth !== undefined) {
        headerMinWidth = this._cachedHeaderMinWidth;
      } else {
        headerMinWidth = headerZone?.getMinWidth?.() ?? this.data.width;
        if (headerZone) this._cachedHeaderMinWidth = headerMinWidth;
      }

      const collapsedWidth = Math.max(this.minimumSize.width, headerMinWidth);
      const collapsedHeight = Math.max(this.minimumSize.height, headerHeight);
      this.resize({ width: collapsedWidth, height: collapsedHeight });
      return;
    }

    // Ensure inner container exists for expanded layout
    if (!this.zoneManager?.innerContainerZone && this.zoneManager?.ensureInnerContainerZone) {
      this.zoneManager.ensureInnerContainerZone();
    }
    if (!this.zoneManager?.innerContainerZone) return;

    // Set layout algorithm based on display mode and orientation
    switch (this.data.layout.displayMode) {
      case DisplayMode.FULL:
        this.updateFullZone();
        break;
      case DisplayMode.ROLE:
        this.updateRoleZone();
        break;
      default:
        console.warn(
          `Unknown displayMode "${this.data.layout.displayMode}" using ${DisplayMode.FULL}`,
        );
        this.updateFullZone();
        break;
    }
  }

  updateFull() {
    // Account for the container transform that's applied in BaseContainerNode.updateChildren()
    // The container is offset by: (containerMargin.left - containerMargin.right, containerMargin.top - containerMargin.bottom)
    const containerOffsetX = this.containerMargin.left - this.containerMargin.right;
    const containerOffsetY = this.containerMargin.top - this.containerMargin.bottom;

    if (this.rawNode) {
      const x =
        -this.data.width / 2 +
        this.rawNode.data.width / 2 +
        this.containerMargin.left -
        containerOffsetX;
      const y =
        -this.data.height / 2 +
        this.rawNode.data.height / 2 +
        this.containerMargin.top -
        containerOffsetY;
      this.rawNode.move(x, y);
    }

    if (this.baseNode) {
      const x =
        -this.data.width / 2 +
        this.baseNode.data.width / 2 +
        this.containerMargin.left +
        this.rawNode.data.width +
        this.nodeSpacing.horizontal -
        containerOffsetX;
      const y =
        -this.data.height / 2 +
        this.baseNode.data.height / 2 +
        this.containerMargin.top -
        containerOffsetY;
      this.baseNode.move(x, y);
    }
  }

  updateRole() {
    // Account for the container transform that's applied in BaseContainerNode.updateChildren()
    // The container is offset by: (containerMargin.left - containerMargin.right, containerMargin.top - containerMargin.bottom)
    const containerOffsetX = this.containerMargin.left - this.containerMargin.right;
    const containerOffsetY = this.containerMargin.top - this.containerMargin.bottom;

    if (this.rawNode) {
      const x =
        -this.data.width / 2 +
        this.rawNode.data.width / 2 +
        this.containerMargin.left -
        containerOffsetX;
      const y =
        -this.data.height / 2 +
        this.rawNode.data.height / 2 +
        this.containerMargin.top -
        containerOffsetY;
      this.rawNode.move(x, y);
    }

    if (this.baseNode) {
      const x =
        -this.data.width / 2 +
        this.baseNode.data.width / 2 +
        this.containerMargin.left +
        this.rawNode.data.width +
        this.nodeSpacing.horizontal -
        containerOffsetX;
      const y =
        -this.data.height / 2 +
        this.baseNode.data.height / 2 +
        this.containerMargin.top -
        containerOffsetY;
      this.baseNode.move(x, y);
    }
  }

  // Zone-based layout methods
  updateFullZone() {
    const innerContainerZone = this.zoneManager.innerContainerZone;

    innerContainerZone.setLayoutAlgorithm((childNodes, coordinateSystem) => {
      const rawNode = childNodes.find((node) => node.data.role === 'raw');
      const baseNode = childNodes.find((node) => node.data.role === 'base');

      if (rawNode && baseNode) {
        const orientation = (this.data.layout?.orientation || 'horizontal').toLowerCase();
        switch (orientation) {
          case 'vertical':
          case 'rotate90': {
            // Centered vertical stack: Raw above Base
            const totalHeight =
              rawNode.data.height + this.nodeSpacing.vertical + baseNode.data.height;
            const rawY = -totalHeight / 2 + rawNode.data.height / 2;
            const baseY = totalHeight / 2 - baseNode.data.height / 2;
            rawNode.move(0, rawY);
            baseNode.move(0, baseY);
            this.resizeTwoNodeContainer(rawNode, baseNode, 'vertical');
            break;
          }
          case 'rotate270': {
            // Centered vertical stack: Base above Raw
            const totalHeight =
              rawNode.data.height + this.nodeSpacing.vertical + baseNode.data.height;
            const baseY = -totalHeight / 2 + baseNode.data.height / 2;
            const rawY = totalHeight / 2 - rawNode.data.height / 2;
            rawNode.move(0, rawY);
            baseNode.move(0, baseY);
            this.resizeTwoNodeContainer(rawNode, baseNode, 'vertical');
            break;
          }
          case 'horizontal_line':
          case 'horizontal':
          default: {
            // Centered horizontal row: Raw left, Base right
            const totalWidth =
              rawNode.data.width + this.nodeSpacing.horizontal + baseNode.data.width;
            const rawX = -totalWidth / 2 + rawNode.data.width / 2;
            const baseX = totalWidth / 2 - baseNode.data.width / 2;
            rawNode.move(rawX, 0);
            baseNode.move(baseX, 0);
            this.resizeTwoNodeContainer(rawNode, baseNode, 'horizontal');
            break;
          }
        }
      }
    });

    innerContainerZone.updateChildPositions();
  }

  updateRoleZone() {
    const innerContainerZone = this.zoneManager.innerContainerZone;

    innerContainerZone.setLayoutAlgorithm((childNodes, coordinateSystem) => {
      const rawNode = childNodes.find((node) => node.data.role === 'raw');
      const baseNode = childNodes.find((node) => node.data.role === 'base');

      if (rawNode && baseNode) {
        const orientation = (this.data.layout?.orientation || 'horizontal').toLowerCase();
        // Ensure fixed role widths
        rawNode.data.width = roleWidth;
        baseNode.data.width = roleWidth;
        // Ensure role labels in ROLE mode
        if (rawNode.data) {
          const newLabel = rawNode.data.role || rawNode.data.label;
          rawNode.data.label = newLabel;
          if (typeof rawNode.redrawText === 'function')
            rawNode.redrawText(newLabel, rawNode.data.width);
        }
        if (baseNode.data) {
          const newLabel = baseNode.data.role || baseNode.data.label;
          baseNode.data.label = newLabel;
          if (typeof baseNode.redrawText === 'function')
            baseNode.redrawText(newLabel, baseNode.data.width);
        }
        switch (orientation) {
          case 'vertical':
          case 'rotate90': {
            const totalHeight =
              rawNode.data.height + this.nodeSpacing.vertical + baseNode.data.height;
            const rawY = -totalHeight / 2 + rawNode.data.height / 2;
            const baseY = totalHeight / 2 - baseNode.data.height / 2;
            rawNode.move(0, rawY);
            baseNode.move(0, baseY);
            this.resizeTwoNodeContainer(rawNode, baseNode, 'vertical');
            break;
          }
          case 'rotate270': {
            const totalHeight =
              rawNode.data.height + this.nodeSpacing.vertical + baseNode.data.height;
            const baseY = -totalHeight / 2 + baseNode.data.height / 2;
            const rawY = totalHeight / 2 - rawNode.data.height / 2;
            rawNode.move(0, rawY);
            baseNode.move(0, baseY);
            this.resizeTwoNodeContainer(rawNode, baseNode, 'vertical');
            break;
          }
          case 'horizontal_line':
          case 'horizontal':
          default: {
            const totalWidth =
              rawNode.data.width + this.nodeSpacing.horizontal + baseNode.data.width;
            const rawX = -totalWidth / 2 + rawNode.data.width / 2;
            const baseX = totalWidth / 2 - baseNode.data.width / 2;
            rawNode.move(rawX, 0);
            baseNode.move(baseX, 0);
            this.resizeTwoNodeContainer(rawNode, baseNode, 'horizontal');
            break;
          }
        }
      }
    });

    innerContainerZone.updateChildPositions();
  }

  /**
   * Clear the cached header minimum width when header content changes
   */
  clearHeaderWidthCache() {
    this._cachedHeaderMinWidth = undefined;
  }

  /**
   * Override resize to clear header width cache when node is resized
   */
  resize(size, forced = false) {
    // Clear header width cache when resizing
    this.clearHeaderWidthCache();
    super.resize(size, forced);
  }

  // Resize container to fit two children according to zone-system sizing
  resizeTwoNodeContainer(firstNode, secondNode, direction = 'horizontal') {
    if (!this.zoneManager || this._isResizing) return;

    const marginZone = this.zoneManager.marginZone;
    const headerZone = this.zoneManager.headerZone;
    const headerHeight = headerZone ? headerZone.getHeaderHeight() : 10;
    if (!marginZone) return;
    const margins = marginZone.getMargins();

    let contentWidth, contentHeight;
    if (direction === 'vertical') {
      contentWidth = Math.max(firstNode.data.width, secondNode.data.width);
      contentHeight = firstNode.data.height + this.nodeSpacing.vertical + secondNode.data.height;
    } else {
      contentWidth = firstNode.data.width + this.nodeSpacing.horizontal + secondNode.data.width;
      contentHeight = Math.max(firstNode.data.height, secondNode.data.height);
    }

    // For both role and full modes, ensure the width is at least as wide as the header content
    let finalWidth = contentWidth + margins.left + margins.right;

    // Cache header minimum width to avoid repeated calculations
    if (headerZone && !this._cachedHeaderMinWidth) {
      this._cachedHeaderMinWidth = headerZone.getMinWidth?.() ?? 0;
    }

    if (this._cachedHeaderMinWidth !== undefined) {
      finalWidth = Math.max(finalWidth, this._cachedHeaderMinWidth);
    }

    const newSize = {
      width: finalWidth,
      height: headerHeight + margins.top + contentHeight + margins.bottom,
    };

    // Only resize if dimensions actually changed
    if (newSize.width !== this.data.width || newSize.height !== this.data.height) {
      this._isResizing = true;
      try {
        this.resize(newSize);
        // Only call zone manager resize if we're not already in a resize cycle
        if (this.zoneManager && !this.zoneManager._resizing) {
          this.zoneManager._resizing = true;
          try {
            this.zoneManager.resize(newSize.width, newSize.height);
          } finally {
            this.zoneManager._resizing = false;
          }
        }
        this.handleDisplayChange();
      } finally {
        this._isResizing = false;
      }
    }
  }
}
