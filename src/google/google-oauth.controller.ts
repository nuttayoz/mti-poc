import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Redirect,
} from '@nestjs/common';
import {
  GoogleAuthConfigurationError,
  GoogleAuthService,
  GoogleOAuthStatus,
} from './google-auth.service';

@Controller('oauth/google')
export class GoogleOAuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  @Get('start')
  @Redirect('', 302)
  startOAuth(): { statusCode: number; url: string } {
    try {
      return {
        statusCode: 302,
        url: this.googleAuthService.buildAuthorizationUrl(),
      };
    } catch (error) {
      throw this.toBadRequest(error);
    }
  }

  @Get('url')
  getAuthorizationUrl(): { authorizationUrl: string } {
    try {
      return {
        authorizationUrl: this.googleAuthService.buildAuthorizationUrl(),
      };
    } catch (error) {
      throw this.toBadRequest(error);
    }
  }

  @Get('callback')
  async handleCallback(
    @Query('code') code?: string,
    @Query('error') error?: string,
  ): Promise<GoogleOAuthStatus> {
    if (error) {
      throw new BadRequestException(`Google OAuth failed: ${error}`);
    }

    if (!code) {
      throw new BadRequestException('Missing Google OAuth code.');
    }

    try {
      return await this.googleAuthService.exchangeCodeForTokens(code);
    } catch (caughtError) {
      throw this.toBadRequest(caughtError);
    }
  }

  @Get('status')
  getStatus(): Promise<GoogleOAuthStatus> {
    return this.googleAuthService.getStatus();
  }

  private toBadRequest(error: unknown): BadRequestException {
    if (error instanceof GoogleAuthConfigurationError) {
      return new BadRequestException({
        error: error.name,
        message: error.message,
      });
    }

    if (error instanceof Error) {
      return new BadRequestException({
        error: error.name,
        message: error.message,
      });
    }

    return new BadRequestException('Unknown Google OAuth error.');
  }
}
