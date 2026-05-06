import { ContainerZone } from './ContainerZone.js';
import { HeaderZone } from './HeaderZone.js';
import { MarginZone } from './MarginZone.js';
import { InnerContainerZone } from './InnerContainerZone.js';

/**
 * Zone Manager - Central coordinator for all zones within a node
 * Manages zone creation, positioning, and lifecycle
 * Handles zone-to-zone communication and dependencies
 * Provides unified interface for zone operations
 */
export class ZoneManager {
  constructor(node) {
    this.node = node;
    this.zones = new Map();
    this.zoneOrder = ['container', 'header', 'margin', 'innerContainer'];
    this.initialized = false;
  }

  /**
   * Check if we can use pre-render mode (all children have pre-render data)
   */
  canUsePrerenderMode() {
    // Check if setting allows skipping zone calculations
    const skipZoneCalcs = this.node.settings?.prerenderSkipZoneCalculations !== false;
    if (!skipZoneCalcs) return false;

    if (!this.node.hasPrerenderData) return false;
    if (!this.node.isContainer) return false;
    if (!this.node.childNodes || this.node.childNodes.length === 0) return true;
    return this.node.childNodes.every((child) => child.hasPrerenderData);
  }

  /**
   * Initialize in pre-render mode (minimal structure, no calculations)
   */
  initPrerenderMode() {
    // console.log(`📊 Pre-render: Zone system using fast-path for ${this.node.id}`);
    this._prerenderMode = true;
    this.zones = new Map();
    this.initialized = true;

    // Create minimal zone structure without calculations
    // This allows collapse/expand to still work if needed
    this.createZone('container', new ContainerZone(this.node));
    this.createZone('header', new HeaderZone(this.node));
    this.createZone('margin', new MarginZone(this.node));

    // Only create inner container if expanded
    if (!this.node.collapsed) {
      this.createZone('innerContainer', new InnerContainerZone(this.node));
    }

    // Initialize zones but they won't do calculations in pre-render mode
    this.zones.forEach((zone) => {
      zone._prerenderMode = true;
      zone.init();
    });

    // Set zone sizes from pre-render data so zones render correctly
    // Zones will accept the size but skip expensive calculations
    if (this.node.data.width && this.node.data.height) {
      this.zones.forEach((zone) => zone.resize(this.node.data.width, this.node.data.height));
    }
  }

  /**
   * Initialize all zones for the node
   */
  init() {
    if (this.initialized) return;

    // Check if we can use pre-render mode
    if (this.canUsePrerenderMode()) {
      this.initPrerenderMode();
      return;
    }

    // Create zones in order
    this.createZone('container', new ContainerZone(this.node));
    this.createZone('header', new HeaderZone(this.node));
    this.createZone('margin', new MarginZone(this.node));
    // Create inner container zone lazily when needed (only if not collapsed)
    if (!this.node.collapsed) {
      this.createZone('innerContainer', new InnerContainerZone(this.node));
    }

    // Initialize zones
    this.zones.forEach((zone) => zone.init());

    this.initialized = true;
  }

  /**
   * Create a zone and add it to the manager
   */
  createZone(name, zone) {
    this.zones.set(name, zone);
    zone.manager = this;
  }

  /**
   * Get a zone by name
   */
  getZone(name) {
    return this.zones.get(name);
  }

  /**
   * Get all zones
   */
  getAllZones() {
    return Array.from(this.zones.values());
  }

  /**
   * Update all zones
   */
  update() {
    this.zones.forEach((zone) => zone.update());
  }

  /**
   * Resize all zones based on new dimensions
   */
  resize(width, height) {
    // Prevent repeated resizes with the same dimensions to avoid infinite loops
    if (
      this._lastResize &&
      this._lastResize.width === width &&
      this._lastResize.height === height
    ) {
      return;
    }

    this._lastResize = { width, height };

    // In pre-render mode, still propagate size to zones for rendering
    // but zones will skip expensive calculations internally
    this.zones.forEach((zone) => zone.resize(width, height));
  }

  /**
   * Get the container zone
   */
  get containerZone() {
    return this.getZone('container');
  }

  /**
   * Get the header zone
   */
  get headerZone() {
    return this.getZone('header');
  }

  /**
   * Get the margin zone
   */
  get marginZone() {
    return this.getZone('margin');
  }

  /**
   * Get the inner container zone
   */
  get innerContainerZone() {
    return this.getZone('innerContainer');
  }

  /**
   * Calculate total size based on all zones
   */
  calculateTotalSize() {
    const headerSize = this.headerZone.getSize();
    const margins = this.marginZone.getMargins();
    const innerContainerSize = this.innerContainerZone
      ? this.innerContainerZone.getSize()
      : { width: 0, height: 0 };

    // When collapsed, margins should not contribute to container height
    // Only header height and minimum size constraints should apply
    if (this.node.collapsed) {
      const minNodeHeight = this.node.minimumSize?.height || 0;
      const height = Math.max(headerSize.height, minNodeHeight);
      return {
        width: Math.max(headerSize.width, innerContainerSize.width) + margins.left + margins.right,
        height,
      };
    }

    // When expanded, include all zone sizes
    const rawWidth =
      Math.max(headerSize.width, innerContainerSize.width) + margins.left + margins.right;
    const rawHeight = headerSize.height + margins.top + innerContainerSize.height + margins.bottom;

    // Enforce minimum height constraints consistent with Lane behavior:
    // - At least header minimum + top/bottom margins
    // - At least node-configured minimumSize.height (if provided)
    const minHeaderHeightWithMargins = headerSize.height + margins.top + margins.bottom;
    const minNodeHeight = this.node.minimumSize?.height || 0;
    const finalHeight = Math.max(rawHeight, minHeaderHeightWithMargins, minNodeHeight);

    return {
      width: rawWidth,
      height: finalHeight,
    };
  }

  /**
   * Get coordinate system for child positioning
   */
  getChildCoordinateSystem() {
    return this.innerContainerZone
      ? this.innerContainerZone.getCoordinateSystem()
      : { origin: { x: 0, y: 0 }, size: { width: 0, height: 0 }, transform: 'translate(0, 0)' };
  }

  /**
   * Handle zone-specific events
   */
  handleEvent(eventType, event, zoneName = null) {
    if (zoneName) {
      const zone = this.getZone(zoneName);
      if (zone) {
        zone.handleEvent(eventType, event);
      }
    } else {
      // Propagate to all zones
      this.zones.forEach((zone) => zone.handleEvent(eventType, event));
    }
  }

  /**
   * Clean up all zones
   */
  destroy() {
    this.zones.forEach((zone) => zone.destroy());
    this.zones.clear();
    this.initialized = false;
  }

  /**
   * Update zone visibility based on container collapse state
   * When collapsed, hide the inner container zone and margin zones
   * When expanded, show all zones
   */
  updateZoneVisibility() {
    if (this.node.collapsed) {
      // Hide inner container and margin zones when collapsed
      if (this.innerContainerZone) {
        this.innerContainerZone.setVisible(false);
      }
      if (this.marginZone) {
        this.marginZone.setVisible(false);
      }
    } else {
      // Show all zones when expanded
      if (this.innerContainerZone) {
        this.innerContainerZone.setVisible(true);
      }
      if (this.marginZone) {
        this.marginZone.setVisible(true);
      }
    }
  }

  /**
   * Ensure the inner container zone exists and is initialized.
   * Creates and initializes it on demand, including initial sizing.
   */
  ensureInnerContainerZone() {
    if (!this.innerContainerZone) {
      this.createZone('innerContainer', new InnerContainerZone(this.node));
      // Initialize just-created zone
      const zone = this.innerContainerZone;
      zone.init();
      // Resize/update with current node dimensions
      zone.resize(this.node.data.width, this.node.data.height);
      zone.update();
    }
    return this.innerContainerZone;
  }
}
