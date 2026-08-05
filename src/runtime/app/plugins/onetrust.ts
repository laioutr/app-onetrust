import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app';
import OneTrustAdapter from './adapter';
import { useConsentStore, useMarket } from '#imports';
import type { RuntimeConfigModulePublic } from '../../../module';
import { resolveDomainScript } from '../resolveDomainScript';

export default defineNuxtPlugin({
  name: 'onetrust:adapter',
  dependsOn: ['frontend-core:market'],
  setup() {
    // Nuxt infers this key's type from the values the module resolved, so `groupMapping` arrives as
    // `{ C0001: string, … }` rather than the category union. `RuntimeConfigModulePublic` is the
    // contract the module actually writes — see the note in globalExtensions.ts.
    const config = useRuntimeConfig().public['@laioutr/app-onetrust'] as unknown as RuntimeConfigModulePublic;

    // No script for this market means no SDK behind the adapter. Registering it anyway would
    // report a denied state as though it were the visitor's decision. The head plugin owns the
    // warning.
    if (!resolveDomainScript(config.domainScript, useMarket().value.id)) {
      return;
    }

    const store = useConsentStore();
    const adapter = new OneTrustAdapter(config);

    store.registerAdapter(adapter);
    store.activateAdapter(adapter.name);
  },
});
