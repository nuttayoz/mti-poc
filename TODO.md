# Smart Document Gateway TODO

This TODO tracks the first NestJS + Bun implementation of the Smart Document Gateway MVP.

## Goal

Build a headless service that:

1. Finds Gmail messages marked for processing.
2. Downloads supported attachments.
3. Runs each attachment through a replaceable document processor.
4. Uploads the final document to Google Drive.
5. Updates Gmail labels so the same email is not processed twice.

The first version will not use a database. Gmail labels will act as the workflow state.

## MVP Workflow

```text
Gmail label: SDG/Process
        |
        v
NestJS scheduled job
        |
        v
Download attachments
        |
        v
Document processor
        |
        v
Upload result to Google Drive
        |
        v
Gmail label: SDG/Processed or SDG/Failed
```

## Phase 1: Project Setup

- [x] Create a NestJS project configured to run with Bun.
- [x] Add environment configuration support.
- [x] Add a health-check endpoint.
- [x] Add a scheduled job module.
- [x] Add basic structured logging.
- [x] Add README instructions for local setup.

## Phase 2: Google API Setup

- [x] Add Google Cloud setup guide.
- [x] Create Google Cloud project.
- [x] Enable Gmail API.
- [x] Enable Google Drive API.
- [x] Configure OAuth consent screen.
- [x] Create OAuth credentials.
- [x] Decide where local OAuth tokens will be stored for MVP.
- [x] Add required Gmail scopes.
- [x] Add required Drive scopes.
- [x] Add Google OAuth endpoints.
- [x] Create Gmail labels:
  - [x] `SDG/Process`
  - [x] `SDG/Processing`
  - [x] `SDG/Processed`
  - [x] `SDG/Failed`

## Phase 3: Gmail Integration

- [x] Build `GmailModule`.
- [x] Build `GoogleAuthService`.
- [ ] Authenticate with Gmail API.
- [x] Search messages with label `SDG/Process`.
- [x] Exclude already processed messages.
- [x] Fetch full message details.
- [x] Detect attachments.
- [x] Download attachment bytes.
- [x] Extract useful metadata:
  - [x] Gmail message ID
  - [x] sender
  - [x] subject
  - [x] received date
  - [x] attachment filename
  - [x] MIME type
- [x] Move message from `SDG/Process` to `SDG/Processing` before processing.
- [x] Move successful messages to `SDG/Processed`.
- [x] Move failed messages to `SDG/Failed`.
- [x] Optionally archive successful messages.

## Phase 4: Google Drive Integration

- [x] Build `DriveModule`.
- [x] Authenticate with Drive API.
- [x] Configure destination folder ID with environment variable.
- [x] Upload a file to Google Drive.
- [x] Set uploaded file name.
- [x] Set uploaded file MIME type.
- [x] Return Drive file ID and link.
- [x] Add app-created Drive folder setup endpoint.
- [x] Add folder validation endpoint.
- [ ] Add folder validation during startup.

## Phase 5: Document Processing MVP

- [x] Build `DocumentsModule`.
- [x] Define `DocumentInput` type.
- [x] Define `ProcessedDocument` type.
- [x] Define `DocumentProcessor` interface.
- [x] Implement a pass-through processor first.
- [x] Implement mock external transformation processor.
- [x] Add processor mode selection.
- [x] Generate standardized output filenames.
- [x] Preserve original file extension for pass-through mode.
- [x] Add simple file type allowlist.
- [x] Skip unsupported file types gracefully.

## Phase 6: Scheduled Gateway Job

- [x] Build `DocumentGatewayJob`.
- [x] Run the job on a configurable interval.
- [x] Add manual run endpoint.
- [x] Add gateway job status endpoint.
- [x] Limit number of messages processed per run.
- [x] Process attachments one message at a time.
- [x] Catch per-message errors without stopping the whole run.
- [x] Add clear logs for:
  - [x] messages found
  - [x] attachments downloaded
  - [x] files uploaded
  - [x] skipped files
  - [x] failed messages
- [x] Prevent duplicate runs from overlapping.

## Phase 7: Reliability Without a Database

- [x] Use Gmail labels as state transitions.
- [ ] Treat `SDG/Processing` messages as recoverable stuck work.
- [ ] Add a manual recovery command or endpoint for stuck messages.
- [x] Make upload filenames deterministic where possible.
- [x] Include Gmail message ID in Drive file metadata or description.
- [x] Avoid logging attachment contents or sensitive document text.

## Phase 8: Configuration

- [x] Add `.env.example`.
- [x] Add configuration for:
  - [x] Google OAuth client ID
  - [x] Google OAuth client secret
  - [x] Google OAuth redirect URI
  - [x] Google token storage path
  - [x] Google Drive destination folder ID
  - [x] Gmail input label
  - [x] Gmail processing label
  - [x] Gmail processed label
  - [x] Gmail failed label
  - [x] job interval
  - [x] max messages per run
  - [x] archive after success

## Phase 9: First Manual Test

- [ ] Start the NestJS service with Bun.
- [ ] Label one Gmail email as `SDG/Process`.
- [ ] Confirm the service finds the message.
- [ ] Confirm the attachment downloads.
- [ ] Confirm the file uploads to Drive.
- [ ] Confirm Gmail labels update correctly.
- [ ] Confirm the same email is not processed again.

## Phase 10: Next Improvements

- [ ] Replace mock external processor with real third-party transform API.
- [ ] Add transform API retries and timeout configuration.
- [ ] Store transform provider request IDs in Drive metadata or description.
- [ ] Add per-sender routing rules.
- [ ] Add per-label destination folders.
- [ ] Add a small dashboard for processed counts and failures.
- [ ] Add database persistence when label-only state becomes limiting.
- [ ] Replace polling with Gmail push notifications and Google Pub/Sub.

## Initial Architecture

```text
src/
  app.module.ts
  main.ts
  config/
    config.module.ts
  google/
    google-auth.service.ts
  gmail/
    gmail.module.ts
    gmail.service.ts
  drive/
    drive.module.ts
    drive.service.ts
  documents/
    documents.module.ts
    document-processor.interface.ts
    passthrough-document.processor.ts
  jobs/
    document-gateway.job.ts
```

## Notes

- Start with polling instead of Gmail push notifications.
- Start with a pass-through processor before adding OCR or AI.
- Use Gmail labels for idempotency until a database is needed.
- Keep the processor interface replaceable so external APIs can be added later.
