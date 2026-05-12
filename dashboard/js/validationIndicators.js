// @ts-check
//
// Validation indicators ("red noses") — orthogonal to NodeStatus.
//
// A node may carry a pre-validation error (input side, left edge) and/or a
// post-validation error (output side, right edge). The renderer below paints
// one of four visual treatments into the node's <g>, on top of everything
// else, so that a Ready node with a broken output contract is unmistakable.
//
// See /dashboard/documentation/validation-indicators.md for the spec.

export const VALIDATION_STYLES = Object.freeze([
  'pulse-halo',
  'rotating-siren',
  'industrial-tape',
  'police-line',
  'none',
]);

const STYLE_SET = new Set(VALIDATION_STYLES);

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

/**
 * Idempotent: removes any existing indicator layer and re-paints from scratch
 * based on the supplied flags.
 *
 * @param {*} nodeG       D3 selection of the node's <g>
 * @param {object} opts
 * @param {number} opts.width   effective node width
 * @param {number} opts.height  effective node height
 * @param {string} [opts.style]   one of VALIDATION_STYLES; defaults to 'pulse-halo'
 * @param {string} [opts.size]    one of VALIDATION_SIZES; defaults to 'normal'
 * @param {string} [opts.glyph]   single character drawn in pulse-halo/siren disc; default '!'
 * @param {boolean} [opts.animate] enable animations; default true (honours prefers-reduced-motion)
 * @param {boolean|string} opts.preError  truthy = pre-validation failed
 * @param {boolean|string} opts.postError truthy = post-validation failed
 */
export function renderValidationIndicators(nodeG, opts) {
  if (!nodeG || typeof nodeG.node !== 'function') return;
  clearValidationIndicators(nodeG);

  const style = STYLE_SET.has(opts.style) ? opts.style : 'pulse-halo';
  if (style === 'none') return;

  const preErr = opts.preError;
  const postErr = opts.postError;
  if (!preErr && !postErr) return;

  const w = Number(opts.width) || 0;
  const h = Number(opts.height) || 0;
  if (w <= 0 || h <= 0) return;

  const glyph = opts.glyph ?? '!';
  const animate = opts.animate !== false && !prefersReducedMotion();
  const sizeKey = opts.size && SIZE_SCALES[opts.size] ? opts.size : 'normal';
  const sizeScale = SIZE_SCALES[sizeKey];

  const layer = nodeG
    .append('g')
    .attr('class', 'validation-indicators')
    .attr('data-style', style)
    .attr('data-size', sizeKey);

  const messages = [];
  if (typeof preErr === 'string' && preErr) messages.push(`pre: ${preErr}`);
  if (typeof postErr === 'string' && postErr) messages.push(`post: ${postErr}`);
  if (messages.length) layer.attr('aria-label', messages.join(' · '));

  if (preErr) {
    drawSide(layer, 'pre', {
      anchorX: -w / 2,
      width: w,
      height: h,
      glyph,
      animate,
      style,
      sizeScale,
      message: typeof preErr === 'string' ? preErr : null,
    });
  }
  if (postErr) {
    drawSide(layer, 'post', {
      anchorX: w / 2,
      width: w,
      height: h,
      glyph,
      animate,
      style,
      sizeScale,
      message: typeof postErr === 'string' ? postErr : null,
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

function drawSide(layer, side, ctx) {
  const g = layer
    .append('g')
    .attr('class', `validation-indicator side-${side}`)
    .attr('data-side', side)
    .attr('data-style', ctx.style);

  if (ctx.message) {
    g.append('title').text(ctx.message);
  }

  switch (ctx.style) {
    case 'rotating-siren':
      return drawSiren(g, side, ctx);
    case 'industrial-tape':
      return drawIndustrialTape(g, side, ctx);
    case 'police-line':
      return drawPoliceLine(g, side, ctx);
    case 'pulse-halo':
    default:
      return drawPulseHalo(g, side, ctx);
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

// --- Style: Pulse Halo -----------------------------------------------------

function drawPulseHalo(g, side, ctx) {
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

// --- Style: Rotating Siren -------------------------------------------------

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

// --- Style: Industrial Tape ------------------------------------------------

function drawIndustrialTape(g, side, ctx) {
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

// --- Style: Police Line ----------------------------------------------------

function drawPoliceLine(g, side, ctx) {
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
