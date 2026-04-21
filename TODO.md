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

- [ ] Build `GmailModule`.
- [x] Build `GoogleAuthService`.
- [ ] Authenticate with Gmail API.
- [ ] Search messages with label `SDG/Process`.
- [ ] Exclude already processed messages.
- [ ] Fetch full message details.
- [ ] Detect attachments.
- [ ] Download attachment bytes.
- [ ] Extract useful metadata:
  - [ ] Gmail message ID
  - [ ] sender
  - [ ] subject
  - [ ] received date
  - [ ] attachment filename
  - [ ] MIME type
- [ ] Move message from `SDG/Process` to `SDG/Processing` before processing.
- [ ] Move successful messages to `SDG/Processed`.
- [ ] Move failed messages to `SDG/Failed`.
- [ ] Optionally archive successful messages.

## Phase 4: Google Drive Integration

- [ ] Build `DriveModule`.
- [ ] Authenticate with Drive API.
- [ ] Configure destination folder ID with environment variable.
- [ ] Upload a file to Google Drive.
- [ ] Set uploaded file name.
- [ ] Set uploaded file MIME type.
- [ ] Return Drive file ID and link.
- [ ] Add folder validation during startup.

## Phase 5: Document Processing MVP

- [ ] Build `DocumentsModule`.
- [ ] Define `DocumentInput` type.
- [ ] Define `ProcessedDocument` type.
- [ ] Define `DocumentProcessor` interface.
- [ ] Implement a pass-through processor first.
- [ ] Generate standardized output filenames.
- [ ] Preserve original file extension for pass-through mode.
- [ ] Add simple file type allowlist.
- [ ] Skip unsupported file types gracefully.

## Phase 6: Scheduled Gateway Job

- [ ] Build `DocumentGatewayJob`.
- [ ] Run the job on a configurable interval.
- [ ] Limit number of messages processed per run.
- [ ] Process attachments one message at a time.
- [ ] Catch per-message errors without stopping the whole run.
- [ ] Add clear logs for:
  - [ ] messages found
  - [ ] attachments downloaded
  - [ ] files uploaded
  - [ ] skipped files
  - [ ] failed messages
- [ ] Prevent duplicate runs from overlapping.

## Phase 7: Reliability Without a Database

- [ ] Use Gmail labels as state transitions.
- [ ] Treat `SDG/Processing` messages as recoverable stuck work.
- [ ] Add a manual recovery command or endpoint for stuck messages.
- [ ] Make upload filenames deterministic where possible.
- [ ] Include Gmail message ID in Drive file metadata or description.
- [ ] Avoid logging attachment contents or sensitive document text.

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

- [ ] Add OCR processor for receipt images.
- [ ] Add PDF conversion for supported document types.
- [ ] Add AI summarization processor for email body or text files.
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
