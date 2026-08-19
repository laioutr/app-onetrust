import { describe, expect, it, vi } from 'vitest';
import { subscribeToBridge } from './subscribeToBridge';
import type { OneTrustBridge } from '../types';

const bridge = (groups: string | null = null): OneTrustBridge => ({ groups, listeners: [], wired: false });

describe('subscribeToBridge', () => {
  it('replays what OneTrust published before the adapter attached', () => {
    // The bootstrap runs at HTML parse and OptanonWrapper can fire before hydration, so the first
    // verdict is routinely already on the bridge by the time the plugin gets to subscribe.
    const onGroups = vi.fn();

    subscribeToBridge(bridge(',C0001,C0004,'), onGroups);

    expect(onGroups).toHaveBeenCalledExactlyOnceWith(',C0001,C0004,');
  });

  it('stays silent until OneTrust has published', () => {
    // `null` is not the same as an empty string: it means OneTrust has not spoken, so reporting
    // now would assert a denial the visitor never made.
    const onGroups = vi.fn();

    subscribeToBridge(bridge(null), onGroups);

    expect(onGroups).not.toHaveBeenCalled();
  });

  it('reports an empty publish, which is a real verdict', () => {
    const onGroups = vi.fn();

    subscribeToBridge(bridge(''), onGroups);

    expect(onGroups).toHaveBeenCalledExactlyOnceWith('');
  });

  it('reports every later publish', () => {
    const onGroups = vi.fn();
    const target = bridge(null);

    subscribeToBridge(target, onGroups);
    target.listeners.forEach((listener) => listener(',C0001,'));
    target.listeners.forEach((listener) => listener(',C0001,C0002,'));

    expect(onGroups.mock.calls).toEqual([[',C0001,'], [',C0001,C0002,']]);
  });

  it('stops reporting once cleaned up, leaving other listeners attached', () => {
    const onGroups = vi.fn();
    const other = vi.fn();
    const target = bridge(null);
    target.listeners.push(other);

    const stop = subscribeToBridge(target, onGroups);
    stop?.();
    target.listeners.forEach((listener) => listener(',C0001,'));

    expect(onGroups).not.toHaveBeenCalled();
    expect(other).toHaveBeenCalledOnce();
  });

  it('does nothing without a bridge', () => {
    // The head plugin skips the bootstrap on a market with no script ID, so the adapter can be
    // set up with nothing to subscribe to.
    expect(subscribeToBridge(undefined, vi.fn())).toBeUndefined();
  });
});
