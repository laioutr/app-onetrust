/**
 * Where the OneTrust banner SDK lives, for preloading it.
 *
 * The banner is the last link of a chain the stub walks one request at a time: the stub fetches the
 * domain config, reads the published `Version` from it, and only then inserts
 * `scripttemplates/<Version>/otBannerSdk.js` (~145 KB). On a category page with throttled mobile
 * settings that request started at 2.2 s, after the page's images, and finished at 6.5 s; the
 * banner — the page's LCP element for every visitor without a stored decision — painted at 7.9 s.
 * Naming the SDK in `<head>` lets it start with the first wave of requests, and the banner painted at
 * 5.5 s (median of 5 runs each).
 *
 * The URL cannot be hard-coded: `Version` moves whenever the tenant publishes in OneTrust. It is read
 * from the same config the stub reads, server side, and cached per process.
 */

/** OneTrust versions look like `202608.1.0`. Anything else is not interpolated into a URL. */
const VERSION = /^\d+\.\d+\.\d+$/;

/** The domain config the stub fetches first. `scriptId` is OneTrust's `data-domain-script`. */
export const configUrl = (cdnHost: string, scriptId: string) =>
  `https://${cdnHost}/consent/${scriptId}/${scriptId}.json`;

/**
 * The SDK URL a published config points at, or `undefined` for a config without a usable version.
 *
 * The host is the stub's own, not the config's `CDNLocation`: the stub loads the SDK from the host it
 * was served from, and a preload is only consumed by a request for the identical URL.
 */
export const bannerSdkUrlFromConfig = (config: unknown, cdnHost: string): string | undefined => {
  const version = (config as { Version?: unknown } | null)?.Version;
  if (typeof version !== 'string' || !VERSION.test(version)) return undefined;
  return `https://${cdnHost}/scripttemplates/${version}/otBannerSdk.js`;
};

export interface BannerSdkUrlCacheOptions {
  fetchConfig?: (url: string, signal: AbortSignal) => Promise<unknown>;
  now?: () => number;
  /** How long a resolved URL is served before it is refreshed. */
  ttlMs?: number;
  /** How long a failed lookup is remembered, so a OneTrust outage is not retried on every request. */
  failureTtlMs?: number;
  timeoutMs?: number;
}

/**
 * A per-process cache of {@link bannerSdkUrlFromConfig}, read without ever waiting.
 *
 * `peek` returns what is cached — stale or not — and starts a refresh in the background when the
 * entry is missing or expired. A request never waits on OneTrust: the first render of a cold process
 * simply emits no preload. A stale URL after a OneTrust publish costs one wasted preload per page
 * until the refresh lands; the stub still loads the right SDK.
 */
export const createBannerSdkUrlCache = ({
  fetchConfig = async (url, signal) => {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  now = Date.now,
  ttlMs = 60 * 60 * 1000,
  failureTtlMs = 5 * 60 * 1000,
  timeoutMs = 3000,
}: BannerSdkUrlCacheOptions = {}) => {
  const entries = new Map<string, { url: string | undefined; expires: number }>();
  const inFlight = new Map<string, Promise<void>>();

  const refresh = (cdnHost: string, scriptId: string, key: string) => {
    if (inFlight.has(key)) return inFlight.get(key)!;
    const task = fetchConfig(configUrl(cdnHost, scriptId), AbortSignal.timeout(timeoutMs))
      .then((config) => {
        const url = bannerSdkUrlFromConfig(config, cdnHost);
        // A config without a version is a failure, not a value: keep serving the last good URL.
        if (!url) throw new Error('config has no usable Version');
        entries.set(key, { url, expires: now() + ttlMs });
      })
      .catch(() => {
        const previous = entries.get(key);
        entries.set(key, { url: previous?.url, expires: now() + failureTtlMs });
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, task);
    return task;
  };

  return {
    peek(cdnHost: string, scriptId: string): string | undefined {
      const key = `${cdnHost}\n${scriptId}`;
      const entry = entries.get(key);
      // Not awaited: `refresh` never rejects, and the request must not wait on OneTrust.
      if (!entry || entry.expires <= now()) refresh(cdnHost, scriptId, key);
      return entry?.url;
    },
    /** Test hook: the pending refresh for a key, if any. */
    settled: () => Promise.all(inFlight.values()),
  };
};
