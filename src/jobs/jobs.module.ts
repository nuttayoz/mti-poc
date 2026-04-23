import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { DriveModule } from '../drive/drive.module';
import { GmailModule } from '../gmail/gmail.module';
import { DocumentGatewayJob } from './document-gateway.job';
import { JobsController } from './jobs.controller';

@Module({
  imports: [DocumentsModule, DriveModule, GmailModule],
  controllers: [JobsController],
  providers: [DocumentGatewayJob],
})
export class JobsModule {}
