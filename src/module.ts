/* eslint-disable import-x/export, @typescript-eslint/no-empty-object-type */
import { addPlugin, createResolver, defineNuxtModule, installModule } from '@nuxt/kit';
import { defu } from 'defu';
import { type KnownMarket, validateScriptIdConfig } from './validateScriptIdConfig';
import type { NuxtModule } from '@nuxt/schema';
import { name, version } from '../package.json';

export type ConsentCategory = 'necessary' | 'functional' | 'statistics' | 'marketing' | 'unclassified';

/**
 * OneTrust's stock category IDs. Tenants can rename the categories freely — sportspar calls
 * C0002 "Analytical & Functional" — but the IDs themselves are stable, which is why the mapping
 * is keyed by ID and not by name.
 *
 * C0005 maps to `unclassified` rather than `marketing` on purpose: `unclassified` is referenced
 * by no EventPurpose in frontend-core, so it gates nothing. Mapping Social Media to `marketing`
 * would let a visitor who accepts social media while rejecting targeting flip `marketing` to
 * true, and consumers would grant advertising storage without targeting consent.
 */
export const DEFAULT_GROUP_MAPPING: Record<string, ConsentCategory> = {
  C0001: 'necessary',
  C0002: 'statistics',
  C0003: 'functional',
  C0004: 'marketing',
  C0005: 'unclassified',
};

const DEFAULT_CDN_HOST = 'cdn.cookielaw.org';

/**
 * The options the module adds to the nuxt.config.ts.
 */
export interface ModuleOptions {
  /**
   * OneTrust script ID, rendered into `data-domain-script`. A string applies to every market; a
   * record maps each `RcMarket.id` to its own script, and a market absent from the record gets no
   * CMP.
   *
   * OneTrust issues one of these per website domain it has registered — hence their "domain script"
   * naming and the attribute. It is keyed by market here because Laioutr resolves the market from
   * the request host.
   */
  scriptId: string | Record<string, string>;
  /** OneTrust CDN host, without scheme. Defaults to `cdn.cookielaw.org`. */
  cdnHost?: string;
  /** Emit `data-document-language="true"` so the banner follows `<html lang>`. Defaults to true. */
  documentLanguage?: boolean;
  /**
   * OneTrust group ID to canonical category, merged over {@link DEFAULT_GROUP_MAPPING}. An array
   * value grants several categories from one group, for tenants whose category straddles two.
   */
  groupMapping?: Record<string, ConsentCategory | ConsentCategory[]>;
}

/**
 * The config the module adds to nuxt.runtimeConfig.public['@laioutr/app-onetrust']
 */
export interface RuntimeConfigModulePublic {
  scriptId: string | Record<string, string>;
  cdnHost: string;
  documentLanguage: boolean;
  groupMapping: Record<string, ConsentCategory | ConsentCategory[]>;
}

/**
 * The config the module adds to nuxt.runtimeConfig['@laioutr/app-onetrust']
 */
export interface RuntimeConfigModulePrivate {}

const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    version,
    configKey: name,
  },
  defaults: {
    cdnHost: DEFAULT_CDN_HOST,
    documentLanguage: true,
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);
    const resolveRuntimeModule = (path: string) => resolve('./runtime', path);

    nuxt.options.build.transpile.push(resolve('./runtime'));

    // Script IDs are public by construction — they appear in the rendered HTML — so the whole map
    // ships to the browser rather than being narrowed per request.
    nuxt.options.runtimeConfig.public[name] = defu(nuxt.options.runtimeConfig.public[name] as Parameters<typeof defu>[0], {
      scriptId: options.scriptId,
      cdnHost: options.cdnHost ?? DEFAULT_CDN_HOST,
      documentLanguage: options.documentLanguage ?? true,
      groupMapping: { ...DEFAULT_GROUP_MAPPING, ...options.groupMapping },
    } satisfies RuntimeConfigModulePublic);

    if (nuxt.options._prepare) {
      await installModule('@laioutr-core/frontend-core');
      return;
    }

    // The script ID is resolved per request from the market, so it cannot be baked into
    // `app.head` — one deployment serves every market domain. `onetrustHead` emits it instead.
    // This is the only place a typo'd market ID is caught before it reaches production.
    const markets = (nuxt.options as { laioutr?: { laioutrrc?: { markets?: Record<string, KnownMarket> } } }).laioutr
      ?.laioutrrc?.markets;

    for (const issue of validateScriptIdConfig(options.scriptId, markets)) {
      console.warn(`[@laioutr/app-onetrust] ${issue}`);
    }

    addPlugin({
      src: resolveRuntimeModule('app/plugins/onetrustHead'),
    });

    addPlugin({
      src: resolveRuntimeModule('app/plugins/onetrust'),
    });
  },
});

export default module;

export * from './globalExtensions';
