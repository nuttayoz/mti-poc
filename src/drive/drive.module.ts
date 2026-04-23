import { Module } from '@nestjs/common';
import { GoogleModule } from '../google/google.module';
import { DriveController } from './drive.controller';
import { DriveService } from './drive.service';

@Module({
  imports: [GoogleModule],
  controllers: [DriveController],
  providers: [DriveService],
  exports: [DriveService],
})
export class DriveModule {}
