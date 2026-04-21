import { Module } from '@nestjs/common';
import { GoogleModule } from '../google/google.module';
import { GmailService } from './gmail.service';

@Module({
  imports: [GoogleModule],
  providers: [GmailService],
  exports: [GmailService],
})
export class GmailModule {}
