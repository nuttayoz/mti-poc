import { Body, Controller, Get, Post } from '@nestjs/common';
import { DriveService } from './drive.service';
import {
  DriveFolderCreateInput,
  DriveFolderCreateResult,
  DriveFolderStatus,
} from './drive.types';

@Controller('drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get('folder/status')
  getFolderStatus(): Promise<DriveFolderStatus> {
    return this.driveService.validateDestinationFolder();
  }

  @Post('setup-folder')
  createSetupFolder(
    @Body() body: DriveFolderCreateInput = {},
  ): Promise<DriveFolderCreateResult> {
    return this.driveService.createDestinationFolder(body);
  }
}
