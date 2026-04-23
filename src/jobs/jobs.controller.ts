import { Controller, Get, Post } from '@nestjs/common';
import { DocumentGatewayJob } from './document-gateway.job';
import {
  DocumentGatewayRecoveryResult,
  DocumentGatewayRunResult,
  DocumentGatewayStatus,
} from './document-gateway.types';

@Controller('jobs/document-gateway')
export class JobsController {
  constructor(private readonly documentGatewayJob: DocumentGatewayJob) {}

  @Get('status')
  getStatus(): DocumentGatewayStatus {
    return this.documentGatewayJob.getStatus();
  }

  @Post('run')
  runNow(): Promise<DocumentGatewayRunResult> {
    return this.documentGatewayJob.runManual();
  }

  @Post('recover-stuck')
  recoverStuck(): Promise<DocumentGatewayRecoveryResult> {
    return this.documentGatewayJob.recoverStuck();
  }
}
