import { Injectable } from '@nestjs/common';
import { google, gmail_v1 } from 'googleapis';
import { JsonLogger } from '../common/logging/json-logger.service';
import { AppConfigService } from '../config/app-config.service';
import { GoogleAuthService } from '../google/google-auth.service';
import {
  DownloadedGmailAttachment,
  GmailAttachment,
  GmailLabelSet,
  GmailMessageSummary,
  GmailProcessableMessage,
  GmailRecoveredMessage,
} from './gmail.types';

@Injectable()
export class GmailService {
  constructor(
    private readonly config: AppConfigService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly logger: JsonLogger,
  ) {}

  async isReady(): Promise<boolean> {
    const status = await this.googleAuthService.getStatus();
    return status.configured && status.tokenStored;
  }

  async listLabels(): Promise<GmailLabelSet> {
    const labelNames = this.config.gmailLabels;

    if (!(await this.isReady())) {
      return labelNames;
    }

    const gmail = await this.getClient();
    const response = await gmail.users.labels.list({ userId: 'me' });
    const existingLabels = new Set(
      response.data.labels
        ?.map((label) => label.name)
        .filter((labelName): labelName is string => Boolean(labelName)) ?? [],
    );

    for (const labelName of Object.values(labelNames)) {
      if (!existingLabels.has(labelName)) {
        this.logger.warn(
          {
            event: 'gmail.label_missing',
            labelName,
          },
          GmailService.name,
        );
      }
    }

    return labelNames;
  }

  async findProcessableMessages(): Promise<GmailProcessableMessage[]> {
    if (!(await this.isReady())) {
      this.logger.warn(
        {
          event: 'gmail.skipped',
          reason: 'google_oauth_tokens_missing',
        },
        GmailService.name,
      );
      return [];
    }

    const gmail = await this.getClient();
    const labels = this.config.gmailLabels;
    const inputLabelId = await this.getLabelId(gmail, labels.input);
    const terminalLabelIds = new Set(
      (
        await this.getLabelIds(gmail, [
          labels.processing,
          labels.processed,
          labels.failed,
          labels.skipped,
        ])
      ).values(),
    );

    if (!inputLabelId) {
      this.logger.warn(
        {
          event: 'gmail.skipped',
          labelName: labels.input,
          reason: 'input_label_missing',
        },
        GmailService.name,
      );
      return [];
    }

    const response = await gmail.users.messages.list({
      labelIds: [inputLabelId],
      maxResults: this.config.maxMessagesPerRun,
      q: 'has:attachment',
      userId: 'me',
    });

    const messageSummaries = response.data.messages ?? [];
    const processableMessages = await Promise.all(
      messageSummaries.map((message) =>
        this.getProcessableMessage(gmail, {
          id: message.id ?? '',
          labelIds: [],
          threadId: message.threadId ?? undefined,
        }),
      ),
    );

    return processableMessages
      .filter(
        (message): message is GmailProcessableMessage => message !== null,
      )
      .filter((message) =>
        message.labelIds.every((labelId) => !terminalLabelIds.has(labelId)),
      );
  }

  async downloadAttachment(
    message: GmailProcessableMessage,
    attachment: GmailAttachment,
  ): Promise<DownloadedGmailAttachment> {
    const gmail = await this.getClient();
    const response = await gmail.users.messages.attachments.get({
      id: attachment.attachmentId,
      messageId: message.id,
      userId: 'me',
    });

    return {
      ...attachment,
      buffer: this.decodeBase64Url(response.data.data ?? ''),
      gmailMessageId: message.id,
      receivedAt: message.receivedAt,
      sender: message.sender,
      subject: message.subject,
    };
  }

  async moveToProcessing(messageId: string): Promise<void> {
    await this.replaceLabels(messageId, {
      add: [this.config.gmailLabels.processing],
      remove: [this.config.gmailLabels.input],
    });
  }

  async recoverProcessingMessages(): Promise<GmailRecoveredMessage[]> {
    if (!(await this.isReady())) {
      this.logger.warn(
        {
          event: 'gmail.recovery_skipped',
          reason: 'google_oauth_tokens_missing',
        },
        GmailService.name,
      );
      return [];
    }

    const gmail = await this.getClient();
    const labels = this.config.gmailLabels;
    const processingLabelId = await this.getLabelId(gmail, labels.processing);

    if (!processingLabelId) {
      this.logger.warn(
        {
          event: 'gmail.recovery_skipped',
          labelName: labels.processing,
          reason: 'processing_label_missing',
        },
        GmailService.name,
      );
      return [];
    }

    const response = await gmail.users.messages.list({
      labelIds: [processingLabelId],
      maxResults: this.config.maxMessagesPerRun,
      userId: 'me',
    });

    const messages = (response.data.messages ?? [])
      .filter((message) => Boolean(message.id))
      .map((message) => ({
        id: message.id ?? '',
        threadId: message.threadId ?? undefined,
      }));

    for (const message of messages) {
      await this.replaceLabels(message.id, {
        add: [labels.input],
        remove: [labels.processing],
      });

      this.logger.log(
        {
          event: 'gmail.message_recovered',
          messageId: message.id,
        },
        GmailService.name,
      );
    }

    return messages;
  }

  async moveToProcessed(messageId: string): Promise<void> {
    await this.replaceLabels(messageId, {
      add: [this.config.gmailLabels.processed],
      remove: [this.config.gmailLabels.processing],
    });
  }

  async moveToFailed(messageId: string): Promise<void> {
    await this.replaceLabels(messageId, {
      add: [this.config.gmailLabels.failed],
      remove: [this.config.gmailLabels.processing],
    });
  }

  async moveToSkipped(messageId: string): Promise<void> {
    await this.replaceLabels(messageId, {
      add: [this.config.gmailLabels.skipped],
      remove: [this.config.gmailLabels.processing],
    });
  }

  async archive(messageId: string): Promise<void> {
    await this.replaceLabels(messageId, {
      add: [],
      remove: ['INBOX'],
    });
  }

  private async getClient(): Promise<gmail_v1.Gmail> {
    const auth = await this.googleAuthService.getAuthenticatedClient();
    return google.gmail({ auth, version: 'v1' });
  }

  private async getProcessableMessage(
    gmail: gmail_v1.Gmail,
    summary: GmailMessageSummary,
  ): Promise<GmailProcessableMessage | null> {
    if (!summary.id) {
      return null;
    }

    const response = await gmail.users.messages.get({
      format: 'full',
      id: summary.id,
      userId: 'me',
    });
    const message = response.data;

    return {
      attachments: this.extractAttachments(message.payload),
      id: summary.id,
      labelIds: message.labelIds ?? [],
      receivedAt: this.extractReceivedAt(message),
      sender: this.extractHeader(message.payload, 'From'),
      subject: this.extractHeader(message.payload, 'Subject'),
      threadId: message.threadId ?? summary.threadId,
    };
  }

  private extractAttachments(
    payload?: gmail_v1.Schema$MessagePart,
  ): GmailAttachment[] {
    if (!payload) {
      return [];
    }

    const attachments: GmailAttachment[] = [];
    const queue: gmail_v1.Schema$MessagePart[] = [payload];

    while (queue.length > 0) {
      const part = queue.shift();

      if (!part) {
        continue;
      }

      if (part.parts) {
        queue.push(...part.parts);
      }

      if (part.body?.attachmentId && part.filename) {
        attachments.push({
          attachmentId: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType ?? 'application/octet-stream',
          partId: part.partId ?? undefined,
          size: part.body.size ?? undefined,
        });
      }
    }

    return attachments;
  }

  private extractHeader(
    payload: gmail_v1.Schema$MessagePart | undefined,
    headerName: string,
  ): string | undefined {
    const header = payload?.headers?.find(
      (candidate) =>
        candidate.name?.toLowerCase() === headerName.toLowerCase(),
    );

    return header?.value ?? undefined;
  }

  private extractReceivedAt(message: gmail_v1.Schema$Message): Date | undefined {
    if (!message.internalDate) {
      return undefined;
    }

    const timestamp = Number(message.internalDate);

    if (!Number.isFinite(timestamp)) {
      return undefined;
    }

    return new Date(timestamp);
  }

  private async replaceLabels(
    messageId: string,
    labels: {
      add: string[];
      remove: string[];
    },
  ): Promise<void> {
    if (!(await this.isReady())) {
      this.logger.warn(
        {
          event: 'gmail.label_update_skipped',
          messageId,
          reason: 'google_oauth_tokens_missing',
        },
        GmailService.name,
      );
      return;
    }

    const gmail = await this.getClient();
    const labelIds = await this.getLabelIds(gmail, [
      ...labels.add,
      ...labels.remove,
    ]);

    await gmail.users.messages.modify({
      id: messageId,
      requestBody: {
        addLabelIds: labels.add
          .map((labelName) => labelIds.get(labelName))
          .filter((labelId): labelId is string => Boolean(labelId)),
        removeLabelIds: labels.remove
          .map((labelName) => labelIds.get(labelName))
          .filter((labelId): labelId is string => Boolean(labelId)),
      },
      userId: 'me',
    });
  }

  private async getLabelIds(
    gmail: gmail_v1.Gmail,
    labelNames: string[],
  ): Promise<Map<string, string>> {
    const response = await gmail.users.labels.list({ userId: 'me' });
    const labelIds = new Map<string, string>();

    for (const label of response.data.labels ?? []) {
      if (label.name && label.id && labelNames.includes(label.name)) {
        labelIds.set(label.name, label.id);
      }
    }

    for (const labelName of labelNames) {
      if (labelName === 'INBOX') {
        labelIds.set(labelName, labelName);
      }
    }

    return labelIds;
  }

  private async getLabelId(
    gmail: gmail_v1.Gmail,
    labelName: string,
  ): Promise<string | undefined> {
    const labelIds = await this.getLabelIds(gmail, [labelName]);
    return labelIds.get(labelName);
  }

  private decodeBase64Url(value: string): Buffer {
    return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  }
}
