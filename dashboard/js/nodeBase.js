import { computeConnectionPoints } from './utilPath.js';
import { EventManager } from './eventManager.js';
import { StatusManager } from './statusManager.js';
import { ConfigManager } from './configManager.js';
import { ZoneManager } from './zones/index.js';
import { renderValidationIndicators } from './validationIndicators.js';

export const NodeStatus = Object.freeze({
  UNDETERMINED: 'Undetermined',
  UNKNOWN: 'Unknown',
  DISABLED: 'Disabled',
  // process states
  READY: 'Ready',
  UPDATING: 'Updating',
  UPDATED: 'Updated',
  SKIPPED: 'Skipped',
  // error states
  DELAYED: 'Delayed',
  WARNING: 'Warning',
  ERROR: 'Error',
});

export default class BaseNode {
  constructor(nodeData, parentElement, settings, parentNode = null) {
    this.isContainer = false;
    this.data = nodeData;
    this.parentElement = parentElement;
    this.parentNode = parentNode;
    this.settings = ConfigManager.mergeWithDefaults(settings);
    this.computeConnectionPoints = computeConnectionPoints;
    this.onDisplayChange = null;
    this.onClick = null;
    this.onDblClick = null;
    this._selected = false;
    this._status = nodeData.state ?? NodeStatus.UNKNOWN;
    this._visible = nodeData.visible ?? true;
    this._collapsed = nodeData.collapsed ?? false;
    this._preValidationError = nodeData.preValidationError ?? false;
    this._postValidationError = nodeData.postValidationError ?? false;
    this.suspenseDisplayChange = false;

    this.id = nodeData.id;

    this.edges = {
      incoming: [],
      outgoing: [],
    };

    this.element = null;
    this.simulation = null;

    this.zoneManager = null;
    this._updatingCollapseState = false;

    // Apply pre-render position if available
    if (nodeData.prerender) {
      this.x = nodeData.prerender.x;
      this.y = nodeData.prerender.y;
      this.data.width = nodeData.prerender.width;
      this.data.height = nodeData.prerender.height;
      this._hasPrerenderData = true;
    } else {
      // Read initial position from nodeData, with defaults
      this.x = nodeData.x ?? 0;
      this.y = nodeData.y ?? 0;
      this.data.width ??= 60;
      this.data.height ??= 60;
      this._hasPrerenderData = false;
    }
  }

  get visible() {
    return this._visible;
  }

  set visible(value) {
    if (value === this._visible) return;

    this._visible = value;

    // Actually hide/show the DOM element
    if (this.element) {
      if (value) {
        this.element.style('display', null); // Show element
      } else {
        this.element.style('display', 'none'); // Hide element
      }
    }
  }

  get collapsed() {
    return this._collapsed;
  }

  set collapsed(value) {
    if (value === this._collapsed) return;

    this._collapsed = value;

    // Always update DOM classes if element exists
    if (this.element) {
      this.element.classed('collapsed', this.collapsed);
      this.element.classed('expanded', !this.collapsed);
    }
  }

  /**
   * Check if this node has pre-render data
   * @returns {boolean}
   */
  get hasPrerenderData() {
    return this._hasPrerenderData === true;
  }

  get status() {
    return this._status;
  }

  set status(value) {
    this._status = value;
    if (this.element) {
      this.element.attr('status', value);
    }

    // Auto collapse/expand based on status when enabled, avoiding re-entrancy
    // Only containers should auto-toggle collapsed state
    if (
      this.isContainer &&
      this.settings.toggleCollapseOnStatusChange &&
      !this._updatingCollapseState
    ) {
      // For containers, determine collapse based on children's statuses
      let shouldCollapse = false;
      if (this.isContainer && this.childNodes && this.childNodes.length > 0) {
        try {
          // Collect leaf node statuses
          const collectLeafStatuses = (nodes, out) => {
            for (const n of nodes) {
              if (n.isContainer && Array.isArray(n.childNodes) && n.childNodes.length > 0) {
                collectLeafStatuses(n.childNodes, out);
              } else {
                out.push(n.status);
              }
            }
          };
          const childStatuses = [];
          collectLeafStatuses(this.childNodes, childStatuses);
          shouldCollapse = StatusManager.shouldContainerCollapse(childStatuses, this.settings);
        } catch {}
      } else {
        // Non-container or no children: use simple status check
        shouldCollapse = StatusManager.shouldCollapseOnStatus(value, this.settings);
      }

      this._updatingCollapseState = true;
      try {
        if (shouldCollapse) {
          this.collapsed = true;
          this._statusCollapseApplied = true; // Mark that status-based collapse was applied
        } else {
          // Explicitly expand when status becomes non-collapsible
          this.collapsed = false;
          this._statusCollapseApplied = true; // Mark that status-based collapse was applied
          // Ensure all ancestor containers are expanded so this node becomes visible
          let ancestor = this.parentNode;
          while (ancestor) {
            try {
              if (ancestor.collapsed) ancestor.collapsed = false;
            } catch {}
            ancestor = ancestor.parentNode;
          }
        }
      } finally {
        this._updatingCollapseState = false;
      }
    }

    // For non-container nodes, ensure ancestors are expanded when status indicates non-collapsible
    if (!this.isContainer && this.settings.toggleCollapseOnStatusChange) {
      try {
        const shouldCollapseAncestors = StatusManager.shouldCollapseOnStatus(value, this.settings);
        if (!shouldCollapseAncestors) {
          let ancestor = this.parentNode;
          while (ancestor) {
            try {
              if (ancestor.collapsed) ancestor.collapsed = false;
            } catch {}
            ancestor = ancestor.parentNode;
          }
        }
      } catch {}
    }

    if (this.settings.cascadeOnStatusChange) {
      this.cascadeStatusChange();
    }
  }

  get selected() {
    return this._selected;
  }

  set selected(value) {
    this._selected = value;
    // Only update DOM if element exists
    if (this.element) {
      this.element.classed('selected', this._selected);
    }
  }

  // --- Validation indicators ("red noses") ---
  // Orthogonal to status: a Ready node can carry a post-validation error to
  // signal "the run completed but produced wrong data". See
  // /dashboard/documentation/validation-indicators.md.

  get preValidationError() {
    return this._preValidationError;
  }

  set preValidationError(value) {
    if (this._preValidationError === value) return;
    this._preValidationError = value;
    this._renderValidationIndicators();
  }

  get postValidationError() {
    return this._postValidationError;
  }

  set postValidationError(value) {
    if (this._postValidationError === value) return;
    this._postValidationError = value;
    this._renderValidationIndicators();
  }

  clearValidationErrors() {
    this.preValidationError = false;
    this.postValidationError = false;
  }

  _renderValidationIndicators() {
    if (!this.element) return;
    const vi = (this.settings && this.settings.validationIndicator) || {};
    renderValidationIndicators(this.element, {
      width: this.data.width,
      height: this.data.height,
      style: vi.style,
      glyph: vi.glyph,
      animate: vi.animate,
      preError: this._preValidationError,
      postError: this._postValidationError,
    });
  }

  handleDisplayChange() {
    if (this.suspenseDisplayChange) {
      return;
    }

    try {
      // Check this node's dashboard reference (inherited during init)
      const dashboard = this.__dashboard;

      // Check suspension - early exit during initialization
      if (dashboard && dashboard._suspendDisplayChange) {
        return;
      }
    } catch {}
    if (this.onDisplayChange) {
      this.onDisplayChange();
    } else {
      if (this.parentNode && typeof this.parentNode.handleDisplayChange === 'function') {
        this.parentNode.handleDisplayChange();
      }
    }
  }

  move(x, y) {
    this.x = x;
    this.y = y;

    // Only update element if it exists (has been initialized)
    if (this.element) {
      this.element.attr('transform', `translate(${this.x}, ${this.y})`);

      // Only call handleDisplayChange if we're not in the middle of initialization
      if (!this.suspenseDisplayChange) {
        this.handleDisplayChange();
      }
    }
  }

  init(parentElement = null) {
    // Performance profiling: Mark start of init
    const perfId = `node-init-${this.id}`;
    performance.mark(`${perfId}-start`);

    if (parentElement) this.parentElement = parentElement;

    // Inherit dashboard reference from parent for suspension checks
    if (this.parentNode?.__dashboard) {
      this.__dashboard = this.parentNode.__dashboard;
    }

    // Performance profiling: DOM element creation
    performance.mark(`${perfId}-before-dom-create`);
    this.element = this.parentElement
      .append('g')
      .attr('class', this.data.type)
      .attr('id', this.id)
      .attr('status', this.status);

    // Apply pre-render transform immediately if available
    if (this.hasPrerenderData) {
      this.element.attr('transform', `translate(${this.x}, ${this.y})`);
    }

    performance.mark(`${perfId}-after-dom-create`);

    // Attach the node instance to the DOM element for testing access
    this.element.node().__node = this;

    // Performance profiling: Zone manager initialization
    performance.mark(`${perfId}-before-zone-manager`);
    // Initialize zone manager only for container nodes
    if (this.isContainer) {
      this.zoneManager = new ZoneManager(this);

      // OPTIMIZATION #7: If batching DOM operations, defer complex zone initialization
      const isBatching = this.__dashboard?._batchDomOperations;
      if (isBatching) {
        // Just create structure, defer measurements and complex operations
        this.zoneManager.initStructureOnly?.() || this.zoneManager.init();
      } else {
        this.zoneManager.init();
      }

      // Resize zones (in pre-render mode, this sets sizes but skips calculations)
      // Defer resize to measurement phase if batching
      if (isBatching && this.__dashboard?._deferredOperations) {
        this.__dashboard._deferredOperations.measurements.push(() => {
          if (this.zoneManager) {
            this.zoneManager.resize(this.data.width, this.data.height);
          }
        });
      } else if (this.zoneManager) {
        this.zoneManager.resize(this.data.width, this.data.height);
      }
    }
    performance.mark(`${perfId}-after-zone-manager`);

    // Performance profiling: DOM parenting operations
    performance.mark(`${perfId}-before-dom-parenting`);
    // Ensure DOM parenting matches logical parenting for all nodes
    try {
      const parent = this.parentNode;
      if (parent && parent.element && this.element) {
        let desiredParentGroup = parent.element;
        if (parent.isContainer && !parent.collapsed) {
          const innerZone =
            parent.zoneManager?.innerContainerZone ||
            (parent.zoneManager?.ensureInnerContainerZone
              ? parent.zoneManager.ensureInnerContainerZone()
              : null);
          desiredParentGroup = innerZone?.getChildContainer?.() || parent.element;
        }
        const currentParent = this.element.node()?.parentNode || null;
        const desired = desiredParentGroup?.node?.() || null;
        if (desired && currentParent !== desired) {
          desired.appendChild(this.element.node());
        }
      }
    } catch {}
    performance.mark(`${perfId}-after-dom-parenting`);

    // Performance profiling: Event setup
    performance.mark(`${perfId}-before-event-setup`);
    // Set up default events using EventManager
    EventManager.setupDefaultNodeEvents(this);
    performance.mark(`${perfId}-after-event-setup`);

    // Performance profiling: CSS class operations
    performance.mark(`${perfId}-before-css-classes`);
    // Set expanded or collapsed state
    this.element.classed('collapsed', this.collapsed);
    this.element.classed('expanded', !this.collapsed);
    performance.mark(`${perfId}-after-css-classes`);

    // Performance profiling: Visual elements (center mark)
    performance.mark(`${perfId}-before-center-mark`);
    // show the center stip
    if (this.settings.showCenterMark)
      this.element
        .append('use')
        .attr('class', 'centermark')
        .attr('href', '#flowdash-centermark-template');
    performance.mark(`${perfId}-after-center-mark`);

    // Performance profiling: Connection points
    performance.mark(`${perfId}-before-connection-points`);
    // show the connection points
    if (this.settings.showConnectionPoints) {
      // Create a dedicated group to isolate this node's connection points from descendants
      this.connectionPointsGroup = this.element.append('g').attr('class', 'connection-points');
      const connectionPoints = this.computeConnectionPoints(
        0,
        0,
        this.data.width,
        this.data.height,
      );
      Object.values(connectionPoints).forEach((point) => {
        this.connectionPointsGroup
          .append('use')
          .attr('class', `connection-point side-${point.side}`)
          .attr('href', '#flowdash-connection-point-template')
          .attr('x', point.x)
          .attr('y', point.y);
      });
      try {
        if (this.settings.isDebug) {
          const bbox = this.element?.node()?.getBBox?.();
        }
      } catch {}
    }
    performance.mark(`${perfId}-after-connection-points`);

    // Performance profiling: Display change
    performance.mark(`${perfId}-before-display-change`);
    // Skip display change if in pre-render mode or dashboard is suspending changes
    const shouldSkipDisplayChange =
      this.hasPrerenderData && this.__dashboard?._suspendDisplayChange;
    if (!shouldSkipDisplayChange) {
      // Trigger display change after initialization to ensure loading overlay is hidden
      this.handleDisplayChange();
    }
    performance.mark(`${perfId}-after-display-change`);

    // Performance profiling: Create measurements and log
    performance.mark(`${perfId}-end`);
    performance.measure(`${perfId}-total`, `${perfId}-start`, `${perfId}-end`);
    performance.measure(
      `${perfId}-dom-create`,
      `${perfId}-before-dom-create`,
      `${perfId}-after-dom-create`,
    );
    performance.measure(
      `${perfId}-zone-manager`,
      `${perfId}-before-zone-manager`,
      `${perfId}-after-zone-manager`,
    );
    performance.measure(
      `${perfId}-dom-parenting`,
      `${perfId}-before-dom-parenting`,
      `${perfId}-after-dom-parenting`,
    );
    performance.measure(
      `${perfId}-event-setup`,
      `${perfId}-before-event-setup`,
      `${perfId}-after-event-setup`,
    );
    performance.measure(
      `${perfId}-css-classes`,
      `${perfId}-before-css-classes`,
      `${perfId}-after-css-classes`,
    );
    performance.measure(
      `${perfId}-center-mark`,
      `${perfId}-before-center-mark`,
      `${perfId}-after-center-mark`,
    );
    performance.measure(
      `${perfId}-connection-points`,
      `${perfId}-before-connection-points`,
      `${perfId}-after-connection-points`,
    );
    performance.measure(
      `${perfId}-display-change`,
      `${perfId}-before-display-change`,
      `${perfId}-after-display-change`,
    );
  }

  // function to put all the elements in the correct place
  update() {
    // Update zones only for container nodes
    if (this.isContainer && this.zoneManager) {
      this.zoneManager.update();
    }

    if (this.settings.showConnectionPoints) {
      // Use data width/height for containers (exact zone size); for non-containers, allow bbox fallback
      let width = this.data.width;
      let height = this.data.height;
      let bbox = null;
      if (!this.isContainer) {
        try {
          bbox = this.element?.node()?.getBBox();
          if (bbox && bbox.width > 0 && bbox.height > 0) {
            width = bbox.width;
            height = bbox.height;
          }
        } catch {}
      }
      if (this.settings.isDebug) {
      }

      const connectionPoints = this.computeConnectionPoints(0, 0, width, height);
      Object.values(connectionPoints).forEach((point) => {
        // Update only this node's own points (scoped to the dedicated group).
        // Connection points are now <use> elements; their position attributes
        // are `x`/`y` rather than `cx`/`cy`.
        const scope = this.connectionPointsGroup || this.element;
        if (scope) {
          scope
            .select(`.connection-point.side-${point.side}`)
            .attr('x', point.x)
            .attr('y', point.y);
        }
      });
    }
  }

  handleClicked(event, node = this) {
    // Forward the originally clicked node so bubbling preserves the true target
    EventManager.handleNodeClick(this, event, node);
  }

  handleDblClicked(event, node = this) {
    // Forward the originally double-clicked node so bubbling preserves the true target
    EventManager.handleNodeDblClick(this, event, node);
  }

  resize(size, forced = false) {
    // node base has no elements of it's own, so just update the data
    if (forced || this.data.width !== size.width || this.data.height !== size.height) {
      this.data.width = size.width;
      this.data.height = size.height;

      // Resize zones only for container nodes
      if (this.isContainer && this.zoneManager) {
        this.zoneManager.resize(size.width, size.height);
      }

      this.update();

      // Re-position validation indicators against the new bounds. Skip when
      // no error is active to avoid restarting halo/siren animations on
      // every resize.
      if (this._preValidationError || this._postValidationError) {
        this._renderValidationIndicators();
      }

      this.handleDisplayChange();
    }
  }

  getNode(nodeId) {
    if (this.id == nodeId) {
      return this;
    }
    return null;
  }

  getNodesByDatasetId(datasetId) {
    if (this.data.datasetId == datasetId) {
      return [this];
    }
    return [];
  }

  // function to return all the nodes in the graph
  getAllNodes(onlySelected = false, onlyEndNodes = false) {
    if (onlySelected && !this.selected) return [];
    return [this];
  }

  // function to return all the nodes in the graph
  getAllEdges(onlySelected = false, allEdges = []) {
    this.edges.incoming.forEach((edge) => {
      if (!onlySelected || edge.selected) {
        if (allEdges.indexOf(edge) === -1) {
          allEdges.push(edge);
        }
      }
    });
    this.edges.outgoing.forEach((edge) => {
      if (!onlySelected || edge.selected) {
        if (allEdges.indexOf(edge) === -1) {
          allEdges.push(edge);
        }
      }
    });
  }

  isDescendantOf(node) {
    let current = this.parentNode;
    while (current) {
      if (current === node) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  }

  getNeighbors(selector = { incomming: 1, outgoing: 1 }) {
    const neighbors = { nodes: [], edges: [] };

    // Add the incoming neighbors
    if (selector.incomming > 0) {
      this.edges.incoming.forEach((edge) => {
        neighbors.edges.push(edge);
        if (selector.incomming > 1) {
          // Get the neighbors recursively and add them to the neighbors array
          neighbors.nodes.push(
            ...edge.source.getNeighbors({ incomming: selector.incomming - 1, outgoing: 0 }),
          );
        } else {
          // Directly add the source node to the neighbors array
          neighbors.nodes.push(edge.source);
        }
      });
    }

    // Add the current node to the neighbors array
    neighbors.nodes.push(this);

    // Add the outgoing neighbors
    if (selector.outgoing > 0) {
      this.edges.outgoing.forEach((edge) => {
        neighbors.edges.push(edge);
        if (selector.outgoing > 1) {
          // Get the neighbors recursively and add them to the neighbors array
          neighbors.nodes.push(
            ...edge.target.getNeighbors({ incomming: 0, outgoing: selector.outgoing - 1 }),
          );
        } else {
          // Directly add the source node to the neighbors array
          neighbors.nodes.push(edge.target);
        }
      });
    }

    return neighbors;
  }

  getParents() {
    if (!this.parentNode) {
      return [];
    }

    // Defensive check: ensure parentNode has getParents method and it returns an array
    if (typeof this.parentNode.getParents === 'function') {
      const parentParents = this.parentNode.getParents();
      // Ensure the result is an array before spreading
      if (Array.isArray(parentParents)) {
        return [this.parentNode, ...parentParents];
      } else {
        return [this.parentNode];
      }
    } else {
      return [this.parentNode];
    }
  }

  cascadeUpdate() {
    if (this.parentNode) {
      this.parentNode.update();
      this.parentNode.cascadeUpdate();
    }
  }

  cascadeStatusChange() {
    if (
      this.parentNode &&
      typeof this.parentNode.determineStatusBasedOnChildren === 'function' &&
      this.parentNode.element
    ) {
      // Safety check: parent element exists
      this.parentNode.determineStatusBasedOnChildren();
    }
  }

  cascadeRestartSimulation() {
    if (this.simulation) {
      this.simulation.simulation.alphaTarget(0.8).restart();
    }
    if (this.parentNode) {
      this.parentNode.cascadeRestartSimulation();
    }
  }

  cascadeStopSimulation() {
    if (this.simulation) {
      this.simulation.simulation.alphaTarget(0);
    }
    if (this.parentNode) {
      this.parentNode.cascadeStopSimulation();
    }
  }

  // drag
  drag_started(event, node) {
    node.cascadeRestartSimulation();
    event.fx = event.x;
    event.fy = event.y;
    node.element.classed('grabbing', true);
  }

  dragged(event, node) {
    event.fx = event.x;
    event.fy = event.y;

    // move the simulation
    node.move(event.fx, event.fy);
  }

  drag_ended(event, node) {
    node.element.classed('grabbing', false);

    node.cascadeStopSimulation();
  }

  /**
   * Get the effective width of this node for layout calculations
   * This method handles collapsed state internally
   */
  getEffectiveWidth() {
    // Non-containers should ignore collapsed state for effective size
    if (this.isContainer && this.collapsed) {
      // When collapsed, always use minimumSize, not data.width
      // This ensures we get the correct collapsed size even if data.width hasn't been updated yet
      return this.minimumSize?.width || 20; // Default minimum width
    }
    return this.data.width;
  }

  /**
   * Get the effective height of this node for layout calculations
   * This method handles collapsed state internally
   */
  getEffectiveHeight() {
    // Non-containers should ignore collapsed state for effective size
    if (this.isContainer && this.collapsed) {
      // When collapsed, always use minimumSize, not data.height
      // This ensures we get the correct collapsed size even if data.height hasn't been updated yet
      return this.minimumSize?.height || 20; // Default minimum height
    }
    return this.data.height;
  }
}
