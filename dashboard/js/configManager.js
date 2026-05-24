// Configuration Manager for centralized settings management
export const DEFAULT_SETTINGS = {
  selector: { incomming: 1, outgoing: 1 },
  showBoundingBox: true,
  zoomToRoot: true,
  toggleCollapseOnStatusChange: true, // Default true for flowdash-js and flowdash-bundle
  cascadeOnStatusChange: true, // Default true for flowdash-js and flowdash-bundle
  showCenterMark: false,
  showConnectionPoints: false,
  showInnerZoneRect: false,
  containerMargin: { top: 8, right: 8, bottom: 8, left: 8 },
  nodeSpacing: { horizontal: 20, vertical: 10 },
  usePrerender: true, // Use pre-render data for fast initial load (one-time only, cleared after load)
  prerenderSkipZoneCalculations: true, // Skip zone calculations during pre-render initial load
  prerenderMetadata: null, // Optional metadata about pre-render generation (informational only)
  minimap: {
    enabled: true,
    // If omitted in API: desktop → hover, small screens → hidden
    mode: 'always', // "hidden" | "always" | "hover" (default: always visible for now)
    position: 'bottom-right', // "bottom-right" | "bottom-left" | "top-right" | "top-left"
    size: 'm', // tokens: "s" | "m" | "l" or { width, height }
    opacity: 1,
    collapsed: false,
    pinned: false,
    // Skip the deferred auto-init when the dashboard has more than this many
    // nodes — the minimap mirrors every node into a parallel SVG, which can
    // dominate post-init time on large fixtures. Above the threshold the
    // minimap is created lazily on the first call to `dashboard.initMinimap()`
    // (e.g. from a UI button). Set `null` or `Infinity` to always auto-init.
    autoInitMaxNodes: 500,
    collapsedIcon: { position: 'bottom-right' },
    hover: { showDelayMs: 120, hideDelayMs: 300, zoomFitThreshold: 1.0 },
    touch: { autoHideAfterMs: 2500 },
    scaleIndicator: { visible: true, type: 'percent', decimals: 0 },
    icons: {
      zoomIn: 'plus',
      zoomOut: 'minus',
      resetView: 'target',
      mode: 'eye',
      collapse: 'triangle-down',
      expand: 'minimap',
    },
    persistence: { persistCollapsedState: true, storageKey: 'flowdash:minimap:collapsed' },
    theme: {},
  },
  zoom: {
    scaleExtent: [0.1, 40],
    epsilonPct: 0.005,
    minTargetBBoxPx: { w: 24, h: 24 },
  },
  // Validation indicators. Orthogonal to NodeStatus — see
  // /dashboard/documentation/validation-indicators.md.
  //
  // Canonical setting: validationIndicatorMode. Three minimal modes render the
  // full 8-state vocabulary; four loud styles render only when state==='error'.
  // The legacy validationIndicator.style slot is kept for back-compat and is
  // synchronized with validationIndicatorMode at runtime.
  validationIndicatorMode: 'minimal-bar', // 'minimal-bar' | 'minimal-circle' | 'minimal-corner' | 'pulse-halo' | 'rotating-siren' | 'industrial-tape' | 'police-line' | 'none'
  validationIndicator: {
    style: 'minimal-bar', // legacy alias for validationIndicatorMode
    size: 'normal', // 'normal' (1×) | 'large' (1.5×) | 'big' (2×) | 'huge' (4×) | 'gigantic' (8×) — loud styles only
    glyph: '!', // loud styles only
    animate: true,
  },
};

// Default settings for demo pages (other than flowdash-js and flowdash-bundle).
// Activated via `data.settings.demoMode === true` — see ConfigManager.mergeWithDefaults.
export const DEMO_DEFAULT_SETTINGS = {
  ...DEFAULT_SETTINGS,
  toggleCollapseOnStatusChange: false, // demos don't auto-collapse on status
  cascadeOnStatusChange: false,
  showBoundingBox: false, // demos hide the canvas bounding box (selection demo opts back in)
};

// Non-enumerable marker placed on a merged settings object so subsequent
// mergeWithDefaults calls on the same object can short-circuit. The initial
// merge at the Dashboard level creates one merged object that gets passed
// down through the createNode factory chain to every node; without the
// marker, every node's BaseNode constructor would re-walk the entire defaults
// tree and re-allocate the full nested settings shape (177 times on the
// theme-overview page — visible as a large unaccounted chunk of
// nodeInitialization).
const MERGED_MARKER = '__flowdashSettingsMerged';

export class ConfigManager {
  static mergeWithDefaults(userSettings, isDemoPage = false) {
    if (userSettings && userSettings[MERGED_MARKER]) return userSettings;
    const settings = userSettings || {};
    const useDemo = isDemoPage || settings.demoMode === true;
    const defaults = useDemo ? DEMO_DEFAULT_SETTINGS : DEFAULT_SETTINGS;
    const merged = this.deepMerge(defaults, settings);
    Object.defineProperty(merged, MERGED_MARKER, {
      value: true,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    return merged;
  }

  static deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  static validateSettings(settings) {
    const errors = [];

    if (settings.selector && (settings.selector.incomming < 0 || settings.selector.outgoing < 0)) {
      errors.push('Selector values must be non-negative');
    }

    if (settings.containerMargin) {
      const margins = ['top', 'right', 'bottom', 'left'];
      margins.forEach((margin) => {
        if (settings.containerMargin[margin] < 0) {
          errors.push(`Container margin ${margin} must be non-negative`);
        }
      });
    }

    if (settings.nodeSpacing) {
      if (settings.nodeSpacing.horizontal < 0 || settings.nodeSpacing.vertical < 0) {
        errors.push('node spacing values must be non-negative');
      }
    }

    return errors;
  }

  static getDefaultContainerMargin() {
    return { ...DEFAULT_SETTINGS.containerMargin };
  }

  static getDefaultNodeSpacing() {
    return { ...DEFAULT_SETTINGS.nodeSpacing };
  }
}
