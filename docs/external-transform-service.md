# External Transform Service

The Smart Document Gateway does not implement OCR, PDF conversion, AI extraction, or report generation inside this repo.

Its responsibility is orchestration:

```text
Gmail attachment -> external transform service -> processed file -> Google Drive
```

## Current MVP Behavior

The default processor mode is:

```text
DOCUMENT_PROCESSOR_MODE=mock-external
```

This simulates the future third-party API boundary:

- logs a mock external request
- keeps the original file bytes unchanged
- generates the standardized output filename
- returns transform metadata with `mode: mock-external`

This lets the gateway pipeline be built and tested before a real provider is selected.

## Available Modes

```text
DOCUMENT_PROCESSOR_MODE=mock-external
```

Simulates a third-party service while returning the original file.

```text
DOCUMENT_PROCESSOR_MODE=passthrough
```

Bypasses the external-service mock and returns the original file directly.

## Future Provider Contract

When a real transform API is chosen, the implementation should replace the mock processor internals while keeping the `DocumentProcessor` interface.

Suggested request:

```ts
interface TransformationRequest {
  file: Buffer;
  filename: string;
  mimeType: string;
  metadata: {
    gmailMessageId: string;
    receivedAt?: string;
    sender?: string;
    subject?: string;
  };
}
```

Suggested response:

```ts
interface TransformationResponse {
  file: Buffer;
  filename: string;
  mimeType: string;
  metadata?: {
    provider?: string;
    requestId?: string;
  };
}
```

## Environment Variables

These are placeholders for the future real provider:

```text
EXTERNAL_TRANSFORM_API_URL=
EXTERNAL_TRANSFORM_API_KEY=
```

The mock processor only checks whether `EXTERNAL_TRANSFORM_API_URL` exists and logs that it is configured. It does not send network requests.
