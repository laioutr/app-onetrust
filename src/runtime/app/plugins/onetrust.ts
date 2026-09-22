import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app';
import { createOneTrustAdapter } from './adapter';
import { createStudioAdapter } from './studioAdapter';
import { useConsentStore, useIsStudioEmbed, useMarket } from '#imports';
import type { RuntimeConfigModulePublic } from '../../../module';
import { resolveScriptId } from '../resolveScriptId';

export default defineNuxtPlugin({
  name: 'onetrust:adapter',
  dependsOn: ['frontend-core:market'],
  setup() {
    // The editor frame loads no SDK — the head plugin skips it — so every purpose is granted
    // outright, whatever the market. Checked before the script ID because Studio swaps markets in
    // place, and one without a script must not flip the canvas to a denied state.
    if (useIsStudioEmbed().value) {
      useConsentStore().setAdapter(createStudioAdapter());
      return;
    }

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
