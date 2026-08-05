# OneTrust

[![Laioutr][laioutr-src]][laioutr-href]
[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

[Laioutr](https://laioutr.com) App integrating OneTrust consent management using Nuxt.

See [laioutr.com](https://laioutr.com) for more information about Laioutr.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
  <!-- - [🏀 Online playground](https://stackblitz.com/github/laioutr/app-onetrust?file=playground%2Fapp.vue) -->
  <!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Features

- Feeds OneTrust consent into Laioutr's consent store as an SSR-correct `ConsentAdapter`
- One OneTrust script per market, resolved per request from the host
- Reads the `OptanonConsent` cookie during SSR, so returning visitors get a correct first paint
- Catches consent changes that fire before hydration via an inline `<head>` bootstrap
- Build-time validation of the per-market configuration

## Configuration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@laioutr/app-onetrust'],
  '@laioutr/app-onetrust': {
    // A string applies to every market; a record maps `RcMarket.id` to its script.
    scriptId: {
      d6b03ihh228s8e4i35og: '10378097-4355-4435-be22-e07c5874eac9', // germany
      d7c14jii339t9f5j46ph: '78ce031e-aa89-4c18-9b0a-315b795b7ab9', // france
    },
  },
});
```

| Option | Default | Purpose |
| --- | --- | --- |
| `scriptId` | — | OneTrust script ID. String or `RcMarket.id` → ID record. Required. |
| `cdnHost` | `cdn.cookielaw.org` | OneTrust CDN host, without scheme. Check `CDNLocation` in your domain JSON. |
| `documentLanguage` | `true` | Emit `data-document-language="true"` so the banner follows `<html lang>`. |
| `groupMapping` | see below | OneTrust group ID → canonical category, merged over the defaults. |

OneTrust issues one script per website domain you register with them, and calls
it a "domain script" — that is the UUID you copy out of their admin, and it
renders into `data-domain-script`. This app keys those IDs by **market** rather
than by domain, because Laioutr resolves the market from the request host.

Keys are `RcMarket.id`, not `slug` — slugs are editable in Cockpit, and a rename
would silently detach a market from its script. A market with no entry gets no
consent banner at all; there is no fallback to another market's script, because
OneTrust scripts are domain-bound.

A market serving more than one host needs one OneTrust script per host, which
this option cannot express — configure the market's additional hosts as their own
markets, or raise it if you hit the case.

### Group mapping

| OneTrust group | Canonical category |
| --- | --- |
| `C0001` Strictly Necessary | `necessary` |
| `C0002` Performance | `statistics` |
| `C0003` Functional | `functional` |
| `C0004` Targeting | `marketing` |
| `C0005` Social Media | `unclassified` |
| anything else | `unclassified` |

`C0005` maps to `unclassified` rather than `marketing` on purpose: `unclassified`
gates nothing, so accepting social-media cookies alone cannot grant advertising
storage.

Tenants that rename or add categories override by ID. An array value grants
several categories from one group:

```ts
'@laioutr/app-onetrust': {
  scriptId: '…',
  groupMapping: {
    C0002: ['statistics', 'functional'], // a category that straddles both
    C0007: 'marketing',                  // a custom group
  },
},
```

## Google Consent Mode

This app never signals Google. If OneTrust's own Consent Mode integration is
enabled for your domain script (`GCEnable` in the domain JSON), set
`consentUpdates: 'external'` on `@laioutr-app/gtm` so the two do not both push
`gtag('consent','update')`. The inline Consent Mode _default_ stays with the GTM
app either way.

If OneTrust's Consent Mode is off, leave the GTM app on its `'store'` default.

## Auto-blocking

This app does not emit `otAutoBlock.js` and offers no option to. OneTrust's
auto-blocker rewrites `<script>` tags to `type="text/plain"`, which rewrites
Nuxt's own bundle and breaks hydration. Gate third-party scripts through the
consent store instead.

## Quick Setup

Follow the [Laioutr NPM Guide](https://docs.laioutr.com/cockpit/project-settings/npm) for connecting to [npm.laioutr.cloud](https://npm.laioutr.cloud).

- `pnpm install`
- `npx @laioutr/cli project fetch-rc --project <organization slug>/<project slug> --secret <project secret key>` - This will load the `laioutrrc.json` file with the current remote project configuration.
- `pnpm dev:prepare`

That's it! You can now use OneTrust in your [Laioutr Frontend](https://laioutr.com) ✨

You can find a thorough guide on getting started with Laioutr development in our [developer guide](https://docs.laioutr.com/getting-started/next-steps/local-setup).

## Linting and Formatting

We use ESLint and Prettier to lint and format the code. This repository contains opinionated configurations for both tools. You can, of course, replace them with your own configurations.

## Publishing

To publish a new version, run `pnpm release`. This will:

- Run the tests
- Update the changelog
- Publish the package to npmjs.org
- Push the changes to the repository

## Contribution

Follow the [setup guide](https://docs.laioutr.com/getting-started/next-steps/local-setup) to get started.

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@laioutr/app-onetrust/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@laioutr/app-onetrust
[npm-downloads-src]: https://img.shields.io/npm/dm/@laioutr/app-onetrust.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/@laioutr/app-onetrust
[license-src]: https://img.shields.io/npm/l/@laioutr/app-onetrust.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@laioutr/app-onetrust
[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
[laioutr-src]: https://img.shields.io/badge/%F0%9F%A6%99_Laioutr_App-702DCE
[laioutr-href]: https://www.laioutr.com/
