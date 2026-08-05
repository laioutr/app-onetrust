import type { OneTrustSdk } from '../types';

/**
 * Whether the visitor has actually answered the OneTrust prompt.
 *
 * Neither the granted groups nor the bridge can answer this. OneTrust publishes its regional
 * default before the visitor touches anything, so a first-time visitor in an opt-out region already
 * reads as fully granted, and one in an opt-in region reads exactly like someone who refused
 * everything. `OptanonAlertBoxClosed` is the only signal written solely on interaction.
 *
 * `IsAlertBoxClosed()` and that cookie are the same signal, live and at rest. The SDK wins once it
 * has loaded — OneTrust rewrites the cookie when the visitor saves, and `useCookie`'s ref does not
 * re-read it — while the cookie is what carries SSR and hydration, before the SDK arrives.
 */
export const hasConsentDecision = (sdk: OneTrustSdk | undefined, alertBoxClosed: string | null | undefined): boolean => {
  if (typeof sdk?.IsAlertBoxClosed === 'function') {
    return sdk.IsAlertBoxClosed() === true;
  }

  return Boolean(alertBoxClosed);
};
