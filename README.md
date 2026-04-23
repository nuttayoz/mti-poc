# Smart Document Gateway

Smart Document Gateway is a headless NestJS service that will move selected Gmail attachments into Google Drive after document processing.

The MVP uses Gmail labels as workflow state instead of a database:

```text
SDG/Process -> SDG/Processing -> SDG/Processed
                         |
                         v
              SDG/Failed or SDG/Skipped
```

## Current Status

The app is a runnable service skeleton with Google OAuth foundation:

- Bun runtime and package manager
- NestJS app structure
- Environment configuration service
- JSON logger
- `/health` endpoint
- Scheduled document gateway job
- Google OAuth URL, callback, token storage, and status endpoints
- Gmail module skeleton for labels, message search, attachment download, and state transitions
- Drive module skeleton for destination folder validation and file upload
- Documents module with pass-through processing and standardized filenames

Live Gmail and Drive API verification is waiting for Google OAuth authorization.

## Requirements

- Bun 1.3 or newer
- Google Cloud project credentials will be needed in a later phase

## Setup

Install dependencies:

```bash
bun install
```

Create local environment values:

```bash
cp .env.example .env
```

Start the service:

```bash
bun run build
bun run start
```

Check the health endpoint:

```bash
curl http://localhost:3000/health
```

## Google OAuth

After `.env` contains your Google OAuth values, start the app on the same port configured in `GOOGLE_OAUTH_REDIRECT_URI`.

For the default redirect URI, use port `3000`:

```bash
bun run build
bun run start
```

Check OAuth readiness:

```bash
curl http://localhost:3000/oauth/google/status
```

Open this URL in your browser to connect your Google account:

```text
http://localhost:3000/oauth/google/start
```

After Google redirects back to the app, tokens are stored at:

```text
.tokens/google-oauth.json
```

This file is ignored by git.

Until tokens exist, the scheduled job runs safely in a dry shape: it logs that Google OAuth is not ready and skips live Gmail/Drive work.

To switch the target mailbox, reset the stored OAuth token:

```bash
curl -X POST http://localhost:3900/oauth/google/reset
```

or:

```bash
curl -X DELETE http://localhost:3900/oauth/google/token
```

Then open `/oauth/google/start` again and sign in as the new target mailbox.

Resetting OAuth only deletes the local token file. It does not delete any Gmail labels, processed Drive files, or Drive folders.

## Drive Setup

With the default `drive.file` scope, the safest path is to let the app create its own destination folder:

```bash
curl -X POST http://localhost:3900/drive/setup-folder \
  -H 'content-type: application/json' \
  -d '{"name":"Smart Document Gateway"}'
```

Copy the returned `id` into `.env`:

```text
GOOGLE_DRIVE_DESTINATION_FOLDER_ID=...
```

Restart the app and validate:

```bash
curl http://localhost:3900/drive/folder/status
```

If you switch OAuth to a different target account, create a new app-owned Drive folder for that account and update `GOOGLE_DRIVE_DESTINATION_FOLDER_ID`. The old folder remains in the old account's Drive.

## Manual Gateway Runs

The cron job still runs on `JOB_INTERVAL_MS`, but you can trigger a run immediately:

```bash
curl -X POST http://localhost:3900/jobs/document-gateway/run
```

Check job state:

```bash
curl http://localhost:3900/jobs/document-gateway/status
```

The manual endpoint uses the same overlap guard as the scheduled job. If another run is already active, the request is skipped safely.

Recover stuck messages:

```bash
curl -X POST http://localhost:3900/jobs/document-gateway/recover-stuck
```

This moves messages from `SDG/Processing` back to `SDG/Process` so a later run can retry them.

## Message Outcomes

The gateway treats labels as workflow state:

- `SDG/Processed`: at least one supported attachment was uploaded to Drive.
- `SDG/Skipped`: the email was checked, but no supported attachment produced output.
- `SDG/Failed`: processing failed while handling a supported attachment or updating state.

`SDG/Skipped` is a terminal label, so future runs ignore that message unless you remove the label and apply `SDG/Process` again.

If an app crash or network failure leaves an email in `SDG/Processing`, use the recovery endpoint above to make it eligible again.

## Useful Scripts

```bash
bun run build        # compile TypeScript to dist
bun run build:watch  # compile TypeScript in watch mode
bun run start        # run compiled dist/main.js with Bun
bun run start:dev    # run compiled dist/main.js with Bun watch mode
bun run typecheck    # run TypeScript without emitting files
```

NestJS uses legacy TypeScript decorator metadata, so this project compiles with `tsc` before Bun runs the compiled JavaScript.

For local development with rebuilds, use two terminals:

```bash
bun run build:watch
```

```bash
bun run start:dev
```

## Configuration

The app reads configuration from environment variables. See `.env.example` for the current list.

Important early values:

- `PORT`: HTTP port for the NestJS service.
- `LOG_FORMAT`: `pretty` for colored local logs or `json` for machine-readable logs.
- `LOG_COLORS`: enable or disable ANSI colors for pretty logs.
- `JOB_INTERVAL_MS`: how often the gateway job wakes up.
- `MAX_MESSAGES_PER_RUN`: future cap for Gmail messages processed per run.
- `RUN_JOB_ON_STARTUP`: whether to run the scheduled job immediately on boot.
- `ARCHIVE_AFTER_SUCCESS`: future option to archive Gmail messages after successful processing.
- `DOCUMENT_PROCESSOR_MODE`: `mock-external` by default, or `passthrough`.

## Document Transformation

This repo does not implement OCR, PDF conversion, AI extraction, or report generation directly. It prepares the gateway boundary for an external transformation service.

The current default is a mock external processor. See [docs/external-transform-service.md](docs/external-transform-service.md).

## Next Step

When Google OAuth is available, authorize the app with `/oauth/google/start`, then run the first live Gmail/Drive API test.
