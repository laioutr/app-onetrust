/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { RuntimeConfigModulePrivate } from './module';

declare module 'vue' {
  interface GlobalComponents {}
  interface ComponentCustomProperties {
    // Add your module's custom properties here
  }
}

declare module '@nuxt/schema' {
  // `PublicRuntimeConfig` is deliberately NOT augmented here. The module writes concrete values
  // into `runtimeConfig.public`, and Nuxt generates the interface for that key from those values —
  // inferring `groupMapping: { C0001: string, … }`. Declaration merging requires an identical type
  // on both sides, so re-declaring the key as `RuntimeConfigModulePublic` raises TS2717.
  // `RuntimeConfigModulePublic` stays the authoritative contract; the plugins assert it once when
  // they read the config.
  interface RuntimeConfig {
    ['@laioutr/app-onetrust']: RuntimeConfigModulePrivate;
  }
}

export {};
