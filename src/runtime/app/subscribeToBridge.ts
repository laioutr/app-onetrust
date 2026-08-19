import type { OneTrustBridge } from '../types';

/**
 * Attach to the `window.__laioutrOneTrust` bridge the inline bootstrap accumulates into, and
 * replay whatever it already holds.
 *
 * The replay is what makes a pre-hydration verdict reach the store: the bootstrap runs at HTML
 * parse, so `OptanonWrapper` routinely fires before this plugin exists. `groups` is `null` until
 * OneTrust first publishes, which is how "OneTrust has not spoken" stays distinct from "OneTrust
 * says nothing is granted" — only the latter is a verdict worth reporting.
 *
 * Returns the unsubscribe, or `undefined` when there is no bridge to attach to.
 */
export const subscribeToBridge = (bridge: OneTrustBridge | undefined, onGroups: (groups: string) => void): (() => void) | undefined => {
  if (!bridge) return undefined;

  bridge.listeners.push(onGroups);

  if (bridge.groups !== null) {
    onGroups(bridge.groups);
  }

  return () => {
    bridge.listeners = bridge.listeners.filter((listener) => listener !== onGroups);
  };
};
