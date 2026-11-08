# Compatibility reports (open beta)

Only two devices can be tested by the maintainers, so the app asks testers to share what
happens on theirs. Everything is opt-in.

## What the app sends, and when

Consent is asked in the onboarding wizard ("Share compatibility reports", **off by
default**) and can be changed any time in **Updates → Settings**. With consent on, the app
sends:

| Event | Trigger | Contents |
|---|---|---|
| `inventory` | a Havit device without a verified driver is detected (once per device, app version and install) | device list: USB VID/PID, interface usage pages, firmware version, support level |
| `failure` | a command to a device fails (once per device, action and error message per install and version) | the above plus the action, the error text with file paths removed, and the last 20 diagnostics *summaries* for that device (no payload bytes) |
| `manual` | the user chooses **Report compatibility…** and reviews the text on screen | the above plus the user's notes and, if ticked, the last 40 diagnostics entries including payload bytes |

Every report also carries the app version, the Windows version (from the user agent) and a
random install id generated on first launch (used to deduplicate, not linked to anything).
Reports never include user names, serial numbers, file paths or screen contents.

With consent off, nothing is sent. **Report compatibility…** then opens the report as a
GitHub issue draft in the browser, where the user reviews and submits it themselves.

## Where reports go

The app has no GitHub token (anything shipped in the app can be extracted). It POSTs to a
small Cloudflare Worker (`infra/compat-relay`) that holds a fine-grained token and files the
report as an issue in `emirhannaneli/havit-console` with the labels `compatibility`, `beta`,
`auto-report`. The app sends structured fields only (schema 2); the Worker validates every field (hex
IDs, version patterns, enums, lengths), renders the markdown itself with all free text inside
code spans/blocks (so no mentions or links can be injected), and enforces a 24 KB body limit,
20 reports per IP per hour, 10 per install per day, 300 per day in total. Repeated reports
with the same fingerprint become a comment on the existing issue.

Endpoint used by the app: `REPORT_ENDPOINT` in `src/telemetry.ts`.

## Deploying the relay (one time)

```bash
cd infra/compat-relay
npm install
npx wrangler login
npx wrangler kv namespace create STATE        # paste the id into wrangler.toml
npx wrangler secret put GITHUB_TOKEN           # fine-grained PAT, this repo only, Issues: read & write
npx wrangler deploy                            # prints https://havit-console-reports.<account>.workers.dev
```

If the printed hostname differs from `REPORT_ENDPOINT` in `src/telemetry.ts`, update the
constant and release a new version.

Create the token at GitHub → Settings → Developer settings → Fine-grained tokens:
resource owner `emirhannaneli`, repository access **only** `havit-console`, repository
permission **Issues: Read and write**, expiration ≤ 1 year (rotate with
`wrangler secret put` before it expires).
