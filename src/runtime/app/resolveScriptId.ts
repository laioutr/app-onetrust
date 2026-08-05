/**
 * Pick the OneTrust script ID for a market. A string applies to every market; a record maps
 * `RcMarket.id` to its script.
 *
 * The ID identifies a script OneTrust registers per *website domain*, which is why it renders into
 * `data-domain-script`. It is keyed by market here because Laioutr resolves the market from the
 * request host, and each market maps to a host.
 *
 * An unmapped market resolves to `undefined` and the caller emits nothing. There is deliberately
 * no fallback to another market's script: OneTrust scripts are domain-bound, so serving one
 * market's banner on another market's domain records consent against the wrong controller.
 */
export const resolveScriptId = (
  scriptId: string | Record<string, string> | undefined,
  marketId: string | undefined
): string | undefined => {
  if (!scriptId) return undefined;
  if (typeof scriptId === 'string') return scriptId;
  if (!marketId) return undefined;
  return scriptId[marketId] || undefined;
};
