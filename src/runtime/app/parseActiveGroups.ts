/**
 * Extract group IDs from OneTrust's `OnetrustActiveGroups` global, which is a comma-wrapped list
 * of granted groups (`,C0001,C0002,`). Absence from the list means "not granted" — the global
 * cannot express the difference between rejected and not-yet-asked.
 */
export const parseActiveGroups = (raw: string | null | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
