import { describe, expect, it } from 'vitest';
import { validateDomainScriptConfig } from './validateDomainScriptConfig';
import type { KnownMarket } from './validateDomainScriptConfig';

const MARKET_DE = 'd6b03ihh228s8e4i35og';
const MARKET_FR = 'd7c14jii339t9f5j46ph';
const SCRIPT_DE = '10378097-4355-4435-be22-e07c5874eac9';
const SCRIPT_FR = '78ce031e-aa89-4c18-9b0a-315b795b7ab9';

const markets: Record<string, KnownMarket> = {
  a: { id: MARKET_DE, slug: 'germany' },
  b: { id: MARKET_FR, slug: 'france' },
};

describe('validateDomainScriptConfig', () => {
  it('reports a missing configuration', () => {
    expect(validateDomainScriptConfig(undefined, markets)).toEqual([
      'No domain script configured. Not installing OneTrust.',
    ]);
  });

  it('accepts the string form without inspecting markets', () => {
    expect(validateDomainScriptConfig(SCRIPT_DE, markets)).toEqual([]);
  });

  it('reports an empty record', () => {
    expect(validateDomainScriptConfig({}, markets)).toEqual([
      '`domainScript` is an empty object. Not installing OneTrust for any market.',
    ]);
  });

  it('skips validation when no markets are known', () => {
    expect(validateDomainScriptConfig({ [MARKET_DE]: SCRIPT_DE }, undefined)).toEqual([]);
  });

  it('reports a key that names no known market', () => {
    const issues = validateDomainScriptConfig(
      { [MARKET_DE]: SCRIPT_DE, [MARKET_FR]: SCRIPT_FR, typo: SCRIPT_DE },
      markets
    );
    expect(issues).toEqual(['`domainScript` has an entry for "typo", which is not a known market ID.']);
  });

  it('reports a known market with no entry', () => {
    const issues = validateDomainScriptConfig({ [MARKET_DE]: SCRIPT_DE }, markets);
    expect(issues).toEqual([
      `No domain script configured for market "france" (${MARKET_FR}). OneTrust will not load there.`,
    ]);
  });

  it('reports both classes of issue together', () => {
    const issues = validateDomainScriptConfig({ typo: SCRIPT_DE }, markets);
    expect(issues).toHaveLength(3);
    expect(issues[0]).toContain('"typo"');
    expect(issues[1]).toContain('"germany"');
    expect(issues[2]).toContain('"france"');
  });

  it('produces no issues for a fully mapped record', () => {
    expect(validateDomainScriptConfig({ [MARKET_DE]: SCRIPT_DE, [MARKET_FR]: SCRIPT_FR }, markets)).toEqual([]);
  });
});
