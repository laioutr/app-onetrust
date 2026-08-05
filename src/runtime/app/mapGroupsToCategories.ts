import type { ConsentManagementState } from '#frontend/consent';
import type { ConsentCategory } from '../../module';

/**
 * Reduce granted OneTrust group IDs to the canonical consent state.
 *
 * `necessary` is always true: OneTrust marks C0001 "always active" and the consent store asserts
 * the same in its own default. An unmapped group sets `unclassified` rather than being dropped,
 * so a tenant adding a category without updating configuration is visible instead of silent.
 */
export const mapGroupsToCategories = (
  grantedGroups: string[],
  groupMapping: Record<string, ConsentCategory | ConsentCategory[]>
): ConsentManagementState => {
  const state: ConsentManagementState = {
    necessary: true,
    functional: false,
    statistics: false,
    marketing: false,
    unclassified: false,
  };

  for (const group of grantedGroups) {
    const mapped = groupMapping[group];

    if (!mapped) {
      state.unclassified = true;
      continue;
    }

    for (const category of Array.isArray(mapped) ? mapped : [mapped]) {
      state[category] = true;
    }
  }

  return state;
};
