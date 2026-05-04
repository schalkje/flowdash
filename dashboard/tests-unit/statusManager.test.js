import { describe, it, expect, vi, beforeAll } from 'vitest';

// nodeBase.js pulls in the full module graph (zones, eventManager, etc.) which
// touches d3 at import time. We only need the NodeStatus enum, so we mock the
// nodeBase module surface to expose just that constant.
vi.mock('../js/nodeBase.js', () => ({
  NodeStatus: Object.freeze({
    UNDETERMINED: 'undetermined',
    UNKNOWN: 'unknown',
    READY: 'ready',
    UPDATING: 'updating',
    DELAYED: 'delayed',
    ERROR: 'error',
    UPDATED: 'updated',
    SKIPPED: 'skipped',
    WARNING: 'warning',
    DISABLED: 'disabled',
  }),
}));

let StatusManager;
let NodeStatus;

beforeAll(async () => {
  // Suppress the StatusManager's debug console.log lines that fire on each call
  // (they would clutter test output).
  vi.spyOn(console, 'log').mockImplementation(() => {});
  ({ StatusManager } = await import('../js/statusManager.js'));
  ({ NodeStatus } = await import('../js/nodeBase.js'));
});

describe('StatusManager.determineAggregateStatus', () => {
  it('returns UNKNOWN for an empty status list', () => {
    expect(StatusManager.determineAggregateStatus([])).toBe(NodeStatus.UNKNOWN);
  });

  it('returns DISABLED when every status is DISABLED', () => {
    const r = StatusManager.determineAggregateStatus([
      NodeStatus.DISABLED,
      NodeStatus.DISABLED,
    ]);
    expect(r).toBe(NodeStatus.DISABLED);
  });

  it('returns UPDATED for a SKIPPED + UPDATED mix (special case)', () => {
    const r = StatusManager.determineAggregateStatus([
      NodeStatus.SKIPPED,
      NodeStatus.UPDATED,
      NodeStatus.SKIPPED,
    ]);
    expect(r).toBe(NodeStatus.UPDATED);
  });

  it('escalates to ERROR when any child is ERROR', () => {
    const r = StatusManager.determineAggregateStatus([
      NodeStatus.READY,
      NodeStatus.ERROR,
      NodeStatus.UPDATED,
    ]);
    expect(r).toBe(NodeStatus.ERROR);
  });

  it('prefers WARNING over DELAYED, UPDATING, READY', () => {
    const r = StatusManager.determineAggregateStatus([
      NodeStatus.READY,
      NodeStatus.WARNING,
      NodeStatus.DELAYED,
    ]);
    expect(r).toBe(NodeStatus.WARNING);
  });

  it('falls back to READY when only READY children are present', () => {
    expect(
      StatusManager.determineAggregateStatus([NodeStatus.READY, NodeStatus.READY]),
    ).toBe(NodeStatus.READY);
  });

  it('ignores DISABLED children when escalating', () => {
    const r = StatusManager.determineAggregateStatus([
      NodeStatus.DISABLED,
      NodeStatus.READY,
    ]);
    expect(r).toBe(NodeStatus.READY);
  });
});

describe('StatusManager.shouldCollapseOnStatus', () => {
  const onSettings = { toggleCollapseOnStatusChange: true };
  const offSettings = { toggleCollapseOnStatusChange: false };

  it('never collapses when the setting is off', () => {
    for (const status of Object.values({
      READY: 'ready', UPDATING: 'updating', UPDATED: 'updated', ERROR: 'error',
    })) {
      expect(StatusManager.shouldCollapseOnStatus(status, offSettings)).toBe(false);
    }
  });

  it('collapses for READY, DISABLED, UPDATED, SKIPPED only', () => {
    expect(StatusManager.shouldCollapseOnStatus(NodeStatus.READY, onSettings)).toBe(true);
    expect(StatusManager.shouldCollapseOnStatus(NodeStatus.DISABLED, onSettings)).toBe(true);
    expect(StatusManager.shouldCollapseOnStatus(NodeStatus.UPDATED, onSettings)).toBe(true);
    expect(StatusManager.shouldCollapseOnStatus(NodeStatus.SKIPPED, onSettings)).toBe(true);
  });

  it('does not collapse for ERROR, WARNING, DELAYED, UPDATING, UNKNOWN', () => {
    expect(StatusManager.shouldCollapseOnStatus(NodeStatus.ERROR, onSettings)).toBe(false);
    expect(StatusManager.shouldCollapseOnStatus(NodeStatus.WARNING, onSettings)).toBe(false);
    expect(StatusManager.shouldCollapseOnStatus(NodeStatus.DELAYED, onSettings)).toBe(false);
    expect(StatusManager.shouldCollapseOnStatus(NodeStatus.UPDATING, onSettings)).toBe(false);
    expect(StatusManager.shouldCollapseOnStatus(NodeStatus.UNKNOWN, onSettings)).toBe(false);
  });
});

describe('StatusManager.shouldContainerCollapse', () => {
  const on = { toggleCollapseOnStatusChange: true };
  const off = { toggleCollapseOnStatusChange: false };

  it('never collapses when the setting is off', () => {
    expect(StatusManager.shouldContainerCollapse([NodeStatus.READY], off)).toBe(false);
  });

  it('does not collapse with no children', () => {
    expect(StatusManager.shouldContainerCollapse([], on)).toBe(false);
  });

  it('does not collapse when all children are DISABLED', () => {
    expect(
      StatusManager.shouldContainerCollapse(
        [NodeStatus.DISABLED, NodeStatus.DISABLED],
        on,
      ),
    ).toBe(false);
  });

  it('collapses when all non-disabled children share a single status', () => {
    expect(
      StatusManager.shouldContainerCollapse(
        [NodeStatus.READY, NodeStatus.READY, NodeStatus.DISABLED],
        on,
      ),
    ).toBe(true);
  });

  it('collapses for SKIPPED + UPDATED mixes', () => {
    expect(
      StatusManager.shouldContainerCollapse(
        [NodeStatus.SKIPPED, NodeStatus.UPDATED],
        on,
      ),
    ).toBe(true);
  });

  it('stays expanded for genuinely mixed statuses', () => {
    expect(
      StatusManager.shouldContainerCollapse(
        [NodeStatus.READY, NodeStatus.ERROR],
        on,
      ),
    ).toBe(false);
  });
});

describe('StatusManager.isErrorStatus / isProcessStatus', () => {
  it('classifies ERROR / WARNING / DELAYED as error statuses', () => {
    expect(StatusManager.isErrorStatus(NodeStatus.ERROR)).toBe(true);
    expect(StatusManager.isErrorStatus(NodeStatus.WARNING)).toBe(true);
    expect(StatusManager.isErrorStatus(NodeStatus.DELAYED)).toBe(true);
    expect(StatusManager.isErrorStatus(NodeStatus.READY)).toBe(false);
  });

  it('classifies READY / UPDATING / UPDATED / SKIPPED as process statuses', () => {
    expect(StatusManager.isProcessStatus(NodeStatus.READY)).toBe(true);
    expect(StatusManager.isProcessStatus(NodeStatus.UPDATING)).toBe(true);
    expect(StatusManager.isProcessStatus(NodeStatus.UPDATED)).toBe(true);
    expect(StatusManager.isProcessStatus(NodeStatus.SKIPPED)).toBe(true);
    expect(StatusManager.isProcessStatus(NodeStatus.ERROR)).toBe(false);
  });
});
