export interface GmailLabelSet {
  failed: string;
  input: string;
  processed: string;
  processing: string;
  skipped: string;
}

export interface GmailMessageSummary {
  id: string;
  labelIds: string[];
  threadId?: string;
}

export interface GmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  partId?: string;
  size?: number;
}

export interface GmailProcessableMessage extends GmailMessageSummary {
  attachments: GmailAttachment[];
  receivedAt?: Date;
  sender?: string;
  subject?: string;
}

export interface DownloadedGmailAttachment extends GmailAttachment {
  buffer: Buffer;
  gmailMessageId: string;
  receivedAt?: Date;
  sender?: string;
  subject?: string;
}
