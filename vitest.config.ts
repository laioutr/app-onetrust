import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests are colocated with source, and every suite covers a pure function.
    //
    // Deliberately plain `defineConfig` rather than `@nuxt/test-utils`' `defineVitestConfig`:
    // that helper boots a Nuxt instance, which regenerates this package's root `.nuxt` without the
    // playground's laioutrrc and strips frontend-core's `#imports` augmentations — so running the
    // tests would leave `vue-tsc` reporting phantom errors until the next `pnpm dev:prepare`.
    // It also pulls in happy-dom to build a DOM none of these suites touch.
    //
    // Anything needing the Nuxt environment belongs in the playground, not here.
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
