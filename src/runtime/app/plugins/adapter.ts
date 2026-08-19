import { useCookie } from 'nuxt/app';
import type { ConsentAdapter } from '#frontend/consent';
import type { RuntimeConfigModulePublic } from '../../../module';
import type { Ref } from 'vue';
import { hasConsentDecision } from '../hasConsentDecision';
import { mapGroupsToPurposes } from '../mapGroupsToPurposes';
import { parseActiveGroups } from '../parseActiveGroups';
import { parseOptanonConsent } from '../parseOptanonConsent';
import { subscribeToBridge } from '../subscribeToBridge';

const OPTANON_COOKIE = 'OptanonConsent';
const ALERT_BOX_CLOSED_COOKIE = 'OptanonAlertBoxClosed';

/**
 * The OneTrust adapter the consent store installs.
 *
 * Reporting is push-based: `setup` states the visitor's verdict once from the cookie — which is
 * what carries SSR and hydration, before the SDK exists — and again on every publish the inline
 * bootstrap's bridge relays. The cookie report going first is what makes the ordering matter: a
 * bridge already holding a verdict replays over it immediately, and the live global is
 * authoritative from then on, because OneTrust rewrites the cookie when the visitor saves and
 * `useCookie`'s ref does not re-read it.
 */
export const createOneTrustAdapter = (config: RuntimeConfigModulePublic): ConsentAdapter => {
  let alertBoxClosed: Ref<string | null> | undefined;
  const warnedGroups = new Set<string>();

  // Dev only, and once per group: a granted group the mapping does not know gates nothing, which
  // is silent in production and indistinguishable from a group the tenant meant to leave ungated.
  // A group mapped to an empty list is deliberate and says nothing here.
  const warnUnmappedGroups = (grantedGroups: string[]) => {
    for (const group of grantedGroups) {
      if (config.groupMapping[group] || warnedGroups.has(group)) continue;

      warnedGroups.add(group);
      console.warn(
        `[@laioutr/app-onetrust] OneTrust group "${group}" was granted but maps to no consent purpose. Add it to \`groupMapping\` if it should grant one.`
      );
    }
  };

  return {
    name: 'onetrust',

    setup(report) {
      // A custom decode is required: the cookie is a URL-encoded query string, so useCookie's
      // default destr parsing would hand back a meaningless raw string. Reading it here is what
      // makes the first report correct during SSR for a returning visitor.
      const optanonConsent = useCookie<string[] | null>(OPTANON_COOKIE, {
        decode: (value: string) => parseOptanonConsent(value),
      });

      // Written only when the visitor dismisses the banner, which is what separates a refusal from
      // silence. The default decode is right here: only the presence of a datestamp is read.
      alertBoxClosed = useCookie<string | null>(ALERT_BOX_CLOSED_COOKIE);

      const reportGroups = (grantedGroups: string[]) => {
        if (import.meta.dev) {
          warnUnmappedGroups(grantedGroups);
        }

        report(mapGroupsToPurposes(grantedGroups, config.groupMapping));
      };

      reportGroups(optanonConsent.value ?? []);

      if (import.meta.client) {
        return subscribeToBridge(window.__laioutrOneTrust, (groups) => reportGroups(parseActiveGroups(groups)));
      }

      // Nothing to clean up on the server: there is no bridge to detach from.
      return undefined;
    },

    openConsentUi() {
      // The view is deliberately ignored. OneTrust has no reliable "re-show the banner" API —
      // Init() + LoadBanner() is fragile — so both views open the preference centre.
      if (import.meta.client && typeof window.OneTrust?.ToggleInfoDisplay === 'function') {
        window.OneTrust.ToggleInfoDisplay();
      }
    },

    hasDecision() {
      return hasConsentDecision(import.meta.client ? window.OneTrust : undefined, alertBoxClosed?.value);
    },
  };
};
