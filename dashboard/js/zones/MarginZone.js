import { BaseZone } from './BaseZone.js';

/**
 * Margin Zone - Manages spacing areas around content within the container
 * Provides visual separation and breathing room
 * Handles margin calculation and application
 * Provides margin-aware positioning utilities
 */
export class MarginZone extends BaseZone {
  constructor(node) {
    super(node, 'margin');
    this.margins = {
      top: 8,
      right: 8,
      bottom: 8,
      left: 8
    };
    this.visualElements = [];
  }

  /**
   * Initialize margin zone
   */
  init() {
    super.init();
    this.loadMargins();
  }

  /**
   * Load margins from node settings
   */
  loadMargins() {
    // Read margins from node settings if provided; fallback to defaults
    const fromSettings = this.node?.settings?.containerMargin || {};
    this.margins = {
      top: fromSettings.top ?? 8,
      right: fromSettings.right ?? 8,
      bottom: fromSettings.bottom ?? 8,
      left: fromSettings.left ?? 8
    };
  }

  /**
   * Create margin zone element (no visual element needed)
   */
  createElement() {
    // Margins are layout-only, no visual element needed
    this.element = null;
  }

  /**
   * Setup margin styling (no visual elements)
   */
  setupStyling() {
    // Margins are invisible, no styling needed
  }

  /**
   * Setup margin interactions (no interactions)
   */
  setupInteractions() {
    // Margins have no interactions - they're handled by the container's capture-phase events
  }

  /**
   * Update margin zone (no visual updates needed)
   */
  update() {
    if (!this.initialized) return;
    
    // Margins are layout-only, no visual updates needed
    this.updateSize();
  }

  /**
   * Update margin size
   */
  updateSize() {
    // Margins don't have a visual size, they're just spacing values
  }

  /**
   * Get margin values
   */
  getMargins() {
    return { ...this.margins };
  }

  /**
   * Set margin values
   */
  setMargins(margins) {
    this.margins = { ...this.margins, ...margins };
    this.validateMargins();
  }

  /**
   * Validate margin values
   */
  validateMargins() {
    const errors = [];
    
    if (this.margins.top < 0) errors.push('Top margin must be non-negative');
    if (this.margins.right < 0) errors.push('Right margin must be non-negative');
    if (this.margins.bottom < 0) errors.push('Bottom margin must be non-negative');
    if (this.margins.left < 0) errors.push('Left margin must be non-negative');
    
    if (errors.length > 0) {
      console.warn('Margin validation errors:', errors);
    }
  }

  /**
   * Get margin size for calculations
   */
  getSize() {
    return {
      width: this.margins.left + this.margins.right,
      height: this.margins.top + this.margins.bottom,
      left: this.margins.left,
      right: this.margins.right,
      top: this.margins.top,
      bottom: this.margins.bottom
    };
  }

  /**
   * Calculate content area within margins
   */
  getContentArea(containerWidth, containerHeight) {
    return {
      x: this.margins.left,
      y: this.margins.top,
      width: containerWidth - this.margins.left - this.margins.right,
      height: containerHeight - this.margins.top - this.margins.bottom
    };
  }

  /**
   * Calculate inner container position accounting for header
   */
  getInnerContainerPosition(headerHeight) {
    return {
      x: this.margins.left,
      y: headerHeight + this.margins.top
    };
  }

  /**
   * Calculate transform offset for child positioning
   */
  getTransformOffset() {
    return {
      x: this.margins.left - this.margins.right,
      y: this.margins.top - this.margins.bottom
    };
  }

  /**
   * Calculate total container size needed for content
   */
  calculateContainerSize(contentWidth, contentHeight, headerHeight = 0) {
    return {
      width: contentWidth + this.margins.left + this.margins.right,
      height: headerHeight + this.margins.top + contentHeight + this.margins.bottom
    };
  }

  /**
   * Apply margins to a position
   */
  applyMarginsToPosition(x, y, headerHeight = 0) {
    return {
      x: x + this.margins.left,
      y: y + headerHeight + this.margins.top
    };
  }

  /**
   * Remove margins from a position
   */
  removeMarginsFromPosition(x, y, headerHeight = 0) {
    return {
      x: x - this.margins.left,
      y: y - headerHeight - this.margins.top
    };
  }

  /**
   * Check if a position is within margin boundaries
   */
  isWithinMargins(x, y, containerWidth, containerHeight, headerHeight = 0) {
    return x >= this.margins.left &&
           x <= containerWidth - this.margins.right &&
           y >= headerHeight + this.margins.top &&
           y <= containerHeight - this.margins.bottom;
  }

  /**
   * Get margin constraints for positioning
   */
  getPositionConstraints(containerWidth, containerHeight, headerHeight = 0) {
    return {
      minX: this.margins.left,
      maxX: containerWidth - this.margins.right,
      minY: headerHeight + this.margins.top,
      maxY: containerHeight - this.margins.bottom
    };
  }

  /**
   * Calculate spacing between elements within margins
   */
  calculateSpacing(elementCount, elementSize, spacing, isHorizontal = true) {
    if (elementCount <= 1) return 0;
    
    const totalElementSize = elementCount * elementSize;
    const totalSpacing = (elementCount - 1) * spacing;
    const availableSpace = isHorizontal ? 
      this.margins.left + this.margins.right : 
      this.margins.top + this.margins.bottom;
    
    return Math.max(0, availableSpace - totalElementSize - totalSpacing);
  }

  /**
   * Get margin-aware coordinate system
   */
  getCoordinateSystem(containerWidth, containerHeight, headerHeight = 0) {
    const contentArea = this.getContentArea(containerWidth, containerHeight);
    const transformOffset = this.getTransformOffset();
    
    return {
      origin: {
        x: contentArea.x,
        y: headerHeight + contentArea.y
      },
      size: {
        width: contentArea.width,
        height: contentArea.height
      },
      transform: `translate(${transformOffset.x}, ${transformOffset.y})`,
      bounds: {
        left: this.margins.left,
        right: containerWidth - this.margins.right,
        top: headerHeight + this.margins.top,
        bottom: containerHeight - this.margins.bottom
      }
    };
  }

  /**
   * Update margins from settings
   */
  updateMargins() {
    this.loadMargins();
    this.validateMargins();
  }

  /**
   * Get margin summary for debugging
   */
  getMarginSummary() {
    return {
      margins: this.getMargins(),
      size: this.getSize(),
      validation: this.validateMargins()
    };
  }
} 