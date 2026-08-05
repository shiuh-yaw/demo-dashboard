"use client";

import { isMobile } from "@dynamic-labs-sdk/client";

import { getEnvInfo } from "@/lib/runtime-env";
import { getRedirectBase, getRedirectScheme } from "@/lib/redirect";

// A fixed, on-screen readout of the runtime environment, shown only with
// `?debug`. Meant for embedded-web-view testing on a real device where a JS
// console isn't handy: it surfaces the raw signals (UA, web-view guess, secure
// context) and the resolved redirect target so we can confirm the custom-scheme
// return contract end to end.
export function DebugPanel() {
  const env = getEnvInfo();
  const rows: [string, string][] = [
    ["webView (guess)", String(env.isWebView)],
    ["isMobile()", String(isMobile())],
    ["iOS / Android", `${env.isIos} / ${env.isAndroid}`],
    ["standalone PWA", String(env.isStandalone)],
    ["looks like Safari", String(env.looksLikeSafari)],
    ["secure context", String(env.isSecureContext)],
    ["redirect base", getRedirectBase()],
    ["redirect scheme", getRedirectScheme()],
    ["UA", env.userAgent],
  ];
  return (
    <div className="debug-panel" role="status" aria-label="debug info">
      <div className="debug-panel__title">debug</div>
      <dl className="debug-panel__grid">
        {rows.map(([k, v]) => (
          <div className="debug-panel__row" key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
