# Smart Document Gateway

Smart Document Gateway is a headless NestJS service that will move selected Gmail attachments into Google Drive after document processing.

The MVP uses Gmail labels as workflow state instead of a database:

```text
SDG/Process -> SDG/Processing -> SDG/Processed
                         |
                         v
                    SDG/Failed
```

## Current Status

Phase 1 is a runnable service skeleton:

- Bun runtime and package manager
- NestJS app structure
- Environment configuration service
- JSON logger
- `/health` endpoint
- Scheduled document gateway job placeholder

Gmail, Drive, and document processing integrations are planned next.

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
- `JOB_INTERVAL_MS`: how often the gateway job wakes up.
- `MAX_MESSAGES_PER_RUN`: future cap for Gmail messages processed per run.
- `RUN_JOB_ON_STARTUP`: whether to run the scheduled job immediately on boot.
- `ARCHIVE_AFTER_SUCCESS`: future option to archive Gmail messages after successful processing.

## Next Step

The next phase is Google API setup, followed by the Gmail integration module.

Use [docs/google-cloud-setup.md](docs/google-cloud-setup.md) to create the Google Cloud project, OAuth client, scopes, Drive folder, and Gmail labels.
