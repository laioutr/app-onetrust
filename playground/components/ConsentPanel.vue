<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core';

/**
 * Playground-only harness for the OneTrust adapter.
 *
 * Everything shown here is read from frontend-core's consent store, never from OneTrust's own
 * globals — the store is what a storefront actually consumes, so a readout taken from anywhere
 * else would report that OneTrust works rather than that this adapter does.
 */
const consent = useConsentStore();

const PURPOSES = ['necessary', 'functional', 'analytics', 'advertising', 'personalization'] as const;

const purposes = computed(() => PURPOSES.map((purpose) => ({ purpose, granted: consent.state.value[purpose] })));

// `hasDecision()` is a call rather than a ref, and it moves independently of `state`: a visitor who
// rejects everything leaves all five purposes denied and flips only the decision. Polling is what
// keeps that pair visible as two separate facts instead of one.
const decision = ref<boolean | undefined>();
const readDecision = () => {
  decision.value = consent.hasDecision();
};

readDecision();
useIntervalFn(readDecision, 500);

const decisionLabel = computed(() => {
  if (decision.value === undefined) return 'unknown — no adapter, or it cannot tell';

  return decision.value ? 'yes — the visitor answered' : 'no — the visitor has not answered';
});

// Simulated publishes push straight into the bootstrap bridge the adapter subscribes to. They
// drive the adapter end to end without recording a consent decision with OneTrust, which is what
// makes them repeatable. This reaches into the module's internal bridge contract on purpose, and
// is why it lives in the playground and not in the module.
const publish = (groups: string) => {
  const bridge = (window as unknown as { __laioutrOneTrust?: { listeners: Array<(groups: string) => void> } })
    .__laioutrOneTrust;

  bridge?.listeners.forEach((listener) => listener(groups));
};

const resetVisitor = () => {
  for (const name of ['OptanonConsent', 'OptanonAlertBoxClosed']) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
  }

  window.location.reload();
};
</script>

<template>
  <aside class="consent-panel">
    <h2>Consent store</h2>

    <dl class="meta">
      <dt>adapter</dt>
      <dd>{{ consent.adapterName.value ?? '— none installed' }}</dd>
      <dt>resolved</dt>
      <dd>{{ consent.resolved.value }}</dd>
      <dt>decision</dt>
      <dd>{{ decisionLabel }}</dd>
    </dl>

    <ul class="purposes">
      <li v-for="{ purpose, granted } in purposes" :key="purpose" :class="{ granted }">
        <span class="dot" />
        <span class="name">{{ purpose }}</span>
        <span class="verdict">{{ granted ? 'granted' : 'denied' }}</span>
      </li>
    </ul>

    <h3>OneTrust UI</h3>
    <div class="controls">
      <button type="button" @click="consent.openConsentUi()">Open banner</button>
      <button type="button" @click="consent.openConsentUi('preferences')">Open preferences</button>
    </div>

    <h3>Simulated publish <small>records nothing with OneTrust</small></h3>
    <div class="controls">
      <button type="button" @click="publish(',C0001,C0004,')">Targeting</button>
      <button type="button" @click="publish(',C0001,C0002,C0003,')">Analytics + functional</button>
      <button type="button" @click="publish(',C0001,C0005,')">Social media</button>
      <button type="button" @click="publish(',C0001,')">Revoke all</button>
    </div>

    <h3>Visitor</h3>
    <div class="controls">
      <button type="button" @click="resetVisitor">Reset — clear cookies and reload</button>
    </div>
  </aside>
</template>

<style scoped>
.consent-panel {
  position: fixed;
  top: 1rem;
  right: 1rem;
  /* One above OneTrust's own backdrop. Their `.onetrust-pc-dark-filter` sits at 2147483645 with
     `pointer-events: auto`, and this tenant forces consent, so on a first visit the backdrop
     covers the whole page — including this panel — until the visitor answers. Anything lower
     here renders fine and silently swallows every click. int32 max ties with the preference
     centre itself, which is acceptable: that modal is OneTrust's own UI to interact with. */
  z-index: 2147483647;
  width: 22rem;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  padding: 1rem;
  border-radius: 0.5rem;
  background: #14161a;
  color: #e6e8eb;
  font:
    12px/1.5 ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
  box-shadow: 0 0.5rem 2rem rgb(0 0 0 / 45%);
}

h2 {
  margin: 0 0 0.75rem;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9aa4b2;
}

h3 {
  margin: 1rem 0 0.4rem;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9aa4b2;
}

h3 small {
  text-transform: none;
  letter-spacing: 0;
  color: #6b7684;
}

.meta {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.15rem 0.75rem;
  margin: 0 0 0.75rem;
}

.meta dt {
  color: #6b7684;
}

.meta dd {
  margin: 0;
}

.purposes {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid #262b33;
}

.purposes li {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.3rem 0;
  border-bottom: 1px solid #262b33;
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #4b535e;
}

.granted .dot {
  background: #35c56a;
}

.name {
  flex: 1;
}

.verdict {
  color: #6b7684;
}

.granted .verdict {
  color: #35c56a;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

button {
  padding: 0.3rem 0.6rem;
  border: 1px solid #333a45;
  border-radius: 0.25rem;
  background: #1d2129;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

button:hover {
  border-color: #4b535e;
  background: #242a34;
}
</style>
