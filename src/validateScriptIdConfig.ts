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
 * Build-time sanity check for the configured script IDs, returning human-readable issues for
 * the caller to log. Mirrors the issues-array shape of frontend-core's `validateI18nConfig`.
 *
 * This is where a typo'd market ID gets caught. Market IDs are opaque database xids with no visual
 * anchor, so a wrong-but-well-formed key is invisible on inspection and would otherwise ship as a
 * market with no consent banner at all.
 */
export const validateScriptIdConfig = (
  scriptId: string | Record<string, string> | undefined,
  markets: Record<string, KnownMarket> | undefined
): string[] => {
  if (!scriptId) {
    return ['No `scriptId` configured. Not installing OneTrust.'];
  }

  if (typeof scriptId === 'string') {
    return [];
  }

  if (!Object.keys(scriptId).length) {
    return ['`scriptId` is an empty object. Not installing OneTrust for any market.'];
  }

  const knownMarkets = Object.values(markets ?? {});

  // Without an RC there is nothing to validate against and every key would look unknown.
  // frontend-core already warns separately about a missing laioutrrc.
  if (!knownMarkets.length) {
    return [];
  }

  const issues: string[] = [];
  const knownIds = new Set(knownMarkets.map((market) => market.id));

  for (const key of Object.keys(scriptId)) {
    if (!knownIds.has(key)) {
      issues.push(`\`scriptId\` has an entry for "${key}", which is not a known market ID.`);
    }
  }

  for (const market of knownMarkets) {
    if (!scriptId[market.id]) {
      issues.push(`No \`scriptId\` configured for market "${market.slug}" (${market.id}). OneTrust will not load there.`);
    }
  }

  return issues;
};
