# Slack leads app setup

Operator runbook for standing up the `#leads` Slack notifier. The dashboard posts one message per first-seen contact (`lib/analytics/leads/notifier.ts`); this doc covers the one-time Slack app creation and the env vars that turn the notifier on. The notifier is a no-op until both env vars below are set - no code changes are needed to enable or disable it.

## 1. Create the Slack app from a manifest

Log in to the Slack CLI (or skip straight to the web flow in step 2 if you don't have it installed):

```bash
slack login
```

App manifest (bot user + minimal `chat:write` scope - no other permissions are needed):

```yaml
display_information:
  name: Demo Leads
features:
  bot_user:
    display_name: demo-leads
    always_online: true
oauth_config:
  scopes:
    bot:
      - chat:write
settings:
  org_deploy_enabled: false
  socket_mode_enabled: false
```

Create the app either via the CLI (`slack create` pointed at the manifest above) or through the web UI: [api.slack.com/apps](https://api.slack.com/apps) -> **Create New App** -> **From an app manifest** -> pick the workspace -> paste the YAML above -> **Create**.

## 2. Install the app to the workspace

From the app's **OAuth & Permissions** page, click **Install to Workspace** and approve. This mints the Bot User OAuth Token (`xoxb-...`).

## 3. Invite the bot to `#leads`

In Slack, open (or create) the `#leads` channel and run:

```
/invite @demo-leads
```

## 4. Copy the bot token and channel id

- **Bot token:** app's **OAuth & Permissions** page -> **Bot User OAuth Token** (starts `xoxb-`).
- **Channel id:** in `#leads`, click the channel name -> **View channel details** -> the channel id is at the bottom of that panel (starts `C`).

## 5. Set env vars in Vercel

The dashboard reads these two vars (`apps/dashboard/src/env.ts`); both are optional and both must be set for the notifier to send - if either is missing it silently no-ops:

| Var | Value |
| --- | --- |
| `SLACK_BOT_TOKEN` | the `xoxb-...` bot token from step 4 |
| `SLACK_LEADS_CHANNEL` | the `#leads` channel id from step 4 |

Set both for the dashboard's Vercel project (Preview and Production environments - Vercel dashboard -> project -> Settings -> Environment Variables). The token is a dashboard-only secret: it is never committed, never shared with demo apps (D-003), and should only ever live in Vercel env / your local `.env.local`.

Redeploy (or trigger a new preview build) so the running instance picks up the new vars.

## Verifying it works

Trigger an `authenticated` milestone on any non-internal demo session with a real email (e.g. sign in on a live demo preview that isn't flagged `dd_internal`). The ingest route (`POST /api/events`) fires the lead pipeline off `after()`; on the first sighting of that email you should see a message land in `#leads` within a few seconds. Re-triggering the same email will not post again - notification is a one-time, first-seen claim (see `apps/dashboard/AGENTS.md`).

## See also

- `apps/dashboard/AGENTS.md` - Contact/ContactAppearance data model + ingest-time lead pipeline.
- `apps/dashboard/src/lib/analytics/leads/` - detection, recording, and notifier code.
- `apps/dashboard/src/env.ts` - `SLACK_BOT_TOKEN` / `SLACK_LEADS_CHANNEL` definitions.
