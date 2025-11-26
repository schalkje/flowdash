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
    mode: "always", // "hidden" | "always" | "hover" (default: always visible for now)
    position: "bottom-right", // "bottom-right" | "bottom-left" | "top-right" | "top-left"
    size: "m", // tokens: "s" | "m" | "l" or { width, height }
    opacity: 1,
    collapsed: false,
    pinned: false,
    collapsedIcon: { position: "bottom-right" },
    hover: { showDelayMs: 120, hideDelayMs: 300, zoomFitThreshold: 1.0 },
    touch: { autoHideAfterMs: 2500 },
    scaleIndicator: { visible: true, type: "percent", decimals: 0 },
    icons: {
      zoomIn: "plus",
      zoomOut: "minus",
      resetView: "target",
      mode: "eye",
      collapse: "triangle-down",
      expand: "minimap"
    },
    persistence: { persistCollapsedState: true, storageKey: "flowdash:minimap:collapsed" },
    theme: {}
  }
  ,
  zoom: {
    scaleExtent: [0.1, 40],
    epsilonPct: 0.005,
    minTargetBBoxPx: { w: 24, h: 24 }
  }
};

// Default settings for demo pages (other than flowdash-js and flowdash-bundle)
export const DEMO_DEFAULT_SETTINGS = {
  ...DEFAULT_SETTINGS,
  toggleCollapseOnStatusChange: false, // Default false for demo pages
  cascadeOnStatusChange: false, // Default false for demo pages
};

export class ConfigManager {
  static mergeWithDefaults(userSettings, isDemoPage = false) {
    const defaults = isDemoPage ? DEMO_DEFAULT_SETTINGS : DEFAULT_SETTINGS;
    return this.deepMerge(defaults, userSettings);
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
      errors.push("Selector values must be non-negative");
    }
    
    if (settings.containerMargin) {
      const margins = ['top', 'right', 'bottom', 'left'];
      margins.forEach(margin => {
        if (settings.containerMargin[margin] < 0) {
          errors.push(`Container margin ${margin} must be non-negative`);
        }
      });
    }
    
    if (settings.nodeSpacing) {
      if (settings.nodeSpacing.horizontal < 0 || settings.nodeSpacing.vertical < 0) {
        errors.push("node spacing values must be non-negative");
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