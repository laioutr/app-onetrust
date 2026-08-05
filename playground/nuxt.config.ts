import laioutrrc from '../laioutrrc.json';
import srcModule from '../src/module';

// Disable project secret key for playground
laioutrrc.laioutr.projectSecretKey = false as any;

// The fetched RC declares the tenant's full app list (gtm, shopify, …), and frontend-core tries to
// load every one of them. None is installed here and none is needed: this playground exercises
// only the OneTrust module, which is added directly as `srcModule` below.
laioutrrc.apps = [] as any;

export default defineNuxtConfig({
  modules: [
    srcModule,
    '@pinia/nuxt', // Added to show in devtools
    '@laioutr-core/frontend-core',
    '@laioutr-core/devtools',
  ],
  laioutr: {
    laioutrrc: laioutrrc as any,
  },
  // Configured through the module option rather than `runtimeConfig.public` so the module's own
  // defaults fill in cdnHost, documentLanguage and groupMapping. Overriding runtimeConfig directly
  // would require restating all four.
  //
  // The string form applies to every market. Which per-market ID set sportspar ships is still open,
  // so the playground deliberately does not encode a guess; this is their staging domain script,
  // registered to sportspar-gmbh.myshopify.com.
  '@laioutr/app-onetrust': {
    scriptId: '019aa652-28d4-7cb8-928e-29e4a2e8f099',
  },
  devtools: { enabled: true },
  compatibilityDate: '2025-09-11',
});
