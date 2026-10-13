/**
 * What to preload so the OneTrust banner does not wait on its own request chain.
 *
 * The stub walks that chain one request at a time, and every file names the next: the domain config
 * gives the published `Version` and the region rule, which name the banner SDK and the language file;
 * the language file gives the banner and preference-centre layouts, which name their assets. For
 * every visitor without a stored decision the banner is the largest thing on a category page, so
 * this chain is that page's LCP.
 *
 * Naming the chain in `<head>` lets all of it start with the first wave of requests. The SDK alone
 * (1.4.1) moved the banner from 7.9 s to 5.5 s in a throttled real browser. The rest of the chain
 * added +3 Lighthouse points on a category page, where the banner is the LCP element, and +4 on the
 * home page, where the preloads mostly push GTM's 176 KB past the hero paint (median of 4–5 runs per
 * arm, 2026-10-13). FCP did not move.
 *
 * Nothing here can be hard-coded: `Version` moves whenever the tenant publishes, the language file
 * sits under the region rule's id, and the asset names follow the published layout. They are read
 * from the same two files the stub and SDK read, server side, and cached per process. Where the SDK
 * would pick a file this cannot predict — geolocation across several rules, conditional rules, A/B
 * variants, OneTrust's server-rendered banner, browser-language detection — only the certain part is
 * preloaded.
 *
 * Every URL is built from the stub's host, never from the config's `CDNLocation`: a preload is only
 * consumed by a request for the identical URL.
 */

/** OneTrust versions look like `202608.1.0`. Anything else is not interpolated into a URL. */
const VERSION = /^\d+\.\d+\.\d+$/;
const RULE_ID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const LANGUAGE = /^[a-z]{2,3}(-[a-z\d]{2,8})*$/;

/** The banner layout flags in the language file, in the order the SDK tests them (`setBannerName`). */
const BANNER_LAYOUTS = [
  ['Flat', 'otFlat'],
  ['FloatingRoundedCorner', 'otFloatingRoundedCorner'],
  ['FloatingFlat', 'otFloatingFlat'],
  ['FloatingRounded', 'otFloatingRounded'],
  ['FloatingRoundedIcon', 'otFloatingRoundedIcon'],
  ['CenterRounded', 'otCenterRounded'],
  ['ChoicesBanner', 'otChoicesBanner'],
] as const;

/** The preference-centre layout flags, in the order the SDK tests them (`setPcName`). */
const PC_LAYOUTS = [
  ['Center', 'otPcCenter'],
  ['Panel', 'otPcPanel'],
  ['Popup', 'otPcPopup'],
  ['List', 'otPcList'],
  ['Tab', 'otPcTab'],
] as const;

export interface OneTrustPreloads {
  /** The banner SDK script. */
  bannerSdk?: string;
  /** The rest of the chain, fetched by the stub and SDK: config, language file, layouts, styles. */
  fetches: string[];
}

interface RegionRule {
  Id?: unknown;
  Default?: unknown;
  Conditions?: unknown;
  VariantEnabled?: unknown;
  LanguageSwitcherPlaceholder?: unknown;
}

interface DomainConfig {
  Version?: unknown;
  SkipGeolocation?: unknown;
  MultiVariantTestingEnabled?: unknown;
  DataLanguage?: unknown;
  TenantFeatures?: Record<string, unknown>;
  RuleSet?: RegionRule[];
}

/** The domain config the stub fetches first. `scriptId` is OneTrust's `data-domain-script`. */
export const configUrl = (cdnHost: string, scriptId: string) =>
  `https://${cdnHost}/consent/${scriptId}/${scriptId}.json`;

/** The SDK URL a published config points at, or `undefined` for a config without a usable version. */
export const bannerSdkUrlFromConfig = (config: unknown, cdnHost: string): string | undefined => {
  const version = (config as DomainConfig | null)?.Version;
  if (typeof version !== 'string' || !VERSION.test(version)) return undefined;
  return `https://${cdnHost}/scripttemplates/${version}/otBannerSdk.js`;
};

/**
 * The region rule the stub will choose, when that does not depend on where the visitor is.
 *
 * The stub's `getRegionSet` takes the `Default` rule when it skips geolocation, and otherwise matches
 * the visitor's country, falling back to the `Global` rule. One rule is the same rule everywhere.
 */
export const regionRuleOf = (config: unknown): RegionRule | undefined => {
  const { RuleSet: rules, SkipGeolocation } = (config ?? {}) as DomainConfig;
  if (!Array.isArray(rules)) return undefined;
  if (rules.length === 1) return rules[0];
  const defaults = rules.filter((rule) => rule?.Default === true);
  return SkipGeolocation === true && defaults.length === 1 ? defaults[0] : undefined;
};

/**
 * The language file the SDK will load for a document in `documentLanguage`.
 *
 * A port of the SDK's `getDataLanguageCulture` and `detectDocumentOrBrowserLanguage`, for the
 * `data-document-language` case: a fixed `DataLanguage` wins; otherwise `<html lang>` is matched
 * against the rule's languages exactly, then by its primary subtag, then falls back to `default`.
 */
export const resolveLanguage = (config: unknown, rule: RegionRule, documentLanguage: string): string | undefined => {
  const fixed = (config as DomainConfig | null)?.DataLanguage;
  if (typeof fixed === 'string' && fixed) return fixed.toLowerCase().replace('_', '-');

  const placeholders = rule.LanguageSwitcherPlaceholder;
  if (!placeholders || typeof placeholders !== 'object') return undefined;
  const languages = new Map<string, string>();
  for (const [key, value] of Object.entries(placeholders)) {
    if (typeof value === 'string') languages.set(key.toLowerCase(), value.toLowerCase());
  }

  const lang = documentLanguage.replace('_', '-').toLowerCase();
  const primary = lang.split('-')[0];
  const fallback = languages.get('default');
  const matched =
    languages.get(lang) ??
    languages.get(`${lang}-${lang}`) ??
    (fallback === lang || fallback === primary ? fallback : undefined) ??
    languages.get(primary) ??
    [...languages].find(([key]) => key.split('-')[0] === primary)?.[1];
  return matched ?? fallback;
};

/**
 * The language file's URL, when it can be predicted: one region rule, without conditional logic or
 * an A/B variant, and without OneTrust's server-rendered banner, which loads a different file.
 */
export const languageUrlOf = (
  config: unknown,
  cdnHost: string,
  scriptId: string,
  documentLanguage: string | undefined
): string | undefined => {
  if (!documentLanguage) return undefined;
  const { MultiVariantTestingEnabled, TenantFeatures } = (config ?? {}) as DomainConfig;
  if (TenantFeatures?.CookieV2SSR) return undefined;
  const rule = regionRuleOf(config);
  if (!rule || typeof rule.Id !== 'string' || !RULE_ID.test(rule.Id)) return undefined;
  if (Array.isArray(rule.Conditions) && rule.Conditions.length > 0) return undefined;
  if (MultiVariantTestingEnabled && rule.VariantEnabled) return undefined;
  const language = resolveLanguage(config, rule, documentLanguage);
  if (!language || !LANGUAGE.test(language)) return undefined;
  return `https://${cdnHost}/consent/${scriptId}/${rule.Id}/${language}.json`;
};

/**
 * The assets the SDK fetches once it has read the language file: the banner layout, the
 * preference-centre layout and the common styles. Mirrors `getBannerContent`, `getPcContent` and
 * `getCommonStyles`. No banner layout for `NoBanner`, which shows none.
 */
export const assetUrlsOf = (languageFile: unknown, cdnHost: string, version: string): string[] => {
  const domain = (languageFile as { DomainData?: Record<string, unknown> } | null)?.DomainData;
  if (!domain || !VERSION.test(version)) return [];
  const assets = `https://${cdnHost}/scripttemplates/${version}/assets`;
  const rtl = domain.UseRTL ? 'Rtl' : '';
  const banner = BANNER_LAYOUTS.find(([flag]) => domain[flag])?.[1];
  const pc = PC_LAYOUTS.find(([flag]) => domain[flag])?.[1];
  return [
    ...(banner ? [`${assets}/${banner}${rtl}.json`] : []),
    ...(pc ? [`${assets}${domain.PCTemplateUpgrade ? '/v2' : ''}/${pc}${rtl}.json`] : []),
    `${assets}/otCommonStyles${rtl}.css`,
  ];
};

export interface PreloadCacheOptions {
  fetchJson?: (url: string, signal: AbortSignal) => Promise<unknown>;
  now?: () => number;
  /** How long resolved preloads are served before they are refreshed. */
  ttlMs?: number;
  /** How long a failed lookup is remembered, so a OneTrust outage is not retried on every request. */
  failureTtlMs?: number;
  timeoutMs?: number;
}

/**
 * A per-process cache of the preloads for a domain script and document language, read without ever
 * waiting.
 *
 * `peek` returns what is cached — stale or not — and starts a refresh in the background when the
 * entry is missing or expired. A request never waits on OneTrust: the first render of a cold process
 * emits only the config preload, whose URL needs no lookup. A stale entry after a OneTrust publish
 * costs some wasted preloads per page until the refresh lands; the stub still loads the right files.
 */
export const createPreloadCache = ({
  fetchJson = async (url, signal) => {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  now = Date.now,
  ttlMs = 60 * 60 * 1000,
  failureTtlMs = 5 * 60 * 1000,
  timeoutMs = 3000,
}: PreloadCacheOptions = {}) => {
  const entries = new Map<string, { preloads: OneTrustPreloads | undefined; expires: number }>();
  const inFlight = new Map<string, Promise<void>>();

  const resolve = async (cdnHost: string, scriptId: string, documentLanguage: string | undefined) => {
    const config = configUrl(cdnHost, scriptId);
    const domainConfig = await fetchJson(config, AbortSignal.timeout(timeoutMs));
    const bannerSdk = bannerSdkUrlFromConfig(domainConfig, cdnHost);
    // A config without a version is a failure, not a value: keep serving the last good preloads.
    if (!bannerSdk) throw new Error('config has no usable Version');

    const language = languageUrlOf(domainConfig, cdnHost, scriptId, documentLanguage);
    if (!language) return { bannerSdk, fetches: [config] };
    try {
      const languageFile = await fetchJson(language, AbortSignal.timeout(timeoutMs));
      const version = (domainConfig as DomainConfig).Version as string;
      return { bannerSdk, fetches: [config, language, ...assetUrlsOf(languageFile, cdnHost, version)] };
    } catch {
      // The language file is only the second half of the chain: preload the first half regardless.
      return { bannerSdk, fetches: [config] };
    }
  };

  const refresh = (cdnHost: string, scriptId: string, documentLanguage: string | undefined, key: string) => {
    if (inFlight.has(key)) return inFlight.get(key)!;
    const task = resolve(cdnHost, scriptId, documentLanguage)
      .then((preloads) => {
        entries.set(key, { preloads, expires: now() + ttlMs });
      })
      .catch(() => {
        const previous = entries.get(key);
        entries.set(key, { preloads: previous?.preloads, expires: now() + failureTtlMs });
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, task);
    return task;
  };

  return {
    peek(cdnHost: string, scriptId: string, documentLanguage?: string): OneTrustPreloads {
      const key = `${cdnHost}\n${scriptId}\n${documentLanguage ?? ''}`;
      const entry = entries.get(key);
      // Not awaited: `refresh` never rejects, and the request must not wait on OneTrust.
      if (!entry || entry.expires <= now()) refresh(cdnHost, scriptId, documentLanguage, key);
      return entry?.preloads ?? { fetches: [configUrl(cdnHost, scriptId)] };
    },
    /** Test hook: the pending refreshes, if any. */
    settled: () => Promise.all(inFlight.values()),
  };
};
