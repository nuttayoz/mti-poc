import { Module } from '@nestjs/common';
import { GoogleModule } from '../google/google.module';
import { DriveService } from './drive.service';

@Module({
  imports: [GoogleModule],
  providers: [DriveService],
  exports: [DriveService],
})
export class DriveModule {}
