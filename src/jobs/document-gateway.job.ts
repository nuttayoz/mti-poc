import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JsonLogger } from '../common/logging/json-logger.service';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class DocumentGatewayJob implements OnModuleInit, OnModuleDestroy {
  private isRunning = false;
  private intervalRef?: ReturnType<typeof setInterval>;

  constructor(
    private readonly config: AppConfigService,
    private readonly logger: JsonLogger,
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
    if (this.isRunning) {
      this.logger.warn(
        {
          event: 'job.skipped',
          job: 'document-gateway',
          reason: 'previous_run_still_active',
        },
        DocumentGatewayJob.name,
      );
      return;
    }

    const startedAt = Date.now();
    this.isRunning = true;

    this.logger.log(
      {
        event: 'job.started',
        job: 'document-gateway',
        labels: this.config.gmailLabels,
        maxMessagesPerRun: this.config.maxMessagesPerRun,
      },
      DocumentGatewayJob.name,
    );

    try {
      await this.runPlaceholder();

      this.logger.log(
        {
          durationMs: Date.now() - startedAt,
          event: 'job.completed',
          job: 'document-gateway',
        },
        DocumentGatewayJob.name,
      );
    } catch (error) {
      this.logger.error(
        {
          event: 'job.failed',
          error,
          job: 'document-gateway',
        },
        undefined,
        DocumentGatewayJob.name,
      );
    } finally {
      this.isRunning = false;
    }
  }

  private async runPlaceholder(): Promise<void> {
    this.logger.log(
      {
        event: 'job.noop',
        job: 'document-gateway',
        message:
          'Gmail, Drive, and document processor integrations are not implemented yet.',
      },
      DocumentGatewayJob.name,
    );
  }
}
