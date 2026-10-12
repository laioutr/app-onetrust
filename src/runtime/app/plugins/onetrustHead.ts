import { defineNuxtPlugin, useHead, useRuntimeConfig, useState } from 'nuxt/app';
import { useIsStudioEmbed, useMarket } from '#imports';
import type { RuntimeConfigModulePublic } from '../../../module';
import { createBannerSdkUrlCache } from '../bannerSdkUrl';
import { buildOneTrustHead } from '../buildOneTrustHead';
import { resolveScriptId } from '../resolveScriptId';

// One cache per server process, shared by every request it renders.
const bannerSdkUrls = import.meta.server ? createBannerSdkUrlCache() : undefined;

export default defineNuxtPlugin({
  name: 'onetrust:head',
  dependsOn: ['frontend-core:market'],
  setup() {
    // No banner over the editor canvas. The adapter plugin grants every purpose there instead.
    if (useIsStudioEmbed().value) {
      return;
    }

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

    // Resolved on the server and handed to the client through the payload, so hydration renders the
    // same head instead of dropping the preload the server emitted.
    const bannerSdkUrl = useState<string | undefined>('onetrust:banner-sdk-url', () =>
      bannerSdkUrls?.peek(cdnHost, resolved)
    );

    useHead(buildOneTrustHead(resolved, { cdnHost, documentLanguage, bannerSdkUrl: bannerSdkUrl.value }));
  },
});
