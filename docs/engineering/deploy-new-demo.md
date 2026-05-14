# Deploying a new demo

This is the runbook for provisioning a Vercel project for a new demo app under `apps/<name>/`. Time budget: ~15 minutes once `VERCEL_TOKEN` is provisioned.

> Decisions referenced: D-005 (sandbox by default), D-018 (`pnpm setup:deploy` script).

---

## Prerequisites

1. The demo app already exists under `apps/<name>/` with:
   - `package.json` (any name; the Vercel project is always `dynamic-demos-<name>`).
   - `.env.example` listing every server-side env var the app reads.
2. `VERCEL_TOKEN` is set in your shell. Provision a token at https://vercel.com/account/tokens with `Full Account` scope for the `dynamic-labs` team.
3. You have access to the Vercel dashboard for the `dynamic-labs` team (to populate real env values after the script runs).

## Steps

### 1. Run `pnpm setup:deploy`

```bash
VERCEL_TOKEN=<token> pnpm setup:deploy <app-name>
```

The script:
- Reads `apps/<app-name>/package.json` and `.env.example`.
- Creates the Vercel project `dynamic-demos-<app-name>` (`framework=nextjs`, `rootDirectory=apps/<app-name>`).
- Uploads every `.env.example` key as an empty encrypted `production` placeholder.
- Logs a "next step" reminder.

Idempotent: re-running on an existing project logs and exits 0. The script never reads real `.env` values — it only knows the key names.

### 2. Link the GitHub repository

Open https://vercel.com/dynamic-labs/dynamic-demos-<app-name>/settings/git and connect it to `dynamic-labs/demo-dashboard`. The repo connection is per-project — the script intentionally does not call the Git API because Vercel's auto-detect for monorepo subprojects is more reliable than the API at the time of writing.

Set:
- Production branch: `main`.
- Ignored build step: leave default — Turbo's affected-output cache handles no-op rebuilds.

### 3. Populate real env values

For each placeholder uploaded in step 1, populate the real sandbox value via the Vercel dashboard or CLI:

```bash
cd apps/<app-name>
vercel env add <KEY> production
# Paste the value when prompted — never echo it through shell history.
```

Sandbox by default per D-005. Production credentials are only added in a separate `[prod-creds]` PR — never in the same PR that creates the project.

### 4. Trigger an initial deploy

```bash
cd apps/<app-name>
vercel --prod
```

Or push a commit to `main` — the Git integration deploys automatically once linked.

### 5. (Optional) Custom domain

Custom domains are configured in the Vercel dashboard under Settings → Domains. The script does not automate this — domain choice is a product decision, not engineering.

## Failure handling

| Symptom | Cause | Fix |
|---|---|---|
| `VERCEL_TOKEN is not set` | Token missing from env | Run `export VERCEL_TOKEN=<token>` or prefix the command |
| `apps/<name>/package.json not found` | Wrong app name | Verify `ls apps/` |
| `Vercel API 403 ...` | Token lacks scope | Re-provision with `Full Account` for `dynamic-labs` |
| `Vercel API 409 ...` (rare) | Concurrent create | Re-run; setup is idempotent |
| Project exists but app name is wrong | Created with wrong name | Run `pnpm teardown:deploy <wrong-name>` then re-run setup with the correct name |

## Rollback

```bash
pnpm teardown:deploy <app-name>
```

The teardown script:
- Looks up `dynamic-demos-<app-name>`.
- Prompts `Type the app name to confirm:` — answer with the bare app name (not the `dynamic-demos-` prefix).
- Deletes the project. Env vars + deployments go with it.

Pass `--yes` to skip the prompt for scripted teardown (e.g. CI cleanup).

## See also

- `scripts/setup-vercel-project.mjs` — the script itself; reading it is faster than reading this doc for the actual API calls.
- `scripts/teardown-vercel-project.mjs` — teardown.
- `docs/projects/demo-meta-system/DECISIONS.md` — D-005, D-018.
- `docs/engineering/add-new-demo-type.md` — when the demo type itself is new (not just a new instance).
