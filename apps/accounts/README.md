# @dynamic-demos/accounts

Business Accounts demo: one embedded MPC wallet under a whole team, with
co-signers, and administrative reach kept separate from signing authority.

Read `AGENTS.md` first — it documents the SDK pin, the step-up requirement, the
analytics taxonomy, and the gotchas.

## Run it

```bash
pnpm install
pnpm --filter @dynamic-demos/accounts dev   # http://localhost:4014
```

## Environment

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`.

The environment **must** have:

- the `enable-business-accounts` flag on (early access — talk to Dynamic), or
  every account call returns 403;
- at least one step-up-capable credential enabled (email OTP, TOTP, or
  passkey), or adding signers and members is unreachable.

## Checks

```bash
pnpm --filter @dynamic-demos/accounts typecheck
pnpm --filter @dynamic-demos/accounts lint
pnpm --filter @dynamic-demos/accounts test
```

## Walking the demo

1. Sign in with an email code.
2. Create an account — you become its `owner`.
3. Open **Wallets & signers**, then either create a wallet the account owns or
   link one of your own.
4. **Add signer** on that wallet. This is the reshare ceremony, so it prompts
   for verification first; afterwards two people sign from the same wallet.
5. Open **Members & roles** to add an admin or a viewer, change a role, or hand
   the account over.

The code panel on the right follows each step.
