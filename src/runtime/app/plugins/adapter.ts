import { useCookie } from 'nuxt/app';
import type { ConsentAdapter, ConsentManagementState } from '#frontend/consent';
import type { RuntimeConfigModulePublic } from '../../../module';
import type { Ref } from 'vue';
import { hasConsentDecision } from '../hasConsentDecision';
import { mapGroupsToCategories } from '../mapGroupsToCategories';
import { parseActiveGroups } from '../parseActiveGroups';
import { parseOptanonConsent } from '../parseOptanonConsent';

const OPTANON_COOKIE = 'OptanonConsent';
const ALERT_BOX_CLOSED_COOKIE = 'OptanonAlertBoxClosed';

const DENIED: ConsentManagementState = {
  necessary: true,
  functional: false,
  statistics: false,
  marketing: false,
  unclassified: false,
};

class OneTrustAdapter implements ConsentAdapter {
  readonly name = 'onetrust';
  private _isActive = false;
  private _config: RuntimeConfigModulePublic;
  private _consentChangeCallbacks: Array<(consent: Partial<ConsentManagementState>) => void> = [];
  private _cookie: Ref<string[] | null> | undefined;
  private _alertBoxClosed: Ref<string | null> | undefined;
  private _bridgeListener: ((groups: string) => void) | undefined;

  constructor(config: RuntimeConfigModulePublic) {
    this._config = config;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  init(): void {
    // A custom decode is required: the cookie is a URL-encoded query string, so useCookie's
    // default destr parsing would hand back a meaningless raw string. Reading it here is what
    // makes getConsentState correct during SSR for a returning visitor.
    this._cookie = useCookie<string[] | null>(OPTANON_COOKIE, {
      decode: (value: string) => parseOptanonConsent(value),
    });

    // Written only when the visitor dismisses the banner, which is what separates a refusal from
    // silence. The default decode is right here: only the presence of a datestamp is read.
    this._alertBoxClosed = useCookie<string | null>(ALERT_BOX_CLOSED_COOKIE);

    if (import.meta.client) {
      const bridge = window.__laioutrOneTrust;

      if (bridge) {
        this._bridgeListener = (groups: string) => {
          this._notifyConsentChange(mapGroupsToCategories(parseActiveGroups(groups), this._config.groupMapping));
        };
        bridge.listeners.push(this._bridgeListener);

        // Replay whatever OptanonWrapper already published before this plugin hydrated.
        if (bridge.groups !== null) {
          this._bridgeListener(bridge.groups);
        }
      }
    }

    this._isActive = true;
  }

  getConsentState(): Partial<ConsentManagementState> {
    const mapping = this._config.groupMapping;

    if (import.meta.client) {
      const bridge = window.__laioutrOneTrust;
      // The live global wins on the client: useCookie's ref does not re-read document.cookie
      // after OneTrust rewrites it when the visitor saves.
      if (bridge && bridge.groups !== null) {
        return mapGroupsToCategories(parseActiveGroups(bridge.groups), mapping);
      }
    }

    // An empty array is meaningful — asked, granted nothing — and must not fall through.
    const fromCookie = this._cookie?.value;
    if (fromCookie) {
      return mapGroupsToCategories(fromCookie, mapping);
    }

    return { ...DENIED };
  }

  showConsentOverlay(): void {
    // OneTrust has no reliable "re-show the banner" API; Init() + LoadBanner() is fragile. Both
    // overlay methods therefore open the preference centre.
    if (import.meta.client && typeof window.OneTrust?.ToggleInfoDisplay === 'function') {
      window.OneTrust.ToggleInfoDisplay();
    }
  }

  renewConsent(): void {
    this.showConsentOverlay();
  }

  hasCategoryConsent(category: keyof ConsentManagementState): boolean {
    return this.getConsentState()[category] ?? false;
  }

  hasDecision(): boolean {
    return hasConsentDecision(import.meta.client ? window.OneTrust : undefined, this._alertBoxClosed?.value);
  }

  onConsentChange(callback: (consent: Partial<ConsentManagementState>) => void): void {
    this._consentChangeCallbacks.push(callback);
  }

  destroy(): void {
    if (import.meta.client && this._bridgeListener) {
      const bridge = window.__laioutrOneTrust;
      if (bridge) {
        bridge.listeners = bridge.listeners.filter((listener) => listener !== this._bridgeListener);
      }
    }

    this._bridgeListener = undefined;
    this._consentChangeCallbacks = [];
    this._isActive = false;
  }

  private _notifyConsentChange(consent: Partial<ConsentManagementState>): void {
    this._consentChangeCallbacks.forEach((callback) => callback(consent));
  }
}

export default OneTrustAdapter;
