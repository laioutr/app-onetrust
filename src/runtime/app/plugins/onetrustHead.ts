import { defineNuxtPlugin, useHead, useRuntimeConfig } from 'nuxt/app';
import { useMarket } from '#imports';
import type { RuntimeConfigModulePublic } from '../../../module';
import { buildOneTrustHead } from '../buildOneTrustHead';
import { resolveScriptId } from '../resolveScriptId';

export default defineNuxtPlugin({
  name: 'onetrust:head',
  dependsOn: ['frontend-core:market'],
  setup() {
    // Asserted rather than augmented — see the note in globalExtensions.ts.
    const { scriptId, cdnHost, documentLanguage } = useRuntimeConfig().public[
      '@laioutr/app-onetrust'
    ] as unknown as RuntimeConfigModulePublic;

    // Read the market once. It derives from the request host, which cannot change without a full
    // navigation. The Studio editor does swap markets in place, but following that would load a
    // second OneTrust SDK over the first with no way to tear the first one down.
    const resolved = resolveScriptId(scriptId, useMarket().value.id);

    if (!resolved) {
      // Dev only: on an unmapped market this would otherwise fire on every SSR request for as
      // long as the gap exists. Module setup reports the same gap once, at build time.
      if (import.meta.dev) {
        console.warn('[@laioutr/app-onetrust] No `scriptId` configured for the current market. Not installing OneTrust.');
      }
      return;
    }

    useHead(buildOneTrustHead(resolved, { cdnHost, documentLanguage }));
  },
});
