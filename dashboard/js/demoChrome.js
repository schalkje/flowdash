import { NodeStatus } from './nodeBase.js';

const SETTINGS_DEFAULTS = {
  horizontal: false,
  curved: false,
  layoutMechanism: 'force',
  showEdges: true,
  showGhostlines: false,
  showBoundingBox: false,
  showCenterMark: false,
  showConnectionPoints: false,
  zoomToRoot: true,
  showInnerZoneRect: false,
  toggleCollapseOnStatusChange: false,
  cascadeOnStatusChange: false,
  curveMargin: 0,
  selector: { incomming: 1, outgoing: 1 },
  nodeSpacing: { horizontal: 20, vertical: 10 },
  containerMargin: { top: 8, right: 8, bottom: 8, left: 8 },
  minimap: {
    mode: 'always',
    position: 'bottom-right',
    size: 'm',
    enabled: true,
    scaleIndicator: { visible: true },
  },
};

const CONTROL_SPECS = {
  settings: { id: 'settingsBtn', label: 'Settings', kind: 'panel-toggle' },
  cycleFiles: { id: 'cycleFilesBtn', label: 'Cycle Files', kind: 'cycle-files' },
  cycle: { id: 'cycleBtn', label: 'Cycle Layouts', kind: 'cycle-variations' },
  statusReady: { id: 'status-updated', label: 'Set to ready', kind: 'status', action: 'Updated' },
  statusUnknown: { id: 'status-unknown', label: 'Set to unknown', kind: 'status', action: 'Unknown' },
  statusRandom: { id: 'status-random', label: 'Random States', kind: 'status', action: 'Random' },
};

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (child == null) continue;
    if (Array.isArray(child)) for (const c of child) c && node.appendChild(c);
    else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  }
  return node;
}

function deepMerge(base, patch) {
  if (patch == null) return base;
  if (typeof base !== 'object' || typeof patch !== 'object' || Array.isArray(base) || Array.isArray(patch)) {
    return patch;
  }
  const out = { ...base };
  for (const k of Object.keys(patch)) {
    out[k] = (k in base) ? deepMerge(base[k], patch[k]) : patch[k];
  }
  return out;
}

export function mergeSettings(base, patch) {
  return deepMerge(base || {}, patch || {});
}

function buildHeader({ title, subtitle, description, controls, extraControls }) {
  const buttons = [];
  for (const key of controls) {
    const spec = CONTROL_SPECS[key];
    if (!spec) continue;
    const attrs = { id: spec.id, type: 'button' };
    if (spec.kind === 'panel-toggle') attrs['aria-expanded'] = 'false';
    buttons.push(el('button', attrs, spec.label));
  }
  for (const ec of extraControls) {
    const btn = el('button', { id: ec.id, type: 'button' }, ec.label);
    if (ec.onClick) btn.addEventListener('click', ec.onClick);
    buttons.push(btn);
  }

  const titles = [];
  if (title) titles.push(el('h1', { id: 'pageTitle' }, title));
  if (subtitle) titles.push(el('h2', {}, subtitle));
  if (description) titles.push(el('p', { class: 'demo-description' }, description));

  return el('header', { class: 'demo-header' },
    el('div', { class: 'demo-header__titles' }, ...titles),
    el('div', { class: 'demo-controls' }, ...buttons),
  );
}

function inlineLabel(text, input) {
  return el('label', {}, text + ' ', input);
}

function buildSection(name, ctx) {
  switch (name) {
    case 'data': return buildDataSection(ctx);
    case 'variation': return buildVariationSection(ctx);
    case 'layout': return buildLayoutSection();
    case 'visibility': return buildVisibilitySection();
    case 'statusBehavior': return buildStatusBehaviorSection();
    case 'minimap': return buildMinimapSection();
    case 'edges': return buildEdgesSection();
    case 'selector': return buildSelectorSection();
    case 'nodeSpacing': return buildNodeSpacingSection();
    case 'containerMargin': return buildContainerMarginSection();
    default: return null;
  }
}

function buildDataSection({ files }) {
  const select = el('select', { id: 'fileSelect' });
  for (const f of files || []) {
    select.appendChild(el('option', { value: f }, f));
  }
  return el('div', { class: 'settings-group' },
    el('label', { class: 'settings-title' }, 'Data'),
    el('div', { class: 'settings-inline' },
      el('label', { for: 'fileSelect' }, 'Select JSON file'),
      select,
    ),
  );
}

function buildVariationSection({ variations }) {
  const select = el('select', { id: 'variationSelect' });
  for (const [key, v] of Object.entries(variations || {})) {
    select.appendChild(el('option', { value: key }, v.label || key));
  }
  return el('div', { class: 'settings-group' },
    el('label', { class: 'settings-title' }, 'Variation'),
    select,
  );
}

function buildLayoutSection() {
  return el('div', { class: 'settings-group is-toggles' },
    el('label', { class: 'settings-title' }, 'Layout'),
    el('div', { class: 'settings-toggles' },
      el('label', {}, el('input', { type: 'checkbox', id: 'horizontalCheckbox' }), ' Horizontal'),
      el('label', {}, el('input', { type: 'checkbox', id: 'curveCheckbox' }), ' Curved edges'),
      el('label', {}, 'Mechanism ',
        (() => {
          const sel = el('select', { id: 'layoutMechanismSelect' });
          sel.appendChild(el('option', { value: 'force' }, 'Force'));
          sel.appendChild(el('option', { value: 'sugiyama' }, 'Sugiyama'));
          return sel;
        })(),
      ),
    ),
  );
}

function buildVisibilitySection() {
  return el('div', { class: 'settings-group is-toggles' },
    el('label', { class: 'settings-title' }, 'Visibility'),
    el('div', { class: 'settings-toggles is-3cols' },
      el('label', {}, el('input', { type: 'checkbox', id: 'showEdgesCheckbox' }), ' Show edges'),
      el('label', {}, el('input', { type: 'checkbox', id: 'showGhostlinesCheckbox' }), ' Ghostlines'),
      el('label', {}, el('input', { type: 'checkbox', id: 'showBoundingBoxCheckbox' }), ' Bounding box'),
      el('label', {}, el('input', { type: 'checkbox', id: 'showCenterMarkCheckbox' }), ' Center mark'),
      el('label', {}, el('input', { type: 'checkbox', id: 'showConnectionPointsCheckbox' }), ' Connection points'),
      el('label', {}, el('input', { type: 'checkbox', id: 'zoomToRoot' }), ' Zoom to root'),
      el('label', {}, el('input', { type: 'checkbox', id: 'showInnerZoneRectCheckbox' }), ' Inner zone rect'),
    ),
  );
}

function buildStatusBehaviorSection() {
  return el('div', { class: 'settings-group is-toggles' },
    el('label', { class: 'settings-title' }, 'Status Behavior'),
    el('div', { class: 'settings-toggles' },
      el('label', {}, el('input', { type: 'checkbox', id: 'toggleCollapseOnStatusChange' }), ' Auto-collapse on status change'),
      el('label', {}, el('input', { type: 'checkbox', id: 'cascadeOnStatusChange' }), ' Cascade status changes'),
    ),
  );
}

function buildMinimapSection() {
  const modeSel = el('select', { id: 'minimapModeSelect', style: 'width:160px' });
  for (const [v, l] of [['always','Always'],['hover','Hover'],['hidden','Hidden'],['disabled','Disabled (Best Performance)']]) {
    modeSel.appendChild(el('option', { value: v }, l));
  }
  const posSel = el('select', { id: 'minimapPositionSelect', style: 'width:160px' });
  for (const [v, l] of [['bottom-right','Bottom-right'],['bottom-left','Bottom-left'],['top-right','Top-right'],['top-left','Top-left']]) {
    posSel.appendChild(el('option', { value: v }, l));
  }
  const sizeSel = el('select', { id: 'minimapSizeSelect', style: 'width:120px' });
  for (const [v, l] of [['s','Small'],['m','Medium'],['l','Large']]) {
    sizeSel.appendChild(el('option', { value: v }, l));
  }
  return el('div', { class: 'settings-group' },
    el('label', { class: 'settings-title' }, 'Minimap'),
    el('div', { class: 'settings-inline' },
      el('label', { for: 'minimapModeSelect' }, 'Mode'), modeSel,
      el('label', { for: 'minimapPositionSelect', style: 'margin-left:12px' }, 'Position'), posSel,
      el('label', { for: 'minimapSizeSelect', style: 'margin-left:12px' }, 'Size'), sizeSel,
    ),
    el('div', { class: 'settings-inline', style: 'margin-top:8px' },
      el('label', { style: 'margin-left:0' },
        el('input', { type: 'checkbox', id: 'minimapScaleVisible' }), ' Show scale'),
    ),
  );
}

function buildEdgesSection() {
  return el('div', { class: 'settings-group' },
    el('label', { class: 'settings-title' }, 'Edges'),
    el('div', { class: 'settings-inline' },
      inlineLabel('Curve margin', el('input', { type: 'number', step: '0.05', min: '0', max: '0.8', id: 'numCurveMargin', style: 'width:80px' })),
    ),
  );
}

function buildSelectorSection() {
  return el('div', { class: 'settings-group' },
    el('label', { class: 'settings-title' }, 'Selector'),
    el('div', { class: 'settings-inline' },
      inlineLabel('Incoming', el('input', { type: 'number', min: '0', id: 'numSelectorIn', style: 'width:70px' })),
      inlineLabel('Outgoing', el('input', { type: 'number', min: '0', id: 'numSelectorOut', style: 'width:70px' })),
    ),
  );
}

function buildNodeSpacingSection() {
  return el('div', { class: 'settings-group' },
    el('label', { class: 'settings-title' }, 'Node spacing'),
    el('div', { class: 'settings-inline' },
      inlineLabel('H', el('input', { type: 'number', min: '0', id: 'numNodeSpacingH', style: 'width:70px' })),
      inlineLabel('V', el('input', { type: 'number', min: '0', id: 'numNodeSpacingV', style: 'width:70px' })),
    ),
  );
}

function buildContainerMarginSection() {
  return el('div', { class: 'settings-group' },
    el('label', { class: 'settings-title' }, 'Container margin'),
    el('div', { class: 'settings-inline' },
      inlineLabel('T', el('input', { type: 'number', min: '0', id: 'numMarginTop', style: 'width:60px' })),
      inlineLabel('R', el('input', { type: 'number', min: '0', id: 'numMarginRight', style: 'width:60px' })),
      inlineLabel('B', el('input', { type: 'number', min: '0', id: 'numMarginBottom', style: 'width:60px' })),
      inlineLabel('L', el('input', { type: 'number', min: '0', id: 'numMarginLeft', style: 'width:60px' })),
    ),
  );
}

function buildSettingsPanel({ settings, files, variations }) {
  const sections = [];
  const ctx = { files, variations };
  for (const name of settings) {
    const node = buildSection(name, ctx);
    if (node) sections.push(node);
  }
  if (!sections.length) return null;
  return el('section', { class: 'settings-panel' },
    el('div', { class: 'settings-row' }, ...sections),
  );
}

function getChecked(id) { const e = document.getElementById(id); return e ? !!e.checked : undefined; }
function getValueStr(id) { const e = document.getElementById(id); return e ? e.value : undefined; }
function getValueNum(id) {
  const e = document.getElementById(id);
  if (!e) return undefined;
  const n = e.type === 'number' && e.step && e.step.includes('.') ? parseFloat(e.value) : parseInt(e.value, 10);
  return Number.isNaN(n) ? undefined : n;
}
function setChecked(id, v) { const e = document.getElementById(id); if (e && v !== undefined) e.checked = !!v; }
function setValue(id, v) { const e = document.getElementById(id); if (e && v !== undefined) e.value = v; }

function readSettings(enabled) {
  const has = (s) => enabled.has(s);
  const patch = {};
  if (has('layout')) {
    patch.horizontal = getChecked('horizontalCheckbox');
    patch.curved = getChecked('curveCheckbox');
    patch.layoutMechanism = getValueStr('layoutMechanismSelect');
  }
  if (has('visibility')) {
    patch.showEdges = getChecked('showEdgesCheckbox');
    patch.showGhostlines = getChecked('showGhostlinesCheckbox');
    patch.showBoundingBox = getChecked('showBoundingBoxCheckbox');
    patch.showCenterMark = getChecked('showCenterMarkCheckbox');
    patch.showConnectionPoints = getChecked('showConnectionPointsCheckbox');
    patch.zoomToRoot = getChecked('zoomToRoot');
    patch.showInnerZoneRect = getChecked('showInnerZoneRectCheckbox');
  }
  if (has('statusBehavior')) {
    patch.toggleCollapseOnStatusChange = getChecked('toggleCollapseOnStatusChange');
    patch.cascadeOnStatusChange = getChecked('cascadeOnStatusChange');
  }
  if (has('edges')) {
    const v = getValueNum('numCurveMargin');
    if (v !== undefined) patch.curveMargin = v;
  }
  if (has('selector')) {
    const incomming = getValueNum('numSelectorIn');
    const outgoing = getValueNum('numSelectorOut');
    if (incomming !== undefined || outgoing !== undefined) {
      patch.selector = {};
      if (incomming !== undefined) patch.selector.incomming = incomming;
      if (outgoing !== undefined) patch.selector.outgoing = outgoing;
    }
  }
  if (has('nodeSpacing')) {
    const h = getValueNum('numNodeSpacingH');
    const v = getValueNum('numNodeSpacingV');
    if (h !== undefined || v !== undefined) {
      patch.nodeSpacing = {};
      if (h !== undefined) patch.nodeSpacing.horizontal = h;
      if (v !== undefined) patch.nodeSpacing.vertical = v;
    }
  }
  if (has('containerMargin')) {
    const t = getValueNum('numMarginTop');
    const r = getValueNum('numMarginRight');
    const b = getValueNum('numMarginBottom');
    const l = getValueNum('numMarginLeft');
    if ([t,r,b,l].some(x => x !== undefined)) {
      patch.containerMargin = {};
      if (t !== undefined) patch.containerMargin.top = t;
      if (r !== undefined) patch.containerMargin.right = r;
      if (b !== undefined) patch.containerMargin.bottom = b;
      if (l !== undefined) patch.containerMargin.left = l;
    }
  }
  if (has('minimap')) {
    patch.minimap = {
      mode: getValueStr('minimapModeSelect'),
      position: getValueStr('minimapPositionSelect'),
      size: getValueStr('minimapSizeSelect'),
      scaleIndicator: { visible: getChecked('minimapScaleVisible') },
    };
    patch.minimap.enabled = patch.minimap.mode !== 'hidden';
  }
  return patch;
}

function applyDefaults(enabled, defaults) {
  const merged = deepMerge(SETTINGS_DEFAULTS, defaults || {});
  const has = (s) => enabled.has(s);
  if (has('layout')) {
    setChecked('horizontalCheckbox', merged.horizontal);
    setChecked('curveCheckbox', merged.curved);
    setValue('layoutMechanismSelect', merged.layoutMechanism);
  }
  if (has('visibility')) {
    setChecked('showEdgesCheckbox', merged.showEdges);
    setChecked('showGhostlinesCheckbox', merged.showGhostlines);
    setChecked('showBoundingBoxCheckbox', merged.showBoundingBox);
    setChecked('showCenterMarkCheckbox', merged.showCenterMark);
    setChecked('showConnectionPointsCheckbox', merged.showConnectionPoints);
    setChecked('zoomToRoot', merged.zoomToRoot);
    setChecked('showInnerZoneRectCheckbox', merged.showInnerZoneRect);
  }
  if (has('statusBehavior')) {
    setChecked('toggleCollapseOnStatusChange', merged.toggleCollapseOnStatusChange);
    setChecked('cascadeOnStatusChange', merged.cascadeOnStatusChange);
  }
  if (has('edges')) setValue('numCurveMargin', merged.curveMargin);
  if (has('selector')) {
    setValue('numSelectorIn', merged.selector.incomming);
    setValue('numSelectorOut', merged.selector.outgoing);
  }
  if (has('nodeSpacing')) {
    setValue('numNodeSpacingH', merged.nodeSpacing.horizontal);
    setValue('numNodeSpacingV', merged.nodeSpacing.vertical);
  }
  if (has('containerMargin')) {
    setValue('numMarginTop', merged.containerMargin.top);
    setValue('numMarginRight', merged.containerMargin.right);
    setValue('numMarginBottom', merged.containerMargin.bottom);
    setValue('numMarginLeft', merged.containerMargin.left);
  }
  if (has('minimap')) {
    setValue('minimapModeSelect', merged.minimap.mode);
    setValue('minimapPositionSelect', merged.minimap.position);
    setValue('minimapSizeSelect', merged.minimap.size);
    setChecked('minimapScaleVisible', merged.minimap.scaleIndicator.visible);
  }
}

const ALL_RANDOM_STATUSES = Object.values(NodeStatus).filter(s => s !== NodeStatus.UNDETERMINED);

function defaultStatusHandler(action, dashboard) {
  if (!dashboard || typeof dashboard.getStructure !== 'function') return;
  const structure = dashboard.getStructure();
  if (!structure || !structure.Nodes) return;
  const pickStatus = (i) => {
    if (action === 'Random') {
      return ALL_RANDOM_STATUSES[Math.floor(Math.random() * ALL_RANDOM_STATUSES.length)];
    }
    return action;
  };
  structure.Nodes.forEach((node, i) => {
    setTimeout(() => {
      try { dashboard.updateNodeStatus(node.Id, pickStatus(i)); } catch (e) { /* ignore */ }
    }, i * 100);
  });
}

export function mountDemoChrome(opts) {
  const {
    root = document.body,
    title,
    subtitle,
    description,
    controls = ['settings'],
    extraControls = [],
    settings = [],
    files,
    variations,
    defaults = {},
    onSettingsChange,
    onFileChange,
    onVariationChange,
    onStatusSet,
    getDashboard,
    emitInitial = true,
  } = opts;

  const enabled = new Set(settings);
  const headerEl = buildHeader({ title, subtitle, description, controls, extraControls });
  const panelEl = buildSettingsPanel({ settings, files, variations });

  const wrapper = document.createDocumentFragment();
  wrapper.appendChild(headerEl);
  if (panelEl) wrapper.appendChild(panelEl);
  root.appendChild(wrapper);

  // Settings button toggles the panel
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn && panelEl) {
    settingsBtn.addEventListener('click', () => {
      const isOpen = panelEl.classList.toggle('open');
      settingsBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      settingsBtn.textContent = isOpen ? 'Hide settings' : 'Settings';
    });
  }

  // Apply defaults to UI before any change events fire.
  applyDefaults(enabled, defaults);

  // Debounced settings emitter
  let debounceTimer = null;
  const emitSettings = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (typeof onSettingsChange === 'function') {
        onSettingsChange(readSettings(enabled));
      }
    }, 80);
  };

  // Wire settings inputs
  if (panelEl) {
    panelEl.querySelectorAll('input, select').forEach((inp) => {
      if (inp.id === 'fileSelect' || inp.id === 'variationSelect') return;
      inp.addEventListener('change', emitSettings);
      if (inp.tagName === 'INPUT' && inp.type === 'number') {
        inp.addEventListener('input', emitSettings);
      }
    });
  }

  // File selector
  const fileSelect = document.getElementById('fileSelect');
  if (fileSelect) {
    fileSelect.addEventListener('change', () => {
      if (typeof onFileChange === 'function') onFileChange(fileSelect.value);
    });
  }

  // Variation selector
  const variationSelect = document.getElementById('variationSelect');
  if (variationSelect) {
    variationSelect.addEventListener('change', () => {
      if (typeof onVariationChange === 'function') onVariationChange(variationSelect.value);
    });
  }

  // Header controls (built-in kinds)
  for (const key of controls) {
    const spec = CONTROL_SPECS[key];
    if (!spec) continue;
    const btn = document.getElementById(spec.id);
    if (!btn) continue;
    if (spec.kind === 'cycle-files' && fileSelect) {
      btn.addEventListener('click', () => {
        const list = Array.from(fileSelect.options).map(o => o.value);
        if (!list.length) return;
        const idx = (list.indexOf(fileSelect.value) + 1) % list.length;
        fileSelect.value = list[idx];
        if (typeof onFileChange === 'function') onFileChange(fileSelect.value);
      });
    } else if (spec.kind === 'cycle-variations' && variationSelect) {
      btn.addEventListener('click', () => {
        const list = Array.from(variationSelect.options).map(o => o.value);
        if (!list.length) return;
        const idx = (list.indexOf(variationSelect.value) + 1) % list.length;
        variationSelect.value = list[idx];
        if (typeof onVariationChange === 'function') onVariationChange(variationSelect.value);
      });
    } else if (spec.kind === 'status') {
      btn.addEventListener('click', () => {
        if (typeof onStatusSet === 'function') {
          onStatusSet(spec.action);
        } else if (typeof getDashboard === 'function') {
          defaultStatusHandler(spec.action, getDashboard());
        }
      });
    }
  }

  if (emitInitial && typeof onSettingsChange === 'function') {
    queueMicrotask(() => onSettingsChange(readSettings(enabled)));
  }

  return {
    el: headerEl,
    panelEl,
    getSettings: () => readSettings(enabled),
    setSettings: (partial) => {
      applyDefaults(enabled, deepMerge(readSettings(enabled), partial || {}));
    },
    setVariation: (key) => {
      if (variationSelect) variationSelect.value = key;
    },
    setFile: (filename) => {
      if (fileSelect) fileSelect.value = filename;
    },
    setFiles: (list) => {
      if (!fileSelect) return;
      const current = fileSelect.value;
      fileSelect.innerHTML = '';
      for (const f of list) fileSelect.appendChild(el('option', { value: f }, f));
      if (list.includes(current)) fileSelect.value = current;
    },
    destroy: () => {
      if (panelEl && panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
      if (headerEl && headerEl.parentNode) headerEl.parentNode.removeChild(headerEl);
    },
  };
}
