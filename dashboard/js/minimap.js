import { getBoundingBoxRelativeToParent } from './utils.js';

export class Minimap {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.active = false;
    this.svg = null;
    this.width = 0;
    this.height = 0;
    this.container = null;
    this.eye = { x: 0, y: 0, width: 0, height: 0 };
    this.scale = 1;
    this.targetWidthPx = 240;
    this.targetHeightPx = 160;

    // CRITICAL FIX: Clean up any existing zoom-cockpit elements that might be left behind
    try {
      if (typeof document !== 'undefined') {
        // Remove any orphaned zoom-cockpit elements from the DOM
        const existingCockpits = document.querySelectorAll('.zoom-cockpit');
        existingCockpits.forEach((cockpit) => {
          if (
            cockpit.parentElement &&
            cockpit.parentElement.classList.contains('zoom-overlay-host')
          ) {
            cockpit.remove();
          }
        });

        // Remove empty overlay hosts
        const emptyOverlayHosts = document.querySelectorAll('.zoom-overlay-host');
        emptyOverlayHosts.forEach((host) => {
          if (host.children.length === 0) {
            host.remove();
          }
        });
      }
    } catch {}

    // UI Elements
    this.cockpit = null;
    this.overlay = null;
    this.overlayHost = null;
    this.chromeSvg = null;
    this.content = null;
    this.collapsedIcon = null;
    this.header = null;
    this.headerHeight = 20;
    this.collapseButton = null;
    this.pinButton = null;
    this.pinBase = null;
    this.pinSlash = null;
    this.sizeButton = null;
    this.sizeLabel = null;
    this.footer = null;
    this.footerHeight = 20;
    this.scaleText = null;
    this.controls = null;
    this.btnZoomIn = null;
    this.btnZoomOut = null;
    this.btnReset = null;
    this.headerHitRect = null;
    this.footerHitRect = null;
    this.drag = null;
    this.zoom = null;
    this.useDesaturateLayering = false;
    this.grayGroup = null;
    this.colorGroup = null;

    // State management
    this.state = { showTimer: null, hideTimer: null, interacting: false, wheelTimer: null };

    // CRITICAL FIX: Track initialization state to prevent duplicates
    this._isInitialized = false;

    // CRITICAL FIX: Set up periodic duplicate detection and cleanup
    this._duplicateCheckInterval = null;
    this._setupDuplicateDetection();
  }

  /**
   * Set up periodic duplicate detection to catch any runtime duplications
   */
  _setupDuplicateDetection() {
    try {
      if (typeof window !== 'undefined') {
        // Check every 5 seconds for duplicates
        this._duplicateCheckInterval = setInterval(() => {
          this.removeDuplicates();
        }, 5000);
      }
    } catch {}
  }

  getActiveThemeName() {
    try {
      const root = typeof document !== 'undefined' ? document.documentElement : null;
      const body = typeof document !== 'undefined' ? document.body : null;
      const attr =
        (root && root.getAttribute('data-theme')) ||
        (body && body.getAttribute('data-theme')) ||
        '';
      return String(attr || '').toLowerCase();
    } catch {
      return '';
    }
  }

  /**
   * Get target width in monitor pixels for minimap size token
   */
  getTargetWidth(sizeToken) {
    if (typeof sizeToken === 'object' && sizeToken && typeof sizeToken.width === 'number') {
      return sizeToken.width;
    }
    switch (sizeToken) {
      case 's':
        return 180;
      case 'l':
        return 400;
      case 'm':
      default:
        return 244;
    }
  }

  /**
   * Unified minimap sizing method - single source of truth for all minimap sizing
   */
  resize() {
    if (!this.svg) return;

    const mm = this.dashboard.data.settings.minimap;
    if (!mm) return;

    // Get target monitor pixel dimensions
    const targetWidthPx = this.getTargetWidth(mm.size);
    const graphAspectRatio =
      this.dashboard.main.aspectRatio ||
      this.dashboard.main.divRatio ||
      this.dashboard.main.width / this.dashboard.main.height ||
      16 / 9;
    const targetHeightPx = Math.max(60, Math.round(targetWidthPx / graphAspectRatio));

    // Store target dimensions for reference
    this.targetWidthPx = targetWidthPx;
    this.targetHeightPx = targetHeightPx;

    // Calculate the scaling factor to convert monitor pixels to SVG coordinate space
    const svgElement = this.dashboard.main.svg.node();
    const svgRect = svgElement.getBoundingClientRect();
    const svgScale =
      svgRect.width && this.dashboard.main.width ? svgRect.width / this.dashboard.main.width : 1.0;

    // Convert to SVG coordinate space
    const svgCoordWidth = targetWidthPx / svgScale;
    const svgCoordHeight = targetHeightPx / svgScale;

    // Apply dimensions to minimap SVG
    this.width = svgCoordWidth;
    this.height = svgCoordHeight;
    this.svg.attr('width', svgCoordWidth).attr('height', svgCoordHeight);

    // Update minimap content scale using content bounds and set viewBox to content bbox
    const contentBBox = this.dashboard.getContentBBox();
    if (!this.width || !this.height) {
      // Ensure minimap has a reasonable default size before scale compute
      this.width = this.width || this.targetWidthPx || 240;
      this.height = this.height || this.targetHeightPx || 160;
    }
    this.scale = Math.min(this.width / contentBBox.width, this.height / contentBBox.height);
    this.updateViewboxAndMasks(contentBBox);

    // Update minimap content and sync with current zoom
    this.update();
    const transform = d3.zoomIdentity
      .translate(this.dashboard.main.transform.x, this.dashboard.main.transform.y)
      .scale(this.dashboard.main.transform.k);
    this.updateViewport(transform);
  }

  /**
   * Check for and remove any duplicate zoom-cockpit elements
   * This is a safety measure to prevent the duplication issue
   */
  removeDuplicates() {
    try {
      if (typeof document !== 'undefined') {
        const allCockpits = document.querySelectorAll('.zoom-cockpit');
        if (allCockpits.length > 1) {
          console.warn(`Found ${allCockpits.length} zoom-cockpit elements, removing duplicates`);

          // Keep only the first one (which should be the current one)
          for (let i = 1; i < allCockpits.length; i++) {
            allCockpits[i].remove();
          }
        }
      }
    } catch (e) {
      console.warn('Error removing duplicate elements:', e);
    }
  }

  /**
   * Check if the minimap is properly initialized and has all required DOM elements
   */
  isProperlyInitialized() {
    return (
      this._isInitialized && this.cockpit && this.overlayHost && this.chromeSvg && this.content
    );
  }

  /**
   * Safely initialize the minimap, only if not already properly initialized
   */
  safeInitialize() {
    if (this.isProperlyInitialized()) {
      return; // Already properly initialized
    }

    // CRITICAL FIX: Remove any duplicates before initialization
    this.removeDuplicates();

    // If partially initialized, clean up first
    if (this._isInitialized) {
      this.destroy();
    }

    this.initializeEmbedded();
  }

  initializeEmbedded() {
    // CRITICAL FIX: Prevent duplicate initialization
    if (this._isInitialized) {
      console.warn('Minimap already initialized, skipping duplicate initialization');
      return;
    }

    const mm = this.dashboard.data.settings.minimap;
    if (!mm || mm.enabled === false) {
      // Performance optimization: Skip minimap entirely if disabled
      this.active = false;
      this._isInitialized = true; // Mark as initialized even when disabled
      return;
    }

    // Determine mode defaults by environment
    const isSmallScreen = typeof window !== 'undefined' && (window.innerWidth || 0) < 600;
    let mode = this.dashboard.data.settings.minimap.mode || (isSmallScreen ? 'disabled' : 'hover');
    if (mode === 'hidden') mode = 'disabled';
    this.dashboard.data.settings.minimap.mode = mode;

    // Disabled mode: do not create the cockpit at all
    if (mode === 'disabled') {
      this.dashboard.data.settings.minimap.enabled = false;
      this._isInitialized = true; // Mark as initialized even when disabled
      return;
    }

    // Persistent collapsed state
    if (mm.persistence && mm.persistence.persistCollapsedState && typeof window !== 'undefined') {
      try {
        const persisted = window.localStorage.getItem(mm.persistence.storageKey);
        if (persisted !== null) {
          this.dashboard.data.settings.minimap.collapsed = persisted === 'true';
        }
      } catch {}
    }
    // In 'always' mode, force cockpit to be visible/enabled and pinned by default
    if (mode === 'always') {
      this.dashboard.data.settings.minimap.enabled = true;
      this.dashboard.data.settings.minimap.collapsed = false;
      this.dashboard.data.settings.minimap.pinned = true;
    }
    if (mode === 'hover' && typeof this.dashboard.data.settings.minimap.collapsed === 'undefined') {
      this.dashboard.data.settings.minimap.collapsed = true; // show button by default
    }

    // Create overlay host inside the graph container so offsets ignore outer padding
    const graphContainer = this.dashboard.main.svg.node().parentElement;
    // Ensure host container has proper positioning context for absolute positioning
    try {
      graphContainer.style.position = 'relative';
      graphContainer.style.overflow = 'hidden';
    } catch {}

    // Create or reuse an overlay host that fills the content box (inside padding)
    let overlayHost = d3.select(graphContainer).select('.zoom-overlay-host');
    if (overlayHost.empty()) {
      overlayHost = d3.select(graphContainer).append('div').attr('class', 'zoom-overlay-host');
    }

    // CRITICAL FIX: Remove any existing zoom-cockpit elements to prevent duplication
    overlayHost.selectAll('.zoom-cockpit').remove();

    // Size and place host to account for container padding
    try {
      const cs =
        typeof window !== 'undefined' && window.getComputedStyle
          ? window.getComputedStyle(graphContainer)
          : null;
      const padTop = cs ? parseFloat(cs.paddingTop || '0') : 0;
      const padRight = cs ? parseFloat(cs.paddingRight || '0') : 0;
      const padBottom = cs ? parseFloat(cs.paddingBottom || '0') : 0;
      const padLeft = cs ? parseFloat(cs.paddingLeft || '0') : 0;
      overlayHost
        .style('position', 'absolute')
        .style('top', `${padTop}px`)
        .style('right', `${padRight}px`)
        .style('bottom', `${padBottom}px`)
        .style('left', `${padLeft}px`)
        .style('pointer-events', 'none');
    } catch {}
    this.overlayHost = overlayHost;

    // Create cockpit inside the overlay host
    const cockpitDiv = overlayHost.append('div').attr('class', 'zoom-cockpit');
    this.cockpit = cockpitDiv;
    this.overlay = cockpitDiv; // alias for existing code paths
    // Create an inner SVG to host minimap UI and content
    const cockpitSvg = cockpitDiv
      .append('svg')
      .attr('class', 'minimap-chrome')
      .style('position', 'absolute')
      .style('top', '0')
      .style('left', '0')
      .style('width', '100%')
      .style('height', '100%')
      .style('pointer-events', 'all');
    this.chromeSvg = cockpitSvg;
    this.content = cockpitSvg.append('g').attr('class', 'minimap-content');
    this.active = true;
    this.state = { showTimer: null, hideTimer: null, interacting: false, wheelTimer: null };

    // Collapsed icon (always rendered; visibility toggled)
    this.collapsedIcon = this.content
      .append('g')
      .attr('class', 'minimap-collapsed-icon')
      .style('cursor', 'pointer')
      .style('pointer-events', 'all');
    // Simple square icon placeholder; themes can override
    this.collapsedIcon
      .append('rect')
      .attr('class', 'collapsed-icon-bg')
      .attr('width', 20)
      .attr('height', 14)
      .attr('rx', 2)
      .attr('ry', 2);
    this.collapsedIcon
      .append('rect')
      .attr('class', 'collapsed-icon-mini')
      .attr('x', 4)
      .attr('y', 3)
      .attr('width', 12)
      .attr('height', 8);
    this.collapsedIcon.on('click', () => {
      this.setCollapsed(false, true);
    });

    // Header (pin, collapse, size switch)
    this.header = this.content.append('g').attr('class', 'minimap-header');
    this.headerHeight = 20;

    // Collapse and Pin buttons when expanded
    this.collapseButton = this.header
      .append('g')
      .attr('class', 'minimap-collapse-button')
      .style('cursor', 'pointer');
    this.collapseButton
      .append('rect')
      .attr('class', 'collapse-btn-bg')
      .attr('width', 16)
      .attr('height', 16)
      .attr('rx', 3)
      .attr('ry', 3);
    // triangle-down shape
    this.collapseButton
      .append('path')
      .attr('class', 'collapse-btn-icon')
      .attr('d', 'M2,6 L14,6 L8,12 Z');
    this.collapseButton.on('click', () => {
      // Hide cockpit only; do not change pin/mode
      this.setCollapsed(true, true);
    });

    this.pinButton = this.header
      .append('g')
      .attr('class', 'minimap-pin-button')
      .style('cursor', 'pointer')
      .attr('role', 'button')
      .attr('aria-label', 'Pin')
      .attr('aria-pressed', String(!!mm.pinned));
    // Size switcher (cycles s → m → l)
    this.sizeButton = this.header
      .append('g')
      .attr('class', 'minimap-size-button')
      .style('cursor', 'pointer');
    this.sizeButton
      .append('rect')
      .attr('class', 'btn-bg')
      .attr('width', 20)
      .attr('height', 16)
      .attr('rx', 3)
      .attr('ry', 3);
    this.sizeLabel = this.sizeButton
      .append('text')
      .attr('class', 'btn-label')
      .attr('x', 10)
      .attr('y', 10)
      .attr('text-anchor', 'middle')
      .style('dominant-baseline', 'middle')
      .style('font-size', '10px');
    const updateSizeLabel = () => {
      const token = this.dashboard.data.settings.minimap.size;
      const label =
        typeof token === 'object' ? token.label || 'M' : String(token || 'm').toUpperCase();
      this.sizeLabel.text(label);
    };
    updateSizeLabel();
    this.sizeButton.on('click', () => {
      const order = (this.dashboard.data.settings.minimap.sizeSwitcher &&
        this.dashboard.data.settings.minimap.sizeSwitcher.order) || ['s', 'm', 'l'];
      const current = this.dashboard.data.settings.minimap.size;
      const idx =
        order.indexOf(typeof current === 'object' ? current.token : current) >= 0
          ? order.indexOf(typeof current === 'object' ? current.token : current)
          : order.indexOf('m');
      const nextToken = order[(idx + 1) % order.length];
      this.dashboard.data.settings.minimap.size = nextToken;
      // Use unified sizing method for consistent behavior
      this.resize();
      this.position();
      updateSizeLabel();
      // Notify via callback if provided
      if (typeof this.dashboard.data.settings.minimap.onSizeChange === 'function') {
        try {
          this.dashboard.data.settings.minimap.onSizeChange({
            size: nextToken,
            width: this.targetWidthPx,
            height: this.targetHeightPx,
          });
        } catch {}
      }
    });
    // Traditional pin/unpin icon without square background
    // Clear previous children if any rerun occurs
    this.pinButton.selectAll('*').remove();
    const iconGroup = this.pinButton.append('g').attr('class', 'pin-icon');
    // Base pushpin shape (16x16 box)
    const pinBasePath =
      'M8 2 C9.2 2 10 2.8 10 4 L10 6 L12.5 8 L9 8 L9 12 L7 12 L7 8 L3.5 8 L6 6 L6 4 C6 2.8 6.8 2 8 2 Z';
    // Slash line for unpinned state
    const pinSlashPath = 'M3 13 L13 3';
    this.pinBase = iconGroup
      .append('path')
      .attr('class', 'pin-base')
      .attr('d', pinBasePath)
      .attr('fill', 'var(--fd-border, rgba(0,0,0,0.85))');
    this.pinSlash = iconGroup
      .append('path')
      .attr('class', 'pin-slash')
      .attr('d', pinSlashPath)
      .attr('stroke', 'var(--fd-border, rgba(0,0,0,0.85))')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .style('display', mm.pinned ? 'none' : 'block');
    // Slight rotation for unpinned to further differentiate visually
    iconGroup.attr('transform', mm.pinned ? 'rotate(0,8,8)' : 'rotate(-20,8,8)');
    this.pinButton.append('title').text('Pin (toggle pinned / hover)');
    this.pinButton.on('click', () => {
      mm.pinned = !mm.pinned;
      this.dashboard.data.settings.minimap.mode = mm.pinned ? 'always' : 'hover';
      // Clear any pending timers and reset interaction state on mode change
      if (this.state.showTimer) {
        clearTimeout(this.state.showTimer);
        this.state.showTimer = null;
      }
      if (this.state.hideTimer) {
        clearTimeout(this.state.hideTimer);
        this.state.hideTimer = null;
      }
      this.state.interacting = false;
      this.updatePinVisualState();
      this.updateHoverBindings();
    });

    // Create minimap svg and inner content group
    this.svg = this.content.append('svg').attr('class', 'minimap-svg');
    this.container = this.svg.append('g').attr('class', 'minimap');

    // Use unified sizing method for consistent behavior
    this.resize();

    // Initialize behaviors and content
    this.initialize();

    // Footer bar (controls + scale)
    this.footer = this.content.append('g').attr('class', 'minimap-footer');
    this.footerHeight = 20;
    // Scale indicator in footer
    if (mm.scaleIndicator?.visible !== false) {
      this.scaleText = this.footer
        .append('text')
        .attr('class', 'minimap-scale')
        .attr('text-anchor', 'end');
    }

    // Controls: zoom in/out/reset
    const makeButton = (group, className, onClick) => {
      const g = group
        .append('g')
        .attr('class', `minimap-btn ${className}`)
        .style('cursor', 'pointer');
      // Button background for clear affordance
      g.append('rect')
        .attr('class', 'btn-bg')
        .attr('width', 16)
        .attr('height', 16)
        .attr('rx', 3)
        .attr('ry', 3);
      g.on('click', (ev) => {
        ev.stopPropagation();
        onClick();
      });
      return g;
    };
    this.controls = this.footer.append('g').attr('class', 'minimap-controls');
    // Icons as simple shapes
    this.btnZoomIn = makeButton(this.controls, 'zoom-in', () => this.dashboard.zoomIn());
    this.btnZoomIn
      .append('rect')
      .attr('class', 'icon plus-h')
      .attr('x', 3)
      .attr('y', 7)
      .attr('width', 10)
      .attr('height', 2);
    this.btnZoomIn
      .append('rect')
      .attr('class', 'icon plus-v')
      .attr('x', 7)
      .attr('y', 3)
      .attr('width', 2)
      .attr('height', 10);

    this.btnZoomOut = makeButton(this.controls, 'zoom-out', () => this.dashboard.zoomOut());
    this.btnZoomOut
      .append('rect')
      .attr('class', 'icon minus')
      .attr('x', 3)
      .attr('y', 7)
      .attr('width', 10)
      .attr('height', 2);

    this.btnReset = makeButton(this.controls, 'reset', () => this.dashboard.zoomReset());
    this.btnReset
      .append('circle')
      .attr('class', 'icon target-outer')
      .attr('cx', 8)
      .attr('cy', 8)
      .attr('r', 5);
    this.btnReset
      .append('circle')
      .attr('class', 'icon target-inner')
      .attr('cx', 8)
      .attr('cy', 8)
      .attr('r', 1.5);

    // Invisible hit rects to stabilize hover over header/footer rows
    this.headerHitRect = this.header
      .append('rect')
      .attr('class', 'minimap-header-hit')
      .attr('fill', 'transparent');
    this.footerHitRect = this.footer
      .append('rect')
      .attr('class', 'minimap-footer-hit')
      .attr('fill', 'transparent');
    // Ensure hit-rects sit underneath interactive controls so they don't block clicks
    if (this.headerHitRect) this.headerHitRect.lower();
    if (this.footerHitRect) this.footerHitRect.lower();

    // Ensure chrome sits on top
    if (this.header) this.header.raise();
    if (this.footer) this.footer.raise();

    // Position overlay
    this.position();

    // Setup hover bindings based on current mode
    this.updateHoverBindings();

    // Initial collapsed state
    this.setCollapsed(mm.collapsed === true);
    this.updateVisibilityByZoom();
    this.updatePinVisualState();
    this._isInitialized = true; // Mark as initialized after successful initialization
  }

  setCollapsed(collapsed, persist = false) {
    const mm = this.dashboard.data.settings.minimap;
    mm.collapsed = !!collapsed;
    if (this.svg) {
      this.svg.style('display', collapsed ? 'none' : 'block');
    }
    if (this.scaleText) {
      this.scaleText.style('display', collapsed ? 'none' : 'block');
    }
    if (this.footer) {
      this.footer.style('display', collapsed ? 'none' : 'block');
    }
    if (this.collapsedIcon) {
      const isHiddenMode = mm.mode === 'hidden' || mm.mode === 'disabled';
      const showIcon = collapsed; // show icon only when collapsed
      this.collapsedIcon.style('display', showIcon && !isHiddenMode ? 'block' : 'none');
    }
    if (this.collapseButton) {
      const isHiddenMode = mm.mode === 'hidden' || mm.mode === 'disabled';
      this.collapseButton.style('display', !collapsed && !isHiddenMode ? 'block' : 'none');
    }
    if (this.pinButton) {
      const isHiddenMode = mm.mode === 'hidden' || mm.mode === 'disabled';
      this.pinButton.style('display', !collapsed && !isHiddenMode ? 'block' : 'none');
    }
    if (this.sizeButton) {
      const isHiddenMode = mm.mode === 'hidden' || mm.mode === 'disabled';
      this.sizeButton.style('display', !collapsed && !isHiddenMode ? 'block' : 'none');
    }
    if (this.header) {
      const isHiddenMode = mm.mode === 'hidden' || mm.mode === 'disabled';
      this.header.style('display', !collapsed && !isHiddenMode ? 'block' : 'none');
    }
    this.position();
    // Re-bind hover events when state changes to ensure proper behavior
    this.updateHoverBindings();
    if (
      persist &&
      mm.persistence &&
      mm.persistence.persistCollapsedState &&
      typeof window !== 'undefined'
    ) {
      try {
        window.localStorage.setItem(mm.persistence.storageKey, String(mm.collapsed));
      } catch {}
    }
  }

  updatePinVisualState() {
    const mm = this.dashboard.data.settings.minimap;
    if (!this.pinButton) return;
    this.pinButton.classed('active', !!mm.pinned);
    this.pinButton.attr('aria-pressed', String(!!mm.pinned));
    if (this.pinBase && this.pinSlash) {
      this.pinSlash.style('display', mm.pinned ? 'none' : 'block');
      // rotate icon group to differentiate
      const iconGroup = this.pinButton.select('g.pin-icon');
      if (!iconGroup.empty())
        iconGroup.attr('transform', mm.pinned ? 'rotate(0,8,8)' : 'rotate(-20,8,8)');
    }
  }

  position() {
    if (!this.cockpit) return;
    const mm = this.dashboard.data.settings.minimap;
    const padding = 12;
    // Use monitor pixel sizing for cockpit DIV
    const sizePx = {
      width: this.targetWidthPx || 244,
      height: this.targetHeightPx || 160,
    };
    const iconSize = { width: 20, height: 14 };

    // Position the cockpit DIV relative to the graph container
    const graphContainer = this.dashboard.main.svg.node().parentElement;
    const w = Math.max(0, graphContainer.clientWidth || 0);
    const h = Math.max(0, graphContainer.clientHeight || 0);

    const corner = (mm.collapsedIcon && mm.collapsedIcon.position) || mm.position || 'bottom-right';
    const headerH = this.headerHeight || 20;
    const footerH = this.footerHeight || 20;
    const cockpit = { width: sizePx.width, height: sizePx.height + headerH + footerH };

    // Keep overlay host in sync with container padding so offsets ignore outer padding
    try {
      const graphContainer = this.dashboard.main.svg.node().parentElement;
      const cs =
        typeof window !== 'undefined' && window.getComputedStyle
          ? window.getComputedStyle(graphContainer)
          : null;
      const padTop = cs ? parseFloat(cs.paddingTop || '0') : 0;
      const padRight = cs ? parseFloat(cs.paddingRight || '0') : 0;
      const padBottom = cs ? parseFloat(cs.paddingBottom || '0') : 0;
      const padLeft = cs ? parseFloat(cs.paddingLeft || '0') : 0;
      if (this.overlayHost) {
        this.overlayHost
          .style('top', `${padTop}px`)
          .style('right', `${padRight}px`)
          .style('bottom', `${padBottom}px`)
          .style('left', `${padLeft}px`);
      }
    } catch {}

    // Size the cockpit DIV and ensure positioning (CSS should handle this, but fallback for reliability)
    const isFullscreen = this.dashboard.main.svg.classed('flowdash-fullscreen');
    this.cockpit
      .style('width', `${cockpit.width}px`)
      .style('height', `${cockpit.height}px`)
      .style('display', 'block');

    // Ensure positioning (CSS should handle this, but JavaScript as reliable fallback)
    const cockpitNode = this.cockpit.node();
    if (cockpitNode) {
      // Always set positioning via JavaScript for reliability
      cockpitNode.style.setProperty('position', isFullscreen ? 'fixed' : 'absolute', 'important');
      cockpitNode.style.setProperty('right', '12px', 'important');
      cockpitNode.style.setProperty('bottom', '12px', 'important');
      cockpitNode.style.setProperty('top', 'auto', 'important');
      cockpitNode.style.setProperty('left', 'auto', 'important');
      cockpitNode.style.setProperty('z-index', '10000', 'important');
      cockpitNode.style.setProperty('pointer-events', 'none', 'important');
    }

    // Inside the cockpit, position header, body and footer using transforms, and size the chrome svg
    if (this.chromeSvg) {
      this.chromeSvg.attr('width', cockpit.width).attr('height', cockpit.height);
    }
    if (this.header) {
      this.header.attr('transform', `translate(${0},${0})`);
      const yPad = 2;
      let xRight = sizePx.width - 4;
      if (this.collapseButton) {
        xRight -= 16;
        this.collapseButton.attr('transform', `translate(${xRight},${yPad})`);
      }
      if (this.pinButton) {
        xRight -= 20;
        this.pinButton.attr('transform', `translate(${xRight},${yPad})`);
      }
      if (this.sizeButton) {
        xRight -= 24;
        this.sizeButton.attr('transform', `translate(${xRight},${yPad})`);
      }
      if (this.headerHitRect)
        this.headerHitRect
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', sizePx.width)
          .attr('height', headerH);
    }
    // Body SVG (minimap) positioned under header
    this.svg
      .attr('x', 0)
      .attr('y', headerH)
      .attr('width', sizePx.width)
      .attr('height', sizePx.height);
    // Footer under body
    if (this.footer) {
      const footerTopY = headerH + sizePx.height;
      this.footer.attr('transform', `translate(${0},${footerTopY})`);
      if (this.footerHitRect)
        this.footerHitRect
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', sizePx.width)
          .attr('height', footerH);
      if (this.controls) {
        const spacing = 6;
        const buttonSize = 16;
        const leftPadding = 6;
        const rightPadding = 6;
        const controlsStartX = leftPadding;
        const footerCenterY = Math.floor(footerH / 2);
        this.controls.attr(
          'transform',
          `translate(${controlsStartX},${footerCenterY - buttonSize / 2})`,
        );
        this.btnZoomIn.attr('transform', 'translate(0,0)');
        this.btnZoomOut.attr('transform', `translate(${buttonSize + spacing},0)`);
        this.btnReset.attr('transform', `translate(${(buttonSize + spacing) * 2},0)`);
        if (this.scaleText) {
          this.scaleText
            .attr('x', sizePx.width - rightPadding)
            .attr('y', footerCenterY)
            .style('text-anchor', 'end')
            .style('dominant-baseline', 'middle');
        }
      }
    }
    // Collapsed icon positioned at bottom-right of the cockpit
    // Position it at the bottom-right corner with some padding
    this.collapsedIcon.attr(
      'transform',
      `translate(${cockpit.width - iconSize.width - 2},${cockpit.height - iconSize.height - 2})`,
    );

    if (this.scaleText && this.footer) {
      this.scaleText
        .style('font-size', '12px')
        .style('dominant-baseline', 'middle')
        .style('fill', 'var(--minimap-scale-fg, #333)');
      this.updateScaleIndicator();
    }
  }

  updateScaleIndicator() {
    const mm = this.dashboard.data.settings.minimap;
    if (!this.scaleText || !this.active || mm.scaleIndicator?.visible === false) return;

    const baseline = this.dashboard.main.fitK || 1;
    const pct = Math.round(((this.dashboard.main.transform.k || 1) / baseline) * 100);
    const label = `${pct}%`;
    this.scaleText.text(label);
  }

  updateHoverBindings() {
    const mm = this.dashboard.data.settings.minimap || {};
    // Clear previous bindings
    if (this.collapsedIcon) {
      this.collapsedIcon
        .on('mouseenter', null)
        .on('mouseleave', null)
        .on('mouseover', null)
        .on('mouseout', null)
        .on('touchstart', null);
    }
    if (this.cockpit) {
      this.cockpit
        .on('mouseenter', null)
        .on('mouseleave', null)
        .on('mouseover', null)
        .on('mouseout', null)
        .on('mousedown', null)
        .on('mouseup', null)
        .on('wheel', null);
    }
    if (!mm) return;

    if (mm.mode === 'hover' || (mm.mode === 'always' && !mm.pinned)) {
      const show = () => {
        if (
          this.dashboard.data.settings.minimap.mode !== 'hover' &&
          this.dashboard.data.settings.minimap.pinned
        )
          return;
        // cancel pending hide and show immediately
        if (this.state.hideTimer) {
          clearTimeout(this.state.hideTimer);
          this.state.hideTimer = null;
        }
        this.setCollapsed(false);
      };
      const hide = () => {
        if (
          !this.dashboard.data.settings.minimap.pinned &&
          this.dashboard.data.settings.minimap.mode === 'hover'
        )
          this.setCollapsed(true);
      };

      // Only bind hover events to the collapsed icon (the actual button)
      // This prevents hover activation from the invisible cockpit space
      if (this.collapsedIcon) {
        this.collapsedIcon
          .on('mouseenter', () => {
            this.state.isHover = true;
            if (this.state.hideTimer) clearTimeout(this.state.hideTimer);
            if (this.state.showTimer) clearTimeout(this.state.showTimer);
            this.state.showTimer = setTimeout(show, mm.hover?.showDelayMs ?? 120);
          })
          .on('mouseleave', () => {
            this.state.isHover = false;
            if (this.state.showTimer) {
              clearTimeout(this.state.showTimer);
              this.state.showTimer = null;
            }
            // If already expanded (not collapsed anymore), ignore icon mouseleave to prevent flicker
            if (this.dashboard.data.settings.minimap.collapsed !== true) return;
            if (!this.dashboard.data.settings.minimap.pinned)
              this.state.hideTimer = setTimeout(hide, mm.hover?.hideDelayMs ?? 300);
          })
          .on('touchstart', () => {
            show();
            setTimeout(hide, mm.touch?.autoHideAfterMs ?? 2500);
          });
      }

      // Only bind cockpit hover events when the cockpit is actually visible (not collapsed)
      // This prevents hover detection on invisible/inactive cockpit space
      if (this.cockpit && !mm.collapsed) {
        this.cockpit
          .on('mouseenter', () => {
            this.state.isHover = true;
            if (this.state.hideTimer) clearTimeout(this.state.hideTimer);
            show();
          })
          .on('mouseleave', (event) => {
            this.state.isHover = false;
            if (
              !this.dashboard.data.settings.minimap.pinned &&
              !this.state.interacting &&
              this.dashboard.data.settings.minimap.mode === 'hover'
            )
              this.state.hideTimer = setTimeout(hide, mm.hover?.hideDelayMs ?? 300);
          })
          .on('mousedown', () => {
            this.state.interacting = true;
          })
          .on('mouseup', () => {
            this.state.interacting = false;
          })
          .on('wheel', () => {
            this.state.interacting = true;
            if (this.state.hideTimer) clearTimeout(this.state.hideTimer);
            if (this.state.wheelTimer) clearTimeout(this.state.wheelTimer);
            this.state.wheelTimer = setTimeout(() => {
              this.state.interacting = false;
              if (
                !this.dashboard.data.settings.minimap.pinned &&
                this.dashboard.data.settings.minimap.mode === 'hover'
              )
                hide();
            }, 250);
          });
      }
    }
  }

  initialize() {
    const dashboard = this.dashboard;

    // Initialize drag behavior
    const drag = d3.drag().on('drag', function (event) {
      dragEye(dashboard, event);
    });
    this.svg.call(drag);
    this.drag = drag;

    // Initialize zoom behavior
    const [minK, maxK] = dashboard.data?.settings?.zoom?.scaleExtent || [0.1, 40];
    const zoom = d3
      .zoom()
      .scaleExtent([minK, maxK])
      .on('zoom', (event) => dashboard.zoomMinimap(event));
    this.svg.call(zoom);
    this.zoom = zoom;

    // compute the scale of the minimap compared to the content bounds
    const contentBBox = this.dashboard.getContentBBox();
    this.scale = Math.min(this.width / contentBBox.width, this.height / contentBBox.height);

    // set minimap viewBox to content bounds so there's no large whitespace
    this.updateViewboxAndMasks(contentBBox);

    this.eye = {
      x: -this.dashboard.main.width / 2,
      y: -this.dashboard.main.height / 2,
      width: this.dashboard.main.width,
      height: this.dashboard.main.height,
    };

    const defs = this.svg.append('defs');
    // Optional grayscale filter for themes that want B/W outside the eye
    const themeName = this.getActiveThemeName();
    this.useDesaturateLayering = themeName === 'cyberpunk';
    if (this.useDesaturateLayering) {
      const filt = defs.append('filter').attr('id', 'mm-desaturate');
      filt.append('feColorMatrix').attr('type', 'saturate').attr('values', 0);
      // ClipPath for colored pupil region
      const pupilClip = defs.append('clipPath').attr('id', 'pupil-clip');
      pupilClip
        .append('rect')
        .attr('id', 'pupil-clip-rect')
        .attr('x', this.eye.x)
        .attr('y', this.eye.y)
        .attr('width', this.eye.width)
        .attr('height', this.eye.height);
    }
    const eye = defs.append('mask').attr('id', 'fade-mask');
    eye
      .append('rect')
      .attr('id', 'eyeball')
      .attr('x', -this.dashboard.main.width / 2)
      .attr('y', -this.dashboard.main.height / 2)
      .attr('width', this.dashboard.main.width)
      .attr('height', this.dashboard.main.height)
      .attr('class', 'minimap-eyeball');
    eye
      .append('rect')
      .attr('id', 'pupil')
      .attr('class', 'minimap-pupil')
      .attr('x', this.eye.x)
      .attr('y', this.eye.y)
      .attr('width', this.eye.width)
      .attr('height', this.eye.height);

    this.svg
      .insert('rect', ':first-child') // Insert as the first child
      .attr('class', `background`)
      .attr('width', contentBBox.width)
      .attr('height', contentBBox.height)
      .attr('x', contentBBox.x)
      .attr('y', contentBBox.y);

    // Content layering: for cyberpunk, render grayscale layer + clipped color layer
    if (this.useDesaturateLayering) {
      this.grayGroup = this.svg
        .append('g')
        .attr('class', 'minimap minimap-gray')
        .attr('filter', 'url(#mm-desaturate)');
      this.colorGroup = this.svg
        .append('g')
        .attr('class', 'minimap minimap-color')
        .attr('clip-path', 'url(#pupil-clip)');
    }

    this.svg
      .append('rect')
      .attr('class', `eye`)
      .attr('width', contentBBox.width)
      .attr('height', contentBBox.height)
      .attr('x', contentBBox.x)
      .attr('y', contentBBox.y)
      .attr('mask', 'url(#fade-mask)');

    this.svg
      .append('rect')
      .attr('class', `iris`)
      .attr('x', this.eye.x)
      .attr('y', this.eye.y)
      .attr('width', this.eye.width)
      .attr('height', this.eye.height);

    return zoom;
  }

  update() {
    // Use requestAnimationFrame to Wait for the Next Render Cycle
    requestAnimationFrame(() => {
      // Performance optimization: Only update minimap content if not collapsed
      if (this.svg && this.svg.style('display') !== 'none') {
        // Performance optimization: Use a lighter approach for large dashboards
        const allNodes = this.dashboard.main.root.getAllNodes(false);
        if (allNodes.length > 100) {
          // For large dashboards, use a simplified representation
          this.updateSimplified(allNodes);
        } else {
          // For smaller dashboards, use the full clone approach
          this.updateFullClone();
        }
      }
    });
  }

  updateSimplified(allNodes) {
    // Simplified minimap for large dashboards - just update viewBox and eye
    const contentBBox = this.dashboard.getContentBBox();
    this.updateViewboxAndMasks(contentBBox);

    // Clear existing content
    if (this.useDesaturateLayering) {
      if (this.grayGroup) this.grayGroup.selectAll('*').remove();
      if (this.colorGroup) this.colorGroup.selectAll('*').remove();
    } else {
      const minimap = d3.select('.minimap');
      minimap.selectAll('*').remove();
    }

    // Create simplified rectangles for each node
    const drawRects = (groupSel) => {
      allNodes.forEach((node) => {
        let bbox = null;
        try {
          bbox = getBoundingBoxRelativeToParent(node.element, this.dashboard.main.container);
        } catch {}
        if (!bbox || !isFinite(bbox.width) || !isFinite(bbox.height)) {
          // Fallback to node data when DOM is missing (e.g., collapsed)
          const nx = typeof node.x === 'number' ? node.x : 0;
          const ny = typeof node.y === 'number' ? node.y : 0;
          const nw =
            node.data && typeof node.data.width === 'number'
              ? node.data.width
              : typeof node.width === 'number'
                ? node.width
                : 0;
          const nh =
            node.data && typeof node.data.height === 'number'
              ? node.data.height
              : typeof node.height === 'number'
                ? node.height
                : 0;
          bbox = { x: nx - nw / 2, y: ny - nh / 2, width: nw, height: nh };
        }
        groupSel
          .append('rect')
          .attr('x', bbox.x)
          .attr('y', bbox.y)
          .attr('width', Math.max(0, bbox.width))
          .attr('height', Math.max(0, bbox.height))
          .attr('fill', node.isContainer ? '#4a90e2' : '#7ed321')
          .attr('opacity', 0.7);
      });
    };
    if (this.useDesaturateLayering) {
      drawRects(this.grayGroup);
      drawRects(this.colorGroup);
    } else {
      const minimap = d3.select('.minimap');
      drawRects(minimap);
    }
  }

  updateFullClone() {
    // Clone approach for smaller dashboards
    const sourceNode = this.dashboard.main.container.node();
    if (this.useDesaturateLayering) {
      if (this.grayGroup) this.grayGroup.selectAll('*').remove();
      if (this.colorGroup) this.colorGroup.selectAll('*').remove();
      if (sourceNode) {
        const grayClone = sourceNode.cloneNode(true);
        const colorClone = sourceNode.cloneNode(true);
        this.grayGroup.node().appendChild(grayClone);
        this.colorGroup.node().appendChild(colorClone);
      }
      this.container = this.grayGroup; // keep a reference for compatibility
    } else {
      const clone = sourceNode ? sourceNode.cloneNode(true) : null;
      const minimap = d3.select('.minimap');
      minimap.selectAll('*').remove();
      if (clone) minimap.node().appendChild(clone);
      this.container = d3.select(clone);
      if (this.container) this.container.attr('transform', null);
    }
    this.updateViewboxAndMasks(this.dashboard.getContentBBox());
  }

  // Function to update the position and size of the eye
  updateEye(x, y, width, height) {
    if (!this.active || !this.svg) return;

    // Update eye properties
    this.eye.x = x;
    this.eye.y = y;
    this.eye.width = width;
    this.eye.height = height;

    // Performance optimization: Batch DOM updates
    const svg = this.svg;
    const pupil = svg.select('#pupil');
    const iris = svg.select('.iris');
    const pupilClipRect = svg.select('#pupil-clip-rect');

    if (!pupil.empty()) {
      pupil.attr('x', x).attr('y', y).attr('width', width).attr('height', height);
    }
    if (!iris.empty()) {
      iris.attr('x', x).attr('y', y).attr('width', width).attr('height', height);
    }
    if (!pupilClipRect.empty()) {
      pupilClipRect.attr('x', x).attr('y', y).attr('width', width).attr('height', height);
    }
  }

  // Set minimap viewBox and mask geometry to match content bounds
  updateViewboxAndMasks(contentBBox) {
    if (!this.svg) return;
    // Update the minimap viewBox to content bounds to avoid whitespace
    this.svg.attr(
      'viewBox',
      `${contentBBox.x} ${contentBBox.y} ${contentBBox.width} ${contentBBox.height}`,
    );
    // Update mask and background sizes if the defs exist
    const bg = this.svg.select('rect.background');
    if (!bg.empty()) {
      bg.attr('x', contentBBox.x)
        .attr('y', contentBBox.y)
        .attr('width', contentBBox.width)
        .attr('height', contentBBox.height);
    }
    const eye = this.svg.select('rect.eye');
    if (!eye.empty()) {
      eye
        .attr('x', contentBBox.x)
        .attr('y', contentBBox.y)
        .attr('width', contentBBox.width)
        .attr('height', contentBBox.height);
    }
    const eyeball = this.svg.select('#eyeball');
    if (!eyeball.empty()) {
      eyeball
        .attr('x', contentBBox.x)
        .attr('y', contentBBox.y)
        .attr('width', contentBBox.width)
        .attr('height', contentBBox.height);
    }
  }

  updateVisibilityByZoom() {
    const mm = this.dashboard.data.settings.minimap;
    if (!mm) return;
    // Auto-hide in hover mode, or in always mode when unpinned
    const autoHideActive = mm.mode === 'hover' || (mm.mode === 'always' && !mm.pinned);
    if (!autoHideActive) return;
    if (mm.pinned) return; // keep visible when pinned
    const threshold = mm.hover?.zoomFitThreshold ?? 1.0;
    const isZoomedOutOrFit = (this.dashboard.main.transform.k || 1) <= threshold;
    // Only auto-collapse if user hasn't explicitly collapsed
    if (mm.collapsed) {
      // if the user is interacting or hovering, keep visible
      if (this.state?.interacting || this.state?.isHover) {
        this.setCollapsed(false);
      } else {
        this.setCollapsed(true);
      }
      return;
    }
    // When zoomed out, show icon-only; when zoomed in, show preview
    // But keep visible while interacting/hovering
    if (this.state?.interacting || this.state?.isHover) {
      this.setCollapsed(false);
    } else {
      this.setCollapsed(isZoomedOutOrFit);
    }
  }

  scheduleUpdate(transform) {
    // Debounced minimap updates to improve zoom performance
    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
    }

    this._updateTimeout = setTimeout(() => {
      requestAnimationFrame(() => {
        this.updateViewport(transform);
        this.updateScaleIndicator();
        // Avoid feeding transform into minimap zoom to reduce recursive zoom events
        this.updateVisibilityByZoom();
      });
    }, 16); // ~1 frame at 60fps
  }

  updateViewport(transform) {
    const x = (transform.x + this.dashboard.main.width / 2) / -transform.k;
    const y = (transform.y + this.dashboard.main.height / 2) / -transform.k;
    const width = this.dashboard.main.width / transform.k;
    const height = this.dashboard.main.height / transform.k;
    this.updateEye(x, y, width, height);
  }

  /**
   * Tear down the minimap UI and detach behaviors so it can be reinitialized cleanly
   */
  destroy() {
    try {
      if (this._updateTimeout) {
        clearTimeout(this._updateTimeout);
        this._updateTimeout = null;
      }
      if (this.state?.showTimer) {
        clearTimeout(this.state.showTimer);
        this.state.showTimer = null;
      }
      if (this.state?.hideTimer) {
        clearTimeout(this.state.hideTimer);
        this.state.hideTimer = null;
      }
      if (this.state?.wheelTimer) {
        clearTimeout(this.state.wheelTimer);
        this.state.wheelTimer = null;
      }

      // CRITICAL FIX: Clean up duplicate detection interval
      if (this._duplicateCheckInterval) {
        clearInterval(this._duplicateCheckInterval);
        this._duplicateCheckInterval = null;
      }
    } catch {}

    try {
      if (this.svg) {
        // Removing the cockpit removes the SVG and all event handlers bound to it
        this.svg = null;
      }
      if (this.cockpit) {
        this.cockpit.remove();
      }

      // CRITICAL FIX: Also remove any other zoom-cockpit elements that might exist
      if (this.overlayHost) {
        this.overlayHost.selectAll('.zoom-cockpit').remove();

        // If overlay host is empty, remove it too to prevent accumulation
        if (this.overlayHost.selectAll('*').empty()) {
          this.overlayHost.remove();
        }
      }
    } catch {}

    // Null out references
    this.cockpit = null;
    this.overlay = null;
    this.overlayHost = null;
    this.chromeSvg = null;
    this.content = null;
    this.collapsedIcon = null;
    this.header = null;
    this.collapseButton = null;
    this.pinButton = null;
    this.pinBase = null;
    this.pinSlash = null;
    this.sizeButton = null;
    this.sizeLabel = null;
    this.footer = null;
    this.scaleText = null;
    this.controls = null;
    this.btnZoomIn = null;
    this.btnZoomOut = null;
    this.btnReset = null;
    this.headerHitRect = null;
    this.footerHitRect = null;
    this.container = null;
    this.drag = null;
    this.zoom = null;
    this.active = false;

    // CRITICAL FIX: Reset initialization flag so minimap can be reinitialized
    this._isInitialized = false;
  }
}

function dragEye(dashboard, dragEvent) {
  // Calculate scaled movement for the eye rectangle
  const scaledDx = dragEvent.dx / dashboard.minimap.scale;
  const scaledDy = dragEvent.dy / dashboard.minimap.scale;

  // Calculate the new eye position based on the scaled movement
  const newEyeX = dashboard.minimap.eye.x + scaledDx;
  const newEyeY = dashboard.minimap.eye.y + scaledDy;

  // Update the eye's position
  dashboard.minimap.updateEye(
    newEyeX,
    newEyeY,
    dashboard.minimap.eye.width,
    dashboard.minimap.eye.height,
  );

  // Calculate the corresponding translation for the main view, maintaining the current scale
  dashboard.main.transform.x = -newEyeX * dashboard.main.transform.k - dashboard.main.width / 2;
  dashboard.main.transform.y = -newEyeY * dashboard.main.transform.k - dashboard.main.height / 2;

  // Apply the updated transformation to the main view
  const transform = d3.zoomIdentity
    .translate(dashboard.main.transform.x, dashboard.main.transform.y)
    .scale(dashboard.main.transform.k);
  dashboard.main.container.attr('transform', transform);

  // Store the current zoom level at svg level, for the next event
  dashboard.main.svg.call(dashboard.main.zoom.transform, transform);
}
