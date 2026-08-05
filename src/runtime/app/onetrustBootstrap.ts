/**
 * Inline bootstrap rendered into the SSR `<head>` before OneTrust's stub. It runs at HTML parse,
 * which is earlier than any client-side plugin, so it catches an `OptanonWrapper` call that fires
 * before hydration.
 *
 * It accumulates into `window.__laioutrOneTrust`, which the adapter drains and then subscribes to.
 * `groups` starts as `null` and becomes a string on the first publish — that is how the adapter
 * tells "OneTrust has not spoken yet" from "OneTrust says nothing is granted".
 *
 * Written as ES5 with `var` and function expressions: it ships as a raw string and is never
 * transpiled.
 */
export const ONETRUST_BOOTSTRAP = `
(function () {
  if (window.__laioutrOneTrust) { return; }
  var bridge = (window.__laioutrOneTrust = { groups: null, listeners: [], wired: false });
  function publish() {
    bridge.groups = typeof window.OnetrustActiveGroups === 'string' ? window.OnetrustActiveGroups : '';
    for (var i = 0; i < bridge.listeners.length; i++) {
      bridge.listeners[i](bridge.groups);
    }
  }
  window.OptanonWrapper = function () {
    if (!bridge.wired && window.OneTrust && typeof window.OneTrust.OnConsentChanged === 'function') {
      bridge.wired = true;
      window.OneTrust.OnConsentChanged(publish);
    }
    publish();
  };
})();
`.trim();
