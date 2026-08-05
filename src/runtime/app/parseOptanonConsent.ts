/**
 * Extract the granted OneTrust group IDs from the `OptanonConsent` cookie.
 *
 * The cookie is a URL-encoded query string, not JSON, and its `groups` key carries an explicit
 * verdict per group: `groups=C0001:1,C0002:0`. That per-group verdict is why the cookie is the
 * authoritative source — the `OnetrustActiveGroups` global lists granted groups only.
 *
 * Returns `null` when there is no usable cookie, and `[]` when the visitor was asked and granted
 * nothing. Callers rely on that distinction to tell "no decision yet" from "declined everything".
 */
export const parseOptanonConsent = (raw: string | null | undefined): string[] | null => {
  if (!raw) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }

  const groups = new URLSearchParams(decoded).get('groups');
  if (!groups) return null;

  return groups
    .split(',')
    .map((pair) => pair.split(':'))
    .filter((parts) => parts.length === 2 && parts[1]!.trim() === '1')
    .map((parts) => parts[0]!.trim())
    .filter(Boolean);
};
