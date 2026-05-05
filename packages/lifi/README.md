# @dynamic-demos/lifi

Shared LI.FI bridge / swap integration. Wraps the public REST API at
`https://li.quest/v1` for server-side quote fetching and status polling,
plus a thin `configureLifi` helper for browser-side route execution via
[`@lifi/sdk`](https://docs.li.fi/integrate-li.fi-sdk/).

## Quick Start

### Server-side (dashboard handlers, workers)

```ts
import { createLifiClient, getQuote, getStatus } from "@dynamic-demos/lifi";

const lifi = createLifiClient({
  env: "sandbox",
  apiKey: process.env.LIFI_API_KEY!, // wire credentials at call site
  integrator: "dynamic-widget-demo",
});

const quote = await getQuote(lifi, {
  fromChainId: 1,
  toChainId: 137,
  fromTokenAddress: "0x...",
  toTokenAddress: "0x...",
  toAmount: "1000000",
  fromAddress: "0xsender",
  toAddress: "0xrecipient",
});

const status = await getStatus(lifi, "0xtxhash", 1, 137);
```

### Browser-side (route execution)

```ts
import { configureLifi } from "@dynamic-demos/lifi";
import { executeRoute } from "@lifi/sdk";

configureLifi(providers, { integrator: quote.integrator, rpcUrls });
await executeRoute(quote.route, { updateRouteHook });
```

The integrator string MUST match what the dashboard used to fetch the
quote, otherwise LI.FI rejects the execution.

## Environment

`createLifiClient({ env })` takes either `"sandbox"` or `"production"`.
LI.FI does not currently expose a separate sandbox host, so both resolve
to `https://li.quest/v1`. The discriminator is kept so callers can
toggle dry-run / fixture behaviour at the call site.

## See also

- `AGENTS.md` for capabilities, regions / chains, and Phase 1B context.
- [LI.FI docs](https://docs.li.fi/)
- [LI.FI API reference](https://apidocs.li.fi/)
