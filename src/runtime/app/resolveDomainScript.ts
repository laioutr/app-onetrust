/**
 * Pick the OneTrust domain script for a market. A string applies to every market; a record maps
 * `RcMarket.id` to its script.
 *
 * An unmapped market resolves to `undefined` and the caller emits nothing. There is deliberately
 * no fallback to another market's script: OneTrust scripts are domain-bound, so serving one
 * market's banner on another market's domain records consent against the wrong controller.
 */
export const resolveDomainScript = (
  domainScript: string | Record<string, string> | undefined,
  marketId: string | undefined
): string | undefined => {
  if (!domainScript) return undefined;
  if (typeof domainScript === 'string') return domainScript;
  if (!marketId) return undefined;
  return domainScript[marketId] || undefined;
};
