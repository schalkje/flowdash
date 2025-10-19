import { BaseZone } from './BaseZone.js';

/**
 * Header Zone - Dedicated zone at the top of the node
 * Contains the node's label, title, and header elements
 * Handles text rendering, overflow, and styling
 * Manages header-specific interactions (click, hover)
 * Supports status indicators, icons, and zoom buttons
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 
 * 1. CACHING: getMinimumWidth() caches results and only recalculates when text changes
 * 2. THROTTLING: getMinimumWidthThrottled() provides immediate cached results during rapid updates
 * 3. BATCHING: Rapid calls are batched to reduce expensive DOM operations
 * 4. MONITORING: Performance warnings when called too frequently
 * 
 * USAGE RECOMMENDATIONS:
 * 
 * - Use getMinimumWidth() for normal operations (initial layout, text changes)
 * - Use getMinimumWidthThrottled() during rapid updates (resizing, animations, force simulation)
 * - The throttled version returns cached values immediately and schedules background updates
 * - Performance warnings will suggest when to switch to throttled version
 * 
 * CACHE INVALIDATION:
 * 
 * - Cache is automatically cleared when text content changes
 * - Call clearMinWidthCache() manually if node properties change
 * - Call recalculateMinWidth() to force fresh calculation
 */
export class HeaderZone extends BaseZone {
  constructor(node) {
    super(node, 'header');
    this.textElement = null;
    this.background = null;
    this.statusIndicator = null;
    this.zoomButton = null;
    this.minHeight = 10; // Minimum height constraint
    this.padding = 4; // Left padding for text
    
    // Performance optimization: batch updates and throttling
    this._cachedMinWidth = null;
    this._lastTextContent = null;
    this._updateBatchTimer = null;
    this._pendingMinWidthUpdate = false;
    
    // Performance monitoring (can be disabled in production)
    this._callCount = 0;
    this._lastCallTime = 0;
    this._performanceWarningThreshold = 10; // Warn if called more than 10 times in 100ms
  }

  /**
   * Create the header zone element
   */
  createElement() {
    super.createElement();
    
    // Create background rectangle
    this.background = this.element.append('rect')
      .attr('class', 'header-background')
      .attr('fill', 'transparent'); // Make it clickable
    
    // Create text element
    this.textElement = this.element.append('text')
      .attr('class', 'header-text')
      .attr('x', this.padding)
      .attr('y', 0)
      .attr('dy', '0.35em');
    
    // Create status indicator
    this.statusIndicator = this.element.append('circle')
      .attr('class', 'status-indicator')
      .attr('r', 3);
    
    // Create zoom button (for container nodes)
    if (this.node.isContainer) {
      this.createZoomButton();
    }
  }

  /**
   * Create zoom button for container nodes
   */
  createZoomButton() {
    this.zoomButton = this.element.append('g')
      .attr('class', 'zoom-button');
    
    // Button background
    this.zoomButton.append('circle')
      .attr('class', 'zoom-button-bg')
      .attr('r', 8);
    
    // Plus/minus icon
    this.zoomButton.append('text')
      .attr('class', 'zoom-icon')
      .attr('dy', '0.35em')
      .text('−'); // Default to minus (expanded)
  }

  /**
   * Setup header styling
   */
  setupStyling() {
    // Apply custom settings if provided, otherwise use CSS defaults
    if (this.node.settings.headerFill) {
      this.background.attr('fill', this.node.settings.headerFill);
    }
    if (this.node.settings.headerStroke) {
      this.background.attr('stroke', this.node.settings.headerStroke);
    }
    if (this.node.settings.headerStrokeWidth) {
      this.background.attr('stroke-width', this.node.settings.headerStrokeWidth);
    }
    
    if (this.node.settings.fontFamily) {
      this.textElement.attr('font-family', this.node.settings.fontFamily);
    }
    if (this.node.settings.fontSize) {
      this.textElement.attr('font-size', this.node.settings.fontSize);
    }
    if (this.node.settings.fontWeight) {
      this.textElement.attr('font-weight', this.node.settings.fontWeight);
    }
    if (this.node.settings.textColor) {
      this.textElement.attr('fill', this.node.settings.textColor);
    }
    
    // Status indicator styling
    this.updateStatusIndicator();
  }

  /**
   * Setup header interactions
   */
  setupInteractions() {
    // Setup zoom button interactions
    if (this.zoomButton) {
      this.zoomButton
        .on('click', (event) => this.handleZoomClick(event))
        .on('mouseenter', (event) => this.handleZoomMouseEnter(event))
        .on('mouseleave', (event) => this.handleZoomMouseLeave(event));
    }
    
    // Setup text interactions
    this.textElement
      .on('click', (event) => this.handleTextClick(event))
      .on('dblclick', (event) => this.handleTextDblClick(event))
      .on('mouseenter', (event) => this.handleTextMouseEnter(event))
      .on('mouseleave', (event) => this.handleTextMouseLeave(event));
    
    // Setup background interactions - these are the actual clickable elements
    this.background
      .on('click', (event) => this.handleBackgroundClick(event))
      .on('dblclick', (event) => this.handleBackgroundDblClick(event))
      .on('mouseenter', (event) => this.handleBackgroundMouseEnter(event))
      .on('mouseleave', (event) => this.handleBackgroundMouseLeave(event));
    
    // Also setup interactions on the zone element itself for better event handling
    this.element
      .on('click', (event) => this.handleBackgroundClick(event))
      .on('dblclick', (event) => this.handleBackgroundDblClick(event))
      .on('mouseenter', (event) => this.handleBackgroundMouseEnter(event))
      .on('mouseleave', (event) => this.handleBackgroundMouseLeave(event));
  }

  /**
   * Update header size
   */
  updateSize() {
    if (!this.background || !this.textElement) return;
    
    const width = this.size.width;
    const height = this.calculateTextHeight();
    
    // Update background - position relative to zone (which is already at top of container)
    this.background
      .attr('width', width)
      .attr('height', height)
      .attr('x', -width / 2)
      .attr('y', 0); // Position at top of zone (which is already at top of container)
    
    // Update text position and content
    this.updateText();
    
    // Update status indicator position
    this.updateStatusIndicatorPosition();
    
    // Update zoom button position
    this.updateZoomButtonPosition();
  }

  /**
   * Resolve header text sizing configuration from settings
   * Supported settings (either flat or nested under headerText):
   * - headerTextMode: 'full' | 'truncate'
   * - headerTextMinWidth: number (default 150)
   * - headerTextMaxWidth: number (default 300)
   */
  getHeaderTextConfig() {
    const settings = this.node?.settings || {};
    const nested = settings.headerText || {};
    const defaultMode = 'truncate';
    let mode = (settings.headerTextMode ?? nested.mode ?? defaultMode);
    mode = typeof mode === 'string' ? mode.toLowerCase() : defaultMode;
    if (mode !== 'full' && mode !== 'truncate') mode = defaultMode;

    const minWidth = Number.isFinite(settings.headerTextMinWidth)
      ? settings.headerTextMinWidth
      : (Number.isFinite(nested.minWidth) ? nested.minWidth : 50);
    const maxWidth = Number.isFinite(settings.headerTextMaxWidth)
      ? settings.headerTextMaxWidth
      : (Number.isFinite(nested.maxWidth) ? nested.maxWidth : 300);

    return { mode, minWidth, maxWidth };
  }

  /**
   * Calculate the minimum width required by the header contents
   * Includes: left/right padding + full text width + status indicator + zoom button (if container) + small gaps
   * Optimized with caching to avoid expensive recalculations
   */
  getMinimumWidth() {
    // Performance monitoring
    this._callCount++;
    const now = Date.now();
    if (now - this._lastCallTime > 100) {
      // Reset counter every 100ms
      if (this._callCount > this._performanceWarningThreshold) {
        console.warn(`HeaderZone ${this.node?.data?.id}: getMinimumWidth called ${this._callCount} times in 100ms. Consider using getMinimumWidthThrottled() for rapid updates.`);
      }
      this._callCount = 1;
      this._lastCallTime = now;
    }
    
    // Check if we have a cached result and the text hasn't changed
    const currentText = this.node?.data?.label || this.node?.data?.name || '';
    const currentIsContainer = this.node?.isContainer || false;
    
    // Cache key includes text content and container state
    const cacheKey = `${currentText}|${currentIsContainer}`;
    
    // Return cached result if available and valid
    if (this._cachedMinWidth && this._cachedMinWidth.key === cacheKey) {
      return this._cachedMinWidth.value;
    }

    // Calculate text width more efficiently
    let textWidth = 0;
    try {
      if (this.textElement && typeof this.textElement.node === 'function') {
        // Use getComputedTextLength first (most efficient)
        try {
          textWidth = this.textElement.node().getComputedTextLength();
        } catch {
          // Fallback to DOM measurement only if necessary
          const tempElement = this.textElement.node().cloneNode(true);
          tempElement.textContent = currentText;
          tempElement.style.position = 'absolute';
          tempElement.style.left = '-99999px';
          tempElement.style.top = '-99999px';
          tempElement.style.visibility = 'hidden'; // More efficient than off-screen positioning
          document.body.appendChild(tempElement);
          const rect = tempElement.getBoundingClientRect();
          textWidth = rect.width;
          document.body.removeChild(tempElement);
        }
        
        // Fallback if measurement yields 0
        if (!textWidth) {
          textWidth = currentText.length * 8; // Fallback approximation
        }
      } else {
        textWidth = currentText.length * 8; // Fallback approximation
      }
    } catch {
      textWidth = currentText.length * 8; // Fallback approximation
    }

    const leftPadding = this.padding || 0;
    const rightPadding = this.padding || 0;
    const indicatorDiameter = 6; // Matches updateStatusIndicatorPosition()
    const buttonDiameter = currentIsContainer ? 16 : 0; // Matches updateZoomButtonPosition()
    const gapBetweenTextAndIcons = (indicatorDiameter > 0 || buttonDiameter > 0) ? 8 : 0;
    const gapBetweenIndicatorAndButton = (indicatorDiameter > 0 && buttonDiameter > 0) ? 4 : 0;

    // Base width needed to fit full text + icons
    const baseWidth =
      leftPadding +
      textWidth +
      gapBetweenTextAndIcons +
      indicatorDiameter +
      gapBetweenIndicatorAndButton +
      buttonDiameter +
      rightPadding;

    // Apply sizing mode constraints
    const { mode, minWidth: cfgMin, maxWidth: cfgMax } = this.getHeaderTextConfig();
    // Guard for invalid config values
    const safeMin = Number.isFinite(cfgMin) ? cfgMin : 50;
    const safeMax = Number.isFinite(cfgMax) ? cfgMax : 300;

    let constrainedWidth = baseWidth;
    // Always enforce minimum width
    constrainedWidth = Math.max(constrainedWidth, safeMin);
    // Only enforce max when truncating
    if (mode === 'truncate') {
      constrainedWidth = Math.min(constrainedWidth, safeMax);
    } else {
      // In full mode, ensure the header spans the full-text width (no truncation)
      // This already holds because baseWidth uses measured text width.
    }

    const result = Math.ceil(constrainedWidth);
    
    // Cache the result for future calls
    this._cachedMinWidth = {
      key: cacheKey,
      value: result,
      timestamp: Date.now()
    };

    return result;
  }

  /**
   * Clear the cached minimum width when text content changes
   * Call this method when node data (label/name) is updated
   */
  clearMinWidthCache() {
    this._cachedMinWidth = null;
  }

  /**
   * Force recalculation of minimum width (clears cache and recalculates)
   * Use this when you need to ensure fresh calculation
   */
  recalculateMinWidth() {
    this._cachedMinWidth = null;
    return this.getMinimumWidth();
  }

  /**
   * Throttled version of getMinimumWidth for use during rapid updates
   * Returns cached value immediately if available, schedules update if not
   */
  getMinimumWidthThrottled() {
    // If we have a valid cache, return it immediately
    if (this._cachedMinWidth && this._cachedMinWidth.key === this._getCurrentCacheKey()) {
      return this._cachedMinWidth.value;
    }
    
    // If no update is pending, schedule one
    if (!this._pendingMinWidthUpdate) {
      this._pendingMinWidthUpdate = true;
      
      // Clear any existing timer
      if (this._updateBatchTimer) {
        clearTimeout(this._updateBatchTimer);
      }
      
      // Schedule update after a short delay to batch rapid calls
      this._updateBatchTimer = setTimeout(() => {
        this._pendingMinWidthUpdate = false;
        this._updateBatchTimer = null;
        // Force a fresh calculation
        this.getMinimumWidth();
      }, 16); // ~60fps
    }
    
    // Return cached value or fallback
    return this._cachedMinWidth ? this._cachedMinWidth.value : this._getFallbackMinWidth();
  }

  /**
   * Get fallback minimum width when cache is not available
   */
  _getFallbackMinWidth() {
    const text = this.node?.data?.label || this.node?.data?.name || '';
    const textWidth = text.length * 8; // Rough approximation
    const leftPadding = this.padding || 0;
    const rightPadding = this.padding || 0;
    const indicatorDiameter = 6;
    const buttonDiameter = this.node?.isContainer ? 16 : 0;
    const gapBetweenTextAndIcons = (indicatorDiameter > 0 || buttonDiameter > 0) ? 8 : 0;
    const gapBetweenIndicatorAndButton = (indicatorDiameter > 0 && buttonDiameter > 0) ? 4 : 0;
    
    return Math.ceil(
      leftPadding +
      textWidth +
      gapBetweenTextAndIcons +
      indicatorDiameter +
      gapBetweenIndicatorAndButton +
      buttonDiameter +
      rightPadding
    );
  }

  /**
   * Get current cache key for comparison
   */
  _getCurrentCacheKey() {
    const currentText = this.node?.data?.label || this.node?.data?.name || '';
    const currentIsContainer = this.node?.isContainer || false;
    return `${currentText}|${currentIsContainer}`;
  }

  /**
   * Compute the reserved width on the right side (icons + gaps + right padding)
   * Must stay in sync with getMinimumWidth() and icon positioning
   */
  getReservedRightWidth() {
    const rightPadding = this.padding || 0;
    const indicatorDiameter = 6; // Matches updateStatusIndicatorPosition()
    const buttonDiameter = this.node?.isContainer ? 16 : 0; // Matches updateZoomButtonPosition()
    const gapBetweenTextAndIcons = (indicatorDiameter > 0 || buttonDiameter > 0) ? 8 : 0;
    const gapBetweenIndicatorAndButton = (indicatorDiameter > 0 && buttonDiameter > 0) ? 4 : 0;

    return (
      gapBetweenTextAndIcons +
      indicatorDiameter +
      gapBetweenIndicatorAndButton +
      buttonDiameter +
      rightPadding
    );
  }

  /**
   * Calculate text height based on content
   */
  calculateTextHeight() {
    if (!this.textElement) return this.minHeight;
    
    const text = this.node.data.label || this.node.data.name || '';
    if (!text) return this.minHeight;
    
    try {
      // Try to create temporary element to measure text height
      const tempElement = this.textElement.node().cloneNode(true);
      tempElement.textContent = text;
      document.body.appendChild(tempElement);
      
      const textHeight = tempElement.getBoundingClientRect().height;
      document.body.removeChild(tempElement);
      
      return Math.max(textHeight, this.minHeight);
    } catch (error) {
      // Fallback to minimum height if DOM measurement fails
      console.warn('Text height measurement failed, using minimum height fallback:', error);
      return this.minHeight;
    }
  }

  /**
   * Update text content and positioning
   */
  updateText() {
    if (!this.textElement) return;
    
    const text = this.node.data.label || this.node.data.name || '';
    
    // Clear cache if text content has changed
    if (this._lastTextContent !== text) {
      this.clearMinWidthCache();
      this._lastTextContent = text;
    }
    // Reserve space on the right for icons + gaps + right padding so text never overlaps
    const reservedRight = this.getReservedRightWidth();
    let maxWidth = Math.max(0, this.size.width - this.padding - reservedRight);

    // Apply text sizing mode: when truncate, cap the text drawing width to configured max
    const { mode, maxWidth: cfgMax } = this.getHeaderTextConfig();

    // In 'full' mode, never truncate: render full text and clear tooltip/cursor
    if (mode === 'full') {
      if (text.length > 0) {
        this.textElement.text(text);
      } else {
        this.textElement.text('');
      }
      this.textElement.select('title').remove();
      this.textElement.style('cursor', 'default');
      // Position text - align with header position (zone is already at top of container)
      const textHeight = this.calculateTextHeight();
      this.textElement
        .attr('x', -this.size.width / 2 + this.padding)
        .attr('y', textHeight / 2);
      return;
    }

    if (mode === 'truncate' && Number.isFinite(cfgMax)) {
      // Ensure we also respect right-reserved area and left padding
      const allowedWidth = Math.max(0, cfgMax - this.padding - reservedRight);
      maxWidth = Math.min(maxWidth, allowedWidth);
    }
    
    // Handle text overflow with ellipsis
    if (text.length > 0) {
      this.textElement.text(text);
      
      // Check if text needs ellipsis
      const textNode = this.textElement.node();
      if (!textNode || typeof textNode.getComputedTextLength !== 'function') {
        // Fallback: estimate text width (rough approximation)
        const estimatedLength = text.length * 7; // Average character width
        if (estimatedLength > maxWidth) {
          const maxChars = Math.floor(maxWidth / 7) - 3; // Reserve space for '...'
          const truncatedText = text.slice(0, maxChars);
          this.textElement.text(truncatedText + '...');
          const titleSel = this.textElement.select('title');
          if (titleSel.empty()) this.textElement.append('title').text(text);
          else titleSel.text(text);
        }
        return;
      }
      
      const textLength = textNode.getComputedTextLength();
      if (textLength > maxWidth) {
        // Truncate text with ellipsis; trim trailing spaces before adding '...'
        let truncatedText = text;
        const rtrim = (s) => s.replace(/\s+$/,'');
        while (truncatedText.length > 0 && 
               this.textElement.text(rtrim(truncatedText) + '...').node().getComputedTextLength() > maxWidth) {
          truncatedText = truncatedText.slice(0, -1);
        }
        const finalText = rtrim(truncatedText) + '...';
        this.textElement.text(finalText);
        // Always add tooltip with full text when truncated
        const titleSel = this.textElement.select('title');
        if (titleSel.empty()) this.textElement.append('title').text(text);
        else titleSel.text(text);
        this.textElement.style('cursor', 'help');
      } else {
        // No truncation → remove any tooltip
        this.textElement.select('title').remove();
        this.textElement.style('cursor', 'default');
      }
    } else {
      this.textElement.text('');
      this.textElement.select('title').remove();
      this.textElement.style('cursor', 'default');
    }
    
    // Position text - align with header position (zone is already at top of container)
    const textHeight = this.calculateTextHeight();
    
    this.textElement
      .attr('x', -this.size.width / 2 + this.padding)
      .attr('y', textHeight / 2); // Center text vertically within header (relative to zone)
  }

  /**
   * Update status indicator
   */
  updateStatusIndicator() {
    if (!this.statusIndicator) return;
    
    const status = this.node.status;
    const statusColors = this.node.settings.statusColors || {};
    
    // Remove all status classes
    this.statusIndicator.classed('unknown ready updating updated error warning', false);
    
    if (statusColors[status] && statusColors[status].indicator) {
      // Apply custom indicator color if provided
      this.statusIndicator.attr('fill', statusColors[status].indicator);
    } else {
      // Apply CSS status class
      this.statusIndicator.classed(status.toLowerCase(), true);
    }
  }

  /**
   * Update status indicator position
   */
  updateStatusIndicatorPosition() {
    if (!this.statusIndicator) return;
    
    const height = this.calculateTextHeight();
    const indicatorSize = 6; // Diameter of indicator
    
    this.statusIndicator
      .attr('cx', this.size.width / 2 - indicatorSize - this.padding)
      .attr('cy', height / 2); // Center indicator vertically within header (relative to zone)
  }

  /**
   * Update zoom button position
   */
  updateZoomButtonPosition() {
    if (!this.zoomButton) return;
    
    const height = this.calculateTextHeight();
    const buttonSize = 16; // Diameter of button
    
    this.zoomButton
      .attr('transform', `translate(${this.size.width / 2 - buttonSize - this.padding}, ${height / 2})`);
    
    // Update zoom button state
    this.updateZoomButtonState();
  }

  /**
   * Update zoom button state (plus/minus)
   */
  updateZoomButtonState() {
    if (!this.zoomButton) return;
    
    const icon = this.zoomButton.select('.zoom-icon');
    if (this.node.collapsed) {
      icon.text('+'); // Plus for collapsed
    } else {
      icon.text('−'); // Minus for expanded
    }
  }

  /**
   * Update header styling
   */
  updateStyling() {
    this.updateStatusIndicator();
    this.updateZoomButtonState();
  }

  /**
   * Handle zoom button click
   */
  handleZoomClick(event) {
    event.stopPropagation();
    event.preventDefault();
    
    if (this.node.isContainer) {
      this.node.collapsed = !this.node.collapsed;
    }
  }

  /**
   * Handle zoom button mouse enter
   */
  handleZoomMouseEnter(event) {
    this.zoomButton.select('.zoom-button-bg')
      .classed('hover', true);
  }

  /**
   * Handle zoom button mouse leave
   */
  handleZoomMouseLeave(event) {
    this.zoomButton.select('.zoom-button-bg')
      .classed('hover', false);
  }

  /**
   * Handle text click
   */
  handleTextClick(event) {
    // Don't propagate if click originated from zoom button
    if (event.target.closest('.zoom-button')) {
      return;
    }
    
    event.stopPropagation();
    // Propagate to node click handler
    if (this.node.handleClicked) {
      this.node.handleClicked(event, this.node);
    }
  }

  /**
   * Handle text double click
   */
  handleTextDblClick(event) {
    // Don't propagate if click originated from zoom button
    if (event.target.closest('.zoom-button')) {
      return;
    }
    
    event.stopPropagation();
    // Propagate to node double click handler
    if (this.node.handleDblClicked) {
      this.node.handleDblClicked(event, this.node);
    }
  }

  /**
   * Handle text mouse enter
   */
  handleTextMouseEnter(event) {
    this.textElement.classed('hover', true);
    // Apply custom hover color if provided
    if (this.node.settings.textHoverColor) {
      this.textElement.attr('fill', this.node.settings.textHoverColor);
    }
  }

  /**
   * Handle text mouse leave
   */
  handleTextMouseLeave(event) {
    this.textElement.classed('hover', false);
    // Reset to custom color if provided, otherwise use CSS default
    if (this.node.settings.textColor) {
      this.textElement.attr('fill', this.node.settings.textColor);
    } else {
      this.textElement.attr('fill', null); // Reset to CSS default
    }
  }

  /**
   * Handle background click
   */
  handleBackgroundClick(event) {
    // Don't propagate if click originated from zoom button
    if (event.target.closest('.zoom-button')) {
      return;
    }
    
    event.stopPropagation();
    // Propagate to node click handler
    if (this.node.handleClicked) {
      this.node.handleClicked(event, this.node);
    }
  }

  /**
   * Handle background double click
   */
  handleBackgroundDblClick(event) {
    // Don't propagate if click originated from zoom button
    if (event.target.closest('.zoom-button')) {
      return;
    }
    
    event.stopPropagation();
    // Propagate to node double click handler
    if (this.node.handleDblClicked) {
      this.node.handleDblClicked(event, this.node);
    }
  }

  /**
   * Handle background mouse enter
   */
  handleBackgroundMouseEnter(event) {
    this.background.classed('hover', true);
  }

  /**
   * Handle background mouse leave
   */
  handleBackgroundMouseLeave(event) {
    this.background.classed('hover', false);
  }

  /**
   * Get header height
   */
  getHeaderHeight() {
    return this.calculateTextHeight();
  }

  /**
   * Update zone position - override to position header at top of node
   */
  updatePosition() {
    if (this.element) {
      // Position header at the top of the node (0,0 relative to node center)
      // The header should be positioned at the top edge of the container
      const containerHeight = this.node.data.height;
      const headerY = -containerHeight / 2; // Top of the container
      
      // Position the header at the top of the container, centered horizontally
      this.element.attr('transform', `translate(0, ${headerY})`);
    }
  }

  /**
   * Resize the zone - override to use container width
   */
  resize(width, height) {
    // Header should span the full width of the container
    this.size.width = width;
    this.size.height = this.calculateTextHeight();
    this.update();
  }

  /**
   * Clean up resources when zone is destroyed
   */
  destroy() {
    // Clear any pending timers
    if (this._updateBatchTimer) {
      clearTimeout(this._updateBatchTimer);
      this._updateBatchTimer = null;
    }
    
    // Clear cache
    this._cachedMinWidth = null;
    this._pendingMinWidthUpdate = false;
    
    // Call parent destroy
    super.destroy();
  }
} 