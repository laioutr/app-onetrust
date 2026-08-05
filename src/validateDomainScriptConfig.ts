/**
 * Minimal shape of an RC market. Declared locally rather than imported from
 * `@laioutr-core/core-types`: that package is only a peer dependency here, which pnpm's strict
 * layout will not resolve at module-build time.
 */
export interface KnownMarket {
  id: string;
  slug: string;
}

/**
 * Build-time sanity check for the configured domain scripts, returning human-readable issues for
 * the caller to log. Mirrors the issues-array shape of frontend-core's `validateI18nConfig`.
 *
 * This is where a typo'd market ID gets caught. Market IDs are opaque database xids with no visual
 * anchor, so a wrong-but-well-formed key is invisible on inspection and would otherwise ship as a
 * market with no consent banner at all.
 */
export const validateDomainScriptConfig = (
  domainScript: string | Record<string, string> | undefined,
  markets: Record<string, KnownMarket> | undefined
): string[] => {
  if (!domainScript) {
    return ['No domain script configured. Not installing OneTrust.'];
  }

  if (typeof domainScript === 'string') {
    return [];
  }

  if (!Object.keys(domainScript).length) {
    return ['`domainScript` is an empty object. Not installing OneTrust for any market.'];
  }

  const knownMarkets = Object.values(markets ?? {});

  // Without an RC there is nothing to validate against and every key would look unknown.
  // frontend-core already warns separately about a missing laioutrrc.
  if (!knownMarkets.length) {
    return [];
  }

  const issues: string[] = [];
  const knownIds = new Set(knownMarkets.map((market) => market.id));

  for (const key of Object.keys(domainScript)) {
    if (!knownIds.has(key)) {
      issues.push(`\`domainScript\` has an entry for "${key}", which is not a known market ID.`);
    }
  }

  for (const market of knownMarkets) {
    if (!domainScript[market.id]) {
      issues.push(`No domain script configured for market "${market.slug}" (${market.id}). OneTrust will not load there.`);
    }
  }

  return issues;
};
