// Shared runtime for the themes-grid pages under 01_basicNodes/03_states/.
// Each page renders a grid of iframes, one per theme, all driving the same
// FlowDash demo dataset. This module owns:
//   - Building the iframe cards.
//   - Bootstrapping each iframe with the right CSS + libs + dashboard.
//   - The per-card "fullscreen" overlay button (escapes its grid cell to cover
//     the whole viewport, on top of the other cards).
//   - The page-level "Expand all / Collapse all" toggle, with **expand-all as
//     the default** when the page first loads.

const DEFAULT_THEMES = [
  'light',
  'dark',
  'brutalism',
  'cyberpunk',
  'flat',
  'glassmorphism',
  'neumorphism',
  'retro',
  'high-contrast-light',
  'high-contrast-dark',
];

/**
 * Build the themes-grid page.
 *
 * @param {{
 *   dataFile: string,            // e.g. './js/graphData.adapters-collapsed.js'
 *   gridSelector?: string,       // default '#grid'
 *   toggleBtnSelector?: string,  // default '#toggle-all'
 *   themes?: string[],           // default DEFAULT_THEMES
 *   autoExpand?: boolean,        // default true
 * }} config
 */
export function setupThemesGrid(config) {
  const {
    dataFile,
    gridSelector = '#grid',
    toggleBtnSelector = '#toggle-all',
    themes = DEFAULT_THEMES,
    autoExpand = true,
  } = config;

  if (!dataFile) throw new Error('setupThemesGrid: dataFile is required');

  installFullscreenOverlayCss();
  buildGrid({ dataFile, gridSelector, themes });
  installFullscreenOverlayListener();
  wireToggleAllButton(toggleBtnSelector);
  if (autoExpand) scheduleExpandAll();
}

/* ------------------------------- internals ------------------------------- */

function installFullscreenOverlayCss() {
  if (document.getElementById('themes-grid-runtime-css')) return;
  const style = document.createElement('style');
  style.id = 'themes-grid-runtime-css';
  style.textContent = `
    .card.card--fullscreen {
      position: fixed;
      inset: 0;
      width: 100vw !important;
      height: 100vh !important;
      max-width: none !important;
      max-height: none !important;
      margin: 0;
      border-radius: 0;
      z-index: 9999;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.45);
    }
    .card.card--fullscreen iframe { height: calc(100vh - 32px); }
  `;
  document.head.appendChild(style);
}

function buildGrid({ dataFile, gridSelector, themes }) {
  const grid = document.querySelector(gridSelector);
  if (!grid) throw new Error(`grid container ${gridSelector} not found`);

  themes.forEach((theme) => {
    const card = document.createElement('div');
    card.className = 'card';

    const title = document.createElement('h3');
    title.textContent = theme;
    card.appendChild(title);

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', `Dashboard theme: ${theme}`);
    iframe.srcdoc = renderIframeSrcdoc({ theme, dataFile });

    iframe.addEventListener('load', () => bootstrapIframe(iframe, theme, dataFile));

    card.appendChild(iframe);
    grid.appendChild(card);
  });
}

function renderIframeSrcdoc({ theme, dataFile }) {
  // Bare HTML; we inject d3 + the demo module after the iframe loads.
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body { height: 100%; margin: 0; }
      body { display: flex; }
      .wrap { flex: 1 1 auto; display: flex; }
      svg#graph.canvas { width: 100%; height: 100%; border: 1px solid #ddd; }
      /* Make sure the dashboard's fullscreen overlay (containing the toggle)
         is reachable; the prior inline scripts hid it. */
      .fullscreen-overlay { display: block !important; }
    </style>
    <link rel="stylesheet" href="../../dashboard/flowdash.css" />
    <link rel="stylesheet" href="../../dashboard/themes/${theme}/flowdash.css" />
  </head>
  <body>
    <div class="wrap"><svg id="graph" class="canvas"></svg></div>
  </body>
</html>`;
}

function bootstrapIframe(iframe, theme, dataFile) {
  const doc = iframe.contentDocument;
  if (!doc) return;

  const addScript = (src) =>
    new Promise((resolve, reject) => {
      const s = doc.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load ' + src));
      doc.head.appendChild(s);
    });

  // d3 libs must load in order so each global is available when the next runs.
  Promise.resolve()
    .then(() => addScript('../../dashboard/libs/d3.min.js'))
    .then(() => addScript('../../dashboard/libs/d3-shape.min.js'))
    .then(() => addScript('../../dashboard/libs/d3-dag.iife.min.js'))
    .then(() => {
      const mod = doc.createElement('script');
      mod.type = 'module';
      mod.textContent = renderModuleScript({ dataFile });
      doc.body.appendChild(mod);
    })
    .catch((err) => {
      console.error(`themes-grid: failed bootstrap for theme '${theme}':`, err);
    });
}

/**
 * The script that runs inside each iframe. It:
 *   1. Imports the demo data and the FlowDash entry.
 *   2. Initializes the dashboard.
 *   3. Auto-clicks the dashboard's built-in fullscreen-toggle so the SVG
 *      fills the iframe.
 *   4. Replaces that button's click handler so subsequent user clicks post a
 *      message to the parent window to toggle a card-level fullscreen overlay
 *      (which physically resizes the iframe to cover the parent viewport).
 */
function renderModuleScript({ dataFile }) {
  return `
    import { demoData } from '${dataFile}';
    import flowDashboard from '../../dashboard/js/index.js';

    const data = {
      ...demoData,
      settings: { ...demoData.settings, minimap: { enabled: false } },
    };
    const flowdash = new flowDashboard.Dashboard(data);
    window.flowdash = flowdash;

    // Wait for the dashboard's button to actually exist (initialize is async
    // and the fullscreen-toggle is created near the end of the init pass).
    function waitForButton(timeoutMs = 6000) {
      return new Promise((resolve) => {
        const start = Date.now();
        const tick = () => {
          const btn = document.querySelector('.fullscreen-toggle');
          if (btn) return resolve(btn);
          if (Date.now() - start > timeoutMs) return resolve(null);
          requestAnimationFrame(tick);
        };
        tick();
      });
    }

    (async () => {
      await flowdash.initialize('#graph');
      const btn = await waitForButton();
      if (!btn) return;

      // 1) Auto-click once so the dashboard fills the iframe at small size.
      if (!flowdash.main.svg.classed('flowdash-fullscreen')) {
        try { btn.click(); } catch {}
      }

      // 2) Replace the button so further clicks ask the parent to make the
      //    card cover the whole viewport (over the other cards), instead of
      //    toggling the dashboard's internal fullscreen state again.
      //    cloneNode(true) drops the dashboard's onclick property — exactly
      //    what we want here.
      const replacement = btn.cloneNode(true);
      replacement.title = 'Maximize this card over the grid';
      btn.parentNode.replaceChild(replacement, btn);
      let cardOverlayed = false;
      replacement.addEventListener('click', () => {
        cardOverlayed = !cardOverlayed;
        replacement.classList.toggle('fullscreen-active', cardOverlayed);
        try {
          window.parent.postMessage(
            { type: 'flowdash-card-fullscreen', state: cardOverlayed },
            '*',
          );
        } catch {}
        // Let the new card geometry settle, then trigger the dashboard's own
        // resize handler so the SVG re-measures.
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      });
    })();
  `;
}

function installFullscreenOverlayListener() {
  window.addEventListener('message', (e) => {
    if (!e?.data || e.data.type !== 'flowdash-card-fullscreen') return;
    document.querySelectorAll('.card iframe').forEach((iframe) => {
      if (iframe.contentWindow === e.source) {
        iframe.parentElement.classList.toggle('card--fullscreen', !!e.data.state);
      }
    });
  });
}

/* ----------------------- expand-all / collapse-all ----------------------- */

function getChildContainers(win) {
  const root = win?.flowdash?.main?.root;
  if (!root || typeof root.getAllNodes !== 'function') {
    return { root: null, containers: [] };
  }
  const nodes = root.getAllNodes(false);
  const containers = nodes.filter((n) => n && n.isContainer && n !== root);
  return { root, containers };
}

function computeAnyExpandedAcross() {
  let any = false;
  document.querySelectorAll('.card iframe').forEach((iframe) => {
    const { containers } = getChildContainers(iframe.contentWindow);
    if (containers.length && containers.some((n) => !n.collapsed)) any = true;
  });
  return any;
}

function readyIframeCount() {
  let count = 0;
  document.querySelectorAll('.card iframe').forEach((iframe) => {
    const { containers } = getChildContainers(iframe.contentWindow);
    if (containers.length > 0) count++;
  });
  return count;
}

function setAllCollapsed(target) {
  document.querySelectorAll('.card iframe').forEach((iframe) => {
    const { root, containers } = getChildContainers(iframe.contentWindow);
    if (!root || !containers.length) return;
    try {
      root.collapsed = false;
    } catch {}
    containers.forEach((n) => {
      try {
        n.collapsed = target;
      } catch {}
    });
  });
}

function updateButtonLabel(toggleBtnSelector) {
  const btn = document.querySelector(toggleBtnSelector);
  if (!btn) return;
  btn.textContent = computeAnyExpandedAcross() ? 'Collapse all' : 'Expand all';
}

function wireToggleAllButton(toggleBtnSelector) {
  const btn = document.querySelector(toggleBtnSelector);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const target = computeAnyExpandedAcross() ? true : false;
    setAllCollapsed(target);
    updateButtonLabel(toggleBtnSelector);
  });
  try {
    updateButtonLabel(toggleBtnSelector);
  } catch {}
}

function scheduleExpandAll(opts = {}) {
  // Wait for ALL iframes to be ready before expanding (otherwise the iframes
  // that finish later stay in the data's initial collapsed state). After the
  // initial sweep, do a couple of follow-up passes to catch any stragglers.
  const { maxWaitMs = 18000, pollMs = 200 } = opts;
  const expected = document.querySelectorAll('.card iframe').length || 1;
  const start = Date.now();
  let expanded = false;

  const expandAndUpdate = () => {
    setAllCollapsed(false);
    try {
      updateButtonLabel('#toggle-all');
    } catch {}
  };

  const tick = () => {
    const ready = readyIframeCount();
    if (ready >= expected) {
      expandAndUpdate();
      expanded = true;
      // One follow-up pass after a beat, in case any iframe was mid-init.
      setTimeout(expandAndUpdate, 500);
      return;
    }
    if (Date.now() - start > maxWaitMs) {
      // Time's up — expand whatever is ready and accept the rest may stay
      // collapsed if they never finished loading.
      if (!expanded) expandAndUpdate();
      return;
    }
    setTimeout(tick, pollMs);
  };
  tick();
}
