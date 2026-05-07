import { describe, it, expect } from 'vitest';
import { ConfigManager, DEFAULT_SETTINGS, DEMO_DEFAULT_SETTINGS } from '../js/configManager.js';

describe('ConfigManager.deepMerge', () => {
  it('returns the target unchanged when source is empty', () => {
    const target = { a: 1, b: { c: 2 } };
    const merged = ConfigManager.deepMerge(target, {});
    expect(merged).toEqual({ a: 1, b: { c: 2 } });
  });

  it('overwrites scalar fields with source values', () => {
    const merged = ConfigManager.deepMerge({ a: 1, b: 2 }, { a: 99 });
    expect(merged).toEqual({ a: 99, b: 2 });
  });

  it('recurses into nested objects rather than replacing them wholesale', () => {
    const target = { container: { top: 8, right: 8, bottom: 8, left: 8 } };
    const source = { container: { top: 16 } };
    const merged = ConfigManager.deepMerge(target, source);
    expect(merged.container).toEqual({ top: 16, right: 8, bottom: 8, left: 8 });
  });

  it('treats arrays as scalars (replaces, does not concat)', () => {
    const merged = ConfigManager.deepMerge({ extent: [0.1, 40] }, { extent: [0.5, 5] });
    expect(merged.extent).toEqual([0.5, 5]);
  });

  it('does not mutate the target object', () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { b: { c: 99 } };
    ConfigManager.deepMerge(target, source);
    expect(target).toEqual({ a: 1, b: { c: 2 } });
  });

  it('creates nested branches when target lacks them', () => {
    const merged = ConfigManager.deepMerge({}, { minimap: { mode: 'hover' } });
    expect(merged.minimap).toEqual({ mode: 'hover' });
  });
});

describe('ConfigManager.mergeWithDefaults', () => {
  it('returns DEFAULT_SETTINGS when isDemoPage=false and source is empty', () => {
    const merged = ConfigManager.mergeWithDefaults({});
    expect(merged.toggleCollapseOnStatusChange).toBe(true);
    expect(merged.cascadeOnStatusChange).toBe(true);
  });

  it('returns DEMO_DEFAULT_SETTINGS when isDemoPage=true', () => {
    const merged = ConfigManager.mergeWithDefaults({}, true);
    expect(merged.toggleCollapseOnStatusChange).toBe(false);
    expect(merged.cascadeOnStatusChange).toBe(false);
  });

  it('lets user settings override defaults', () => {
    const merged = ConfigManager.mergeWithDefaults({
      selector: { incomming: 5, outgoing: 5 },
    });
    expect(merged.selector).toEqual({ incomming: 5, outgoing: 5 });
  });

  it('merges nested user overrides without losing untouched nested defaults', () => {
    const merged = ConfigManager.mergeWithDefaults({
      minimap: { mode: 'hidden' },
    });
    expect(merged.minimap.mode).toBe('hidden');
    expect(merged.minimap.position).toBe(DEFAULT_SETTINGS.minimap.position);
    expect(merged.minimap.size).toBe(DEFAULT_SETTINGS.minimap.size);
  });
});

describe('ConfigManager.validateSettings', () => {
  it('returns no errors for a default-shaped settings object', () => {
    expect(ConfigManager.validateSettings(DEFAULT_SETTINGS)).toEqual([]);
  });

  it('flags negative selector depths', () => {
    const errors = ConfigManager.validateSettings({
      selector: { incomming: -1, outgoing: 0 },
    });
    expect(errors).toContain('Selector values must be non-negative');
  });

  it('flags negative container margins for any side', () => {
    const errors = ConfigManager.validateSettings({
      containerMargin: { top: 0, right: -1, bottom: 0, left: 0 },
    });
    expect(errors.some((e) => e.includes('right'))).toBe(true);
  });

  it('flags negative node spacing', () => {
    const errors = ConfigManager.validateSettings({
      nodeSpacing: { horizontal: -1, vertical: 5 },
    });
    expect(errors).toContain('node spacing values must be non-negative');
  });

  it('aggregates multiple violations rather than short-circuiting', () => {
    const errors = ConfigManager.validateSettings({
      selector: { incomming: -1, outgoing: 0 },
      containerMargin: { top: -1, right: 0, bottom: 0, left: 0 },
      nodeSpacing: { horizontal: -1, vertical: 0 },
    });
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('ConfigManager helpers', () => {
  it('getDefaultContainerMargin returns a fresh copy each call', () => {
    const a = ConfigManager.getDefaultContainerMargin();
    const b = ConfigManager.getDefaultContainerMargin();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it('getDefaultNodeSpacing returns a fresh copy each call', () => {
    const a = ConfigManager.getDefaultNodeSpacing();
    const b = ConfigManager.getDefaultNodeSpacing();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

describe('DEMO_DEFAULT_SETTINGS', () => {
  it('inherits from DEFAULT_SETTINGS but flips status-cascade defaults to false', () => {
    expect(DEMO_DEFAULT_SETTINGS.selector).toEqual(DEFAULT_SETTINGS.selector);
    expect(DEMO_DEFAULT_SETTINGS.toggleCollapseOnStatusChange).toBe(false);
    expect(DEMO_DEFAULT_SETTINGS.cascadeOnStatusChange).toBe(false);
  });
});
