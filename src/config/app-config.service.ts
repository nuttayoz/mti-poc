import { Injectable } from '@nestjs/common';

@Injectable()
export class AppConfigService {
  get host(): string {
    return process.env.HOST ?? '0.0.0.0';
  }

  get port(): number {
    return this.numberFromEnv('PORT', 3000);
  }

  get jobIntervalMs(): number {
    return this.numberFromEnv('JOB_INTERVAL_MS', 300_000);
  }

  get maxMessagesPerRun(): number {
    return this.numberFromEnv('MAX_MESSAGES_PER_RUN', 10);
  }

  get runJobOnStartup(): boolean {
    return this.booleanFromEnv('RUN_JOB_ON_STARTUP', false);
  }

  get archiveAfterSuccess(): boolean {
    return this.booleanFromEnv('ARCHIVE_AFTER_SUCCESS', true);
  }

  get documentProcessorMode(): 'mock-external' | 'passthrough' {
    const mode = process.env.DOCUMENT_PROCESSOR_MODE ?? 'mock-external';

    if (mode === 'passthrough' || mode === 'mock-external') {
      return mode;
    }

    return 'mock-external';
  }

  get externalTransformApi(): {
    apiKey: string;
    url: string;
  } {
    return {
      apiKey: process.env.EXTERNAL_TRANSFORM_API_KEY ?? '',
      url: process.env.EXTERNAL_TRANSFORM_API_URL ?? '',
    };
  }

  get gmailLabels(): {
    input: string;
    processing: string;
    processed: string;
    failed: string;
  } {
    return {
      input: process.env.GMAIL_INPUT_LABEL ?? 'SDG/Process',
      processing: process.env.GMAIL_PROCESSING_LABEL ?? 'SDG/Processing',
      processed: process.env.GMAIL_PROCESSED_LABEL ?? 'SDG/Processed',
      failed: process.env.GMAIL_FAILED_LABEL ?? 'SDG/Failed',
    };
  }

  get googleDriveDestinationFolderId(): string {
    return process.env.GOOGLE_DRIVE_DESTINATION_FOLDER_ID ?? '';
  }

  get googleOAuth(): {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    tokenStoragePath: string;
  } {
    return {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
      redirectUri:
        process.env.GOOGLE_OAUTH_REDIRECT_URI ??
        'http://localhost:3000/oauth/google/callback',
      tokenStoragePath:
        process.env.GOOGLE_TOKEN_STORAGE_PATH ?? '.tokens/google-oauth.json',
    };
  }

  private numberFromEnv(name: string, fallback: number): number {
    const rawValue = process.env[name];

    if (!rawValue) {
      return fallback;
    }

    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return fallback;
    }

    return parsedValue;
  }

  private booleanFromEnv(name: string, fallback: boolean): boolean {
    const rawValue = process.env[name];

    if (!rawValue) {
      return fallback;
    }

    return ['1', 'true', 'yes', 'on'].includes(rawValue.toLowerCase());
  }
}
