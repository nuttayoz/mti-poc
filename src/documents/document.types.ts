export interface DocumentInput {
  buffer: Buffer;
  filename: string;
  gmailMessageId: string;
  mimeType: string;
  receivedAt?: Date;
  sender?: string;
  subject?: string;
}

export interface ProcessedDocument {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  source: {
    filename: string;
    gmailMessageId: string;
    mimeType: string;
  };
  transform?: {
    mode: string;
    provider?: string;
  };
}
