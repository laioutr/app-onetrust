import { describe, expect, it, vi } from 'vitest';
import { bannerSdkUrlFromConfig, configUrl, createBannerSdkUrlCache } from './bannerSdkUrl';

const HOST = 'cdn.cookielaw.org';
const SCRIPT = '10378097-4355-4435-be22-e07c5874eac9';
const SDK = (version: string) => `https://${HOST}/scripttemplates/${version}/otBannerSdk.js`;

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
    (config) => {
      expect(bannerSdkUrlFromConfig(config, HOST)).toBeUndefined();
    }
  );
});

describe('createBannerSdkUrlCache', () => {
  const setup = (responses: Array<unknown | Error>) => {
    let time = 0;
    const fetchConfig = vi.fn(async () => {
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next;
    });
    const cache = createBannerSdkUrlCache({ fetchConfig, now: () => time, ttlMs: 100, failureTtlMs: 10 });
    return { cache, fetchConfig, advance: (ms: number) => (time += ms) };
  };

  it('returns nothing on a cold cache and never waits for the lookup', async () => {
    const { cache, fetchConfig } = setup([{ Version: '202608.1.0' }]);
    expect(cache.peek(HOST, SCRIPT)).toBeUndefined();
    expect(fetchConfig).toHaveBeenCalledTimes(1);
    await cache.settled();
    expect(cache.peek(HOST, SCRIPT)).toBe(SDK('202608.1.0'));
  });

  it('deduplicates concurrent lookups', async () => {
    const { cache, fetchConfig } = setup([{ Version: '202608.1.0' }]);
    cache.peek(HOST, SCRIPT);
    cache.peek(HOST, SCRIPT);
    await cache.settled();
    expect(fetchConfig).toHaveBeenCalledTimes(1);
  });

  it('serves the stale URL while a refresh picks up a new publish', async () => {
    const { cache, advance } = setup([{ Version: '202608.1.0' }, { Version: '202609.1.0' }]);
    cache.peek(HOST, SCRIPT);
    await cache.settled();
    advance(101);
    expect(cache.peek(HOST, SCRIPT)).toBe(SDK('202608.1.0'));
    await cache.settled();
    expect(cache.peek(HOST, SCRIPT)).toBe(SDK('202609.1.0'));
  });

  it('keeps the last good URL through a failed refresh, and backs off', async () => {
    const { cache, fetchConfig, advance } = setup([{ Version: '202608.1.0' }, new Error('down'), { Version: '202608.1.0' }]);
    cache.peek(HOST, SCRIPT);
    await cache.settled();
    advance(101);
    cache.peek(HOST, SCRIPT);
    await cache.settled();
    expect(cache.peek(HOST, SCRIPT)).toBe(SDK('202608.1.0'));
    expect(fetchConfig).toHaveBeenCalledTimes(2);
    advance(11);
    cache.peek(HOST, SCRIPT);
    expect(fetchConfig).toHaveBeenCalledTimes(3);
  });

  it('treats a config without a version as a failure', async () => {
    const { cache } = setup([{}]);
    cache.peek(HOST, SCRIPT);
    await cache.settled();
    expect(cache.peek(HOST, SCRIPT)).toBeUndefined();
  });

  it('keys the cache by host and script', async () => {
    const { cache, fetchConfig } = setup([{ Version: '202608.1.0' }, { Version: '202607.1.0' }]);
    cache.peek(HOST, SCRIPT);
    cache.peek(HOST, 'other-script');
    await cache.settled();
    expect(fetchConfig).toHaveBeenCalledTimes(2);
  });
});
