import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerNodeType,
  createNode,
  getRegisteredNodeTypes,
  isNodeTypeRegistered,
} from '../js/nodeRegistry.js';

// The registry holds a module-scoped Map; we cannot reset it between tests but
// we can register fresh, uniquely-named types per test to avoid interference.

describe('nodeRegistry — registration', () => {
  it('round-trips a registered type through isNodeTypeRegistered', () => {
    class Stub {}
    registerNodeType('reg-roundtrip-1', Stub);
    expect(isNodeTypeRegistered('reg-roundtrip-1')).toBe(true);
    expect(isNodeTypeRegistered('reg-roundtrip-1'.toUpperCase())).toBe(true);
  });

  it('reports unknown types as not registered', () => {
    expect(isNodeTypeRegistered('definitely-not-registered-xyz')).toBe(false);
  });

  it('lists registered types via getRegisteredNodeTypes', () => {
    class Stub {}
    registerNodeType('reg-list-1', Stub);
    expect(getRegisteredNodeTypes()).toContain('reg-list-1');
  });

  it('normalizes the type name to lowercase on registration', () => {
    class Stub {}
    registerNodeType('REG-CASE-1', Stub);
    expect(isNodeTypeRegistered('reg-case-1')).toBe(true);
    expect(isNodeTypeRegistered('Reg-Case-1')).toBe(true);
  });
});

describe('nodeRegistry — createNode dispatch', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns null and logs an error for unknown types', () => {
    const result = createNode({ type: 'never-registered-zzz' }, {}, {});
    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('passes (data, container, settings, parentNode) to non-container constructors', () => {
    const calls = [];
    class SimpleStub {
      constructor(data, container, settings, parentNode) {
        calls.push({ data, container, settings, parentNode });
      }
    }
    registerNodeType('rect', SimpleStub);
    const data = { type: 'rect', id: 'r1' };
    const container = { tag: 'svg-g' };
    const settings = { foo: 1 };
    const parent = { id: 'parent' };
    createNode(data, container, settings, parent);
    expect(calls).toHaveLength(1);
    expect(calls[0].data).toBe(data);
    expect(calls[0].container).toBe(container);
    expect(calls[0].settings).toBe(settings);
    expect(calls[0].parentNode).toBe(parent);
  });

  it('passes (data, container, createNode, settings, parentNode) to container constructors', () => {
    const calls = [];
    class ContainerStub {
      constructor(data, container, createFn, settings, parentNode) {
        calls.push({ data, container, createFn, settings, parentNode });
      }
    }
    registerNodeType('lane', ContainerStub);
    const data = { type: 'lane', id: 'l1' };
    createNode(data, 'CONTAINER', 'SETTINGS', 'PARENT');
    expect(calls).toHaveLength(1);
    expect(typeof calls[0].createFn).toBe('function');
    expect(calls[0].settings).toBe('SETTINGS');
    expect(calls[0].parentNode).toBe('PARENT');
  });
});
