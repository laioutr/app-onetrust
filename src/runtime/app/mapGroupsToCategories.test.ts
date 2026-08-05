import { describe, expect, it } from 'vitest';
import { mapGroupsToCategories } from './mapGroupsToCategories';
import type { ConsentCategory } from '../../module';

const DEFAULTS: Record<string, ConsentCategory | ConsentCategory[]> = {
  C0001: 'necessary',
  C0002: 'statistics',
  C0003: 'functional',
  C0004: 'marketing',
  C0005: 'unclassified',
};

describe('mapGroupsToCategories', () => {
  it('grants necessary even when nothing was granted', () => {
    expect(mapGroupsToCategories([], DEFAULTS)).toEqual({
      necessary: true,
      functional: false,
      statistics: false,
      marketing: false,
      unclassified: false,
    });
  });

  it('maps the stock groups onto their categories', () => {
    expect(mapGroupsToCategories(['C0001', 'C0002', 'C0003', 'C0004'], DEFAULTS)).toEqual({
      necessary: true,
      functional: true,
      statistics: true,
      marketing: true,
      unclassified: false,
    });
  });

  it('does not grant marketing from social media alone', () => {
    const state = mapGroupsToCategories(['C0001', 'C0005'], DEFAULTS);
    expect(state.marketing).toBe(false);
    expect(state.unclassified).toBe(true);
  });

  it('flags an unknown group as unclassified', () => {
    const state = mapGroupsToCategories(['C0099'], DEFAULTS);
    expect(state.unclassified).toBe(true);
    expect(state.statistics).toBe(false);
  });

  it('lets an override replace a default', () => {
    const state = mapGroupsToCategories(['C0005'], { ...DEFAULTS, C0005: 'marketing' });
    expect(state.marketing).toBe(true);
    expect(state.unclassified).toBe(false);
  });

  it('grants every category in an array value', () => {
    const state = mapGroupsToCategories(['C0002'], { ...DEFAULTS, C0002: ['statistics', 'functional'] });
    expect(state.statistics).toBe(true);
    expect(state.functional).toBe(true);
    expect(state.marketing).toBe(false);
  });

  it('maps a custom group ID supplied by configuration', () => {
    const state = mapGroupsToCategories(['C0007'], { ...DEFAULTS, C0007: 'marketing' });
    expect(state.marketing).toBe(true);
    expect(state.unclassified).toBe(false);
  });

  it('ignores duplicate group IDs', () => {
    expect(mapGroupsToCategories(['C0004', 'C0004'], DEFAULTS).marketing).toBe(true);
  });
});
