---
name: dynamic-javascript
description: Integrate the Dynamic JavaScript SDK (headless, framework-agnostic) with correct extension usage and chain setup. Use when building vanilla JS, Vue, Angular, or Svelte apps with Dynamic, or when the user mentions Dynamic, headless SDK, or wallet connection without React.
---

# Dynamic JavaScript SDK

You are helping integrate the Dynamic JavaScript SDK (headless/framework-agnostic).
**Docs:** https://dynamic.xyz/docs/javascript/ — use for all APIs and code; search there (MCP, llms.txt, or @docs) before writing implementation.
Before suggesting packages or code, search the SDK docs above for current setup and API names.

## Architecture

- Client-based, framework-agnostic. Works with vanilla JS, Vue, Angular, Svelte, or any other framework.
- You create a client with an environment ID, then add chain extensions by calling standalone functions (no arguments needed).
- Extensions are standalone function calls that register themselves -- they are NOT methods on the client object and do NOT take the client as a parameter.
- The client auto-initializes by default. Manual initialization is available if you need to control timing.

## Common Misunderstandings

- The extension function for Solana is named after "Solana," not "SVM." Using the wrong name is a common mistake from LLM training data.
- Extension functions take NO arguments. Passing the client to them is incorrect.
- This SDK supports many more chains than just EVM and Solana (Starknet, Sui, Tron, Bitcoin, Aptos, etc.). Don't assume it's limited.
- Chains must also be enabled in the Dynamic dashboard -- installing the extension alone isn't enough. Search the docs for "chains" or "dashboard" to find where to enable them.

## Patterns for Efficiency

- Listen for initialization status change events to know when the client is ready before making API calls. Search the docs for "init" or "initialization" to find the event names and usage.
- The SDK is headless -- it provides no UI.
