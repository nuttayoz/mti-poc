import { Module } from '@nestjs/common';
import { GoogleOAuthController } from './google-oauth.controller';
import { GoogleAuthService } from './google-auth.service';

@Module({
  controllers: [GoogleOAuthController],
  providers: [GoogleAuthService],
  exports: [GoogleAuthService],
})
export class GoogleModule {}
