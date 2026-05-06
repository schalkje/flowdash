// @ts-check
// Prerender freshness validation.
//
// Pre-render JSONs bake in node positions, sizes, and edge paths from a past
// run of the dashboard. If the underlying data changes (nodes added/removed,
// edges added/removed, layout-affecting settings altered), the baked positions
// are stale and produce a wrong layout — silently. This module computes a
// fingerprint over the inputs that would invalidate the prerender, embeds it
// at generation time, and validates it at load time so we can warn (or later,
// hard-fail) on mismatches.
//
// Settings that affect layout are conservatively included. Status,
// theme, and visibility-only settings do NOT affect layout coordinates and
// therefore do NOT invalidate prerender data — keep the subset small and
// defensible.

const LAYOUT_AFFECTING_SETTINGS = [
  'nodeSpacing',
  'containerMargin',
  'layoutMechanism',
  'horizontal',
];

/**
 * Walk the node tree and collect ids in deterministic (depth-first) order.
 * @param {Array} nodes - top-level nodes array
 * @returns {Array<string|number>} ordered ids
 */
function collectNodeIds(nodes) {
  const out = [];
  const visit = (list) => {
    if (!Array.isArray(list)) return;
    for (const n of list) {
      if (n && n.id !== undefined) out.push(n.id);
      if (n && Array.isArray(n.children)) visit(n.children);
    }
  };
  visit(nodes);
  return out;
}

/**
 * Stable string hash (FNV-1a 32-bit). Cheap, deterministic, no deps. Returns
 * an 8-char hex string.
 * @param {string} str
 * @returns {string}
 */
function fnv1aHex(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function pickLayoutSettings(settings) {
  if (!settings || typeof settings !== 'object') return {};
  const out = {};
  for (const key of LAYOUT_AFFECTING_SETTINGS) {
    if (key in settings) out[key] = settings[key];
  }
  return out;
}

/**
 * Compute a fingerprint over the inputs that would invalidate prerender data:
 * the set of node IDs, the set of edge IDs (or source/target pairs if no
 * edge.id is present), and the layout-affecting settings subset.
 *
 * The fingerprint is order-stable and small (8 hex chars).
 *
 * @param {{nodes?: Array, edges?: Array, settings?: object}} data
 * @returns {string} fingerprint
 */
export function computeFingerprint(data) {
  if (!data) return fnv1aHex('');
  const nodeIds = collectNodeIds(data.nodes || [])
    .slice()
    .sort();
  const edgeKeys = (data.edges || [])
    .map((e) => (e && e.id !== undefined ? `e:${e.id}` : `${e?.source}->${e?.target}`))
    .sort();
  const layout = pickLayoutSettings(data.settings);
  const canonical = JSON.stringify({ nodeIds, edgeKeys, layout });
  return fnv1aHex(canonical);
}

/**
 * Validate that the embedded prerender fingerprint still matches the data.
 *
 * Returns { ok, reason }. `ok === false` means the prerender data is stale
 * and should not be used; the caller should fall back to a cold load.
 *
 * If no fingerprint is embedded (older prerender JSONs), returns
 * { ok: true, reason: 'no-fingerprint' } so we stay backward-compatible —
 * upgrade to hard-fail behind a setting once tooling is stable.
 *
 * @param {{nodes?: Array, edges?: Array, settings?: object}} data
 * @returns {{ok: boolean, reason: string, expected?: string, actual?: string}}
 */
export function validatePrerenderFreshness(data) {
  const meta = data?.settings?.prerenderMetadata;
  if (!meta) return { ok: true, reason: 'no-metadata' };
  const expected = meta.fingerprint;
  if (!expected) return { ok: true, reason: 'no-fingerprint' };
  const actual = computeFingerprint(data);
  if (actual === expected) return { ok: true, reason: 'match', expected, actual };
  return { ok: false, reason: 'mismatch', expected, actual };
}
