import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { DriveModule } from '../drive/drive.module';
import { GmailModule } from '../gmail/gmail.module';
import { DocumentGatewayJob } from './document-gateway.job';

@Module({
  imports: [DocumentsModule, DriveModule, GmailModule],
  providers: [DocumentGatewayJob],
})
export class JobsModule {}
