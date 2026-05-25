// @ts-check
//
// Validation indicators — orthogonal to NodeStatus.
//
// A node carries `preValidationState` (input side, left edge) and
// `postValidationState` (output side, right edge), each `{ state, message? }`
// where state is one of the 8-value vocabulary defined in nodeBase.js.
//
// Two orthogonal style axes, composed per side by resolveEffectiveStyleForSide:
//   validationMode      — baseline indicator (bar / circle / corner / none).
//                         Renders every state ≠ 'na'.
//   validationLoudError — error-only overlay (pulse / siren / tape / police / none).
//                         Fires only on state === 'error'; replaces the baseline
//                         on that side.
//
// See /dashboard/documentation/validation-indicators.md for the spec.

// Two orthogonal axes — see resolveEffectiveStyleForSide() for composition.
//   Baseline styles render every visible state ≠ 'na'.
//   Loud styles fire only when state === 'error' and replace the baseline.
export const VALIDATION_BASELINE_STYLES = Object.freeze(['none', 'bar', 'circle', 'corner']);
export const VALIDATION_LOUD_STYLES = Object.freeze(['none', 'pulse', 'siren', 'tape', 'police']);

// Full union of allowed style values across both axes. Used by the renderer
// to validate the incoming opts and by tests / debug logs.
export const VALIDATION_STYLES = Object.freeze([
  'none',
  'bar',
  'circle',
  'corner',
  'pulse',
  'siren',
  'tape',
  'police',
]);

const BASELINE_SET = new Set(VALIDATION_BASELINE_STYLES);
const LOUD_SET = new Set(VALIDATION_LOUD_STYLES);
const STYLE_SET = new Set(VALIDATION_STYLES);

// State→color fallbacks. Themes override via the matching CSS custom property
// (--fd-validation-state-<name>) on dashboard/themes/<name>/flowdash.css. 'na'
// is not in this map — when a side's state is 'na' the renderer emits no DOM.
const STATE_FALLBACK = Object.freeze({
  error: '#c8181d',
  warning: '#f2c70b',
  ok: '#1f8a3d',
  busy: '#2563eb',
  ready: '#cbd5e1',
  unknown: '#9ca3af',
  disabled: '#4b5563',
});

function colorForState(state) {
  return `var(--fd-validation-state-${state}, ${STATE_FALLBACK[state] || '#9ca3af'})`;
}

// Size tokens → scale factor applied to disc radius, halo expansion, siren
// beam length, tape band width, police strap height and the glyph font.
// Geometry that follows the node bounds (tape band height, police strap
// length) stays anchored to the node and is NOT scaled — otherwise a "huge"
// indicator would extend well past the node body.
export const VALIDATION_SIZES = Object.freeze(['normal', 'large', 'big', 'huge', 'gigantic']);
const SIZE_SCALES = Object.freeze({
  normal: 1,
  large: 1.5,
  big: 2,
  huge: 4,
  gigantic: 8,
});

let _idCounter = 0;
function uid(prefix) {
  _idCounter += 1;
  return `${prefix}-${_idCounter}`;
}

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// Single source of truth for animation gating. Honours an explicit
// opts.animate=false **or** the user's prefers-reduced-motion preference.
// Exported so tests can spy on it / consumers can compose with it.
export function shouldAnimate(opts) {
  if (opts && opts.animate === false) return false;
  return !prefersReducedMotion();
}

/**
 * Pure: resolves the style to render for a single side given the two axes
 * and the side's state. Returns the style name (one of VALIDATION_STYLES,
 * minus 'none') or `null` for "emit no DOM."
 *
 * @param {string} validationMode      one of VALIDATION_BASELINE_STYLES
 * @param {string} validationLoudError one of VALIDATION_LOUD_STYLES
 * @param {string} state               one of the 8-state vocabulary
 * @returns {string|null}
 */
export function resolveEffectiveStyleForSide(validationMode, validationLoudError, state) {
  if (state === 'na') return null;
  if (state === 'error' && validationLoudError !== 'none') return validationLoudError;
  if (validationMode !== 'none') return validationMode;
  return null;
}

/**
 * Idempotent: removes any existing indicator layer and re-paints from scratch
 * based on the supplied pre/post validation states and the two-axis config.
 *
 * @param {*} nodeG       D3 selection of the node's <g>
 * @param {object} opts
 * @param {number} opts.width   effective node width
 * @param {number} opts.height  effective node height
 * @param {string} [opts.validationMode]      one of VALIDATION_BASELINE_STYLES; defaults to 'bar'
 * @param {string} [opts.validationLoudError] one of VALIDATION_LOUD_STYLES; defaults to 'none'
 * @param {string} [opts.size]    one of VALIDATION_SIZES (loud overlay only); defaults to 'normal'
 * @param {string} [opts.glyph]   single character drawn in pulse/siren disc; default '!'
 * @param {boolean} [opts.animate] enable animations; default true (honours prefers-reduced-motion)
 * @param {{state: string, message?: string}} opts.preState   pre-validation state object
 * @param {{state: string, message?: string}} opts.postState  post-validation state object
 */
export function renderValidationIndicators(nodeG, opts) {
  if (!nodeG || typeof nodeG.node !== 'function') return;
  clearValidationIndicators(nodeG);

  const validationMode = BASELINE_SET.has(opts.validationMode) ? opts.validationMode : 'bar';
  const validationLoudError = LOUD_SET.has(opts.validationLoudError)
    ? opts.validationLoudError
    : 'none';

  // Fast path: both axes off — never any DOM.
  if (validationMode === 'none' && validationLoudError === 'none') return;

  const preState = opts.preState || { state: 'na' };
  const postState = opts.postState || { state: 'na' };

  const preStyle = resolveEffectiveStyleForSide(
    validationMode,
    validationLoudError,
    preState.state,
  );
  const postStyle = resolveEffectiveStyleForSide(
    validationMode,
    validationLoudError,
    postState.state,
  );

  if (preStyle === null && postStyle === null) return;

  const w = Number(opts.width) || 0;
  const h = Number(opts.height) || 0;
  if (w <= 0 || h <= 0) return;

  const animate = shouldAnimate({ animate: opts.animate });

  const layer = nodeG
    .append('g')
    .attr('class', 'validation-indicators')
    .attr('data-validation-mode', validationMode)
    .attr('data-validation-loud-error', validationLoudError);

  const messages = [];
  if (preState.state === 'error' || preState.state === 'warning') {
    if (typeof preState.message === 'string' && preState.message) {
      messages.push(`pre: ${preState.message}`);
    }
  }
  if (postState.state === 'error' || postState.state === 'warning') {
    if (typeof postState.message === 'string' && postState.message) {
      messages.push(`post: ${postState.message}`);
    }
  }
  if (messages.length) layer.attr('aria-label', messages.join(' · '));

  const glyph = opts.glyph ?? '!';
  const sizeKey = opts.size && SIZE_SCALES[opts.size] ? opts.size : 'normal';
  const sizeScale = SIZE_SCALES[sizeKey];
  layer.attr('data-size', sizeKey);

  if (preStyle !== null)
    drawForSide(layer, 'pre', preStyle, preState, w, h, animate, sizeScale, glyph);
  if (postStyle !== null)
    drawForSide(layer, 'post', postStyle, postState, w, h, animate, sizeScale, glyph);
}

// Dispatch to the right drawer based on which axis the resolved style belongs to.
function drawForSide(layer, side, style, stateObj, w, h, animate, sizeScale, glyph) {
  if (BASELINE_SET.has(style)) {
    drawBaseline(layer, side, stateObj, style, w, h, animate);
    return;
  }
  if (LOUD_SET.has(style)) {
    const anchorX = side === 'pre' ? -w / 2 : w / 2;
    const message =
      stateObj.message && typeof stateObj.message === 'string' ? stateObj.message : null;
    drawLoudSide(layer, side, {
      anchorX,
      width: w,
      height: h,
      glyph,
      animate,
      style,
      sizeScale,
      message,
    });
  }
}

export function clearValidationIndicators(nodeG) {
  if (!nodeG || typeof nodeG.node !== 'function') return;
  const parent = nodeG.node();
  if (!parent || !parent.childNodes) return;
  // Scope removal to direct children of the node group, matching by exact
  // class token rather than substring.
  for (let i = parent.childNodes.length - 1; i >= 0; i -= 1) {
    const child = parent.childNodes[i];
    if (
      child.nodeType === 1 &&
      child.classList &&
      child.classList.contains('validation-indicators')
    ) {
      parent.removeChild(child);
    }
  }
}

function drawLoudSide(layer, side, ctx) {
  const g = layer
    .append('g')
    .attr('class', `validation-indicator side-${side}`)
    .attr('data-side', side)
    .attr('data-validation-style', ctx.style)
    .attr('data-validation-state', 'error');

  if (ctx.message) {
    g.append('title').text(ctx.message);
  }

  switch (ctx.style) {
    case 'siren':
      return drawSiren(g, side, ctx);
    case 'tape':
      return drawTape(g, side, ctx);
    case 'police':
      return drawPolice(g, side, ctx);
    case 'pulse':
    default:
      return drawPulse(g, side, ctx);
  }
}

// --- Reusable bits ---------------------------------------------------------

function drawDisc(parent, cx, cy, r, glyph, fontSize = 13) {
  parent
    .append('circle')
    .attr('class', 'disc')
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', r)
    .attr('fill', 'var(--fd-validation-red, #c8181d)');
  parent
    .append('circle')
    .attr('class', 'disc-ring')
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', r)
    .attr('fill', 'none')
    .attr('stroke', 'var(--fd-validation-red-deep, #4a0606)')
    .attr('stroke-width', 0.8);
  parent
    .append('text')
    .attr('class', 'glyph')
    .attr('x', cx)
    .attr('y', cy + fontSize * 0.32)
    .attr('text-anchor', 'middle')
    .attr('pointer-events', 'none')
    .attr('font-size', fontSize)
    .attr('font-weight', 800)
    .attr('font-family', 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif')
    .attr('fill', 'var(--fd-validation-text-on-red, #ffffff)')
    .text(glyph);
}

// --- Style: Pulse ----------------------------------------------------------

function drawPulse(g, side, ctx) {
  const cx = ctx.anchorX;
  const cy = 0;
  const r = 11 * ctx.sizeScale;
  const fontSize = 13 * ctx.sizeScale;

  const halo = g
    .append('circle')
    .attr('class', 'halo')
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', r)
    .attr('fill', 'none')
    .attr('stroke', 'var(--fd-validation-red, #c8181d)')
    .attr('stroke-width', 2)
    .attr('opacity', 0.7);

  if (ctx.animate) {
    halo
      .append('animate')
      .attr('attributeName', 'r')
      .attr('values', `${r};${r * 2.1}`)
      .attr('dur', '1.6s')
      .attr('repeatCount', 'indefinite');
    halo
      .append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '0.7;0')
      .attr('dur', '1.6s')
      .attr('repeatCount', 'indefinite');
  } else {
    halo.attr('opacity', 0.45);
  }

  drawDisc(g, cx, cy, r, ctx.glyph, fontSize);
}

// --- Style: Siren ----------------------------------------------------------

function drawSiren(g, side, ctx) {
  const cx = ctx.anchorX;
  const cy = 0;
  const s = ctx.sizeScale;
  const r = 11 * s;
  const fontSize = 13 * s;
  const beamLong = 26 * s;
  const beamShort = 9 * s;
  const beamArc = 28 * s;

  const gradId = uid('fd-siren-beam');
  const defs = g.append('defs');
  const grad = defs
    .append('radialGradient')
    .attr('id', gradId)
    .attr('cx', '0%')
    .attr('cy', '50%')
    .attr('r', '100%');
  grad
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', 'var(--fd-validation-red, #c8181d)')
    .attr('stop-opacity', 0.85);
  grad
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', 'var(--fd-validation-red, #c8181d)')
    .attr('stop-opacity', 0);

  const center = g.append('g').attr('transform', `translate(${cx}, ${cy})`);

  const beams = center.append('g').attr('class', 'siren-beams');
  const beamPath = `M 0,0 L ${beamLong},${-beamShort} A ${beamArc},${beamArc} 0 0,1 ${beamLong},${beamShort} Z`;
  beams.append('path').attr('d', beamPath).attr('fill', `url(#${gradId})`);
  beams
    .append('path')
    .attr('d', beamPath)
    .attr('fill', `url(#${gradId})`)
    .attr('transform', 'rotate(180)');

  if (ctx.animate) {
    beams
      .append('animateTransform')
      .attr('attributeName', 'transform')
      .attr('type', 'rotate')
      .attr('from', 0)
      .attr('to', 360)
      .attr('dur', '2s')
      .attr('repeatCount', 'indefinite');
  }

  drawDisc(center, 0, 0, r, ctx.glyph, fontSize);
}

// --- Style: Tape -----------------------------------------------------------

function drawTape(g, side, ctx) {
  const cx = ctx.anchorX;
  const cy = 0;
  const s = ctx.sizeScale;

  // Band width scales with size; band height stays tied to node so the tape
  // continues to cover exactly the failing edge, no more.
  const bandW = 28 * s;
  const overhang = 10;
  const bandH = ctx.height + overhang * 2;

  const patternId = uid('fd-tape');

  const defs = g.append('defs');
  const pat = defs
    .append('pattern')
    .attr('id', patternId)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 14)
    .attr('height', 14)
    .attr('patternTransform', 'rotate(-45)');
  pat
    .append('rect')
    .attr('width', 14)
    .attr('height', 14)
    .attr('fill', 'var(--fd-validation-tape-dark, #181311)');
  pat
    .append('rect')
    .attr('width', 7)
    .attr('height', 14)
    .attr('fill', 'var(--fd-validation-tape-yellow, #f2c70b)');

  g.append('rect')
    .attr('class', 'barricade')
    .attr('x', cx - bandW / 2)
    .attr('y', -bandH / 2)
    .attr('width', bandW)
    .attr('height', bandH)
    .attr('fill', `url(#${patternId})`)
    .attr('stroke', 'var(--fd-validation-tape-dark, #181311)')
    .attr('stroke-width', 1.2);

  // Red disc sits in the centre of the band — keeps the "red nose" signal
  const r = 10.5 * s;
  const fontSize = 13 * s;
  g.append('circle')
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', r + 2)
    .attr('fill', 'var(--fd-validation-tape-dark, #181311)');
  drawDisc(g, cx, cy, r, ctx.glyph, fontSize);
}

// --- Style: Police ---------------------------------------------------------

function drawPolice(g, side, ctx) {
  const cx = ctx.anchorX;
  const cy = 0;
  const s = ctx.sizeScale;

  // Strap height scales with size; strap length stays tied to node width so
  // the strap continues to fit the node body even when "huge".
  const strapH = 22 * s;
  const strapLen = Math.max(80, ctx.width * 0.55);
  const strapFont = 10 * s;
  // Sit the strap slightly below the centre so the title text stays visible
  const tyOffset = Math.min(20, Math.max(8, ctx.height * 0.18));
  const ty = cy + tyOffset;
  const tx = side === 'pre' ? cx + strapLen / 2 - 8 : cx - strapLen / 2 + 8;

  const strap = g
    .append('g')
    .attr('class', 'strap')
    .attr('transform', `translate(${tx}, ${ty}) rotate(-4)`);

  strap
    .append('rect')
    .attr('x', -strapLen / 2)
    .attr('y', -strapH / 2)
    .attr('width', strapLen)
    .attr('height', strapH)
    .attr('fill', 'var(--fd-validation-tape-yellow, #f2c70b)');

  // Black trim lines top + bottom
  strap
    .append('rect')
    .attr('x', -strapLen / 2)
    .attr('y', -strapH / 2)
    .attr('width', strapLen)
    .attr('height', 2)
    .attr('fill', 'var(--fd-validation-tape-dark, #181311)');
  strap
    .append('rect')
    .attr('x', -strapLen / 2)
    .attr('y', strapH / 2 - 2)
    .attr('width', strapLen)
    .attr('height', 2)
    .attr('fill', 'var(--fd-validation-tape-dark, #181311)');

  // Repeating label text
  const word = side === 'pre' ? 'PRE · FAILED' : 'POST · FAILED';
  const tokens = `${word} · ${word} · ${word}`;
  strap
    .append('text')
    .attr('x', 0)
    .attr('y', strapFont * 0.32)
    .attr('text-anchor', 'middle')
    .attr('pointer-events', 'none')
    .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
    .attr('font-size', strapFont)
    .attr('font-weight', 700)
    .attr('fill', 'var(--fd-validation-tape-dark, #181311)')
    .attr('letter-spacing', '0.14em')
    .text(tokens);

  // Anchor disc on the failing edge so pre/post still reads by position
  const r = 10.5 * s;
  const fontSize = 13 * s;
  g.append('circle')
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', r + 2)
    .attr('fill', 'var(--fd-validation-tape-dark, #181311)');
  drawDisc(g, cx, cy, r, ctx.glyph, fontSize);
}

// --- Baseline styles -------------------------------------------------------
//
// Three small, low-visual-cost indicators that render the full 8-state
// vocabulary (minus 'na', which produces no DOM). Fixed pixel sizes,
// independent of the VALIDATION_SIZES token system. Colors come from
// var(--fd-validation-state-<state>, <fallback>) so themes can override per
// aesthetic without renderer changes.

function drawBaseline(layer, side, stateObj, style, w, h, animate) {
  const g = layer
    .append('g')
    .attr('class', `validation-indicator side-${side}`)
    .attr('data-side', side)
    .attr('data-validation-style', style)
    .attr('data-validation-state', stateObj.state);

  // Tooltip: only for error/warning with a non-empty message
  if (
    (stateObj.state === 'error' || stateObj.state === 'warning') &&
    typeof stateObj.message === 'string' &&
    stateObj.message.length > 0
  ) {
    g.append('title').text(stateObj.message);
  }

  if (stateObj.state === 'busy') {
    g.classed('validation-indicator--busy', true);
  }

  switch (style) {
    case 'circle':
      return drawBaselineCircle(g, side, stateObj.state, w, h, animate);
    case 'corner':
      return drawBaselineCorner(g, side, stateObj.state, w, h, animate);
    case 'bar':
    default:
      return drawBaselineBar(g, side, stateObj.state, w, h, animate);
  }
}

function drawBaselineBar(g, side, state, w, h, animate) {
  // 3px-wide vertical bar, 60% of edge height, centered vertically, 1px inset
  // from the edge. Left edge = pre, right edge = post.
  const barW = 3;
  const barH = h * 0.6;
  const x = side === 'pre' ? -w / 2 + 1 : w / 2 - 1 - barW;
  const y = -barH / 2;
  const fill = colorForState(state);

  const rect = g
    .append('rect')
    .attr('class', 'validation-bar')
    .attr('x', x)
    .attr('y', y)
    .attr('width', barW)
    .attr('height', barH)
    .attr('fill', fill);

  if (state === 'busy' && animate) {
    rect
      .append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '1;0.35;1')
      .attr('dur', '1.4s')
      .attr('repeatCount', 'indefinite');
  }
}

function drawBaselineCircle(g, side, state, w, h, animate) {
  // Filled circle, radius 4px, centered on the inbound (left) / outbound
  // (right) connection point in node-local coordinates.
  const r = 4;
  const cx = side === 'pre' ? -w / 2 : w / 2;
  const cy = 0;
  const fill = colorForState(state);

  const circle = g
    .append('circle')
    .attr('class', 'validation-circle')
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', r)
    .attr('fill', fill);

  if (state === 'busy' && animate) {
    circle
      .append('animate')
      .attr('attributeName', 'r')
      .attr('values', `${r};${r + 1.5};${r}`)
      .attr('dur', '1.4s')
      .attr('repeatCount', 'indefinite');
  }
}

function drawBaselineCorner(g, side, state, w, h, animate) {
  // 6×6px right-triangle chevron seated on the corner. Top-left = pre,
  // top-right = post. Hypotenuse lies along the corner so the chevron
  // points outside the rect.
  const len = 6;
  const fill = colorForState(state);
  let d;
  if (side === 'pre') {
    const ax = -w / 2;
    const ay = -h / 2;
    d = `M ${ax},${ay + len} L ${ax},${ay} L ${ax + len},${ay} Z`;
  } else {
    const ax = w / 2;
    const ay = -h / 2;
    d = `M ${ax - len},${ay} L ${ax},${ay} L ${ax},${ay + len} Z`;
  }

  const path = g.append('path').attr('class', 'validation-corner').attr('d', d).attr('fill', fill);

  if (state === 'busy' && animate) {
    path
      .append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '1;0.35;1')
      .attr('dur', '1.4s')
      .attr('repeatCount', 'indefinite');
  }
}
