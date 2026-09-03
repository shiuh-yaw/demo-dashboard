# Rimau Exchange

**Confidential — Not for onward distribution.** APAC Sales Engineering demo (Brief 04). Rimau is a fictional client.

A non-custodial embedded wallet inside a consumer exchange app, in five beats. See `AGENTS.md` for the contract and `lib/session/script.ts` for the presenter cues.

```bash
pnpm dev:rimau            # http://localhost:4015 - staged mode when no env id is set
```

Press **P** for the presenter rail. Beat 1 is the sign-in card on `/`; beats 2 and 3 are the Add funds / Earn / Send actions on `/portfolio`; beat 4 is "Lose device A" in the rail, then sign in again; beat 5 is `/architecture`.

## Live mode (Dynamic sandbox) checklist

Staged mode needs nothing. Live mode needs a Dynamic **sandbox** environment set up like this, then the env vars below.

In the Dynamic dashboard (https://app.dynamic.xyz), on the sandbox environment:

1. **Log in & user profile** → enable Email and Google (Apple optional). The scenario page reads the enabled providers at runtime.
2. **Security → CORS / allowed origins** → add `http://localhost:4015` (and the Vercel preview origin later). Social sign-in redirects back to `/`.
3. **Embedded wallets** → Dynamic embedded wallets (TSS-MPC) on, EVM enabled. The app creates the EVM wallet itself right after sign-in.
4. **Chains & networks** → EVM on, **Ethereum Sepolia** (11155111) enabled. The app switches the wallet to Sepolia before every send.
5. **Gas sponsorship** (beat 3) → ZeroDev account abstraction with Sepolia sponsored. This is Enterprise tier and provisioned by the Dynamic team, not a self-serve toggle; ask internally. Without it the send falls back to user-paid gas and fails honestly on a zero ETH balance.
6. **MFA** → leave off for the demo. A step-up would interrupt the 7702 authorization signature, which this app does not handle.

Then in `apps/rimau/.env`:

```bash
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=<sandbox environment id>
NEXT_PUBLIC_RIMAU_MODE=live            # optional; live is inferred from the id
NEXT_PUBLIC_SEPOLIA_RPC_URL=<alchemy or infura sepolia url>   # optional, public RPC otherwise
# NEXT_PUBLIC_APP_ENV stays unset: sandbox by default (D-005)
```

Before the session, pre-fund the wallet with **Sepolia USDC** (Circle faucet: https://faucet.circle.com, network Ethereum Sepolia). Sign in once, open the presenter rail (P) → "Reveal address", or use Add funds → "Show deposit address", and send USDC there. No ETH is needed when sponsorship is on.

Rehearse beats 3 and 4 against the sandbox once before the day: beat 3 signs the EIP-7702 authorization on the first sponsored send, and beat 4's "Lose device A" wipes this browser's SDK storage, so the restore is only faithful with a real sign-in afterwards.
