# @dynamic-demos/rain

Thin, server-side typed HTTP wrapper over the Rain issuing API (virtual
stablecoin debit cards). Pure - the client never reads `process.env`; the
dashboard `getRainClient()` injects credentials. Sandbox-by-default.

Consumed by the dashboard `/api/rain/*` route handlers. The client-side
card-secret crypto (RSA session id + AES decrypt) is NOT here - it lives
with the card widget, because plaintext card data must only exist in the
browser.
