import { describe, expect, it } from 'vitest';
import { parseActiveGroups } from './parseActiveGroups';

describe('parseActiveGroups', () => {
  it('extracts IDs from the comma-wrapped global', () => {
    expect(parseActiveGroups(',C0001,C0002,')).toEqual(['C0001', 'C0002']);
  });

  it('returns nothing for the empty global OneTrust sets before any decision', () => {
    expect(parseActiveGroups('')).toEqual([]);
  });

  it('returns nothing for a bare separator', () => {
    expect(parseActiveGroups(',')).toEqual([]);
  });

  it('returns nothing when the global is absent', () => {
    expect(parseActiveGroups(undefined)).toEqual([]);
    expect(parseActiveGroups(null)).toEqual([]);
  });

  it('tolerates whitespace around IDs', () => {
    expect(parseActiveGroups(', C0001 , C0004 ,')).toEqual(['C0001', 'C0004']);
  });
});
