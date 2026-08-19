import { describe, expect, it } from 'vitest';
import { mapGroupsToPurposes } from './mapGroupsToPurposes';
import { DEFAULT_GROUP_MAPPING } from '../../module';

const DENIED = {
  necessary: true,
  functional: false,
  analytics: false,
  advertising: false,
  personalization: false,
};

describe('mapGroupsToPurposes', () => {
  it('grants necessary even when nothing was granted', () => {
    expect(mapGroupsToPurposes([], DEFAULT_GROUP_MAPPING)).toEqual(DENIED);
  });

  it('maps the stock groups onto their purposes', () => {
    expect(mapGroupsToPurposes(['C0001', 'C0002', 'C0003', 'C0004'], DEFAULT_GROUP_MAPPING)).toEqual({
      necessary: true,
      functional: true,
      analytics: true,
      advertising: true,
      personalization: true,
    });
  });

  it('grants both ad purposes from targeting alone', () => {
    // OneTrust drives ad_storage, ad_user_data *and* ad_personalization off C0004 in its own
    // Consent Mode integration. Granting `advertising` without `personalization` would leave the
    // GTM app denying ad_personalization for a visitor OneTrust considers to have allowed it.
    const state = mapGroupsToPurposes(['C0004'], DEFAULT_GROUP_MAPPING);

    expect(state.advertising).toBe(true);
    expect(state.personalization).toBe(true);
  });

  it('grants nothing from social media alone', () => {
    expect(mapGroupsToPurposes(['C0001', 'C0005'], DEFAULT_GROUP_MAPPING)).toEqual(DENIED);
  });

  it('knows the social media group without granting anything for it', () => {
    // Present-but-empty rather than absent. The adapter warns in dev about a granted group it has
    // never heard of, and C0005 gating nothing is a decision rather than an oversight — a warning
    // fired on every visitor who accepts social media would be crying wolf.
    expect(DEFAULT_GROUP_MAPPING.C0005).toEqual([]);
    expect(mapGroupsToPurposes(['C0005'], DEFAULT_GROUP_MAPPING)).toEqual(DENIED);
  });

  it('ignores a group absent from the mapping', () => {
    // There is no `unclassified` purpose to park it in any more. Granting nothing is what the
    // old sink amounted to: it was referenced by no EventPurpose, so it gated nothing.
    expect(mapGroupsToPurposes(['C0099'], DEFAULT_GROUP_MAPPING)).toEqual(DENIED);
  });

  it('lets an override replace a default', () => {
    const state = mapGroupsToPurposes(['C0005'], { ...DEFAULT_GROUP_MAPPING, C0005: 'advertising' });

    expect(state.advertising).toBe(true);
  });

  it('grants every purpose in an array value', () => {
    // The tenant case this exists for: a group named "Analytics & Functional" straddles two.
    const state = mapGroupsToPurposes(['C0002'], { ...DEFAULT_GROUP_MAPPING, C0002: ['analytics', 'functional'] });

    expect(state.analytics).toBe(true);
    expect(state.functional).toBe(true);
    expect(state.advertising).toBe(false);
  });

  it('maps a custom group ID supplied by configuration', () => {
    // The only way to separate the two ad purposes: OneTrust's stock taxonomy has one Targeting
    // group, so a tenant wanting personalization to move independently must add a group for it.
    const state = mapGroupsToPurposes(['C0004', 'C0007'], {
      ...DEFAULT_GROUP_MAPPING,
      C0004: 'advertising',
      C0007: 'personalization',
    });

    expect(state.advertising).toBe(true);
    expect(state.personalization).toBe(true);
  });

  it('ignores duplicate group IDs', () => {
    expect(mapGroupsToPurposes(['C0004', 'C0004'], DEFAULT_GROUP_MAPPING).advertising).toBe(true);
  });

  it('leaves no purpose unreachable through the default mapping', () => {
    // A purpose no group can grant is permanently denied, which is indistinguishable from a
    // visitor refusing it. `personalization` was exactly that until C0004 was mapped to both.
    const everyGroup = Object.keys(DEFAULT_GROUP_MAPPING);
    const state = mapGroupsToPurposes(everyGroup, DEFAULT_GROUP_MAPPING);

    for (const purpose of ['necessary', 'functional', 'analytics', 'advertising', 'personalization'] as const) {
      expect(state[purpose], `no group grants ${purpose}`).toBe(true);
    }
  });
});
