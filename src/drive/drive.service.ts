import { Injectable } from '@nestjs/common';
import { drive_v3, google } from 'googleapis';
import { Readable } from 'node:stream';
import { JsonLogger } from '../common/logging/json-logger.service';
import { AppConfigService } from '../config/app-config.service';
import { GoogleAuthService } from '../google/google-auth.service';
import {
  DriveFolderCreateInput,
  DriveFolderCreateResult,
  DriveFolderStatus,
  DriveUploadInput,
  DriveUploadResult,
} from './drive.types';

@Injectable()
export class DriveService {
  constructor(
    private readonly config: AppConfigService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly logger: JsonLogger,
  ) {}

  async isReady(): Promise<boolean> {
    const status = await this.googleAuthService.getStatus();

    return (
      status.configured &&
      status.tokenStored &&
      Boolean(this.config.googleDriveDestinationFolderId)
    );
  }

  async validateDestinationFolder(): Promise<DriveFolderStatus> {
    const folderId = this.config.googleDriveDestinationFolderId;

    if (!folderId) {
      return {
        configured: false,
        exists: false,
        folderId,
      };
    }

    if (!(await this.isReady())) {
      return {
        configured: true,
        exists: false,
        folderId,
      };
    }

    const drive = await this.getClient();
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id,name,mimeType,trashed',
      supportsAllDrives: true,
    });

    return {
      configured: true,
      exists:
        response.data.mimeType === 'application/vnd.google-apps.folder' &&
        response.data.trashed !== true,
      folderId,
      name: response.data.name ?? undefined,
      webViewLink: response.data.webViewLink ?? undefined,
    };
  }

  async createDestinationFolder(
    input: DriveFolderCreateInput = {},
  ): Promise<DriveFolderCreateResult> {
    const drive = await this.getClient();
    const response = await drive.files.create({
      fields: 'id,name,webViewLink',
      requestBody: {
        mimeType: 'application/vnd.google-apps.folder',
        name: input.name?.trim() || 'Smart Document Gateway',
      },
      supportsAllDrives: true,
    });

    const result = {
      id: response.data.id ?? '',
      name: response.data.name ?? input.name ?? 'Smart Document Gateway',
      webViewLink: response.data.webViewLink ?? undefined,
    };

    this.logger.log(
      {
        event: 'drive.folder_created',
        folderId: result.id,
        folderName: result.name,
        webViewLink: result.webViewLink,
      },
      DriveService.name,
    );

    return result;
  }

  async uploadFile(input: DriveUploadInput): Promise<DriveUploadResult> {
    if (!(await this.isReady())) {
      this.logger.warn(
        {
          event: 'drive.upload_skipped',
          filename: input.filename,
          reason: 'google_oauth_tokens_missing_or_folder_unconfigured',
        },
        DriveService.name,
      );

      return {
        id: 'dry-run',
        name: input.filename,
      };
    }

    const drive = await this.getClient();
    const response = await drive.files.create({
      fields: 'id,name,webViewLink',
      media: {
        body: Readable.from(input.buffer),
        mimeType: input.mimeType,
      },
      requestBody: {
        description: input.description,
        mimeType: input.mimeType,
        name: input.filename,
        parents: [this.config.googleDriveDestinationFolderId],
      },
      supportsAllDrives: true,
    });

    return {
      id: response.data.id ?? '',
      name: response.data.name ?? input.filename,
      webViewLink: response.data.webViewLink ?? undefined,
    };
  }

  private async getClient(): Promise<drive_v3.Drive> {
    const auth = await this.googleAuthService.getAuthenticatedClient();
    return google.drive({ auth, version: 'v3' });
  }
}
