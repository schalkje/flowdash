import { createNode, createNodes } from './node.js';
import { getRegisteredNodeTypes } from './nodeRegistry.js';
import { getBoundingBoxRelativeToParent } from './utils.js';
import { createMarkers } from './markers.js';
import { createEdges, createInternalEdge } from './edge.js';
import { createNode as createNodeFromFactory } from './node.js';
import { ConfigManager } from './configManager.js';
import { fetchDashboardFile } from './data.js';
import { LoadingOverlay, resolveLoadingContainer as resolveLoadingHost } from './loadingOverlay.js';
import { Minimap } from './minimap.js';
import ZoomManager from './zoomManager.js';
import { NodeStatus } from './nodeBase.js';
import { computeFingerprint, validatePrerenderFreshness } from './prerenderValidator.js';

export class Dashboard {
  constructor(dashboardData) {
    this._isInitialized = false;
    this._data = null;
    Object.defineProperty(this, 'data', {
      get: () => this._data,
      set: (value) => {
        if (!this._isInitialized) {
          this._data = value || {};
          return;
        }
        this.setData(value);
      },
      configurable: true,
    });
    this.data = dashboardData;

    this.data.settings = ConfigManager.mergeWithDefaults(this.data.settings);

    // Pre-render state tracking
    this._suspendStatusChanges = false;

    // Performance tracking
    this.performanceMetrics = {
      phases: {
        dataLoad: 0,
        nodeCreation: 0,
        nodeInitialization: 0,
        edgeCreation: 0,
        layoutStabilization: 0,
        zoomSetup: 0,
        total: 0,
      },
      nodeStats: {
        totalNodes: 0,
        containerNodes: 0,
        leafNodes: 0,
        maxDepth: 0,
      },
      domStats: {
        appendOperations: 0,
        layoutRecalculations: 0,
        boundingBoxQueries: 0,
      },
      // Time from initialize() entry to (a) first SVG element in DOM, and
      // (b) the data-flowdash-ready signal. firstPaintMs ≈ time-to-paint;
      // interactiveMs ≈ time-to-interactive. Pre-render should narrow both,
      // particularly interactiveMs for layout-heavy fixtures.
      paintMetrics: {
        firstPaintMs: 0,
        interactiveMs: 0,
      },
      // performance.memory is Chromium-only and reports approximate heap
      // sizes. Non-Chromium browsers leave these at 0. Useful as a soft
      // signal for allocation pressure and leak detection.
      memoryStats: {
        heapBeforeInit: 0,
        heapAfterSettle: 0,
        heapDelta: 0,
      },
    };

    this.main = {
      svg: null,
      width: 0,
      height: 0,
      divRatio: 0,
      aspectRatio: 0,
      container: null,
      root: null,
      scale: 1,
      zoomSpeed: 0.2,
      transform: { k: 1, x: 0, y: 0 },
      pixelToSvgRatio: 1.0,
      fitK: 1.0,
      fitTransform: null,
    };
    this.minimap = new Minimap(this);
    this.selection = {
      nodes: [],
      edges: [],
      neighborhood: null, // { nodes, edges, boundingBox }
    };

    // Loading overlay instance (per-dashboard)
    this.loadingOverlay = null; // Initialized after main.svg is available

    // Additional click callback that gets called after normal selection
    this.onNodeClick = null;

    this.isMainAndMinimapSyncing = false;
    this._displayChangeScheduled = false;
    this.hasPerformedInitialZoomToRoot = false;
    this._displayChangeCount = 0;
    this._suspendDisplayChange = false;
    this.zoomManager = new ZoomManager(this);

    // Click delay timer to differentiate single click from double click
    this._clickDelayTimer = null;
    this._clickDelayMs = 250; // Delay before executing single click handler
  }

  /**
   * Debug-gated console.log. Routes diagnostic chatter through settings.isDebug.
   * Call sites should use this instead of console.log; keep console.warn/error
   * for genuine warnings.
   */
  _debugLog(...args) {
    if (this.data?.settings?.isDebug) console.log(...args);
  }

  // --- Pre-Render Methods ---

  /**
   * Check if dashboard has pre-render data available
   * @returns {boolean} True if pre-render data exists and is enabled
   */
  hasPrerenderData() {
    const settingsUsePrerender = this.data.settings?.usePrerender !== false;
    const hasNodePrerender = this.hasNodePrerenderData(this.data.nodes);
    if (!settingsUsePrerender || !hasNodePrerender) return false;

    // Prerender data is present and enabled — check freshness. If the
    // fingerprint embedded at generation time no longer matches the current
    // node/edge/settings inputs, the baked positions are stale and would
    // produce a wrong layout. Warn and fall back to cold load.
    const result = validatePrerenderFreshness(this.data);
    if (!result.ok) {
      // Once-per-load warning. Hard-fail behind a setting can be added later
      // (e.g. settings.prerenderStrict === true).
      console.warn(
        `flowdash: prerender data is stale and will not be used (fingerprint ${result.actual} vs expected ${result.expected}). Regenerate the prerender JSON to silence this warning.`,
      );
      return false;
    }
    return true;
  }

  /**
   * Recursively check if any node has pre-render data
   * @param {Array} nodes - Array of nodes to check
   * @returns {boolean} True if any node has prerender data
   */
  hasNodePrerenderData(nodes) {
    if (!Array.isArray(nodes)) return false;

    for (const node of nodes) {
      if (node.prerender) return true;
      if (node.children && this.hasNodePrerenderData(node.children)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Apply status rules after pre-render initial display
   * @param {Object} root - Root node
   */
  applyDeferredStatusRules(root) {
    this._debugLog('📊 Pre-render: Applying deferred status rules');

    // Re-enable status change handlers
    this._suspendStatusChanges = false;

    // Re-enable display change callbacks
    this._suspendDisplayChange = false;

    // Determine container statuses based on children
    if (this.data.settings.cascadeOnStatusChange) {
      this.initializeChildrenStatusses(root);
    }

    // Apply collapse rules if enabled
    if (this.data.settings.toggleCollapseOnStatusChange) {
      this.applyAutoCollapse(root);
    }

    // Final layout adjustments
    this.onMainDisplayChange();

    // CRITICAL: Clear all pre-render data after initial render completes
    // From this point on, dashboard behaves as if it never had pre-render data
    this.clearPrerenderData();

    this._debugLog('📊 Pre-render: Status rules applied');
  }

  /**
   * Apply auto-collapse based on status
   * @param {Object} node - Node to process
   */
  applyAutoCollapse(node) {
    if (!node.isContainer) return;

    // Check if this container should auto-collapse based on status
    // This is where status-based collapse logic goes
    // (Implementation depends on existing status rules)

    // Recursively process children
    if (node.childNodes) {
      node.childNodes.forEach((child) => this.applyAutoCollapse(child));
    }
  }

  /**
   * Clear all pre-render data after initial render completes
   * This ensures the dashboard behaves identically to a non-pre-rendered dashboard
   * for all subsequent operations (collapse, expand, status changes)
   */
  clearPrerenderData() {
    if (!this.main.root) return;

    this._debugLog('🧹 Clearing pre-render data after initial load');

    // Clear from all nodes recursively
    const clearNodeData = (node) => {
      if (node.data.prerender) {
        delete node.data.prerender;
      }
      node._hasPrerenderData = false;

      // Clear pre-render mode from zone manager and zones
      if (node.zoneManager) {
        node.zoneManager._prerenderMode = false;

        // Clear from individual zones
        if (node.zoneManager.zones) {
          node.zoneManager.zones.forEach((zone) => {
            zone._prerenderMode = false;
          });
        }
      }

      if (node.childNodes) {
        node.childNodes.forEach(clearNodeData);
      }
    };

    clearNodeData(this.main.root);

    // Clear from all edges
    if (this.data.edges) {
      this.data.edges.forEach((edge) => {
        if (edge.prerender) {
          delete edge.prerender;
        }
      });
    }

    this._debugLog('✅ Pre-render data cleared - dashboard now operates in standard mode');
  }

  // --- Performance Metrics Methods ---

  reportPerformanceMetrics() {
    console.group('🚀 Dashboard Performance Metrics');
    console.table(this.performanceMetrics.phases);
    console.group('Node Statistics');
    console.table(this.performanceMetrics.nodeStats);
    console.groupEnd();
    console.group('DOM Statistics');
    console.table(this.performanceMetrics.domStats);
    console.groupEnd();
    console.groupEnd();

    // Identify bottlenecks (phases taking > 20% of total time)
    const totalTime = this.performanceMetrics.phases.total;
    const bottlenecks = Object.entries(this.performanceMetrics.phases)
      .filter(([phase, time]) => phase !== 'total' && time / totalTime > 0.2)
      .map(([phase, time]) => ({
        phase,
        time,
        percentage: ((time / totalTime) * 100).toFixed(1) + '%',
      }));

    if (bottlenecks.length > 0) {
      console.warn('⚠️ Performance Bottlenecks (>20% of load time):', bottlenecks);
    }

    return this.performanceMetrics;
  }

  /**
   * Build a node lookup map for efficient edge creation (Optimization #4)
   * @param {Node} rootNode - The root node to traverse
   * @returns {Map<number, Node>} Map of node IDs to node objects
   */
  buildNodeMap(rootNode) {
    const map = new Map();

    const addNode = (node) => {
      map.set(node.id, node);
      if (node.childNodes && node.childNodes.length > 0) {
        node.childNodes.forEach(addNode);
      }
    };

    if (rootNode) {
      addNode(rootNode);
    }

    return map;
  }

  /**
   * Deferred minimap initialization (Optimization #6)
   * Initialize minimap after initial dashboard load completes
   */
  _deferredMinimapInit() {
    if (this._minimapInitialized) return;
    if (this._exceedsMinimapAutoInitThreshold()) {
      // Don't auto-init on large fixtures — let the consumer call
      // `dashboard.initMinimap()` explicitly (e.g. from a UI button or hover).
      this._minimapAutoInitSkipped = true;
      this._debugLog(
        `🗺️ Minimap auto-init skipped: ${this._approximateNodeCount()} nodes exceeds settings.minimap.autoInitMaxNodes=${this.data.settings?.minimap?.autoInitMaxNodes}`,
      );
      return;
    }
    this._initMinimap('deferred');
  }

  /**
   * Public minimap init. Always initializes regardless of node-count
   * threshold; intended for UI affordances ("Show minimap" button, hover-
   * triggered show). Idempotent: returns immediately if already initialized.
   *
   * @returns {boolean} true if the minimap is initialized after the call
   */
  initMinimap() {
    if (this._minimapInitialized) return true;
    return this._initMinimap('explicit');
  }

  /** @private */
  _initMinimap(source) {
    this._debugLog(`🗺️ Initializing minimap (${source})...`);
    const t0 = performance.now();
    try {
      this.minimap.safeInitialize();
      this._minimapInitialized = true;
      this._minimapAutoInitSkipped = false;
      this._debugLog(`✅ Minimap initialized in ${(performance.now() - t0).toFixed(2)}ms`);
      return true;
    } catch (e) {
      console.error('❌ Failed to initialize minimap:', e);
      return false;
    }
  }

  /** @private */
  _exceedsMinimapAutoInitThreshold() {
    const max = this.data.settings?.minimap?.autoInitMaxNodes;
    if (max === null || max === undefined || max === Infinity) return false;
    if (typeof max !== 'number' || max <= 0) return false;
    return this._approximateNodeCount() > max;
  }

  /** @private — uses already-collected stats if available, falls back to a one-shot walk */
  _approximateNodeCount() {
    const stat = this.performanceMetrics?.nodeStats?.totalNodes;
    if (stat && stat > 0) return stat;
    let n = 0;
    const visit = (node) => {
      if (!node) return;
      n += 1;
      if (Array.isArray(node.childNodes)) for (const c of node.childNodes) visit(c);
    };
    visit(this.main?.root);
    return n;
  }

  /**
   * Check if minimap is ready for operations (Optimization #6 helper)
   * @returns {boolean} True if minimap is initialized and ready
   */
  _isMinimapReady() {
    return this._minimapInitialized && this.minimap && this.minimap.active && this.minimap.svg;
  }

  collectNodeStatistics() {
    const countNodes = (node, depth = 0) => {
      this.performanceMetrics.nodeStats.totalNodes++;
      this.performanceMetrics.nodeStats.maxDepth = Math.max(
        this.performanceMetrics.nodeStats.maxDepth,
        depth,
      );

      if (node.childNodes && node.childNodes.length > 0) {
        this.performanceMetrics.nodeStats.containerNodes++;
        node.childNodes.forEach((child) => countNodes(child, depth + 1));
      } else {
        this.performanceMetrics.nodeStats.leafNodes++;
      }
    };

    if (this.main.root) {
      countNodes(this.main.root);
    }
  }

  // --- Selection bounding box helpers ---

  /**
   * Global cleanup method to remove any orphaned zoom-cockpit elements
   * This prevents the duplication issue that can occur after expand/collapse operations
   */
  cleanupOrphanedElements() {
    try {
      if (typeof document !== 'undefined') {
        // Remove any orphaned zoom-cockpit elements that might exist outside the current minimap instance
        const allCockpits = document.querySelectorAll('.zoom-cockpit');
        allCockpits.forEach((cockpit) => {
          // Only remove if it's not the current minimap's cockpit
          if (cockpit !== this.minimap?.cockpit?.node()) {
            console.warn('Removing orphaned zoom-cockpit element');
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
    } catch (e) {
      console.warn('Error during cleanup of orphaned elements:', e);
    }
  }

  renderSelectionBoundingBox(bbox) {
    try {
      // Respect settings: if disabled, just clear and return
      if (!this.data?.settings?.showBoundingBox) {
        this.clearSelectionBoundingBox();
        return;
      }
      this.main.container.selectAll('.boundingBox').remove();
      this.main.container
        .append('rect')
        .attr('class', 'boundingBox')
        .attr('x', bbox.x)
        .attr('y', bbox.y)
        .attr('width', bbox.width)
        .attr('height', bbox.height)
        .attr('fill', 'none')
        .attr('stroke', 'var(--fd-border, rgba(0,0,0,0.85))')
        .attr('stroke-width', 2)
        .attr('pointer-events', 'none');
    } catch {}
  }

  clearSelectionBoundingBox() {
    try {
      this.main.container.selectAll('.boundingBox').remove();
    } catch {}
  }

  // Compute a DOM-accurate bounding box for a single node and enforce a minimum
  // on-screen size to avoid extreme zooming. Returns a bbox in parent coordinates.
  computeSaneNodeBoundingBox(node) {
    // Start from DOM-based bbox for accuracy
    const bbox = computeBoundingBox(this, [node]);
    const k = this.main.transform.k || 1;
    const minPx = 80; // minimum visual size in pixels
    const minWorld = minPx / k;
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const w = Math.max(bbox.width, minWorld);
    const h = Math.max(bbox.height, minWorld);
    return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
  }

  getContentBBox() {
    try {
      if (this.main?.root) {
        const nodes = this.main.root.getAllNodes(false);
        if (nodes && nodes.length) {
          const bbox = computeContentBounds(this, nodes);
          if (
            bbox &&
            Number.isFinite(bbox.x) &&
            Number.isFinite(bbox.y) &&
            Number.isFinite(bbox.width) &&
            Number.isFinite(bbox.height)
          ) {
            return bbox;
          }
        }
      }
    } catch {}
    // Fallback: centered viewport
    return {
      x: -this.main.width / 2,
      y: -this.main.height / 2,
      width: this.main.width,
      height: this.main.height,
    };
  }

  recomputeBaselineFit() {
    return this.zoomManager.recomputeBaselineFit();
  }

  async setData(newDashboardData) {
    this._initialLoading = true;
    try {
      this.showLoading();
    } catch {}

    // Yield to allow the browser to paint the loading overlay
    await this._yieldToMain();

    await this._setDataContinue(newDashboardData);
  }

  async _setDataContinue(newDashboardData) {
    const userSettings =
      newDashboardData && newDashboardData.settings ? newDashboardData.settings : {};
    this._data = newDashboardData || {};
    this._data.settings = ConfigManager.mergeWithDefaults(userSettings);
    try {
      const fallbackRatio = this.main && this.main.divRatio ? this.main.divRatio : 16 / 9;
      if (!this._data.settings.divRatio || !(this._data.settings.divRatio > 0)) {
        this._data.settings.divRatio = fallbackRatio;
      }
    } catch {}

    if (this.main?.svg) {
      this.main.svg.selectAll('*').remove();
    }

    this.main.container = this.createContainer(this.main, 'dashboard');
    await this.createDashboard(this.data, this.main.container);
    this.main.root = this._dashboardRoot;

    this.main.root.onClick = (node, event) => this.selectNode(node, event);
    this.main.root.onDblClick = (node, event) => this.handleNodeDblClick(node, event);
    this.main.root.onDisplayChange = () => {
      this.onMainDisplayChange();
    };

    if (this.main.zoom) {
      this.main.svg.call(this.main.zoom);
    } else {
      this.main.zoom = this.initializeZoom();
    }

    // Add background double-click handler to zoom to root
    this.setupBackgroundDoubleClick();

    // OPTIMIZATION #6: Defer minimap initialization during setData
    // Clean up any orphaned elements first, but keep minimap working for data updates
    this.cleanupOrphanedElements();

    // For setData (data updates), we should reinitialize the minimap
    // but do it deferred to avoid blocking
    if (this.minimap) {
      try {
        // Mark as needing reinitialization
        this._minimapInitialized = false;
        // Defer minimap reinitialization slightly
        setTimeout(() => {
          if (!this._minimapInitialized) {
            this._deferredMinimapInit();
          }
        }, 50);
      } catch (e) {
        console.warn('Failed to schedule minimap reinit:', e);
      }
    }

    this.hasPerformedInitialZoomToRoot = false;
    // Defer baseline fit to onMainDisplayChange to ensure layout is settled
    this.onMainDisplayChange();

    // Re-publish the readiness signal so test specs and external integrations
    // can wait deterministically after data-driven re-init (initialize() is
    // not called by setData; before this, the old attribute lingered and made
    // the file-switch flow ambiguous).
    try {
      if (typeof document !== 'undefined' && this.mainDivSelector) {
        const root =
          typeof this.mainDivSelector === 'string'
            ? document.querySelector(this.mainDivSelector)
            : this.mainDivSelector;
        if (root && typeof root.setAttribute === 'function') {
          root.setAttribute('data-flowdash-ready', 'true');
        }
      }
    } catch {}
  }

  /**
   * Yield to main thread to allow browser to paint/update UI
   * Uses setTimeout with 0 delay to create a new task
   */
  _yieldToMain() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  /**
   * Initialize nodes with progress updates
   * Shows node count in the stage message
   */
  async _initializeNodesWithProgress(rootNode) {
    // Get total node count BEFORE calling init
    const allNodesData = this._collectNodeDataRecursive(this.data.nodes);
    const totalNodes = allNodesData.length;

    // Update stage message to include node count
    this.setLoadingStage(`Initializing ${totalNodes} nodes`);
    await this._yieldToMain();

    // Store dashboard reference for any internal tracking
    rootNode.__dashboard = this;

    // Call init - this runs synchronously
    rootNode.init();
  }

  /**
   * Recursively collect all node data to count total nodes
   */
  _collectNodeDataRecursive(nodes) {
    let result = [];
    if (!Array.isArray(nodes)) return result;

    for (const node of nodes) {
      result.push(node);
      if (node.children) {
        result = result.concat(this._collectNodeDataRecursive(node.children));
      }
    }
    return result;
  }

  async initialize(mainDivSelector) {
    const t0 = performance.now();
    this._initT0 = t0;
    if (typeof performance !== 'undefined' && performance.memory) {
      this.performanceMetrics.memoryStats.heapBeforeInit = performance.memory.usedJSHeapSize;
    }

    this.mainDivSelector = mainDivSelector;

    try {
      if (typeof window !== 'undefined' && window.showFlowDashLoading) {
        window.showFlowDashLoading();
      } else {
        this.showLoading();
      }
    } catch {}

    // Yield to allow the browser to paint the loading overlay
    await this._yieldToMain();

    await this._initializeContinue(mainDivSelector, t0);
  }

  async _initializeContinue(mainDivSelector, t0) {
    this.setLoadingStage('Initializing SVG');
    await this._yieldToMain();

    const div = this.initializeSvg(mainDivSelector);
    this.main.svg = div.svg;
    // SVG is now in the DOM; this is the earliest moment the user can see
    // anything dashboard-related. Capture as firstPaintMs.
    this.performanceMetrics.paintMetrics.firstPaintMs = performance.now() - t0;
    this.main.width = div.width;
    this.main.height = div.height;
    this.main.divRatio = this.main.width / this.main.height;
    this.main.aspectRatio = this.main.divRatio;
    this.main.pixelToSvgRatio = 1.0;
    this.data.settings.divRatio ??= this.main.divRatio;
    this.main.onDragUpdate = this.onDragUpdate;

    this._initialLoading = true;

    this.main.container = this.createContainer(this.main, 'dashboard');

    const tempDisplayChangeCallback = () => {
      this.onMainDisplayChange();
    };

    // Check for pre-render data
    const hasPrerenderData = this.hasPrerenderData();

    if (hasPrerenderData) {
      this._debugLog('📊 Pre-render data detected - using fast-path initialization');

      // Suspend display change callbacks during initial render
      this._suspendDisplayChange = true;

      // Suspend status change handlers
      this._suspendStatusChanges = true;
    }

    // Phase 1: Node Creation (includes node tree, initialization, edges)
    // Note: setLoadingStage is called inside createDashboard for each sub-phase
    const t1 = performance.now();
    await this.createDashboard(this.data, this.main.container, tempDisplayChangeCallback);
    this.main.root = this._dashboardRoot; // Store result from async createDashboard
    // nodeCreation, nodeInitialization, and edgeCreation are tracked inside createDashboard

    // If using pre-render, apply status rules in second pass
    if (hasPrerenderData && this.main.root) {
      this._debugLog('📊 Pre-render: Scheduling deferred status application');

      this.setLoadingStage('Applying status rules');
      await this._yieldToMain();

      // Schedule status application after initial render
      requestAnimationFrame(() => {
        this.applyDeferredStatusRules(this.main.root);
      });
    }

    this.setLoadingStage('Setting up zoom');
    await this._yieldToMain();

    // Phase 4: Zoom Setup
    const t4 = performance.now();
    this.main.zoom = this.initializeZoom();
    this.main.root.onClick = (node, event) => this.selectNode(node, event);
    this.main.root.onDblClick = (node, event) => this.handleNodeDblClick(node, event);

    // Set up display change callback on root (for collapse/expand zoom behavior)
    this.main.root.onDisplayChange = () => {
      this.onMainDisplayChange();
    };

    // Add background double-click handler to zoom to root
    this.setupBackgroundDoubleClick();

    // Trigger initial zoom to root (using same logic as double-click)
    // This is deferred to allow the DOM to fully render
    if (this.data?.settings?.zoomToRoot) {
      setTimeout(() => {
        this.onMainDisplayChange();
      }, 100);
    }

    // OPTIMIZATION #6: Defer minimap initialization to improve initial load time
    // Clean up any orphaned elements but DON'T initialize minimap yet
    this.cleanupOrphanedElements();
    // Mark minimap as pending initialization
    this._minimapInitialized = false;

    this.performanceMetrics.phases.zoomSetup = performance.now() - t4;

    this.setLoadingStage('Finalizing');
    await this._yieldToMain();

    // Defer initial zoom-to-root to onMainDisplayChange so it happens after layout settles

    this.initializeFullscreenToggle();

    if (typeof window !== 'undefined') {
      this._onWindowResize = () => {
        if (this.main.svg.classed('flowdash-fullscreen')) return;
        // Avoid early resizes during initial layout stabilization which can shift the view
        if ((this._displayChangeCount || 0) < 2) return;
        this.applyResizePreserveZoom();
      };
      window.addEventListener('resize', this._onWindowResize);
    }

    // Total time
    this.performanceMetrics.phases.total = performance.now() - t0;

    // Collect node statistics
    this.collectNodeStatistics();

    // Report metrics
    this.reportPerformanceMetrics();

    this._isInitialized = true;

    // Test-readiness signal — Playwright specs and external integrations should
    // wait for `[data-flowdash-ready="true"]` rather than relying on opaque
    // timeouts. Documented in /docs/testing-strategy.md.
    this.performanceMetrics.paintMetrics.interactiveMs = performance.now() - t0;
    if (typeof performance !== 'undefined' && performance.memory) {
      this.performanceMetrics.memoryStats.heapAfterSettle = performance.memory.usedJSHeapSize;
      this.performanceMetrics.memoryStats.heapDelta =
        this.performanceMetrics.memoryStats.heapAfterSettle -
        this.performanceMetrics.memoryStats.heapBeforeInit;
    }
    try {
      if (typeof document !== 'undefined' && this.mainDivSelector) {
        const root =
          typeof this.mainDivSelector === 'string'
            ? document.querySelector(this.mainDivSelector)
            : this.mainDivSelector;
        if (root && typeof root.setAttribute === 'function') {
          root.setAttribute('data-flowdash-ready', 'true');
        }
      }
    } catch {}

    // Ensure loading popup is hidden after initialization completes
    // This serves as a fallback if onMainDisplayChange doesn't trigger
    // Use setTimeout to ensure all synchronous operations complete first
    setTimeout(() => {
      if (this._initialLoading) {
        this._debugLog('📊 Dashboard.initialize() - Fallback hideLoading() called');
        this._initialLoading = false;
        this.hideLoading();
      }

      // OPTIMIZATION #6: Initialize minimap AFTER initial load completes
      // This prevents minimap initialization from blocking the main rendering
      if (!this._minimapInitialized) {
        this._deferredMinimapInit();
      }
    }, 0);
  }

  initializeEmbeddedMinimap() {
    const mm = this.data.settings.minimap;
    if (!mm || mm.enabled === false) {
      this.minimap.active = false;
      return;
    }

    const isSmallScreen = typeof window !== 'undefined' && (window.innerWidth || 0) < 600;
    let mode = this.data.settings.minimap.mode || (isSmallScreen ? 'disabled' : 'hover');
    if (mode === 'hidden') mode = 'disabled';
    this.data.settings.minimap.mode = mode;

    if (mode === 'disabled') {
      this.data.settings.minimap.enabled = false;
      return;
    }

    if (mm.persistence && mm.persistence.persistCollapsedState && typeof window !== 'undefined') {
      try {
        const persisted = window.localStorage.getItem(mm.persistence.storageKey);
        if (persisted !== null) {
          this.data.settings.minimap.collapsed = persisted === 'true';
        }
      } catch {}
    }
    if (mode === 'always') {
      this.data.settings.minimap.enabled = true;
      this.data.settings.minimap.collapsed = false;
      this.data.settings.minimap.pinned = true;
    }
    if (mode === 'hover' && typeof this.data.settings.minimap.collapsed === 'undefined') {
      this.data.settings.minimap.collapsed = true;
    }

    const graphContainer = this.main.svg.node().parentElement;
    try {
      graphContainer.style.position = graphContainer.style.position || 'relative';
      graphContainer.style.overflow = 'hidden';
    } catch {}
    const cockpitDiv = d3.select(graphContainer).append('div').attr('class', 'zoom-cockpit');
    this.minimap.cockpit = cockpitDiv;
    this.minimap.overlay = cockpitDiv;
    const cockpitSvg = cockpitDiv
      .append('svg')
      .attr('class', 'minimap-chrome')
      .style('position', 'absolute')
      .style('top', '0')
      .style('left', '0')
      .style('width', '100%')
      .style('height', '100%')
      .style('pointer-events', 'all');
    this.minimap.chromeSvg = cockpitSvg;
    this.minimap.content = cockpitSvg.append('g').attr('class', 'minimap-content');
    this.minimap.active = true;
    this.minimap.state = { showTimer: null, hideTimer: null, interacting: false, wheelTimer: null };

    this.minimap.collapsedIcon = this.minimap.content
      .append('g')
      .attr('class', 'minimap-collapsed-icon')
      .style('cursor', 'pointer')
      .style('pointer-events', 'all');
    this.minimap.collapsedIcon
      .append('rect')
      .attr('class', 'collapsed-icon-bg')
      .attr('width', 20)
      .attr('height', 14)
      .attr('rx', 2)
      .attr('ry', 2);
    this.minimap.collapsedIcon
      .append('rect')
      .attr('class', 'collapsed-icon-mini')
      .attr('x', 4)
      .attr('y', 3)
      .attr('width', 12)
      .attr('height', 8);
    this.minimap.collapsedIcon.on('click', () => {
      this.setMinimapCollapsed(false, true);
    });

    this.minimap.header = this.minimap.content.append('g').attr('class', 'minimap-header');
    this.minimap.headerHeight = 20;

    this.minimap.collapseButton = this.minimap.header
      .append('g')
      .attr('class', 'minimap-collapse-button')
      .style('cursor', 'pointer');
    this.minimap.collapseButton
      .append('rect')
      .attr('class', 'collapse-btn-bg')
      .attr('width', 16)
      .attr('height', 16)
      .attr('rx', 3)
      .attr('ry', 3);
    this.minimap.collapseButton
      .append('path')
      .attr('class', 'collapse-btn-icon')
      .attr('d', 'M2,6 L14,6 L8,12 Z');
    this.minimap.collapseButton.on('click', () => {
      this.setMinimapCollapsed(true, true);
    });

    this.minimap.pinButton = this.minimap.header
      .append('g')
      .attr('class', 'minimap-pin-button')
      .style('cursor', 'pointer')
      .attr('role', 'button')
      .attr('aria-label', 'Pin')
      .attr('aria-pressed', String(!!mm.pinned));
    this.minimap.sizeButton = this.minimap.header
      .append('g')
      .attr('class', 'minimap-size-button')
      .style('cursor', 'pointer');
    this.minimap.sizeButton
      .append('rect')
      .attr('class', 'btn-bg')
      .attr('width', 20)
      .attr('height', 16)
      .attr('rx', 3)
      .attr('ry', 3);
    this.minimap.sizeLabel = this.minimap.sizeButton
      .append('text')
      .attr('class', 'btn-label')
      .attr('x', 10)
      .attr('y', 10)
      .attr('text-anchor', 'middle')
      .style('dominant-baseline', 'middle')
      .style('font-size', '10px');
    const updateSizeLabel = () => {
      const token = this.data.settings.minimap.size;
      const label =
        typeof token === 'object' ? token.label || 'M' : String(token || 'm').toUpperCase();
      this.minimap.sizeLabel.text(label);
    };
    updateSizeLabel();
    this.minimap.sizeButton.on('click', () => {
      const order = (this.data.settings.minimap.sizeSwitcher &&
        this.data.settings.minimap.sizeSwitcher.order) || ['s', 'm', 'l'];
      const current = this.data.settings.minimap.size;
      const idx =
        order.indexOf(typeof current === 'object' ? current.token : current) >= 0
          ? order.indexOf(typeof current === 'object' ? current.token : current)
          : order.indexOf('m');
      const nextToken = order[(idx + 1) % order.length];
      this.data.settings.minimap.size = nextToken;
      this.resizeMinimap();
      this.minimap.position();
      updateSizeLabel();
      if (typeof this.data.settings.minimap.onSizeChange === 'function') {
        try {
          this.data.settings.minimap.onSizeChange({
            size: nextToken,
            width: this.minimap.targetWidthPx,
            height: this.minimap.targetHeightPx,
          });
        } catch {}
      }
    });
    this.minimap.pinButton.selectAll('*').remove();
    const iconGroup = this.minimap.pinButton.append('g').attr('class', 'pin-icon');
    const pinBasePath =
      'M8 2 C9.2 2 10 2.8 10 4 L10 6 L12.5 8 L9 8 L9 12 L7 12 L7 8 L3.5 8 L6 6 L6 4 C6 2.8 6.8 2 8 2 Z';
    const pinSlashPath = 'M3 13 L13 3';
    this.minimap.pinBase = iconGroup
      .append('path')
      .attr('class', 'pin-base')
      .attr('d', pinBasePath)
      .attr('fill', 'var(--fd-border, rgba(0,0,0,0.85))');
    this.minimap.pinSlash = iconGroup
      .append('path')
      .attr('class', 'pin-slash')
      .attr('d', pinSlashPath)
      .attr('stroke', 'var(--fd-border, rgba(0,0,0,0.85))')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .style('display', mm.pinned ? 'none' : 'block');
    iconGroup.attr('transform', mm.pinned ? 'rotate(0,8,8)' : 'rotate(-20,8,8)');
    this.minimap.pinButton.append('title').text('Pin (toggle pinned / hover)');
    this.minimap.pinButton.on('click', () => {
      mm.pinned = !mm.pinned;
      this.data.settings.minimap.mode = mm.pinned ? 'always' : 'hover';
      if (this.minimap.state.showTimer) {
        clearTimeout(this.minimap.state.showTimer);
        this.minimap.state.showTimer = null;
      }
      if (this.minimap.state.hideTimer) {
        clearTimeout(this.minimap.state.hideTimer);
        this.minimap.state.hideTimer = null;
      }
      this.minimap.state.interacting = false;
      this.updatePinVisualState();
      this.minimap.updateHoverBindings();
    });

    this.minimap.svg = this.minimap.content.append('svg').attr('class', 'minimap-svg');
    this.minimap.container = this.minimap.svg.append('g').attr('class', 'minimap');

    this.resizeMinimap();

    this.initializeMinimap();

    this.minimap.footer = this.minimap.content.append('g').attr('class', 'minimap-footer');
    this.minimap.footerHeight = 20;
    if (mm.scaleIndicator?.visible !== false) {
      this.minimap.scaleText = this.minimap.footer
        .append('text')
        .attr('class', 'minimap-scale')
        .attr('text-anchor', 'end');
    }

    const makeButton = (group, className, onClick) => {
      const g = group
        .append('g')
        .attr('class', `minimap-btn ${className}`)
        .style('cursor', 'pointer');
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
    this.minimap.controls = this.minimap.footer.append('g').attr('class', 'minimap-controls');
    this.minimap.btnZoomIn = makeButton(this.minimap.controls, 'zoom-in', () => this.zoomIn());
    this.minimap.btnZoomIn
      .append('rect')
      .attr('class', 'icon plus-h')
      .attr('x', 3)
      .attr('y', 7)
      .attr('width', 10)
      .attr('height', 2);
    this.minimap.btnZoomIn
      .append('rect')
      .attr('class', 'icon plus-v')
      .attr('x', 7)
      .attr('y', 3)
      .attr('width', 2)
      .attr('height', 10);

    this.minimap.btnZoomOut = makeButton(this.minimap.controls, 'zoom-out', () => this.zoomOut());
    this.minimap.btnZoomOut
      .append('rect')
      .attr('class', 'icon minus')
      .attr('x', 3)
      .attr('y', 7)
      .attr('width', 10)
      .attr('height', 2);

    this.minimap.btnReset = makeButton(this.minimap.controls, 'reset', () => this.zoomReset());
    this.minimap.btnReset
      .append('circle')
      .attr('class', 'icon target-outer')
      .attr('cx', 8)
      .attr('cy', 8)
      .attr('r', 5);
    this.minimap.btnReset
      .append('circle')
      .attr('class', 'icon target-inner')
      .attr('cx', 8)
      .attr('cy', 8)
      .attr('r', 1.5);

    this.minimap.headerHitRect = this.minimap.header
      .append('rect')
      .attr('class', 'minimap-header-hit')
      .attr('fill', 'transparent');
    this.minimap.footerHitRect = this.minimap.footer
      .append('rect')
      .attr('class', 'minimap-footer-hit')
      .attr('fill', 'transparent');
    if (this.minimap.headerHitRect) this.minimap.headerHitRect.lower();
    if (this.minimap.footerHitRect) this.minimap.footerHitRect.lower();

    if (this.minimap.header) this.minimap.header.raise();
    if (this.minimap.footer) this.minimap.footer.raise();

    this.positionEmbeddedMinimap();

    this.minimap.updateHoverBindings();

    this.minimap.setCollapsed(mm.collapsed === true);
    this.minimap.updateVisibilityByZoom();
    this.minimap.updatePinVisualState();
  }

  initializeFullscreenToggle() {
    const graphContainer = this.main.svg.node().parentElement;
    let host = graphContainer.querySelector('.fullscreen-overlay');
    if (!host) {
      host = document.createElement('div');
      host.className = 'fullscreen-overlay';
      host.style.position = 'absolute';
      host.style.right = '12px';
      host.style.top = '12px';
      host.style.pointerEvents = 'auto';
      graphContainer.appendChild(host);
    }
    let button = host.querySelector('.fullscreen-toggle');
    if (!button) {
      button = document.createElement('button');
      button.className = 'fullscreen-toggle';
      button.setAttribute('aria-label', 'Toggle fullscreen');
      button.title = 'Maximize / Restore';
      host.appendChild(button);
    }

    const updateIcon = () => {
      const isFullscreen = this.main.svg.classed('flowdash-fullscreen');
      button.textContent = isFullscreen ? '⤡' : '⤢';
    };

    const applySize = () => {
      const rect = this.main.svg.node().getBoundingClientRect();

      const prevWidth = this.main.width;
      const prevHeight = this.main.height;
      const prevK = this.main.transform.k;
      const prevX = this.main.transform.x;
      const prevY = this.main.transform.y;

      const worldLeft = (prevX + prevWidth / 2) / -prevK;
      const worldTop = (prevY + prevHeight / 2) / -prevK;
      const worldWidth = prevWidth / prevK;
      const worldHeight = prevHeight / prevK;
      const worldCenterX = worldLeft + worldWidth / 2;
      const worldCenterY = worldTop + worldHeight / 2;

      const newWidth = rect.width;
      const newHeight = rect.height;
      this.main.width = newWidth;
      this.main.height = newHeight;
      this.main.divRatio = newWidth / newHeight;
      this.main.svg.attr('viewBox', [-newWidth / 2, -newHeight / 2, newWidth, newHeight]);

      const newK = prevK;
      const newWorldWidth = newWidth / newK;
      const newWorldHeight = newHeight / newK;
      const newLeft = worldCenterX - newWorldWidth / 2;
      const newTop = worldCenterY - newWorldHeight / 2;
      const newTransform = d3.zoomIdentity
        .translate(-newLeft * newK - newWidth / 2, -newTop * newK - newHeight / 2)
        .scale(newK);

      if (this._isMinimapReady()) {
        this.minimap.resize();
      }

      this.main.transform = { k: newK, x: newTransform.x, y: newTransform.y };
      this.main.container.attr('transform', newTransform);
      this.main.svg.call(this.main.zoom.transform, newTransform);

      this.recomputeBaselineFit();

      if (this._isMinimapReady()) {
        this.minimap.update();
        this.minimap.updateViewport(newTransform);
        this.minimap.position();
      }
    };

    const onResize = () => {
      if (!this.main.svg.classed('flowdash-fullscreen')) return;
      applySize();
    };

    const toggle = () => {
      const isFullscreen = this.main.svg.classed('flowdash-fullscreen');
      if (!isFullscreen) {
        this.main.svg.classed('flowdash-fullscreen', true).classed('fullscreen', true);
        window.addEventListener('resize', onResize);
        applySize();
        button.classList.add('fullscreen-active');
      } else {
        this.main.svg.classed('flowdash-fullscreen', false).classed('fullscreen', false);
        window.removeEventListener('resize', onResize);
        const rect = this.main.svg.node().getBoundingClientRect();
        this.main.width = rect.width;
        this.main.height = rect.height;
        this.main.divRatio = this.main.width / this.main.height;
        this.main.svg.attr('viewBox', [
          -this.main.width / 2,
          -this.main.height / 2,
          this.main.width,
          this.main.height,
        ]);
        if (this._isMinimapReady()) {
          this.minimap.svg.attr('viewBox', [
            -this.main.width / 2,
            -this.main.height / 2,
            this.main.width,
            this.main.height,
          ]);
          this.minimap.update();
          const transform = d3.zoomIdentity
            .translate(this.main.transform.x, this.main.transform.y)
            .scale(this.main.transform.k);
          this.minimap.updateViewport(transform);
          this.minimap.position();
        }
        button.classList.remove('fullscreen-active');
      }
      updateIcon();
    };

    button.onclick = toggle;
    updateIcon();
  }

  applyResizePreserveZoom() {
    const rect = this.main.svg.node().getBoundingClientRect();

    const prevWidth = this.main.width || 1;
    const prevHeight = this.main.height || 1;
    const prevK = this.main.transform.k;
    const prevX = this.main.transform.x;
    const prevY = this.main.transform.y;

    // Preserve world center instead of scaling translate by size ratios
    // Derive current world-space center from previous transform and container size
    const worldLeft = (prevX + prevWidth / 2) / -prevK;
    const worldTop = (prevY + prevHeight / 2) / -prevK;
    const worldWidth = prevWidth / prevK;
    const worldHeight = prevHeight / prevK;
    const worldCenterX = worldLeft + worldWidth / 2;
    const worldCenterY = worldTop + worldHeight / 2;

    const newWidth = rect.width || prevWidth;
    const newHeight = rect.height || prevHeight;

    this.main.width = newWidth;
    this.main.height = newHeight;
    this.main.divRatio = newWidth / newHeight;
    this.main.aspectRatio = this.main.divRatio;
    this.main.svg.attr('viewBox', [-newWidth / 2, -newHeight / 2, newWidth, newHeight]);

    const newK = prevK;
    const newWorldWidth = newWidth / newK;
    const newWorldHeight = newHeight / newK;
    const newLeft = worldCenterX - newWorldWidth / 2;
    const newTop = worldCenterY - newWorldHeight / 2;
    const newTransform = d3.zoomIdentity
      .translate(-newLeft * newK - newWidth / 2, -newTop * newK - newHeight / 2)
      .scale(newK);

    if (this._isMinimapReady()) this.minimap.resize();

    this.main.transform = { k: newK, x: newTransform.x, y: newTransform.y };
    this.main.container.attr('transform', newTransform);
    this.main.svg.call(this.main.zoom.transform, newTransform);

    this.recomputeBaselineFit();

    if (this._isMinimapReady()) {
      this.minimap.update();
      this.minimap.updateViewport(newTransform);
      this.minimap.position();
      this.minimap.updateScaleIndicator?.();
    }
  }

  updateNodeStatus(nodeId, status) {
    const node = this.main.root.getNode(nodeId);
    if (node) {
      try {
        node.status = status;
      } catch (e) {
        console.warn('updateNodeStatus: Failed to update status for node:', nodeId, e);
      }
    } else {
      console.error('updateNodeStatus: Node not found:', nodeId);
    }
  }

  updateDatasetStatus(datasetId, status) {
    let stateUpdated = false;
    const nodes = this.main.root.getNodesByDatasetId(datasetId);
    if (nodes && nodes.length > 0) {
      for (const node of nodes) {
        try {
          node.status = status;
          stateUpdated = true;
        } catch (e) {
          console.warn('updateDatasetStatus: Failed to update status for node:', node.id, e);
        }
      }
    }
    return stateUpdated;
  }

  /**
   * Apply many status updates in one cascade.
   *
   * Equivalent to calling `updateNodeStatus(id, status)` in a loop, but wrapped
   * in `batch()` so the display-change cascade fires once at the end instead of
   * once per write. For consumer apps loading "current state" from a backend
   * after `initialize()`, this is the difference between O(N×tree) and
   * O(N + tree).
   *
   * Unknown ids and setter exceptions are reported via console.warn but do not
   * stop the rest of the batch — same forgiving semantics as
   * `updateDatasetStatus`.
   *
   * @param {Array<{id: string|number, status: string}>} updates
   * @returns {Promise<{applied: number, missing: Array<string|number>}>}
   */
  async updateNodeStatuses(updates) {
    if (!Array.isArray(updates) || updates.length === 0) {
      return { applied: 0, missing: [] };
    }
    const missing = [];
    let applied = 0;
    await this.batch(() => {
      for (const update of updates) {
        if (!update || update.id === undefined) continue;
        const node = this.main.root.getNode(update.id);
        if (!node) {
          missing.push(update.id);
          continue;
        }
        try {
          node.status = update.status;
          applied += 1;
        } catch (e) {
          console.warn('updateNodeStatuses: failed to set status on node', update.id, e);
        }
      }
    });
    if (missing.length > 0) {
      console.warn(
        `updateNodeStatuses: ${missing.length} of ${updates.length} ids not found in tree`,
        missing.length <= 10 ? missing : missing.slice(0, 10).concat('…'),
      );
    }
    return { applied, missing };
  }

  // ------------------------------------------------------------------
  // Public mutation API — Workstream D / dynamic structuring foundation
  //
  // Consumer dashboard apps wrap streaming diffs with these primitives:
  //   await dashboard.batch(() => {
  //     dashboard.addNode(parentId, { id, label, type: 'Adapter' });
  //     dashboard.addEdge({ source: a, target: b });
  //     dashboard.removeNode(staleId);
  //   });
  //
  // Strict-by-default: duplicate IDs throw, missing parents/targets throw.
  // The library does not implement streaming itself — these are primitives
  // for consumers to compose. See docs/dynamic-structuring.md.
  // ------------------------------------------------------------------

  /**
   * Look up a node by id with a clear error if not found.
   * @private
   */
  _requireNode(nodeId, ctx) {
    if (!this.main?.root) {
      throw new Error(`flowdash.${ctx}: dashboard not initialized`);
    }
    const node = this.main.root.getNode(nodeId);
    if (!node) throw new Error(`flowdash.${ctx}: node not found: ${nodeId}`);
    return node;
  }

  /**
   * Throw if a node with this id already exists. Uses the existing
   * buildNodeMap walk; cheap enough at current scale (<2k nodes).
   * @private
   */
  _assertIdAvailable(nodeId, ctx) {
    if (nodeId === undefined || nodeId === null) {
      throw new Error(`flowdash.${ctx}: nodeData.id is required`);
    }
    if (this.main.root.getNode(nodeId)) {
      throw new Error(`flowdash.${ctx}: duplicate node id: ${nodeId}`);
    }
  }

  /**
   * Add a node as a child of the parent with id `parentId`.
   *
   * @param {string|number} parentId - id of an existing container node
   * @param {object} nodeData - node descriptor (id, label, type, …)
   * @returns {Promise<Node>} the created node, after the cascade settles
   */
  async addNode(parentId, nodeData) {
    const parent = this._requireNode(parentId, 'addNode');
    if (!parent.isContainer) {
      throw new Error(`flowdash.addNode: parent ${parentId} is not a container`);
    }
    this._assertIdAvailable(nodeData?.id, 'addNode');

    const innerZone =
      parent.zoneManager?.innerContainerZone ||
      parent.zoneManager?.ensureInnerContainerZone?.() ||
      null;
    const childContainer = innerZone?.getChildContainer?.() || parent.element;
    if (!childContainer) {
      throw new Error(`flowdash.addNode: parent ${parentId} has no child container`);
    }

    const node = createNodeFromFactory(nodeData, childContainer, this.data.settings, parent);
    if (!node) {
      throw new Error(`flowdash.addNode: factory rejected nodeData for type "${nodeData.type}"`);
    }
    node.__dashboard = this;
    node.parentNode = parent;
    parent.childNodes = parent.childNodes || [];
    parent.childNodes.push(node);
    if (innerZone?.addChild) innerZone.addChild(node);

    node.init();
    this._scheduleAfterMutation(parent);
    await this._settle();
    return node;
  }

  /**
   * Remove the node with the given id and all of its descendants. Detaches
   * any incident edges (incoming and outgoing) on every removed node.
   *
   * @param {string|number} nodeId
   * @returns {Promise<void>}
   */
  async removeNode(nodeId) {
    const node = this._requireNode(nodeId, 'removeNode');
    if (!node.parentNode) {
      throw new Error(`flowdash.removeNode: cannot remove the root node`);
    }
    const parent = node.parentNode;

    // Detach all edges incident to this subtree.
    const subtree = node.getAllNodes(false, false);
    for (const n of subtree) {
      const incoming = (n.edges?.incoming || []).slice();
      for (const e of incoming) this._detachEdge(e);
      const outgoing = (n.edges?.outgoing || []).slice();
      for (const e of outgoing) this._detachEdge(e);
    }

    // Remove from parent's childNodes and zone.
    if (Array.isArray(parent.childNodes)) {
      const idx = parent.childNodes.indexOf(node);
      if (idx >= 0) parent.childNodes.splice(idx, 1);
    }
    parent.zoneManager?.innerContainerZone?.removeChild?.(node);

    // Remove DOM.
    try {
      node.element?.remove?.();
    } catch {}

    this._scheduleAfterMutation(parent);
    await this._settle();
  }

  /**
   * Add an edge between two existing nodes.
   *
   * @param {{source: string|number, target: string|number, [key: string]: any}} edgeData
   * @returns {Promise<object>} the created edge
   */
  async addEdge(edgeData) {
    if (!edgeData || edgeData.source === undefined || edgeData.target === undefined) {
      throw new Error('flowdash.addEdge: edgeData.source and edgeData.target are required');
    }
    const source = this._requireNode(edgeData.source, 'addEdge');
    const target = this._requireNode(edgeData.target, 'addEdge');
    const edge = createInternalEdge(edgeData, source, target, this.data.settings);
    if (!edge) {
      throw new Error(
        `flowdash.addEdge: edge could not be created (duplicate or no common parent)`,
      );
    }
    // Render and attach the new edge. initEdges is idempotent on already-
    // initialised edges so calling it on the common-parent container is safe.
    edge.parent?.initEdges?.(false);
    this._scheduleAfterMutation(source.parentNode || target.parentNode || this.main.root);
    await this._settle();
    return edge;
  }

  /**
   * Remove the edge identified either by its `id` field or by an exact
   * (source, target) pair.
   *
   * @param {string|number|{source: any, target: any}} idOrPair
   * @returns {Promise<void>}
   */
  async removeEdge(idOrPair) {
    const edge = this._findEdge(idOrPair);
    if (!edge) throw new Error(`flowdash.removeEdge: edge not found: ${JSON.stringify(idOrPair)}`);
    this._detachEdge(edge);
    this._scheduleAfterMutation(edge.parent || this.main.root);
    await this._settle();
  }

  /**
   * Coalesce a sequence of mutations into one cascade. Cascades scheduled
   * via _scheduleAfterMutation are deferred until `fn` completes; one final
   * onMainDisplayChange fires for the whole batch. Re-entrant: nested
   * batches join the outer one.
   *
   * @param {() => any | Promise<any>} fn
   */
  async batch(fn) {
    if (this._inBatch) {
      // Already inside a batch — just run the body. The outer call flushes.
      return await fn();
    }
    this._inBatch = true;
    this._batchPendingRoots = new Set();
    this._suspendDisplayChange = true;
    try {
      await fn();
    } finally {
      this._inBatch = false;
      this._suspendDisplayChange = false;
      const pending = this._batchPendingRoots;
      this._batchPendingRoots = null;
      // Single cascade for the whole batch.
      for (const root of pending) {
        try {
          root.handleDisplayChange?.();
        } catch {}
      }
      this.onMainDisplayChange();
      await this._settle();
    }
  }

  /**
   * Schedule a post-mutation cascade. When inside a batch the cascade is
   * deferred; otherwise it fires immediately at the next yield.
   * @private
   */
  _scheduleAfterMutation(node) {
    if (this._inBatch) {
      this._batchPendingRoots.add(node);
      return;
    }
    try {
      node.handleDisplayChange?.();
    } catch {}
  }

  /**
   * Wait one animation frame so the caller can rely on the next paint
   * reflecting the mutation. Resolves immediately in non-DOM environments.
   * @private
   */
  _settle() {
    return new Promise((resolve) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Find an edge by id or by an exact (source, target) id pair.
   * @private
   */
  _findEdge(idOrPair) {
    const isPair =
      idOrPair && typeof idOrPair === 'object' && 'source' in idOrPair && 'target' in idOrPair;
    const search = (container) => {
      const list = container.childEdges || [];
      for (const e of list) {
        if (isPair) {
          const s = e.source?.id;
          const t = e.target?.id;
          if (s === idOrPair.source && t === idOrPair.target) return e;
        } else if (e.id !== undefined && e.id === idOrPair) {
          return e;
        }
      }
      const children = container.childNodes || [];
      for (const c of children) {
        if (c.isContainer) {
          const found = search(c);
          if (found) return found;
        }
      }
      return null;
    };
    return search(this.main.root);
  }

  /**
   * Remove an edge from its source/target and parent, and remove its DOM.
   * @private
   */
  _detachEdge(edge) {
    if (!edge) return;
    const sourceList = edge.source?.edges?.outgoing;
    if (sourceList) {
      const i = sourceList.indexOf(edge);
      if (i >= 0) sourceList.splice(i, 1);
    }
    const targetList = edge.target?.edges?.incoming;
    if (targetList) {
      const i = targetList.indexOf(edge);
      if (i >= 0) targetList.splice(i, 1);
    }
    const parentList = edge.parent?.childEdges;
    if (parentList) {
      const i = parentList.indexOf(edge);
      if (i >= 0) parentList.splice(i, 1);
    }
    try {
      edge.element?.remove?.();
    } catch {}
  }

  createContainer(parentContainer, className) {
    parentContainer.svg.selectAll('*').remove();

    const container = parentContainer.svg.append('g').attr('class', `${className}`);

    return container;
  }

  initializeSvg(divSelector) {
    const svg = d3.select(`${divSelector}`);
    svg.selectAll('*').remove();

    const { width, height } = svg.node().getBoundingClientRect();

    svg.attr('viewBox', [-width / 2, -height / 2, width, height]);

    const onDragUpdate = null;

    return { svg, width, height, onDragUpdate };
  }

  async createDashboard(dashboard, container, displayChangeCallback = null) {
    this.setLoadingStage('Creating nodes');
    await this._yieldToMain();

    createMarkers(container);

    let root;
    if (dashboard.nodes.length == 1) {
      root = createNode(dashboard.nodes[0], container, dashboard.settings);

      if (root) {
        root.move(0, 0);
      }
    } else {
      root = createNodes(dashboard.nodes, container, dashboard.settings);

      if (root && root.isContainer) {
        root.move(0, 0);
      }
    }

    if (!root) {
      console.error('Failed to create node - root is null');
      this._dashboardRoot = null;
      return;
    }

    // Store the root immediately so reparentNodesByParentIds() can access it
    this._dashboardRoot = root;

    if (displayChangeCallback) {
      root.onDisplayChange = () => {
        if (this._suspendDisplayChange) return;
        displayChangeCallback();
      };
    }

    // Phase 2: Node Initialization
    const t2 = performance.now();

    this.setLoadingStage('Initializing nodes');
    await this._yieldToMain();

    // OPTIMIZATION #7: Batch DOM operations to minimize forced reflows
    // Instead of measure-write-measure-write, we do: write-write-write, measure-once, write-write-write
    this._batchDomOperations = true;
    this._deferredOperations = {
      measurements: [],
      updates: [],
    };

    // Suspend display-change reactions during bulk initialization to avoid
    // mid-cascade zoom/fit recalculations that cause drift
    this._suspendDisplayChange = true;
    // Store dashboard reference on root so handleDisplayChange() can access suspension flag
    root.__dashboard = this;

    // Initialize all nodes (DOM creation) with progress updates
    const t2a = performance.now();
    await this._initializeNodesWithProgress(root);

    this.setLoadingStage('Processing measurements');
    await this._yieldToMain();

    // Perform all deferred measurements in a single batch (Optimization #7)
    const measurementCount = this._deferredOperations.measurements.length;
    this._deferredOperations.measurements.forEach((fn) => fn());
    this._deferredOperations.measurements = [];

    // Apply any updates that depend on measurements
    const updateCount = this._deferredOperations.updates.length;
    this._deferredOperations.updates.forEach((fn) => fn());
    this._deferredOperations.updates = [];
    this._batchDomOperations = false;
    this.performanceMetrics.phases.nodeInitialization = performance.now() - t2;

    // Phase 3: Edge Creation & Status Initialization
    const t3 = performance.now();

    const edgeCount = dashboard.edges?.length || 0;
    this.setLoadingStage(`Creating ${edgeCount} edge${edgeCount !== 1 ? 's' : ''}`);
    await this._yieldToMain();

    this.initializeChildrenStatusses(root);

    if (dashboard.edges.length > 0) {
      // Build node lookup map ONCE for edge creation (Optimization #4)
      const nodeMap = this.buildNodeMap(root);
      createEdges(root, dashboard.edges, dashboard.settings, nodeMap);
    }

    // After initial construction, fix up hierarchy for nodes with explicit parentId(s)
    try {
      this._debugLog('🔄 About to call reparentNodesByParentIds');
      this.reparentNodesByParentIds();
      this._debugLog('🔄 reparentNodesByParentIds completed');
    } catch (e) {
      console.error('🔄 reparentNodesByParentIds failed:', e);
    }

    // Lift suspension after all initialization, edge creation, and reparenting is complete
    this._suspendDisplayChange = false;

    this.performanceMetrics.phases.edgeCreation = performance.now() - t3;

    if (this.data.settings.isDebug) {
      container
        .append('circle')
        .attr('class', 'debug-center')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 5)
        .attr('fill', 'red')
        .attr('stroke', 'darkred')
        .attr('stroke-width', 2);
    }

    // Defer initial baseline fit and zoom until layout has fully settled
    // This will be handled by onMainDisplayChange via ZoomManager.handleLayoutChange

    this._dashboardRoot = root;
  }

  reparentNodesByParentIds() {
    this._debugLog('🔄 reparentNodesByParentIds: STARTING');
    const root = this._dashboardRoot || this.main?.root;
    if (!root) {
      this._debugLog('🔄 reparentNodesByParentIds: No root found, returning');
      return;
    }
    const all = root.getAllNodes(false, false);
    this._debugLog(`🔄 reparentNodesByParentIds: Found ${all.length} nodes`);
    const idMap = new Map(all.map((n) => [n.id, n]));
    const ensureChildAttached = (parent, child) => {
      try {
        this._debugLog(
          `reparentNodesByParentIds: Processing child ${child.id}, current parent: ${child.parentNode?.id}, target parent: ${parent.id}`,
        );
        // Adjust logical tree
        if (child.parentNode && child.parentNode !== parent) {
          const prev = child.parentNode;
          const idx = prev.childNodes ? prev.childNodes.indexOf(child) : -1;
          this._debugLog(
            `reparentNodesByParentIds: Removing child ${child.id} from prev parent ${prev.id}, index: ${idx}`,
          );
          if (idx >= 0) prev.childNodes.splice(idx, 1);
          // Remove from previous zone listing
          try {
            prev.zoneManager?.innerContainerZone?.removeChild?.(child);
          } catch {}
        }
        child.parentNode = parent;
        parent.childNodes = parent.childNodes || [];
        if (parent.childNodes.indexOf(child) === -1) {
          this._debugLog(
            `reparentNodesByParentIds: Adding child ${child.id} to new parent ${parent.id}`,
          );
          parent.childNodes.push(child);
        } else {
          this._debugLog(
            `reparentNodesByParentIds: Child ${child.id} already in parent ${parent.id} childNodes`,
          );
        }
        // Register with zone system and move DOM
        const innerZone =
          parent.zoneManager?.innerContainerZone ||
          (parent.zoneManager?.ensureInnerContainerZone
            ? parent.zoneManager.ensureInnerContainerZone()
            : null);
        if (innerZone) {
          innerZone.addChild(child);
          const target = innerZone.getChildContainer?.();
          const el = child.element?.node?.();
          const tgt = target?.node?.();
          if (el && tgt && el.parentNode !== tgt) tgt.appendChild(el);
          // Update layout for new parent
          try {
            parent.updateChildren?.();
          } catch {}
          try {
            parent.zoneManager?.update?.();
          } catch {}
          try {
            innerZone.updateChildPositions();
          } catch {}
        } else if (parent.element && child.element) {
          const tgt = parent.element.node();
          const el = child.element.node();
          if (tgt && el && el.parentNode !== tgt) tgt.appendChild(el);
        }
      } catch {}
    };
    for (const node of all) {
      const pids = Array.isArray(node?.data?.parentIds)
        ? node.data.parentIds
        : node?.data?.parentId
          ? [node.data.parentId]
          : [];
      if (!pids.length) continue;
      // Prefer first existing container parent
      const target = pids.map((id) => idMap.get(id)).find((n) => n && n.isContainer);
      if (target && node.parentNode !== target) {
        ensureChildAttached(target, node);
      }
    }
    // Update top-level after reparenting
    root.update();
  }

  initializeChildrenStatusses(node) {
    const allNodes = node.getAllNodes();

    for (let i = allNodes.length - 1; i >= 0; i--) {
      const currentNode = allNodes[i];
      // Safety check: only process nodes with valid elements
      if (!currentNode.element) {
        if (this.data.settings?.isDebug) {
          console.warn(
            'initializeChildrenStatusses: Node has null element, skipping:',
            currentNode.id,
          );
        }
        continue;
      }

      if (
        currentNode.isContainer &&
        (currentNode.status == null || currentNode.status == '' || currentNode.status == 'Unknown')
      ) {
        try {
          currentNode.determineStatusBasedOnChildren();
        } catch (e) {
          console.warn(
            'initializeChildrenStatusses: Failed to determine status for node:',
            currentNode.id,
            e,
          );
        }
      }
    }
  }

  initializeZoom() {
    const dag = null;

    const dashboard = this;
    const zoom = this.zoomManager.initializeZoomBehavior();

    this.main.svg.call(zoom);

    d3.select('#zoom-in').on('click', () => this.zoomIn(dashboard));

    d3.select('#zoom-out').on('click', () => this.zoomOut(dashboard));

    d3.select('#zoom-reset').on('click', () => this.zoomReset(dashboard));

    d3.select('#zoom-random').on('click', () => this.zoomRandom(dashboard));

    d3.select('#zoom-node').on('click', () => this.zoomToRoot(dashboard));

    return zoom;
  }

  setupBackgroundDoubleClick() {
    // Add double-click handler to the SVG element using native DOM addEventListener
    // to ensure it captures all double-click events
    const svgElement = this.main.svg.node();
    this._debugLog('[setupBackgroundDoubleClick] Setting up handler on:', svgElement);

    svgElement.addEventListener('dblclick', (event) => {
      this._debugLog('[Background dblclick] event fired, target:', event.target);

      // Check if the actual target is a node or inside a node
      let target = event.target;
      let foundNode = null;

      // Walk up the DOM tree looking for an element with __node
      while (target && target !== svgElement) {
        if (target.__node) {
          foundNode = target.__node;
          this._debugLog('[Background dblclick] Found node:', foundNode.id);
          break;
        }
        target = target.parentNode;
      }

      // If we found a node, don't handle it here - the node's handler already dealt with it
      if (foundNode) {
        this._debugLog('[Background dblclick] Ignoring - node handler will process it');
        return;
      }

      // No node found - clicked on background (empty space)
      this._debugLog('[Background dblclick] Background clicked - zooming to root');

      if (this.main.root) {
        this.handleNodeDblClick(this.main.root, event);
      } else {
        // Fallback: just zoom to root if no root node
        this.zoomToRoot();
      }
    });

    this._debugLog('[setupBackgroundDoubleClick] Handler installed');
  }

  onDragUpdate() {}

  onMainDisplayChange() {
    // Check suspension before scheduling
    if (this._suspendDisplayChange) return;
    if (this._displayChangeScheduled) return;
    this._displayChangeScheduled = true;

    requestAnimationFrame(() => {
      // Double-check suspension inside RAF callback
      if (this._suspendDisplayChange) {
        this._displayChangeScheduled = false;
        return;
      }

      const isInitialStabilization = this._displayChangeCount === 0;
      const tLayout = isInitialStabilization ? performance.now() : null;

      this._displayChangeCount = (this._displayChangeCount || 0) + 1;
      try {
        this.zoomManager.handleLayoutChange();
      } catch {}

      if (isInitialStabilization && tLayout) {
        this.performanceMetrics.phases.layoutStabilization = performance.now() - tLayout;
      }
      // Ensure DOM hierarchy is consistent with logical parent/child relationships
      try {
        this.enforceDomHierarchy();
      } catch {}

      // OPTIMIZATION #6: Only update minimap if it's initialized and ready
      if (this._isMinimapReady()) {
        try {
          this.minimap.update();
          const transform = d3.zoomIdentity
            .translate(this.main.transform.x, this.main.transform.y)
            .scale(this.main.transform.k);
          this.minimap.updateViewport(transform);
          this.minimap.updateScaleIndicator?.();
          this.minimap.position();
        } catch {}
      }

      // Recompute selection bounding box after layout changes (e.g., collapse/expand)
      try {
        if (this.data?.settings?.showBoundingBox) {
          const nb = this.selection?.neighborhood;
          let nodesToBox = null;
          if (nb && Array.isArray(nb.nodes) && nb.nodes.length > 0) {
            nodesToBox = nb.nodes;
          } else if (typeof this.getSelectedNodes === 'function') {
            const sel = this.getSelectedNodes();
            if (sel && sel.length) nodesToBox = sel;
          }
          if (nodesToBox && nodesToBox.length) {
            const bbox = computeBoundingBox(this, nodesToBox);
            if (
              Number.isFinite(bbox.x) &&
              Number.isFinite(bbox.y) &&
              Number.isFinite(bbox.width) &&
              Number.isFinite(bbox.height)
            ) {
              this.renderSelectionBoundingBox(bbox);
              if (nb) nb.boundingBox = bbox;
            } else {
              this.clearSelectionBoundingBox?.();
            }
          } else {
            this.clearSelectionBoundingBox?.();
          }
        } else {
          this.clearSelectionBoundingBox?.();
        }
      } catch {}

      if (this._initialLoading) {
        this._initialLoading = false;
        this.hideLoading();
      }

      this._displayChangeScheduled = false;
    });
  }

  enforceDomHierarchy() {
    try {
      if (!this.main?.root) return;
      const allNodes = this.main.root.getAllNodes(false, false);
      allNodes.forEach((node) => {
        if (!node?.element) return;
        const parent = node.parentNode;
        if (!parent) return;
        // Determine correct DOM parent group
        let parentGroup = parent.element;
        try {
          if (parent.isContainer && !parent.collapsed) {
            const innerZone =
              parent.zoneManager?.innerContainerZone ||
              (parent.zoneManager?.ensureInnerContainerZone
                ? parent.zoneManager.ensureInnerContainerZone()
                : null);
            parentGroup = innerZone?.getChildContainer?.() || parent.element;
          }
        } catch {}
        const targetDom = parentGroup?.node?.();
        const el = node.element?.node?.();
        if (!targetDom || !el) return;
        if (el.parentNode !== targetDom) {
          try {
            targetDom.appendChild(el);
          } catch {}
        }
      });
    } catch {}
  }

  zoomMain(zoomEvent) {
    this.zoomManager.onMainZoom(zoomEvent);
  }

  zoomMinimap(zoomEvent) {
    this.zoomManager.onMinimapZoom(zoomEvent);
  }

  zoomIn() {
    this.zoomManager.zoomIn();
  }

  zoomOut() {
    this.zoomManager.zoomOut();
  }

  zoomToRoot() {
    if (!this.main.root) return;
    const allNodes = this.main.root.getAllNodes(false);
    if (!allNodes || allNodes.length === 0) return;
    const bbox = computeContentBounds(this, allNodes);
    const { fitK, fitTransform } = this.zoomManager.computeFit(bbox);
    this.main.fitK = fitK || 1.0;
    this.main.fitTransform = fitTransform;
    this.minimap.updateScaleIndicator?.();
    this.zoomToBoundingBox(bbox);
  }

  zoomReset() {
    this.zoomManager.zoomReset();
    this.deselectAll();
  }

  zoomClicked(event, [x, y]) {
    event.stopPropagation();
    this.main.svg
      .transition()
      .duration(750)
      .call(
        this.main.zoom.transform,
        d3.zoomIdentity
          .translate(this.main.width / 2, this.main.height / 2)
          .scale(40)
          .translate(-x, -y),
        d3.pointer(event),
      );
  }

  zoomToNodeById(nodeId) {
    const node = this.main.root.getNode(nodeId);
    if (node) {
      return this.zoomToNode(node);
    }

    console.error('zoomToNodeById: Node not found:', nodeId);
    return null;
  }

  setStatusToNodeById(nodeId, status) {
    const node = this.main.root.getNode(nodeId);
    if (node) {
      try {
        node.status = status;
      } catch (e) {
        console.warn('setStatusToNodeById: Failed to update status for node:', nodeId, e);
      }
    } else {
      console.error('setStatusToNodeById: Node not found:', nodeId);
    }

    return null;
  }

  /**
   * Set a validation error ("red nose") on a node.
   *
   * Orthogonal to status — a Ready node can carry a post-validation error.
   * See /dashboard/documentation/validation-indicators.md.
   *
   * @param {string} nodeId - The id of the target node.
   * @param {'pre'|'post'} side - 'pre' for input side (left), 'post' for output side (right).
   * @param {boolean|string} value - Truthy enables the indicator. A string is exposed as tooltip.
   */
  setValidationErrorById(nodeId, side, value) {
    const node = this.main.root?.getNode(nodeId);
    if (!node) {
      console.error('setValidationErrorById: Node not found:', nodeId);
      return;
    }
    if (side === 'pre') {
      node.preValidationError = value;
    } else if (side === 'post') {
      node.postValidationError = value;
    } else {
      console.warn('setValidationErrorById: side must be "pre" or "post"');
    }
  }

  /**
   * Clear validation errors on a node. Omit `side` to clear both.
   * @param {string} nodeId
   * @param {'pre'|'post'} [side]
   */
  clearValidationErrorById(nodeId, side) {
    const node = this.main.root?.getNode(nodeId);
    if (!node) return;
    if (side === undefined || side === 'pre') node.preValidationError = false;
    if (side === undefined || side === 'post') node.postValidationError = false;
  }

  /**
   * Switch the validation-indicator visual style live across every node.
   * Allowed styles: 'pulse-halo', 'rotating-siren', 'industrial-tape',
   * 'police-line', 'none'.
   *
   * @param {string} style
   */
  setValidationIndicatorStyle(style) {
    if (!this.main?.root) return;
    const settings = this.main.root.settings;
    if (!settings.validationIndicator) settings.validationIndicator = {};
    settings.validationIndicator.style = style;
    const nodes = this.main.root.getAllNodes();
    nodes.forEach((node) => {
      if (typeof node._renderValidationIndicators === 'function') {
        node._renderValidationIndicators();
      }
    });
  }

  zoomRandom(dashboard) {
    const nodes = dashboard.main.root.getAllNodes();
    const node = nodes[Math.floor(Math.random() * nodes.length)];
    return this.zoomToNode(node);
  }

  selectNode(node, event = null) {
    // Clear any pending single click timer
    if (this._clickDelayTimer) {
      clearTimeout(this._clickDelayTimer);
      this._clickDelayTimer = null;
    }

    // Schedule single click handler execution after delay
    this._clickDelayTimer = setTimeout(() => {
      this._clickDelayTimer = null;
      this._executeSingleClick(node);
    }, this._clickDelayMs);
  }

  /**
   * Execute single click selection and callback
   * @param {Object} node - The clicked node
   */
  _executeSingleClick(node) {
    // Exclusive single selection: clear previous and select only this node
    this.deselectAll();
    node.selected = true;
    // Clear any previous neighborhood when manually selecting
    this.selection.neighborhood = null;
    // Draw bounding box for the single selected node
    let bbox = computeBoundingBox(this, [node]);
    // If node has no incoming or outgoing edges, also zoom to a sane bbox
    const hasNoEdges =
      !node.edges ||
      ((node.edges.incoming?.length || 0) === 0 && (node.edges.outgoing?.length || 0) === 0);
    if (hasNoEdges) {
      const k = this.main.transform.k || 1;
      const minPx = 80; // minimum size on screen to avoid over-zooming
      const minWorld = minPx / k;
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const w = Math.max(bbox.width, minWorld);
      const h = Math.max(bbox.height, minWorld);
      bbox = { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
    }
    this.renderSelectionBoundingBox(bbox);

    // Call additional click callback if registered - PASS NODE AS PARAMETER
    if (this.onNodeClick && typeof this.onNodeClick === 'function') {
      try {
        this.onNodeClick(node);
      } catch (e) {
        console.error('Error in node click callback:', e);
      }
    }
  }

  getSelectedNodes() {
    return this.main.root.getAllNodes(true);
  }

  /**
   * Register a callback function to be called after normal node selection
   * @param {Function} callback - Function to call with the selected node as parameter: callback(node)
   */
  setNodeClickCallback(callback) {
    if (typeof callback === 'function') {
      this.onNodeClick = callback;
    } else {
      console.warn('setNodeClickCallback: callback must be a function');
    }
  }

  getStructure() {
    if (!this.main.root) return null;

    const nodes = this.main.root.getAllNodes(false, true);
    const edges = [];
    this.main.root.getAllEdges(false, edges);

    const structureNodes = nodes.map((node) => {
      return {
        Id: node.id,
      };
    });

    const structureEdges = edges.map((edge) => {
      return {
        Source: edge.source.id,
        Target: edge.target.id,
        Id: edge.id,
      };
    });

    return { Nodes: structureNodes, Edges: structureEdges };
  }

  /**
   * Re-evaluate and apply status-based collapse logic to all nodes
   * This method is called when toggleCollapseOnStatusChange setting changes
   */
  updateStatusBasedCollapse() {
    if (!this.main.root) return;

    const nodes = this.main.root.getAllNodes(false, true);
    if (!nodes || nodes.length === 0) return;

    let hasChanges = false;

    // Re-evaluate collapse state for each node based on current status and new setting
    nodes.forEach((node) => {
      if (node && typeof node.status !== 'undefined') {
        // Safety check: only process nodes with valid elements
        if (!node.element) {
          if (this.data.settings?.isDebug) {
            console.warn('Skipping node with null element in updateStatusBasedCollapse:', node.id);
          }
          return;
        }

        // Determine if this node should be collapsed based on current status
        const shouldCollapse =
          this.data.settings.toggleCollapseOnStatusChange &&
          [NodeStatus.READY, NodeStatus.DISABLED, NodeStatus.UPDATED, NodeStatus.SKIPPED].includes(
            node.status,
          );

        // Only change state if it's different from current
        if (shouldCollapse !== node.collapsed) {
          hasChanges = true;

          // Use the collapsed setter to ensure proper state management and trigger expand/collapse methods
          try {
            node.collapsed = shouldCollapse;
          } catch (e) {
            console.warn('Failed to change collapse state for node:', node.id, e);
          }
        }
      }
    });

    // If there were changes, restart the simulation to recalculate the layout
    if (hasChanges && this.main.root) {
      // Restart simulation to recalculate layout with new collapsed/expanded states
      this.main.root.cascadeRestartSimulation();

      // Update the display to show the new layout
      this.main.root.update();
    }

    // Trigger display update to reflect changes
    this.onMainDisplayChange();
  }

  deselectAll() {
    const nodes = this.getSelectedNodes();
    nodes.forEach((node) => (node.selected = false));

    const edges = [];
    this.main.root.getAllEdges(true, edges);
    edges.forEach((edge) => (edge.selected = false));

    // Clear neighborhood selection context
    this.selection.neighborhood = null;
    // Remove any selection bounding box
    this.clearSelectionBoundingBox();
  }

  zoomToNode(node) {
    const neighbors = node.getNeighbors(this.data.settings.selector);

    this.deselectAll();
    neighbors.nodes.forEach((node) => (node.selected = true));
    neighbors.edges.forEach((edge) => (edge.selected = true));

    // If the node has no neighbors beyond itself, compute a sane bbox to avoid over-zoom
    let boundingBox = computeBoundingBox(this, neighbors.nodes);
    const onlySelf =
      neighbors && neighbors.nodes && neighbors.nodes.length > 0
        ? neighbors.nodes.every((n) => n === node)
        : true;
    if (onlySelf) {
      boundingBox = this.computeSaneNodeBoundingBox(node);
    }

    // Store neighborhood context for subsequent dblclick handling
    this.selection.neighborhood = {
      nodes: neighbors.nodes,
      edges: neighbors.edges,
      boundingBox,
    };

    // Always draw selection bounding box for neighborhood selection
    this.renderSelectionBoundingBox(boundingBox);

    this.main.boundingbox = {
      boundingBox: boundingBox,
      x: boundingBox.x,
      y: boundingBox.y,
      width: boundingBox.width,
      height: boundingBox.height,
      scale: this.main.transform.k,
    };

    this.zoomToBoundingBox(boundingBox);

    return this.main.boundingbox;
  }

  // Double-click behavior:
  // Double-click handler:
  // - If a neighborhood bbox is active and the dblclick is on a node in that neighborhood, zoom to bbox
  // - Otherwise zoom to the specific node that was clicked
  handleNodeDblClick(node, event) {
    // Cancel any pending single click
    if (this._clickDelayTimer) {
      clearTimeout(this._clickDelayTimer);
      this._clickDelayTimer = null;
    }

    const nb = this.selection.neighborhood;

    // Only use the existing neighborhood bbox if we're double-clicking on a node that's already
    // part of that neighborhood (not a different node that happens to be spatially inside it)
    if (nb && nb.boundingBox) {
      // Check if the clicked node is part of the neighborhood
      const insideByNode = nb.nodes && nb.nodes.indexOf(node) !== -1;

      if (insideByNode) {
        // Double-clicking on a node that's part of the active neighborhood - zoom to neighborhood
        this.zoomToBoundingBox(nb.boundingBox);
        return;
      }
      // Otherwise, fall through to zoom to the specific node that was clicked
    }

    // Default: zoom to the specific node; if node has no neighbors, ensure a sane bbox
    const neighbors = node.getNeighbors(this.data.settings.selector);
    const onlySelf =
      neighbors && neighbors.nodes && neighbors.nodes.length > 0
        ? neighbors.nodes.every((n) => n === node)
        : true;
    if (onlySelf) {
      const bbox = this.computeSaneNodeBoundingBox(node);
      this.deselectAll();
      node.selected = true;
      this.selection.neighborhood = { nodes: [node], edges: [], boundingBox: bbox };
      this.renderSelectionBoundingBox(bbox);
      this.zoomToBoundingBox(bbox);
    } else {
      this.zoomToNode(node);
    }
  }

  zoomToBoundingBox(boundingBox) {
    this.zoomManager.zoomToBoundingBox(boundingBox, { animate: true, duration: 500 });
  }

  /**
   * Ensure loading overlay instance exists for this dashboard
   * Creates it if necessary
   */
  _ensureLoadingOverlay() {
    if (!this.loadingOverlay && this.main?.svg) {
      const container = resolveLoadingHost(this.main.svg);
      this.loadingOverlay = new LoadingOverlay(container);
      this._debugLog('📊 Dashboard._ensureLoadingOverlay() - Created overlay instance');
    }
    return this.loadingOverlay;
  }

  /**
   * Show loading overlay for this dashboard
   */
  showLoading() {
    this._debugLog('📊 Dashboard.showLoading() called');
    const overlay = this._ensureLoadingOverlay();
    if (overlay) {
      overlay.showLoading();
    }
  }

  /**
   * Hide loading overlay for this dashboard
   */
  hideLoading() {
    this._debugLog('📊 Dashboard.hideLoading() called');
    if (this.loadingOverlay) {
      this.loadingOverlay.hideLoading();
    }
  }

  /**
   * Set loading stage for this dashboard
   * @param {string} stageName - Name of the stage
   */
  setLoadingStage(stageName) {
    this._debugLog('📊 Dashboard.setLoadingStage() called with:', stageName);
    const overlay = this._ensureLoadingOverlay();
    if (overlay) {
      overlay.setLoadingStage(stageName);
    }
  }

  /**
   * Set progress message for this dashboard
   * @param {string} progressMessage - Progress message (e.g., "5 / 20 nodes")
   */
  setProgress(progressMessage) {
    this._debugLog('📊 Dashboard.setProgress() called with:', progressMessage);
    const overlay = this._ensureLoadingOverlay();
    if (overlay) {
      overlay.setProgress(progressMessage);
    }
  }

  /**
   * Set loading message for this dashboard
   * @param {string} message - Message to display
   */
  setLoadingMessage(message) {
    this._debugLog('📊 Dashboard.setLoadingMessage() called with:', message);
    const overlay = this._ensureLoadingOverlay();
    if (overlay) {
      overlay.setLoadingMessage(message);
    }
  }
}

export function getImmediateNeighbors(baseNode, graphData) {
  const neighbors = [baseNode];

  for (const node of graphData.nodes()) {
    if (
      baseNode.data.parentIds.includes(node.data.id) ||
      baseNode.data.childrenIds.includes(node.data.id)
    ) {
      neighbors.push(node);
    }
  }

  return neighbors;
}

/**
 * Compute content bounding box using SVG world coordinates
 * Used for zoom/fit operations after layout changes
 */
export function computeContentBounds(dashboard, nodes) {
  const padding = 2;

  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];

  const updateBounds = (x, y, width, height) => {
    minX = Math.min(minX, x - width / 2);
    minY = Math.min(minY, y - height / 2);
    maxX = Math.max(maxX, x + width / 2);
    maxY = Math.max(maxY, y + height / 2);
  };

  nodes.forEach((node) => {
    const useEffectiveSize = node?.isContainer && node?.collapsed;

    let dimensions;
    try {
      dimensions = getBoundingBoxRelativeToParent(node.element, dashboard.main.container);
    } catch {
      dimensions = null;
    }

    if (!dimensions || !isFinite(dimensions.width) || !isFinite(dimensions.height)) {
      const hasDom = !!(
        node?.element &&
        typeof node.element.node === 'function' &&
        node.element.node()
      );
      const isVisible = node?.visible !== false;
      if (!hasDom || !isVisible) {
        return;
      }
      const nx = typeof node.x === 'number' ? node.x : 0;
      const ny = typeof node.y === 'number' ? node.y : 0;
      const nw =
        typeof node.getEffectiveWidth === 'function'
          ? node.getEffectiveWidth()
          : node.data && typeof node.data.width === 'number'
            ? node.data.width
            : typeof node.width === 'number'
              ? node.width
              : 0;
      const nh =
        typeof node.getEffectiveHeight === 'function'
          ? node.getEffectiveHeight()
          : node.data && typeof node.data.height === 'number'
            ? node.data.height
            : typeof node.height === 'number'
              ? node.height
              : 0;
      updateBounds(nx, ny, nw, nh);
      return;
    }

    // Use SVG world coordinates for content bounds
    if (useEffectiveSize) {
      const effectiveWidth = node.getEffectiveWidth();
      const effectiveHeight = node.getEffectiveHeight();
      updateBounds(node.x, node.y, effectiveWidth, effectiveHeight);
    } else {
      updateBounds(node.x, node.y, dimensions.width, dimensions.height);
    }
  });

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + 2 * padding,
    height: maxY - minY + 2 * padding,
  };
}

/**
 * Compute visual bounding box using DOM coordinates
 * Used for selection rectangle display
 */
export function computeBoundingBox(dashboard, nodes) {
  const padding = 2;

  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];

  const updateBounds = (x, y, width, height) => {
    minX = Math.min(minX, x - width / 2);
    minY = Math.min(minY, y - height / 2);
    maxX = Math.max(maxX, x + width / 2);
    maxY = Math.max(maxY, y + height / 2);
  };

  nodes.forEach((node) => {
    const useEffectiveSize = node?.isContainer && node?.collapsed;

    let dimensions;
    try {
      dimensions = getBoundingBoxRelativeToParent(node.element, dashboard.main.container);
    } catch {
      dimensions = null;
    }

    if (!dimensions || !isFinite(dimensions.width) || !isFinite(dimensions.height)) {
      // Skip nodes that are not rendered/visible (e.g., collapsed descendants removed from DOM)
      const hasDom = !!(
        node?.element &&
        typeof node.element.node === 'function' &&
        node.element.node()
      );
      const isVisible = node?.visible !== false;
      if (!hasDom || !isVisible) {
        return;
      }
      // Use effective size when DOM bbox is unavailable
      const nx = typeof node.x === 'number' ? node.x : 0;
      const ny = typeof node.y === 'number' ? node.y : 0;
      const nw =
        typeof node.getEffectiveWidth === 'function'
          ? node.getEffectiveWidth()
          : node.data && typeof node.data.width === 'number'
            ? node.data.width
            : typeof node.width === 'number'
              ? node.width
              : 0;
      const nh =
        typeof node.getEffectiveHeight === 'function'
          ? node.getEffectiveHeight()
          : node.data && typeof node.data.height === 'number'
            ? node.data.height
            : typeof node.height === 'number'
              ? node.height
              : 0;
      minX = Math.min(minX, nx - nw / 2);
      minY = Math.min(minY, ny - nh / 2);
      maxX = Math.max(maxX, nx + nw / 2);
      maxY = Math.max(maxY, ny + nh / 2);
      return;
    }

    // For collapsed containers, use DOM position with effective size
    if (useEffectiveSize) {
      const effectiveWidth = node.getEffectiveWidth();
      const effectiveHeight = node.getEffectiveHeight();
      const centerX = dimensions.x + dimensions.width / 2;
      const centerY = dimensions.y + dimensions.height / 2;
      updateBounds(centerX, centerY, effectiveWidth, effectiveHeight);
      return;
    }

    // Use DOM coordinates for visual selection
    minX = Math.min(minX, dimensions.x);
    minY = Math.min(minY, dimensions.y);
    maxX = Math.max(maxX, dimensions.x + dimensions.width);
    maxY = Math.max(maxY, dimensions.y + dimensions.height);
  });

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + 2 * padding,
    height: maxY - minY + 2 * padding,
  };
}

function calculateScaleAndTranslate(boundingBox, dashboard) {
  let correctedCanvasHeight = dashboard.main.canvas.height;
  let correctedCanvasWidth = dashboard.main.canvas.width;
  if (
    dashboard.main.canvas.width / dashboard.main.canvas.height >
    dashboard.main.view.width / dashboard.main.view.height
  ) {
    correctedCanvasHeight =
      dashboard.main.canvas.width * (dashboard.main.view.height / dashboard.main.view.width);
  } else {
    correctedCanvasWidth =
      dashboard.main.canvas.height * (dashboard.main.view.width / dashboard.main.view.height);
  }

  let scale;
  if (dashboard.layout.horizontal) {
    scale = Math.min(
      correctedCanvasWidth / boundingBox.width,
      correctedCanvasHeight / boundingBox.height,
    );
  } else {
    scale = Math.min(
      correctedCanvasWidth / boundingBox.width,
      correctedCanvasHeight / boundingBox.height,
    );
  }
  const isHorizontalBoundingBox =
    boundingBox.width / boundingBox.height > correctedCanvasWidth / correctedCanvasHeight;

  const visualHeight = boundingBox.width * (correctedCanvasHeight / correctedCanvasWidth);
  const heightCorrection = (visualHeight - boundingBox.height) * 0.5;

  const visualWidth = boundingBox.height * (correctedCanvasWidth / correctedCanvasHeight);
  const widthCorrection = (visualWidth - boundingBox.width) * 0.5;

  let translateX = -boundingBox.x * scale;
  let translateY = -boundingBox.y * scale;

  if (dashboard.minimap.canvas.isHorizontalCanvas)
    translateY -= dashboard.minimap.canvas.whiteSpaceY;
  else translateX -= dashboard.minimap.canvas.whiteSpaceX;

  if (isHorizontalBoundingBox) translateY += heightCorrection * scale;
  else translateX += widthCorrection * scale;

  return {
    scale: scale,
    translate: {
      x: translateX,
      y: translateY,
    },
  };
}

export function createAndInitDashboard(dashboardData, mainDivSelector, thirdArg = null) {
  let minimapDivSelector = null;
  if (thirdArg && typeof thirdArg === 'string') {
    minimapDivSelector = thirdArg;
  } else if (thirdArg && typeof thirdArg === 'object') {
    const userSettings = dashboardData && dashboardData.settings ? dashboardData.settings : {};
    dashboardData.settings = ConfigManager.mergeWithDefaults({ ...userSettings, ...thirdArg });
  }
  const dashboard = new Dashboard(dashboardData);
  dashboard.initialize(mainDivSelector, minimapDivSelector);
  return dashboard;
}

export async function loadDashboardFromFile(mainDivSelector, selectedFile, applySettings) {
  const dashboardData = await fetchDashboardFile(selectedFile);
  if (typeof applySettings === 'function') {
    try {
      applySettings(dashboardData);
    } catch {}
  }
  const dashboard = new Dashboard(dashboardData);
  dashboard.initialize(mainDivSelector);
  return dashboard;
}

export function setDashboardProperty(dashboardObject, propertyPath, value) {
  const properties = propertyPath.split('.');
  let obj = dashboardObject;
  for (let i = 0; i < properties.length - 1; i++) {
    obj = obj[properties[i]];
  }
  obj[properties[properties.length - 1]] = value;

  try {
    // Handle immediate visual updates for non-minimap properties
    if (propertyPath.endsWith('showBoundingBox') || propertyPath.includes('.showBoundingBox')) {
      const dash = dashboardObject;
      const show = !!value;
      if (!show) {
        dash.clearSelectionBoundingBox?.();
      } else {
        // Re-render bbox for current selection if present
        const nb = dash.selection?.neighborhood;
        if (nb?.boundingBox) {
          dash.renderSelectionBoundingBox(nb.boundingBox);
        } else if (typeof dash.getSelectedNodes === 'function') {
          const sel = dash.getSelectedNodes();
          if (sel && sel.length) {
            const bbox = computeBoundingBox(dash, sel);
            dash.renderSelectionBoundingBox(bbox);
          }
        }
      }
    }

    const isMinimapChange = propertyPath.includes('minimap');
    if (!isMinimapChange) return;

    const dash = dashboardObject;
    const mm = dash.data?.settings?.minimap;
    if (!mm || !dash.minimap?.active) return;

    const recalcSize = () => {
      if (dash.minimap?.svg) {
        dash.minimap.resize();
      }
    };

    if (propertyPath.endsWith('minimap.size') || propertyPath.includes('.minimap.size')) {
      recalcSize();
      dash.minimap.update();
      dash.minimap.scale = Math.min(
        dash.minimap.width / dash.main.width,
        dash.minimap.height / dash.main.height,
      );
      dash.minimap.position();
    }

    if (propertyPath.endsWith('minimap.position') || propertyPath.includes('.minimap.position')) {
      dash.minimap.position();
    }

    if (
      propertyPath.endsWith('minimap.collapsedIcon.position') ||
      propertyPath.includes('.minimap.collapsedIcon.position')
    ) {
      dash.minimap.position();
    }

    if (propertyPath.endsWith('minimap.collapsed') || propertyPath.includes('.minimap.collapsed')) {
      dash.minimap.setCollapsed(!!value, true);
    }

    if (propertyPath.endsWith('minimap.mode') || propertyPath.includes('.minimap.mode')) {
      const newMode = value === 'hidden' ? 'disabled' : value;
      mm.mode = newMode;
      if (newMode === 'always') {
        mm.enabled = true;
        mm.pinned = true;
      } else if (newMode === 'hover') {
        mm.pinned = false;
      } else if (newMode === 'disabled') {
        dash.minimap.setCollapsed(true);
      }
      dash.minimap.position();
      dash.minimap.updateHoverBindings();
    }

    if (propertyPath.endsWith('minimap.pinned') || propertyPath.includes('.minimap.pinned')) {
      dash.minimap.updatePinVisualState();
      dash.minimap.updateVisibilityByZoom();
      dash.minimap.updateHoverBindings();
    }

    if (
      propertyPath.endsWith('scaleIndicator.visible') ||
      propertyPath.includes('.minimap.scaleIndicator.visible')
    ) {
      const visible = !!value;
      if (visible) {
        if (!dash.minimap.scaleText && dash.minimap.footer) {
          dash.minimap.scaleText = dash.minimap.footer
            .append('text')
            .attr('class', 'minimap-scale')
            .attr('text-anchor', 'end');
        }
        dash.minimap.scaleText.style('display', 'block');
      } else if (dash.minimap.scaleText) {
        dash.minimap.scaleText.style('display', 'none');
      }
      dash.minimap.position();
      dash.minimap.updateScaleIndicator();
    }
  } catch (e) {
    console.warn('setDashboardProperty post-update failed', e);
  }
}

// ============================================================================
// PRE-RENDER UTILITIES
// ============================================================================

/**
 * Generate pre-render data for a dashboard
 * This creates a new dashboard instance, renders it fully expanded, and extracts positions
 * @param {Object} dashboardData - The dashboard data to pre-render
 * @param {string} containerSelector - CSS selector for the container element (will be hidden)
 * @returns {Promise<Object>} Enhanced dashboard data with pre-render information
 */
export async function generatePrerenderData(dashboardData, containerSelector = '#prerender-temp') {
  console.log('🎨 Starting pre-render data generation...');

  // Create temporary container if it doesn't exist
  let container = document.querySelector(containerSelector);
  if (!container) {
    container = document.createElement('div');
    container.id = containerSelector.replace('#', '');
    container.style.position = 'absolute';
    container.style.left = '-10000px';
    container.style.top = '-10000px';
    container.style.width = '2000px';
    container.style.height = '2000px';
    document.body.appendChild(container);
  }

  try {
    // Create dashboard with pre-render settings
    const tempSettings = {
      ...(dashboardData.settings || {}),
      usePrerender: false, // Don't use existing pre-render
      toggleCollapseOnStatusChange: false, // Force expanded
      cascadeOnStatusChange: false,
      zoomToRoot: true,
      minimap: {
        ...(dashboardData.settings?.minimap || {}),
        enabled: false, // Disable minimap for generation
      },
    };

    const tempData = {
      ...dashboardData,
      settings: tempSettings,
    };

    // Initialize dashboard - MUST AWAIT THIS!
    console.log('🎨 Initializing dashboard...');
    const dashboard = new Dashboard(tempData);
    await dashboard.initialize(containerSelector);

    console.log('🎨 Dashboard initialized, waiting for layout stabilization...');

    // Wait for layout stabilization (simulation to settle)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify root node exists
    if (!dashboard.main?.root) {
      throw new Error(
        'Dashboard root node not initialized. Dashboard initialization may have failed.',
      );
    }

    console.log('🎨 Root node ready, extracting node positions...');
    console.log('🎨 Root node:', {
      id: dashboard.main.root.data?.id,
      label: dashboard.main.root.data?.label,
      hasChildren: !!dashboard.main.root.childNodes,
      childCount: dashboard.main.root.childNodes?.length || 0,
    });

    // Extract enhanced data
    const enhancedNodes = extractNodePositionsFromTree(dashboard.main.root);

    console.log('🎨 Extracting edge paths...');

    const enhancedEdges = extractEdgePaths(dashboardData.edges || []);

    // Build enhanced dashboard data
    const enhancedData = {
      ...dashboardData,
      nodes: enhancedNodes,
      edges: enhancedEdges,
      settings: {
        ...(dashboardData.settings || {}),
        usePrerender: true,
        prerenderMetadata: {
          version: '1.0',
          generated: new Date().toISOString(),
          generatedBy: 'flowdash-prerender-generator',
          nodeCount: countNodesInTree(enhancedNodes),
          edgeCount: enhancedEdges.length,
          expandedState: true,
          statusRulesApplied: false,
          // Fingerprint is computed AFTER the spread so it covers the
          // post-generation node/edge IDs and the same settings subset that
          // validatePrerenderFreshness will check at load time.
          fingerprint: computeFingerprint({
            nodes: enhancedNodes,
            edges: enhancedEdges,
            settings: dashboardData.settings,
          }),
        },
      },
    };

    console.log('✅ Pre-render data generated successfully');

    return enhancedData;
  } catch (error) {
    console.error('❌ Error generating pre-render data:', error);
    throw error;
  }
}

/**
 * Extract node positions from the rendered tree
 * @param {Object} rootNode - The root node from the dashboard
 * @returns {Array} Enhanced nodes with pre-render data
 */
function extractNodePositionsFromTree(rootNode) {
  if (!rootNode) {
    console.warn('🎨 Missing rootNode');
    return [];
  }

  console.log('🎨 Starting node position extraction...');

  // Get all rendered nodes in a flat list
  const allRenderedNodes = rootNode.getAllNodes(true, true); // includeRoot=true, includeCollapsed=true
  console.log(`🎨 Found ${allRenderedNodes.length} rendered nodes`);

  // Build a map of node ID to rendered node for O(1) lookup
  const renderedNodeMap = new Map();
  allRenderedNodes.forEach((renderNode) => {
    if (renderNode.data && renderNode.data.id) {
      renderedNodeMap.set(renderNode.data.id, renderNode);
    }
  });

  console.log(`🎨 Built map with ${renderedNodeMap.size} nodes`);

  let processedCount = 0;
  let missingCount = 0;

  function processNode(renderNode) {
    if (!renderNode || !renderNode.data) return null;

    const nodeData = renderNode.data;

    // Create new object with desired property order
    const enhanced = {};

    // 1. Copy basic properties (id, type, label, etc.) - everything except special properties
    const excludeProps = ['width', 'height', 'expandedSize', 'layout', 'prerender', 'children'];
    for (const key in nodeData) {
      if (!excludeProps.includes(key)) {
        enhanced[key] = nodeData[key];
      }
    }

    // 2. Add pre-render data BEFORE children
    if (typeof renderNode.x === 'number' && typeof renderNode.y === 'number') {
      enhanced.prerender = {
        x: renderNode.x || 0,
        y: renderNode.y || 0,
        width: renderNode.data?.width || nodeData.width || 0,
        height: renderNode.data?.height || nodeData.height || 0,
      };

      // Include calculated minimum size if available (for containers with headers)
      if (renderNode.minimumSize) {
        enhanced.prerender.minimumSize = {
          width: renderNode.minimumSize.width || 0,
          height: renderNode.minimumSize.height || 0,
        };
      }

      processedCount++;
      if (processedCount % 50 === 0) {
        console.log(`🎨 Processed ${processedCount} nodes...`);
      }
    } else {
      missingCount++;
      if (missingCount <= 5) {
        console.warn('🎨 Node missing position data:', {
          id: nodeData.id,
          label: nodeData.label,
          type: nodeData.type,
        });
      }
      enhanced.prerender = null;
    }

    // 3. Clean up and add layout (only if it has non-default values)
    if (nodeData.layout) {
      const layout = { ...nodeData.layout };

      // Remove minimumSize if it's all defaults
      if (layout.minimumSize) {
        const isDefault =
          layout.minimumSize.width === 0 &&
          layout.minimumSize.height === 0 &&
          layout.minimumSize.useRootRatio === false;

        if (isDefault) {
          delete layout.minimumSize;
        }
      }

      // Remove other default layout properties
      if (layout.mode === 'vertical') delete layout.mode; // Default mode
      if (layout.padding === 0) delete layout.padding; // Default padding
      if (layout.spacing === 0) delete layout.spacing; // Default spacing

      // Only add layout if it has non-default properties
      if (Object.keys(layout).length > 0) {
        enhanced.layout = layout;
      }
    }

    // 4. Recursively process children (at the end)
    if (renderNode.childNodes && renderNode.childNodes.length > 0) {
      enhanced.children = renderNode.childNodes.map((childRenderNode) =>
        processNode(childRenderNode),
      );
    }

    return enhanced;
  }

  // Process from root node
  const enhancedNodes = [processNode(rootNode)];

  console.log(
    `✅ Position extraction complete. Processed ${processedCount} nodes with position data.`,
  );
  if (missingCount > 0) {
    console.warn(`⚠️ ${missingCount} nodes were missing render data`);
  }

  return enhancedNodes;
}

/**
 * Extract edge paths from the DOM
 * @param {Array} edges - Original edge data
 * @returns {Array} Enhanced edges with pre-render paths
 */
function extractEdgePaths(edges) {
  if (!edges || edges.length === 0) return [];

  const enhancedEdges = [];

  // Query all edge groups (g elements with class 'edge')
  const edgeGroups = document.querySelectorAll('g.edge');
  const pathMap = new Map();

  // Build map of edge paths from DOM
  // Edge structure: <g class="edge type" id="edge-id"><path class="path" d="..."/></g>
  edgeGroups.forEach((group) => {
    const id = group.getAttribute('id');
    const pathElement = group.querySelector('path.path');
    const path = pathElement ? pathElement.getAttribute('d') : null;

    if (id && path) {
      pathMap.set(id, path);
    }
  });

  console.log(`🎨 Found ${pathMap.size} edge paths in DOM`);
  console.log(`🎨 Edge IDs in DOM:`, Array.from(pathMap.keys()));

  // Enhance edges with path data
  edges.forEach((edge) => {
    const enhanced = {};

    // Copy all properties except prerender
    for (const key in edge) {
      if (key !== 'prerender') {
        enhanced[key] = edge[key];
      }
    }

    // Try to find path using the edge's ID
    // If edge has an explicit id field, use that
    // Otherwise, try the fallback generated format: source--type--target
    let path = null;

    if (edge.id) {
      // Try explicit ID first
      path = pathMap.get(edge.id);
      if (!path) {
        console.warn(`🎨 No path found for edge ID: ${edge.id}`);
      }
    }

    if (!path) {
      // Try fallback format
      const fallbackId = `${edge.source}--${edge.type || 'unknown'}--${edge.target}`;
      path = pathMap.get(fallbackId);
      if (!path) {
        console.warn(`🎨 No path found for edge fallback ID: ${fallbackId}`);
      }
    }

    // Add prerender data if path was found
    if (path) {
      enhanced.prerender = {
        path: path,
      };
    }

    enhancedEdges.push(enhanced);
  });

  const foundPaths = enhancedEdges.filter((e) => e.prerender).length;
  console.log(`🎨 Extracted paths for ${foundPaths} of ${edges.length} edges`);

  return enhancedEdges;
}

/**
 * Count total nodes in a tree structure
 * @param {Array} nodes - Node array
 * @returns {number} Total count of nodes
 */
function countNodesInTree(nodes) {
  if (!Array.isArray(nodes)) return 0;

  let count = 0;
  function traverse(nodeArray) {
    if (!Array.isArray(nodeArray)) return;
    nodeArray.forEach((node) => {
      count++;
      if (node.children) {
        traverse(node.children);
      }
    });
  }

  traverse(nodes);
  return count;
}

/**
 * Check if dashboard data has pre-render information
 * @param {Object} dashboardData - Dashboard data to check
 * @returns {boolean} True if pre-render data exists and should be used
 */
export function hasPrerenderData(dashboardData) {
  if (!dashboardData) return false;

  // Check if pre-render is disabled via settings
  if (dashboardData.settings?.usePrerender === false) {
    return false;
  }

  // Check if any node has pre-render data
  function hasNodePrerender(nodes) {
    if (!Array.isArray(nodes)) return false;

    for (const node of nodes) {
      if (node.prerender) return true;
      if (node.children && hasNodePrerender(node.children)) {
        return true;
      }
    }
    return false;
  }

  return hasNodePrerender(dashboardData.nodes || []);
}

export { fetchDashboardFile };
