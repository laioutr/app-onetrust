import { describe, expect, it } from 'vitest';
import { parseOptanonConsent } from './parseOptanonConsent';

const ENCODED =
  'isGpcEnabled%3D0%26datestamp%3DWed%2BAug%2B05%2B2026%26version%3D202605.1.0%26interactionCount%3D1%26groups%3DC0001%253A1%252CC0002%253A1%252CC0003%253A0%252CC0004%253A0%252CC0005%253A0';

describe('parseOptanonConsent', () => {
  it('returns the granted group IDs from an encoded cookie', () => {
    expect(parseOptanonConsent(ENCODED)).toEqual(['C0001', 'C0002']);
  });

  it('returns the granted group IDs from an already-decoded cookie', () => {
    expect(parseOptanonConsent('interactionCount=1&groups=C0001:1,C0004:1,C0002:0')).toEqual(['C0001', 'C0004']);
  });

  it('returns an empty array when the visitor granted nothing', () => {
    expect(parseOptanonConsent('groups=C0001:0,C0002:0')).toEqual([]);
  });

  it('returns null when the cookie carries no groups key', () => {
    expect(parseOptanonConsent('interactionCount=1&version=202605.1.0')).toBeNull();
  });

  it('returns null for an empty cookie', () => {
    expect(parseOptanonConsent('')).toBeNull();
  });

  it('returns null for a missing cookie', () => {
    expect(parseOptanonConsent(null)).toBeNull();
    expect(parseOptanonConsent(undefined)).toBeNull();
  });

  it('returns null rather than throwing on an undecodable value', () => {
    expect(parseOptanonConsent('%E0%A4%A')).toBeNull();
  });

  it('skips malformed pairs that carry no verdict', () => {
    expect(parseOptanonConsent('groups=C0001:1,C0002,C0003:1')).toEqual(['C0001', 'C0003']);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseOptanonConsent('groups= C0001 : 1 , C0002 : 0 ')).toEqual(['C0001']);
  });
});
