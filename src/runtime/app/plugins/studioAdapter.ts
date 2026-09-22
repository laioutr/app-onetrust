import type { ConsentAdapter, ConsentState } from '#frontend/consent';

/**
 * Typed as the whole state rather than a partial, so a new purpose fails the build here instead of
 * silently staying denied in the editor.
 */
const EVERY_PURPOSE_GRANTED: ConsentState = {
  necessary: true,
  functional: true,
  analytics: true,
  advertising: true,
  personalization: true,
};

/**
 * Stands in for OneTrust inside the Studio editor frame. There is no visitor there to ask — only
 * an editor, who should see every consent-gated block render and never a banner over the canvas.
 *
 * It keeps the `onetrust` name so the store reports the same CMP the storefront runs.
 */
export const createStudioAdapter = (): ConsentAdapter => ({
  name: 'onetrust',
  setup(report) {
    report(EVERY_PURPOSE_GRANTED);
  },
  openConsentUi() {
    // No SDK is loaded in the editor, so there is no dialog to open.
  },
  hasDecision: () => true,
});
