/**
 * Base Zone Class - Common interface for all zones
 * Provides positioning, sizing, and styling capabilities
 * Handles rendering and interaction logic
 */
export class BaseZone {
  constructor(node, name) {
    this.node = node;
    this.name = name;
    this.manager = null;
    this.element = null;
    this.initialized = false;
    this.size = { width: 0, height: 0 };
    this.position = { x: 0, y: 0 };
    this.visible = true;
  }

  /**
   * Initialize the zone
   */
  init() {
    if (this.initialized) return;
    
    this.createElement();
    this.setupStyling();
    this.setupInteractions();
    
    this.initialized = true;
  }

  /**
   * Create the zone's DOM element
   * Override in subclasses
   */
  createElement() {
    // Base implementation - subclasses should override
    this.element = this.node.element.append('g')
      .attr('class', `zone-${this.name}`);
    
    // Attach the node instance to the zone element for event handling
    if (this.element) {
      const domNode = this.element.node();
      if (domNode) {
        domNode.__node = this.node;
      }
    }
  }

  /**
   * Setup zone-specific styling
   * Override in subclasses
   */
  setupStyling() {
    // Base implementation - subclasses should override
  }

  /**
   * Setup zone-specific interactions
   * Override in subclasses
   */
  setupInteractions() {
    // Base implementation - subclasses should override
  }

  /**
   * Update the zone
   * Override in subclasses
   */
  update() {
    if (!this.initialized) return;
    
    this.updatePosition();
    this.updateSize();
    this.updateStyling();
  }

  /**
   * Update zone position
   */
  updatePosition() {
    if (this.element) {
      this.element.attr('transform', `translate(${this.position.x}, ${this.position.y})`);
    }
  }

  /**
   * Update zone size
   */
  updateSize() {
    // Base implementation - subclasses should override
  }

  /**
   * Update zone styling
   */
  updateStyling() {
    // Base implementation - subclasses should override
  }

  /**
   * Resize the zone
   */
  resize(width, height) {
    // Defensive: prevent NaN from propagating to DOM attributes
    const safeWidth = Number.isFinite(width) && width >= 0 ? width : 0;
    const safeHeight = Number.isFinite(height) && height >= 0 ? height : 0;
    this.size.width = safeWidth;
    this.size.height = safeHeight;
    this.update();
  }

  /**
   * Set zone position
   */
  setPosition(x, y) {
    this.position.x = x;
    this.position.y = y;
    this.updatePosition();
  }

  /**
   * Get zone size
   */
  getSize() {
    return { ...this.size };
  }

  /**
   * Get zone position
   */
  getPosition() {
    return { ...this.position };
  }

  /**
   * Get coordinate system for this zone
   */
  getCoordinateSystem() {
    return {
      origin: { x: this.position.x, y: this.position.y },
      size: this.getSize(),
      transform: `translate(${this.position.x}, ${this.position.y})`
    };
  }

  /**
   * Handle zone-specific events
   * Override in subclasses
   */
  handleEvent(eventType, event) {
    // Base implementation - subclasses should override
  }

  /**
   * Set zone visibility
   */
  setVisible(visible) {
    this.visible = visible;
    if (this.element) {
      this.element.style('display', visible ? 'block' : 'none');
    }
  }

  /**
   * Get zone visibility
   */
  isVisible() {
    return this.visible;
  }

  /**
   * Calculate zone bounds
   */
  getBounds() {
    return {
      left: this.position.x,
      top: this.position.y,
      right: this.position.x + this.size.width,
      bottom: this.position.y + this.size.height,
      width: this.size.width,
      height: this.size.height
    };
  }

  /**
   * Check if a point is within the zone bounds
   */
  containsPoint(x, y) {
    const bounds = this.getBounds();
    return x >= bounds.left && x <= bounds.right && 
           y >= bounds.top && y <= bounds.bottom;
  }

  /**
   * Clean up the zone
   */
  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.initialized = false;
  }
} 