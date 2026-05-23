import { ConfigManager } from './configManager.js';

export class ZoomManager {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.lastContentBounds = null;
    this.lastFitK = 1;
    this._syncing = false;
  }

  get zoomSettings() {
    const s = this.dashboard?.data?.settings || {};
    return s.zoom || {};
  }

  approximatelyEqual(a, b) {
    const epsPct = this.zoomSettings.epsilonPct ?? 0.005;
    const epsAbs = 1e-6;
    const eps = Math.max(epsAbs, Math.abs(epsPct * (b || 1)));
    return Math.abs((a || 0) - (b || 0)) <= eps;
  }

  getViewport() {
    // With centered viewBox, viewport center is (0,0) in SVG coordinates
    return {
      width: this.dashboard.main.width || 1,
      height: this.dashboard.main.height || 1,
      cx: 0,
      cy: 0,
    };
  }

  computeFit(contentBounds) {
    const vp = this.getViewport();
    const contentW = Math.max(1, contentBounds.width || 1);
    const contentH = Math.max(1, contentBounds.height || 1);
    const fitK = Math.min(vp.width / contentW, vp.height / contentH);
    const cx = (contentBounds.x || 0) + contentW / 2;
    const cy = (contentBounds.y || 0) + contentH / 2;
    const x = vp.cx - fitK * cx;
    const y = vp.cy - fitK * cy;
    return { fitK, fitTransform: d3.zoomIdentity.translate(x, y).scale(fitK) };
  }

  recomputeBaselineFit() {
    const bounds = this.dashboard.getContentBBox();
    const { fitK, fitTransform } = this.computeFit(bounds);
    this.dashboard.main.fitK = fitK;
    this.dashboard.main.fitTransform = fitTransform;
    this.lastContentBounds = bounds;
    this.lastFitK = fitK;
    this.dashboard.minimap.updateScaleIndicator?.();
    return { fitK, fitTransform, bounds };
  }

  preserveKAndRecenter(oldTransform, oldBounds, newBounds) {
    const k = oldTransform.k || 1;
    // Keep same world center as before (use old content center)
    const worldCx = (oldBounds.x || 0) + (oldBounds.width || 0) / 2;
    const worldCy = (oldBounds.y || 0) + (oldBounds.height || 0) / 2;
    const vp = this.getViewport();
    const x = vp.cx - k * worldCx;
    const y = vp.cy - k * worldCy;
    return d3.zoomIdentity.translate(x, y).scale(k);
  }

  applyTransform(transform, { animate = false, duration = 500 } = {}) {
    // Apply via d3 zoom behavior to keep state and minimap in sync.
    // Returns a Promise that resolves on transition end (animated) or in a
    // microtask (synchronous), so callers like Dashboard.panToBounds can
    // await viewport changes.
    if (animate) {
      return new Promise((resolve) => {
        const transition = this.dashboard.main.svg
          .transition()
          .duration(duration)
          .call(this.dashboard.main.zoom.transform, transform);
        let resolved = false;
        const done = () => {
          if (resolved) return;
          resolved = true;
          resolve();
        };
        transition.on('end', done).on('interrupt', done);
      });
    }
    this.dashboard.main.svg.call(this.dashboard.main.zoom.transform, transform);
    return Promise.resolve();
  }

  /**
   * Clamp a pan-only transform against the diagram's outer content bounds so
   * the viewport never reveals whitespace beyond the diagram. Scale `k` is
   * preserved. When the diagram is smaller than the viewport on an axis,
   * the diagram is centered on that axis.
   *
   * Extracted as a reusable helper (issue #14, task 4.1) so both
   * zoomToBoundingBox and panToBounds can share the clamp.
   */
  clampPanTransform(transform, { contentBounds = null } = {}) {
    const bounds =
      contentBounds || (this.dashboard.getContentBBox ? this.dashboard.getContentBBox() : null);
    if (!bounds) return transform;
    const vp = this.getViewport();
    const k = transform.k || 1;
    const bw = bounds.width || 0;
    const bh = bounds.height || 0;
    let tx = transform.x;
    let ty = transform.y;
    if (bw * k <= vp.width) {
      tx = -k * (bounds.x + bw / 2);
    } else {
      const maxX = -vp.width / 2 - k * bounds.x;
      const minX = vp.width / 2 - k * (bounds.x + bw);
      tx = Math.min(maxX, Math.max(minX, tx));
    }
    if (bh * k <= vp.height) {
      ty = -k * (bounds.y + bh / 2);
    } else {
      const maxY = -vp.height / 2 - k * bounds.y;
      const minY = vp.height / 2 - k * (bounds.y + bh);
      ty = Math.min(maxY, Math.max(minY, ty));
    }
    return d3.zoomIdentity.translate(tx, ty).scale(k);
  }

  initializeZoomBehavior() {
    const s = this.zoomSettings;
    const [minK, maxK] = s.scaleExtent || [0.1, 40];
    const zoom = d3
      .zoom()
      .filter((event) => event?.type !== 'dblclick')
      .scaleExtent([minK, maxK])
      .wheelDelta((event) => -event.deltaY * (event.deltaMode ? 120 : 1) * 0.002)
      .on('zoom', (event) => this.onMainZoom(event));
    return zoom;
  }

  onMainZoom(event) {
    if (this._syncing) return;
    this._syncing = true;
    this.dashboard.main.transform.k = event.transform.k;
    this.dashboard.main.transform.x = event.transform.x;
    this.dashboard.main.transform.y = event.transform.y;
    this.dashboard.main.container.attr('transform', event.transform);
    if (this.dashboard.minimap?.active) {
      this.dashboard.minimap.scheduleUpdate(event.transform);
    }
    this._syncing = false;
  }

  onMinimapZoom(event) {
    if (this._syncing) return;
    this._syncing = true;
    this.dashboard.main.transform.k = event.transform.k;
    this.dashboard.main.transform.x = event.transform.x;
    this.dashboard.main.transform.y = event.transform.y;
    this.dashboard.main.container.attr('transform', event.transform);
    this.dashboard.main.svg.call(this.dashboard.main.zoom.transform, event.transform);
    if (this.dashboard.minimap?.active) {
      this.dashboard.minimap.scheduleUpdate(event.transform);
    }
    this._syncing = false;
  }

  handleLayoutChange() {
    const isInitial = !this.lastContentBounds;
    const initialPhase = (this.dashboard?._displayChangeCount || 0) < 3;
    const oldBounds = this.lastContentBounds || this.dashboard.getContentBBox();
    const oldTransform = { ...(this.dashboard.main.transform || { k: 1, x: 0, y: 0 }) };
    const { fitK, fitTransform, bounds } = this.recomputeBaselineFit();

    // Detect significant content size changes (e.g., collapse/expand)
    const boundsChanged =
      oldBounds &&
      bounds &&
      (Math.abs(bounds.width - oldBounds.width) > oldBounds.width * 0.3 ||
        Math.abs(bounds.height - oldBounds.height) > oldBounds.height * 0.3);

    let target;
    if (isInitial || initialPhase) {
      if (boundsChanged && !isInitial) {
        target = fitTransform;
      } else if (
        isInitial &&
        this.dashboard.data?.settings?.zoomToRoot &&
        this.dashboard.main?.root
      ) {
        this.dashboard._shouldZoomToRootOnInit = true;
        target = fitTransform;
      } else {
        target = fitTransform;
      }
    } else if (boundsChanged) {
      target = fitTransform;
    } else {
      target = this.preserveKAndRecenter(oldTransform, oldBounds, bounds);
    }

    this.applyTransform(target, { animate: false });

    if (this.dashboard._shouldZoomToRootOnInit) {
      this.dashboard._shouldZoomToRootOnInit = false;
      setTimeout(() => {
        if (this.dashboard.main?.root) {
          this.dashboard.handleNodeDblClick(this.dashboard.main.root, null);
        }
      }, 100);
    }
  }

  zoomReset() {
    const target = this.dashboard.main.fitTransform || d3.zoomIdentity;
    this.applyTransform(target, { animate: true, duration: 750 });
    this.dashboard.main.scale = 1;
    if (
      this.dashboard.minimap?.active &&
      this.dashboard.minimap?.zoom &&
      this.dashboard.minimap?.svg
    ) {
      this.dashboard.minimap.svg
        .transition()
        .duration(750)
        .call(this.dashboard.minimap.zoom.transform, target);
    }
  }

  zoomIn() {
    this.dashboard.main.svg.transition().duration(750).call(this.dashboard.main.zoom.scaleBy, 1.2);
    this.dashboard.main.scale = (this.dashboard.main.scale || 1) * 1.2;
  }

  zoomOut() {
    this.dashboard.main.svg.transition().duration(750).call(this.dashboard.main.zoom.scaleBy, 0.8);
    this.dashboard.main.scale = (this.dashboard.main.scale || 1) * 0.8;
  }

  expandToMinimumTarget(bbox) {
    const z = this.zoomSettings;
    const token = z.minTargetBBoxPx || { w: 24, h: 24 };
    const wMin = Math.max(0, token.w || 0);
    const hMin = Math.max(0, token.h || 0);
    if (wMin === 0 || hMin === 0) return bbox;
    const k = this.dashboard.main.transform.k || 1;
    const minWorldW = wMin / k;
    const minWorldH = hMin / k;
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const w = Math.max(bbox.width, minWorldW);
    const h = Math.max(bbox.height, minWorldH);
    return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
  }

  zoomToBoundingBox(bbox, { animate = true, duration = 500, enforceMinimumTarget = true } = {}) {
    const targetBounds = enforceMinimumTarget ? this.expandToMinimumTarget(bbox) : bbox;
    const { fitTransform } = this.computeFit(targetBounds);
    this.applyTransform(fitTransform, { animate, duration });
  }
}

export default ZoomManager;
