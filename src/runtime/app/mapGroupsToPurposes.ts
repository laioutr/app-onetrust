import type { ConsentState } from '#frontend/consent';
import type { ConsentPurpose } from '../../module';

/**
 * Reduce granted OneTrust group IDs to the canonical consent state.
 *
 * `necessary` is always true: OneTrust marks C0001 "always active" and the consent store asserts
 * the same in its own default.
 *
 * A group absent from the mapping grants nothing. There is no `unclassified` purpose to park it in
 * any more, and the old one gated nothing regardless — it was referenced by no EventPurpose — so
 * dropping it changes no consumer's behaviour. The adapter warns in dev instead, which is what
 * keeps a tenant's added category visible rather than silent.
 */
export const mapGroupsToPurposes = (
  grantedGroups: string[],
  groupMapping: Record<string, ConsentPurpose | ConsentPurpose[]>
): ConsentState => {
  const state: ConsentState = {
    necessary: true,
    functional: false,
    analytics: false,
    advertising: false,
    personalization: false,
  };

  for (const group of grantedGroups) {
    const mapped = groupMapping[group];

    if (!mapped) continue;

    for (const purpose of Array.isArray(mapped) ? mapped : [mapped]) {
      state[purpose] = true;
    }
  }

  return state;
};
