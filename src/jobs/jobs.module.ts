import { Module } from '@nestjs/common';
import { DocumentGatewayJob } from './document-gateway.job';

@Module({
  providers: [DocumentGatewayJob],
})
export class JobsModule {}
