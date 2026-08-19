import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOneTrustAdapter } from './adapter';
import type { RuntimeConfigModulePublic } from '../../../module';
import { DEFAULT_GROUP_MAPPING } from '../../../module';

// `useCookie` is stubbed rather than provided by a real Nuxt instance: booting one here is what
// vitest.config.ts rules out, and the adapter's cookie handling — a custom decode on one cookie,
// the default on the other — is exactly what these cases need to exercise. The assertions are on
// what the adapter reports, never on the stub.
const { jar } = vi.hoisted(() => ({ jar: {} as Record<string, string> }));

vi.mock('nuxt/app', () => ({
  useCookie: (name: string, options?: { decode?: (value: string) => unknown }) => {
    const raw = jar[name];
    if (raw === undefined) return { value: null };
    return { value: options?.decode ? options.decode(raw) : raw };
  },
}));

const CONFIG = {
  scriptId: 'script-id',
  cdnHost: 'cdn.cookielaw.org',
  documentLanguage: true,
  groupMapping: DEFAULT_GROUP_MAPPING,
} satisfies RuntimeConfigModulePublic;

const DENIED = {
  necessary: true,
  functional: false,
  analytics: false,
  advertising: false,
  personalization: false,
};

beforeEach(() => {
  for (const key of Object.keys(jar)) delete jar[key];
});

describe('createOneTrustAdapter', () => {
  it('installs under the name the store reports as the active CMP', () => {
    expect(createOneTrustAdapter(CONFIG).name).toBe('onetrust');
  });

  it('reports the cookie verdict during setup, which is what makes SSR correct', () => {
    // A returning visitor who accepted analytics and refused targeting. Reporting this before the
    // SDK exists is the whole reason the cookie is read at all.
    jar.OptanonConsent = 'interactionCount=1&groups=C0001:1,C0002:1,C0003:0,C0004:0';
    const report = vi.fn();

    createOneTrustAdapter(CONFIG).setup(report);

    expect(report).toHaveBeenCalledExactlyOnceWith({ ...DENIED, analytics: true });
  });

  it('reports a denied state for a visitor with no cookie', () => {
    const report = vi.fn();

    createOneTrustAdapter(CONFIG).setup(report);

    expect(report).toHaveBeenCalledExactlyOnceWith(DENIED);
  });

  it('grants both ad purposes to a visitor who accepted targeting', () => {
    jar.OptanonConsent = 'groups=C0001:1,C0004:1';
    const report = vi.fn();

    createOneTrustAdapter(CONFIG).setup(report);

    expect(report).toHaveBeenCalledExactlyOnceWith({
      ...DENIED,
      advertising: true,
      personalization: true,
    });
  });

  it('honours a tenant mapping over the defaults', () => {
    jar.OptanonConsent = 'groups=C0005:1';
    const report = vi.fn();

    createOneTrustAdapter({ ...CONFIG, groupMapping: { ...DEFAULT_GROUP_MAPPING, C0005: 'advertising' } }).setup(report);

    expect(report).toHaveBeenCalledExactlyOnceWith({ ...DENIED, advertising: true });
  });

  it('reports a decision once the visitor has dismissed the banner', () => {
    jar.OptanonAlertBoxClosed = '2026-08-05T10:15:30.123Z';
    const adapter = createOneTrustAdapter(CONFIG);

    adapter.setup(vi.fn());

    expect(adapter.hasDecision?.()).toBe(true);
  });

  it('reports no decision while the visitor has answered nothing', () => {
    // Distinct from a refusal: every purpose reads denied here too, and a consumer applying its
    // own regional default has to be able to tell the two apart.
    const adapter = createOneTrustAdapter(CONFIG);

    adapter.setup(vi.fn());

    expect(adapter.hasDecision?.()).toBe(false);
  });
});
