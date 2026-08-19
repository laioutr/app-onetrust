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
| `groupMapping` | see below | OneTrust group ID → consent purpose, merged over the defaults. |

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

| OneTrust group | Consent purpose |
| --- | --- |
| `C0001` Strictly Necessary | `necessary` |
| `C0002` Performance | `analytics` |
| `C0003` Functional | `functional` |
| `C0004` Targeting | `advertising`, `personalization` |
| `C0005` Social Media | — |
| anything else | — |

The defaults reproduce what OneTrust's own Google Consent Mode integration
signals. Read your domain JSON to confirm: `GCAnalyticsStorage` is `C0002`, and
`GCAdStorage`, `GCAdUserData` and `GCAdPersonalization` are all `C0004`. That is
why `C0004` grants two purposes — `@laioutr-app/gtm` derives `ad_personalization`
from `personalization`, so granting only `advertising` would deny ad
personalization to a visitor OneTrust considers to have allowed it.

**The two ad purposes cannot diverge under the stock groups.** OneTrust models a
single Targeting group, so no visitor state grants `advertising` while denying
`personalization`. Separating them takes a tenant-side group mapped explicitly:

```ts
groupMapping: {
  C0004: 'advertising',
  C0007: 'personalization', // a custom group your OneTrust tenant defines
},
```

`C0005` grants nothing, which is also what OneTrust does — it maps Social Media
to no Google signal. Accepting social-media cookies alone therefore reports
exactly as accepting nothing, on both paths.

A group absent from the mapping grants nothing and warns in dev. Map it to an
empty array to say that is deliberate and silence the warning.

Tenants that rename or add groups override by ID. An array value grants several
purposes from one group:

```ts
'@laioutr/app-onetrust': {
  scriptId: '…',
  groupMapping: {
    C0002: ['analytics', 'functional'], // a group that straddles both
    C0006: [],                          // known, and deliberately gates nothing
    C0007: 'advertising',               // a custom group
  },
},
```

Check the group *names* in your tenant before trusting the defaults: a group
called "Analytics & Functional" needs the array form, because the default maps
`C0002` to `analytics` alone.

## Google Consent Mode

This app never signals Google. It reports purposes to the consent store, and
`@laioutr-app/gtm` turns those into `gtag('consent','update')` — `advertising`
drives `ad_storage` and `ad_user_data`, `personalization` drives
`ad_personalization` and `personalization_storage`, `analytics` drives
`analytics_storage`, and `functional` drives `functionality_storage`.

If OneTrust's own Consent Mode integration is enabled for your domain script
(`GCEnable` in the domain JSON), set `consentUpdates: 'external'` on
`@laioutr-app/gtm` so the two do not both push `gtag('consent','update')`. The
inline Consent Mode _default_ stays with the GTM app either way.

If OneTrust's Consent Mode is off, leave the GTM app on its `'store'` default.
Note that the two paths are not identical even with matching group mappings:
OneTrust leaves any signal mapped to `DNAC` unsent, where the GTM app always
emits a complete update. `personalization_storage` is the usual case — `DNAC` in
most tenants, and granted by `C0004` here.

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
