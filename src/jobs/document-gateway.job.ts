import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JsonLogger } from '../common/logging/json-logger.service';
import { AppConfigService } from '../config/app-config.service';
import { DocumentProcessor } from '../documents/document-processor.interface';
import { DOCUMENT_PROCESSOR } from '../documents/document.tokens';
import { DocumentInput } from '../documents/document.types';
import { DriveService } from '../drive/drive.service';
import { GmailService } from '../gmail/gmail.service';
import {
  GmailAttachment,
  GmailProcessableMessage,
} from '../gmail/gmail.types';
import {
  DocumentGatewayRunResult,
  DocumentGatewayStatus,
  DocumentGatewaySummary,
} from './document-gateway.types';

@Injectable()
export class DocumentGatewayJob implements OnModuleInit, OnModuleDestroy {
  private isRunning = false;
  private intervalRef?: ReturnType<typeof setInterval>;
  private lastRun?: DocumentGatewayRunResult;

  constructor(
    private readonly config: AppConfigService,
    private readonly driveService: DriveService,
    private readonly gmailService: GmailService,
    private readonly logger: JsonLogger,
    @Inject(DOCUMENT_PROCESSOR)
    private readonly documentProcessor: DocumentProcessor,
  ) {}

  onModuleInit(): void {
    this.intervalRef = setInterval(
      () => void this.runScheduled(),
      this.config.jobIntervalMs,
    );

    this.logger.log(
      {
        event: 'job.scheduled',
        intervalMs: this.config.jobIntervalMs,
        job: 'document-gateway',
        runOnStartup: this.config.runJobOnStartup,
      },
      DocumentGatewayJob.name,
    );

    if (this.config.runJobOnStartup) {
      void this.runScheduled();
    }
  }

  onModuleDestroy(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  async runScheduled(): Promise<void> {
    await this.runNow('scheduled');
  }

  async runManual(): Promise<DocumentGatewayRunResult> {
    return this.runNow('manual');
  }

  getStatus(): DocumentGatewayStatus {
    return {
      intervalMs: this.config.jobIntervalMs,
      job: 'document-gateway',
      lastRun: this.lastRun,
      running: this.isRunning,
      runOnStartup: this.config.runJobOnStartup,
    };
  }

  private async runNow(
    trigger: 'manual' | 'scheduled',
  ): Promise<DocumentGatewayRunResult> {
    if (this.isRunning) {
      const skippedRun = {
        durationMs: 0,
        finishedAt: new Date().toISOString(),
        job: 'document-gateway' as const,
        skipped: true,
        startedAt: new Date().toISOString(),
      };

      this.logger.warn(
        {
          event: 'job.skipped',
          job: 'document-gateway',
          reason: 'previous_run_still_active',
          trigger,
        },
        DocumentGatewayJob.name,
      );

      return skippedRun;
    }

    const startedAt = Date.now();
    const startedAtIso = new Date(startedAt).toISOString();
    this.isRunning = true;

    this.logger.log(
      {
        event: 'job.started',
        job: 'document-gateway',
        labels: this.config.gmailLabels,
        maxMessagesPerRun: this.config.maxMessagesPerRun,
        trigger,
      },
      DocumentGatewayJob.name,
    );

    try {
      const summary = await this.runGateway();
      const result = {
        durationMs: Date.now() - startedAt,
        finishedAt: new Date().toISOString(),
        job: 'document-gateway' as const,
        skipped: false,
        startedAt: startedAtIso,
        summary,
      };

      this.logger.log(
        {
          durationMs: result.durationMs,
          event: 'job.completed',
          job: 'document-gateway',
          summary,
          trigger,
        },
        DocumentGatewayJob.name,
      );

      this.lastRun = result;

      return result;
    } catch (error) {
      const result = {
        durationMs: Date.now() - startedAt,
        finishedAt: new Date().toISOString(),
        job: 'document-gateway' as const,
        skipped: false,
        startedAt: startedAtIso,
      };

      this.logger.error(
        {
          event: 'job.failed',
          error,
          job: 'document-gateway',
          trigger,
        },
        undefined,
        DocumentGatewayJob.name,
      );

      this.lastRun = result;

      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async runGateway(): Promise<DocumentGatewaySummary> {
    const gmailReady = await this.gmailService.isReady();
    const driveReady = await this.driveService.isReady();

    if (!gmailReady || !driveReady) {
      this.logger.warn(
        {
          driveReady,
          event: 'job.dry_run',
          gmailReady,
          job: 'document-gateway',
          reason: 'google_oauth_tokens_or_drive_folder_not_ready',
        },
        DocumentGatewayJob.name,
      );
    }

    await this.gmailService.listLabels();
    await this.driveService.validateDestinationFolder();

    const messages = await this.gmailService.findProcessableMessages();
    const summary = {
      attachmentsProcessed: 0,
      attachmentsSkipped: 0,
      messagesFailed: 0,
      messagesFound: messages.length,
      messagesProcessed: 0,
    };

    for (const message of messages) {
      try {
        await this.processMessage(message, summary);
      } catch (error) {
        summary.messagesFailed += 1;

        this.logger.error(
          {
            error,
            event: 'job.message_failed',
            job: 'document-gateway',
            messageId: message.id,
          },
          undefined,
          DocumentGatewayJob.name,
        );

        await this.gmailService.moveToFailed(message.id);
      }
    }

    return summary;
  }

  private async processMessage(
    message: GmailProcessableMessage,
    summary: {
      attachmentsProcessed: number;
      attachmentsSkipped: number;
      messagesProcessed: number;
    },
  ): Promise<void> {
    this.logger.log(
      {
        attachmentCount: message.attachments.length,
        event: 'job.message_started',
        job: 'document-gateway',
        messageId: message.id,
        subject: message.subject,
      },
      DocumentGatewayJob.name,
    );

    await this.gmailService.moveToProcessing(message.id);

    for (const attachment of message.attachments) {
      const processed = await this.processAttachment(message, attachment);

      if (processed) {
        summary.attachmentsProcessed += 1;
      } else {
        summary.attachmentsSkipped += 1;
      }
    }

    await this.gmailService.moveToProcessed(message.id);

    if (this.config.archiveAfterSuccess) {
      await this.gmailService.archive(message.id);
    }

    summary.messagesProcessed += 1;
  }

  private async processAttachment(
    message: GmailProcessableMessage,
    attachment: GmailAttachment,
  ): Promise<boolean> {
    if (!this.documentProcessor.supports(attachment)) {
      this.logger.warn(
        {
          event: 'job.attachment_skipped',
          filename: attachment.filename,
          job: 'document-gateway',
          messageId: message.id,
          mimeType: attachment.mimeType,
          reason: 'unsupported_file_type',
        },
        DocumentGatewayJob.name,
      );
      return false;
    }

    const downloadedAttachment = await this.gmailService.downloadAttachment(
      message,
      attachment,
    );

    this.logger.log(
      {
        byteLength: downloadedAttachment.buffer.byteLength,
        event: 'job.attachment_downloaded',
        filename: attachment.filename,
        job: 'document-gateway',
        messageId: message.id,
        mimeType: attachment.mimeType,
      },
      DocumentGatewayJob.name,
    );

    const documentInput: DocumentInput = {
      buffer: downloadedAttachment.buffer,
      filename: downloadedAttachment.filename,
      gmailMessageId: message.id,
      mimeType: downloadedAttachment.mimeType,
      receivedAt: downloadedAttachment.receivedAt,
      sender: downloadedAttachment.sender,
      subject: downloadedAttachment.subject,
    };
    const processedDocument = await this.documentProcessor.process(documentInput);
    const uploadResult = await this.driveService.uploadFile({
      buffer: processedDocument.buffer,
      description: this.buildDriveDescription(processedDocument),
      filename: processedDocument.filename,
      mimeType: processedDocument.mimeType,
    });

    this.logger.log(
      {
        driveFileId: uploadResult.id,
        event: 'job.attachment_processed',
        job: 'document-gateway',
        messageId: message.id,
        outputFilename: uploadResult.name,
        sourceFilename: attachment.filename,
      },
      DocumentGatewayJob.name,
    );

    return true;
  }

  private buildDriveDescription(processedDocument: {
    source: {
      filename: string;
      gmailMessageId: string;
      mimeType: string;
    };
    transform?: {
      mode: string;
      provider?: string;
    };
  }): string {
    const description = [
      `Source Gmail message ID: ${processedDocument.source.gmailMessageId}`,
      `Source filename: ${processedDocument.source.filename}`,
      `Source MIME type: ${processedDocument.source.mimeType}`,
    ];

    if (processedDocument.transform) {
      description.push(`Transform mode: ${processedDocument.transform.mode}`);

      if (processedDocument.transform.provider) {
        description.push(
          `Transform provider: ${processedDocument.transform.provider}`,
        );
      }
    }

    return description.join('\n');
  }
}
