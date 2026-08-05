export interface OneTrustBridge {
  /** `null` until OneTrust first publishes; a possibly-empty group string thereafter. */
  groups: string | null;
  listeners: Array<(groups: string) => void>;
  /** Guards against `OptanonWrapper` firing twice and double-registering the change listener. */
  wired: boolean;
}

export interface OneTrustSdk {
  /** Opens the preference centre. */
  ToggleInfoDisplay: () => void;
  OnConsentChanged: (callback: () => void) => void;
  /** Whether the visitor has dismissed the banner, i.e. whether they answered at all. */
  IsAlertBoxClosed: () => boolean;
}

declare global {
  interface Window {
    OneTrust?: OneTrustSdk;
    /** Comma-wrapped list of granted group IDs, e.g. `,C0001,C0002,`. */
    OnetrustActiveGroups?: string;
    /** Called by the OneTrust SDK after init and after the visitor saves. */
    OptanonWrapper?: () => void;
    __laioutrOneTrust?: OneTrustBridge;
  }
}
