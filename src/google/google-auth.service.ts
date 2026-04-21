import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import type { Auth } from 'googleapis';
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { JsonLogger } from '../common/logging/json-logger.service';
import { AppConfigService } from '../config/app-config.service';
import { GOOGLE_OAUTH_SCOPES } from './google-oauth.constants';

export interface GoogleOAuthStatus {
  configured: boolean;
  driveFolderConfigured: boolean;
  hasRefreshToken: boolean;
  missingConfigKeys: string[];
  scopes: readonly string[];
  tokenStoragePath: string;
  tokenStored: boolean;
}

export class GoogleAuthConfigurationError extends Error {
  constructor(missingConfigKeys: string[]) {
    super(`Missing Google OAuth configuration: ${missingConfigKeys.join(', ')}`);
    this.name = 'GoogleAuthConfigurationError';
  }
}

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly config: AppConfigService,
    private readonly logger: JsonLogger,
  ) {}

  buildAuthorizationUrl(): string {
    this.assertConfigured();

    return this.createOAuthClient().generateAuthUrl({
      access_type: 'offline',
      include_granted_scopes: true,
      prompt: 'consent',
      scope: [...GOOGLE_OAUTH_SCOPES],
    });
  }

  async exchangeCodeForTokens(code: string): Promise<GoogleOAuthStatus> {
    this.assertConfigured();

    const oauthClient = this.createOAuthClient();
    const { tokens } = await oauthClient.getToken(code);

    oauthClient.setCredentials(tokens);
    await this.writeStoredToken(tokens);

    this.logger.log(
      {
        event: 'google.oauth.tokens_stored',
        hasRefreshToken: Boolean(tokens.refresh_token),
        tokenStoragePath: this.config.googleOAuth.tokenStoragePath,
      },
      GoogleAuthService.name,
    );

    return this.getStatus();
  }

  async getAuthenticatedClient(): Promise<Auth.OAuth2Client> {
    this.assertConfigured();

    const tokens = await this.readStoredToken();

    if (!tokens) {
      throw new Error(
        'Google OAuth tokens are not stored yet. Visit /oauth/google/start first.',
      );
    }

    const oauthClient = this.createOAuthClient();
    oauthClient.setCredentials(tokens);

    return oauthClient;
  }

  async getStatus(): Promise<GoogleOAuthStatus> {
    const missingConfigKeys = this.getMissingConfigKeys();
    const tokens = await this.readStoredToken();

    return {
      configured: missingConfigKeys.length === 0,
      driveFolderConfigured: Boolean(this.config.googleDriveDestinationFolderId),
      hasRefreshToken: Boolean(tokens?.refresh_token),
      missingConfigKeys,
      scopes: GOOGLE_OAUTH_SCOPES,
      tokenStoragePath: this.config.googleOAuth.tokenStoragePath,
      tokenStored: Boolean(tokens),
    };
  }

  private createOAuthClient(): Auth.OAuth2Client {
    const oauthConfig = this.config.googleOAuth;

    return new google.auth.OAuth2(
      oauthConfig.clientId,
      oauthConfig.clientSecret,
      oauthConfig.redirectUri,
    );
  }

  private assertConfigured(): void {
    const missingConfigKeys = this.getMissingConfigKeys();

    if (missingConfigKeys.length > 0) {
      throw new GoogleAuthConfigurationError(missingConfigKeys);
    }
  }

  private getMissingConfigKeys(): string[] {
    const oauthConfig = this.config.googleOAuth;
    const missingConfigKeys: string[] = [];

    if (!oauthConfig.clientId) {
      missingConfigKeys.push('GOOGLE_OAUTH_CLIENT_ID');
    }

    if (!oauthConfig.clientSecret) {
      missingConfigKeys.push('GOOGLE_OAUTH_CLIENT_SECRET');
    }

    if (!oauthConfig.redirectUri) {
      missingConfigKeys.push('GOOGLE_OAUTH_REDIRECT_URI');
    }

    return missingConfigKeys;
  }

  private async readStoredToken(): Promise<Auth.Credentials | null> {
    try {
      const rawToken = await readFile(this.getAbsoluteTokenPath(), 'utf8');
      return JSON.parse(rawToken) as Auth.Credentials;
    } catch (error) {
      if (this.isFileNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  private async writeStoredToken(tokens: Auth.Credentials): Promise<void> {
    const tokenPath = this.getAbsoluteTokenPath();

    await mkdir(dirname(tokenPath), { recursive: true });
    await writeFile(tokenPath, `${JSON.stringify(tokens, null, 2)}\n`, {
      mode: 0o600,
    });
    await chmod(tokenPath, 0o600);
  }

  private getAbsoluteTokenPath(): string {
    return resolve(process.cwd(), this.config.googleOAuth.tokenStoragePath);
  }

  private isFileNotFoundError(error: unknown): boolean {
    return (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    );
  }
}
