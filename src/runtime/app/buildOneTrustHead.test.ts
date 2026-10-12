import { describe, expect, it } from 'vitest';
import { buildOneTrustHead } from './buildOneTrustHead';

const SCRIPT = '10378097-4355-4435-be22-e07c5874eac9';

// The two script tags have different shapes, so `.find()` returns a union and property access on
// it will not typecheck. Widen once here rather than casting at every assertion.
const tags = (...args: Parameters<typeof buildOneTrustHead>) =>
  buildOneTrustHead(...args).script as unknown as Array<Record<string, unknown>>;
const bootstrap = (...args: Parameters<typeof buildOneTrustHead>) =>
  tags(...args).find((tag) => tag.key === 'onetrust-bootstrap')!;
const stub = (...args: Parameters<typeof buildOneTrustHead>) =>
  tags(...args).find((tag) => tag.key === 'onetrust-sdk')!;

describe('buildOneTrustHead', () => {
  it('emits no preload without a banner SDK URL', () => {
    expect(buildOneTrustHead(SCRIPT).link).toEqual([]);
  });

  it('preloads the banner SDK at low priority, without crossorigin', () => {
    const href = 'https://cdn.cookielaw.org/scripttemplates/202608.1.0/otBannerSdk.js';
    const [link] = buildOneTrustHead(SCRIPT, { bannerSdkUrl: href }).link;
    expect(link).toEqual({ key: 'onetrust-banner-sdk', rel: 'preload', as: 'script', fetchpriority: 'low', href });
  });

  it('puts the domain script on the stub tag', () => {
    expect(stub(SCRIPT)['data-domain-script']).toBe(SCRIPT);
  });

  it('defaults to the cookielaw CDN', () => {
    expect(stub(SCRIPT).src).toBe('https://cdn.cookielaw.org/scripttemplates/otSDKStub.js');
  });

  it('honours a custom CDN host', () => {
    expect(stub(SCRIPT, { cdnHost: 'cdn-apac.onetrust.com' }).src).toBe(
      'https://cdn-apac.onetrust.com/scripttemplates/otSDKStub.js'
    );
  });

  it('requests document-language detection by default', () => {
    expect(stub(SCRIPT)['data-document-language']).toBe('true');
  });

  it('omits the document-language attribute when disabled', () => {
    expect(stub(SCRIPT, { documentLanguage: false })).not.toHaveProperty('data-document-language');
  });

  it('loads the stub asynchronously', () => {
    expect(stub(SCRIPT).async).toBe(true);
  });

  it('uses numeric priorities, not unhead alias strings', () => {
    expect(typeof bootstrap(SCRIPT).tagPriority).toBe('number');
    expect(typeof stub(SCRIPT).tagPriority).toBe('number');
  });

  it('sorts the bootstrap above the stub', () => {
    expect(bootstrap(SCRIPT).tagPriority as number).toBeLessThan(stub(SCRIPT).tagPriority as number);
  });

  it('keeps the weight unhead already gives an async script', () => {
    expect(stub(SCRIPT).tagPriority).toBe(30);
  });

  it('defines OptanonWrapper in the bootstrap', () => {
    expect(bootstrap(SCRIPT).innerHTML).toContain('OptanonWrapper');
  });

  it('registers the OneTrust change listener in the bootstrap', () => {
    expect(bootstrap(SCRIPT).innerHTML).toContain('OnConsentChanged');
  });

  it('never emits the auto-blocking script', () => {
    expect(JSON.stringify(buildOneTrustHead(SCRIPT))).not.toContain('otAutoBlock');
  });

  // Regression: unhead drops a whole tag carrying a property it does not model, so the stub simply
  // never reached the rendered head. OneTrust's own snippet includes charset, which makes this an
  // easy mistake to reintroduce by copying their docs.
  it('emits only properties unhead models on the stub tag', () => {
    const allowed = new Set([
      'key',
      'tagPriority',
      'src',
      'type',
      'async',
      'defer',
      'data-domain-script',
      'data-document-language',
    ]);

    for (const property of Object.keys(stub(SCRIPT))) {
      expect(allowed, `unexpected script property "${property}"`).toContain(property);
    }
  });
});
