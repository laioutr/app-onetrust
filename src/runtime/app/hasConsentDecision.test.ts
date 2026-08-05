import { describe, expect, it } from 'vitest';
import { hasConsentDecision } from './hasConsentDecision';
import type { OneTrustSdk } from '../types';

const DATESTAMP = '2026-08-05T10:15:30.123Z';

const sdk = (isAlertBoxClosed: boolean): OneTrustSdk => ({
  ToggleInfoDisplay: () => {},
  OnConsentChanged: () => {},
  IsAlertBoxClosed: () => isAlertBoxClosed,
});

describe('hasConsentDecision', () => {
  it('reports a decision once the SDK says the banner has been closed', () => {
    expect(hasConsentDecision(sdk(true), null)).toBe(true);
  });

  it('reports no decision while the SDK says the banner is still open', () => {
    expect(hasConsentDecision(sdk(false), null)).toBe(false);
  });

  it('lets a loaded SDK overrule the cookie', () => {
    // Reachable when OneTrust reopens the banner for a re-consent campaign: the datestamp is still
    // on the visitor's machine, but the decision it recorded has been withdrawn.
    expect(hasConsentDecision(sdk(false), DATESTAMP)).toBe(false);
  });

  it('falls back to the cookie before the SDK loads, which is what makes SSR correct', () => {
    expect(hasConsentDecision(undefined, DATESTAMP)).toBe(true);
  });

  it('falls back to the cookie when only the OneTrust stub has run', () => {
    const stub = { ToggleInfoDisplay: () => {}, OnConsentChanged: () => {} } as unknown as OneTrustSdk;

    expect(hasConsentDecision(stub, DATESTAMP)).toBe(true);
  });

  it('reports no decision when neither source has anything to say', () => {
    expect(hasConsentDecision(undefined, null)).toBe(false);
    expect(hasConsentDecision(undefined, undefined)).toBe(false);
    expect(hasConsentDecision(undefined, '')).toBe(false);
  });
});
