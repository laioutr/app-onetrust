import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app';
import { createOneTrustAdapter } from './adapter';
import { useConsentStore, useMarket } from '#imports';
import type { RuntimeConfigModulePublic } from '../../../module';
import { resolveScriptId } from '../resolveScriptId';

export default defineNuxtPlugin({
  name: 'onetrust:adapter',
  dependsOn: ['frontend-core:market'],
  setup() {
    // Nuxt infers this key's type from the values the module resolved, so `groupMapping` arrives as
    // `{ C0001: string, … }` rather than the purpose union. `RuntimeConfigModulePublic` is the
    // contract the module actually writes — see the note in globalExtensions.ts.
    const config = useRuntimeConfig().public['@laioutr/app-onetrust'] as unknown as RuntimeConfigModulePublic;

    // No script for this market means no SDK behind the adapter. Registering it anyway would
    // report a denied state as though it were the visitor's decision. The head plugin owns the
    // warning.
    if (!resolveScriptId(config.scriptId, useMarket().value.id)) {
      return;
    }

    // `setAdapter` runs the adapter's setup synchronously — which is what lets it read cookies —
    // and returns the handle that drops it again. Nothing drops it here: the adapter lives as long
    // as the Nuxt app it was installed into.
    useConsentStore().setAdapter(createOneTrustAdapter(config));
  },
});
