import { ONETRUST_BOOTSTRAP } from './onetrustBootstrap';

export interface OneTrustHeadOptions {
  cdnHost?: string;
  documentLanguage?: boolean;
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
  domainScript: string,
  { cdnHost = 'cdn.cookielaw.org', documentLanguage = true }: OneTrustHeadOptions = {}
) => ({
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
      'data-domain-script': domainScript,
      ...(documentLanguage ? { 'data-document-language': 'true' } : {}),
    },
  ],
});
