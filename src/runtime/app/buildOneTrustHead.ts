import { ONETRUST_BOOTSTRAP } from './onetrustBootstrap';
import type { OneTrustPreloads } from './preloads';

export interface OneTrustHeadOptions {
  cdnHost?: string;
  documentLanguage?: boolean;
  /** What to preload, from `createPreloadCache`. No preload is emitted without it. */
  preloads?: OneTrustPreloads;
}

/**
 * Build the `useHead` payload that installs OneTrust.
 *
 * The priorities are numeric on purpose. unhead decides position in `<head>` by capo sorting, and
 * an `async` + `src` script is weighted 30. The named aliases are offsets, not absolutes —
 * `'high'` resolves to 99 — so only a number can place the bootstrap above the stub. 30 reproduces
 * the weight the stub already receives implicitly, leaving its position relative to every other
 * tag unchanged.
 *
 * `otAutoBlock.js` is deliberately never emitted: OneTrust's auto-blocker rewrites `<script>` tags
 * to `type="text/plain"`, which would rewrite Nuxt's own bundle and break hydration.
 *
 * Every property here must exist in unhead's script schema. OneTrust's own install snippet carries
 * `charset="UTF-8"`, which unhead does not model — and it drops the *entire tag* rather than the
 * unknown property, so the SDK silently never loads. TypeScript does not catch it either: excess
 * property checks apply to fresh object literals, not to a value returned from this function.
 *
 * The parameter defaults are never exercised in production — the module supplies both values. They
 * exist so this function is self-contained under unit test.
 */
export const buildOneTrustHead = (
  scriptId: string,
  { cdnHost = 'cdn.cookielaw.org', documentLanguage = true, preloads }: OneTrustHeadOptions = {}
) => ({
  // `fetchpriority="low"` on purpose. The gain is in starting early, not in priority: low and high
  // preloads both moved the banner from 7.9 s to 5.5 s, and neither slowed an image LCP. But Lighthouse
  // models a high-priority request that lands before first paint as holding up FCP — the high preload
  // cost +1.1 s simulated FCP and 3–4 points on the home and category pages, the low one cost nothing.
  //
  // The SDK gets no `crossorigin`: the stub inserts it as a plain script, and a preload is only reused
  // by a request with the same credentials mode. The rest of the chain is fetched by OneTrust's XHR and
  // `fetch` calls, which are CORS requests without credentials: `crossorigin="anonymous"` matches them.
  // Each URL was requested exactly once with these preloads in place, so none is downloaded twice.
  link: [
    ...(preloads?.bannerSdk
      ? [{ key: 'onetrust-banner-sdk', rel: 'preload' as const, as: 'script' as const, fetchpriority: 'low' as const, href: preloads.bannerSdk }]
      : []),
    ...(preloads?.fetches ?? []).map((href, index) => ({
      key: `onetrust-preload-${index}`,
      rel: 'preload' as const,
      as: 'fetch' as const,
      crossorigin: 'anonymous' as const,
      fetchpriority: 'low' as const,
      href,
    })),
  ],
  script: [
    {
      key: 'onetrust-bootstrap',
      tagPriority: 20,
      innerHTML: ONETRUST_BOOTSTRAP,
    },
    {
      key: 'onetrust-sdk',
      tagPriority: 30,
      src: `https://${cdnHost}/scripttemplates/otSDKStub.js`,
      type: 'text/javascript',
      async: true,
      'data-domain-script': scriptId,
      ...(documentLanguage ? { 'data-document-language': 'true' } : {}),
    },
  ],
});
