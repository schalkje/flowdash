import {
  generateDirectEdge,
  generateEdgePath,
  generateGhostEdge,
  getZoneTransforms,
} from './utilPath.js';

export const EdgeStatus = Object.freeze({
  READY: 'ready',
  ACTIVE: 'active',
  ERROR: 'error',
  WARNING: 'warning',
  UNKNOWN: 'unknown',
  DISABLED: 'disabled',
});

export default class BaseEdge {
  constructor(edgeData, parents, settings) {
    this.data = edgeData;
    this.parents = parents;
    this.settings = settings;
    this._status = EdgeStatus.UNKNOWN;
    this._selected = false;
    this.onClick = null;
    this.onDblClick = null;

    this.element = null;
    this.ghostElement = null;

    this.data.active ??= true;
    this.data.type ??= 'unknown';

    if (!this.settings) this.settings = {};
    this.settings.showGhostlines ??= false;
    this.settings.showEdges ??= true;
    this.settings.curved ??= false;
    this.settings.curveMargin ??= this.settings.curved ? 0.1 : 0;

    // Use provided id from edgeData if available
    // Generate fallback id only if no id was provided
    // Note: this.source and this.target are available via getters
    if (this.data.id) {
      this.id = this.data.id;
    } else {
      // Fallback: generate ID from source--type--target
      this.id = `${this.source.id}--${this.data.type}--${this.target.id}`;
    }
  }

  get label() {
    return `${this.source.data.label} --${this.data.type}--> ${this.target.data.label}`;
  }

  get parent() {
    if (!this.parents || !this.parents.container) {
      console.error('No parent or container for edge:', this.id);
      return null;
    }
    return this.parents.container;
  }

  get sourceIndex() {
    for (let i = this.parents.source.length - 1; i > 0; i--) {
      if (this.parents.source[i].collapsed) return i;
    }

    return 0;
  }

  get source() {
    return this.parents.source[this.sourceIndex];
  }

  get targetIndex() {
    for (let i = this.parents.target.length - 1; i > 0; i--) {
      if (this.parents.target[i].collapsed) return i;
    }

    return 0;
  }

  get target() {
    return this.parents.target[this.targetIndex];
  }

  get status() {
    return this._status;
  }

  set status(value) {
    this._status = value;
    if (this.element) {
      this.element.attr('status', value);
    }
  }

  get selected() {
    return this._selected;
  }

  set selected(value) {
    this._selected = value;
    if (!this.element) {
      console.warn('No element to select.');
      return;
    }
    this.element.classed('selected', this._selected);
  }

  /**
   * Compute the global endpoint position for one side of the edge.
   *
   * The original four getters (x1, y1, x2, y2) each walked the parent chain
   * three times (sourceIndex, correction, positionalCorrection) and called
   * getZoneTransforms separately — 16 chain walks per edge update. This
   * helper walks the chain once and returns both x and y from a single pass.
   *
   * @param {'source' | 'target'} side
   * @returns {{x: number, y: number} | null}
   * @private
   */
  _computeEndpoint(side) {
    const parents = this.parents[side];
    if (!parents || parents.length === 0) return null;

    // Inline sourceIndex / targetIndex: first ancestor (from leaf upward) that
    // is collapsed becomes the visible endpoint; otherwise the leaf itself.
    let endpointIndex = 0;
    for (let i = parents.length - 1; i > 0; i--) {
      if (parents[i].collapsed) {
        endpointIndex = i;
        break;
      }
    }
    const endpoint = parents[endpointIndex];
    if (!endpoint) return null;

    // Single chain walk to accumulate nestedCorrection (skip endpointIndex+1
    // because that immediate parent's inner-zone translate is added via
    // getZoneTransforms below) and positionalCorrection (group transforms).
    let correctionX = 0,
      correctionY = 0;
    let positionalX = 0,
      positionalY = 0;
    for (let i = endpointIndex + 1; i < parents.length; i++) {
      const ancestor = parents[i];
      if (i >= endpointIndex + 2) {
        correctionX += ancestor.nestedCorrection_x;
        correctionY += ancestor.nestedCorrection_y;
      }
      if (typeof ancestor.x === 'number') positionalX += ancestor.x;
      if (typeof ancestor.y === 'number') positionalY += ancestor.y;
    }

    const zoneTransforms = getZoneTransforms(endpoint);
    return {
      x: endpoint.x + correctionX + zoneTransforms.x + positionalX,
      y: endpoint.y + correctionY + zoneTransforms.y + positionalY,
    };
  }

  get x1() {
    if (!this.source) return null;
    const ep = this._computeEndpoint('source');
    return ep ? ep.x : null;
  }

  get y1() {
    if (!this.source) return null;
    const ep = this._computeEndpoint('source');
    return ep ? ep.y : null;
  }

  get x2() {
    if (!this.target) return null;
    const ep = this._computeEndpoint('target');
    return ep ? ep.x : null;
  }

  get y2() {
    if (!this.target) return null;
    const ep = this._computeEndpoint('target');
    return ep ? ep.y : null;
  }

  get sourcePoint() {
    return [this.x1, this.y1];
  }

  get targetPoint() {
    return [this.x2, this.y2];
  }

  init(parentElement = null) {
    if (parentElement) this.parentElement = parentElement;

    // Create ghostlines
    if (this.settings.showGhostlines) {
      this.ghostElement = this.parent.ghostContainer.append('g').attr('class', `edge ghostline`);

      this.ghostElement.append('path').attr('class', 'path');
    }

    // Create edge
    if (this.settings.showEdges) {
      this.element = this.parent.edgesContainer
        .append('g')
        .attr('class', `edge ${this.data.type}`)
        .attr('id', this.id)
        .on('click', (event) => {
          if (event) event.stopPropagation();
          this.handleClicked(event);
        })
        .on('dblclick', (event) => {
          if (event) event.stopPropagation();
          this.handleDblClicked(event);
        });

      this.element.append('path').attr('class', 'path');
    }

    this.update();
  }

  update() {
    if (this.settings.showGhostlines) {
      const ghostEdge = generateGhostEdge(this);
      const ghostLine = this.ghostlineGenerator();

      this.ghostElement.select('.path').attr('d', ghostLine(ghostEdge));
    }

    // Draw edges
    if (this.settings.showEdges && this.element) {
      const edge = generateEdgePath(this);
      const line = this.lineGenerator();

      this.element.select('.path').attr('d', line(edge));
    }
  }

  ghostlineGenerator(edge) {
    return d3.line();
  }

  lineGenerator(edge) {
    if (this.settings.curved) {
      return d3.line().curve(d3.curveBasis);
    } else {
      return d3.line();
    }
  }

  handleClicked(event, edge = this) {
    this.selected = !this.selected;

    if (this.onClick) {
      this.onClick(edge);
    } else if (this.settings?.isDebug) {
      console.warn(`No onClicked handler, edge ${edge.id} clicked!`);
    }
  }

  handleDblClicked(event, edge = this) {
    if (this.onDblClick) {
      this.onDblClick(edge);
    } else if (this.settings?.isDebug) {
      console.warn(`No onDblClick handler, edge ${edge.id} double-clicked!`);
    }
  }
}
