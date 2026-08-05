/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { RuntimeConfigModulePrivate, RuntimeConfigModulePublic } from './module';

declare module 'vue' {
  interface GlobalComponents {}
  interface ComponentCustomProperties {
    // Add your module's custom properties here
  }
}

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    ['@laioutr/app-onetrust']: RuntimeConfigModulePublic;
  }
  interface RuntimeConfig {
    ['@laioutr/app-onetrust']: RuntimeConfigModulePrivate;
  }
}

export {};
