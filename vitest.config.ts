import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  test: {
    // Unit tests are colocated with source. Every suite covers a pure function, so none needs the
    // Nuxt environment — which is why this deliberately omits the `environmentOptions.nuxt.rootDir`
    // that app-gtm sets. Booting the playground would require a `laioutrrc.json` this repo has no
    // reason to carry just to test string parsing.
    include: ['src/**/*.test.ts'],
    // Pinned to node for the same reason: the Nuxt environment would pull in happy-dom to build a
    // DOM none of these suites touch.
    environment: 'node',
  },
});
