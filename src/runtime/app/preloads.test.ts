import { describe, expect, it, vi } from 'vitest';
import {
  assetUrlsOf,
  bannerSdkUrlFromConfig,
  configUrl,
  createPreloadCache,
  languageUrlOf,
  regionRuleOf,
  resolveLanguage,
} from './preloads';

const HOST = 'cdn.cookielaw.org';
const SCRIPT = '10378097-4355-4435-be22-e07c5874eac9';
const RULE = '019246d5-964f-773c-af77-35915acb3697';
const SDK = (version: string) => `https://${HOST}/scripttemplates/${version}/otBannerSdk.js`;
const ASSETS = `https://${HOST}/scripttemplates/202608.1.0/assets`;
const LANGUAGE_FILE = (language: string) => `https://${HOST}/consent/${SCRIPT}/${RULE}/${language}.json`;

// The shape of the sport-korting.nl config, reduced to what the preloads read.
const PLACEHOLDERS = { default: 'de', en: 'en', it: 'it', pl: 'pl', fr: 'fr', es: 'es', nl: 'nl' };
const rule = (extra: Record<string, unknown> = {}) => ({
  Id: RULE,
  Default: true,
  Global: true,
  Conditions: [],
  VariantEnabled: false,
  LanguageSwitcherPlaceholder: PLACEHOLDERS,
  ...extra,
});
const config = (extra: Record<string, unknown> = {}) => ({
  Version: '202608.1.0',
  SkipGeolocation: true,
  MultiVariantTestingEnabled: false,
  DataLanguage: '',
  TenantFeatures: {},
  RuleSet: [rule()],
  ...extra,
});
const languageFile = (extra: Record<string, unknown> = {}) => ({
  DomainData: { Flat: true, Panel: true, PCTemplateUpgrade: true, ...extra },
});

describe('configUrl', () => {
  it('is the domain config the stub fetches', () => {
    expect(configUrl(HOST, SCRIPT)).toBe(`https://${HOST}/consent/${SCRIPT}/${SCRIPT}.json`);
  });
});

describe('bannerSdkUrlFromConfig', () => {
  it('builds the SDK path from the published version', () => {
    expect(bannerSdkUrlFromConfig({ Version: '202608.1.0' }, HOST)).toBe(SDK('202608.1.0'));
  });

  it('uses the stub host, not the config CDNLocation', () => {
    expect(bannerSdkUrlFromConfig({ Version: '202608.1.0', CDNLocation: 'https://elsewhere.example' }, HOST)).toBe(
      SDK('202608.1.0')
    );
  });

  it.each([[undefined], [null], [{}], [{ Version: 202608 }], [{ Version: '../evil' }], [{ Version: '202608.1.0/x' }]])(
    'rejects %j',
    (value) => {
      expect(bannerSdkUrlFromConfig(value, HOST)).toBeUndefined();
    }
  );
});

describe('regionRuleOf', () => {
  it('takes a single rule wherever the visitor is', () => {
    expect(regionRuleOf(config({ SkipGeolocation: false }))?.Id).toBe(RULE);
  });

  it('takes the default rule when geolocation is skipped', () => {
    const other = rule({ Id: '00000000-0000-0000-0000-000000000000', Default: false });
    expect(regionRuleOf(config({ RuleSet: [other, rule()] }))?.Id).toBe(RULE);
  });

  it('cannot predict a rule chosen by geolocation', () => {
    const other = rule({ Id: '00000000-0000-0000-0000-000000000000', Default: false });
    expect(regionRuleOf(config({ SkipGeolocation: false, RuleSet: [other, rule()] }))).toBeUndefined();
  });
});

describe('resolveLanguage', () => {
  it.each([
    ['nl', 'nl'],
    ['NL', 'nl'],
    ['nl-NL', 'nl'],
    ['nl_BE', 'nl'],
    ['de-CH', 'de'],
    ['sv', 'de'],
  ])('maps <html lang="%s"> to %s', (lang, expected) => {
    expect(resolveLanguage(config(), rule(), lang)).toBe(expected);
  });

  it('prefers an exact regional match', () => {
    expect(resolveLanguage(config(), rule({ LanguageSwitcherPlaceholder: { default: 'en', 'fr-ca': 'fr-ca', fr: 'fr' } }), 'fr-CA')).toBe(
      'fr-ca'
    );
  });

  it('matches a regional key by its primary subtag', () => {
    expect(resolveLanguage(config(), rule({ LanguageSwitcherPlaceholder: { default: 'en', 'pt-br': 'pt-br' } }), 'pt')).toBe('pt-br');
  });

  it('lets a fixed DataLanguage win', () => {
    expect(resolveLanguage(config({ DataLanguage: 'en_GB' }), rule(), 'nl')).toBe('en-gb');
  });
});

describe('languageUrlOf', () => {
  it('builds the language file under the region rule', () => {
    expect(languageUrlOf(config(), HOST, SCRIPT, 'nl')).toBe(LANGUAGE_FILE('nl'));
  });

  it('needs the document language', () => {
    expect(languageUrlOf(config(), HOST, SCRIPT, undefined)).toBeUndefined();
  });

  it.each([
    ['conditional logic', config({ RuleSet: [rule({ Conditions: [{ Id: 'x' }] })] })],
    ['an A/B variant', config({ MultiVariantTestingEnabled: true, RuleSet: [rule({ VariantEnabled: true })] })],
    ['the server-rendered banner', config({ TenantFeatures: { CookieV2SSR: true } })],
    ['a malformed rule id', config({ RuleSet: [rule({ Id: '../evil' })] })],
  ])('gives up on %s', (_, value) => {
    expect(languageUrlOf(value, HOST, SCRIPT, 'nl')).toBeUndefined();
  });
});

describe('assetUrlsOf', () => {
  it('names the layouts the language file selects', () => {
    expect(assetUrlsOf(languageFile(), HOST, '202608.1.0')).toEqual([
      `${ASSETS}/otFlat.json`,
      `${ASSETS}/v2/otPcPanel.json`,
      `${ASSETS}/otCommonStyles.css`,
    ]);
  });

  it('follows the SDK flag order when several are set', () => {
    expect(assetUrlsOf(languageFile({ Flat: false, FloatingFlat: true, CenterRounded: true }), HOST, '202608.1.0')[0]).toBe(
      `${ASSETS}/otFloatingFlat.json`
    );
  });

  it('keeps the classic preference centre outside v2', () => {
    expect(assetUrlsOf(languageFile({ PCTemplateUpgrade: false }), HOST, '202608.1.0')[1]).toBe(`${ASSETS}/otPcPanel.json`);
  });

  it('loads the right-to-left variants', () => {
    expect(assetUrlsOf(languageFile({ UseRTL: true }), HOST, '202608.1.0')).toEqual([
      `${ASSETS}/otFlatRtl.json`,
      `${ASSETS}/v2/otPcPanelRtl.json`,
      `${ASSETS}/otCommonStylesRtl.css`,
    ]);
  });

  it('preloads no banner layout when there is no banner', () => {
    expect(assetUrlsOf(languageFile({ Flat: false, NoBanner: true }), HOST, '202608.1.0')).toEqual([
      `${ASSETS}/v2/otPcPanel.json`,
      `${ASSETS}/otCommonStyles.css`,
    ]);
  });

  it('returns nothing for a file without DomainData', () => {
    expect(assetUrlsOf({}, HOST, '202608.1.0')).toEqual([]);
  });
});

describe('createPreloadCache', () => {
  const setup = (responses: Record<string, Array<unknown | Error>>) => {
    let time = 0;
    const fetchJson = vi.fn(async (url: string) => {
      const next = responses[url]?.shift();
      if (next === undefined || next instanceof Error) throw next ?? new Error(`unexpected ${url}`);
      return next;
    });
    const cache = createPreloadCache({ fetchJson, now: () => time, ttlMs: 100, failureTtlMs: 10 });
    return { cache, fetchJson, advance: (ms: number) => (time += ms) };
  };
  const CONFIG = configUrl(HOST, SCRIPT);
  const FULL = {
    bannerSdk: SDK('202608.1.0'),
    fetches: [CONFIG, LANGUAGE_FILE('nl'), `${ASSETS}/otFlat.json`, `${ASSETS}/v2/otPcPanel.json`, `${ASSETS}/otCommonStyles.css`],
  };

  it('preloads only the config on a cold cache, and never waits for the lookup', async () => {
    const { cache, fetchJson } = setup({ [CONFIG]: [config()], [LANGUAGE_FILE('nl')]: [languageFile()] });
    expect(cache.peek(HOST, SCRIPT, 'nl')).toEqual({ fetches: [CONFIG] });
    expect(fetchJson).toHaveBeenCalledTimes(1);
    await cache.settled();
    expect(cache.peek(HOST, SCRIPT, 'nl')).toEqual(FULL);
  });

  it('stops at the config without a document language', async () => {
    const { cache, fetchJson } = setup({ [CONFIG]: [config()] });
    cache.peek(HOST, SCRIPT);
    await cache.settled();
    expect(cache.peek(HOST, SCRIPT)).toEqual({ bannerSdk: SDK('202608.1.0'), fetches: [CONFIG] });
    expect(fetchJson).toHaveBeenCalledTimes(1);
  });

  it('keeps the first half of the chain when the language file fails', async () => {
    const { cache } = setup({ [CONFIG]: [config()], [LANGUAGE_FILE('nl')]: [new Error('down')] });
    cache.peek(HOST, SCRIPT, 'nl');
    await cache.settled();
    expect(cache.peek(HOST, SCRIPT, 'nl')).toEqual({ bannerSdk: SDK('202608.1.0'), fetches: [CONFIG] });
  });

  it('deduplicates concurrent lookups', async () => {
    const { cache, fetchJson } = setup({ [CONFIG]: [config()], [LANGUAGE_FILE('nl')]: [languageFile()] });
    cache.peek(HOST, SCRIPT, 'nl');
    cache.peek(HOST, SCRIPT, 'nl');
    await cache.settled();
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });

  it('serves the stale preloads while a refresh picks up a new publish', async () => {
    const { cache, advance } = setup({
      [CONFIG]: [config(), config({ Version: '202609.1.0' })],
      [LANGUAGE_FILE('nl')]: [languageFile(), languageFile()],
    });
    cache.peek(HOST, SCRIPT, 'nl');
    await cache.settled();
    advance(101);
    expect(cache.peek(HOST, SCRIPT, 'nl').bannerSdk).toBe(SDK('202608.1.0'));
    await cache.settled();
    expect(cache.peek(HOST, SCRIPT, 'nl').bannerSdk).toBe(SDK('202609.1.0'));
  });

  it('keeps the last good preloads through a failed refresh, and backs off', async () => {
    const { cache, fetchJson, advance } = setup({
      [CONFIG]: [config(), new Error('down'), config()],
      [LANGUAGE_FILE('nl')]: [languageFile(), languageFile()],
    });
    cache.peek(HOST, SCRIPT, 'nl');
    await cache.settled();
    advance(101);
    cache.peek(HOST, SCRIPT, 'nl');
    await cache.settled();
    expect(cache.peek(HOST, SCRIPT, 'nl')).toEqual(FULL);
    expect(fetchJson).toHaveBeenCalledTimes(3);
    advance(11);
    cache.peek(HOST, SCRIPT, 'nl');
    expect(fetchJson).toHaveBeenCalledTimes(4);
  });

  it('treats a config without a version as a failure', async () => {
    const { cache } = setup({ [CONFIG]: [{}] });
    cache.peek(HOST, SCRIPT, 'nl');
    await cache.settled();
    expect(cache.peek(HOST, SCRIPT, 'nl')).toEqual({ fetches: [CONFIG] });
  });

  it('keys the cache by host, script and language', async () => {
    const { cache, fetchJson } = setup({
      [CONFIG]: [config(), config()],
      [LANGUAGE_FILE('nl')]: [languageFile()],
      [LANGUAGE_FILE('pl')]: [languageFile()],
    });
    cache.peek(HOST, SCRIPT, 'nl');
    cache.peek(HOST, SCRIPT, 'pl');
    await cache.settled();
    expect(fetchJson).toHaveBeenCalledTimes(4);
    expect(cache.peek(HOST, SCRIPT, 'pl').fetches[1]).toBe(LANGUAGE_FILE('pl'));
  });
});
